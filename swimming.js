// DOM Elements
const player = document.getElementById('player');
const opponent1 = document.getElementById('opponent1');
const opponent2 = document.getElementById('opponent2');
const opponent3 = document.getElementById('opponent3');
const tapButton1 = document.getElementById('tapButton1');
const tapButton2 = document.getElementById('tapButton2');
const infoDisplay = document.getElementById('infoDisplay');
const restartButton = document.getElementById('restartButton');
const difficultySelect = document.getElementById('difficultySelect');
const startButton = document.getElementById('startButton');
const bestTimeDisplay = document.getElementById('bestTimeDisplay');
const newRecordMsg = document.getElementById('newRecordMsg');

// --- Audio Setup (Web Audio API) ---
let audioCtx = null;

function initAudio() {
    // ब्राउज़र की ऑडियो पॉलिसी के अनुसार यूज़र के क्लिक करने पर ही ऑडियो चालू होना चाहिए
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSplashSound() {
    if (!audioCtx) return;
    
    // छपाके की आवाज़ बनाने के लिए White Noise (सफ़ेद शोर) उत्पन्न करना
    const bufferSize = audioCtx.sampleRate * 0.15; // 150ms का साउंड
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5; 
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    // पानी जैसी गहरी आवाज़ के लिए Lowpass फ़िल्टर लगाना
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600; 
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15); // आवाज़ को धीरे-से बंद करना (Fade out)
    
    noise.connect(filter).connect(gain).connect(audioCtx.destination);
    noise.start();
}

// Game State
let gameState = 'idle'; // 'idle', 'countdown', 'running', 'finished'
let playerPosition = 0; // percentage
let opponents = [
    { el: opponent1, pos: 0, min: 0, max: 0, name: 'Shark' },
    { el: opponent2, pos: 0, min: 0, max: 0, name: 'Dolphin' },
    { el: opponent3, pos: 0, min: 0, max: 0, name: 'Whale' }
];
let lastButtonTapped = 0; // 1 or 2 (Requires alternating strokes)
let startTime = 0;
let gameLoopId = null;
let countdownTimeout = null;

// Game Constants
const MOVE_INCREMENT = 1.6; // Step forward per valid stroke
const DIFFICULTY_LEVELS = {
    easy: [ { min: 0.04, max: 0.09 }, { min: 0.05, max: 0.10 }, { min: 0.06, max: 0.12 } ],
    medium: [ { min: 0.06, max: 0.12 }, { min: 0.08, max: 0.14 }, { min: 0.09, max: 0.16 } ],
    hard: [ { min: 0.09, max: 0.16 }, { min: 0.11, max: 0.18 }, { min: 0.12, max: 0.21 } ]
};

function resetGame() {
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    if (countdownTimeout) clearTimeout(countdownTimeout);

    infoDisplay.classList.remove('countdown');

    // Reset Variables
    gameState = 'idle';
    playerPosition = 0;
    lastButtonTapped = 0; 
    startTime = 0;
    player.style.left = '0%';
    player.style.transform = 'translateY(-50%) scaleX(-1)';
    opponents.forEach(opp => {
        opp.pos = 0;
        opp.el.style.left = '0%';
        opp.el.style.transform = 'translateY(-50%) scaleX(-1)';
    });

    // Reset UI
    infoDisplay.textContent = 'Press "Dive In" to begin';
    startButton.style.display = 'block';
    difficultySelect.style.display = 'flex';
    restartButton.style.display = 'none';
    document.querySelector('.controls').style.display = 'none';
    tapButton1.disabled = true;
    tapButton2.disabled = true;
    updateBestTimeDisplay();
}

function runCountdown() {
    gameState = 'countdown';
    infoDisplay.classList.add('countdown');

    const steps = ['Ready...', 'Set...', 'Go!'];
    steps.forEach((step, index) => {
        countdownTimeout = setTimeout(() => { 
            if (gameState === 'countdown') infoDisplay.textContent = step; 
        }, index * 1000);
    });

    countdownTimeout = setTimeout(() => {
        if (gameState === 'countdown') {
            infoDisplay.classList.remove('countdown');
            startGame();
        }
    }, 3000);
}

function startGame() {
    gameState = 'running';
    startTime = Date.now();
    document.querySelector('.controls').style.display = 'flex';
    tapButton1.disabled = false;
    tapButton2.disabled = false;
    gameLoop();
}

