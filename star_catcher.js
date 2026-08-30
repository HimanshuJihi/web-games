const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const livesEl = document.getElementById('lives');
const timerEl = document.getElementById('timer');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

const KEY_LEFT = 'ArrowLeft';
const KEY_RIGHT = 'ArrowRight';

let score = 0;
let bestScore = Number(localStorage.getItem('starCatcherBest')) || 0;
let lives = 3;
let timeLeft = 45;
let gameRunning = false;
let gameOver = false;
let animationId = null;
let lastTimestamp = 0;
let spawnAccumulator = 0;

const player = {
    x: canvas.width / 2,
    y: canvas.height - 44,
    width: 52,
    height: 26,
    speed: 7,
    direction: 0,
};

const stars = [];
const bombs = [];
const hearts = [];
const particles = [];

bestScoreEl.textContent = bestScore;
scoreEl.textContent = score;
livesEl.textContent = lives;
timerEl.textContent = timeLeft;
statusText.textContent = 'Tap Start to Play';

function resetGame() {
    score = 0;
    lives = 3;
    timeLeft = 45;
    gameRunning = true;
    gameOver = false;
    stars.length = 0;
    bombs.length = 0;
    hearts.length = 0;
    particles.length = 0;
    spawnAccumulator = 0;
    player.x = canvas.width / 2;
    player.direction = 0;

    scoreEl.textContent = score;
    livesEl.textContent = lives;
    timerEl.textContent = timeLeft;
    statusText.textContent = 'Collect stars!';

    if (animationId) cancelAnimationFrame(animationId);
    lastTimestamp = 0;
    animationId = requestAnimationFrame(loop);
}

function gameOverSequence() {
    gameRunning = false;
    gameOver = true;
    statusText.textContent = 'Game Over';
    bestScore = Math.max(bestScore, score);
    localStorage.setItem('starCatcherBest', String(bestScore));
    bestScoreEl.textContent = bestScore;
    if (animationId) cancelAnimationFrame(animationId);
}

function updateHud() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    timerEl.textContent = Math.max(0, Math.ceil(timeLeft));
}

function addParticles(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.7) * 4,
            size: Math.random() * 4 + 2,
            color,
            life: 30 + Math.random() * 20,
        });
    }
}

function spawnObject() {
    const roll = Math.random();
    const x = 25 + Math.random() * (canvas.width - 50);
    const y = -20;
    const speed = 1.5 + Math.random() * 2.2;

    if (roll < 0.78) {
        stars.push({ x, y, radius: 12, speed, spin: Math.random() * 10 });
    } else if (roll < 0.94) {
        bombs.push({ x, y, radius: 12, speed: speed + 0.4, spin: Math.random() * 10 });
    } else {
        hearts.push({ x, y, radius: 11, speed: speed, pulse: Math.random() * Math.PI * 2 });
    }
}

function handleInput() {
    if (player.direction !== 0) {
        player.x += player.direction * player.speed;
    }

    if (player.x < player.width / 2) player.x = player.width / 2;
    if (player.x > canvas.width - player.width / 2) player.x = canvas.width - player.width / 2;
}

function checkCollisions() {
    for (let i = stars.length - 1; i >= 0; i--) {
        const item = stars[i];
        const dx = item.x - player.x;
        const dy = item.y - (player.y + 6);
        const distance = Math.hypot(dx, dy);

        if (distance < item.radius + 18) {
            score += 10;
            addParticles(item.x, item.y, '#ffd166', 18);
            stars.splice(i, 1);
            updateHud();
        }
    }

    for (let i = bombs.length - 1; i >= 0; i--) {
        const item = bombs[i];
        const dx = item.x - player.x;
        const dy = item.y - (player.y + 6);
        const distance = Math.hypot(dx, dy);

        if (distance < item.radius + 18) {
            lives -= 1;
            addParticles(item.x, item.y, '#ff5d8f', 22);
            bombs.splice(i, 1);
            updateHud();
            if (lives <= 0) {
                gameOverSequence();
                return;
            }
        }
    }

    for (let i = hearts.length - 1; i >= 0; i--) {
        const item = hearts[i];
        const dx = item.x - player.x;
        const dy = item.y - (player.y + 6);
        const distance = Math.hypot(dx, dy);

        if (distance < item.radius + 18) {
            lives = Math.min(5, lives + 1);
            addParticles(item.x, item.y, '#7ef29a', 20);
            hearts.splice(i, 1);
            updateHud();
        }
    }
}

