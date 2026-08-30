const gridEl = document.getElementById('grid');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const movesEl = document.getElementById('moves');
const roundEl = document.getElementById('round');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');

const symbols = ['🌙', '⭐', '☀️', '🌈', '🎯', '🔥', '💎', '🎵', '⚡', '🚀', '🌊', '🍀'];

let deck = [];
let revealed = [];
let matchedPairs = 0;
let score = 0;
let best = Number(localStorage.getItem('memoryFlipBest')) || 0;
let moves = 0;
let round = 1;
let lockBoard = false;

bestEl.textContent = best;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function setupRound() {
  const pairCount = Math.min(8 + round, 12);
  const selectedSymbols = shuffle(symbols).slice(0, pairCount);
  const cards = shuffle([...selectedSymbols, ...selectedSymbols].map((symbol, index) => ({
    id: `${symbol}-${index}`,
    symbol,
    matched: false,
    revealed: false,
  })));

  deck = cards;
  revealed = [];
  matchedPairs = 0;
  lockBoard = false;
  roundEl.textContent = round;
  renderBoard();
  statusEl.textContent = `Round ${round}: match every pair.`;
}

function renderBoard() {
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${Math.min(4 + Math.floor((round - 1) / 2), 5)}, minmax(0, 1fr))`;

  for (const card of deck) {
    const button = document.createElement('button');
    button.className = 'card';
    button.textContent = card.revealed || card.matched ? card.symbol : '?';
    button.disabled = card.matched || lockBoard;

    if (card.revealed || card.matched) button.classList.add('revealed');
    if (card.matched) button.classList.add('matched');

    button.addEventListener('click', () => handleCardClick(card.id));
    gridEl.appendChild(button);
  }
}

function handleCardClick(cardId) {
  if (lockBoard) return;

  const card = deck.find((item) => item.id === cardId);
  if (!card || card.revealed || card.matched) return;

  card.revealed = true;
  revealed.push(cardId);
  renderBoard();

  if (revealed.length === 2) {
    moves += 1;
    movesEl.textContent = moves;

    const [firstId, secondId] = revealed;
    const firstCard = deck.find((item) => item.id === firstId);
    const secondCard = deck.find((item) => item.id === secondId);

    if (firstCard.symbol === secondCard.symbol) {
      firstCard.matched = true;
      secondCard.matched = true;
      score += 20 + round * 5;
      best = Math.max(best, score);
      localStorage.setItem('memoryFlipBest', String(best));
      bestEl.textContent = best;
      scoreEl.textContent = score;
      matchedPairs += 1;
      revealed = [];
      statusEl.textContent = 'Nice match! Keep going.';

      if (matchedPairs === deck.length / 2) {
        round += 1;
        statusEl.textContent = 'Round cleared! Next challenge incoming...';
        setTimeout(() => {
          setupRound();
        }, 700);
      }
      renderBoard();
      return;
    }

    statusEl.textContent = 'Not a match. Try again!';
    lockBoard = true;
    setTimeout(() => {
      firstCard.revealed = false;
      secondCard.revealed = false;
      revealed = [];
      lockBoard = false;
      renderBoard();
    }, 700);
  }

  scoreEl.textContent = score;
  bestEl.textContent = best;
}

resetBtn.addEventListener('click', () => {
  round = 1;
  score = 0;
  moves = 0;
  setupRound();
  scoreEl.textContent = score;
  movesEl.textContent = moves;
  bestEl.textContent = best;
  statusEl.textContent = 'New game started.';
});

setupRound();
scoreEl.textContent = score;
movesEl.textContent = moves;
