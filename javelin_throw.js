const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDisplay = document.getElementById('statusDisplay');
const bestScoreDisplay = document.getElementById('bestScoreDisplay');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const throwBtn = document.getElementById('throwBtn');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const newRecordMsg = document.getElementById('newRecordMsg');

const DESIGN_WIDTH = 800;
const DESIGN_HEIGHT = 400;
let scale = 1;

// Game variables
let gameState = 'start'; // 'start', 'running', 'aiming', 'flying', 'landed'
let player = { x: 100, y: 320 };
let speed = 0;
let lastTapped = '';
let throwAngle = 0; // 0 to 90 degrees
let angleDir = 1; // 1 (up) or -1 (down)
let javelin = { x: 0, y: 0, vx: 0, vy: 0, angle: 0 };
let camX = 0; // Camera X position

const FOUL_LINE_X = 1000;
const GROUND_Y = 320;
const GRAVITY = 0.4;
const MAX_SPEED = 14;

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
    if (localStorage.getItem('bgmEnabled') === 'false') return; 
    bgmStarted = true;
    const freqs = [196, 261.63, 329.63]; 
    freqs.forEach(freq => {
        const osc = audioCtx.createOscillator();
        osc.type = 'sine'; osc.frequency.value = freq;
        const gain = audioCtx.createGain(); gain.gain.value = 0.02; 
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine'; lfo.frequency.value = 0.1 + Math.random() * 0.1; 
        const lfoGain = audioCtx.createGain(); lfoGain.gain.value = 0.01;
        lfo.connect(lfoGain).connect(gain.gain);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(); lfo.start();
    });
}

function playStepSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

function playThrowSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.4); 
    gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.4);
}

function playThudSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = 'square'; osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

function playCheerSound() {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 2.5; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.8; 
    const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1000; 
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.5); 
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.5); 
    noise.connect(filter).connect(gain).connect(audioCtx.destination);
    noise.start();
}

function loadBestScore() {
    let best = localStorage.getItem('javelinBestScore');
    if (best) bestScoreDisplay.textContent = `Best: ${parseFloat(best).toFixed(2)}m`;
}

function resetGame() {
    gameState = 'running';
    player = { x: 100, y: GROUND_Y };
    speed = 0;
    lastTapped = '';
    throwAngle = 0;
    angleDir = 1;
    camX = 0;
    statusDisplay.textContent = "Run & Hold AIM to Throw!";
    statusDisplay.style.color = "white";
}

function resizeCanvas() {
    canvas.width = DESIGN_WIDTH; canvas.height = DESIGN_HEIGHT;
    scale = canvas.width / DESIGN_WIDTH; 
}

