// 1. सेटअप और वैरिएबल्स
const canvas = document.getElementById('curlingCanvas');
const ctx = canvas.getContext('2d');
const resetButton = document.getElementById('resetButton');
const roundsSelect = document.getElementById('roundsSelect');
const sweepButton = document.getElementById('sweepButton');
const pauseBtn = document.getElementById('pauseBtn');
let isPaused = false;

// --- REFACTOR START ---
// गेम के स्थिरांक (Game constants)
const NUM_STONES_PER_PLAYER = 1; // हर खिलाड़ी के लिए 1 पत्थर
const PLAYER_COLORS = ['red', 'blue'];
let maxRounds = 3; // एक मैच में कुल राउंड

// गेम की अवस्था (Game state)
let gameState = 'aiming'; // 'aiming', 'simulating', 'roundOver'
let matchState = 'playing'; // 'playing', 'matchOver'
let stones = [];
let currentStoneIndex = 0;
let roundScores = { red: 0, blue: 0 }; // इस राउंड का स्कोर
let totalScores = { red: 0, blue: 0 }; // पूरे मैच का स्कोर
let currentRound = 0;
// --- REFACTOR END ---

// --- Audio Setup (Web Audio API) ---
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playCollideSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playSlideSound() {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 2.5; // 2.5 सेकंड का साउंड
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3; 
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 2.5); 
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.5);
    
    noise.connect(filter).connect(gain).connect(audioCtx.destination);
    noise.start();
}

let winnerInfo = null; // विजेता की जानकारी स्टोर करने के लिए

// --- RESPONSIVE SETUP ---
const DESIGN_WIDTH = 400;
let scale = 1;
let initialStonePosition = {};
// --- END RESPONSIVE SETUP ---


let isDragging = false;
let dragStart = { x: 0, y: 0 };
let currentMousePos = { x: 0, y: 0 };

// स्वीपिंग वैरिएबल्स
let isSweeping = false;
const normalFriction = 0.98; // सामान्य घर्षण
const sweepingFriction = 0.995; // स्वीप करते समय कम घर्षण (पत्थर ज़्यादा दूर जाएगा)

// हाउस (टारगेट) की जानकारी
let house = {
    x: 0,
    y: 0,
    radii: [80, 60, 40, 20] // बाहरी से भीतरी सर्कल के रेडियस
};

// --- नया फ़ंक्शन ---
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    scale = canvas.width / DESIGN_WIDTH;

    initialStonePosition = { x: canvas.width / 2, y: 100 * scale };
    house.x = canvas.width / 2;
    house.y = canvas.height - (150 * scale);

    startNewGame();
}

function startNewGame() {
    maxRounds = parseInt(roundsSelect.value, 10);
    console.log("Starting a new game!");
    totalScores = { red: 0, blue: 0 };
    currentRound = 0;
    matchState = 'playing';
    pauseBtn.style.display = 'block';
    isPaused = false; pauseBtn.textContent = '⏸ Pause';
    setupNewRound();
}

function setupNewRound() {
    currentRound++;
    console.log(`Setting up Round ${currentRound}`);
    stones = [];
    for (let i = 0; i < NUM_STONES_PER_PLAYER * 2; i++) {
        stones.push({
            ...initialStonePosition,
            id: i,
            radius: 15 * scale,
            velocityX: 0,
            velocityY: 0,
            isMoving: false,
            color: PLAYER_COLORS[i % 2],
            isInPlay: false // पत्थर फेंका गया है या नहीं
        });
    }
    currentStoneIndex = 0;
    gameState = 'aiming';
    roundScores = { red: 0, blue: 0 };
    winnerInfo = null; // विजेता की जानकारी रीसेट करें
    resetButton.disabled = true;
    resetButton.textContent = `Next Round`;
    sweepButton.disabled = true;
}

// 2. गेम लूप (यह फ़ंक्शन बार-बार चलेगा)
function gameLoop() {
    update(); // updatePhysics से नाम बदला गया
    draw();
    requestAnimationFrame(gameLoop);
}

