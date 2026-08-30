const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesEl = document.getElementById('lives');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

let score = 0;
let best = Number(localStorage.getItem('skyDodgeBest')) || 0;
let lives = 3;
let running = false;
let lastTime = 0;
let spawnTimer = 0;
let gameOver = false;

const ship = {
  x: canvas.width / 2,
  y: canvas.height - 50,
  width: 46,
  height: 26,
  speed: 7,
  direction: 0,
};

const meteors = [];
const stars = [];

bestEl.textContent = best;
scoreEl.textContent = score;
livesEl.textContent = lives;
statusEl.textContent = 'Dodge the meteors and stay alive.';

function resetGame() {
  score = 0;
  lives = 3;
  running = true;
  gameOver = false;
  meteors.length = 0;
  stars.length = 0;
  spawnTimer = 0;
  ship.x = canvas.width / 2;
  ship.direction = 0;
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  statusEl.textContent = 'Survive the meteor shower!';
  if (animationFrame) cancelAnimationFrame(animationFrame);
  lastTime = 0;
  animationFrame = requestAnimationFrame(loop);
}

function updateHud() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  bestEl.textContent = best;
}

function spawnMeteor() {
  meteors.push({
    x: 20 + Math.random() * (canvas.width - 40),
    y: -20,
    radius: 12 + Math.random() * 18,
    speed: 2 + Math.random() * 3 + score * 0.01,
    drift: (Math.random() - 0.5) * 2.2,
  });
}

function spawnStar() {
  stars.push({
    x: 10 + Math.random() * (canvas.width - 20),
    y: -10,
    radius: 5,
    speed: 2 + Math.random() * 1.5,
  });
}

let animationFrame = null;

function update(delta) {
  if (!running) return;

  ship.x += ship.direction * ship.speed;
  if (ship.x < ship.width / 2) ship.x = ship.width / 2;
  if (ship.x > canvas.width - ship.width / 2) ship.x = canvas.width - ship.width / 2;

  spawnTimer += delta;
  if (spawnTimer > 700) {
    spawnTimer = 0;
    spawnMeteor();
    if (Math.random() < 0.3) spawnStar();
  }

  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.y += m.speed * 0.7;
    m.x += m.drift;

    if (m.y > canvas.height + m.radius) {
      meteors.splice(i, 1);
      score += 5;
      updateHud();
      continue;
    }

    const dx = m.x - ship.x;
    const dy = m.y - ship.y;
    const distance = Math.hypot(dx, dy);

    if (distance < m.radius + ship.width * 0.5) {
      meteors.splice(i, 1);
      lives -= 1;
      if (lives <= 0) {
        running = false;
        gameOver = true;
        best = Math.max(best, score);
        localStorage.setItem('skyDodgeBest', String(best));
        bestEl.textContent = best;
        statusEl.textContent = 'Game over! Press restart.';
        return;
      }
      statusEl.textContent = 'Hit! Stay sharp.';
      updateHud();
    }
  }

  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    s.y += s.speed * 0.8;
    if (s.y > canvas.height + 10) {
      stars.splice(i, 1);
      continue;
    }

    if (Math.abs(s.x - ship.x) < 18 && Math.abs(s.y - ship.y) < 18) {
      stars.splice(i, 1);
      score += 15;
      best = Math.max(best, score);
      localStorage.setItem('skyDodgeBest', String(best));
      updateHud();
      statusEl.textContent = 'Star boost!';
    }
  }

  if (running) {
    score += 0.03;
    scoreEl.textContent = Math.floor(score);
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#0f294a');
  sky.addColorStop(1, '#050d18');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 40; i++) {
    const x = ((i * 101) + (performance.now() * 0.02)) % canvas.width;
    const y = (i * 53) % canvas.height;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawShip() {
  const x = ship.x;
  const y = ship.y;

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#7ef9ff';
  ctx.shadowBlur = 16;
  ctx.shadowColor = '#7ef9ff';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(20, 18);
  ctx.lineTo(0, 10);
  ctx.lineTo(-20, 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMeteor(m) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.fillStyle = '#8d99ae';
  ctx.beginPath();
  ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff7f50';
  ctx.beginPath();
  ctx.arc(-m.radius * 0.25, -m.radius * 0.2, m.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStar(s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outer = 7;
    const inner = 3;
    const angle = (Math.PI / 180) * (i * 72 - 90);
    const x1 = Math.cos(angle) * outer;
    const y1 = Math.sin(angle) * outer;
    const x2 = Math.cos(angle + Math.PI / 5) * inner;
    const y2 = Math.sin(angle + Math.PI / 5) * inner;
    if (i === 0) ctx.moveTo(x2, y2);
    else ctx.lineTo(x2, y2);
    ctx.lineTo(x1, y1);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function render() {
  drawBackground();
  for (const s of stars) drawStar(s);
  for (const m of meteors) drawMeteor(m);
  drawShip();
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  if (running) {
    update(delta);
    render();
  } else {
    render();
  }

  animationFrame = requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') ship.direction = -1;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') ship.direction = 1;
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    if (ship.direction < 0) ship.direction = 0;
  }
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    if (ship.direction > 0) ship.direction = 0;
  }
});

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  ship.x = x;
});

canvas.addEventListener('touchmove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches[0];
  const x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
  ship.x = x;
  event.preventDefault();
}, { passive: false });

startBtn.addEventListener('click', () => resetGame());
restartBtn.addEventListener('click', () => resetGame());

updateHud();
render();
animationFrame = requestAnimationFrame(loop);
