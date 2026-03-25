const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status');
const restartBtn = document.getElementById('restartBtn');
const modeSelect = document.getElementById('modeSelect');

let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;

const WIN_CONDITIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

// --- Audio Setup ---
let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    if (type === 'x') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'o') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'win') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'tie') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
        osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    }
    osc.connect(gain).connect(audioCtx.destination);
}

function handleCellClick(e) {
    const cell = e.target;
    const index = cell.getAttribute('data-index');

    if (board[index] !== '' || !gameActive) return;

    initAudio();
    makeMove(cell, index, currentPlayer);
    checkWinner();

    // If playing against AI and game is still active, let AI move
    if (gameActive && modeSelect.value !== 'pvp' && currentPlayer === 'O') {
        statusText.textContent = "AI is thinking...";
        setTimeout(aiMove, 400); // 400ms delay for realism
    }
}

function makeMove(cell, index, player) {
    board[index] = player;
    cell.textContent = player;
    cell.classList.add(player.toLowerCase());
    playSound(player.toLowerCase());
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    if (gameActive) statusText.textContent = `Player ${currentPlayer}'s Turn`;
}

function checkWinner() {
    let roundWon = false;
    let winningCells = [];

    for (let i = 0; i < WIN_CONDITIONS.length; i++) {
        const [a, b, c] = WIN_CONDITIONS[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            winningCells = [a, b, c];
            break;
        }
    }

    if (roundWon) {
        const winner = currentPlayer === 'X' ? 'O' : 'X'; // Because player already swapped
        statusText.textContent = `🎉 Player ${winner} Wins!`;
        statusText.style.color = winner === 'X' ? '#ff4136' : '#00d2ff';
        gameActive = false;
        playSound('win');
        
        // Highlight winning cells
        winningCells.forEach(idx => {
            cells[idx].style.background = 'rgba(255, 255, 255, 0.2)';
        });
        return;
    }

    if (!board.includes('')) {
        statusText.textContent = "It's a Tie! 🤝";
        statusText.style.color = "#FFD700";
        gameActive = false;
        playSound('tie');
    }
}

// --- AI Logic ---
function aiMove() {
    if (!gameActive) return;
    let index;
    
    if (modeSelect.value === 'ai_easy') {
        // Random available spot
        let available = board.map((val, idx) => val === '' ? idx : null).filter(val => val !== null);
        index = available[Math.floor(Math.random() * available.length)];
    } else {
        // Hard Mode: Minimax Algorithm (Unbeatable)
        index = getBestMove();
    }

    const cell = document.querySelector(`.cell[data-index='${index}']`);
    makeMove(cell, index, 'O');
    checkWinner();
}

function getBestMove() {
    let bestScore = -Infinity;
    let move;
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = 'O';
            let score = minimax(board, 0, false);
            board[i] = '';
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }
    return move;
}

const scores = { 'O': 10, 'X': -10, 'tie': 0 };
function minimax(boardState, depth, isMaximizing) {
    // Checking win locally inside minimax
    for (let combo of WIN_CONDITIONS) {
        if (boardState[combo[0]] && boardState[combo[0]] === boardState[combo[1]] && boardState[combo[0]] === boardState[combo[2]]) {
            return scores[boardState[combo[0]]];
        }
    }
    if (!boardState.includes('')) return scores['tie'];

    let bestScore = isMaximizing ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
        if (boardState[i] === '') {
            boardState[i] = isMaximizing ? 'O' : 'X';
            let score = minimax(boardState, depth + 1, !isMaximizing);
            boardState[i] = '';
            bestScore = isMaximizing ? Math.max(score, bestScore) : Math.min(score, bestScore);
        }
    }
    return bestScore;
}

// Reset Game
restartBtn.addEventListener('click', () => {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = true;
    statusText.textContent = "Player X's Turn";
    statusText.style.color = "white";
    cells.forEach(cell => {
        cell.textContent = '';
        cell.className = 'cell';
        cell.style.background = '';
    });
});

modeSelect.addEventListener('change', () => restartBtn.click());
cells.forEach(cell => {
    cell.addEventListener('mousedown', handleCellClick); // Use mousedown for faster desktop response
    cell.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleCellClick(e);
    }, { passive: false });
});