// 3. फिजिक्स और गेम स्टेट लॉजिक
function update() {
    if (gameState !== 'simulating' || isPaused) return;

    let stonesAreMoving = false;

    // सभी पत्थरों की पोज़िशन अपडेट करें और घर्षण लागू करें
    stones.forEach(stone => {
        if (stone.isMoving) {
            const currentFriction = isSweeping ? sweepingFriction : normalFriction;
            stone.velocityX *= currentFriction;
            stone.velocityY *= currentFriction;

            stone.x += stone.velocityX;
            stone.y += stone.velocityY;

            if (Math.abs(stone.velocityX) < 0.05 && Math.abs(stone.velocityY) < 0.05) {
                stone.velocityX = 0;
                stone.velocityY = 0;
                stone.isMoving = false;
            } else {
                stonesAreMoving = true;
            }
        }
    });

    // टकराव का पता लगाना
    for (let i = 0; i < stones.length; i++) {
        for (let j = i + 1; j < stones.length; j++) {
            handleCollision(stones[i], stones[j]);
        }
    }

    // जांचें कि क्या सिमुलेशन खत्म हो गया है
    if (!stonesAreMoving) {
        isSweeping = false;
        sweepButton.disabled = true;
        currentStoneIndex++;

        if (currentStoneIndex < stones.length) {
            gameState = 'aiming'; // अगली बारी
        } else {
            gameState = 'roundOver'; // राउंड खत्म
            calculateScore();
            if (currentRound >= maxRounds) {
                matchState = 'matchOver';
                resetButton.textContent = 'New Game';
            pauseBtn.style.display = 'none';
            } else {
                resetButton.textContent = 'Next Round';
            }
            resetButton.disabled = false;
        }
    }
}

// --- टकराव के लिए नया फ़ंक्शन ---
function handleCollision(stone1, stone2) {
    if (!stone1.isInPlay || !stone2.isInPlay) return;

    const dx = stone2.x - stone1.x;
    const dy = stone2.y - stone1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = stone1.radius + stone2.radius;

    if (distance < minDistance) {
        // टकराव की प्रतिक्रिया
        const angle = Math.atan2(dy, dx);
        const overlap = minDistance - distance;

        // पत्थरों को अलग करें
        const moveX = (overlap / 2) * Math.cos(angle);
        const moveY = (overlap / 2) * Math.sin(angle);
        stone1.x -= moveX;
        stone1.y -= moveY;
        stone2.x += moveX;
        stone2.y += moveY;

        // वेग का आदान-प्रदान (Elastic collision)
        const v1 = { x: stone1.velocityX, y: stone1.velocityY };
        const v2 = { x: stone2.velocityX, y: stone2.velocityY };

        const dot1 = (v1.x - v2.x) * dx + (v1.y - v2.y) * dy;
        const factor = dot1 / (distance * distance);

        stone1.velocityX -= factor * dx;
        stone1.velocityY -= factor * dy;
        stone2.velocityX += factor * dx;
        stone2.velocityY += factor * dy;

        if (Math.abs(stone1.velocityX) > 0.05 || Math.abs(stone1.velocityY) > 0.05) stone1.isMoving = true;
        if (Math.abs(stone2.velocityX) > 0.05 || Math.abs(stone2.velocityY) > 0.05) stone2.isMoving = true;
        
        playCollideSound(); // टकराने की आवाज़ प्ले करें
    }
}

// 4. ड्रॉइंग लॉजिक
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawHouse();

    // सभी पत्थरों को ड्रॉ करें
    stones.forEach(stone => {
        if (stone.isInPlay) {
            ctx.beginPath();
            ctx.arc(stone.x, stone.y, stone.radius, 0, Math.PI * 2);
            ctx.fillStyle = stone.color;
            ctx.fill();
            ctx.closePath();
        }
    });

    // निशाना लगाते समय वर्तमान पत्थर को ड्रॉ करें
    const currentStone = stones[currentStoneIndex];
    if (gameState === 'aiming' && currentStone) {
        ctx.beginPath();
        ctx.arc(currentStone.x, currentStone.y, currentStone.radius, 0, Math.PI * 2);
        ctx.fillStyle = currentStone.color;
        ctx.globalAlpha = 0.7; // थोड़ा पारदर्शी
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.closePath();
    }

    // गाइडलाइन ड्रॉ करें
    if (isDragging && gameState === 'aiming') {
        const stone = stones[currentStoneIndex];
        ctx.beginPath();
        ctx.moveTo(stone.x, stone.y);
        ctx.lineTo(stone.x + (dragStart.x - currentMousePos.x), stone.y + (dragStart.y - currentMousePos.y));
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.stroke();
        ctx.closePath();
    }

    // स्वीपिंग इंडिकेटर ड्रॉ करें
    if (isSweeping) {
        const movingStone = stones[currentStoneIndex - 1]; // जो पत्थर अभी फेंका गया है
        if (movingStone?.isMoving) {
            ctx.beginPath();
            ctx.arc(movingStone.x, movingStone.y, movingStone.radius + 5 * scale, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();
            ctx.closePath();
            ctx.lineWidth = 1;
        }
    }

    drawScore();

    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = `bold ${30 * scale}px sans-serif`;
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
}

