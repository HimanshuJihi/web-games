const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const levelDisplay = document.getElementById('levelDisplay');
const movesDisplay = document.getElementById('movesDisplay');
const undoBtn = document.getElementById('undoBtn');
const restartBtn = document.getElementById('restartBtn');
const nextBtn = document.getElementById('nextBtn');

let DESIGN_WIDTH = 800;
const DESIGN_HEIGHT = 600;
let scale = 1;

// Game Variables
let currentLevel = 1;
let moves = 0;
let poles = [];
let moveHistory = [];
let undosLeft = 2;
let selectedPoleIndex = -1;
let gameState = 'playing'; // 'playing', 'won'

// Hoop Colors
const COLORS = ['#FF4136', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#FF9800', '#00BCD4', '#E91E63'];

// Setup levels dynamically
function getLevelConfig(level) {
    // 4 तरह के कलर्स और 2 एक्स्ट्रा (खाली) पोल्स
    let numColors = Math.min(4 + Math.floor((level - 1) / 3), COLORS.length);
    let emptyPoles = 2; 
    return { numColors, emptyPoles, numPoles: numColors + emptyPoles };
}

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
    
    if (type === 'select') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'drop') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'error') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'win') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    }
    
    osc.connect(gain).connect(audioCtx.destination);
}

// Initialize level
function initLevel() {
    const savedLevel = localStorage.getItem('hoopStackLevel');
    if (savedLevel && !isNaN(savedLevel)) currentLevel = parseInt(savedLevel);
    
    loadLevel(currentLevel);
}

function loadLevel(level) {
    const config = getLevelConfig(level);
    poles = [];
    
    // Dynamically increase width based on number of poles to prevent cramping
    DESIGN_WIDTH = Math.max(800, config.numPoles * 130);
    canvas.style.aspectRatio = `${DESIGN_WIDTH} / ${DESIGN_HEIGHT}`;
    canvas.style.maxWidth = `min(95vw, 65vh * (${DESIGN_WIDTH} / ${DESIGN_HEIGHT}))`;
    
    // Generate Solved State
    for (let i = 0; i < config.numPoles; i++) {
        let pole = [];
        if (i < config.numColors) {
            for (let j = 0; j < 4; j++) pole.push(COLORS[i]);
        }
        poles.push(pole);
    }
    
    // Shuffle (Reverse moves) to make it playable
    let shuffleMoves = config.numColors * 40; // Increased shuffles for better mixing
    let shufflesDone = 0;
    let attempts = 0;
    while (shufflesDone < shuffleMoves && attempts < 2000) {
        attempts++;
        let from = Math.floor(Math.random() * config.numPoles);
        let to = Math.floor(Math.random() * config.numPoles);
        
        if (poles[from].length > 0 && poles[to].length < 4 && from !== to) {
            let hoopToMove = poles[from][poles[from].length - 1];
            let fromNewTop = poles[from].length > 1 ? poles[from][poles[from].length - 2] : null;
            
            // Reverse move rule: Ensures the puzzle is 100% solvable by the player
            if (fromNewTop === null || fromNewTop === hoopToMove) {
                poles[to].push(poles[from].pop());
                shufflesDone++;
            }
        }
    }
    
    // Reset UI
    moves = 0;
    moveHistory = [];
    undosLeft = 2;
    selectedPoleIndex = -1;
    gameState = 'playing';
    levelDisplay.textContent = level;
    movesDisplay.textContent = moves;
    nextBtn.style.display = 'none';
    restartBtn.style.display = 'block';
    undoBtn.style.display = 'block';
    undoBtn.disabled = true;
    undoBtn.textContent = `Undo (${undosLeft})`;
    
    localStorage.setItem('hoopStackLevel', currentLevel);
    resizeCanvas();
}

function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = DESIGN_WIDTH;
    canvas.height = DESIGN_HEIGHT;
    scale = canvas.width / DESIGN_WIDTH; 
    draw();
}

