// Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const arrowsLeftEl = document.getElementById('arrows-left');
const targetScoreEl = document.getElementById('target-score');
const gameControlButton = document.getElementById('gameControlButton');
const arrowSelectionContainer = document.getElementById('arrow-selection');
const pauseBtn = document.getElementById('pauseBtn');
let isPaused = false;

// --- RESPONSIVE SETUP ---
const DESIGN_WIDTH = 1280;
let scale = 1;

// Game constants
const GRAVITY = 0.1;
const TOTAL_ARROWS = 5;
const LEVELS = [
    { targetScore: 25, arrows: 5, speed: 0 },
    { targetScore: 35, arrows: 5, speed: 0 },
    { targetScore: 42, arrows: 5, speed: 0 },
    { targetScore: 45, arrows: 5, speed: 2.5 },
    { targetScore: 50, arrows: 5, speed: 2.5 }
];
const ARROW_TYPES = {
    standard: {
        gravityFactor: 1.0,
        powerFactor: 0.2,
        color: '#A0522D' // Sienna
    },
    heavy: {
        gravityFactor: 1.3,
        powerFactor: 0.16, // Less power, less affected by drag
        color: '#8B4513' // SaddleBrown
    },
    light: {
        gravityFactor: 0.7,
        powerFactor: 0.24, // More power, more affected by drag
        color: '#D2B48C' // Tan
    }
};

// Game state
let score = 0;
let arrowsLeft = 0;
let gameState = 'menu'; // 'menu', 'countdown', 'aiming', 'flying', 'hit', 'level_failed', 'level_complete', 'game_complete'
let currentArrowType = 'standard';
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragPower = { x: 0, y: 0 };

// Auto-load saved level from browser's localStorage
let savedLevel = localStorage.getItem('archerySavedLevel');
let currentLevelIndex = savedLevel !== null ? parseInt(savedLevel) : 0;
if (isNaN(currentLevelIndex) || currentLevelIndex >= LEVELS.length || currentLevelIndex < 0) {
    currentLevelIndex = 0;
}

let countdownValue = 3;
let countdownInterval = null;
let lastHitArrowState = null; // To store arrow state at impact
let hitMarks = [];

// --- Audio Setup (Web Audio API) ---
let audioCtx = null;
let bgmStarted = false;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    startBackgroundMusic();
}

function startBackgroundMusic() {
    if (bgmStarted || !audioCtx) return;
    if (localStorage.getItem('bgmEnabled') === 'false') return; // Check user settings
    
    bgmStarted = true;
    const freqs = [196, 261.63, 329.63]; // C Major Drone (शांत बैकग्राउंड म्यूज़िक)
    freqs.forEach(freq => {
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const gain = audioCtx.createGain();
        gain.gain.value = 0.02; // बहुत ही धीमी आवाज़
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1 + Math.random() * 0.1; // आवाज़ को धीमे-धीमे ऊपर-नीचे करने के लिए
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 0.01;
        lfo.connect(lfoGain).connect(gain.gain);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start();
        lfo.start();
    });
}

function playShootSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playHitSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

let arrow = {};
let target = {};

// --- Drawing Functions ---
function drawBow() {
    ctx.strokeStyle = '#8B4513'; // SaddleBrown
    ctx.lineWidth = 8 * scale;
    ctx.beginPath();
    ctx.arc(arrow.x, arrow.y, 50 * scale, Math.PI * 1.5, Math.PI * 0.5);
    ctx.stroke();

    // Draw string
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(arrow.x, arrow.y - 50 * scale);
    if (isDragging) {
        ctx.lineTo(arrow.x + dragPower.x, arrow.y + dragPower.y);
    } else {
        ctx.lineTo(arrow.x, arrow.y);
    }
    ctx.lineTo(arrow.x, arrow.y + 50 * scale);
    ctx.stroke();
}

