// Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const targetScoreEl = document.getElementById('target-score');
const roundEl = document.getElementById('round');
const ammoEl = document.getElementById('ammo');
const gameControlButton = document.getElementById('gameControlButton');

const DESIGN_WIDTH = 1280;
let scale = 1;
const GRAVITY = 0.15;

// --- Audio Setup (Web Audio API) ---
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playGunshotSound() {
    if (!audioCtx) return;

    // 1. Noise part (The crack of the gunshot)
    const bufferSize = audioCtx.sampleRate * 0.3; // 0.3 seconds
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 2000;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(1, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    noise.connect(noiseFilter).connect(noiseGain).connect(audioCtx.destination);
    noise.start();

    // 2. Oscillator part (The low thump of the blast)
    const osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(oscGain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

let gameState = 'menu'; // 'menu', 'playing', 'round_complete', 'round_failed', 'game_complete'
let score = 0;

// Auto-load saved round from browser's localStorage
let savedRound = localStorage.getItem('skeetSavedRound');
let currentRound = savedRound !== null ? parseInt(savedRound) : 1;
if (isNaN(currentRound) || currentRound > TOTAL_ROUNDS || currentRound < 1) {
    currentRound = 1;
}
let ammo = 0;
let pigeons = [];
let particles = [];
let pigeonsToSpawn = 0;
let spawnTimer = 0;
const TOTAL_ROUNDS = 5;

// Difficulty configurations for each round
const ROUND_CONFIG = [
    { count: 3, delay: 100, speed: 1.0, ammo: 5, targetScore: 20 }, // 2 hits required
    { count: 5, delay: 80, speed: 1.2, ammo: 7, targetScore: 30 }, // 3 hits required
    { count: 8, delay: 60, speed: 1.4, ammo: 10, targetScore: 50 }, // 5 hits required
    { count: 12, delay: 45, speed: 1.6, ammo: 15, targetScore: 80 }, // 8 hits required
    { count: 15, delay: 35, speed: 1.8, ammo: 18, targetScore: 100 } // 10 hits required
];

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    scale = canvas.width / DESIGN_WIDTH;
}

function spawnPigeon() {
    const config = ROUND_CONFIG[currentRound - 1];
    const direction = Math.random() > 0.5 ? 1 : -1; // 1 = left to right, -1 = right to left
    
    // Start near the horizon line
    const startX = direction === 1 ? -50 * scale : canvas.width + 50 * scale;
    const startY = canvas.height * 0.6 + (Math.random() * 50 * scale);
    
    const vx = (Math.random() * 5 + 6) * scale * direction * config.speed;
    const vy = -(Math.random() * 5 + 12) * scale * config.speed;
    
    pigeons.push({
        x: startX,
        y: startY,
        vx: vx,
        vy: vy,
        radius: 25 * scale,
        active: true
    });
}

function createExplosion(x, y) {
    for (let i = 0; i < 25; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 15 * scale,
            vy: (Math.random() - 0.5) * 15 * scale,
            life: 20 + Math.random() * 20,
            color: Math.random() > 0.5 ? '#FF4500' : '#333333' // Orange or Dark Grey
        });
    }
}

