const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDisplay = document.getElementById('statusDisplay');
const bestScoreDisplay = document.getElementById('bestScoreDisplay');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const jumpBtn = document.getElementById('jumpBtn');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const newRecordMsg = document.getElementById('newRecordMsg');

// Canvas setup
const DESIGN_WIDTH = 800;
const DESIGN_HEIGHT = 400;
let scale = 1;

// Game variables
let gameState = 'start'; // 'start', 'running', 'jumping', 'landed', 'ai_running', 'ai_jumping', 'ai_landed'
let player = { x: 50, y: 300, vx: 0, vy: 0, angle: 0 };
let ai = { x: 50, y: 300, vx: 0, vy: 0, angle: 0, distance: 0 };
let speed = 0; // Current running speed
let lastTapped = '';
let playerDistance = 0;

const FOUL_LINE_X = 400; // Middle of the screen
const GROUND_Y = 300;
const GRAVITY = 0.6; // ग्रेविटी बढ़ाई गई ताकि हवा में ज़्यादा देर न रहे
const MAX_SPEED = 12;

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
    const freqs = [196, 261.63, 329.63]; 
    freqs.forEach(freq => {
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const gain = audioCtx.createGain();
        gain.gain.value = 0.02; 
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1 + Math.random() * 0.1; 
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 0.01;
        lfo.connect(lfoGain).connect(gain.gain);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start();
        lfo.start();
    });
}

function playStepSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playJumpSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.3); // Ascending swoosh
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function playSandLandingSound() {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 0.3; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5; 
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300; // Deep sand thump
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    noise.connect(filter).connect(gain).connect(audioCtx.destination);
    noise.start();
}

function playCheerSound() {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 2.5; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.8; 
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000; 
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.5); 
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.5); 
    noise.connect(filter).connect(gain).connect(audioCtx.destination);
    noise.start();
}

function loadBestScore() {
    let best = localStorage.getItem('longJumpBestScore');
    if (best) {
        bestScoreDisplay.textContent = `Best: ${parseFloat(best).toFixed(2)}m`;
    }
}

function resetGame() {
    gameState = 'running';
    player = { x: 50, y: GROUND_Y, vx: 0, vy: 0, angle: 0 };
    ai = { x: 50, y: GROUND_Y, vx: 0, vy: 0, angle: 0, distance: 0 };
    speed = 0;
    lastTapped = '';
    playerDistance = 0;
    ai.distance = 0;
    statusDisplay.textContent = "Your Turn! Run & Jump!";
    statusDisplay.style.color = "white";
}

function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = DESIGN_WIDTH;
    canvas.height = DESIGN_HEIGHT;
    // Let CSS handle the visual scaling, internal coordinates remain 800x400
    scale = canvas.width / DESIGN_WIDTH; 
}

