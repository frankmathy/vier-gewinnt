const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const port = 3000;

// Middleware
app.use(express.static("public"));
app.use(express.json());

// Establish SQLite database connection
const db = new sqlite3.Database("game.db", (err) => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Connected to the SQLite database.");

    // Create table if it doesn't exist
    db.run(
      `
            CREATE TABLE IF NOT EXISTS highscores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL,
                moves INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `,
      (err) => {
        if (err) {
          console.error("Error creating table:", err);
        } else {
          console.log("Highscores table ready.");
        }
      }
    );
  }
});

// Class for storing a game status
class GameBoard {
  constructor() {
    this.rows = 6;
    this.cols = 7;
    // Array with 6 rows and 7 columns, set all to empty
    this.board = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(0));
  }

  // Helper function to check if a stone can be added to a column
  isValidMove(col) {
    // True if the top element in the column is empty
    return this.board[0][col] === 0;
  }

  // Player add stone to column col
  makeMove(col, player) {
    // Go through all rows from bottom to top
    for (let row = this.rows - 1; row >= 0; row--) {
      // If no stone set in this row and column
      if (this.board[row][col] === 0) {
        // Set stone and return coordinates of set stone
        this.board[row][col] = player;
        return { row, col };
      }
    }
    // No free space could be found -> return null
    return null;
  }

  // Check if player has won
  checkWin(row, col, player) {
    // Check for 4 stones in a row
    for (let c = 0; c <= this.cols - 4; c++) {
      // If 4 stones in row are set, return true
      if (
        this.board[row][c] === player &&
        this.board[row][c + 1] === player &&
        this.board[row][c + 2] === player &&
        this.board[row][c + 3] === player
      ) {
        return true;
      }
    }

    // Check for 4 stones in a column
    for (let r = 0; r <= this.rows - 4; r++) {
      if (
        this.board[r][col] === player &&
        this.board[r + 1][col] === player &&
        this.board[r + 2][col] === player &&
        this.board[r + 3][col] === player
      ) {
        return true;
      }
    }

    // Check for 4 stones diagnonally (/)
    for (let r = 3; r < this.rows; r++) {
      for (let c = 0; c <= this.cols - 4; c++) {
        if (
          this.board[r][c] === player &&
          this.board[r - 1][c + 1] === player &&
          this.board[r - 2][c + 2] === player &&
          this.board[r - 3][c + 3] === player
        ) {
          return true;
        }
      }
    }

    // Check for 4 stones diagnonally (\)
    for (let r = 0; r <= this.rows - 4; r++) {
      for (let c = 0; c <= this.cols - 4; c++) {
        if (
          this.board[r][c] === player &&
          this.board[r + 1][c + 1] === player &&
          this.board[r + 2][c + 2] === player &&
          this.board[r + 3][c + 3] === player
        ) {
          return true;
        }
      }
    }

    // Player has not won
    return false;
  }

  // Get an array with the columns where a stone can be put
  getValidMoves() {
    const validMoves = [];
    for (let col = 0; col < this.cols; col++) {
      if (this.isValidMove(col)) {
        // If there is space, add column to array
        validMoves.push(col);
      }
    }
    // Return array of valid moves
    return validMoves;
  }

  // Calculate move of computer
  computerMove() {
    // Get array with columns where a stone can be placed
    const validMoves = this.getValidMoves();
    // If no move possible return null --> game over
    if (validMoves.length === 0) return null;
    // Return a random entry of the column arrays --> set stone on random column
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }
}

// Global map with gameID --> Gameboard entries
const games = new Map();

// Endpoint to start a game, passing in the player name
app.post("/api/game/start", (req, res) => {
  // Get player name from request
  const { playerName } = req.body;
  // Create a new game id
  const gameId = Date.now().toString();
  // Add new game data to games map
  games.set(gameId, {
    // The game board status
    board: new GameBoard(),
    // The player name
    playerName,
    // The move count
    moves: 0,
  });
  // Return the gameId to the client
  res.json({ gameId });
});

// Player makes a move
app.post("/api/game/:gameId/move", (req, res) => {
  // Get the game id
  const { gameId } = req.params;
  // Get the column of the added stone
  const { column } = req.body;

  // Get the game data
  const game = games.get(gameId);

  // If the game cannot be found, return an error
  if (!game) {
    return res.status(404).json({ error: "Spiel nicht gefunden" });
  }

  // Check if the player move to column is valid
  if (!game.board.isValidMove(column)) {
    // If invalid move, return http error
    return res.status(400).json({ error: "Ungültiger Zug" });
  }

  // Make the move of the player so that the board gets updated
  const playerMove = game.board.makeMove(column, 1);

  // Increase the move counter
  game.moves++;

  // Check if the player has 4 in a row
  if (game.board.checkWin(playerMove.row, playerMove.col, 1)) {
    // If won, store the core to the high scores table
    db.run("INSERT INTO highscores (player_name, moves) VALUES (?, ?)", [game.playerName, game.moves]);
    // Delete the game state from the map
    games.delete(gameId);
    // Return status "win" with board status and move count to the GUI
    return res.json({
      status: "win",
      board: game.board.board,
      moves: game.moves,
    });
  }

  // Calculate the computer move
  const computerColumn = game.board.computerMove();

  // If no computer move is possible, return a draw status
  if (computerColumn === null) {
    games.delete(gameId);
    return res.json({ status: "draw", board: game.board.board });
  }

  // Process the computer move to the board
  const computerMove = game.board.makeMove(computerColumn, 2);

  // Check if the computer has won
  if (game.board.checkWin(computerMove.row, computerMove.col, 2)) {
    // If computer has won, delete game status
    games.delete(gameId);
    // Then return status "lose" and board data
    return res.json({
      status: "lose",
      board: game.board.board,
    });
  }

  // No one has one --> return status "ongoing", board and computer move column
  res.json({
    status: "ongoing",
    board: game.board.board,
    computerMove: computerColumn,
  });
});

// REST endpoint to get highscores
app.get("/api/highscores", (req, res) => {
  // Select all entries from highscores table, oder by move count
  db.all("SELECT player_name, moves FROM highscores ORDER BY moves ASC LIMIT 10", (err, rows) => {
    if (err) {
      // Error handling
      res.status(500).json({ error: "Datenbankfehler" });
    } else {
      // Return data
      res.json(rows);
    }
  });
});

// Shutdown database if process has been killed
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err);
    } else {
      console.log("Database connection closed.");
    }
    process.exit(0);
  });
});

// Start the express REST server
app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
