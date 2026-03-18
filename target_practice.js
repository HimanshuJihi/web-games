// Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const timeLeftEl = document.getElementById('time-left');
const targetScoreEl = document.getElementById('target-score');
const gameControlButton = document.getElementById('gameControlButton');

// --- RESPONSIVE SETUP ---
const DESIGN_WIDTH = 800; // Original design width
let scale = 1;

// Game constants
const GAME_DURATION = 30; // seconds
const TARGET_RADIUS = 35;
const TARGET_COLORS = ['#FFD700', '#FF4500', '#1E90FF', '#32CD32']; // Gold, OrangeRed, DodgerBlue, LimeGreen
const TARGET_SPAWN_INTERVAL = 700; // milliseconds
const LEVELS = [
    { target: 15 },
    { target: 25 },
    { target: 30 },
    { target: 40 },
    { target: 50 }
];

// Game state
let score = 0;
let timeLeft = GAME_DURATION;
let targets = [];
let gameInterval = null;
let spawnInterval = null;
let gameLoopId = null;
let countdownInterval = null;

// Auto-load saved level from browser's localStorage
let savedLevel = localStorage.getItem('targetSavedLevel');
let currentLevelIndex = savedLevel !== null ? parseInt(savedLevel) : 0;
if (isNaN(currentLevelIndex) || currentLevelIndex >= LEVELS.length || currentLevelIndex < 0) {
    currentLevelIndex = 0;
}

let gameState = 'menu'; // 'menu', 'countdown', 'playing', 'level_failed', 'level_complete', 'game_complete'
let countdownValue = 3;

// --- Drawing Functions ---
function drawTarget(target) {
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fillStyle = target.color;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3 * scale;
    ctx.stroke();
    ctx.closePath();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    targets.forEach(drawTarget);

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw messages based on gameState
    switch (gameState) {
        case 'countdown':
            ctx.font = `${80 * scale}px sans-serif`;
            ctx.fillText(countdownValue, canvas.width / 2, canvas.height / 2);
            break;
        case 'level_failed':
            ctx.font = `${40 * scale}px sans-serif`;
            ctx.fillText('Level Failed!', canvas.width / 2, canvas.height / 2 - 30 * scale);
            ctx.font = `${25 * scale}px sans-serif`;
            ctx.fillText(`You scored ${score} out of ${LEVELS[currentLevelIndex].target}`, canvas.width / 2, canvas.height / 2 + 20 * scale);
            break;
        case 'level_complete':
            ctx.font = `${40 * scale}px sans-serif`;
            ctx.fillText(`Level ${currentLevelIndex + 1} Complete!`, canvas.width / 2, canvas.height / 2);
            break;
        case 'game_complete':
            ctx.font = `${40 * scale}px sans-serif`;
            ctx.fillText('Congratulations!', canvas.width / 2, canvas.height / 2 - 30 * scale);
            ctx.font = `${25 * scale}px sans-serif`;
            ctx.fillText('You have completed all levels!', canvas.width / 2, canvas.height / 2 + 20 * scale);
            break;
    }
}

// --- Game Logic ---
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    scale = canvas.width / DESIGN_WIDTH;

    // Redraw everything after resize
    setupLevel(currentLevelIndex);
}

function spawnTarget() {
    if (gameState !== 'playing') return;

    const radius = TARGET_RADIUS * scale;
    const x = Math.random() * (canvas.width - 2 * radius) + radius;
    const y = Math.random() * (canvas.height - 2 * radius) + radius;
    const color = TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)];

    const newTarget = { x, y, radius, color };
    targets.push(newTarget);

    // Remove target after a short time if not hit
    setTimeout(() => {
        const index = targets.indexOf(newTarget);
        if (index > -1) {
            targets.splice(index, 1);
        }
    }, TARGET_SPAWN_INTERVAL * 2); // Target stays for 2 spawn intervals
}
function updateGame() {
    if (gameState !== 'playing') return;

    timeLeft--;
    timeLeftEl.textContent = timeLeft;

    if (timeLeft <= 0) {
        failLevel();
    }
}

