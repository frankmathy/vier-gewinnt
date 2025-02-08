$(document).ready(function () {
  let gameId = null;
  const ROWS = 6;
  const COLS = 7;

  function createBoard() {
    const board = $(".board");
    board.empty();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = $("<div>").addClass("cell").attr("data-row", row).attr("data-col", col);
        board.append(cell);
      }
    }
  }

  function updateBoard(boardState) {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = $(`.cell[data-row="${row}"][data-col="${col}"]`);
        cell.removeClass("player-1 player-2");
        if (boardState[row][col] === 1) {
          cell.addClass("player-1");
        } else if (boardState[row][col] === 2) {
          cell.addClass("player-2");
        }
      }
    }
  }

  function loadHighscores() {
    $.get("/api/highscores", function (data) {
      const tbody = $("#highscores-body");
      tbody.empty();
      data.forEach((score) => {
        tbody.append(`
                  <tr>
                      <td>${score.player_name}</td>
                      <td>${score.moves}</td>
                  </tr>
              `);
      });
    });
  }

  $("#start-game").click(function () {
    const playerName = $("#player-name").val().trim();
    if (!playerName) {
      alert("Bitte gib deinen Namen ein!");
      return;
    }

    $.ajax({
      url: "/api/game/start",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ playerName }),
      success: function (data) {
        gameId = data.gameId;
        $("#player-form").hide();
        $("#game-board").show();
        createBoard();
      },
    });
  });

  $("#play-again").click(function () {
    $("#highscores").hide();
    $("#player-form").show();
    $("#player-name").val("");
  });

  $(document).on("click", ".cell", function () {
    if (!gameId) return;

    const col = parseInt($(this).data("col"));

    $.ajax({
      url: `/api/game/${gameId}/move`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ column: col }),
      success: function (data) {
        updateBoard(data.board);

        if (data.status === "win") {
          alert("Gratulation! Du hast gewonnen!");
          loadHighscores();
          $("#game-board").hide();
          $("#highscores").show();
        } else if (data.status === "lose") {
          alert("Der Computer hat gewonnen!");
          $("#game-board").hide();
          $("#player-form").show();
        } else if (data.status === "draw") {
          alert("Unentschieden!");
          $("#game-board").hide();
          $("#player-form").show();
        }
      },
      error: function (jqXHR) {
        if (jqXHR.status === 400) {
          alert("Ungültiger Zug! Diese Spalte ist bereits voll.");
        }
      },
    });
  });
});
