const FIELD_SIZE = 600;
const BALL_RADIUS = 6;

const GRAVITY   = 800;
const FRICTION  = 0.995;
const BOUNCE    = 0.75;
const MIN_SPEED = 5;
const MAX_SPEED = 1200;
const WALL_INNER = 2;

let canvas, ctx;

let balls = [];
const MAX_BALLS = 3;

let isDragging = false;
let dragTarget = null;
let dragNow    = { x: 0, y: 0 };

// ── Фабрика шарика ─────────────────────────────
function createBall(x, y) {
  return { x, y, vx: 0, vy: 0, radius: BALL_RADIUS, active: false };
}

// ── Инициализация ──────────────────────────────
export function initCanvas(canvasElement) {
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  canvas.width  = FIELD_SIZE;
  canvas.height = FIELD_SIZE;
  canvas.addEventListener('contextmenu', onRightClick);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup',   onMouseUp);

  requestAnimationFrame(gameLoop);
}

// ── Мышь ───────────────────────────────────────
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function onMouseDown(e) {
  if (e.button !== 0) return; // только ЛКМ (button 0)
  if (canvas.dataset.mode !== 'play') return;

  const pos = getPos(e);

  // Если кликнули на существующий шарик — тянем его
  for (let b of balls) {
    const dx = pos.x - b.x;
    const dy = pos.y - b.y;
    if (Math.sqrt(dx*dx + dy*dy) <= b.radius * 3) {
      isDragging = true;
      dragTarget = b;
      dragNow    = { ...pos };
      b.active = false;
      b.vx = 0;
      b.vy = 0;
      return;
    }
  }

  // Иначе — создаём новый шарик если есть слот
  if (balls.length >= MAX_BALLS) return;

  const b = createBall(pos.x, pos.y);
  balls.push(b);
  isDragging = true;
  dragTarget = b;
  dragNow    = { ...pos };
}

function onMouseMove(e) {
  if (!isDragging) return;
  dragNow = getPos(e);
}

function onMouseUp(e) {
  if (!isDragging) return;
  isDragging = false;
  dragNow = getPos(e);

  const dx = dragTarget.x - dragNow.x;
  const dy = dragTarget.y - dragNow.y;
  const dist = Math.sqrt(dx*dx + dy*dy);

  if (dist < 10) {
  dragTarget.active = true; // просто падает вниз без импульса
  dragTarget = null;
  return;
}

  const speed = Math.min(dist * 4, MAX_SPEED);
  dragTarget.vx = (dx / dist) * speed;
  dragTarget.vy = (dy / dist) * speed;
  dragTarget.active = true;
  dragTarget = null;
}

function onRightClick(e) {
  e.preventDefault(); // отключаем стандартное контекстное меню

  if (canvas.dataset.mode !== 'play') return;

  const pos = getPos(e);

  for (let i = 0; i < balls.length; i++) {
    const dx = pos.x - balls[i].x;
    const dy = pos.y - balls[i].y;
    if (Math.sqrt(dx*dx + dy*dy) <= balls[i].radius * 3) {
      balls.splice(i, 1);
      return;
    }
  }
}

// ── Физика ─────────────────────────────────────
function update(dt) {
  for (let b of balls) {
    if (!b.active) continue;

    b.vy += GRAVITY * dt;
    b.vx *= FRICTION;
    b.vy *= FRICTION;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x - b.radius <= WALL_INNER) {
      b.x = WALL_INNER + b.radius;
      b.vx = Math.abs(b.vx) * BOUNCE;
    }
    if (b.x + b.radius >= FIELD_SIZE - WALL_INNER) {
      b.x = FIELD_SIZE - WALL_INNER - b.radius;
      b.vx = -Math.abs(b.vx) * BOUNCE;
    }
    if (b.y - b.radius <= WALL_INNER) {
      b.y = WALL_INNER + b.radius;
      b.vy = Math.abs(b.vy) * BOUNCE;
    }
    if (b.y + b.radius >= FIELD_SIZE - WALL_INNER) {
      b.y = FIELD_SIZE - WALL_INNER - b.radius;
      b.vy = -Math.abs(b.vy) * BOUNCE;
    }

    const speed = Math.sqrt(b.vx**2 + b.vy**2);
    if (speed < MIN_SPEED && b.y + b.radius >= FIELD_SIZE - WALL_INNER - 1) {
      b.vx = 0;
      b.vy = 0;
      b.active = false;
    }
  }
}

// ── Отрисовка ──────────────────────────────────
function draw() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, FIELD_SIZE, FIELD_SIZE);

  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, FIELD_SIZE - 2, FIELD_SIZE - 2);

  // Шарики
  for (let b of balls) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  }

  // Траектория для перетаскиваемого шарика
  if (isDragging && dragTarget) {
    drawTrajectory(dragTarget);
  }
}

// ── Траектория ─────────────────────────────────
function drawTrajectory(b) {
  const dx = b.x - dragNow.x;
  const dy = b.y - dragNow.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 10) return;

  const speed = Math.min(dist * 4, MAX_SPEED);
  const vx = (dx / dist) * speed;
  const vy = (dy / dist) * speed;

  const NUM_DOTS  = 20;
  const TIME_STEP = 0.05;
  const MAX_RADIUS = 2.3;
  const MIN_RADIUS = 0.8;

  const power    = speed / MAX_SPEED;
  const dotCount = Math.max(2, Math.round(NUM_DOTS * power));

  let px = b.x;
  let py = b.y;
  let pvx = vx;
  let pvy = vy;

  for (let i = 0; i < dotCount; i++) {
    pvy += GRAVITY * TIME_STEP;
    pvx *= FRICTION;
    pvy *= FRICTION;
    px  += pvx * TIME_STEP;
    py  += pvy * TIME_STEP;

    if (px < WALL_INNER || px > FIELD_SIZE - WALL_INNER ||
        py < WALL_INNER || py > FIELD_SIZE - WALL_INNER) break;

    const t     = i / (dotCount - 1);
    const r     = MAX_RADIUS - t * (MAX_RADIUS - MIN_RADIUS);
    const alpha = 0.8 - t * 0.5;

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }
}

// ── Игровой цикл ───────────────────────────────
let lastTime = null;

function gameLoop(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}