function drawArrow() {
    ctx.fillStyle = arrow.properties.color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2 * scale;
    
    let arrowX = arrow.x;
    let arrowY = arrow.y;
    let arrowAngle = arrow.angle;
    if (gameState === 'hit' && lastHitArrowState) {
        arrowX = lastHitArrowState.x;
        arrowY = lastHitArrowState.y;
        arrowAngle = lastHitArrowState.angle;
    }
    if (isDragging) {
        arrowX += dragPower.x;
        arrowY += dragPower.y;
    }

    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(arrowAngle);
    
    // Arrow body
    ctx.fillRect(-40 * scale, -2 * scale, 80 * scale, 4 * scale);
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(40 * scale, -5 * scale);
    ctx.lineTo(50 * scale, 0);
    ctx.lineTo(40 * scale, 5 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawTarget() {
    const colors = ['#FFFFFF', '#000000', '#1E90FF', '#FF4500', '#FFD700']; // White to Gold
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius * (1 - i * 0.2), 0, Math.PI * 2);
        ctx.fill();
    }
}

function calculateTrajectory(initialVx, initialVy, startX, startY) {
    const points = [];
    let x = startX;
    let y = startY;
    let vx = initialVx;
    let vy = initialVy;
    const gravity = (GRAVITY * scale) * ARROW_TYPES[currentArrowType].gravityFactor;

    for (let i = 0; i < 100; i++) { // Simulate 100 frames
        vy += gravity;
        x += vx;
        y += vy;

        if (i % 4 === 0) { // Add a point every 4 frames for a dotted/dashed look
            points.push({ x, y });
        }

        if (x > canvas.width || y > canvas.height || x < 0) {
            break;
        }
    }
    return points;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTarget();
    if (gameState === 'aiming' || gameState === 'menu' || gameState === 'countdown') {
        drawBow();
    }

    // Draw the hit marks on the target
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    hitMarks.forEach(mark => {
        ctx.beginPath();
        ctx.arc(mark.x, mark.y, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
    });
    if (['aiming', 'flying', 'countdown', 'menu', 'hit'].includes(gameState)) {
        drawArrow();
    }

    // Draw messages
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw trajectory prediction line for the first 3 levels
    if (isDragging && gameState === 'aiming' && currentLevelIndex < 3) {
        const tempArrowProps = ARROW_TYPES[currentArrowType];
        const initialVx = -dragPower.x * tempArrowProps.powerFactor;
        const initialVy = -dragPower.y * tempArrowProps.powerFactor;
        
        const startX = arrow.x + dragPower.x;
        const startY = arrow.y + dragPower.y;

        const trajectoryPoints = calculateTrajectory(initialVx, initialVy, startX, startY);

        ctx.beginPath();
        ctx.setLineDash([3 * scale, 7 * scale]); // Dashed line
        if (trajectoryPoints.length > 0) {
            ctx.moveTo(trajectoryPoints[0].x, trajectoryPoints[0].y);
            for (let i = 1; i < trajectoryPoints.length; i++) {
                ctx.lineTo(trajectoryPoints[i].x, trajectoryPoints[i].y);
            }
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
        ctx.setLineDash([]); // Reset to solid line
    }

    switch (gameState) {
        case 'countdown':
            ctx.font = `${80 * scale}px sans-serif`;
            ctx.fillText(countdownValue, canvas.width / 2, canvas.height / 2);
            break;
        case 'level_failed':
            ctx.font = `${40 * scale}px sans-serif`;
            ctx.fillText('Level Failed!', canvas.width / 2, canvas.height / 2 - 30 * scale);
            ctx.font = `${25 * scale}px sans-serif`;
            ctx.fillText(`You scored ${score} out of ${LEVELS[currentLevelIndex].targetScore}`, canvas.width / 2, canvas.height / 2 + 20 * scale);
            break;
        case 'level_complete':
            ctx.font = `${40 * scale}px sans-serif`;
            ctx.fillText(`Level ${currentLevelIndex + 1} Complete!`, canvas.width / 2, canvas.height / 2);
            break;
        case 'game_complete':
            ctx.font = `${40 * scale}px sans-serif`;
            ctx.fillText('Congratulations!', canvas.width / 2, canvas.height / 2 - 30 * scale);
            ctx.font = `${25 * scale}px sans-serif`;
            ctx.fillText('You are the Archery Champion!', canvas.width / 2, canvas.height / 2 + 20 * scale);
            break;
    }

    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = `bold ${50 * scale}px sans-serif`;
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
}

// --- Game Logic ---
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    scale = canvas.width / DESIGN_WIDTH;
    setupLevel(currentLevelIndex);
}

function resetArrow() {
    arrow = {
        x: 100 * scale,
        y: canvas.height / 2,
        velocityX: 0,
        velocityY: 0,
        angle: 0,
        isFlying: false,
        properties: ARROW_TYPES[currentArrowType]
    };
    lastHitArrowState = null; // Clear previous hit state
}

function stopAllIntervals() {
    clearInterval(countdownInterval);
    countdownInterval = null;
}

function setupLevel(levelIndex) {
    stopAllIntervals();
    hitMarks = [];
    currentLevelIndex = levelIndex;

    if (levelIndex >= LEVELS.length) {
        gameState = 'game_complete';
        gameControlButton.textContent = 'Play Again';
        gameControlButton.style.display = 'block';
        arrowSelectionContainer.style.display = 'none';
        draw();
        return;
    }

    // Auto-save current progress
    localStorage.setItem('archerySavedLevel', currentLevelIndex);

    const level = LEVELS[levelIndex];
    score = 0;
    arrowsLeft = level.arrows;

    // Update UI
    scoreEl.textContent = score;
    targetScoreEl.textContent = level.targetScore;
    arrowsLeftEl.textContent = arrowsLeft;

    target = {
        x: canvas.width - 150 * scale,
        y: canvas.height / 2,
        radius: 90 * scale,
        speedY: (level.speed || 0) * scale
    };

    gameState = 'menu';
    gameControlButton.textContent = `Start Level ${levelIndex + 1}`;
    gameControlButton.style.display = 'block';
    arrowSelectionContainer.style.display = 'none';
    pauseBtn.style.display = 'none';
    resetArrow();
    draw();
}

function runCountdown() {
    gameState = 'countdown';
    gameControlButton.style.display = 'none';
    arrowSelectionContainer.style.display = 'none';
    countdownValue = 3;
    draw(); // Initial draw for '3'

    countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue <= 0) {
            clearInterval(countdownInterval);
            startLevelGameplay();
        }
    }, 1000);
}

