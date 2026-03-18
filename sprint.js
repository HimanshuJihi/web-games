// DOM Elements
const player = document.getElementById('player');
const opponent = document.getElementById('opponent');
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
        lfo.frequency.value = 0.1 + Math.random() * 0.1; // लहरों जैसा इफ़ेक्ट (LFO)
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
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playCheerSound() {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 2.5; // 2.5 सेकंड का साउंड
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.8; 
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000; // तालियों और आवाज़ की फ़्रीक्वेंसी
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.5); // आवाज़ का बढ़ना (Swell)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.5); // आवाज़ का धीमा होना
    noise.connect(filter).connect(gain).connect(audioCtx.destination);
    noise.start();
}

// Game State
let gameState = 'idle'; // 'idle', 'countdown', 'running', 'finished'
let playerPosition = 0; // प्रतिशत में
let opponentPosition = 0;
let lastButtonTapped = 0; // 1 or 2
let startTime = 0;
let gameLoopId = null;
let countdownTimeout = null;

// Game Constants
const MOVE_INCREMENT = 1.5; // हर सफल टैप पर आगे बढ़ने का प्रतिशत
const DIFFICULTY_LEVELS = {
    easy: { min: 0.06, max: 0.14 },
    medium: { min: 0.09, max: 0.19 },
    hard: { min: 0.12, max: 0.22 }
};
let opponentMinMove;
let opponentMaxMove;

function resetGame() {
    // किसी भी चल रहे लूप या टाइमआउट को साफ़ करें
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    if (countdownTimeout) clearTimeout(countdownTimeout);

    infoDisplay.classList.remove('countdown');

    // गेम वेरिएबल्स रीसेट करें
    gameState = 'idle';
    playerPosition = 0;
    opponentPosition = 0;
    lastButtonTapped = 0;
    startTime = 0;
    player.style.left = '0%';
    opponent.style.left = '0%';

    // UI को शुरुआती स्थिति में रीसेट करें
    infoDisplay.textContent = 'Press Start to begin';
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

    const steps = ['3', '2', '1'];
    steps.forEach((step, index) => {
        countdownTimeout = setTimeout(() => { if (gameState === 'countdown') infoDisplay.textContent = step; }, index * 1000);
    });

    countdownTimeout = setTimeout(() => {
        if (gameState === 'countdown') {
            infoDisplay.textContent = 'Go!';
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
    gameLoop(); // गेम लूप शुरू करें
}

function handleTap(buttonId) {
    if (gameState !== 'running') return;

    // केवल तभी आगे बढ़ें जब अलग बटन टैप किया गया हो
    if (buttonId !== lastButtonTapped) {
        playerPosition += MOVE_INCREMENT;
        lastButtonTapped = buttonId;
    }
}

function update() {
    // प्लेयर की पोज़िशन अपडेट करें
    player.style.left = `${playerPosition}%`;

    // Opponent's position
    if (gameState === 'running') {
        const opponentMove = Math.random() * (opponentMaxMove - opponentMinMove) + opponentMinMove;
        opponentPosition += opponentMove;
        opponent.style.left = `${opponentPosition}%`;
    }

    // फिनिश लाइन की जाँच करें
    const playerFinished = playerPosition >= 100;
    const opponentFinished = opponentPosition >= 100;

    if (playerFinished || opponentFinished) {
        gameState = 'finished';
        const finalTime = (Date.now() - startTime) / 1000;

        // Clamp positions
        if (playerFinished) player.style.left = '100%';
        if (opponentFinished) opponent.style.left = '100%';

        // Determine winner
        if (playerFinished && !opponentFinished) {
            infoDisplay.textContent = `You won! Time: ${finalTime.toFixed(2)} seconds`;
            checkAndSaveBestTime(finalTime);
            playCheerSound(); // ताली बजाने की आवाज़
        } else if (!playerFinished && opponentFinished) {
            infoDisplay.textContent = `Computer won!`;
        } else { // Tie-break
            if (playerPosition > opponentPosition) {
                infoDisplay.textContent = `You won! Time: ${finalTime.toFixed(2)} seconds`;
                checkAndSaveBestTime(finalTime);
                playCheerSound(); // ताली बजाने की आवाज़
            } else {
                infoDisplay.textContent = `Computer won!`;
            }
        }

        // बटनों को डिसेबल करें और रीस्टार्ट बटन दिखाएं
        tapButton1.disabled = true;
        tapButton2.disabled = true;
        document.querySelector('.controls').style.display = 'none';
        restartButton.style.display = 'block';

        cancelAnimationFrame(gameLoopId); // लूप रोकें
    } else if (gameState === 'running') {
        const elapsedTime = (Date.now() - startTime) / 1000;
        infoDisplay.textContent = `समय: ${elapsedTime.toFixed(2)}`;
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
    let bestTime = localStorage.getItem(`sprintBestTime_${difficulty}`);
    if (!bestTime || time < parseFloat(bestTime)) {
        localStorage.setItem(`sprintBestTime_${difficulty}`, time);
        updateBestTimeDisplay();
        showNewRecordAnimation();
    }
}

function showNewRecordAnimation() {
    newRecordMsg.style.display = 'block';
    newRecordMsg.style.animation = 'none'; // reset animation if already running
    void newRecordMsg.offsetWidth; // trigger browser reflow
    newRecordMsg.style.animation = 'popupFade 3s ease-in-out forwards';

    setTimeout(() => {
        newRecordMsg.style.display = 'none';
    }, 3000);
}

function updateBestTimeDisplay() {
    const difficulty = difficultySelect.value;
    let bestTime = localStorage.getItem(`sprintBestTime_${difficulty}`);
    if (bestTime) {
        bestTimeDisplay.textContent = `Best Time: ${parseFloat(bestTime).toFixed(2)}s`;
    } else {
        bestTimeDisplay.textContent = `Best Time: --`;
    }
}

// इवेंट लिस्नर
function handleStartClick() {
    startButton.style.display = 'none';
    difficultySelect.style.display = 'none';

    initAudio(); // गेम शुरू होने पर ऑडियो इंजन चालू करें

    // कठिनाई स्तर सेट करें
    const difficulty = difficultySelect.value;
    opponentMinMove = DIFFICULTY_LEVELS[difficulty].min;
    opponentMaxMove = DIFFICULTY_LEVELS[difficulty].max;

    runCountdown();
}
// 'mousedown' और 'touchstart' दोनों का उपयोग करके मोबाइल और डेस्कटॉप दोनों के लिए सपोर्ट
tapButton1.addEventListener('mousedown', () => handleTap(1));
tapButton2.addEventListener('mousedown', () => handleTap(2));
tapButton1.addEventListener('touchstart', (e) => { e.preventDefault(); handleTap(1); });
tapButton2.addEventListener('touchstart', (e) => { e.preventDefault(); handleTap(2); });

window.addEventListener('keydown', (e) => {
    // सुनिश्चित करें कि कीबोर्ड इनपुट गेम को प्रभावित न करे जब वह चल नहीं रहा हो
    if (gameState === 'running') {
        if (e.code === 'KeyA') {
            handleTap(1);
        } else if (e.code === 'KeyL') {
            handleTap(2);
        }
    }
});

startButton.addEventListener('click', handleStartClick);
restartButton.addEventListener('click', resetGame);
difficultySelect.addEventListener('change', resetGame);

// शुरुआती सेटअप
resetGame();