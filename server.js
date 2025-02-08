const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const app = express();
const port = 3000;

// Middleware
app.use(express.static("public"));
app.use(express.json());

// SQLite Datenbankverbindung und Initialisierung
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

// Spielbrett-Klasse
class GameBoard {
  constructor() {
    this.rows = 6;
    this.cols = 7;
    this.board = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(0));
  }

  isValidMove(col) {
    return this.board[0][col] === 0;
  }

  makeMove(col, player) {
    for (let row = this.rows - 1; row >= 0; row--) {
      if (this.board[row][col] === 0) {
        this.board[row][col] = player;
        return { row, col };
      }
    }
    return null;
  }

  checkWin(row, col, player) {
    // Horizontal prüfen
    for (let c = 0; c <= this.cols - 4; c++) {
      if (
        this.board[row][c] === player &&
        this.board[row][c + 1] === player &&
        this.board[row][c + 2] === player &&
        this.board[row][c + 3] === player
      ) {
        return true;
      }
    }

    // Vertikal prüfen
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

    // Diagonal (/) prüfen
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

    // Diagonal (\) prüfen
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

    return false;
  }

  getValidMoves() {
    const validMoves = [];
    for (let col = 0; col < this.cols; col++) {
      if (this.isValidMove(col)) {
        validMoves.push(col);
      }
    }
    return validMoves;
  }

  computerMove() {
    const validMoves = this.getValidMoves();
    if (validMoves.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }
}

// Spielzustände speichern
const games = new Map();

// Routes
app.post("/api/game/start", (req, res) => {
  const { playerName } = req.body;
  const gameId = Date.now().toString();
  games.set(gameId, {
    board: new GameBoard(),
    playerName,
    moves: 0,
  });
  res.json({ gameId });
});

app.post("/api/game/:gameId/move", (req, res) => {
  console.log("Received move request:", {
    gameId: req.params.gameId,
    body: req.body,
    column: req.body.column,
  });
  const { gameId } = req.params;
  const { column } = req.body;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: "Spiel nicht gefunden" });
  }

  // Spielerzug
  if (!game.board.isValidMove(column)) {
    return res.status(400).json({ error: "Ungültiger Zug" });
  }

  const playerMove = game.board.makeMove(column, 1);
  game.moves++;

  if (game.board.checkWin(playerMove.row, playerMove.col, 1)) {
    // Speichere Highscore
    db.run("INSERT INTO highscores (player_name, moves) VALUES (?, ?)", [game.playerName, game.moves]);
    games.delete(gameId);
    return res.json({
      status: "win",
      board: game.board.board,
      moves: game.moves,
    });
  }

  // Computerzug
  const computerColumn = game.board.computerMove();
  if (computerColumn === null) {
    games.delete(gameId);
    return res.json({ status: "draw", board: game.board.board });
  }

  const computerMove = game.board.makeMove(computerColumn, 2);

  if (game.board.checkWin(computerMove.row, computerMove.col, 2)) {
    games.delete(gameId);
    return res.json({
      status: "lose",
      board: game.board.board,
    });
  }

  res.json({
    status: "ongoing",
    board: game.board.board,
    computerMove: computerColumn,
  });
});

app.get("/api/highscores", (req, res) => {
  db.all("SELECT player_name, moves FROM highscores ORDER BY moves ASC LIMIT 10", (err, rows) => {
    if (err) {
      res.status(500).json({ error: "Datenbankfehler" });
    } else {
      res.json(rows);
    }
  });
});

// Graceful shutdown
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

app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