function stopAllIntervals() {
    clearInterval(gameInterval);
    clearInterval(spawnInterval);
    clearInterval(countdownInterval);
    gameInterval = null;
    spawnInterval = null;
    countdownInterval = null;
}

function setupLevel(levelIndex) {
    stopAllIntervals();
    targets = [];
    currentLevelIndex = levelIndex;

    if (levelIndex >= LEVELS.length) {
        gameState = 'game_complete';
        gameControlButton.textContent = 'Play Again';
        gameControlButton.style.display = 'block';
        draw();
        return;
    }

    // Auto-save current progress
    localStorage.setItem('targetSavedLevel', currentLevelIndex);

    const level = LEVELS[levelIndex];
    score = 0;
    timeLeft = GAME_DURATION;
    
    // Update UI
    scoreEl.textContent = score;
    targetScoreEl.textContent = level.target;
    timeLeftEl.textContent = timeLeft;

    gameState = 'menu';
    gameControlButton.textContent = `Start Level ${levelIndex + 1}`;
    gameControlButton.style.display = 'block';
    draw();
}

function runCountdown() {
    gameState = 'countdown';
    gameControlButton.style.display = 'none';
    countdownValue = 3;

    countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue <= 0) {
            clearInterval(countdownInterval);
            startLevelGameplay();
        }
    }, 1000);
}

function startLevelGameplay() {
    gameState = 'playing';
    timeLeft = GAME_DURATION; // Reset timer
    timeLeftEl.textContent = timeLeft;

    gameInterval = setInterval(updateGame, 1000);
    spawnInterval = setInterval(spawnTarget, TARGET_SPAWN_INTERVAL);
}

function failLevel() {
    stopAllIntervals();
    gameState = 'level_failed';
    gameControlButton.textContent = 'Retry Level';
    gameControlButton.style.display = 'block';
}

function completeLevel() {
    stopAllIntervals();
    if (currentLevelIndex + 1 >= LEVELS.length) {
        gameState = 'game_complete';
        gameControlButton.textContent = 'Play Again';
        localStorage.setItem('targetSavedLevel', 0); // Reset save for next time
    } else {
        gameState = 'level_complete';
        gameControlButton.textContent = 'Next Level';
        localStorage.setItem('targetSavedLevel', currentLevelIndex + 1); // Save unlocked next level
    }
    gameControlButton.style.display = 'block';
}

// --- Drawing Loop ---
function gameLoop() {
    draw();
    gameLoopId = requestAnimationFrame(gameLoop);
}

// --- Input Handlers ---
function getEventPosition(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }
    return { x, y };
}

function handleClick(e) {
    if (gameState !== 'playing') return;

    const { x, y } = getEventPosition(e);

    for (let i = targets.length - 1; i >= 0; i--) {
        const target = targets[i];
        const distance = Math.sqrt((x - target.x)**2 + (y - target.y)**2);
        if (distance < target.radius) {
            score++;
            scoreEl.textContent = score;
            targets.splice(i, 1); // Remove hit target
            
            // Check for level completion
            if (score >= LEVELS[currentLevelIndex].target) {
                completeLevel();
            }
            break; // Only hit one target per click
        }
    }
}

// Event Listeners
gameControlButton.addEventListener('click', () => {
    switch (gameState) {
        case 'menu':
            runCountdown();
            break;
        case 'level_failed':
            setupLevel(currentLevelIndex);
            break;
        case 'level_complete':
            setupLevel(currentLevelIndex + 1);
            break;
        case 'game_complete':
            setupLevel(0);
            break;
    }
});
canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', handleClick);
window.addEventListener('resize', resizeCanvas);

// Initial setup
resizeCanvas();
gameLoop();