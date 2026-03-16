// Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const targetScoreEl = document.getElementById('target-score');
const shotsLeftEl = document.getElementById('shots-left');
const challengeDisplayEl = document.getElementById('challenge-display');
const nextChallengeButton = document.getElementById('next-challenge-button');
const retryButton = document.getElementById('retry-button');
const shotClockDisplayEl = document.getElementById('shot-clock-display');
const shotClockEl = document.getElementById('shot-clock');

// --- RESPONSIVE SETUP ---
const DESIGN_WIDTH = 400;
let scale = 1;

// Game constants
let GRAVITY = 0.2; // Will be scaled
const BOUNCE_FACTOR = 0.7;
const SHOT_CLOCK_DURATION = 5;
const challenges = [
    { target: 3, shots: 5, hoopSpeed: 0 },      // Level 1: Static hoop
    { target: 7, shots: 9, hoopSpeed: 0.8 },    // Level 2: Slow moving hoop
    { target: 5, shots: 5, hoopSpeed: 1.5 }     // Level 3: Fast moving hoop
];

// Game state
let currentChallengeIndex = 0;
let currentScore = 0;
let shotsLeft = 0;
let gameState = 'playing'; // 'playing', 'won', 'lost', 'end'
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let shotClockTime = SHOT_CLOCK_DURATION;
let shotClockInterval = null;

// Ball properties
let ball = {
    x: 0,
    y: 0,
    radius: 15, // will be scaled
    velocityX: 0,
    velocityY: 0,
    isShooting: false
};

// Hoop properties
let hoop = {
    x: 0,
    y: 0,
    width: 80, // will be scaled
    rimWidth: 10, // will be scaled
    speedX: 0
};

let backboard = {
    x: 0,
    y: 0,
    width: 5, // will be scaled
    height: 80 // will be scaled
};

// --- Drawing Functions ---
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FF8C00'; // Orange
    ctx.fill();
    ctx.closePath();
}

function drawHoop() {
    // Backboard
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(backboard.x, backboard.y, backboard.width, backboard.height);

    // Rim
    ctx.strokeStyle = '#DC143C'; // Crimson
    ctx.lineWidth = hoop.rimWidth;
    ctx.beginPath();
    ctx.ellipse(hoop.x, hoop.y, hoop.width / 2, 10 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();
}

// --- Game Logic ---
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 50 * scale;
    ball.radius = 15 * scale;
    ball.velocityX = 0;
    ball.velocityY = 0;
    ball.isShooting = false;
    isDragging = false; // Ensure dragging state is reset

    // Start the shot clock if we are in a playing state
    if (gameState === 'playing') {
        startShotClock();
    }
}

function stopShotClock() {
    if (shotClockInterval) {
        clearInterval(shotClockInterval);
        shotClockInterval = null;
    }
    shotClockDisplayEl.style.display = 'none';
}

function startShotClock() {
    stopShotClock(); // Clear any existing timer
    shotClockTime = SHOT_CLOCK_DURATION;
    shotClockEl.textContent = shotClockTime;
    shotClockDisplayEl.style.display = 'inline';

    shotClockInterval = setInterval(() => {
        shotClockTime--;
        shotClockEl.textContent = shotClockTime;
        if (shotClockTime <= 0) {
            handleShotClockViolation();
        }
    }, 1000);
}

function handleShotClockViolation() {
    shotsLeft--;
    shotsLeftEl.textContent = shotsLeft;
    resetBall();
    checkChallengeStatus(); // Check if the game is lost due to running out of shots
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    scale = canvas.width / DESIGN_WIDTH;

    // Update game constants based on scale
    GRAVITY = 0.2 * scale;

    // Update object properties
    hoop.x = canvas.width / 2;
    hoop.y = 150 * scale;
    hoop.width = 80 * scale;
    hoop.rimWidth = 10 * scale;

    backboard.x = hoop.x + hoop.width / 2;
    backboard.y = hoop.y - 60 * scale;
    backboard.width = 5 * scale;
    backboard.height = 80 * scale;

    setupChallenge(currentChallengeIndex);
}

function setupChallenge(challengeIndex) {
    stopShotClock();
    if (challengeIndex >= challenges.length) {
        gameState = 'end';
        challengeDisplayEl.innerHTML = `<h2>Congratulations!</h2><p>You have completed all challenges!</p>`;
        retryButton.textContent = "Play Again";
        retryButton.style.display = 'block';
        nextChallengeButton.style.display = 'none';
        return;
    }

    currentChallengeIndex = challengeIndex;
    const challenge = challenges[currentChallengeIndex];
    hoop.speedX = (challenge.hoopSpeed || 0) * scale;

    currentScore = 0;
    shotsLeft = challenge.shots;
    gameState = 'playing';

    // Update UI
    challengeDisplayEl.innerHTML = `<h2>Level ${currentChallengeIndex + 1}</h2><p>Score ${challenge.target} baskets in ${challenge.shots} shots!</p>`;
    scoreEl.textContent = currentScore;
    targetScoreEl.textContent = challenge.target;
    shotsLeftEl.textContent = shotsLeft;

    // Hide buttons
    nextChallengeButton.style.display = 'none';
    retryButton.style.display = 'none';
    retryButton.textContent = "Retry";

    resetBall();
}

