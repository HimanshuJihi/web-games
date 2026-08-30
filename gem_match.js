const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const comboEl = document.getElementById('combo');
const movesEl = document.getElementById('moves');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');

const BOARD_SIZE = 8;
const GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'gold', 'purple', 'cyan', 'orange'];
const GEM_ICONS = {
  ruby: '🔴',
  sapphire: '🔵',
  emerald: '🟢',
  gold: '🟡',
  purple: '🟣',
  cyan: '🔷',
  orange: '🟠',
};

let board = [];
let score = 0;
let best = Number(localStorage.getItem('gemMatchBest')) || 0;
let combo = 1;
let moves = 0;
let selected = null;

bestEl.textContent = best;

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function randomGem() {
  return GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
}

function fillBoard() {
  const newBoard = createEmptyBoard();

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      let gem = randomGem();
      while (
        (col >= 2 && newBoard[row][col - 1] === gem && newBoard[row][col - 2] === gem) ||
        (row >= 2 && newBoard[row - 1][col] === gem && newBoard[row - 2][col] === gem)
      ) {
        gem = randomGem();
      }
      newBoard[row][col] = gem;
    }
  }

  board = newBoard;
}

function renderBoard() {
  boardEl.innerHTML = '';

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = document.createElement('button');
      const gem = board[row][col];
      cell.className = `cell gem-${gem}`;
      cell.textContent = GEM_ICONS[gem];
      cell.setAttribute('data-row', row);
      cell.setAttribute('data-col', col);
      if (selected && selected.row === row && selected.col === col) {
        cell.classList.add('selected');
      }
      cell.addEventListener('click', () => handleCellClick(row, col));
      boardEl.appendChild(cell);
    }
  }
}

function updateHud() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
  comboEl.textContent = `x${combo}`;
  movesEl.textContent = moves;
}

function isAdjacent(a, b) {
  const rowDiff = Math.abs(a.row - b.row);
  const colDiff = Math.abs(a.col - b.col);
  return rowDiff + colDiff === 1;
}

function swapCells(a, b) {
  [board[a.row][a.col], board[b.row][b.col]] = [board[b.row][b.col], board[a.row][a.col]];
}

function getMatches() {
  const matches = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    let start = 0;
    while (start < BOARD_SIZE) {
      let end = start + 1;
      while (end < BOARD_SIZE && board[row][end] === board[row][start]) end++;
      if (end - start >= 3) {
        for (let col = start; col < end; col++) {
          matches.push({ row, col });
        }
      }
      start = end;
    }
  }

  for (let col = 0; col < BOARD_SIZE; col++) {
    let start = 0;
    while (start < BOARD_SIZE) {
      let end = start + 1;
      while (end < BOARD_SIZE && board[end][col] === board[start][col]) end++;
      if (end - start >= 3) {
        for (let row = start; row < end; row++) {
          matches.push({ row, col });
        }
      }
      start = end;
    }
  }

  return matches;
}

function collapseBoard() {
  for (let col = 0; col < BOARD_SIZE; col++) {
    const values = [];
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (board[row][col] !== null) {
        values.push(board[row][col]);
      }
    }

    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      board[row][col] = values[BOARD_SIZE - 1 - row] ?? null;
    }
  }

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) board[row][col] = randomGem();
    }
  }
}

function resolveBoard() {
  let chain = 0;

  while (true) {
    const matches = getMatches();
    if (matches.length === 0) break;

    const unique = new Set(matches.map(({ row, col }) => `${row},${col}`));
    const clearCount = unique.size;
    chain++;

    for (const key of unique) {
      const [row, col] = key.split(',').map(Number);
      board[row][col] = null;
    }

    collapseBoard();
    score += clearCount * 10 * chain;
    combo = chain;
    best = Math.max(best, score);
    localStorage.setItem('gemMatchBest', String(best));
    updateHud();
  }

  if (chain === 0) {
    combo = 1;
  }

  updateHud();
}

function hasPossibleMove() {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const pos = { row, col };
      const neighbors = [
        { row: row + 1, col },
        { row: row - 1, col },
        { row, col: col + 1 },
        { row, col: col - 1 },
      ];

      for (const neighbor of neighbors) {
        if (neighbor.row < 0 || neighbor.row >= BOARD_SIZE || neighbor.col < 0 || neighbor.col >= BOARD_SIZE) continue;
        swapCells(pos, neighbor);
        const hasMatch = getMatches().length > 0;
        swapCells(pos, neighbor);
        if (hasMatch) return true;
      }
    }
  }
  return false;
}

function shuffleBoard() {
  const flat = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      flat.push(board[row][col]);
    }
  }

  for (let i = flat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flat[i], flat[j]] = [flat[j], flat[i]];
  }

  let idx = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      board[row][col] = flat[idx++];
    }
  }
}

function handleCellClick(row, col) {
  const cell = { row, col };

  if (!selected) {
    selected = cell;
    renderBoard();
    return;
  }

  if (selected.row === row && selected.col === col) {
    selected = null;
    renderBoard();
    return;
  }

  if (!isAdjacent(selected, cell)) {
    selected = cell;
    renderBoard();
    return;
  }

  moves++;
  swapCells(selected, cell);
  const originalSelected = { ...selected };
  selected = null;
  renderBoard();

  const matches = getMatches();
  if (matches.length === 0) {
    statusEl.textContent = 'No match! Try another swap.';
    swapCells(originalSelected, cell);
    renderBoard();
    updateHud();
    return;
  }

  statusEl.textContent = matches.length >= 5 ? 'Amazing combo!' : 'Nice move!';
  resolveBoard();

  if (!hasPossibleMove()) {
    statusEl.textContent = 'No moves left! Shuffling board...';
    shuffleBoard();
    renderBoard();
  }

  updateHud();
}

resetBtn.addEventListener('click', () => {
  score = 0;
  combo = 1;
  moves = 0;
  selected = null;
  statusEl.textContent = 'Fresh board! Start matching.';
  fillBoard();
  renderBoard();
  updateHud();
});

fillBoard();
renderBoard();
updateHud();
