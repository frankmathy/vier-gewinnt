// server.js - Node.js Server with SQLite
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database("./vier_gewinnt.db", (err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to SQLite database");
    db.run(`CREATE TABLE IF NOT EXISTS highscores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            moves INTEGER NOT NULL
        )`);
  }
});

// Save high score
app.post("/highscore", (req, res) => {
  const { name, moves } = req.body;
  const query = "INSERT INTO highscores (name, moves) VALUES (?, ?)";
  db.run(query, [name, moves], (err) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
});

// Retrieve high scores
app.get("/highscores", (req, res) => {
  db.all("SELECT * FROM highscores ORDER BY moves ASC LIMIT 10", (err, results) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else {
      res.json(results);
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
