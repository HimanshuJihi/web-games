document.addEventListener('DOMContentLoaded', () => {
    // 1. HTML Elements ko JS se jodna
    const canvas = document.getElementById('ludoCanvas');
    const ctx = canvas.getContext('2d');
    const rollDiceBtn = document.getElementById('rollDiceBtn');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const winnerText = document.getElementById('winnerText');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const pauseOverlay = document.getElementById('pauseOverlay');
    const setupOverlay = document.getElementById('setupOverlay');
    const gameContainer = document.querySelector('.game-container');
    const startGameBtn = document.getElementById('startGameBtn');
    const resumeGameBtn = document.getElementById('resumeGameBtn');
    const resumeGameSeparator = document.getElementById('resumeGameSeparator');
    const openSetupBtn = document.getElementById('openSetupBtn');

    // Setup screen elements
    const playerSetups = [
        { active: document.getElementById('p1_active'), type: document.getElementById('p1_type'), name: document.getElementById('p1_name') },
        { active: document.getElementById('p2_active'), type: document.getElementById('p2_type'), name: document.getElementById('p2_name') },
        { active: document.getElementById('p3_active'), type: document.getElementById('p3_type'), name: document.getElementById('p3_name') },
        { active: document.getElementById('p4_active'), type: document.getElementById('p4_type'), name: document.getElementById('p4_name') }
    ];
    // --- Milestone 5: Game Rules & Turn Management ---
    const track = []; // Main 52 squares
    const homePaths = { red: [], blue: [], yellow: [], green: [] };
    const playerStartPositions = [0, 13, 39, 26]; // Corrected order for [Red, Blue, Yellow, Green]
    const playerHomeEntryPositions = [51, 12, 38, 25]; // Corrected order for [Red, Blue, Yellow, Green]
    const safeSpots = [0, 8, 13, 21, 26, 34, 39, 47]; // Indices on 'track' that are safe

    // 2. Game ke mukhya variables
    let gameState = 'waiting'; // 'waiting', 'rolling', 'moving'
    let turn = 0; // 0 for Player 1, 1 for Player 2, etc.
    let diceValue = 0;
    let movablePieces = []; // Stores indices of pieces that can move
    let animations = [];
    let particles = [];
    let isPaused = false;
    let audioCtx = null;
    const GAME_SAVE_KEY = 'ludoGameSave';
    
    const COLORS = {
        RED: '#e74c3c',
        GREEN: '#2ecc71',
        YELLOW: '#f1c40f',
        BLUE: '#3498db',
        WHITE: '#ecf0f1',
        BLACK: '#000000'
    };

    // Helper function to adjust color brightness for 3D effects
    const adjustColor = (hex, percent) => {
        const num = parseInt(hex.slice(1), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
    };

    // Player data structure (placeholder)
    const players = [
        { id: 0, name: "Player 1", color: "red", pieces: [], type: 'human', active: true },
        { id: 1, name: "Player 2", color: "blue", pieces: [], type: 'ai', active: true },
        { id: 2, name: "Player 3", color: "yellow", pieces: [], type: 'ai', active: true },
        { id: 3, name: "Player 4", color: "green", pieces: [], type: 'ai', active: true }
    ];

    // --- Milestone 4: Core Game Logic (Dice Roll & Moves) ---

    function getPossibleMoves(playerIndex, roll) {
        const possibleMoves = [];
        const playerPieces = players[playerIndex].pieces;

        playerPieces.forEach((piece, pieceIndex) => {
            // A piece that has finished cannot move
            if (piece.state === 'finished') return;

            // A piece at home can only move out on a 6
            if (piece.state === 'home') {
                if (roll === 6) {
                    const startPos = playerStartPositions[playerIndex];
                    // Check if start position is blocked by own pieces (more than 1 piece)
                    const ownPiecesAtStart = playerPieces.filter(p => p.state === 'track' && p.trackPosition === startPos).length;
                    if (ownPiecesAtStart >= 2) {
                        return; // Cannot move out, start is blocked by own pieces
                    }
                    possibleMoves.push({ pieceIndex, type: 'move_out' });
                }
            } 
            // A piece on the main track
            else if (piece.state === 'track') {
                const homeEntry = playerHomeEntryPositions[playerIndex];
                const stepsToHomeEntry = (homeEntry - piece.trackPosition + 52) % 52;

                // If the move will enter the home path, it's always valid (no blockades in home path entry)
                if (roll > stepsToHomeEntry) {
                     possibleMoves.push({ pieceIndex, type: 'move_on_track' });
                     return;
                }

                const destPos = (piece.trackPosition + roll) % 52;

                // Check for blockades of own pieces at destination
                const ownPiecesAtDest = playerPieces.filter(p => p.state === 'track' && p.trackPosition === destPos).length;
                if (ownPiecesAtDest >= 2) {
                    return; // Cannot move, destination is blocked by own pieces
                }

                // Check for blockades of opponent pieces, but only if it's not a safe spot
                if (!safeSpots.includes(destPos)) {
                    for (const p of players) {
                        if (p.id === playerIndex) continue;
                        const opponentPiecesAtDest = p.pieces.filter(op => op.state === 'track' && op.trackPosition === destPos).length;
                        if (opponentPiecesAtDest >= 2) {
                            return; // Cannot move, destination is blocked by opponent pieces
                        }
                    }
                }
                possibleMoves.push({ pieceIndex, type: 'move_on_track' });
            } 
            // A piece in the home path can move if it doesn't overshoot
            else if (piece.state === 'homePath') {
                if (piece.homePathPosition + roll <= 5) { // 5 is the final 'finished' spot
                     possibleMoves.push({ pieceIndex, type: 'move_on_homepath' });
                }
            }
        });

        return possibleMoves;
    }

    function nextTurn() {
        // Switch turn to the next active player
        do {
            turn = (turn + 1) % players.length;
        } while (!players[turn].active);
        
        gameState = 'waiting';
        movablePieces = []; // Clear highlights for the next turn. This is now an array of objects.
        console.log(`It's now Player ${turn + 1}'s turn.`);
        saveGame();

        if (players[turn].type === 'ai') {
            rollDiceBtn.disabled = true;
            setTimeout(playAITurn, 1500); // AI "thinks" for 1.5s
        } else {
            rollDiceBtn.disabled = false;
        }
    }

    // --- Milestone 7: Finishing Touches ---

    function initAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playSound(type) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain).connect(audioCtx.destination);

        if (type === 'roll') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start(); osc.stop(audioCtx.currentTime + 0.15);
        } else if (type === 'move') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'capture' || type === 'home') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start(); osc.stop(audioCtx.currentTime + 0.2);
        } else if (type === 'win') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, audioCtx.currentTime); // C5
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);
            osc.start(); osc.stop(audioCtx.currentTime + 1.0);
        }
    }

    function saveGame() {
        if (gameState === 'gameOver') return;
        const stateToSave = {
            players: players,
            turn: turn,
            gameState: gameState,
            diceValue: diceValue,
            movablePieces: movablePieces
        };
        localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(stateToSave));
    }

    function loadGame() {
        const savedState = localStorage.getItem(GAME_SAVE_KEY);
        if (!savedState) return false;

        try {
            const state = JSON.parse(savedState);
            if (!state.players || typeof state.turn === 'undefined') return false;

            players.forEach((player, index) => {
                player.pieces = state.players[index].pieces;
                player.active = state.players[index].active !== undefined ? state.players[index].active : (player.pieces.length > 0);
            });
            turn = state.turn;
            gameState = state.gameState;
            diceValue = state.diceValue;
            movablePieces = state.movablePieces;
            
            console.log("Game loaded from localStorage.");
            return true;
        } catch (e) {
            console.error("Failed to load game:", e);
            localStorage.removeItem(GAME_SAVE_KEY);
            return false;
        }
    }

    function drawDiceOnBoard() {
        const valueToDraw = diceValue || 6; 
        const diceSize = CELL_SIZE * 1.5;
        const padding = diceSize * 0.1;
        const faceSize = diceSize - padding * 2;
        
        let diceX, diceY;
        
        // डाइस को उस खिलाड़ी के घर के खाली कोने में रखें
        switch(turn) {
            case 0: diceX = CELL_SIZE * 0.5; diceY = CELL_SIZE * 0.5; break; // Red
            case 1: diceX = canvas.width - HOME_AREA_SIZE + CELL_SIZE * 0.5; diceY = CELL_SIZE * 0.5; break; // Blue
            case 2: diceX = CELL_SIZE * 0.5; diceY = canvas.height - HOME_AREA_SIZE + CELL_SIZE * 0.5; break; // Yellow
            case 3: diceX = canvas.width - HOME_AREA_SIZE + CELL_SIZE * 0.5; diceY = canvas.height - HOME_AREA_SIZE + CELL_SIZE * 0.5; break; // Green
        }

        ctx.save();
        ctx.translate(diceX, diceY);

        // खिलाड़ी की बारी के लिए ग्लो इफ़ेक्ट (Pulsating Glow)
        if (gameState === 'waiting' && players[turn].type !== 'ai') {
            const highlightGlow = (Math.sin(Date.now() / 150) + 1) / 2;
            ctx.shadowColor = `rgba(255, 223, 0, ${0.5 + highlightGlow * 0.5})`;
            ctx.shadowBlur = 15;
        }

        ctx.fillStyle = adjustColor(COLORS.WHITE, -30);
        ctx.fillRect(padding, padding, faceSize, faceSize);

        const grad = ctx.createLinearGradient(0, 0, faceSize, faceSize);
        grad.addColorStop(0, adjustColor(COLORS.WHITE, 10));
        grad.addColorStop(1, adjustColor(COLORS.WHITE, -10));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, faceSize, faceSize);

        ctx.shadowBlur = 0; // Reset shadow

        ctx.strokeStyle = adjustColor(COLORS.WHITE, -40);
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, faceSize, faceSize);

        const dotRadius = faceSize / 10;
        const dotPositions = {
            1: [[0.5, 0.5]],
            2: [[0.25, 0.25], [0.75, 0.75]],
            3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
            4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
            5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
            6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]]
        };

        ctx.fillStyle = COLORS.BLACK;
        if (dotPositions[valueToDraw]) {
            dotPositions[valueToDraw].forEach(pos => {
                ctx.beginPath();
                ctx.arc(pos[0] * faceSize, pos[1] * faceSize, dotRadius, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        ctx.restore();
    }


    function handleDiceRoll() {
        // सिर्फ 'waiting' स्टेट में ही डाइस रोल करने दें
        if (gameState !== 'waiting') return;

        gameState = 'rolling';
        playSound('roll');
        rollDiceBtn.disabled = true;

        let rollCount = 0;
        const maxRolls = 15; // Animation फ्रेम्स की संख्या

        const rollInterval = setInterval(() => {
            diceValue = Math.floor(Math.random() * 6) + 1;
            rollCount++;

            if (rollCount >= maxRolls) {
                clearInterval(rollInterval);
                console.log(`Player ${turn + 1} rolled a ${diceValue}`);

                const moves = getPossibleMoves(turn, diceValue);

                if (moves.length === 0) {
                    console.log("No possible moves. Switching to next player.");
                    setTimeout(nextTurn, 1000); // Wait a second before switching turn
                } else {
                    if (players[turn].type === 'ai') {
                        const bestMove = chooseAIMove(moves, diceValue);
                        console.log(`AI chose to move piece ${bestMove.pieceIndex}`);
                        setTimeout(() => movePiece(bestMove), 1000); // AI "selects" piece after 1 sec
                    } else {
                        // Human player's turn
                        gameState = 'moving';
                        movablePieces = moves; // Store the full move objects
                    }
                }
            }
        }, 80); // Animation के लिए 80ms का इंटरवल
    }

    function handleCapture(movedPiece) {
        if (movedPiece.state !== 'track' || safeSpots.includes(movedPiece.trackPosition)) {
            return null; // No captures in home path or on safe spots
        }

        // With the new getPossibleMoves, we are sure we won't land on a blockade.
        // We just need to find the single opponent piece, if any.
        for (const player of players) {
            if (player.id === turn) continue; // Can't capture your own pieces

            const pieceToCapture = player.pieces.find(p => p.state === 'track' && p.trackPosition === movedPiece.trackPosition);
            
            if (pieceToCapture) {
                console.log(`Player ${turn + 1} captured a piece from Player ${player.id + 1}!`);
                pieceToCapture.state = 'home';
                pieceToCapture.trackPosition = -1;
                pieceToCapture.homePathPosition = -1;
                return pieceToCapture; // Return the captured piece
            }
        }
        return null; // No piece was captured
    }

    function handlePostMove(piece) {
        const capturedPiece = handleCapture(piece);
        const finished = piece.state === 'finished';
        const rolledSix = diceValue === 6;

        if (finished) {
            playSound('home');
            if (checkWinCondition()) {
                return; // Game over, stop here
            }
        }

        const proceedWithNextTurn = () => {
            if (capturedPiece || finished || rolledSix) {
                gameState = 'waiting'; // Player gets another turn
                movablePieces = [];
                console.log("Player gets another turn.");
                if (players[turn].type === 'ai') {
                    rollDiceBtn.disabled = true;
                    setTimeout(playAITurn, 1500);
                } else {
                    rollDiceBtn.disabled = false;
                }
            } else {
                nextTurn();
            }
            saveGame();
        };

        // Ludo King style capture animation (flying back to home)
        if (capturedPiece) {
            gameState = 'animating'; // Keep blocking input
            playSound('capture');
            
            const homeCoords = {
                x: PIECE_HOME_POSITIONS[capturedPiece.player][capturedPiece.id].x * CELL_SIZE,
                y: PIECE_HOME_POSITIONS[capturedPiece.player][capturedPiece.id].y * CELL_SIZE
            };

            animations.push({
                piece: capturedPiece,
                startCoords: { x: capturedPiece.x, y: capturedPiece.y },
                endCoords: homeCoords,
                progress: 0,
                duration: 400, // 400ms fly back animation
                onComplete: () => {
                    proceedWithNextTurn();
                }
            });
        } else {
            proceedWithNextTurn();
        }
    }

    function movePiece(move) {
        gameState = 'animating'; // Block input during animation
        movablePieces = [];

        const piece = players[turn].pieces[move.pieceIndex];
        const startCoords = { x: piece.x, y: piece.y };

        // Create a temporary piece to calculate the destination without modifying the original yet
        const tempPiece = JSON.parse(JSON.stringify(piece));

        if (move.type === 'move_out') {
            tempPiece.state = 'track';
            tempPiece.trackPosition = playerStartPositions[turn];
        } else if (move.type === 'move_on_track') {
            const homeEntry = playerHomeEntryPositions[turn];
            const stepsToHomeEntry = (homeEntry - tempPiece.trackPosition + 52) % 52;

            if (diceValue > stepsToHomeEntry) {
                tempPiece.state = 'homePath';
                tempPiece.homePathPosition = diceValue - stepsToHomeEntry - 1;
            } else {
                tempPiece.trackPosition = (tempPiece.trackPosition + diceValue) % 52;
            }
        } else if (move.type === 'move_on_homepath') {
            tempPiece.homePathPosition += diceValue;
        }

        if (tempPiece.homePathPosition >= 5) {
            tempPiece.state = 'finished';
        }

        const endCoords = getPiecePixelCoords(tempPiece);

        animations.push({
            piece: piece,
            startCoords: startCoords,
            endCoords: endCoords,
            progress: 0,
            duration: 400, // 400ms animation
            onComplete: () => {
                // BUG FIX: Don't use Object.assign, as it overwrites the animated x/y with old values.
                // Manually update only the logical state.
                piece.state = tempPiece.state;
                piece.trackPosition = tempPiece.trackPosition;
                piece.homePathPosition = tempPiece.homePathPosition;
                handlePostMove(piece);
            }
        });

        playSound('move');
    }

    // --- Milestone 6: AI Opponent ---

    function playAITurn() {
        if (gameState !== 'waiting') return;
        console.log(`AI Player ${turn + 1} is playing...`);
        handleDiceRoll();
    }

    function chooseAIMove(possibleMoves, roll) {
        let bestMove = null;
        let bestScore = -1;

        for (const move of possibleMoves) {
            let currentScore = 0;
            const piece = players[turn].pieces[move.pieceIndex];

            // 1. Priority to move out of home on a 6
            if (move.type === 'move_out') {
                const startPos = playerStartPositions[turn];
                const isBlocked = players[turn].pieces.some(p => p.trackPosition === startPos);
                currentScore = isBlocked ? 5 : 100; // Lower score if start is blocked by own piece
            } 
            // Highest priority: finishing a piece
            else if (move.type === 'move_on_homepath' && piece.homePathPosition + roll >= 5) {
                currentScore = 300;
            }
            else if (move.type === 'move_on_track') {
                const homeEntry = playerHomeEntryPositions[turn];
                const stepsToHomeEntry = (homeEntry - piece.trackPosition + 52) % 52;
                
                // Check if move will finish the piece
                if (roll > stepsToHomeEntry && (roll - stepsToHomeEntry - 1) >= 5) {
                    currentScore = 300; // Finishes the piece
                } else {
                    const destPos = (piece.trackPosition + roll) % 52;
                    
                    // 2. Priority to capture
                    let willCapture = false;
                    if (!safeSpots.includes(destPos)) {
                        for (const player of players) {
                            if (player.id === turn) continue;
                            const opponentPiecesAtDest = player.pieces.filter(p => p.state === 'track' && p.trackPosition === destPos);
                            if (opponentPiecesAtDest.length === 1) {
                                willCapture = true;
                                break;
                            }
                        }
                    }
                    if (willCapture) {
                        currentScore = 200;
                    }
                    
                    // 4. Priority to land on a safe spot
                    if (currentScore === 0 && safeSpots.includes(destPos)) {
                        currentScore = 80;
                    }
                }
            }

            // Add base score for just moving forward
            if (currentScore === 0) {
                currentScore = 10 + (piece.trackPosition > -1 ? piece.trackPosition : 0);
            }

            if (currentScore > bestScore) {
                bestScore = currentScore;
                bestMove = move;
            }
        }
        
        return bestMove || possibleMoves[0];
    }

    function checkWinCondition() {
        const winner = players.find(p => p.active && p.pieces.length > 0 && p.pieces.every(piece => piece.state === 'finished'));
        if (winner) {
            gameState = 'gameOver';
            showGameOver(winner);
            playSound('win');
            localStorage.removeItem(GAME_SAVE_KEY);
            return true;
        }
        return false;
    }

    function showGameOver(winner) {
        winnerText.textContent = `${winner.name} Wins! 🎉`;
        gameOverOverlay.style.display = 'flex';
        
        // Big initial burst of fireworks matching winner's color
        for(let i=0; i<8; i++) {
            setTimeout(() => createFirework(COLORS[winner.color.toUpperCase()]), i * 300);
        }
    }

    function togglePause(forceState) {
        // If the game is over, don't allow pausing/unpausing
        if (gameState === 'gameOver') return;

        const shouldBePaused = typeof forceState === 'boolean' ? forceState : !isPaused;
        if (isPaused === shouldBePaused) return; // No change needed

        isPaused = shouldBePaused;
        pauseOverlay.style.display = isPaused ? 'flex' : 'none';
        if (isPaused) {
            pauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
            pauseBtn.classList.add('resume-btn');
        } else {
            pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
            pauseBtn.classList.remove('resume-btn');
        }
    }

    function syncAllPiecePositions() {
        players.forEach((player, playerIndex) => {
            player.pieces.forEach((piece, pieceIndex) => {
                // Ensure backward compatibility with older saves
                if (typeof piece.player === 'undefined') piece.player = playerIndex;
                if (typeof piece.id === 'undefined') piece.id = pieceIndex;

                const coords = getPiecePixelCoords(piece);
                if (coords && !isNaN(coords.x) && !isNaN(coords.y)) {
                    piece.x = coords.x;
                    piece.y = coords.y;
                } else {
                    // Fallback to home if coords are invalid to prevent disappearing pieces
                    piece.state = 'home';
                    piece.trackPosition = -1;
                    piece.homePathPosition = -1;
                    if (CELL_SIZE) {
                        piece.x = PIECE_HOME_POSITIONS[playerIndex][pieceIndex].x * CELL_SIZE;
                        piece.y = PIECE_HOME_POSITIONS[playerIndex][pieceIndex].y * CELL_SIZE;
                    }
                }
            });
        });
    }

    function setupCanvasAndRedraw() {
        // Read the size from the CSS-styled element
        const size = canvas.clientWidth;
        if (size === 0) return; // Prevent sizing errors when container is hidden
        
        // Set the drawing buffer size to match the display size
        canvas.width = size;
        canvas.height = size;

        // Recalculate all size-dependent variables
        CELL_SIZE = canvas.width / 15;
        HOME_AREA_SIZE = 6 * CELL_SIZE;
        PATH_WIDTH = 3 * CELL_SIZE;

        // Re-initialize paths and piece positions based on new sizes
        initializeBoardPaths();
        syncAllPiecePositions();
        
        // Redraw everything with new sizes
        draw();
    }

    function initGame(isNew) {
        gameOverOverlay.style.display = 'none';
        setupOverlay.style.display = 'none';
        gameContainer.style.display = 'flex';

        setupCanvasAndRedraw(); // Now the canvas has a size, setup the drawing dimensions

        if (isNew) {
            localStorage.removeItem(GAME_SAVE_KEY);
            initPieces();
            turn = 0;
            while (!players[turn].active) {
                turn = (turn + 1) % players.length;
            }
            gameState = 'waiting';
        } else {
            if (!loadGame()) {
                initPieces();
                turn = 0;
                gameState = 'waiting';
            }
        }

        syncAllPiecePositions();
        
        if (gameState === 'moving') {
            rollDiceBtn.disabled = true;
        } else {
            rollDiceBtn.disabled = false;
            if (players[turn].type === 'ai') {
                rollDiceBtn.disabled = true;
                setTimeout(playAITurn, 1500);
            }
        }
    }

    // --- Milestone 2: Board Rendering ---

    let CELL_SIZE;
    let HOME_AREA_SIZE;
    let PATH_WIDTH;

    const PIECE_HOME_POSITIONS = [
        [{ x: 2.5, y: 2.5 }, { x: 4.5, y: 2.5 }, { x: 2.5, y: 4.5 }, { x: 4.5, y: 4.5 }],
        [{ x: 10.5, y: 2.5 }, { x: 12.5, y: 2.5 }, { x: 10.5, y: 4.5 }, { x: 12.5, y: 4.5 }],
        [{ x: 2.5, y: 10.5 }, { x: 4.5, y: 10.5 }, { x: 2.5, y: 12.5 }, { x: 4.5, y: 12.5 }],
        [{ x: 10.5, y: 10.5 }, { x: 12.5, y: 10.5 }, { x: 10.5, y: 12.5 }, { x: 12.5, y: 12.5 }]
    ];

    // --- Milestone 3: Pieces & Dice Rendering ---

    // Function to convert grid (col, row) to pixel (x, y) center
    function getPixelCoords(col, row) {
        return {
            x: (col + 0.5) * CELL_SIZE,
            y: (row + 0.5) * CELL_SIZE
        };
    }

    function initializeBoardPaths() {
        track.length = 0;
        homePaths.red.length = 0; homePaths.blue.length = 0; homePaths.yellow.length = 0; homePaths.green.length = 0;

        // Correct 52-step main track generation
        // Red arm to Blue arm (13 squares)
        for (let col = 1; col <= 5; col++) track.push(getPixelCoords(col, 6)); // 0-4
        for (let row = 5; row >= 0; row--) track.push(getPixelCoords(6, row)); // 5-10
        track.push(getPixelCoords(7, 0)); // 11
        track.push(getPixelCoords(8, 0)); // 12

        // Blue arm to Green arm (13 squares)
        for (let row = 1; row <= 5; row++) track.push(getPixelCoords(8, row)); // 13-17
        for (let col = 9; col <= 14; col++) track.push(getPixelCoords(col, 6)); // 18-23
        track.push(getPixelCoords(14, 7)); // 24
        track.push(getPixelCoords(14, 8)); // 25

        // Green arm to Yellow arm (13 squares)
        for (let col = 13; col >= 9; col--) track.push(getPixelCoords(col, 8)); // 26-30
        for (let row = 9; row <= 14; row++) track.push(getPixelCoords(8, row)); // 31-36
        track.push(getPixelCoords(7, 14)); // 37
        track.push(getPixelCoords(6, 14)); // 38

        // Yellow arm to Red arm (13 squares)
        for (let row = 13; row >= 9; row--) track.push(getPixelCoords(6, row)); // 39-43
        for (let col = 5; col >= 0; col--) track.push(getPixelCoords(col, 8)); // 44-49
        track.push(getPixelCoords(0, 7)); // 50
        track.push(getPixelCoords(0, 6)); // 51

        // Correct Home Paths (5 squares each)
        for (let col = 1; col <= 5; col++) homePaths.red.push(getPixelCoords(col, 7));
        for (let row = 1; row <= 5; row++) homePaths.blue.push(getPixelCoords(7, row));
        for (let col = 13; col >= 9; col--) homePaths.green.push(getPixelCoords(col, 7));
        for (let row = 13; row >= 9; row--) homePaths.yellow.push(getPixelCoords(7, row));
    }

    function getPiecePixelCoords(piece) {
        if (piece.state === 'home') {
            return {
                x: PIECE_HOME_POSITIONS[piece.player][piece.id].x * CELL_SIZE,
                y: PIECE_HOME_POSITIONS[piece.player][piece.id].y * CELL_SIZE
            };
        } else if (piece.state === 'track') {
            return track[piece.trackPosition];
        } else if (piece.state === 'homePath') {
            const playerColor = players[piece.player].color;
            return homePaths[playerColor][piece.homePathPosition];
        } else if (piece.state === 'finished') {
            // For finished pieces, they might stack in the center or be removed
            // For now, let's place them slightly off-center in the middle
            return getPixelCoords(7.5, 7.5); // Center of the board
        }
        return { x: 0, y: 0 }; // Fallback
    }

    function initPieces() {
        players.forEach((player, playerIndex) => {
            player.pieces = []; // Clear any existing pieces
            if (!player.active) return; // Skip inactive players
            for (let i = 0; i < 4; i++) {
                player.pieces.push({
                    id: i,
                    player: playerIndex, // Add player ID to piece
                    state: 'home', // 'home', 'track', 'homePath', 'finished'
                    trackPosition: -1, // -1 if not on main track
                    homePathPosition: -1, // -1 if not in home path (0-5 for home path)
                    x: PIECE_HOME_POSITIONS[playerIndex][i].x * CELL_SIZE,
                    y: PIECE_HOME_POSITIONS[playerIndex][i].y * CELL_SIZE
                });
            }
        });
    }

    function drawPieces() {
        const PIECE_RADIUS = CELL_SIZE * 0.4;
        const playerColors = [COLORS.RED, COLORS.BLUE, COLORS.YELLOW, COLORS.GREEN];
        
        // Pulsating effect for highlights
        const highlightGlow = (Math.sin(Date.now() / 250) + 1) / 2; // Oscillates between 0 and 1

        players.forEach((player, playerIndex) => {
            const pieceColor = playerColors[playerIndex];

            player.pieces.forEach((piece, pieceIndex) => {
                if (isNaN(piece.x) || isNaN(piece.y)) return; // Prevent crashes if coordinates are invalid

                const coords = { x: piece.x, y: piece.y };

                // Drop Shadow for 3D effect
                ctx.beginPath();
                ctx.arc(coords.x + 2, coords.y + 2, PIECE_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fill();

                // Highlight movable pieces for the current player by checking the pieceIndex in the move objects
                if (gameState === 'moving' && playerIndex === turn && movablePieces.some(m => m.pieceIndex === pieceIndex)) {
                    ctx.beginPath();
                    ctx.arc(coords.x, coords.y, PIECE_RADIUS + 5, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 223, 0, ${0.5 + highlightGlow * 0.4})`; // Pulsating yellow glow
                    ctx.fill();
                }

                // 3D Gradient for the piece
                const gradient = ctx.createRadialGradient(
                    coords.x - PIECE_RADIUS * 0.3, coords.y - PIECE_RADIUS * 0.3, PIECE_RADIUS * 0.1,
                    coords.x, coords.y, PIECE_RADIUS
                );
                const innerColor = adjustColor(pieceColor, 40); // Lighter
                const outerColor = adjustColor(pieceColor, -20); // Darker
                gradient.addColorStop(0, innerColor);
                gradient.addColorStop(1, outerColor);

                // Draw the piece with gradient
                ctx.beginPath();
                ctx.arc(coords.x, coords.y, PIECE_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Stroke for definition
                ctx.strokeStyle = adjustColor(pieceColor, -40);
                ctx.lineWidth = 1;
                ctx.stroke();
            });
        });
    }

    function drawHomes() {
        const homeCoords = [
            { x: 0, y: 0, color: COLORS.RED }, // Top-Left (Red)
            { x: canvas.width - HOME_AREA_SIZE, y: 0, color: COLORS.BLUE }, // Top-Right (Blue)
            { x: 0, y: canvas.height - HOME_AREA_SIZE, color: COLORS.YELLOW }, // Bottom-Left (Yellow)
            { x: canvas.width - HOME_AREA_SIZE, y: canvas.height - HOME_AREA_SIZE, color: COLORS.GREEN } // Bottom-Right (Green)
        ];

        homeCoords.forEach(home => {
            // Outer colored area
            ctx.fillStyle = home.color;
            ctx.fillRect(home.x, home.y, HOME_AREA_SIZE, HOME_AREA_SIZE);

            // Inner shadow effect to make it look recessed
            const shadowOffset = 4;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(home.x, home.y, HOME_AREA_SIZE, shadowOffset); // Top shadow
            ctx.fillRect(home.x, home.y, shadowOffset, HOME_AREA_SIZE); // Left shadow

            // Inner white area for pieces
            ctx.fillStyle = COLORS.WHITE;
            const innerPadding = CELL_SIZE;
            const innerSize = HOME_AREA_SIZE - 2 * innerPadding;
            ctx.fillRect(home.x + innerPadding, home.y + innerPadding, innerSize, innerSize);
        });
    }

    function drawPaths() {
        const pathStart = HOME_AREA_SIZE;

        // Main cross shape
        ctx.fillStyle = COLORS.WHITE;
        ctx.fillRect(0, pathStart, canvas.width, PATH_WIDTH); // Horizontal
        ctx.fillRect(pathStart, 0, PATH_WIDTH, canvas.height); // Vertical

        // Draw grid lines for the path
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 1;
        for (let i = 0; i < 15; i++) {
            for (let j = 0; j < 15; j++) {
                if ((i >= 6 && i < 9) || (j >= 6 && j < 9)) {
                    if (!((i < 6 && j < 6) || (i >= 9 && j < 6) || (i < 6 && j >= 9) || (i >= 9 && j >= 9))) {
                        ctx.strokeRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }
                }
            }
        }

        // Colored home paths
        const homePathData = [
            { color: COLORS.RED,    x: 1, y: 7, dx: 1, dy: 0 },  // Red path (left arm)
            { color: COLORS.BLUE,   x: 7, y: 1, dx: 0, dy: 1 },  // Blue path (top arm)
            { color: COLORS.YELLOW, x: 7, y: 13, dx: 0, dy: -1 }, // Yellow path (bottom arm)
            { color: COLORS.GREEN,  x: 13, y: 7, dx: -1, dy: 0 }, // Green path (right arm)
        ];

        homePathData.forEach(path => {
            ctx.fillStyle = path.color;
            for (let i = 0; i < 5; i++) {
                ctx.fillRect((path.x + i * path.dx) * CELL_SIZE, (path.y + i * path.dy) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        });

        // Player starting cells
        ctx.fillStyle = COLORS.RED;
        ctx.fillRect(1 * CELL_SIZE, 6 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = COLORS.BLUE;
        ctx.fillRect(8 * CELL_SIZE, 1 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = COLORS.YELLOW;
        ctx.fillRect(13 * CELL_SIZE, 8 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = COLORS.GREEN;
        ctx.fillRect(6 * CELL_SIZE, 13 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    function drawCenter() {
        const centerX = 7.5 * CELL_SIZE;
        const centerY = 7.5 * CELL_SIZE;
        const pathStart = 6 * CELL_SIZE;
        const pathEnd = 9 * CELL_SIZE;

        // Red Triangle
        let grad = ctx.createLinearGradient(pathStart, pathStart, pathStart, pathEnd);
        grad.addColorStop(0, adjustColor(COLORS.RED, 20));
        grad.addColorStop(1, adjustColor(COLORS.RED, -20));
        ctx.beginPath(); ctx.moveTo(pathStart, pathStart); ctx.lineTo(centerX, centerY); ctx.lineTo(pathStart, pathEnd); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

        // Blue Triangle
        grad = ctx.createLinearGradient(pathStart, pathStart, pathEnd, pathStart);
        grad.addColorStop(0, adjustColor(COLORS.BLUE, 20));
        grad.addColorStop(1, adjustColor(COLORS.BLUE, -20));
        ctx.beginPath(); ctx.moveTo(pathStart, pathStart); ctx.lineTo(centerX, centerY); ctx.lineTo(pathEnd, pathStart); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

        // Green Triangle
        grad = ctx.createLinearGradient(pathEnd, pathStart, pathEnd, pathEnd);
        grad.addColorStop(0, adjustColor(COLORS.GREEN, 20));
        grad.addColorStop(1, adjustColor(COLORS.GREEN, -20));
        ctx.beginPath(); ctx.moveTo(pathEnd, pathStart); ctx.lineTo(centerX, centerY); ctx.lineTo(pathEnd, pathEnd); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

        // Yellow Triangle
        grad = ctx.createLinearGradient(pathStart, pathEnd, pathEnd, pathEnd);
        grad.addColorStop(0, adjustColor(COLORS.YELLOW, 20));
        grad.addColorStop(1, adjustColor(COLORS.YELLOW, -20));
        ctx.beginPath(); ctx.moveTo(pathStart, pathEnd); ctx.lineTo(centerX, centerY); ctx.lineTo(pathEnd, pathEnd); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    }

    function drawSafeSpots() {
        // The start positions are already colored, so we only need to draw the other 4 safe spots.
        const otherSafeSpots = [8, 21, 34, 47];

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.font = `${CELL_SIZE * 0.7}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        otherSafeSpots.forEach(spotIndex => {
            const coords = track[spotIndex];
            if (coords) {
                ctx.save();
                ctx.translate(coords.x, coords.y);
                ctx.fillText('⭐', 0, 0);
                ctx.restore();
            }
        });
    }

    function drawPlayerInfoOnBoard() {
        const homeCoords = [
            { x: 0, y: 0 }, // Top-Left (Red)
            { x: canvas.width - HOME_AREA_SIZE, y: 0 }, // Top-Right (Blue)
            { x: 0, y: canvas.height - HOME_AREA_SIZE }, // Bottom-Left (Yellow)
            { x: canvas.width - HOME_AREA_SIZE, y: canvas.height - HOME_AREA_SIZE } // Bottom-Right (Green)
        ];

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        players.forEach((player, index) => {
            if (!player.active) return; // Skip inactive players

            const home = homeCoords[index];
            const finishedCount = player.pieces.filter(p => p.state === 'finished').length;
            
            // Set font size relative to cell size
            const nameFontSize = CELL_SIZE * 0.8;
            const scoreFontSize = CELL_SIZE * 0.7;

            // Active player highlight
            if (player.id === turn && gameState !== 'gameOver') {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
                ctx.fillRect(home.x, home.y, HOME_AREA_SIZE, HOME_AREA_SIZE);
            }

            ctx.fillStyle = COLORS.BLACK;
            ctx.font = `bold ${nameFontSize}px sans-serif`;
            ctx.fillText(player.name, home.x + HOME_AREA_SIZE / 2, home.y + HOME_AREA_SIZE / 2 - (nameFontSize / 2));

            ctx.font = `${scoreFontSize}px sans-serif`;
            ctx.fillText(`Finished: ${finishedCount}/4`, home.x + HOME_AREA_SIZE / 2, home.y + HOME_AREA_SIZE / 2 + (scoreFontSize));
        });
    }

    function drawBoard() {
        drawHomes();
        drawPaths();
        drawCenter();
        drawSafeSpots();
    }

    function createFirework(specificColor) {
        if (!CELL_SIZE) return;
        const x = CELL_SIZE * 2 + Math.random() * (canvas.width - CELL_SIZE * 4);
        const y = CELL_SIZE * 2 + Math.random() * (canvas.height / 2);
        const burstColors = specificColor ? [specificColor] : [COLORS.RED, COLORS.BLUE, COLORS.GREEN, COLORS.YELLOW, COLORS.WHITE];
        const burstColor = burstColors[Math.floor(Math.random() * burstColors.length)];
        
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (CELL_SIZE * 0.15);
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.2 + Math.random() * 0.5,
                color: burstColor,
                isFirework: true
            });
        }
    }

    // 3. Basic Game Loop Functions
    function update(deltaTime) {
        if (gameState === 'gameOver') {
            if (Math.random() < 0.05) { // 5% chance every frame for continuous fireworks
                createFirework();
            }
        }

        if (gameState === 'animating') {
            for (let i = animations.length - 1; i >= 0; i--) {
                const anim = animations[i];
                anim.progress += deltaTime / anim.duration;

                if (anim.progress >= 1) {
                    // Animation finished
                    anim.piece.x = anim.endCoords.x;
                    anim.piece.y = anim.endCoords.y;
                    animations.splice(i, 1);
                    anim.onComplete();
                } else {
                    // Interpolate position (lerp)
                    anim.piece.x = anim.startCoords.x + (anim.endCoords.x - anim.startCoords.x) * anim.progress;
                    anim.piece.y = anim.startCoords.y + (anim.endCoords.y - anim.startCoords.y) * anim.progress;
                    
                    if (anim.isCapture) {
                        for (let k = 0; k < 2; k++) {
                            particles.push({
                                x: anim.piece.x + (Math.random() - 0.5) * (CELL_SIZE * 0.4),
                                y: anim.piece.y + (Math.random() - 0.5) * (CELL_SIZE * 0.4),
                                vx: (Math.random() - 0.5) * 2,
                                vy: (Math.random() - 0.5) * 2,
                                life: 1.0,
                                color: anim.color
                            });
                        }
                    }
                }
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.isFirework) {
                p.vy += 0.05; // Gravity effect for fireworks
                p.life -= deltaTime / 800; // Slower fade out
            } else {
                p.life -= deltaTime / 300; // Normal trail fade out
            }
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, (CELL_SIZE * 0.15) * p.life, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }

    function draw() {
        if (!CELL_SIZE) return; // Prevent drawing if dimensions aren't initialized

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBoard();
        drawPlayerInfoOnBoard();
        drawParticles();
        drawPieces();
        drawDiceOnBoard();
    }

    let lastTime = 0;
    function gameLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        if (!isPaused) {
            update(deltaTime);
        }

        draw();
        requestAnimationFrame(gameLoop);
    }

    // Event Listeners
    rollDiceBtn.addEventListener('click', () => {
        if (players[turn].type === 'ai') return;
        initAudio();
        console.log("Roll Dice बटन दबाया गया!");
        handleDiceRoll();
    });

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check if user clicked on the Dice
        if (gameState === 'waiting' && players[turn].type !== 'ai') {
            const diceSize = CELL_SIZE * 1.5;
            let diceX, diceY;
            switch(turn) {
                case 0: diceX = CELL_SIZE * 0.5; diceY = CELL_SIZE * 0.5; break;
                case 1: diceX = canvas.width - HOME_AREA_SIZE + CELL_SIZE * 0.5; diceY = CELL_SIZE * 0.5; break;
                case 2: diceX = CELL_SIZE * 0.5; diceY = canvas.height - HOME_AREA_SIZE + CELL_SIZE * 0.5; break;
                case 3: diceX = canvas.width - HOME_AREA_SIZE + CELL_SIZE * 0.5; diceY = canvas.height - HOME_AREA_SIZE + CELL_SIZE * 0.5; break;
            }
            
            if (clickX >= diceX && clickX <= diceX + diceSize && clickY >= diceY && clickY <= diceY + diceSize) {
                initAudio();
                handleDiceRoll();
                return;
            }
        }

        if (gameState !== 'moving') return;

        const PIECE_RADIUS = CELL_SIZE * 0.4;

        let clickedMove = null;
        for (const move of movablePieces) {
            const piece = players[turn].pieces[move.pieceIndex];
            const coords = getPiecePixelCoords(piece);
            const distance = Math.hypot(clickX - coords.x, clickY - coords.y);

            if (distance <= PIECE_RADIUS) {
                clickedMove = move;
                break;
            }
        }

        if (clickedMove) {
            movePiece(clickedMove);
        }
    });

    openSetupBtn.addEventListener('click', () => {
        initAudio();
        gameContainer.style.display = 'none';
        gameOverOverlay.style.display = 'none';
        setupOverlay.style.display = 'flex';
        
        // Show/hide resume button dynamically based on saved game
        if (localStorage.getItem(GAME_SAVE_KEY)) {
            resumeGameBtn.style.display = 'block';
            resumeGameSeparator.style.display = 'block';
        } else {
            resumeGameBtn.style.display = 'none';
            resumeGameSeparator.style.display = 'none';
        }
    });

    playAgainBtn.addEventListener('click', () => initGame(true));

    pauseBtn.addEventListener('click', () => togglePause());
    pauseOverlay.addEventListener('click', () => togglePause(false)); // Clicking overlay always resumes
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });

    startGameBtn.addEventListener('click', () => {
        if (localStorage.getItem(GAME_SAVE_KEY)) {
            if (!confirm("This will erase your saved game. Are you sure?")) {
                return;
            }
        }
        // Configure players array based on setup screen
        let activePlayerCount = 0;
        playerSetups.forEach((setup, index) => {
            players[index].active = setup.active.checked;
            if (players[index].active) {
                activePlayerCount++;
                players[index].type = setup.type.value;
                players[index].name = setup.name.value || `Player ${index + 1}`;
            } else {
                players[index].pieces = [];
            }
        });

        if (activePlayerCount < 2) {
            alert("कम से कम 2 खिलाड़ियों का होना आवश्यक है! (At least two players are required.)");
            return;
        }
        initGame(true);
    });

    resumeGameBtn.addEventListener('click', () => {
        initGame(false);
    });

    playerSetups.forEach((setup, index) => {
        setup.active.addEventListener('change', () => {
            const isActive = setup.active.checked;
            setup.type.disabled = !isActive;
            const isHuman = setup.type.value === 'human';
            setup.name.disabled = !isActive || !isHuman;
        });

        setup.type.addEventListener('change', () => {
            if (!setup.active.checked) return;
            const isHuman = setup.type.value === 'human';
            setup.name.disabled = !isHuman;
            if (!isHuman) {
                setup.name.value = `AI ${index + 1}`;
            }
        });
    });

    // Game shuru karna
    function initializeApp() {
        setupCanvasAndRedraw(); // Initial setup
        window.addEventListener('resize', setupCanvasAndRedraw);

        if (localStorage.getItem(GAME_SAVE_KEY)) {
            resumeGameBtn.style.display = 'block';
            resumeGameSeparator.style.display = 'block';
        }
        console.log("Ludo game script loaded. Waiting for setup.");
        gameLoop();
    }
    initializeApp();
});