// Physics
function update() {
    if (gameState === 'running' || gameState === 'aiming') {
        speed *= 0.98; // Friction
        player.x += speed;
        camX = player.x - 200; // Camera follows player

        if (gameState === 'aiming') {
            throwAngle += angleDir * 2.5; // Angle oscillation speed
            if (throwAngle >= 80) angleDir = -1;
            if (throwAngle <= 10) angleDir = 1;
        }

        if (player.x > FOUL_LINE_X) {
            gameState = 'landed';
            statusDisplay.textContent = "FOUL! You crossed the line.";
            statusDisplay.style.color = "#F44336";
            setTimeout(resetGame, 2000);
        }
    } else if (gameState === 'flying') {
        javelin.vy += GRAVITY;
        javelin.x += javelin.vx;
        javelin.y += javelin.vy;
        javelin.angle = Math.atan2(javelin.vy, javelin.vx);
        
        camX = javelin.x - 400; // Camera follows javelin

        if (javelin.y >= GROUND_Y) {
            javelin.y = GROUND_Y;
            gameState = 'landed';
            playThudSound();
            
            // 20 pixels = 1 meter
            let distance = (javelin.x - FOUL_LINE_X) / 20; 
            if (distance > 0) {
                statusDisplay.textContent = `Distance: ${distance.toFixed(2)}m`;
                checkBestScore(distance);
            } else {
                statusDisplay.textContent = "Too short!";
            }
            setTimeout(resetGame, 3000);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camX, 0); // Apply Camera

    // Draw Track
    ctx.fillStyle = '#D2691E'; 
    ctx.fillRect(camX, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

    // Add track spots (Black, Red, White) for sense of speed
    for (let i = -1000; i < FOUL_LINE_X; i += 40) {
        if (i > camX - 50 && i < camX + canvas.width) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; 
            ctx.fillRect(i, GROUND_Y + 15, 12, 4);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; 
            ctx.fillRect(i + 15, GROUND_Y + 45, 12, 4);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.6)'; 
            ctx.fillRect(i + 30, GROUND_Y + 75, 12, 4);
        }
    }

    // Draw Grass (Throw area)
    ctx.fillStyle = '#4CAF50'; 
    ctx.fillRect(FOUL_LINE_X, GROUND_Y, Math.max(0, camX + canvas.width - FOUL_LINE_X), canvas.height - GROUND_Y);

    // Foul Line
    ctx.fillStyle = 'white';
    ctx.fillRect(FOUL_LINE_X - 10, GROUND_Y, 10, canvas.height - GROUND_Y);
    ctx.fillStyle = 'red';
    ctx.fillRect(FOUL_LINE_X, GROUND_Y, 5, canvas.height - GROUND_Y);

    // Distance markers in grass
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '16px sans-serif';
    for(let m = 10; m <= 120; m+=10) { 
        let markerX = FOUL_LINE_X + (m * 20); 
        if (markerX > camX && markerX < camX + canvas.width) {
            ctx.fillRect(markerX, GROUND_Y, 2, 20);
            ctx.fillText(m + 'm', markerX - 15, GROUND_Y + 35);
        }
    }

    // Draw Player
    if (gameState !== 'flying') {
        ctx.font = '50px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.save();
        ctx.translate(player.x, player.y - 25);
        ctx.scale(-1, 1); // Flip player to face right
        ctx.fillText('🏃‍♂️', 0, 0);
        ctx.restore();

        // Draw Javelin in hand
        ctx.save();
        ctx.translate(player.x + 10, player.y - 30);
        let currentRad = -(throwAngle * Math.PI / 180);
        ctx.rotate(gameState === 'aiming' ? currentRad : -0.2);
        ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = '#bbb'; ctx.beginPath(); ctx.moveTo(40, -3); ctx.lineTo(55, 0); ctx.lineTo(40, 3); ctx.fill();
        ctx.restore();

        // Draw Angle Meter Arc
        if (gameState === 'aiming') {
            ctx.beginPath();
            ctx.arc(player.x + 10, player.y - 30, 60, -Math.PI/2, 0);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 10; ctx.stroke();
            // Draw optimal zone
            ctx.beginPath();
            ctx.arc(player.x + 10, player.y - 30, 60, -50*Math.PI/180, -40*Math.PI/180);
            ctx.strokeStyle = 'rgba(255,215,0,0.8)'; ctx.lineWidth = 10; ctx.stroke();
        }
    }

    // Draw Flying Javelin
    if (gameState === 'flying' || gameState === 'landed') {
        ctx.save();
        ctx.translate(javelin.x, javelin.y);
        ctx.rotate(javelin.angle);
        ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = '#bbb'; ctx.beginPath(); ctx.moveTo(40, -3); ctx.lineTo(55, 0); ctx.lineTo(40, 3); ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}

function loop() { update(); draw(); requestAnimationFrame(loop); }

function checkBestScore(score) {
    let best = localStorage.getItem('javelinBestScore');
    if (!best || score > parseFloat(best)) {
        localStorage.setItem('javelinBestScore', score.toFixed(2));
        loadBestScore();
        playCheerSound();
        newRecordMsg.style.display = 'block'; newRecordMsg.style.animation = 'none';
        void newRecordMsg.offsetWidth; newRecordMsg.style.animation = 'popupFade 3s ease-in-out forwards';
        setTimeout(() => { newRecordMsg.style.display = 'none'; }, 3000);
    }
}

// Controls
function handleRun(key) {
    if (gameState !== 'running' && gameState !== 'aiming') return;
    if (key !== lastTapped) {
        speed = Math.min(speed + 1.2, MAX_SPEED);
        lastTapped = key;
        playStepSound();
    }
}

function startAiming() {
    if (gameState === 'running' && speed > 2) {
        gameState = 'aiming';
    }
}

function releaseThrow() {
    if (gameState === 'aiming') {
        gameState = 'flying';
        javelin.x = player.x + 10;
        javelin.y = player.y - 30;
        
        let rad = throwAngle * Math.PI / 180;
        let throwPower = speed * 2.2; // Power based on running speed
        
        javelin.vx = throwPower * Math.cos(rad);
        javelin.vy = -throwPower * Math.sin(rad) - 4; // Add slight base upward boost
        playThrowSound();
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyA') handleRun('A');
    if (e.code === 'KeyL') handleRun('L');
    if (e.code === 'Space' && gameState === 'running') startAiming();
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && gameState === 'aiming') releaseThrow();
});

leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleRun('A'); });
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleRun('L'); });
leftBtn.addEventListener('mousedown', () => handleRun('A'));
rightBtn.addEventListener('mousedown', () => handleRun('L'));

throwBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startAiming(); });
throwBtn.addEventListener('touchend', (e) => { e.preventDefault(); releaseThrow(); });
throwBtn.addEventListener('mousedown', startAiming);
window.addEventListener('mouseup', releaseThrow); // Catch mouseup anywhere

startBtn.addEventListener('click', () => {
    initAudio(); startScreen.style.display = 'none'; resetGame();
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); loadBestScore(); loop();