// Draw Game
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const poleSpacing = DESIGN_WIDTH / (poles.length + 1);
    const poleBaseY = DESIGN_HEIGHT - 100;
    const poleHeight = 250;
    const ringHeight = 35;
    const ringWidth = 80;

    // Draw Base
    ctx.fillStyle = '#7B1FA2'; // Dark Purple base
    ctx.fillRect(20, poleBaseY, DESIGN_WIDTH - 40, 20);

    for (let i = 0; i < poles.length; i++) {
        let poleX = poleSpacing * (i + 1);
        
        // Draw Pole
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.roundRect(poleX - 7.5, poleBaseY - poleHeight, 15, poleHeight, 5);
        ctx.fill();
        
        // Highlight if selected
        if (i === selectedPoleIndex) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.roundRect(poleX - 50, poleBaseY - poleHeight - 50, 100, poleHeight + 50, 10);
            ctx.fill();
        }

        // Determine how many hoops to lift visually
        let liftedCount = 0;
        if (i === selectedPoleIndex && poles[i].length > 0) {
            let topColor = poles[i][poles[i].length - 1];
            for (let c = poles[i].length - 1; c >= 0; c--) {
                if (poles[i][c] === topColor) liftedCount++;
                else break;
            }
        }

        // Draw Rings
        for (let j = 0; j < poles[i].length; j++) {
            let ringY = poleBaseY - 15 - (j * (ringHeight + 5));
            
            // Lift consecutive rings
            if (i === selectedPoleIndex && j >= poles[i].length - liftedCount) {
                ringY -= 40; 
            }

            // Draw ring using thick rounded line
            ctx.beginPath();
            ctx.moveTo(poleX - ringWidth/2, ringY);
            ctx.lineTo(poleX + ringWidth/2, ringY);
            ctx.lineWidth = ringHeight;
            ctx.lineCap = 'round';
            ctx.strokeStyle = poles[i][j];
            ctx.stroke();
            
            // Inner hole illusion
            ctx.beginPath();
            ctx.moveTo(poleX - ringWidth/3, ringY);
            ctx.lineTo(poleX + ringWidth/3, ringY);
            ctx.lineWidth = ringHeight * 0.4;
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.stroke();
        }
    }

    if (gameState === 'won') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 60px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Level Complete! 🎉', canvas.width / 2, canvas.height / 2);
    }
}

// Game Logic
function checkWin() {
    for (let pole of poles) {
        if (pole.length > 0) {
            if (pole.length !== 4) return false;
            let firstColor = pole[0];
            for (let color of pole) {
                if (color !== firstColor) return false;
            }
        }
    }
    return true;
}

function handleClick(e) {
    if (gameState !== 'playing') return;
    initAudio();

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const scaleX = DESIGN_WIDTH / rect.width; // Correct CSS to Canvas scaling
    const x = (clientX - rect.left) * scaleX; 
    
    const poleSpacing = DESIGN_WIDTH / (poles.length + 1);
    // Find closest pole index
    let clickedPole = Math.round((x / poleSpacing) - 1);
    
    if (clickedPole >= 0 && clickedPole < poles.length) {
        if (selectedPoleIndex === -1) {
            if (poles[clickedPole].length > 0) {
                selectedPoleIndex = clickedPole;
                playSound('select');
            }
        } else {
            if (selectedPoleIndex === clickedPole) {
                selectedPoleIndex = -1; // Deselect
            } else {
                let source = poles[selectedPoleIndex];
                let target = poles[clickedPole];
                
                if (source.length > 0) {
                    let topColor = source[source.length - 1];
                    // Rule check
                    if (target.length < 4 && (target.length === 0 || target[target.length - 1] === topColor)) {
                        // Count how many consecutive rings of the same color are on top
                        let sourceCount = 0;
                        for (let c = source.length - 1; c >= 0; c--) {
                            if (source[c] === topColor) sourceCount++;
                            else break;
                        }
                        
                        let space = 4 - target.length;
                        let moveCount = Math.min(sourceCount, space);
                        
                        moveHistory.push({ from: selectedPoleIndex, to: clickedPole, count: moveCount });
                        if (undosLeft > 0) undoBtn.disabled = false;
                        
                        for (let m = 0; m < moveCount; m++) {
                            target.push(source.pop());
                        }
                        
                        moves++;
                        movesDisplay.textContent = moves;
                        playSound('drop');
                        if (checkWin()) {
                            gameState = 'won';
                            playSound('win');
                            restartBtn.style.display = 'none';
                            undoBtn.style.display = 'none';
                            nextBtn.style.display = 'block';
                        }
                    } else {
                        playSound('error');
                    }
                }
                selectedPoleIndex = -1;
            }
        }
        draw();
    }
}

// Event Listeners
canvas.addEventListener('mousedown', handleClick);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleClick(e); }, { passive: false });

restartBtn.addEventListener('click', () => loadLevel(currentLevel));
nextBtn.addEventListener('click', () => {
    currentLevel++;
    loadLevel(currentLevel);
});

// Undo button logic
undoBtn.addEventListener('click', () => {
    if (gameState !== 'playing' || moveHistory.length === 0 || undosLeft <= 0) return;
    initAudio();
    
    let lastMove = moveHistory.pop();
    for (let m = 0; m < lastMove.count; m++) {
        poles[lastMove.from].push(poles[lastMove.to].pop());
    }
    
    moves--;
    undosLeft--;
    movesDisplay.textContent = moves;
    undoBtn.textContent = `Undo (${undosLeft})`;
    selectedPoleIndex = -1;
    playSound('drop');
    
    if (moveHistory.length === 0 || undosLeft <= 0) undoBtn.disabled = true;
    draw();
});

window.addEventListener('resize', resizeCanvas);
initLevel();