function startLevelGameplay() {
    gameState = 'aiming';
    arrowSelectionContainer.style.display = 'flex';
    pauseBtn.style.display = 'block';
    isPaused = false; pauseBtn.textContent = '⏸ Pause';
    resetArrow();
}

function update() {
    if (isPaused) return;
    // --- Target Movement ---
    if (gameState === 'countdown' || gameState === 'aiming' || gameState === 'flying') {
        target.y += target.speedY;

        // Bounce off top/bottom edges
        if ((target.y - target.radius < 0 && target.speedY < 0) || (target.y + target.radius > canvas.height && target.speedY > 0)) {
            target.speedY *= -1;
        }
    }

    if (gameState !== 'flying') return; // Stop if arrow is not in flight

    // --- Arrow Physics ---
    arrow.velocityY += (GRAVITY * scale) * arrow.properties.gravityFactor;
    arrow.x += arrow.velocityX;
    arrow.y += arrow.velocityY;
    arrow.angle = Math.atan2(arrow.velocityY, arrow.velocityX);

    // --- Hit Detection ---
    const arrowTipX = arrow.x + (50 * scale) * Math.cos(arrow.angle);
    const arrowTipY = arrow.y + (50 * scale) * Math.sin(arrow.angle);

    // 2D गेम में सही स्कोर के लिए, हम तब तक इंतज़ार करते हैं जब तक तीर की नोक निशाने की 
    // बीच वाली वर्टिकल लाइन (target.x) तक नहीं पहुँच जाती।
    const prevArrowTipX = arrowTipX - arrow.velocityX;

    if (prevArrowTipX <= target.x && arrowTipX >= target.x) {
        const dy = arrowTipY - target.y;
        const distance = Math.abs(dy); // केंद्र से केवल वर्टिकल दूरी मापें

        if (distance <= target.radius) {
        gameState = 'hit'; // Stop the arrow's physics updates

            // तीर को बिल्कुल बीच वाली लाइन पर सेट करें ताकि वह धंसा हुआ दिखे
            arrow.x -= (arrowTipX - target.x);

        // Store the arrow's state at the moment of impact for drawing
        lastHitArrowState = {
            x: arrow.x,
            y: arrow.y,
            angle: arrow.angle,
            properties: arrow.properties
        };

            hitMarks.push({ x: target.x, y: arrowTipY }); // हिट मार्क को भी बीच वाली लाइन पर बनाएँ
        // New scoring system based on colored rings
        let points = 0;
            if (distance <= target.radius * 0.2) points = 10; // Yellow
            else if (distance <= target.radius * 0.4) points = 7; // Red
            else if (distance <= target.radius * 0.6) points = 5; // Blue
            else if (distance <= target.radius * 0.8) points = 3; // Black
            else points = 1; // White
        
        score += points;
        scoreEl.textContent = score;
        playHitSound(); // हिट साउंड प्ले करें

        // Wait a moment to show the hit before starting the next shot
        setTimeout(() => nextShot(), 500); // 500ms delay
        return; // Exit update function for this frame
        }
    }

    // Check if off-screen
    if (arrow.y > canvas.height || arrow.x > canvas.width || arrow.x < 0) {
        gameState = 'hit'; // Use 'hit' state to stop physics even on a miss
        setTimeout(() => nextShot(), 200); // Proceed after a short delay
    }
}