function drawHouse() {
    ctx.beginPath();
    ctx.arc(house.x, house.y, house.radii[0] * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(house.x, house.y, house.radii[1] * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(house.x, house.y, house.radii[2] * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(house.x, house.y, house.radii[3] * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.closePath();
}

function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = `${22 * scale}px sans-serif`;

    ctx.textAlign = 'left';
    ctx.fillStyle = 'red';
    ctx.fillText(`Red: ${totalScores.red}`, 10 * scale, 30 * scale);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'blue';
    ctx.fillText(`Blue: ${totalScores.blue}`, canvas.width - (10 * scale), 30 * scale);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';

    if (matchState === 'matchOver') {
        let winnerName = "It's a Tie!";
        let winnerColor = 'black';
        if (totalScores.red > totalScores.blue) {
            winnerName = "Red Wins the Match!";
            winnerColor = 'red';
        } else if (totalScores.blue > totalScores.red) {
            winnerName = "Blue Wins the Match!";
            winnerColor = 'blue';
        }
        ctx.fillStyle = winnerColor;
        ctx.fillText(winnerName, canvas.width / 2, 60 * scale);
    } else if (gameState === 'aiming' && stones[currentStoneIndex]) {
        const color = stones[currentStoneIndex].color;
        ctx.fillText(`Round ${currentRound}/${maxRounds} - ${color.charAt(0).toUpperCase() + color.slice(1)}'s Turn`, canvas.width / 2, 30 * scale);
    } else if (gameState === 'roundOver') {
        if (winnerInfo && winnerInfo.score > 0) {
            const winnerColor = winnerInfo.color;
            const winnerName = winnerColor.charAt(0).toUpperCase() + winnerColor.slice(1);
            ctx.fillStyle = winnerColor; // विजेता के रंग में टेक्स्ट दिखाएं
            ctx.fillText(`${winnerName} wins with ${winnerInfo.score} point(s)!`, canvas.width / 2, 60 * scale);
        } else {
            ctx.fillText("No score this round!", canvas.width / 2, 60 * scale);
        }
    }
}

// 5. इनपुट हैंडलिंग (माउस और टच दोनों के लिए)

function getEventPosition(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;

    if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        x = e.changedTouches[0].clientX;
        y = e.changedTouches[0].clientY;
    } else {
        x = e.clientX;
        y = e.clientY;
    }

    return {
        x: x - rect.left,
        y: y - rect.top
    };
}

function handleDragStart(e) {
    if (gameState === 'aiming' && !isPaused) {
        e.preventDefault(); // मोबाइल पर पेज को स्क्रॉल होने से रोकें
        initAudio(); // ऑडियो इंजन चालू करें
        isDragging = true;
        dragStart = getEventPosition(e);
        currentMousePos = dragStart;
    }
}

function handleDragMove(e) {
    if (isDragging && !isPaused) {
        e.preventDefault();
        currentMousePos = getEventPosition(e);
    }
}

function handleDragEnd(e) {
    if (isDragging && !isPaused) {
        isDragging = false;
        const currentStone = stones[currentStoneIndex];

        const dragEnd = getEventPosition(e);
        const dragVector = { x: dragStart.x - dragEnd.x, y: dragStart.y - dragEnd.y };

        currentStone.velocityX = dragVector.x * 0.1;
        currentStone.velocityY = dragVector.y * 0.1;

        if (Math.abs(currentStone.velocityX) > 0 || Math.abs(currentStone.velocityY) > 0) {
            currentStone.isMoving = true;
            currentStone.isInPlay = true;
            playSlideSound(); // पत्थर स्लाइड होने की आवाज़
            gameState = 'simulating';
            resetButton.disabled = true;
            sweepButton.disabled = false;
        }
    }
}

// कीबोर्ड इनपुट स्वीपिंग के लिए
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState === 'simulating' && !isPaused) {
        e.preventDefault();
        isSweeping = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && !isPaused) {
        e.preventDefault();
        isSweeping = false;
    }
});

