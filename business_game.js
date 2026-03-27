document.addEventListener('DOMContentLoaded', () => {
    const boardData = [
        { name: "START", type: "corner", icon: "💰", owner: null },
        { name: "Mumbai", type: "property", price: 60, rent: 10, color: "#a52a2a", owner: null },
        { name: "Community Chest", type: "community-chest", icon: "🎁" },
        { name: "Delhi", type: "property", price: 60, rent: 10, color: "#a52a2a", owner: null },
        { name: "Income Tax", type: "tax", price: 200, icon: "💸", owner: null },
        { name: "Railway", type: "railroad", price: 200, rent: 25, icon: "🚂", owner: null },
        { name: "Chandigarh", type: "property", price: 100, rent: 15, color: "#87ceeb", owner: null },
        { name: "Chance", type: "chance", icon: "❓" },
        { name: "Jaipur", type: "property", price: 100, rent: 15, color: "#87ceeb", owner: null },
        { name: "Lucknow", type: "property", price: 120, rent: 20, color: "#87ceeb", owner: null },
        { name: "JAIL", type: "corner", icon: "👮", owner: null },
        { name: "Pune", type: "property", price: 140, rent: 25, color: "#da70d6", owner: null },
        { name: "Electric Co.", type: "utility", price: 150, rent: 20, icon: "💡", owner: null },
        { name: "Nagpur", type: "property", price: 140, rent: 25, color: "#da70d6", owner: null },
        { name: "Indore", type: "property", price: 160, rent: 30, color: "#da70d6", owner: null },
        { name: "Railway", type: "railroad", price: 200, rent: 25, icon: "🚂", owner: null },
        { name: "Kolkata", type: "property", price: 180, rent: 35, color: "#ffa500", owner: null },
        { name: "Community Chest", type: "community-chest", icon: "🎁" },
        { name: "Patna", type: "property", price: 180, rent: 35, color: "#ffa500", owner: null },
        { name: "Bhopal", type: "property", price: 200, rent: 40, color: "#ffa500", owner: null },
        { name: "FREE PARKING", type: "corner", icon: "🚗", owner: null },
        { name: "Chennai", type: "property", price: 220, rent: 45, color: "#ff4500", owner: null },
        { name: "Chance", type: "chance", icon: "❓" },
        { name: "Agra", type: "property", price: 220, rent: 45, color: "#ff4500", owner: null },
        { name: "Goa", type: "property", price: 240, rent: 50, color: "#ff4500", owner: null },
        { name: "Railway", type: "railroad", price: 200, rent: 25, icon: "🚂", owner: null },
        { name: "Hyderabad", type: "property", price: 260, rent: 55, color: "#ffd700", owner: null },
        { name: "Bengaluru", type: "property", price: 260, rent: 55, color: "#ffd700", owner: null },
        { name: "Water Works", type: "utility", price: 150, rent: 20, icon: "💧", owner: null },
        { name: "Ahmedabad", type: "property", price: 280, rent: 60, color: "#ffd700", owner: null },
        { name: "GO TO JAIL", type: "corner", icon: "🚓", owner: null },
        { name: "Surat", type: "property", price: 300, rent: 65, color: "#228b22", owner: null },
        { name: "Kochi", type: "property", price: 300, rent: 65, color: "#228b22", owner: null },
        { name: "Community Chest", type: "community-chest", icon: "🎁" },
        { name: "Mysuru", type: "property", price: 320, rent: 70, color: "#228b22", owner: null },
        { name: "Railway", type: "railroad", price: 200, rent: 25, icon: "🚂", owner: null },
        { name: "Chance", type: "chance", icon: "❓" },
        { name: "New Delhi", type: "property", price: 350, rent: 80, color: "#4169e1", owner: null },
        { name: "Super Tax", type: "tax", price: 100, icon: "💸", owner: null },
        { name: "Gateway of India", type: "property", price: 400, rent: 100, color: "#4169e1", owner: null },
    ];

    let players = [
        { id: 0, name: "Player 1", money: 1500, position: 0, colorClass: "red", hexColor: "#e74c3c" },
        { id: 1, name: "Computer", money: 1500, position: 0, colorClass: "blue", hexColor: "#3498db" }
    ];
    let turn = 0; // 0 for Player 1, 1 for Player 2
    let currentSpace = null;

    const boardElement = document.getElementById('game-board');
    const rollBtn = document.getElementById('rollDiceBtn');
    const tradeBtn = document.getElementById('tradeBtn');
    const manageBtn = document.getElementById('manageBtn');
    const actionPanel = document.getElementById('action-panel');
    const buyBtn = document.getElementById('buyBtn');
    const upgradeBtn = document.getElementById('upgradeBtn');
    const endTurnBtn = document.getElementById('endTurnBtn');
    const logBox = document.getElementById('gameLog');
    const modeSelect = document.getElementById('modeSelect');
    const p1NameInput = document.getElementById('p1NameInput');
    const p1InfoSpan = document.getElementById('p1-info');
    const p2InfoSpan = document.getElementById('p2-info');
    const p2NameInput = document.getElementById('p2NameInput');

    modeSelect.addEventListener('change', () => {
        if (modeSelect.value === 'pve') {
            players[1].name = 'Computer';
            p2NameInput.value = 'Computer';
            p2NameInput.disabled = true;
        } else {
            players[1].name = p2NameInput.value || 'Player 2';
            p2NameInput.disabled = false;
        }
        updateUI();
    });

    p1NameInput.addEventListener('input', () => {
        players[0].name = p1NameInput.value || "Player 1";
        updateUI();
    });

    p2NameInput.addEventListener('input', () => {
        if (modeSelect.value === 'pvp') {
            players[1].name = p2NameInput.value || "Player 2";
            updateUI();
        }
    });

    function isAITurn() {
        return turn === 1 && modeSelect.value === 'pve';
    }

    const CHANCE_CARDS = [
        { text: "Speeding fine! Pay ₹150.", amount: -150 },
        { text: "Won the lottery! Collect ₹200.", amount: 200 },
        { text: "Bank pays you dividend of ₹50.", amount: 50 },
        { text: "Pay poor tax of ₹15.", amount: -15 },
        { text: "Building loan matures. Collect ₹150.", amount: 150 },
        { text: "Go directly to JAIL!", action: "jail" }
    ];

    const COMMUNITY_CHEST_CARDS = [
        { text: "Bank error in your favor. Collect ₹200.", amount: 200 },
        { text: "Doctor's fee. Pay ₹50.", amount: -50 },
        { text: "From sale of stock you get ₹50.", amount: 50 },
        { text: "Income tax refund. Collect ₹20.", amount: 20 },
        { text: "Pay hospital fees of ₹100.", amount: -100 },
        { text: "Advance to START (Collect ₹200).", action: "start" }
    ];

    // Rent multiplier for levels: Base, 1 House, 2 Houses, 3 Houses, 4 Houses, Hotel
    const RENT_MULTIPLIER = [1, 5, 15, 30, 45, 60];

    function createBoard() {
        if (!boardElement) return;

        boardData.forEach((data, i) => {
            const space = document.createElement('div');
            space.id = `space-${i}`;
            space.classList.add('space');
            space.classList.add(data.type);
            if (i >= 1 && i <= 9) space.classList.add('bottom-row');
            else if (i >= 11 && i <= 19) space.classList.add('left-col');
            else if (i >= 21 && i <= 29) space.classList.add('top-row');
            else if (i >= 31 && i <= 39) space.classList.add('right-col');

            let content = '';
            switch (data.type) {
                case 'property':
                    // Initialize property levels and dynamic upgrade costs
                    data.level = 0;
                    // Ensure isMortgaged is initialized for all properties
                    data.isMortgaged = false;
                    data.upgradeCost = Math.round(data.price * 0.6 / 10) * 10;
                    
                    content = `
                        <div class="color-bar" style="background-color: ${data.color};"></div>
                        <div class="name">${data.name}</div>
                        <div class="price">₹${data.price}</div>
                    `;
                    break;
                case 'railroad':
                case 'utility':
                    content = `
                        <div class="icon">${data.icon}</div>
                        <div class="name">${data.name}</div>
                        <div class="price">₹${data.price}</div>
                    `;
                    break;
                case 'tax':
                    content = `
                        <div class="name">${data.name}</div>
                        <div class="icon">${data.icon}</div>
                        <div class="price">Pay ₹${data.price}</div>
                    `;
                    break;
                case 'community-chest':
                case 'chance':
                    content = `
                        <div class="name">${data.name}</div>
                        <div class="icon">${data.icon}</div>
                    `;
                    break;
                case 'corner':
                    content = `
                        <div class="text">${data.name}</div>
                        <div class="icon">${data.icon}</div>
                    `;
                    break;
            }
            space.innerHTML = content;
            boardElement.appendChild(space);
        });
        
        updateTokens();
        updateUI();
    }

    function updateTokens() {
        document.querySelectorAll('.player-token').forEach(t => t.remove());
        players.forEach((p, index) => {
            const token = document.createElement('div');
            // If player is in jail, position them on the jail space (index 10)
            const currentPosition = p.inJail ? 10 : p.position;

            token.classList.add('player-token', p.colorClass);
            token.textContent = p.id + 1; // Display player number on token
            if (index === 1) { // Offset Player 2 slightly
                token.style.marginTop = '15px';
                token.style.marginLeft = '15px';
            }
            document.getElementById(`space-${currentPosition}`).appendChild(token);
        });
    }

    function updateUI() {
        const p1Name = players[0].name.substring(0, 8);
        const p2Name = players[1].name.substring(0, 8);
        p1InfoSpan.textContent = `🔴 ${p1Name}: ₹${players[0].money}`;
        p2InfoSpan.textContent = `🔵 ${p2Name}: ₹${players[1].money}`;
        
        p1InfoSpan.className = turn === 0 ? "active" : "";
        p2InfoSpan.className = turn === 1 ? "active" : "";
        
        checkGameOver();
    }

    function checkGameOver() {
        const gameOverOverlay = document.getElementById('gameOverOverlay');
        if (!gameOverOverlay) return false;

        if (players[0].money < 0 || players[1].money < 0) {
            let loser = players[0].money < 0 ? players[0] : players[1];
            let winner = players[0].money < 0 ? players[1] : players[0];
            
            document.getElementById('gameOverText').innerHTML = `${loser.name} is Bankrupt!<br><br><span style="color: #f1c40f; font-size: 2.5rem; text-shadow: 0 0 10px #f1c40f;">🏆 ${winner.name} Wins! 🏆</span>`;
            localStorage.removeItem('businessGameSave'); // Clear saved game on game over
            gameOverOverlay.style.display = 'flex';
            gameOverOverlay.style.display = 'flex';
            rollBtn.disabled = true;
            actionPanel.style.display = 'none';
            return true;
        }
        return false;
    }

    function log(msg) {
        logBox.innerHTML = `<strong>${players[turn].name}:</strong> ${msg}`;
    }

    function rollDice() {
        rollBtn.disabled = true;
        tradeBtn.disabled = true;
        manageBtn.disabled = true;
        log(`${players[turn].name} is rolling the dice...`);

        const dice1El = document.getElementById('dice1');
        const dice2El = document.getElementById('dice2');
        dice1El.classList.remove('landed');
        dice2El.classList.remove('landed');

        let rollCount = 0;
        const maxRolls = 15;
        let d1, d2;

        const rollInterval = setInterval(() => {
            d1 = Math.floor(Math.random() * 6) + 1;
            d2 = Math.floor(Math.random() * 6) + 1;
            dice1El.textContent = d1;
            dice2El.textContent = d2;
            
            rollCount++;
            if (rollCount >= maxRolls) {
                clearInterval(rollInterval);
                dice1El.classList.add('landed');
                dice2El.classList.add('landed');
                
                const totalRoll = d1 + d2;
                log(`${players[turn].name} rolled a ${totalRoll} (${d1} + ${d2}).`);
                movePlayer(totalRoll);
            }
        }, 80);
    }
    rollBtn.addEventListener('click', rollDice);

    // --- SAVE/LOAD GAME LOGIC ---
    function saveGame() {
        const gameState = {
            players: players,
            boardData: boardData,
            turn: turn,
            mode: modeSelect.value
        };
        localStorage.setItem('businessGameSave', JSON.stringify(gameState));
    }

    window.newGame = function() {
        localStorage.removeItem('businessGameSave');
        location.reload();
    }

    // --- END SAVE/LOAD GAME LOGIC ---

    function playAITurn() {
        if (players[0].money < 0 || players[1].money < 0) return;
        rollDice();
    }

    function movePlayer(spaces) {
        let p = players[turn];
        let stepsTaken = 0;
        
        // एक-एक कदम चलने का एनिमेशन (Walking Animation)
        const stepInterval = setInterval(() => {
            p.position++;
            if (p.position >= 40) {
                p.position = 0;
                p.money += 200; // Passed GO
                log(`Passed START! Collected ₹200.`);
                updateUI();
            }
            updateTokens(); // हर कदम पर टोकन को ग्राफ़िकली अपडेट करें
            
            stepsTaken++;
            if (stepsTaken >= spaces) {
                clearInterval(stepInterval);
                updateUI();
                setTimeout(() => {
                    handleLanding(p);
                }, 400); // अपनी जगह पर पहुँचने के बाद थोड़ा रुककर एक्शन लें
            }
        }, 250); // हर कदम के बीच 250ms का समय (Speed)
    }

    function handleLanding(p) {
        currentSpace = boardData[p.position];
        let spaceName = currentSpace.name;

        if (currentSpace.type === 'property' || currentSpace.type === 'railroad' || currentSpace.type === 'utility') {
            if (p.inJail) { // If player is in jail, they don't move, so don't handle landing
                return;
            }

            if (currentSpace.owner === null) {
                log(`Landed on ${spaceName}. Buy for ₹${currentSpace.price}?`);
                if (p.money >= currentSpace.price) {
                    if (isAITurn()) {
                        // AI Buy Logic: Buy if it leaves at least ₹100 buffer
                        if (p.money >= currentSpace.price + 100) {
                            setTimeout(buyProperty, 1500);
                        } else {
                            setTimeout(skipTurn, 1500);
                        }
                    } else {
                        actionPanel.style.display = 'block';
                        buyBtn.style.display = 'inline-block';
                        upgradeBtn.style.display = 'none';
                    }
                } else {
                    log(`Landed on ${spaceName} but you don't have enough money.`);
                    setTimeout(nextTurn, 2000);
                }
            } else if (currentSpace.owner !== p.id) {
                if (currentSpace.isMortgaged) {
                    log(`Landed on ${spaceName}, but it is mortgaged. No rent!`);
                    setTimeout(nextTurn, 2000);
                    return;
                }
                let rent = currentSpace.rent;
                // Calculate rent for railroads and utilities
                if (currentSpace.type === 'property') {
                    rent = currentSpace.rent * RENT_MULTIPLIER[currentSpace.level || 0];
                }
                p.money -= rent;
                players[currentSpace.owner].money += rent;
                log(`Landed on ${spaceName} owned by Player ${currentSpace.owner + 1}. Paid ₹${rent} rent.`);
                updateUI();
                setTimeout(nextTurn, 2500);
            } else {
                if (currentSpace.type === 'property' && currentSpace.level < 5) {
                    log(`You own ${spaceName}. Upgrade for ₹${currentSpace.upgradeCost}?`);
                    if (p.money >= currentSpace.upgradeCost) {
                        if (isAITurn()) {
                            // AI Upgrade Logic: Upgrade if leaves a solid buffer
                            if (p.money >= currentSpace.upgradeCost + 200) {
                                setTimeout(upgradeProperty, 1500); // upgradeProperty will call finishPlayerAction
                            } else {
                                setTimeout(finishPlayerAction, 1500); // AI chooses not to upgrade
                            }
                        } else {
                            actionPanel.style.display = 'block';
                            buyBtn.style.display = 'none';
                            upgradeBtn.style.display = 'inline-block';
                            endTurnBtn.onclick = finishPlayerAction; // Skip / End Turn button now calls finishPlayerAction
                        }
                    } else {
                        log(`You own ${spaceName}. Not enough money to upgrade.`);
                        setTimeout(finishPlayerAction, 2000);
                    }
                } else {
                    log(`Landed on your fully upgraded property (${spaceName}).`);
                    setTimeout(finishPlayerAction, 1500);
                }
            }
        } else if (currentSpace.type === 'tax') {
            p.money -= currentSpace.price;
            log(`Landed on ${spaceName}. Paid ₹${currentSpace.price} in taxes.`);
            saveGame();
            updateUI();
            setTimeout(finishPlayerAction, 2000);
        } else if (spaceName === "GO TO JAIL") {
            log(`Go to JAIL!`);
            p.position = 10;
            p.inJail = true;
            p.jailTurns = 0; // Reset jail turns
            p.doublesCount = 0; // Reset doubles count when going to jail
            log(`${p.name} was sent to Jail!`);
            updateTokens();
            setTimeout(finishPlayerAction, 2000); // Going to jail always ends turn
        } else if (currentSpace.type === 'chance' || currentSpace.type === 'community-chest') {
            const cards = currentSpace.type === 'chance' ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS;
            const card = cards[Math.floor(Math.random() * cards.length)];
            log(`${p.name} drew ${currentSpace.name}: ${card.text}`);
            if (card.amount) {
                p.money += card.amount;
            } else if (card.action === 'jail') {
                p.position = 10;
                p.inJail = true;
                p.jailTurns = 0;
                p.doublesCount = 0; // Reset doubles count when going to jail
                updateTokens();
            } else if (card.action === 'start') {
                p.position = 0;
                p.money += 200;
                updateTokens();
            }
            updateUI();
            saveGame();

            setTimeout(finishPlayerAction, 3500); // 3.5 seconds to read the card before next action
        } else {
            log(`Landed on ${spaceName}.`);
            setTimeout(finishPlayerAction, 1500);
        }
    }

    function buyProperty() {
        let p = players[turn];
        p.money -= currentSpace.price;
        currentSpace.owner = p.id;
        
        renderSpaceVisuals(p.position);

        log(`Bought ${currentSpace.name} for ₹${currentSpace.price}!`);
        saveGame();
        updateUI();
        actionPanel.style.display = 'none';
        setTimeout(finishPlayerAction, 1500);
    }
    buyBtn.addEventListener('click', buyProperty);

    function upgradeProperty() {
        let p = players[turn];
        p.money -= currentSpace.upgradeCost;
        currentSpace.level++;
        
        renderSpaceVisuals(p.position);

        let upgradeName = currentSpace.level === 5 ? "Hotel 🏨" : "House 🏠";
        log(`Upgraded ${currentSpace.name} with a ${upgradeName}!`);
        saveGame();
        updateUI();
        actionPanel.style.display = 'none';
        setTimeout(finishPlayerAction, 1500);
    }
    upgradeBtn.addEventListener('click', upgradeProperty);

    function renderSpaceVisuals(spaceIndex) {
        const space = boardData[spaceIndex];
        const spaceEl = document.getElementById(`space-${spaceIndex}`);
        if (!spaceEl) return;

        if (space.owner !== null) {
            let indicator = spaceEl.querySelector('.owner-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.classList.add('owner-indicator');
                spaceEl.appendChild(indicator);
            }
            indicator.style.backgroundColor = players[space.owner].hexColor;
        }

        if (space.isMortgaged) {
            spaceEl.classList.add('mortgaged');
        } else {
            spaceEl.classList.remove('mortgaged');
        }

        if (space.level > 0) {
            let buildingContainer = spaceEl.querySelector('.buildings');
            if (!buildingContainer) {
                buildingContainer = document.createElement('div');
                buildingContainer.classList.add('buildings');
                const colorBar = spaceEl.querySelector('.color-bar');
                if (colorBar) colorBar.appendChild(buildingContainer);
            }
            
            buildingContainer.innerHTML = space.level === 5 ? '🏨' : '🏠'.repeat(space.level);
        }
    }

    // --- MANAGE / MORTGAGE LOGIC START ---
    const manageModal = document.getElementById('manageModal');
    const managePropsList = document.getElementById('managePropsList');

    manageBtn.addEventListener('click', () => {
        if (isAITurn() || (rollBtn.disabled && actionPanel.style.display === 'none')) return;
        openManageModal();
    });

    document.getElementById('closeManageBtn').addEventListener('click', () => {
        manageModal.style.display = 'none';
    });

    function openManageModal() {
        const p = players[turn];
        managePropsList.innerHTML = '';
        let count = 0;
        
        boardData.forEach((space, index) => {
            if (space.owner === p.id && (space.type === 'property' || space.type === 'railroad' || space.type === 'utility')) {
                count++;
                const div = document.createElement('div');
                div.style.background = 'rgba(0,0,0,0.3)'; div.style.padding = '10px';
                div.style.marginBottom = '10px'; div.style.borderRadius = '5px';
                div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.alignItems = 'center';
                
                const mortgageVal = Math.floor(space.price / 2);
                const unmortgageVal = Math.floor(mortgageVal * 1.1); // 10% interest
                
                let statusTxt = space.level > 0 ? ` <span style="color:#f1c40f;">(Upgraded: ${space.level})</span>` : '';
                if (space.isMortgaged) statusTxt = ' <span style="color:#e74c3c;">(Mortgaged)</span>';
                
                const infoDiv = document.createElement('div');
                infoDiv.innerHTML = `<strong>${space.name}</strong>${statusTxt}`;
                
                const actionDiv = document.createElement('div');
                if (space.isMortgaged) {
                    const btn = document.createElement('button'); btn.className = 'btn-action'; btn.style.background = '#2ecc71';
                    btn.textContent = `Unmortgage (-₹${unmortgageVal})`;
                    btn.onclick = () => toggleMortgage(index, false, unmortgageVal);
                    actionDiv.appendChild(btn);
                } else if (space.level > 0) {
                    const sellValue = Math.floor(space.upgradeCost / 2);
                    const btn = document.createElement('button'); btn.className = 'btn-action'; btn.style.background = '#f39c12';
                    btn.textContent = `Sell Upgrade (+₹${sellValue})`;
                    btn.onclick = () => sellUpgrade(index, sellValue);
                    actionDiv.appendChild(btn);
                } else {
                    const btn = document.createElement('button'); btn.className = 'btn-action'; btn.style.background = '#e74c3c';
                    btn.textContent = `Mortgage (+₹${mortgageVal})`;
                    btn.onclick = () => toggleMortgage(index, true, mortgageVal);
                    actionDiv.appendChild(btn);
                }
                
                div.appendChild(infoDiv); div.appendChild(actionDiv);
                managePropsList.appendChild(div);
            }
        });
        
        if (count === 0) managePropsList.innerHTML = '<p style="text-align:center; color:#aaa;">You do not own any properties.</p>';
        manageModal.style.display = 'flex';
    }

    window.toggleMortgage = function(index, isMortgaging, amount) {
        const p = players[turn];
        const space = boardData[index];
        
        if (isMortgaging) {
            p.money += amount;
            space.isMortgaged = true;
            log(`Mortgaged ${space.name} for ₹${amount}.`);
        } else {
            if (p.money >= amount) {
                p.money -= amount;
                space.isMortgaged = false;
                log(`Unmortgaged ${space.name} for ₹${amount}.`);
            } else {
                alert("Not enough money to unmortgage!");
                return;
            }
        }
        updateUI(); renderSpaceVisuals(index); openManageModal();
        saveGame();
    }

    window.sellUpgrade = function(index, amount) {
        const p = players[turn];
        const space = boardData[index];
        
        p.money += amount;
        space.level--;
        
        let upgradeName = space.level === 4 ? "Hotel 🏨" : "House 🏠";
        saveGame();
        log(`Sold a ${upgradeName} on ${space.name} for ₹${amount}.`);
        
        updateUI(); renderSpaceVisuals(index); openManageModal();
    }
    // --- MANAGE / MORTGAGE LOGIC END ---

    // --- TRADE LOGIC START ---
    let pendingTrade = null;

    tradeBtn.addEventListener('click', () => {
        if (isAITurn() || rollBtn.disabled) return;
        const p1 = players[turn];
        const p2 = players[turn === 0 ? 1 : 0];
        
        document.getElementById('tradeYouName').textContent = `${p1.name} Offers`;
        document.getElementById('tradeOppName').textContent = `${p2.name} Gives`;
        
        document.getElementById('tradeOfferMoney').value = 0;
        document.getElementById('tradeWantMoney').value = 0;
        document.getElementById('tradeOfferMoney').max = p1.money;
        document.getElementById('tradeWantMoney').max = p2.money;

        generatePropCheckboxes('tradeOfferProps', p1.id);
        generatePropCheckboxes('tradeWantProps', p2.id);

        document.getElementById('tradeModal').style.display = 'flex';
    });

    function generatePropCheckboxes(containerId, ownerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        let count = 0;
        boardData.forEach((space, index) => {
            if (space.owner === ownerId) {
                const div = document.createElement('div');
                div.style.marginBottom = '5px';
                div.innerHTML = `<label style="cursor:pointer;"><input type="checkbox" value="${index}"> ${space.name} ${space.level > 0 ? '(Upgraded)' : ''}</label>`;
                container.appendChild(div);
                count++;
            }
        });
        if (count === 0) container.innerHTML = '<span style="color:#aaa;">No properties</span>';
    }

    document.getElementById('cancelTradeBtn').addEventListener('click', () => {
        document.getElementById('tradeModal').style.display = 'none';
    });

    document.getElementById('confirmTradeBtn').addEventListener('click', () => {
        const p1 = players[turn];
        const p2 = players[turn === 0 ? 1 : 0];
        
        const offerMoney = parseInt(document.getElementById('tradeOfferMoney').value) || 0;
        const wantMoney = parseInt(document.getElementById('tradeWantMoney').value) || 0;
        
        if (offerMoney > p1.money) {
            alert("You cannot offer more money than you have!");
            return;
        }

        const offerProps = Array.from(document.querySelectorAll('#tradeOfferProps input:checked')).map(cb => parseInt(cb.value));
        const wantProps = Array.from(document.querySelectorAll('#tradeWantProps input:checked')).map(cb => parseInt(cb.value));

        if (offerMoney === 0 && wantMoney === 0 && offerProps.length === 0 && wantProps.length === 0) {
            alert("Please add something to the trade.");
            return;
        }

        pendingTrade = { offerMoney, wantMoney, offerProps, wantProps, p1, p2 };
        document.getElementById('tradeModal').style.display = 'none';

        if (modeSelect.value === 'pve') {
            evaluateAITrade();
        } else {
            showTradeAlert();
        }
    });

    function showTradeAlert() {
        const offerPropNames = pendingTrade.offerProps.map(i => boardData[i].name).join(', ');
        const wantPropNames = pendingTrade.wantProps.map(i => boardData[i].name).join(', ');

        let msg = `<strong>${pendingTrade.p1.name}</strong> proposes a trade!<br><br>`;
        msg += `<strong style="color:#2ecc71;">They Offer:</strong> ₹${pendingTrade.offerMoney}`;
        if (offerPropNames) msg += ` + ${offerPropNames}`;
        msg += `<br><br><strong style="color:#e74c3c;">They Want:</strong> ₹${pendingTrade.wantMoney}`;
        if (wantPropNames) msg += ` + ${wantPropNames}`;

        document.getElementById('tradeAlertText').innerHTML = msg;
        document.getElementById('tradeAlertModal').style.display = 'flex';
    }

    function evaluateAITrade() {
        let offerValue = pendingTrade.offerMoney;
        pendingTrade.offerProps.forEach(i => offerValue += boardData[i].price + (boardData[i].upgradeCost * boardData[i].level || 0));

        let wantValue = pendingTrade.wantMoney;
        pendingTrade.wantProps.forEach(i => wantValue += boardData[i].price + (boardData[i].upgradeCost * boardData[i].level || 0));

        // AI logic: Accept if what AI receives is >= what AI gives
        if (offerValue >= wantValue && pendingTrade.wantMoney <= pendingTrade.p2.money) {
            log(`Computer accepted the trade proposal!`);
            executeTrade();
        } else {
            log(`Computer rejected your trade proposal.`);
            pendingTrade = null;
        }
    }

    document.getElementById('acceptTradeBtn').addEventListener('click', () => {
        if (pendingTrade.wantMoney > pendingTrade.p2.money) {
            alert("You don't have enough money to accept this trade!");
            return;
        }
        executeTrade();
    });

    document.getElementById('rejectTradeBtn').addEventListener('click', () => {
        log(`${pendingTrade.p2.name} rejected the trade proposal.`);
        document.getElementById('tradeAlertModal').style.display = 'none';
        pendingTrade = null;
    });

    function executeTrade() {
        const t = pendingTrade;
        t.p1.money = t.p1.money - t.offerMoney + t.wantMoney;
        t.p2.money = t.p2.money - t.wantMoney + t.offerMoney;

        t.offerProps.forEach(i => {
            boardData[i].owner = t.p2.id;
            renderSpaceVisuals(i);
        });
        t.wantProps.forEach(i => {
            boardData[i].owner = t.p1.id;
            renderSpaceVisuals(i);
        });

        log(`${t.p1.name} and ${t.p2.name} successfully traded!`);
        document.getElementById('tradeAlertModal').style.display = 'none';
        updateUI();
        pendingTrade = null;
        saveGame();
    }
    // --- TRADE LOGIC END ---

    // --- PLAYER ACTION COMPLETION LOGIC ---
    function finishPlayerAction() {
        actionPanel.style.display = 'none';
        buyBtn.style.display = 'none';
        upgradeBtn.style.display = 'none';
        endTurnBtn.onclick = skipTurn; // Reset endTurnBtn handler

        const currentPlayer = players[turn];
        if (currentPlayer.doublesCount > 0 && !currentPlayer.inJail) {
            log(`${currentPlayer.name}, you rolled doubles! Roll again!`);
            rollBtn.disabled = false; tradeBtn.disabled = false; manageBtn.disabled = false;
            saveGame(); // Save game state after action, before next roll
        } else {
            nextTurn();
        }
    }
    // --- END PLAYER ACTION COMPLETION LOGIC ---

    // --- JAIL LOGIC START ---
    const payFineBtn = document.getElementById('payFineBtn');
    const rollDoublesBtn = document.getElementById('rollDoublesBtn');

    payFineBtn.addEventListener('click', () => payJailFine(false));
    rollDoublesBtn.addEventListener('click', () => {
        if (players[turn].inJail) {
            rollDice(); // rollDice will handle jail logic
        }
    });

    function showJailOptions() {
        actionPanel.style.display = 'flex';
        buyBtn.style.display = 'none';
        upgradeBtn.style.display = 'none';
        endTurnBtn.style.display = 'none'; // End turn is handled by jail options
        payFineBtn.style.display = 'inline-block';
        rollDoublesBtn.style.display = 'inline-block';

        const currentPlayer = players[turn];
        payFineBtn.disabled = (currentPlayer.money < 200);
        rollDoublesBtn.disabled = false;
    }

    function hideJailOptions() {
        payFineBtn.style.display = 'none';
        rollDoublesBtn.style.display = 'none';
        endTurnBtn.style.display = 'inline-block'; // Restore end turn button for normal play
    }

    function payJailFine(isForced = false) {
        const currentPlayer = players[turn];
        if (currentPlayer.money >= 200) {
            currentPlayer.money -= 200;
            currentPlayer.inJail = false;
            currentPlayer.jailTurns = 0;
            currentPlayer.doublesCount = 0; // Reset doubles count when paying fine
            log(`${currentPlayer.name} paid ₹200 to get out of Jail.`);
            saveGame();
            updateUI();
            hideJailOptions();
            if (!isForced) rollDice(); // If player chose to pay, they now roll normally
        } else {
            log(`${currentPlayer.name} doesn't have enough money to pay the fine!`);
            // This will trigger bankruptcy check in updateUI
        }
    }
    // --- JAIL LOGIC END ---

    function skipTurn() {
        actionPanel.style.display = 'none';
        finishPlayerAction();
    }
    endTurnBtn.addEventListener('click', skipTurn);

    function nextTurn() {
        saveGame(); // Save game state at the end of each turn
        aiHandleBankruptcy(players[turn]); // Let AI try to survive before turn ends
        if (checkGameOver()) return; // Check for game over and stop if it is

        actionPanel.style.display = 'none';
        turn = turn === 0 ? 1 : 0; // Switch turn
        updateUI();
        const currentPlayer = players[turn];
        
        if (currentPlayer.inJail) {
            currentPlayer.jailTurns++; // Increment jail turns for the current player
            log(`${currentPlayer.name} is in Jail. Turn ${currentPlayer.jailTurns}/3.`);
            rollBtn.disabled = true; tradeBtn.disabled = true; manageBtn.disabled = true;
            showJailOptions();
            if (isAITurn()) {
                if (currentPlayer.jailTurns < 3) {
                    setTimeout(() => rollDice(), 1500); // AI tries to roll for doubles
                } else {
                    setTimeout(() => payJailFine(true), 1500); // AI pays on 3rd turn
                }
            }
        } else {
            rollBtn.disabled = false; tradeBtn.disabled = false; manageBtn.disabled = false;
            hideJailOptions(); // Ensure jail options are hidden for normal turns
            log(`It's ${currentPlayer.name}'s turn. Roll the dice.`);
            if (isAITurn()) {
                setTimeout(playAITurn, 1500);
            }
        }
    }

    function aiHandleBankruptcy(player) {
        if (player.id !== 1 || modeSelect.value !== 'pve' || player.money >= 0) return;
        // AI is in debt, try to mortgage properties to survive
        for (let i = 0; i < boardData.length; i++) {
            let sp = boardData[i];
            if (sp.owner === player.id && !sp.isMortgaged && sp.level === 0) {
                sp.isMortgaged = true;
                player.money += Math.floor(sp.price / 2);
                renderSpaceVisuals(i);
                log(`Computer mortgaged ${sp.name} to survive!`);
                if (player.money >= 0) break;
            }
        }
        updateUI();
    }

    function loadGame() {
        const savedState = localStorage.getItem('businessGameSave');
        if (!savedState) return false;

        const gameState = JSON.parse(savedState);
        players = gameState.players;
        boardData = gameState.boardData; // Overwrite boardData with saved state
        turn = gameState.turn;
        modeSelect.value = gameState.mode;

        // Ensure all properties have isMortgaged and level, even if not explicitly saved
        boardData.forEach(space => {
            if (space.type === 'property' || space.type === 'railroad' || space.type === 'utility') {
                if (typeof space.isMortgaged === 'undefined') space.isMortgaged = false;
                if (typeof space.level === 'undefined') space.level = 0;
            }
        });
        createBoard(); // Re-create board with loaded data
        return true;
    }

    // Initial setup on DOMContentLoaded
    function initializeGame() {
        if (loadGame()) {
            log("Game loaded successfully!");
            // Ensure player names are updated from loaded data
            p1NameInput.value = players[0].name;
            p2NameInput.value = players[1].name;
            modeSelect.value = localStorage.getItem('businessGameSave') ? JSON.parse(localStorage.getItem('businessGameSave')).mode : 'pve';
            p2NameInput.disabled = (modeSelect.value === 'pve');

            // Re-render all space visuals to reflect loaded state (owner, level, mortgage)
            boardData.forEach((_, index) => renderSpaceVisuals(index));

            // If current player is in jail, show jail options
            if (players[turn].inJail) {
                showJailOptions();
            } else {
                hideJailOptions();
            }

            // If it's AI's turn, start AI play
            if (isAITurn()) {
                rollBtn.disabled = true; tradeBtn.disabled = true; manageBtn.disabled = true;
                setTimeout(playAITurn, 1500);
            } else {
                rollBtn.disabled = false; tradeBtn.disabled = false; manageBtn.disabled = false;
            }
        } else {
            // No saved game, start a new one
            players[0].name = p1NameInput.value || "Player 1";
            players[1].name = p2NameInput.value || "Computer"; // Default to Computer for PVE
            p2NameInput.disabled = true; // Default to PVE
            // Initialize inJail and jailTurns for new game
            players.forEach(p => { p.inJail = false; p.jailTurns = 0; });
            createBoard();
            log("Game Started! Player 1, roll the dice.");
        }
    }

    initializeGame();
});