function nextShot() {
    const level = LEVELS[currentLevelIndex];

    // Check for win condition first
    if (score >= level.targetScore) {
        completeLevel();
        return; // Stop further processing
    }

    // If not won, decrement arrows and check for loss condition
    arrowsLeft--;
    arrowsLeftEl.textContent = arrowsLeft;
    if (arrowsLeft <= 0) {
        failLevel();
        return; // Stop further processing
    }

    // If not won and not lost, prepare for the next shot
    gameState = 'aiming';
    resetArrow();
}

function failLevel() {
    isPaused = false; pauseBtn.textContent = '⏸ Pause';
    pauseBtn.style.display = 'none';
    gameState = 'level_failed';
    gameControlButton.textContent = 'Retry Level';
    gameControlButton.style.display = 'block';
    arrowSelectionContainer.style.display = 'none';
}

function completeLevel() {
    isPaused = false; pauseBtn.textContent = '⏸ Pause';
    pauseBtn.style.display = 'none';
    if (currentLevelIndex + 1 >= LEVELS.length) {
        gameState = 'game_complete';
        gameControlButton.textContent = 'Play Again';
        localStorage.setItem('archerySavedLevel', 0); // Game beaten, reset save for next time
    } else {
        gameState = 'level_complete';
        gameControlButton.textContent = 'Next Level';
        localStorage.setItem('archerySavedLevel', currentLevelIndex + 1); // Save unlocked next level
    }
    gameControlButton.style.display = 'block';
    arrowSelectionContainer.style.display = 'none';
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Input Handlers ---
function getEventPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function handleDragStart(e) {
    if (gameState !== 'aiming' || isPaused) return;
    initAudio(); // स्टार्ट ऑडियो
    isDragging = true;
    dragStart = getEventPosition(e);
}

function handleDragMove(e) {
    if (!isDragging || isPaused) return;
    const currentPos = getEventPosition(e);
    dragPower.x = Math.max(-100 * scale, Math.min(0, currentPos.x - dragStart.x));
    dragPower.y = Math.max(-100 * scale, Math.min(100 * scale, currentPos.y - dragStart.y));
}

function handleDragEnd() {
    if (!isDragging || isPaused) return;
    isDragging = false;
    gameState = 'flying';
    arrow.velocityX = -dragPower.x * arrow.properties.powerFactor;
    arrow.velocityY = -dragPower.y * arrow.properties.powerFactor;
    dragPower = { x: 0, y: 0 };
    playShootSound(); // शूट साउंड
}

// Event Listeners
gameControlButton.addEventListener('click', () => {
    initAudio(); // स्टार्ट ऑडियो
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

const arrowSelectionButtons = document.querySelectorAll('.arrow-btn');
arrowSelectionButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (gameState !== 'aiming') return;

        arrowSelectionButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        
        currentArrowType = button.dataset.arrowType;
        // Update the current arrow's properties for immediate visual feedback (color)
        if (arrow) {
            arrow.properties = ARROW_TYPES[currentArrowType];
        }
    });
});

pauseBtn.addEventListener('click', () => {
    if (gameState === 'aiming' || gameState === 'flying') {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
    }
});

canvas.addEventListener('mousedown', handleDragStart);
canvas.addEventListener('mousemove', handleDragMove);
window.addEventListener('mouseup', handleDragEnd); // Use window to catch mouseup outside canvas

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleDragStart(e);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handleDragMove(e);
}, { passive: false });
window.addEventListener('touchend', handleDragEnd);

window.addEventListener('resize', resizeCanvas);

// Initial setup
resizeCanvas();
gameLoop();