function handleTap(buttonId) {
    if (gameState !== 'running') return;

    // Swimming logic: MUST alternate strokes. Same button twice does nothing.
    if (buttonId !== lastButtonTapped) {
        playerPosition += MOVE_INCREMENT;
        lastButtonTapped = buttonId;
        
        // पानी के छपाके की आवाज़ प्ले करें
        playSplashSound();

        // Small visual bobbing effect for swimming
        player.style.transform = `translateY(${buttonId === 1 ? '-60%' : '-40%'}) scaleX(-1)`;
    }
}

function update() {
    // Player Position
    player.style.left = `${playerPosition}%`;

    // Opponent Position
    if (gameState === 'running') {
        opponents.forEach(opp => {
            const move = Math.random() * (opp.max - opp.min) + opp.min;
            opp.pos += move;
            opp.el.style.left = `${opp.pos}%`;
            opp.el.style.transform = `translateY(${Math.random() > 0.5 ? '-60%' : '-40%'}) scaleX(-1)`;
        });
    }

    const playerFinished = playerPosition >= 100;
    let anyOpponentFinished = false;
    opponents.forEach(opp => { if (opp.pos >= 100) anyOpponentFinished = true; });

    if (playerFinished || anyOpponentFinished) {
        gameState = 'finished';
        const finalTime = (Date.now() - startTime) / 1000;

        if (playerFinished) player.style.left = '100%';
        opponents.forEach(opp => { if (opp.pos >= 100) opp.el.style.left = '100%'; });

        // Find the absolute winner
        let winner = 'Player';
        let maxPos = playerPosition;
        opponents.forEach(opp => {
            if (opp.pos > maxPos) {
                maxPos = opp.pos;
                winner = opp.name;
            }
        });

        if (winner === 'Player') {
            infoDisplay.textContent = `You won! Time: ${finalTime.toFixed(2)}s`;
            checkAndSaveBestTime(finalTime);
        } else {
            infoDisplay.textContent = `${winner} won! Better luck next time.`;
        }

        tapButton1.disabled = true;
        tapButton2.disabled = true;
        document.querySelector('.controls').style.display = 'none';
        restartButton.style.display = 'block';
        cancelAnimationFrame(gameLoopId);
    } else if (gameState === 'running') {
        const elapsedTime = (Date.now() - startTime) / 1000;
        infoDisplay.textContent = `Time: ${elapsedTime.toFixed(2)}`;
    }
}

function gameLoop() {
    if (gameState !== 'running') return;
    update();
    gameLoopId = requestAnimationFrame(gameLoop);
}

// Best Time Logic
function checkAndSaveBestTime(time) {
    const difficulty = difficultySelect.value;
    let bestTime = localStorage.getItem(`swimmingBestTime_${difficulty}`);
    if (!bestTime || time < parseFloat(bestTime)) {
        localStorage.setItem(`swimmingBestTime_${difficulty}`, time);
        updateBestTimeDisplay();
        showNewRecordAnimation();
    }
}

function showNewRecordAnimation() {
    newRecordMsg.style.display = 'block';
    newRecordMsg.style.animation = 'none';
    void newRecordMsg.offsetWidth;
    newRecordMsg.style.animation = 'popupFade 3s ease-in-out forwards';
    setTimeout(() => { newRecordMsg.style.display = 'none'; }, 3000);
}

function updateBestTimeDisplay() {
    const difficulty = difficultySelect.value;
    let bestTime = localStorage.getItem(`swimmingBestTime_${difficulty}`);
    bestTimeDisplay.textContent = bestTime ? `Best Time: ${parseFloat(bestTime).toFixed(2)}s` : `Best Time: --`;
}

// Event Listeners
function handleStartClick() {
    startButton.style.display = 'none';
    difficultySelect.style.display = 'none';
    
    initAudio(); // गेम शुरू होते ही ऑडियो सिस्टम एक्टिवेट करें
    
    const levelConfig = DIFFICULTY_LEVELS[difficultySelect.value];
    opponents.forEach((opp, index) => {
        opp.min = levelConfig[index].min;
        opp.max = levelConfig[index].max;
    });
    runCountdown();
}

tapButton1.addEventListener('mousedown', () => handleTap(1));
tapButton2.addEventListener('mousedown', () => handleTap(2));
tapButton1.addEventListener('touchstart', (e) => { e.preventDefault(); handleTap(1); });
tapButton2.addEventListener('touchstart', (e) => { e.preventDefault(); handleTap(2); });

window.addEventListener('keydown', (e) => {
    if (gameState === 'running') {
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') handleTap(1);
        else if (e.code === 'KeyL' || e.code === 'ArrowRight') handleTap(2);
    }
});

startButton.addEventListener('click', handleStartClick);
restartButton.addEventListener('click', resetGame);
difficultySelect.addEventListener('change', resetGame);

resetGame();