// Game Loop & Physics
function update() {
    if (gameState === 'running') {
        // Speed decay (friction)
        speed *= 0.98;
        
        // Move player forward
        player.x += speed;

        // Strict check for foul (running past the red line without jumping)
        if (player.x > FOUL_LINE_X) {
            gameState = 'landed';
            playerDistance = 0;
            statusDisplay.textContent = "FOUL! You crossed the line. AI's turn...";
            statusDisplay.style.color = "#F44336";
            setTimeout(() => { gameState = 'ai_running'; statusDisplay.textContent = `Player: FOUL | AI is running...`; }, 2000);
        }
    } else if (gameState === 'jumping') {
        // Projectile motion
        player.vy += GRAVITY;
        player.x += player.vx;
        player.y += player.vy;
        player.angle += 0.05; // Rotate player slightly in air

        // Landing
        if (player.y >= GROUND_Y) {
            player.y = GROUND_Y;
            player.angle = 0;
            gameState = 'landed';
            playSandLandingSound();
            
            // Calculate distance based on landing spot relative to foul line
            // 45 pixels = 1 meter (Realistic scaling)
            playerDistance = (player.x - FOUL_LINE_X) / 45; 
            if (playerDistance > 0) {
                statusDisplay.textContent = `Player: ${playerDistance.toFixed(2)}m. AI is getting ready...`;
                checkBestScore(playerDistance);
            } else {
                playerDistance = 0;
                statusDisplay.textContent = "Too short! AI's turn...";
            }
            setTimeout(() => { gameState = 'ai_running'; statusDisplay.textContent = `Player: ${playerDistance.toFixed(2)}m | AI is running...`; }, 2000);
        }
    } else if (gameState === 'ai_running') {
        ai.x += 10; // AI running speed
        
        // AI Jump Trigger
        if (ai.x >= FOUL_LINE_X - 10 - Math.random() * 15) {
            gameState = 'ai_jumping';
            
            // AI 60% chance logic
            if (playerDistance <= 0) {
                ai.distance = 4 + Math.random() * 4; // Easy win for AI if player fouls
            } else {
                let rand = Math.random();
                if (rand < 0.60) {
                    // Player wins (AI jumps less)
                    ai.distance = Math.max(0, playerDistance - (0.1 + Math.random() * 1.5));
                } else {
                    // AI wins (AI jumps more)
                    ai.distance = Math.min(9.5, playerDistance + (0.05 + Math.random() * 0.8));
                }
            }
            
            // Calculate natural physics for AI to land exactly at target
            let targetX = FOUL_LINE_X + (ai.distance * 45);
            ai.vx = 10 + Math.random() * 2; // Natural run speed
            let jumpDistPixels = targetX - ai.x;
            let timeInAir = jumpDistPixels / ai.vx;
            ai.vy = -(timeInAir * GRAVITY) / 2;
            
            playJumpSound();
        }
    } else if (gameState === 'ai_jumping') {
        ai.vy += GRAVITY;
        ai.x += ai.vx;
        ai.y += ai.vy;
        ai.angle += 0.05;

        if (ai.y >= GROUND_Y) {
            ai.y = GROUND_Y;
            ai.angle = 0;
            gameState = 'ai_landed';
            playSandLandingSound();
            
            evaluateWinner();
            setTimeout(resetGame, 4000); // Reset for next round
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Track (Running area)
    ctx.fillStyle = '#D2691E'; // Reddish track color
    ctx.fillRect(0, GROUND_Y, FOUL_LINE_X, canvas.height - GROUND_Y);

    // Add track spots (Black, Red, White) for sense of speed
    for (let i = 0; i < FOUL_LINE_X; i += 60) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // White
        ctx.fillRect(i, GROUND_Y + 15, 20, 6);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Black
        ctx.fillRect(i + 20, GROUND_Y + 45, 20, 6);
        ctx.fillStyle = 'rgba(200, 0, 0, 0.8)'; // Red
        ctx.fillRect(i + 40, GROUND_Y + 75, 20, 6);
    }

    // Draw Sandpit
    ctx.fillStyle = '#F4A460'; // Sandy color
    ctx.fillRect(FOUL_LINE_X, GROUND_Y, canvas.width - FOUL_LINE_X, canvas.height - GROUND_Y);

    // Draw Foul Line (White board)
    ctx.fillStyle = 'white';
    ctx.fillRect(FOUL_LINE_X - 25, GROUND_Y, 25, canvas.height - GROUND_Y);
    
    // Draw Sweet spot (Yellow - Perfect Jump Zone)
    ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.fillRect(FOUL_LINE_X - 15, GROUND_Y, 15, canvas.height - GROUND_Y);

    // Draw Red Foul Indicator
    ctx.fillStyle = 'red';
    ctx.fillRect(FOUL_LINE_X, GROUND_Y, 5, canvas.height - GROUND_Y);

    // Distance markers in sand
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.font = '16px sans-serif';
    for(let m = 2; m <= 10; m+=2) { // 10m तक के मार्कर
        let markerX = FOUL_LINE_X + (m * 45); // 45px = 1m
        ctx.fillRect(markerX, GROUND_Y, 2, 20);
        ctx.fillText(m + 'm', markerX - 10, GROUND_Y + 35);
    }

    // Draw Fire Trail if running at high speed
    if ((gameState === 'running' || gameState === 'jumping') && speed > MAX_SPEED * 0.85) {
        ctx.font = '30px sans-serif';
        ctx.globalAlpha = Math.random() * 0.5 + 0.5; // Flicker effect
        ctx.fillText('🔥', player.x - 40 - Math.random() * 10, player.y - 20);
        ctx.fillText('💨', player.x - 70 - Math.random() * 10, player.y - 15);
        ctx.globalAlpha = 1.0;
    }

    // Draw Player (Emoji)
    ctx.save();
    ctx.translate(player.x, player.y - 30); // Center at feet
    ctx.rotate(player.angle);
    ctx.font = '50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Flip horizontally because emojis face left
    ctx.scale(-1, 1);
    ctx.fillText('🏃‍♂️', 0, 0);
    ctx.restore();

    // Draw AI (Robot)
    if (['ai_running', 'ai_jumping', 'ai_landed'].includes(gameState)) {
        ctx.save();
        ctx.translate(ai.x, ai.y - 30);
        ctx.rotate(ai.angle);
        ctx.font = '50px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.scale(-1, 1);
        ctx.fillText('🤖', 0, 0);
        ctx.restore();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function evaluateWinner() {
    let winnerText = "";
    if (playerDistance > ai.distance) {
        winnerText = "🎉 YOU WIN!";
        statusDisplay.style.color = "#4CAF50";
        playCheerSound();
    } else if (ai.distance > playerDistance) {
        winnerText = "🤖 AI WINS!";
        statusDisplay.style.color = "#F44336";
    } else {
        winnerText = "It's a TIE!";
        statusDisplay.style.color = "white";
    }
    let playerStr = playerDistance > 0 ? playerDistance.toFixed(2) + 'm' : 'FOUL';
    statusDisplay.textContent = `Player: ${playerStr} | AI: ${ai.distance.toFixed(2)}m  ${winnerText}`;
}

function checkBestScore(score) {
    let best = localStorage.getItem('longJumpBestScore');
    if (!best || score > parseFloat(best)) {
        localStorage.setItem('longJumpBestScore', score.toFixed(2));
        loadBestScore();
        playCheerSound();
        
        // Show Animation
        newRecordMsg.style.display = 'block';
        newRecordMsg.style.animation = 'none';
        void newRecordMsg.offsetWidth;
        newRecordMsg.style.animation = 'popupFade 3s ease-in-out forwards';
        setTimeout(() => { newRecordMsg.style.display = 'none'; }, 3000);
    }
}

// Input Handling
function handleRun(key) {
    if (gameState !== 'running') return;
    if (key !== lastTapped) {
        speed = Math.min(speed + 1.2, MAX_SPEED);
        lastTapped = key;
        playStepSound();
    }
}

function handleJump() {
    if (gameState === 'running' && player.x > 50) { // Can't jump at starting line
        // Check for foul first at the exact moment of jump attempt
        if (player.x > FOUL_LINE_X) {
            gameState = 'landed';
            playerDistance = 0;
            statusDisplay.textContent = "FOUL! You crossed the line. AI's turn...";
            statusDisplay.style.color = "#F44336";
            setTimeout(() => { gameState = 'ai_running'; statusDisplay.textContent = `Player: FOUL | AI is running...`; }, 2000);
            return;
        }

        gameState = 'jumping';
        
        // Calculate jump quality based on closeness to foul line
        let distanceToLine = FOUL_LINE_X - player.x;
        let jumpBoost = 1;
        
        if (distanceToLine <= 15) {
            jumpBoost = 1.25; // 25% boost for perfect timing
            statusDisplay.textContent = "PERFECT JUMP! 🔥";
            statusDisplay.style.color = "#FFD700";
        } else if (distanceToLine <= 40) {
            jumpBoost = 1.1; // 10% boost for great timing
            statusDisplay.textContent = "GREAT JUMP! 👍";
            statusDisplay.style.color = "#4CAF50";
        } else {
            statusDisplay.textContent = "GOOD JUMP";
            statusDisplay.style.color = "white";
        }

        player.vx = speed; // Maintain forward momentum
        player.vy = (-speed * 0.4 - 3) * jumpBoost; // Realistic upward force
        playJumpSound();
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyA') handleRun('A');
    if (e.code === 'KeyL') handleRun('L');
    if (e.code === 'Space') handleJump();
});

leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleRun('A'); });
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleRun('L'); });
jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleJump(); });
leftBtn.addEventListener('mousedown', () => handleRun('A'));
rightBtn.addEventListener('mousedown', () => handleRun('L'));
jumpBtn.addEventListener('mousedown', () => handleJump());

startBtn.addEventListener('click', () => {
    initAudio();
    startScreen.style.display = 'none';
    resetGame();
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
loadBestScore();
loop();