function updateObjects(dt) {
    for (let i = stars.length - 1; i >= 0; i--) {
        const item = stars[i];
        item.y += item.speed * dt * 0.9;
        item.spin += 0.08;
        if (item.y > canvas.height + 30) stars.splice(i, 1);
    }

    for (let i = bombs.length - 1; i >= 0; i--) {
        const item = bombs[i];
        item.y += item.speed * dt * 0.9;
        item.spin += 0.1;
        if (item.y > canvas.height + 30) bombs.splice(i, 1);
    }

    for (let i = hearts.length - 1; i >= 0; i--) {
        const item = hearts[i];
        item.y += item.speed * dt * 0.85;
        item.pulse += 0.08;
        if (item.y > canvas.height + 30) hearts.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt * 0.8;
        p.y += p.vy * dt * 0.8;
        p.life -= 1;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0b1d42');
    gradient.addColorStop(1, '#050e1f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 45; i++) {
        const x = (i * 73 + (performance.now() * 0.02) % 80) % canvas.width;
        const y = (i * 47) % canvas.height;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x, y, 2, 2);
    }
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const bodyW = player.width;
    const bodyH = player.height;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#5ee7ff';

    ctx.fillStyle = '#7ce7ff';
    ctx.beginPath();
    ctx.moveTo(0, -bodyH);
    ctx.lineTo(bodyW / 2, bodyH / 2);
    ctx.lineTo(0, bodyH / 4);
    ctx.lineTo(-bodyW / 2, bodyH / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#eafcff';
    ctx.fillRect(-6, bodyH / 2 - 10, 12, 12);
    ctx.restore();
}

function drawStar(item) {
    const cx = item.x;
    const cy = item.y;
    const spikes = 5;
    const outerRadius = item.radius;
    const innerRadius = item.radius * 0.45;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(item.spin);
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const angle = (Math.PI / spikes) * i;
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const px = Math.cos(angle - Math.PI / 2) * r;
        const py = Math.sin(angle - Math.PI / 2) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffd166';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#ffd166';
    ctx.fill();
    ctx.restore();
}

function drawBomb(item) {
    const x = item.x;
    const y = item.y;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(item.spin * 1.3);
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff5d8f';
    ctx.beginPath();
    ctx.arc(0, 0, item.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f5d2d8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -item.radius - 5);
    ctx.lineTo(5, -item.radius - 18);
    ctx.stroke();
    ctx.restore();
}

function drawHeart(item) {
    const x = item.x;
    const y = item.y;
    const pulse = 1 + Math.sin(item.pulse) * 0.12;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#7ef29a';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#7ef29a';
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-10, -8, -22, -4, -22, 10);
    ctx.bezierCurveTo(-22, 22, -8, 28, 0, 36);
    ctx.bezierCurveTo(8, 28, 22, 22, 22, 10);
    ctx.bezierCurveTo(22, -4, 10, -8, 0, 8);
    ctx.fill();
    ctx.restore();
}

function drawParticles() {
    for (const p of particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / 50);
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

function update(dt) {
    handleInput();
    updateObjects(dt);
    checkCollisions();

    spawnAccumulator += dt;
    if (spawnAccumulator > 900) {
        spawnAccumulator = 0;
        spawnObject();
    }

    timeLeft -= dt / 1000;
    if (timeLeft <= 0) {
        timeLeft = 0;
        updateHud();
        gameOverSequence();
    }
    updateHud();
}

function render() {
    drawBackground();

    for (const item of stars) drawStar(item);
    for (const item of bombs) drawBomb(item);
    for (const item of hearts) drawHeart(item);
    drawPlayer();
    drawParticles();
}

function loop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (gameRunning) {
        update(delta);
        render();
        animationId = requestAnimationFrame(loop);
    } else {
        render();
    }
}

function setupInput() {
    window.addEventListener('keydown', (event) => {
        if (event.key === KEY_LEFT || event.key.toLowerCase() === 'a') {
            player.direction = -1;
        } else if (event.key === KEY_RIGHT || event.key.toLowerCase() === 'd') {
            player.direction = 1;
        }
    });

    window.addEventListener('keyup', (event) => {
        if (event.key === KEY_LEFT || event.key.toLowerCase() === 'a') {
            if (player.direction < 0) player.direction = 0;
        } else if (event.key === KEY_RIGHT || event.key.toLowerCase() === 'd') {
            if (player.direction > 0) player.direction = 0;
        }
    });

    canvas.addEventListener('pointermove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const pointerX = ((event.clientX - rect.left) / rect.width) * canvas.width;
        player.x = pointerX;
    });

    canvas.addEventListener('touchmove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        const x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
        player.x = x;
        event.preventDefault();
    }, { passive: false });
}

startBtn.addEventListener('click', () => {
    resetGame();
});

restartBtn.addEventListener('click', () => {
    resetGame();
});

setupInput();
render();
