document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('highScore');
    const restartBtn = document.getElementById('restartBtn');

    const COLS = 11;
    const ROWS = 15;
    const BUBBLE_RADIUS = 20;
    const BUBBLE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
    const BOMB_ICON = '💣';

    let grid = [];
    let currentBubble;
    let nextBubble;
    let projectile = null;
    let score = 0;
    let highScore = localStorage.getItem('bubbleShooterHighScore') || 0;
    let gameOver = false;
    let shotsFired = 0;
    const GAME_SAVE_KEY = 'bubbleShooterSave';

    // --- Audio Setup ---
    let audioCtx = null;
    function initAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playSound(type, count = 1) {
        if (!audioCtx) return;
        if (type === 'shoot') {
            const osc = audioCtx.createOscillator(); osc.type = 'sine';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
            const gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'pop') {
            for (let i = 0; i < Math.min(count, 10); i++) {
                const osc = audioCtx.createOscillator(); osc.type = 'triangle';
                osc.frequency.setValueAtTime(600 + i * 50, audioCtx.currentTime + i * 0.04);
                const gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.3, audioCtx.currentTime + i * 0.04);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.04 + 0.1);
                osc.connect(gain).connect(audioCtx.destination);
                osc.start(audioCtx.currentTime + i * 0.04); osc.stop(audioCtx.currentTime + i * 0.04 + 0.1);
            }
        } else if (type === 'gameover') {
            const osc = audioCtx.createOscillator(); osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
            const gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.5);
        }
    }

    function init() {
        canvas.width = COLS * BUBBLE_RADIUS * 2;
        canvas.height = ROWS * BUBBLE_RADIUS * 2;
        gameOver = false;
        score = 0;
        shotsFired = 0;
        updateScore();
        highScoreEl.textContent = highScore;

        grid = [];
        for (let r = 0; r < ROWS; r++) {
            grid[r] = [];
            for (let c = 0; c < COLS; c++) {
                if (r < 6) { // Start with 6 rows of bubbles
                    const isOffset = r % 2 !== 0;
                    if (c < COLS - (isOffset ? 1 : 0)) {
                        // Add a chance for a bomb bubble
                        if (Math.random() < 0.05) { // 5% chance
                            grid[r][c] = {
                                type: 'bomb',
                                color: '#333333',
                                popping: false
                            };
                        } else {
                            grid[r][c] = {
                                type: 'normal',
                                color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
                                popping: false
                            };
                        }
                    } else {
                        grid[r][c] = null;
                    }
                } else {
                    grid[r][c] = null;
                }
            }
        }
        
        generateNewBubbles();
        gameLoop();
    }

    function generateNewBubbles() {
        currentBubble = createRandomBubble();
        nextBubble = createRandomBubble();
    }

    function createRandomBubble() {
        // 10% chance for the player to get a bomb, but only if there are normal bubbles on screen
        const availableColors = new Set();
        grid.forEach(row => row.forEach(bubble => {
            if (bubble && bubble.type === 'normal') availableColors.add(bubble.color);
        }));
        if (availableColors.size > 0 && Math.random() < 0.10) {
            return { type: 'bomb', color: '#333333' };
        }
        return { type: 'normal', color: getAvailableColor() };
    }

    function getAvailableColor() {
        const availableColors = new Set();
        grid.forEach(row => row.forEach(bubble => {
            if (bubble) availableColors.add(bubble.color);
        }));
        const colors = Array.from(availableColors);
        return colors.length > 0 ? colors[Math.floor(Math.random() * colors.length)] : BUBBLE_COLORS[0];
    }

    function drawBubble(x, y, radius, bubble) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = bubble.color;
        ctx.fill();

        if (bubble.type === 'bomb') {
            ctx.font = `${radius * 1.2}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(BOMB_ICON, x, y + radius * 0.1); // slight y-offset for better centering
        } else {
            // Add a simple shine effect
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid bubbles
        grid.forEach((row, r) => {
            row.forEach((bubble, c) => {
                if (bubble) {
                    const isOffset = r % 2 !== 0;
                    const x = c * BUBBLE_RADIUS * 2 + (isOffset ? BUBBLE_RADIUS : 0) + BUBBLE_RADIUS;
                    const y = r * (BUBBLE_RADIUS * 2 - 5) + BUBBLE_RADIUS;
                    drawBubble(x, y, BUBBLE_RADIUS, bubble);
                }
            });
        });

        // Draw shooter and next bubble
        drawBubble(canvas.width / 2, canvas.height - BUBBLE_RADIUS, BUBBLE_RADIUS, currentBubble);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Next:', canvas.width - 40, canvas.height - 45);
        drawBubble(canvas.width - 40, canvas.height - 25, BUBBLE_RADIUS * 0.7, nextBubble);

        // Draw projectile
        if (projectile) {
            drawBubble(projectile.x, projectile.y, BUBBLE_RADIUS, projectile);
        }

        // Draw aim line
        if (!projectile && !gameOver) {
            const angle = Math.atan2(mouse.y - (canvas.height - BUBBLE_RADIUS), mouse.x - canvas.width / 2);
            if (mouse.y < canvas.height - BUBBLE_RADIUS * 2) {
                ctx.beginPath();
                ctx.moveTo(canvas.width / 2, canvas.height - BUBBLE_RADIUS);
                ctx.lineTo(canvas.width / 2 + Math.cos(angle) * 100, canvas.height - BUBBLE_RADIUS + Math.sin(angle) * 100);
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 40px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
        }
    }

    function update() {
        if (gameOver) return;

        if (projectile) {
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;

            // Wall collision
            if (projectile.x - BUBBLE_RADIUS < 0 || projectile.x + BUBBLE_RADIUS > canvas.width) {
                projectile.vx *= -1;
            }

            // Top collision
            if (projectile.y - BUBBLE_RADIUS < 0) {
                snapBubble(0, Math.floor(projectile.x / (BUBBLE_RADIUS * 2)));
                return;
            }

            // Bubble collision
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (grid[r][c]) {
                        const isOffset = r % 2 !== 0;
                        const bubbleX = c * BUBBLE_RADIUS * 2 + (isOffset ? BUBBLE_RADIUS : 0) + BUBBLE_RADIUS;
                        const bubbleY = r * (BUBBLE_RADIUS * 2 - 5) + BUBBLE_RADIUS;
                        const dist = Math.hypot(projectile.x - bubbleX, projectile.y - bubbleY);
                        if (dist < BUBBLE_RADIUS * 2) {
                            if (grid[r][c].type === 'bomb') {
                                projectile = null;
                                explodeBomb(r, c);
                                currentBubble = nextBubble;
                                nextBubble = createRandomBubble();
                                shotsFired++; // A shot was used
                                if (shotsFired % 6 === 0) addNewRow();
                                checkGameOver();
                            } else {
                                snapBubble(r, c);
                            }
                            return;
                        }
                    }
                }
            }
        }
    }

    function snapBubble(hitRow, hitCol) {
        const projY = projectile.y;
        const newRow = Math.round((projY - BUBBLE_RADIUS) / (BUBBLE_RADIUS * 2 - 5));
        const isOffset = newRow % 2 !== 0;
        const newCol = Math.floor((projectile.x - (isOffset ? BUBBLE_RADIUS : 0)) / (BUBBLE_RADIUS * 2));

        if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS - (isOffset ? 1 : 0) && !grid[newRow][newCol]) {
            const newBubble = { type: projectile.type, color: projectile.color, popping: false };
            grid[newRow][newCol] = newBubble;
            
            if (newBubble.type === 'bomb') {
                explodeBomb(newRow, newCol);
                saveGame();
            } else {
                const matches = findMatches(newRow, newCol);
                if (matches.length >= 3) {
                    popBubbles(matches);
                    setTimeout(dropFloatingBubbles, 200);
                }
            }

            projectile = null;
            currentBubble = nextBubble;
            nextBubble = createRandomBubble();
            
            shotsFired++;
            if (shotsFired % 6 === 0) {
                addNewRow();
                saveGame();
            }

            checkGameOver();
        }
    }

    function findMatches(startR, startC) {
        const toVisit = [{ r: startR, c: startC }];
        const visited = new Set([`${startR},${startC}`]);
        const matches = [];
        const color = grid[startR][startC]?.color;

        while (toVisit.length > 0) {
            const { r, c } = toVisit.pop();
            matches.push({ r, c });

            getNeighbors(r, c).forEach(n => {
                const key = `${n.r},${n.c}`;
                if (!visited.has(key) && grid[n.r]?.[n.c]?.type === 'normal' && grid[n.r]?.[n.c]?.color === color) {
                    visited.add(key);
                    toVisit.push(n);
                }
            });
        }
        return matches;
    }

    function getNeighbors(r, c) {
        const isOffset = r % 2 !== 0;
        const neighbors = [];
        const directions = isOffset
            ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
            : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
        
        directions.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                neighbors.push({ r: nr, c: nc });
            }
        });
        return neighbors;
    }

    function popBubbles(bubbles) {
        bubbles.forEach(({ r, c }) => {
            grid[r][c] = null;
        });
        updateScore(bubbles.length * 10);
        playSound('pop', bubbles.length);
    }

    function explodeBomb(bombR, bombC) {
        const isOffset = bombR % 2 !== 0;
        const bombX = bombC * BUBBLE_RADIUS * 2 + (isOffset ? BUBBLE_RADIUS : 0) + BUBBLE_RADIUS;
        const bombY = bombR * (BUBBLE_RADIUS * 2 - 5) + BUBBLE_RADIUS;
        const explosionRadius = BUBBLE_RADIUS * 3.5;
        let bubblesToPop = [];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c]) {
                    const bubbleIsOffset = r % 2 !== 0;
                    const bubbleX = c * BUBBLE_RADIUS * 2 + (bubbleIsOffset ? BUBBLE_RADIUS : 0) + BUBBLE_RADIUS;
                    const bubbleY = r * (BUBBLE_RADIUS * 2 - 5) + BUBBLE_RADIUS;
                    const dist = Math.hypot(bombX - bubbleX, bombY - bubbleY);
                    if (dist < explosionRadius) {
                        bubblesToPop.push({ r, c });
                    }
                }
            }
        }
        
        if (grid[bombR][bombC] && !bubblesToPop.some(b => b.r === bombR && b.c === bombC)) {
            bubblesToPop.push({ r: bombR, c: bombC });
            grid[bombR][bombC] = null; // Remove the bomb itself
        }

        popBubbles(bubblesToPop);
        playSound('bomb');
        setTimeout(dropFloatingBubbles, 200);
    }

    function dropFloatingBubbles() {
        const connected = new Set();
        for (let c = 0; c < COLS; c++) {
            if (grid[0][c]) {
                const toVisit = [{ r: 0, c }];
                const visited = new Set([`0,${c}`]);
                connected.add(`0,${c}`);
                while (toVisit.length > 0) {
                    const { r, c } = toVisit.pop();
                    getNeighbors(r, c).forEach(n => {
                        const key = `${n.r},${n.c}`;
                        if (!visited.has(key) && grid[n.r]?.[n.c]) {
                            visited.add(key);
                            connected.add(key);
                            toVisit.push(n);
                        }
                    });
                }
            }
        }

        let droppedCount = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c] && !connected.has(`${r},${c}`)) {
                    grid[r][c] = null;
                    droppedCount++;
                }
            }
        }
        if (droppedCount > 0) {
            updateScore(droppedCount * 20); // Bonus points for dropping
            playSound('pop', droppedCount);
        }
    }

    function addNewRow() {
        grid.pop(); // Remove last row
        const newRow = [];
        const isOffset = 0 % 2 !== 0; // Top row is not offset
        for (let c = 0; c < COLS - (isOffset ? 1 : 0); c++) {
            newRow[c] = {
                type: 'normal',
                color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
                popping: false
            };
        }
        grid.unshift(newRow);
        checkGameOver();
    }

    function checkGameOver() {
        for (let c = 0; c < COLS; c++) {
            if (grid[ROWS - 1][c]) {
                gameOver = true;
                localStorage.removeItem(GAME_SAVE_KEY); // Clear save on game over
                playSound('gameover');
                break;
            }
        }
    }

    function updateScore(points = 0) {
        score += points;
        scoreEl.textContent = score;
        if (score > highScore) {
            highScore = score;
            highScoreEl.textContent = highScore;
            localStorage.setItem('bubbleShooterHighScore', highScore);
        }
    }

    function gameLoop() {
        update();
        draw();
        if (!gameOver) {
            requestAnimationFrame(gameLoop);
        }
    }

    // Mouse and Touch Controls
    let mouse = { x: 0, y: 0 };
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('click', () => {
        if (projectile || gameOver) return;
        initAudio();
        const angle = Math.atan2(mouse.y - (canvas.height - BUBBLE_RADIUS), mouse.x - canvas.width / 2);
        if (mouse.y > canvas.height - BUBBLE_RADIUS * 2) return;

        projectile = {
            x: canvas.width / 2,
            y: canvas.height - BUBBLE_RADIUS,
            vx: Math.cos(angle) * 15,
            vy: Math.sin(angle) * 15,
            type: currentBubble.type,
            color: currentBubble.color
        };
        playSound('shoot');
    });

    restartBtn.addEventListener('click', () => {
        localStorage.removeItem(GAME_SAVE_KEY); // Clear saved game
        init(true); // Start a new game
    });

    init(false); // Try to load game, if not, start new
});