function update() {
    // --- Hoop Movement Logic ---
    if (hoop.speedX !== 0) {
        hoop.x += hoop.speedX;
        backboard.x = hoop.x + hoop.width / 2;

        // Boundary check for hoop to move back and forth
        if (hoop.x + hoop.width / 2 + backboard.width > canvas.width || hoop.x - hoop.width / 2 < 0) {
            hoop.speedX *= -1;
        }
    }

    if (ball.isShooting) {
        // Apply gravity
        ball.velocityY += GRAVITY;

        // Update position
        ball.x += ball.velocityX;
        ball.y += ball.velocityY;

        // Check for score
        // Simple scoring: if ball passes through the hoop from above
        if (ball.y > hoop.y - ball.radius && ball.y < hoop.y + 10 * scale && // Check y-pos relative to hoop
            ball.x > hoop.x - hoop.width / 2 && ball.x < hoop.x + hoop.width / 2 &&
            ball.velocityY > 0) {
            currentScore++;
            scoreEl.textContent = currentScore;
            resetBall();
            checkChallengeStatus();
            return;
        }

        // Check for wall bounce
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.velocityX *= -BOUNCE_FACTOR;
        }
        
        // Check for backboard bounce
        if (ball.x + ball.radius > backboard.x && ball.y > backboard.y && ball.y < backboard.y + backboard.height) {
            ball.velocityX *= -BOUNCE_FACTOR;
        }

        // Reset if ball goes off screen
        if (ball.y > canvas.height) {
            resetBall();
            checkChallengeStatus();
        }
    }
}

function checkChallengeStatus() {
    if (gameState !== 'playing') return;

    const challenge = challenges[currentChallengeIndex];

    // Win condition
    if (currentScore >= challenge.target) {
        gameState = 'won';
        stopShotClock();
        challengeDisplayEl.innerHTML = `<h2>Level ${currentChallengeIndex + 1} Complete!</h2>`;
        if (currentChallengeIndex < challenges.length - 1) {
            nextChallengeButton.style.display = 'block';
        } else {
            // Last level won
            setupChallenge(currentChallengeIndex + 1);
        }
        return;
    }

    // Lose condition
    if (shotsLeft <= 0) {
        gameState = 'lost';
        stopShotClock();
        challengeDisplayEl.innerHTML = `<h2>Level Failed.</h2><p>You scored ${currentScore} out of ${challenge.target}.</p>`;
        retryButton.style.display = 'block';
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawHoop();
    drawBall();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Input Handlers ---
function getEventPosition(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        x = e.changedTouches[0].clientX - rect.left;
        y = e.changedTouches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }
    return { x, y };
}

function handleDragStart(e) {
    if (ball.isShooting || gameState !== 'playing') return;
    isDragging = true;
    dragStart = getEventPosition(e);
}

function handleDragEnd(e) {
    if (!isDragging || gameState !== 'playing') return;
    isDragging = false;

    const dragEnd = getEventPosition(e);
    
    // Calculate swipe vector
    const swipeX = dragEnd.x - dragStart.x;
    const swipeY = dragEnd.y - dragStart.y;

    // Set ball velocity based on swipe (adjust multipliers as needed)
    ball.velocityX = swipeX * 0.1;
    ball.velocityY = swipeY * 0.1;
    ball.isShooting = true;

    stopShotClock();
    // A shot is taken
    shotsLeft--;
    shotsLeftEl.textContent = shotsLeft;
}

// Event Listeners
canvas.addEventListener('mousedown', handleDragStart);
canvas.addEventListener('mouseup', handleDragEnd);
canvas.addEventListener('mouseleave', handleDragEnd); // Handle case where mouse leaves canvas
canvas.addEventListener('touchstart', handleDragStart);
canvas.addEventListener('touchend', handleDragEnd);
window.addEventListener('resize', resizeCanvas);

nextChallengeButton.addEventListener('click', () => {
    setupChallenge(currentChallengeIndex + 1);
});

retryButton.addEventListener('click', () => {
    if (gameState === 'end') {
        setupChallenge(0); // Play Again from level 1
    } else {
        setupChallenge(currentChallengeIndex); // Retry current level
    }
});

// Start game
resizeCanvas();
gameLoop();