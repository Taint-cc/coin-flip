<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coinflip Game</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #2c3e50;
            color: white;
        }
        .container {
            text-align: center;
            padding: 50px;
        }
        button {
            font-size: 18px;
            padding: 10px 20px;
            cursor: pointer;
            background-color: #3498db;
            border: none;
            border-radius: 5px;
            color: white;
        }
        table {
            width: 60%;
            margin-top: 20px;
            margin-bottom: 20px;
            border-collapse: collapse;
        }
        table, th, td {
            border: 1px solid white;
        }
        th, td {
            padding: 8px 12px;
            text-align: center;
        }
    </style>
</head>
<body>

<div class="container">
    <h1>Welcome to the Coinflip Game</h1>

    <!-- Player 1 chooses their side -->
    <div>
        <label for="coinChoice">Pick your side of the coin:</label><br>
        <input type="radio" id="heads" name="coinChoice" value="heads">
        <label for="heads">Heads</label>
        <input type="radio" id="tails" name="coinChoice" value="tails">
        <label for="tails">Tails</label>
    </div>
    <br>

    <button onclick="createGame()">Create Game</button>
    <br><br>
    <input id="gameID" type="text" placeholder="Enter Game ID">
    <br>
    <button onclick="joinGame()">Join Game</button>

    <div id="gameStatus"></div>

    <label for="betAmount">Choose your bet ($5 minimum):</label>
    <input type="number" id="betAmount" min="5">

    <!-- Table to show waiting games -->
    <h3>Waiting Games</h3>
    <table id="waitingGamesTable">
        <thead>
            <tr>
                <th>Game ID</th>
                <th>Player 1</th>
                <th>Player 1 Coin</th>
                <th>Join Game</th>
                <th>Bet Amount</A>
            </tr>
        </thead>
        <tbody>
            <!-- Waiting games will be populated here -->
        </tbody>
    </table>
</div>

<script>
    let gameId = null;

    function createGame() {
    const playerChoice = document.querySelector('input[name="coinChoice"]:checked')?.value;
    const betAmount = document.getElementById('betAmount').value;

    if (!playerChoice) {
        alert("Please choose heads or tails.");
        return;
    }

    fetch('http://localhost:3000/create-game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId: 1, playerChoice: playerChoice, betAmount: betAmount })
    })
    .then(response => response.json())
    .then(data => {
        if (data.gameId) {
            gameId = data.gameId;
            document.getElementById("gameStatus").innerText = `Game Created! Waiting for another player to join... Game ID: ${gameId}`;
            loadWaitingGames();  // Reload the waiting games list after creating a game
        } else {
            document.getElementById("gameStatus").innerText = 'Error creating game!';
        }
    });
}


function joinGame() {
    const gameId = document.getElementById("gameID").value;
    const betAmount = document.getElementById('betAmount').value;

    fetch('http://localhost:3000/join-game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId: 2, gameId: gameId, betAmount: betAmount })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById("gameStatus").innerText = data.message;
        loadWaitingGames();  // Reload the waiting games list after joining a game
    });
}


// Function to load waiting games
function loadWaitingGames() {
    fetch('http://localhost:3000/get-waiting-games')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('waitingGamesTable').getElementsByTagName('tbody')[0];
            tableBody.innerHTML = '';  // Clear existing table rows
            
            // Populate the table with waiting games
            data.forEach(game => {
                const row = tableBody.insertRow();
                const gameIdCell = row.insertCell(0);
                const player1Cell = row.insertCell(1);
                const joinButtonCell = row.insertCell(2);

                gameIdCell.textContent = game.game_id;
                player1Cell.textContent = game.player_1_id;
                joinButtonCell.innerHTML = `<button onclick="joinGameFromTable(${game.game_id})">Join</button>`;
            });
        });
}

    // Function to join a game from the table
    function joinGameFromTable(gameId) {
        document.getElementById("gameID").value = gameId;  // Set the game ID in the input field
        joinGame();  // Call joinGame() to actually join the game
    }
// Function to display the result after coinflip
function showResult(gameId) {
    fetch(`http://localhost:3000/game-result/${gameId}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById("gameStatus").innerText = data.message;
            loadWaitingGames();  // Reload the waiting games list
        })
        .catch(err => {
            document.getElementById("gameStatus").innerText = 'Error fetching result.';
        });
}

    // Load the waiting games when the page loads
    window.onload = function() {
        setInterval(loadWaitingGames, 3000);  // Refresh table every 3 seconds
    };
</script>
</body>
</html>
