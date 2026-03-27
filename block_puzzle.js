document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('highScore');
    const restartBtn = document.getElementById('restartBtn');

    const GRID_SIZE = 10;
    let blockSize;
    let grid = [];

    const PIECE_SHAPES = {
        I: [[1, 1, 1, 1]],
        I_V: [[1], [1], [1], [1]],
        L: [[1, 0], [1, 0], [1, 1]],
        J: [[0, 1], [0, 1], [1, 1]],
        T: [[1, 1, 1], [0, 1, 0]],
        O: [[1, 1], [1, 1]],
        S: [[0, 1, 1], [1, 1, 0]],
        Z: [[1, 1, 0], [0, 1, 1]],
        DOT: [[1]],
        TRI: [[0, 1, 0], [1, 1, 1]],
        CORNER: [[1, 1], [1, 0]],
        U: [[1, 0, 1], [1, 1, 1]],
        P: [[1, 1], [1, 1], [1, 0]]
    };
    const PIECE_COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c'];

    let score = 0;
    let highScore = parseInt(localStorage.getItem('blockPuzzleHighScore')) || 0;
    let currentPieces = [];
    let heldPiece = null;
    let heldPieceIndex = -1;
    let dragOffset = { x: 0, y: 0 };
    let gameOver = false;
    const GAME_SAVE_KEY = 'blockPuzzleSave';

    // --- Audio Setup ---
    let audioCtx = null;
    function initAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playSound(type, count = 1) {
        if (!audioCtx) return;
        if (type === 'place') {
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'clear') {
            for (let i = 0; i < count; i++) {
                const osc = audioCtx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400 + i * 100, audioCtx.currentTime + i * 0.05);
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.05 + 0.1);
                osc.connect(gain).connect(audioCtx.destination);
                osc.start(audioCtx.currentTime + i * 0.05);
                osc.stop(audioCtx.currentTime + i * 0.05 + 0.1);
            }
        } else if (type === 'gameover') {
            const osc = audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        }
    }

    function saveGame() {
        const serializablePieces = currentPieces.map(piece => ({
            shape: piece.shape,
            color: piece.color,
            placed: piece.placed
        }));

        const gameState = {
            grid: grid,
            score: score,
            highScore: highScore,
            currentPieces: serializablePieces,
            gameOver: gameOver
        };
        localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(gameState));
    }

    function loadGame() {
        const savedState = localStorage.getItem(GAME_SAVE_KEY);
        if (!savedState) return false;

        const gameState = JSON.parse(savedState);
        grid = gameState.grid;
        score = gameState.score;
        highScore = gameState.highScore;
        gameOver = gameState.gameOver;

        currentPieces = gameState.currentPieces.map((piece, i) => ({
            shape: piece.shape,
            color: piece.color,
            x: (i * 3.3 + 0.5) * blockSize, // Recalculate x, y based on current blockSize
            y: (GRID_SIZE + 0.5) * blockSize,
            placed: piece.placed
        }));
        
        heldPiece = null;
        heldPieceIndex = -1;
        dragOffset = { x: 0, y: 0 };

        updateScore(0); // Update score display, will also update high score
        return true;
    }

    function init(isNewGame = false) {
        const containerWidth = Math.min(window.innerWidth * 0.9, 400);
        blockSize = Math.floor(containerWidth / GRID_SIZE);
        canvas.width = GRID_SIZE * blockSize;
        canvas.height = (GRID_SIZE + 4) * blockSize; // Extra space for pieces

        if (!isNewGame && loadGame()) {
            draw();
        } else {
            grid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
            score = 0;
            gameOver = false;
            updateScore();
            generateNewPieces(); // This will call checkGameOver which saves if not game over
            draw();
        }
    }

    function generateNewPieces() {
        currentPieces = [];
        const pieceKeys = Object.keys(PIECE_SHAPES);
        for (let i = 0; i < 3; i++) {
            const shapeKey = pieceKeys[Math.floor(Math.random() * pieceKeys.length)];
            const shape = PIECE_SHAPES[shapeKey];
            const color = PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)];
            currentPieces.push({
                shape,
                color,
                x: (i * 3.3 + 0.5) * blockSize,
                y: (GRID_SIZE + 0.5) * blockSize,
                placed: false
            });
        }
        saveGame(); // Save after generating new pieces
        checkGameOver();
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawPlacedBlocks();
        drawCurrentPieces();
        if (heldPiece) drawHeldPiece();
        if (gameOver) drawGameOver();
    }

    function drawGrid() {
        ctx.strokeStyle = '#2c3e50';
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * blockSize, 0);
            ctx.lineTo(i * blockSize, GRID_SIZE * blockSize);
            ctx.moveTo(0, i * blockSize);
            ctx.lineTo(GRID_SIZE * blockSize, i * blockSize);
            ctx.stroke();
        }
    }

    function drawPlacedBlocks() {
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (grid[y][x]) {
                    drawBlock(x * blockSize, y * blockSize, grid[y][x]);
                }
            }
        }
    }

    function drawCurrentPieces() {
        currentPieces.forEach((piece, index) => {
            if (!piece.placed && index !== heldPieceIndex) {
                drawPiece(piece, piece.x, piece.y, 0.6);
            }
        });
    }

    function drawHeldPiece() {
        drawPiece(heldPiece, heldPiece.x, heldPiece.y, 1.0);
        // Draw a ghost piece on the grid
        const gridX = Math.floor((heldPiece.x + dragOffset.x) / blockSize);
        const gridY = Math.floor((heldPiece.y + dragOffset.y) / blockSize);
        if (canPlace(heldPiece, gridX, gridY)) {
            ctx.globalAlpha = 0.4;
            drawPiece(heldPiece, gridX * blockSize, gridY * blockSize, 1.0);
            ctx.globalAlpha = 1.0;
        }
    }

    function drawPiece(piece, startX, startY, scale) {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(startX + x * blockSize * scale, startY + y * blockSize * scale, piece.color, scale);
                }
            });
        });
    }

    function drawBlock(x, y, color, scale = 1) {
        const size = blockSize * scale;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.strokeRect(x, y, size, size);
    }

    function drawGameOver() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
    }

    function updateScore(points = 0) {
        score += points;
        scoreEl.textContent = score;
        if (score > highScore) {
            highScore = score;
            highScoreEl.textContent = highScore;
            localStorage.setItem('blockPuzzleHighScore', highScore);
        }
    }

    function canPlace(piece, gridX, gridY) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const newX = gridX + x;
                    const newY = gridY + y;
                    if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE || grid[newY][newX]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function placePiece(piece, gridX, gridY) {
        let points = 0;
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    grid[gridY + y][gridX + x] = piece.color;
                    points++;
                }
            });
        });
        saveGame(); // Save after placing a piece
        updateScore(points);
        playSound('place');
        clearLines();
    }

    function clearLines() {
        let linesCleared = 0;
        let rowsToClear = [];
        let colsToClear = [];

        // Check rows
        for (let y = 0; y < GRID_SIZE; y++) {
            if (grid[y].every(cell => cell !== 0)) {
                rowsToClear.push(y);
            }
        }

        // Check columns
        for (let x = 0; x < GRID_SIZE; x++) {
            let colFull = true;
            for (let y = 0; y < GRID_SIZE; y++) {
                if (grid[y][x] === 0) {
                    colFull = false;
                    break;
                }
            }
            if (colFull) {
                colsToClear.push(x);
            }
        }

        // Clear rows
        rowsToClear.forEach(y => {
            for (let x = 0; x < GRID_SIZE; x++) grid[y][x] = 0;
            linesCleared++;
        });

        // Clear columns
        colsToClear.forEach(x => {
            for (let y = 0; y < GRID_SIZE; y++) grid[y][x] = 0;
            linesCleared++;
        });

        if (linesCleared > 0) {
            const bonus = [0, 10, 30, 60, 100, 150, 200];
            updateScore(bonus[linesCleared] || 250);
            playSound('clear', linesCleared);
        }
    }

    function checkGameOver() {
        for (const piece of currentPieces) {
            if (piece.placed) continue;
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    if (canPlace(piece, x, y)) { // If any piece can be placed, game is not over
                        gameOver = false;
                        saveGame(); // Save if game is still active
                        return; // Found a possible move, game is not over
                    }
                }
            }
        }
        playSound('gameover');
        gameOver = true; // Set gameOver to true only if no moves are possible
        localStorage.removeItem(GAME_SAVE_KEY); // Clear save on game over
    }

    function getEventPosition(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function onMouseDown(e) {
        if (gameOver) return;
        initAudio();
        const { x, y } = getEventPosition(e);

        for (let i = currentPieces.length - 1; i >= 0; i--) {
            const piece = currentPieces[i];
            if (piece.placed) continue;

            const pieceWidth = piece.shape[0].length * blockSize * 0.6;
            const pieceHeight = piece.shape.length * blockSize * 0.6;

            if (x > piece.x && x < piece.x + pieceWidth && y > piece.y && y < piece.y + pieceHeight) {
                heldPiece = piece;
                heldPieceIndex = i;
                dragOffset = { x: piece.x - x, y: piece.y - y };
                break;
            }
        }
        draw();
    }

    function onMouseMove(e) {
        if (!heldPiece || gameOver) return;
        const { x, y } = getEventPosition(e);
        heldPiece.x = x + dragOffset.x;
        heldPiece.y = y + dragOffset.y;
        draw();
    }

    function onMouseUp(e) {
        if (!heldPiece || gameOver) return;

        const gridX = Math.round((heldPiece.x + dragOffset.x) / blockSize);
        const gridY = Math.round((heldPiece.y + dragOffset.y) / blockSize);

        if (canPlace(heldPiece, gridX, gridY)) {
            placePiece(heldPiece, gridX, gridY);
            heldPiece.placed = true;
            saveGame(); // Save after successful placement
        }

        heldPiece = null;
        heldPieceIndex = -1;

        if (currentPieces.every(p => p.placed)) {
            generateNewPieces();
            // generateNewPieces calls checkGameOver which calls saveGame
        }
        draw();
    }

    // Event Listeners
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onMouseDown(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); onMouseMove(e); }, { passive: false });
    window.addEventListener('touchend', onMouseUp);

    restartBtn.addEventListener('click', init);
    window.addEventListener('resize', init);

    highScoreEl.textContent = highScore;
    init();
});