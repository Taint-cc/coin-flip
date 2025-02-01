const express = require('express');
const mysql = require('mysql2');
const app = express();
const cors = require('cors');
const config = require('./config');
const port = 3000;

app.use(cors());

const pool = mysql.createPool({
  host: '#',
  user: '#',
  database: '#',
  password: '#',
});

app.use(express.json());

app.post('/create-game', (req, res) => {
    const { playerId, playerChoice, betAmount } = req.body;

    if (!playerChoice || !['heads', 'tails'].includes(playerChoice)) {
        return res.status(400).json({ message: 'Invalid choice. Please choose heads or tails.' });
    }

    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet < 5) {
        return res.status(400).json({ message: 'Player 1 must bet at least $5.' });
    }

    pool.query(
        'INSERT INTO coinflip_games (player_1_id, game_status, player_1_choice, player_1_bet) VALUES (?, ?, ?, ?)',
        [playerId, 'waiting', playerChoice, bet],
        (err, result) => {
            if (err) {
                return res.status(500).send('Error creating game');
            }

            res.status(200).send({ gameId: result.insertId, message: 'Game created. Waiting for player 2.' });
        }
    );
});




app.post('/join-game', (req, res) => {
    const { playerId, gameId, betAmount } = req.body;

    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet < 3 || bet > 10) {  // Bet must be between $2 less or $5 more than Player 1's bet
        return res.status(400).json({ message: 'Bet must be between $2 below and $5 above Player 1\'s bet.' });
    }

    pool.query('SELECT * FROM coinflip_games WHERE game_id = ?', [gameId], (err, result) => {
        if (err || result.length === 0) {
            return res.status(500).send('Error fetching game data');
        }

        const game = result[0];
        const player1Bet = game.player_1_bet;
        if (bet < player1Bet - 2 || bet > player1Bet + 5) {
            return res.status(400).json({ message: 'Bet must be between $2 below and $5 above Player 1\'s bet.' });
        }

        // Update the game with Player 2's bet
        pool.query(
            'UPDATE coinflip_games SET player_2_id = ?, player_2_bet = ?, game_status = ? WHERE game_id = ?',
            [playerId, bet, 'ready', gameId],
            (err, result) => {
                if (err) {
                    return res.status(500).send('Error joining game');
                }

                // Log the joining event
                console.log("A user joined Coinflip Game ID:" + gameId);
                console.log("15 Seconds till game: " + gameId + " starts");

                // Start the coinflip after 15 seconds
                setTimeout(() => {
                    startCoinflip(gameId);
                }, 15000);

                res.status(200).send({ message: 'Joined game successfully! Ready for coinflip.' });
            }
        );
    });
});


// Fetch all games that are in 'waiting' status
app.get('/get-waiting-games', (req, res) => {
    pool.query(
        'SELECT game_id, player_1_id FROM coinflip_games WHERE game_status = ?',
        ['waiting'],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Error fetching waiting games' });
            }

            res.json(results);  // Return games that are waiting
        }
    );
});

// Fetch the game result (who won)
app.get('/game-result/:gameId', (req, res) => {
    const gameId = req.params.gameId;

    pool.query('SELECT * FROM coinflip_games WHERE game_id = ?', [gameId], (err, result) => {
        if (err || result.length === 0) {
            return res.status(500).json({ message: 'Error fetching game result.' });
        }

        const game = result[0];
        let message = `Coinflip result: ${game.result}. `;

        if (game.winner === 'Player 1') {
            message += 'Player 1 wins!';
        } else if (game.winner === 'Player 2') {
            message += 'Player 2 wins!';
        } else {
            message += 'It\'s a tie!';
        }

        res.json({ message });
    });
});

function startCoinflip(gameId) {
    pool.query('SELECT * FROM coinflip_games WHERE game_id = ?', [gameId], (err, result) => {
        if (err) {
            console.log('Error fetching game data');
            return;
        }

        const game = result[0];
        if (!game.player_2_id) {
            console.log('Second player did not join in time');
            return;
        }

        // Perform the coinflip
        const coinflipResult = Math.random() < 0.5 ? 'heads' : 'tails';

        // Determine the winner based on Player 1's choice and the coinflip result
        let winner = '';
        if (game.player_1_choice === coinflipResult) {
            winner = 'Player 1';
        } else {
            winner = 'Player 2';
        }

        // Calculate the total bet
        const totalBet = game.player_1_bet + game.player_2_bet;

        // Update the result, game status, and winner
        pool.query(
            'UPDATE coinflip_games SET result = ?, game_status = ?, winner = ?, total_bet = ? WHERE game_id = ?',
            [coinflipResult, 'completed', winner, totalBet, gameId],
            (err, result) => {
                if (err) {
                    console.log('Error updating game result');
                    return;
                }

                console.log(`Coinflip result: ${coinflipResult}`);
                console.log(`Winner: ${winner}`);

                // Log the bet transaction (example)
                pool.query(
                    'INSERT INTO bet_transactions (game_id, winner, total_bet) VALUES (?, ?, ?)',
                    [gameId, winner, totalBet],
                    (err, result) => {
                        if (err) {
                            console.log('Error logging bet transaction');
                        }
                    }
                );
            }
        );
    });
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
