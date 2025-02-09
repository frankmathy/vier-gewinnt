$(document).ready(function () {
  /* This is the Javascript client code for the game. The game state and logic is managed on the NodeJS server. */

  // gameId is the identifier of the current game and needed to support multiple parallel sessions
  let gameId = null;
  const ROWS = 6;
  const COLS = 7;

  function createBoard() {
    // Find element with class name 'board'
    const board = $(".board");
    // Remove all children
    board.empty();

    // Add divs for all children
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // For each cell, add one child div and assign a data-row and data-col attribute for retrieval
        const cell = $("<div>").addClass("cell").attr("data-row", row).attr("data-col", col);
        board.append(cell);
      }
    }
  }

  // Update the styling of all game elements based on the boardState passed
  function updateBoard(boardState) {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // Find the cell in row and column
        const cell = $(`.cell[data-row="${row}"][data-col="${col}"]`);
        // Remove colouring
        cell.removeClass("player-1 player-2");
        // If a stone for player 1 or 2 has been set, set the color styling by adding a CSS class to the element
        if (boardState[row][col] === 1) {
          cell.addClass("player-1");
        } else if (boardState[row][col] === 2) {
          cell.addClass("player-2");
        }
      }
    }
  }

  // Load and display the high scores
  function loadHighscores() {
    // First call the API to fetch the highscores
    $.get("/api/highscores", function (data) {
      // When highscore data is received, find the highscore body element using its ID (#)
      const tbody = $("#highscores-body");
      // Empty the HTML table
      tbody.empty();
      data.forEach((score) => {
        // For each data entry, append one table row with player name and score
        tbody.append(`
                  <tr>
                      <td>${score.player_name}</td>
                      <td>${score.moves}</td>
                  </tr>
              `);
      });
    });
  }

  // Called when the start game button has been pressed
  $("#start-game").click(function () {
    const playerName = $("#player-name").val().trim();
    if (!playerName) {
      // If player name not valid then do not continu
      alert("Bitte gib deinen Namen ein!");
      return;
    }

    // Call the /api/game/start REST function to start the game
    $.ajax({
      url: "/api/game/start",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ playerName }),
      success: function (data) {
        // This will return the gameId (so that multiple games in parallel are possible)
        gameId = data.gameId;
        // Hide the player entry form
        $("#player-form").hide();
        // Show the game board
        $("#game-board").show();
        // Create the game board elements
        createBoard();
      },
    });
  });

  // When 'play-again' has been pressed, show player name entry form
  $("#play-again").click(function () {
    $("#highscores").hide();
    $("#player-form").show();
    $("#player-name").val("");
  });

  // When a cell (class 'cell') has been clicked, handle player move
  $(document).on("click", ".cell", function () {
    // Return if no game in progress
    if (!gameId) return;

    // Get the col attribute from the clicked element
    const col = parseInt($(this).data("col"));

    // Do the AJAX call to the backed, passing the gameId and column clicked
    $.ajax({
      url: `/api/game/${gameId}/move`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ column: col }),
      success: function (data) {
        /* The server will process the player move, will calculate the new board state 
        and return it in data.board. The GUI will now update the board.*/
        updateBoard(data.board);

        // If the player has won, status "win" will be returned. After showing the message, the high scores are displayed.
        if (data.status === "win") {
          alert("Gratulation! Du hast gewonnen!");
          loadHighscores();
          $("#game-board").hide();
          $("#highscores").show();
          // Similar handling when the computer has won
        } else if (data.status === "lose") {
          alert("Der Computer hat gewonnen!");
          $("#game-board").hide();
          $("#player-form").show();
          // Handling when all stones have been set and no winner
        } else if (data.status === "draw") {
          alert("Unentschieden!");
          $("#game-board").hide();
          $("#player-form").show();
        }
      },
      error: function (jqXHR) {
        // If the column is already full, then show an error message
        if (jqXHR.status === 400) {
          alert("Ungültiger Zug! Diese Spalte ist bereits voll.");
        }
      },
    });
  });
});
