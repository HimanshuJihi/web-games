document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const player1ScoreEl = document.getElementById('player1Score');
    const player2ScoreEl = document.getElementById('player2Score');
    const p1InfoEl = document.getElementById('p1-info');
    const p2InfoEl = document.getElementById('p2-info');
    const restartBtn = document.getElementById('restartBtn');
    const setupContainer = document.getElementById('setup-container');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const winnerText = document.getElementById('winnerText');
    const winnerScore = document.getElementById('winnerScore');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const resumeGameBtn = document.getElementById('resumeGameBtn');
    const gameContainer = document.querySelector('.game-container');
    const seoArticle = document.querySelector('.seo-article');
    const modeSelect = document.getElementById('modeSelect');
    const difficultySelect = document.getElementById('difficultySelect');
    const p1NameInput = document.getElementById('p1Name');
    const p2NameInput = document.getElementById('p2Name');
    const startGameBtn = document.getElementById('startGameBtn');

    let BOARD_SIZE = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.7, 600);
    let POCKET_RADIUS = BOARD_SIZE / 30;
    let PIECE_RADIUS = BOARD_SIZE / 60;
    let STRIKER_RADIUS = BOARD_SIZE / 40;
    const FRICTION = 0.98;
    const MAX_POWER = BOARD_SIZE / 25; // Increased max power for more realistic feel

    // Colors
    const BOARD_COLOR = '#8B4513'; // Wood Brown
    const FELT_COLOR = '#D2B48C'; // Light Brown / Beige
    const POCKET_COLOR = '#333333';
    const WHITE_PIECE = '#E6C280'; // Natural Wood Color
    const BLACK_PIECE = '#2C1E16'; // Dark Wood Color
    const QUEEN_PIECE = '#D32F2F'; // Deeper Red
    const STRIKER_COLOR = '#0000FF';


    let player1Score = 0;
    let player2Score = 0;
    let turn = 0; // 0 for Player 1 (White), 1 for Player 2 (Black)
    let playerTypes = ['human', 'ai'];
    let playerNames = ['Player 1', 'Computer'];
    let playerPieces = ['white', 'black']; // Player 0 gets white, Player 1 gets black
    let gameState = 'aiming'; // 'aiming', 'striking', 'simulating', 'foul', 'roundOver'
    let striker = { x: 0, y: 0, vx: 0, vy: 0, r: STRIKER_RADIUS, color: STRIKER_COLOR };
    let pieces = []; // Array of {x, y, vx, vy, r, color, type}
    let pocketedPieces = [];
    let queenPocketedBy = -1; // -1: not pocketed, 0: P1, 1: P2
    let queenNeedsCover = false; // Does the current player need to cover the queen?
    let queenIsCovered = false;
    let mouse = { x: 0, y: 0, isDown: false, dragStart: { x: 0, y: 0 } };
    let aimingLine = { startX: 0, startY: 0, endX: 0, endY: 0, visible: false };
    let turnPocketedCount = 0; // How many pieces were pocketed this turn
    let foulCommitted = false; // Track foul in current turn
    let turnMessage = '';
    let turnMessageOpacity = 0;
    let aiDifficulty = 'medium'; // normal, medium, hard, expert

    const GAME_SAVE_KEY = 'caromBoardSave';

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
        osc.connect(gain).connect(audioCtx.destination);

        if (type === 'strike') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'pocket') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
            osc.start(); osc.stop(audioCtx.currentTime + 0.05);
        } else if (type === 'collision') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(2000, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.02);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
            osc.start(); osc.stop(audioCtx.currentTime + 0.02);
        }
    }

    function saveGame() {
        const gameState = {
            player1Score: player1Score,
            player2Score: player2Score,
            turn: turn,
            playerTypes: playerTypes,
            playerNames: playerNames,
            striker: striker,
            pieces: pieces,
            pocketedPieces: pocketedPieces,
            queenPocketedBy: queenPocketedBy,
            queenIsCovered: queenIsCovered,
            queenNeedsCover: queenNeedsCover,
            foulCommitted: foulCommitted,
            aiDifficulty: aiDifficulty
        };
        localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(gameState));
    }

    function loadGame() {
        const savedState = localStorage.getItem(GAME_SAVE_KEY);
        if (!savedState) return false;

        const gameState = JSON.parse(savedState);
        player1Score = gameState.player1Score;
        player2Score = gameState.player2Score;
        turn = gameState.turn;
        playerTypes = gameState.playerTypes || ['human', 'ai'];
        playerNames = gameState.playerNames || ['Player 1', 'Computer'];
        striker = gameState.striker;
        pieces = gameState.pieces;
        pocketedPieces = gameState.pocketedPieces || [];
        queenNeedsCover = gameState.queenNeedsCover || false;
        queenIsCovered = gameState.queenIsCovered || false;
        queenPocketedBy = gameState.queenPocketedBy ?? -1;
        foulCommitted = gameState.foulCommitted || false;
        aiDifficulty = gameState.aiDifficulty || 'medium';
        if (difficultySelect) difficultySelect.value = aiDifficulty;
        
        updateScoreDisplay();
        return true;
    }

    function initGame(forceNew = false) {
        canvas.width = BOARD_SIZE;
        canvas.height = BOARD_SIZE;
        // Recalculate sizes based on board size
        POCKET_RADIUS = BOARD_SIZE / 30;
        PIECE_RADIUS = BOARD_SIZE / 60;
        STRIKER_RADIUS = BOARD_SIZE / 40;

        if (!forceNew && loadGame()) {
            // Game loaded, ensure state is 'aiming' if not simulating
            striker.r = STRIKER_RADIUS;
            pieces.forEach(p => p.r = PIECE_RADIUS);
            if (gameState !== 'simulating') gameState = 'aiming';
        } else {
            player1Score = 0;
            player2Score = 0;
            turn = 0; // Player 1 starts
            gameState = 'aiming';

            striker = { x: canvas.width / 2, y: canvas.height - (BOARD_SIZE / 8), vx: 0, vy: 0, r: STRIKER_RADIUS, color: STRIKER_COLOR };
            pieces = [];
            pocketedPieces = [];
            queenPocketedBy = -1; // Who pocketed the queen
            queenNeedsCover = false;
            queenIsCovered = false;
            foulCommitted = false;
            turnMessage = `${playerNames[turn]} Starts!`;
            turnMessageOpacity = 1.0;

            // --- NEW, CORRECT PIECE SETUP ---
            const center = { x: canvas.width / 2, y: canvas.height / 2 };
            const R = PIECE_RADIUS * 2.1; // Distance between pieces

            // Queen in the center
            pieces.push({ x: center.x, y: center.y, vx: 0, vy: 0, r: PIECE_RADIUS, color: QUEEN_PIECE, type: 'queen' });

            // 6 pieces around the queen (3 white, 3 black)
            for (let i = 0; i < 6; i++) {
                const angle = i * (Math.PI / 3);
                const pieceType = (i % 2 === 0) ? 'white' : 'black';
                const pieceColor = (i % 2 === 0) ? WHITE_PIECE : BLACK_PIECE;
                pieces.push({ x: center.x + R * Math.cos(angle), y: center.y + R * Math.sin(angle), vx: 0, vy: 0, r: PIECE_RADIUS, color: pieceColor, type: pieceType });
            }

            // 12 pieces in the outer circle (6 white, 6 black)
            for (let i = 0; i < 12; i++) {
                const angle = i * (Math.PI / 6) + (Math.PI / 12); // Offset to place between inner pieces
                let pieceType, pieceColor;
                if (i % 2 === 0) {
                    pieceType = 'black'; pieceColor = BLACK_PIECE;
                } else {
                    pieceType = 'white'; pieceColor = WHITE_PIECE;
                }
                pieces.push({ x: center.x + 2 * R * Math.cos(angle), y: center.y + 2 * R * Math.sin(angle), vx: 0, vy: 0, r: PIECE_RADIUS, color: pieceColor, type: pieceType });
            }
            // Now we have 1 queen, 9 white, 9 black. Correct.
            updateScoreDisplay(); // Fix: Update UI for new game
            saveGame();
        }
        resetStriker();
        // If it's AI's turn, trigger its move
        if (playerTypes[turn] === 'ai' && gameState === 'aiming') {
            setTimeout(playAITurn, 1500);
        }
        gameLoop();
    }

    function drawBoard() {
        const playingAreaMargin = BOARD_SIZE / 12;
        const strikerLineY = canvas.height - (BOARD_SIZE / 8.5);

        // Outer board
        ctx.fillStyle = BOARD_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Inner playing area
        ctx.fillStyle = FELT_COLOR;
        ctx.fillRect(playingAreaMargin, playingAreaMargin, canvas.width - 2 * playingAreaMargin, canvas.height - 2 * playingAreaMargin);

        // Pockets
        const pocketPositions = [
            { x: playingAreaMargin, y: playingAreaMargin },
            { x: canvas.width - playingAreaMargin, y: playingAreaMargin },
            { x: playingAreaMargin, y: canvas.height - playingAreaMargin },
            { x: canvas.width - playingAreaMargin, y: canvas.height - playingAreaMargin }
        ];
        pocketPositions.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = POCKET_COLOR;
            ctx.fill();
        });

        // Striker lines
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playingAreaMargin + 20, strikerLineY);
        ctx.lineTo(canvas.width - playingAreaMargin - 20, strikerLineY);
        ctx.stroke();

        const strikerLineTopY = BOARD_SIZE / 8.5;
        ctx.beginPath();
        ctx.moveTo(playingAreaMargin + 20, strikerLineTopY);
        ctx.lineTo(canvas.width - playingAreaMargin - 20, strikerLineTopY);
        ctx.stroke();

        // स्ट्राइकर लाइनों के सिरों पर सजावटी गोले
        const strikerLineMargin = playingAreaMargin + 20;
        const strikerCircleRadius = PIECE_RADIUS * 1.2;
        ctx.lineWidth = 1.5;

        // नीचे-बाएं गोला
        ctx.beginPath();
        ctx.arc(strikerLineMargin, strikerLineY, strikerCircleRadius, 0, Math.PI * 2);
        ctx.stroke();
        // नीचे-दाएं गोला
        ctx.beginPath();
        ctx.arc(canvas.width - strikerLineMargin, strikerLineY, strikerCircleRadius, 0, Math.PI * 2);
        ctx.stroke();
        // ऊपर-बाएं गोला
        ctx.beginPath();
        ctx.arc(strikerLineMargin, strikerLineTopY, strikerCircleRadius, 0, Math.PI * 2);
        ctx.stroke();
        // ऊपर-दाएं गोला
        ctx.beginPath();
        ctx.arc(canvas.width - strikerLineMargin, strikerLineTopY, strikerCircleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Center Design (Concentric circles and red center spot)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        ctx.strokeStyle = POCKET_COLOR;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, BOARD_SIZE / 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, BOARD_SIZE / 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, PIECE_RADIUS + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#c0392b';
        ctx.fill();
        ctx.stroke();

        // केंद्र से कोनों की ओर तीर का डिज़ाइन
        const baseRadius = BOARD_SIZE / 8 + 5; // मुख्य गोले के ठीक बाहर से शुरू करें
        const endRadius = BOARD_SIZE / 2.8;   // तीर कितनी दूर तक जाएगा

        ctx.lineWidth = 3;

        for (let i = 0; i < 4; i++) {
            const angle = i * (Math.PI / 2) + Math.PI / 4; // 45 डिग्री पर घुमाएं ताकि कोनों की ओर इशारा हो
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);

            // बाईं घुमावदार रेखा (काली)
            ctx.strokeStyle = BLACK_PIECE;
            ctx.beginPath();
            ctx.moveTo(baseRadius, -15);
            ctx.quadraticCurveTo( (baseRadius + endRadius) / 2, -25, endRadius, -5);
            ctx.stroke();

            // दाईं घुमावदार रेखा (काली)
            ctx.beginPath();
            ctx.moveTo(baseRadius, 15);
            ctx.quadraticCurveTo( (baseRadius + endRadius) / 2, 25, endRadius, 5);
            ctx.stroke();

            // बीच में सजावटी लाल गोला
            ctx.fillStyle = QUEEN_PIECE;
            ctx.beginPath();
            ctx.arc(endRadius + 15, 0, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    function drawPiece(piece) {
        // Shadow for depth
        ctx.beginPath();
        ctx.arc(piece.x + 2, piece.y + 2, piece.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; // Slightly darker shadow for realism
        ctx.fill();


        // Create a radial gradient for a 3D effect
        const gradient = ctx.createRadialGradient(
            piece.x - piece.r * 0.3, piece.y - piece.r * 0.3, piece.r * 0.1, // Inner circle (highlight position)
            piece.x, piece.y, piece.r // Outer circle
        );

        // Function to lighten or darken a hex color
        const adjustColor = (hex, percent) => {
            const num = parseInt(hex.replace("#",""), 16),
            amt = Math.round(2.55 * percent),
            R = (num >> 16) + amt,
            G = (num >> 8 & 0x00FF) + amt,
            B = (num & 0x0000FF) + amt;
            return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
        };
        
        const innerColor = adjustColor(piece.color, 30); // Lighter color for the center
        const outerColor = adjustColor(piece.color, -10); // Slightly darker for the edge

        gradient.addColorStop(0, innerColor);
        gradient.addColorStop(1, outerColor);

        // Draw the main piece with the gradient
        ctx.beginPath();
        ctx.arc(piece.x, piece.y, piece.r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Add a stroke for definition
        ctx.strokeStyle = adjustColor(piece.color, -30);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Add carved concentric rings to simulate real carrom coins (Wooden feel)
        if (piece.color !== STRIKER_COLOR) {
            // Outer carved ring
            ctx.beginPath();
            ctx.arc(piece.x, piece.y, piece.r * 0.65, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.lineWidth = piece.r * 0.08;
            ctx.stroke();

            // Inner carved ring
            ctx.beginPath();
            ctx.arc(piece.x, piece.y, piece.r * 0.4, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = piece.r * 0.05;
            ctx.stroke();
        }

        // Add a glossy highlight, especially for the striker
        if (piece.color === STRIKER_COLOR) {
            ctx.beginPath();
            ctx.arc(piece.x - piece.r * 0.4, piece.y - piece.r * 0.4, piece.r * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fill();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBoard();

        pieces.forEach(drawPiece);
        drawPiece(striker);

        if (turnMessageOpacity > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${turnMessageOpacity})`;
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 5;
            ctx.fillText(turnMessage, canvas.width / 2, canvas.height / 2 - BOARD_SIZE / 4);
            ctx.restore();
            turnMessageOpacity = Math.max(0, turnMessageOpacity - 0.01);
        }

        if (gameState === 'aiming' && aimingLine.visible) {
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(aimingLine.startX, aimingLine.startY);
            ctx.lineTo(aimingLine.endX, aimingLine.endY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw Power Meter
            const dx = aimingLine.endX - aimingLine.startX;
            const dy = aimingLine.endY - aimingLine.startY;
            const powerRatio = Math.min(Math.hypot(dx, dy) / (MAX_POWER * 6), 1.0); // Corresponds to mouseup power calc
            
            const meterWidth = 120;
            const meterHeight = 15;
            const meterX = (canvas.width - meterWidth) / 2;
            const meterY = 20;

            ctx.fillStyle = '#555';
            ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
            
            const powerColor = powerRatio > 0.8 ? '#e74c3c' : (powerRatio > 0.5 ? '#f1c40f' : '#2ecc71');
            ctx.fillStyle = powerColor;
            ctx.fillRect(meterX, meterY, meterWidth * powerRatio, meterHeight);

            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);
        }
    }

    function update() {
        if (gameState !== 'simulating') return;

        let allStopped = true;

        // Update striker
        striker.x += striker.vx;
        striker.y += striker.vy;
        striker.vx *= FRICTION;
        striker.vy *= FRICTION;
        if (Math.hypot(striker.vx, striker.vy) > 0.1) allStopped = false;

        // Update pieces
        pieces.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= FRICTION;
            p.vy *= FRICTION;
            if (Math.hypot(p.vx, p.vy) > 0.1) allStopped = false;
        });

        // Handle collisions (simplified)
        // Striker-piece collisions
        pieces.forEach(p => {
            const dist = Math.hypot(striker.x - p.x, striker.y - p.y);
            if (dist < striker.r + p.r) handleCollision(striker, p);
        });

        // Piece-piece collisions
        for (let i = 0; i < pieces.length; i++) {
            for (let j = i + 1; j < pieces.length; j++) {
                const p1 = pieces[i];
                const p2 = pieces[j];
                const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                if (dist < p1.r + p2.r) handleCollision(p1, p2);
            }
        }

        // Check for pieces in pockets
        checkPockets();

        // Check wall collisions
        const allGamePieces = [striker, ...pieces];
        allGamePieces.forEach(p => {
            if (p.x - p.r < 0 || p.x + p.r > canvas.width) p.vx *= -1;
            if (p.y - p.r < 0 || p.y + p.r > canvas.height) p.vy *= -1;
        });

        if (allStopped) {
            gameState = 'aiming';
            endTurn();
            saveGame();
        }
    }
    
    function handleCollision(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const overlap = (p1.r + p2.r) - dist;

        if (overlap > 0) {
            // Separate overlapping pieces
            const angle = Math.atan2(dy, dx);
            p1.x -= overlap * Math.cos(angle) * 0.5;
            p1.y -= overlap * Math.sin(angle) * 0.5;
            p2.x += overlap * Math.cos(angle) * 0.5;
            p2.y += overlap * Math.sin(angle) * 0.5;

            // Realistic collision physics
            const nx = dx / dist; // Normal x
            const ny = dy / dist; // Normal y
            const k = (2 * (p1.vx * nx + p1.vy * ny - p2.vx * nx - p2.vy * ny)) / 2; // Assuming equal mass
            const vx1 = p1.vx - k * nx;
            const vy1 = p1.vy - k * ny;
            const vx2 = p2.vx + k * nx;
            const vy2 = p2.vy + k * ny;

            p1.vx = vx1; p1.vy = vy1;
            p2.vx = vx2; p2.vy = vy2;
            playSound('collision');
        }
    }

    function checkPockets() {
        const playingAreaMargin = BOARD_SIZE / 12;
        const pocketPositions = [
            { x: playingAreaMargin, y: playingAreaMargin },
            { x: BOARD_SIZE - playingAreaMargin, y: playingAreaMargin },
            { x: playingAreaMargin, y: BOARD_SIZE - playingAreaMargin },
            { x: BOARD_SIZE - playingAreaMargin, y: BOARD_SIZE - playingAreaMargin }
        ];

        // Check striker
        for (const pocket of pocketPositions) {
            if (Math.hypot(striker.x - pocket.x, striker.y - pocket.y) < POCKET_RADIUS) {
                // Striker pocketed - FOUL!
                console.log("Striker pocketed - FOUL! Penalty applied.");
                resetStriker();
                playSound('pocket');
                // Penalty: Return one pocketed piece of the current player
                const playerPieceType = playerPieces[turn];
                const penaltyPieceIndex = pocketedPieces.findIndex(p => p.type === playerPieceType);
                if (penaltyPieceIndex > -1) {
                    const penaltyPiece = pocketedPieces.splice(penaltyPieceIndex, 1)[0];
                    penaltyPiece.x = canvas.width / 2; // Place back in center
                    penaltyPiece.y = canvas.height / 2;
                    penaltyPiece.vx = 0; // गोटी की पुरानी स्पीड शून्य करें ताकि वह रुके
                    penaltyPiece.vy = 0;
                    pieces.push(penaltyPiece);
                    if (turn === 0) player1Score--; else player2Score--;
                    updateScoreDisplay();
                    
                    // स्क्रीन पर पेनल्टी का मैसेज दिखाएं
                    turnMessage = "Penalty! Piece Returned";
                    turnMessageOpacity = 1.0;
                }
                foulCommitted = true; // Explicitly track foul
                break;
            }
        }

        // Check carom pieces
        pieces = pieces.filter(p => {
            for (const pocket of pocketPositions) {
                if (Math.hypot(p.x - pocket.x, p.y - pocket.y) < POCKET_RADIUS) {
                    pocketedPieces.push(p);

                    const wasMyPiece = p.type === playerPieces[turn];
                    const wasQueen = p.type === 'queen';

                    // स्कोर हमेशा उस प्लेयर को मिलेगा जिसकी गोटी पॉकेट में गई है
                    if (p.type === playerPieces[0]) {
                        player1Score++;
                    } else if (p.type === playerPieces[1]) {
                        player2Score++;
                    }

                    if (wasMyPiece) {
                        turnPocketedCount++;
                        console.log(`Player ${turn + 1} pocketed their own piece. Score is now P1: ${player1Score}, P2: ${player2Score}. turnPocketedCount: ${turnPocketedCount}`);

                        // Handle covering the queen
                        if (queenNeedsCover && queenPocketedBy === turn) {
                            queenIsCovered = true;
                            queenNeedsCover = false;
                            console.log(`Player ${turn + 1} covered the queen!`);
                        }
                    } else if (wasQueen) {
                        if (!queenIsCovered) { // Can only pocket the queen once
                            turnPocketedCount++;
                            queenPocketedBy = turn;
                            queenNeedsCover = true;
                            console.log(`Queen pocketed by Player ${turn + 1}. Needs cover!`);
                        }
                    } else {
                        // It was the opponent's piece
                        const opponent = 1 - turn;
                        console.log(`Player ${turn + 1} pocketed a piece of Player ${opponent + 1}. Score awarded to Player ${opponent + 1}.`);
                    }

                    playSound('pocket');
                    updateScoreDisplay();
                    return false; // Remove piece
                }
            }
            return true; // Keep piece
        });
    }

    function updateScoreDisplay() {
        p1InfoEl.innerHTML = `${playerNames[0]}: <span id="player1Score">${player1Score}</span>`;
        p2InfoEl.innerHTML = `${playerNames[1]}: <span id="player2Score">${player2Score}</span>`;
        p1InfoEl.classList.toggle('active', turn === 0);
        p2InfoEl.classList.toggle('active', turn === 1);
    }

    function checkWinCondition() {
        if (gameState === 'gameOver') return;

        const whitePiecesOnBoard = pieces.filter(p => p.type === 'white').length;
        const blackPiecesOnBoard = pieces.filter(p => p.type === 'black').length;

        let winner = -1;

        // Player 1 (white) wins if they clear their pieces
        if (whitePiecesOnBoard === 0) {
            // Win is valid if queen is covered by them, or not pocketed by opponent
            if ((queenPocketedBy === 0 && queenIsCovered) || queenPocketedBy !== 1) {
                winner = 0;
            }
        }

        // Player 2 (black) wins if they clear their pieces
        if (blackPiecesOnBoard === 0) {
             // Win is valid if queen is covered by them, or not pocketed by opponent
            if ((queenPocketedBy === 1 && queenIsCovered) || queenPocketedBy !== 0) {
                winner = 1;
            }
        }
        
        if (winner !== -1) {
            gameState = 'gameOver';
            showGameOver(winner);
        }
    }

    function showGameOver(winnerIndex) {
        const loserIndex = 1 - winnerIndex;
        const loserPieceType = playerPieces[loserIndex];
        const loserPiecesLeft = pieces.filter(p => p.type === loserPieceType).length;
        const finalScore = loserPiecesLeft + (queenPocketedBy === winnerIndex && queenIsCovered ? 5 : 0);
        winnerText.textContent = `${playerNames[winnerIndex]} Wins!`;
        winnerScore.textContent = `Final Score: ${finalScore}`;
        gameOverOverlay.style.display = 'flex';
        localStorage.removeItem(GAME_SAVE_KEY);
    }

    function endTurn() {
        const continueTurn = turnPocketedCount > 0 && !foulCommitted;

        // Check for queen cover failure. This is a foul that ends the turn.
        // It happens if the player needed to cover the queen but didn't pocket any of their own pieces.
        if (queenNeedsCover && queenPocketedBy === turn && !continueTurn) {
            console.log(`Player ${turn + 1} failed to cover the queen. Returning it to the board.`);
            // Return queen logic...
            const queenIndex = pocketedPieces.findIndex(p => p.type === 'queen');
            if (queenIndex > -1) {
                const queen = pocketedPieces.splice(queenIndex, 1)[0];
                queen.x = canvas.width / 2;
                queen.y = canvas.height / 2;
                queen.vx = 0; queen.vy = 0; // Fixed typo here
                pieces.push(queen);
            }
            queenNeedsCover = false;
            queenPocketedBy = -1;
        }

        checkWinCondition();
        if (gameState === 'gameOver') return;

        if (continueTurn) {
            // Player pocketed a piece, so they get another turn. The 'turn' variable is NOT changed.
            console.log(`Player ${turn + 1} gets another turn.`);
            turnMessage = "Extra Turn!";
            turnMessageOpacity = 1.0;
        } else {
            turn = 1 - turn; // Switch turn
            console.log(`Player ${turn + 1}'s turn.`);
            if (foulCommitted) {
                turnMessage = `Foul! ${playerNames[turn]}'s Turn`;
            } else {
                turnMessage = `${playerNames[turn]}'s Turn`;
            }
            turnMessageOpacity = 1.0;
            updateScoreDisplay(); // Fix: Update UI immediately when turn changes
        }

        // If it's now AI's turn, trigger AI logic
        if (playerTypes[turn] === 'ai' && gameState === 'aiming') {
            console.log("Triggering AI turn for player " + (turn + 1));
            setTimeout(playAITurn, 1500); // AI takes a moment to "think"
        }
        turnPocketedCount = 0; // Reset for next turn
        foulCommitted = false;
        resetStriker();
    }

    function playAITurn() {
        if (gameState !== 'aiming') return; // Ensure AI only plays when aiming
        console.log("AI is thinking...");

        let aiPieces = pieces.filter(p => p.type === playerPieces[turn]);
        const queenPiece = pieces.find(p => p.type === 'queen');

        const playingAreaMargin = BOARD_SIZE / 12;
        const pocketPositions = [
            { x: playingAreaMargin, y: playingAreaMargin },
            { x: canvas.width - playingAreaMargin, y: playingAreaMargin },
            { x: playingAreaMargin, y: canvas.height - playingAreaMargin },
            { x: canvas.width - playingAreaMargin, y: canvas.height - playingAreaMargin }
        ];

        let bestShot = null;
        let bestScore = -Infinity; // Higher score is better

        if (!queenNeedsCover || queenPocketedBy !== turn) {
            if (queenPiece && !queenIsCovered) {
                aiPieces.push(queenPiece);
            }
        }

        // Helper to check if the path is clear (Collision detection)
        function pointLineDistance(px, py, x1, y1, x2, y2) {
            const A = px - x1; const B = py - y1;
            const C = x2 - x1; const D = y2 - y1;
            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            if (lenSq !== 0) param = dot / lenSq;
            let xx, yy;
            if (param < 0) { xx = x1; yy = y1; }
            else if (param > 1) { xx = x2; yy = y2; }
            else { xx = x1 + param * C; yy = y1 + param * D; }
            const dx = px - xx; const dy = py - yy;
            return Math.hypot(dx, dy);
        }

        function isPathClear(x1, y1, x2, y2, radius, ignorePiece) {
            for (let p of pieces) {
                if (p === ignorePiece) continue;
                // Check if any piece is intersecting the line. (0.95 factor allows tight but possible shots)
                if (pointLineDistance(p.x, p.y, x1, y1, x2, y2) < (radius + p.r) * 0.95) {
                    return false;
                }
            }
            return true;
        }

        aiPieces.forEach(aiPiece => {
            pocketPositions.forEach(pocket => {
                // Calculate the vector from the AI piece to the pocket
                const targetToPocketDx = pocket.x - aiPiece.x;
                const targetToPocketDy = pocket.y - aiPiece.y;
                const angleTargetToPocket = Math.atan2(targetToPocketDy, targetToPocketDx);

                // Calculate the ideal striker position to hit the AI piece towards the pocket
                const idealStrikerX = aiPiece.x - (STRIKER_RADIUS + PIECE_RADIUS) * Math.cos(angleTargetToPocket);
                const idealStrikerY = aiPiece.y - (STRIKER_RADIUS + PIECE_RADIUS) * Math.sin(angleTargetToPocket);

                // Check if this ideal striker position is on the AI's striker line (top)
                const strikerLineY = turn === 0 ? canvas.height - (BOARD_SIZE / 8.5) : BOARD_SIZE / 8.5;
                const minStrikerX = playingAreaMargin + STRIKER_RADIUS;
                const maxStrikerX = canvas.width - playingAreaMargin - STRIKER_RADIUS;

                // If the ideal striker position is roughly on the line and within bounds
                if (Math.abs(idealStrikerY - strikerLineY) < STRIKER_RADIUS * 2 &&
                    idealStrikerX >= minStrikerX && idealStrikerX <= maxStrikerX) {

                    // Check if path is clear for the striker to hit the piece, and piece to pocket
                    const isStrikerPathClear = isPathClear(idealStrikerX, strikerLineY, aiPiece.x, aiPiece.y, STRIKER_RADIUS, aiPiece);
                    const isPiecePathClear = isPathClear(aiPiece.x, aiPiece.y, pocket.x, pocket.y, PIECE_RADIUS, aiPiece);

                    if (isStrikerPathClear && isPiecePathClear) {
                        const dist = Math.hypot(aiPiece.x - pocket.x, aiPiece.y - pocket.y);
                        let currentShotScore = 1000 / (dist + 1);

                        if (aiPiece.type === 'queen') currentShotScore *= 2.5;

                        if (currentShotScore > bestScore) {
                            bestScore = currentShotScore;
                            bestShot = {
                                strikerX: idealStrikerX,
                                strikerY: strikerLineY,
                                targetPiece: aiPiece,
                                pocket: pocket,
                                angle: angleTargetToPocket
                            };
                        }
                    }
                }
            });
        });

        let targetStrikerX = canvas.width / 2;
        let shotAction = null;

        if (bestShot) {
            targetStrikerX = bestShot.strikerX;
            
            shotAction = () => {
                const strikerToTargetDx = bestShot.targetPiece.x - striker.x;
                const strikerToTargetDy = bestShot.targetPiece.y - striker.y;
                const angleStrikerToTarget = Math.atan2(strikerToTargetDy, strikerToTargetDx);

                mouse.dragStart = { x: striker.x, y: striker.y };
                const aiShotVelocityMagnitude = MAX_POWER * 0.85;
                const dragMagnitude = aiShotVelocityMagnitude * 6;

                const simulatedMouseEnd = {
                    x: striker.x + dragMagnitude * Math.cos(angleStrikerToTarget),
                    y: striker.y + dragMagnitude * Math.sin(angleStrikerToTarget)
                };

                aimingLine.startX = striker.x;
                aimingLine.startY = striker.y;
                const dragX = simulatedMouseEnd.x - mouse.dragStart.x;
                const dragY = simulatedMouseEnd.y - mouse.dragStart.y;
                if (turn === 0) {
                    aimingLine.endX = striker.x - dragX; aimingLine.endY = striker.y - dragY;
                } else {
                    aimingLine.endX = striker.x + dragX; aimingLine.endY = striker.y + dragY;
                }
                aimingLine.visible = true;

                setTimeout(() => {
                    aimingLine.visible = false;
                    const dx = simulatedMouseEnd.x - mouse.dragStart.x;
                    const dy = simulatedMouseEnd.y - mouse.dragStart.y;
                    const power = Math.min(Math.hypot(dx, dy) / 6, MAX_POWER);
                    let shotAngle = Math.atan2(dy, dx);

                    // --- Difficulty Logic (Aim Error) ---
                    let errorMargin = 0;
                    if (aiDifficulty === 'normal') errorMargin = (Math.random() - 0.5) * 0.05; // High Error
                    else if (aiDifficulty === 'medium') errorMargin = (Math.random() - 0.5) * 0.02; // Moderate Error
                    else if (aiDifficulty === 'hard') errorMargin = (Math.random() - 0.5) * 0.005; // Minor Error
                    // expert = 0 error
                    
                    shotAngle += errorMargin;

                    if (turn === 0) {
                        striker.vx = -power * Math.cos(shotAngle);
                        striker.vy = -power * Math.sin(shotAngle);
                    } else {
                        striker.vx = power * Math.cos(shotAngle);
                        striker.vy = power * Math.sin(shotAngle);
                    }

                    gameState = 'simulating';
                    playSound('strike');
                }, 800);
            };
        } else {
            console.log("AI: No clear shot found. Attempting to break the cluster.");
            const center = { x: canvas.width / 2, y: canvas.height / 2 };
            let breakTarget = null;
            let minDistance = Infinity;
            pieces.forEach(p => {
                const dist = Math.hypot(p.x - center.x, p.y - center.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    breakTarget = p;
                }
            });

            // Randomize striker position slightly for a more human-like break
            const minStrikerX = playingAreaMargin + STRIKER_RADIUS;
            const maxStrikerX = canvas.width - playingAreaMargin - STRIKER_RADIUS;
            targetStrikerX = (canvas.width / 2) + (Math.random() - 0.5) * (BOARD_SIZE / 3);
            targetStrikerX = Math.max(minStrikerX, Math.min(targetStrikerX, maxStrikerX));

            shotAction = () => {
                const angleToTarget = breakTarget ? Math.atan2(breakTarget.y - striker.y, breakTarget.x - striker.x) : Math.PI / 2;
                const breakPower = MAX_POWER * 0.75;

                mouse.dragStart = { x: striker.x, y: striker.y };
                const dragMagnitude = breakPower * 6;

                const simulatedMouseEnd = {
                    x: striker.x + dragMagnitude * Math.cos(angleToTarget),
                    y: striker.y + dragMagnitude * Math.sin(angleToTarget)
                };

                aimingLine.startX = striker.x;
                aimingLine.startY = striker.y;
                const dragX = simulatedMouseEnd.x - mouse.dragStart.x;
                const dragY = simulatedMouseEnd.y - mouse.dragStart.y;
                if (turn === 0) {
                    aimingLine.endX = striker.x - dragX; aimingLine.endY = striker.y - dragY;
                } else {
                    aimingLine.endX = striker.x + dragX; aimingLine.endY = striker.y + dragY;
                }
                aimingLine.visible = true;

                setTimeout(() => {
                    aimingLine.visible = false;
                    const dx = simulatedMouseEnd.x - mouse.dragStart.x;
                    const dy = simulatedMouseEnd.y - mouse.dragStart.y;
                    const power = Math.min(Math.hypot(dx, dy) / 6, MAX_POWER);
                    let shotAngle = Math.atan2(dy, dx);

                    // --- Difficulty Logic (Aim Error) ---
                    let errorMargin = 0;
                    if (aiDifficulty === 'normal') errorMargin = (Math.random() - 0.5) * 0.05;
                    else if (aiDifficulty === 'medium') errorMargin = (Math.random() - 0.5) * 0.02;
                    else if (aiDifficulty === 'hard') errorMargin = (Math.random() - 0.5) * 0.005;
                    
                    shotAngle += errorMargin;

                    if (turn === 0) {
                        striker.vx = -power * Math.cos(shotAngle);
                        striker.vy = -power * Math.sin(shotAngle);
                    } else {
                        striker.vx = power * Math.cos(shotAngle);
                        striker.vy = power * Math.sin(shotAngle);
                    }

                    gameState = 'simulating';
                    playSound('strike');
                }, 800);
            };
        }

        // Animate the striker movement before shooting
        const startX = striker.x;
        const distance = targetStrikerX - startX;
        const duration = 500; // ms to slide striker
        const startTime = performance.now();

        function animateStriker(currentTime) {
            if (gameState !== 'aiming') return;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
            
            striker.x = startX + distance * ease;

            if (progress < 1) {
                requestAnimationFrame(animateStriker);
            } else {
                striker.x = targetStrikerX;
                shotAction();
            }
        }
        requestAnimationFrame(animateStriker);
    }

    function resetStriker() {
        striker.x = canvas.width / 2;
        striker.y = turn === 0 ? canvas.height - (BOARD_SIZE / 8.5) : (BOARD_SIZE / 8.5);
        striker.vx = 0; striker.vy = 0;
    }

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    // --- Input Handlers ---
    canvas.addEventListener('mousedown', (e) => {
        if (gameState !== 'aiming') return;
        if (playerTypes[turn] === 'human') initAudio();
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        
        // Allow player to move striker along the line before aiming
        const playingAreaMargin = BOARD_SIZE / 12;
        const strikerLineY = turn === 0 ? canvas.height - (BOARD_SIZE / 8.5) : (BOARD_SIZE / 8.5);
        striker.x = Math.max(playingAreaMargin + STRIKER_RADIUS, Math.min(mouse.x, canvas.width - playingAreaMargin - STRIKER_RADIUS));
        striker.y = strikerLineY;
        
        if (playerTypes[turn] === 'human' && Math.hypot(mouse.x - striker.x, mouse.y - striker.y) < striker.r) {
            mouse.isDown = true;
            mouse.dragStart = { x: mouse.x, y: mouse.y };
            aimingLine.visible = true;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!mouse.isDown || gameState !== 'aiming') return;
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;

        aimingLine.startX = striker.x;
        aimingLine.startY = striker.y;
        // Invert aiming line based on player turn
        if (turn === 0) { // Player 1 at bottom
            aimingLine.endX = striker.x - (mouse.x - mouse.dragStart.x);
            aimingLine.endY = striker.y - (mouse.y - mouse.dragStart.y);
        } else { // Player 2 at top
            aimingLine.endX = striker.x + (mouse.x - mouse.dragStart.x);
            aimingLine.endY = striker.y + (mouse.y - mouse.dragStart.y);
        }
    });

    canvas.addEventListener('mouseup', () => {
        if (!mouse.isDown || gameState !== 'aiming' || playerTypes[turn] !== 'human') return;
        mouse.isDown = false;
        aimingLine.visible = false;

        const dx = mouse.x - mouse.dragStart.x;
        const dy = mouse.y - mouse.dragStart.y;
        const power = Math.min(Math.hypot(dx, dy) / 6, MAX_POWER); // Adjust power scaling for more sensitivity
        const angle = Math.atan2(dy, dx);

        if (turn === 0) { // Player 1 at bottom, shoots up
            striker.vx = -power * Math.cos(angle);
            striker.vy = -power * Math.sin(angle);
        } else { // Player 2 at top, shoots down
            striker.vx = power * Math.cos(angle);
            striker.vy = power * Math.sin(angle);
        }
        
        gameState = 'simulating';
        playSound('strike');
    });

    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        canvas.dispatchEvent(new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        }));
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        canvas.dispatchEvent(new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        }));
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        canvas.dispatchEvent(new MouseEvent('mouseup', {}));
    }, { passive: false });

    restartBtn.addEventListener('click', () => {
        localStorage.removeItem(GAME_SAVE_KEY);
        initGame(true);
    });

    playAgainBtn.addEventListener('click', () => {
        gameOverOverlay.style.display = 'none';
        setupContainer.style.display = 'flex';
        gameContainer.style.display = 'none';
        seoArticle.style.display = 'none';
        // गेम खत्म हो गया है, इसलिए सेव की गई फ़ाइल हटा दी गई है। रिज्यूम बटन को छिपा दें।
        resumeGameBtn.style.display = 'none';
        startGameBtn.textContent = 'Start Game';
        // The startGameBtn listener will handle re-initialization
    });

    modeSelect.addEventListener('change', () => {
        const difficultySetup = document.getElementById('difficultySetup');
        if (modeSelect.value === 'p_vs_ai') {
            p2NameInput.value = 'Computer';
            p2NameInput.disabled = false;
            p1NameInput.disabled = false;
            if (difficultySetup) difficultySetup.style.display = 'flex';
        } else if (modeSelect.value === 'pvp') {
            p2NameInput.value = 'Player 2';
            p2NameInput.disabled = false;
            p1NameInput.disabled = false;
            if (difficultySetup) difficultySetup.style.display = 'none';
        } else { // ai_vs_ai
            p1NameInput.value = 'AI 1';
            p2NameInput.value = 'AI 2';
            p1NameInput.disabled = true;
            p2NameInput.disabled = true;
            if (difficultySetup) difficultySetup.style.display = 'flex';
        }
    });

    startGameBtn.addEventListener('click', () => {
        if (localStorage.getItem(GAME_SAVE_KEY)) {
            if (!confirm("This will erase your saved game. Are you sure you want to start a new game?")) {
                return;
            }
            localStorage.removeItem(GAME_SAVE_KEY);
        }

        setupContainer.style.display = 'none';
        gameContainer.style.display = 'flex';
        seoArticle.style.display = 'block';

        const mode = modeSelect.value;
        if (mode === 'p_vs_ai') playerTypes = ['human', 'ai'];
        else if (mode === 'pvp') playerTypes = ['human', 'human'];
        else playerTypes = ['ai', 'ai'];

        if (difficultySelect) {
            aiDifficulty = difficultySelect.value;
        }

        playerNames[0] = p1NameInput.value;
        playerNames[1] = p2NameInput.value;

        initGame(true);
    });

    // Check for saved game on page load
    if (localStorage.getItem(GAME_SAVE_KEY)) {
        resumeGameBtn.style.display = 'block';
        startGameBtn.textContent = 'Start New Game';
    }

    resumeGameBtn.addEventListener('click', () => {
        setupContainer.style.display = 'none';
        gameContainer.style.display = 'flex';
        seoArticle.style.display = 'block';
        initGame(false); // Load the saved game
    });

    window.addEventListener('resize', () => {
        BOARD_SIZE = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.7, 600);
        initGame(false); // Re-init without forcing new game to reload with new size
    });
});