// 6. स्कोरिंग लॉजिक
function calculateScore() {
    // असली कर्लिंग स्कोरिंग नियम लागू करें

    // 1. हाउस के अंदर के सभी पत्थरों को फ़िल्टर करें और उनकी दूरी की गणना करें
    const stonesInHouse = stones.filter(stone => {
        if (!stone.isInPlay) return false;
        const dx = stone.x - house.x;
        const dy = stone.y - house.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        stone.distance = distance; // बाद में उपयोग के लिए दूरी स्टोर करें
        return distance <= house.radii[0] * scale; // क्या यह सबसे बड़े सर्कल के अंदर है?
    });

    // 2. अगर हाउस में कोई पत्थर नहीं है, तो स्कोर 0 है
    if (stonesInHouse.length === 0) {
        roundScores = { red: 0, blue: 0 };
        winnerInfo = { color: null, score: 0 };
        console.log("Round Scores:", roundScores);
        return;
    }

    // 3. सबसे करीब पत्थर खोजने के लिए पत्थरों को दूरी के अनुसार सॉर्ट करें
    stonesInHouse.sort((a, b) => a.distance - b.distance);

    const winningStone = stonesInHouse[0];
    const winningColor = winningStone.color;
    const losingColor = winningColor === 'red' ? 'blue' : 'red';

    // 4. हारने वाली टीम का सबसे करीबी पत्थर खोजें
    const closestLosingStone = stonesInHouse.find(stone => stone.color === losingColor);

    let finalScore = 0;
    if (!closestLosingStone) {
        // अगर हारने वाली टीम का कोई पत्थर हाउस में नहीं है, तो जीतने वाली टीम को अपने सभी पत्थरों के लिए अंक मिलते हैं
        finalScore = stonesInHouse.filter(stone => stone.color === winningColor).length;
    } else {
        // 5. गिनें कि जीतने वाली टीम के कितने पत्थर हारने वाली टीम के सबसे करीबी पत्थर से ज़्यादा करीब हैं
        for (const stone of stonesInHouse) {
            if (stone.color === winningColor && stone.distance < closestLosingStone.distance) {
                finalScore++;
            } else {
                // चूंकि ऐरे सॉर्ट किया हुआ है, हम रुक सकते हैं
                break;
            }
        }
    }

    // 6. अंतिम स्कोर अपडेट करें
    roundScores = { red: 0, blue: 0 };
    if (finalScore > 0) {
        roundScores[winningColor] = finalScore;
        totalScores[winningColor] += finalScore;
    }
    winnerInfo = { color: winningColor, score: finalScore };

    console.log("Round Scores:", roundScores);
    console.log("Total Scores:", totalScores);
}

// 7. गेम रीसेट लॉजिक
canvas.addEventListener('mousedown', handleDragStart);
canvas.addEventListener('mousemove', handleDragMove);
window.addEventListener('mouseup', handleDragEnd);

canvas.addEventListener('touchstart', handleDragStart, { passive: false });
canvas.addEventListener('touchmove', handleDragMove, { passive: false });
window.addEventListener('touchend', handleDragEnd);

sweepButton.addEventListener('mousedown', () => { if (gameState === 'simulating' && !isPaused) isSweeping = true; });
sweepButton.addEventListener('mouseup', () => { isSweeping = false; });
sweepButton.addEventListener('mouseleave', () => { isSweeping = false; }); // अगर माउस बटन से बाहर चला जाए

sweepButton.addEventListener('touchstart', (e) => {
    if (gameState === 'simulating' && !isPaused) {
        e.preventDefault();
        isSweeping = true;
    }
});
sweepButton.addEventListener('touchend', () => { isSweeping = false; });


resetButton.addEventListener('click', () => {
    if (matchState === 'matchOver') {
        startNewGame();
    } else {
        setupNewRound();
    }
});
roundsSelect.addEventListener('change', startNewGame);
window.addEventListener('resize', resizeCanvas);

pauseBtn.addEventListener('click', () => {
    if (matchState === 'playing') {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
    }
});

// गेम शुरू करें
resizeCanvas(); // प्रारंभिक सेटअप
gameLoop();
