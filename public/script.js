$(document).ready(function () {
  let board = Array.from({ length: 6 }, () => Array(7).fill(null));
  let currentPlayer = "red";
  let playerName = "";
  let moves = 0;

  $("#startGame").click(function () {
    playerName = $("#playerName").val().trim();
    if (!playerName) return alert("Bitte Namen eingeben!");
    renderBoard();
  });

  function renderBoard() {
    $("#board").empty();
    board.forEach((row, rIdx) => {
      row.forEach((cell, cIdx) => {
        let div = $("<div>").addClass("cell").data({ row: rIdx, col: cIdx });
        if (cell) div.addClass(cell);
        $("#board").append(div);
      });
    });
  }

  $(document).on("click", ".cell", function () {
    let col = $(this).data("col");
    let row = getLowestEmptyRow(col);
    if (row === -1) return;
    board[row][col] = currentPlayer;
    moves++;
    renderBoard();

    if (checkWin(currentPlayer)) {
      saveHighscore();
      alert(`${playerName} hat gewonnen!`);
      return;
    }

    setTimeout(computerMove, 500);
  });

  function getLowestEmptyRow(col) {
    for (let r = 5; r >= 0; r--) {
      if (!board[r][col]) return r;
    }
    return -1;
  }

  function computerMove() {
    let col;
    do {
      col = Math.floor(Math.random() * 7);
    } while (getLowestEmptyRow(col) === -1);

    let row = getLowestEmptyRow(col);
    board[row][col] = "yellow";
    renderBoard();

    if (checkWin("yellow")) {
      alert("Der Computer hat gewonnen!");
    }
  }

  function checkWin(player) {
    return (
      checkDirection(player, 1, 0) ||
      checkDirection(player, 0, 1) ||
      checkDirection(player, 1, 1) ||
      checkDirection(player, 1, -1)
    );
  }

  function checkDirection(player, dr, dc) {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        if (board[r][c] !== player) continue;
        if (checkLine(r, c, dr, dc, player)) return true;
      }
    }
    return false;
  }

  function checkLine(r, c, dr, dc, player) {
    for (let i = 0; i < 4; i++) {
      if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r][c] !== player) return false;
      r += dr;
      c += dc;
    }
    return true;
  }

  function saveHighscore() {
    $.post("/highscore", { name: playerName, moves });
  }
});