function update() {
    if (gameState !== 'playing') return;

    // Spawn logic
    if (pigeonsToSpawn > 0) {
        spawnTimer--;
        if (spawnTimer <= 0) {
            spawnPigeon();
            pigeonsToSpawn--;
            spawnTimer = ROUND_CONFIG[currentRound - 1].delay;
        }
    }

    // Update targets
    let anyPigeonActive = false;
    pigeons.forEach(p => {
        if (p.active) {
            p.vy += GRAVITY * scale;
            p.x += p.vx;
            p.y += p.vy;
            
            // If pigeon falls below the screen, it's missed
            if (p.y > canvas.height + 50 * scale) {
                p.active = false;
            } else {
                anyPigeonActive = true;
            }
        }
    });

    // Update explosion particles
    particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(index, 1);
    });

    // Check for round end (no targets left to spawn, none in air, particles settled)
    if (pigeonsToSpawn === 0 && !anyPigeonActive && particles.length === 0) {
        endRound();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw targets
    pigeons.forEach(p => {
        if (p.active) {
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.radius, p.radius * 0.4, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#FF4500'; // OrangeRed Target
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
            
            // Target detail rings
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.radius * 0.6, p.radius * 0.2, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    // Draw particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 40; // Fade out effect
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw UI Overlays
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (gameState === 'round_complete') {
        ctx.font = `bold ${50 * scale}px sans-serif`;
        ctx.fillText(`Round ${currentRound} Complete!`, canvas.width / 2, canvas.height / 2 - 30 * scale);
    } else if (gameState === 'round_failed') {
        ctx.font = `bold ${50 * scale}px sans-serif`;
        ctx.fillText(`Level Failed!`, canvas.width / 2, canvas.height / 2 - 30 * scale);
        ctx.font = `bold ${30 * scale}px sans-serif`;
        ctx.fillText(`Score: ${score} / ${ROUND_CONFIG[currentRound - 1].targetScore}`, canvas.width / 2, canvas.height / 2 + 20 * scale);
    } else if (gameState === 'game_complete') {
        ctx.font = `bold ${60 * scale}px sans-serif`;
        ctx.fillText(`Champion!`, canvas.width / 2, canvas.height / 2 - 40 * scale);
        ctx.font = `bold ${35 * scale}px sans-serif`;
        ctx.fillText(`You beat all levels!`, canvas.width / 2, canvas.height / 2 + 30 * scale);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function startRound() {
    const config = ROUND_CONFIG[currentRound - 1];
    pigeonsToSpawn = config.count;
    ammo = config.ammo;
    spawnTimer = config.delay;
    score = 0; // Reset score for the new challenge level
    
    // Auto-save current progress
    localStorage.setItem('skeetSavedRound', currentRound);
    pigeons = [];
    particles = [];
    
    scoreEl.textContent = score;
    targetScoreEl.textContent = config.targetScore;
    ammoEl.textContent = ammo;
    roundEl.textContent = currentRound;
    
    gameState = 'playing';
    gameControlButton.style.display = 'none';
}

function endRound() {
    const config = ROUND_CONFIG[currentRound - 1];
    if (score >= config.targetScore) {
        if (currentRound >= TOTAL_ROUNDS) {
            gameState = 'game_complete';
            gameControlButton.textContent = 'Play Again';
            localStorage.setItem('skeetSavedRound', 1); // Reset save for next time
        } else {
            gameState = 'round_complete';
            gameControlButton.textContent = 'Next Level';
            localStorage.setItem('skeetSavedRound', currentRound + 1); // Save unlocked next level
        }
    } else {
        gameState = 'round_failed';
        gameControlButton.textContent = 'Retry Level';
    }
    gameControlButton.style.display = 'block';
}

function handleShoot(e) {
    if (gameState !== 'playing' || ammo <= 0) return;
    
    ammo--;
    ammoEl.textContent = ammo;

    playGunshotSound(); // गनशॉट की आवाज़ प्ले करें

    const rect = canvas.getBoundingClientRect();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    // Visual flash for shooting
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Hit Detection
    pigeons.forEach(p => {
        if (!p.active) return;
        const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
        // Using a slightly larger hit radius than the object for easier gameplay
        if (dist < p.radius + 30 * scale) {
            p.active = false;
            score += 10;
            scoreEl.textContent = score;
            createExplosion(p.x, p.y);
        }
    });
}

// Events
gameControlButton.addEventListener('click', () => {
    initAudio(); // बटन क्लिक पर ऑडियो इंजन चालू करें
    if (gameState === 'game_complete') {
        score = 0;
        currentRound = 1;
        scoreEl.textContent = score;
        startRound();
    } else if (gameState === 'round_complete') {
        currentRound++;
        startRound();
    } else if (gameState === 'round_failed') {
        startRound();
    } else if (gameState === 'menu') {
        startRound();
    }
});

canvas.addEventListener('mousedown', handleShoot);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent accidental double taps on mobile
    handleShoot(e);
}, { passive: false });
window.addEventListener('resize', resizeCanvas);

// Init
resizeCanvas();
gameLoop();