const FIELD_SIZE = 600;
const BALL_RADIUS = 6;

const GRAVITY   = 800;
const FRICTION  = 0.995;
const BOUNCE    = 0.75;
const MIN_SPEED = 5;
const MAX_SPEED = 1200; // максимальная скорость броска
const WALL_INNER = 2; // внутренний край рамки (половина lineWidth × 2)

let canvas, ctx;

let ball = {
  x: FIELD_SIZE / 2,
  y: FIELD_SIZE / 2,
  vx: 0,
  vy: 0,
  radius: BALL_RADIUS,
  active: false  // ждёт броска
};

// ── Состояние броска ───────────────────────────
let isDragging = false;
let dragStart  = { x: 0, y: 0 };
let dragNow    = { x: 0, y: 0 };

export function initCanvas(canvasElement) {
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  canvas.width  = FIELD_SIZE;
  canvas.height = FIELD_SIZE;

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
  // Начинаем тянуть только если кликнули по шарику
  const pos = getPos(e);
  const dx = pos.x - ball.x;
  const dy = pos.y - ball.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= ball.radius * 3) { // небольшая зона захвата вокруг шарика
    isDragging = true;
    dragStart  = { ...pos };
    dragNow    = { ...pos };
    ball.active = false; // останавливаем шарик пока тянем
    ball.vx = 0;
    ball.vy = 0;
  }
}

function onMouseMove(e) {
  if (!isDragging) return;
  dragNow = getPos(e);
}

function onMouseUp(e) {
  if (!isDragging) return;
  isDragging = false;

  dragNow = getPos(e);

  // Вектор оттяжки — от текущей позиции мыши к шарику
  const dx = ball.x - dragNow.x;
  const dy = ball.y - dragNow.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Минимальная оттяжка 10px
  if (dist < 10) return;

  // Скорость пропорциональна оттяжке, ограничена MAX_SPEED
  const speed = Math.min(dist * 4, MAX_SPEED);
  ball.vx = (dx / dist) * speed;
  ball.vy = (dy / dist) * speed;
  ball.active = true;
}

// ── Физика ─────────────────────────────────────
function update(dt) {
  if (!ball.active) return;

  ball.vy += GRAVITY * dt;
  ball.vx *= FRICTION;
  ball.vy *= FRICTION;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x - ball.radius <= WALL_INNER) {
  ball.x = WALL_INNER + ball.radius;
  ball.vx = Math.abs(ball.vx) * BOUNCE;
}
if (ball.x + ball.radius >= FIELD_SIZE - WALL_INNER) {
  ball.x = FIELD_SIZE - WALL_INNER - ball.radius;
  ball.vx = -Math.abs(ball.vx) * BOUNCE;
}
if (ball.y - ball.radius <= WALL_INNER) {
  ball.y = WALL_INNER + ball.radius;
  ball.vy = Math.abs(ball.vy) * BOUNCE;
}
if (ball.y + ball.radius >= FIELD_SIZE - WALL_INNER) {
  ball.y = FIELD_SIZE - WALL_INNER - ball.radius;
  ball.vy = -Math.abs(ball.vy) * BOUNCE;
}

  const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
  if (speed < MIN_SPEED && ball.y + ball.radius >= FIELD_SIZE - WALL_INNER - 1) {
  ball.vx = 0;
  ball.vy = 0;
  ball.active = false;
}
}

// ── Отрисовка ──────────────────────────────────
function draw() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, FIELD_SIZE, FIELD_SIZE);

  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, FIELD_SIZE - 2, FIELD_SIZE - 2);

  // Линия оттяжки пока тянем
  if (isDragging) {
     drawTrajectory();
  }

  // Шарик
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
}

function drawTrajectory() {
  const dx = ball.x - dragNow.x;
  const dy = ball.y - dragNow.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 10) return;

  // Начальная скорость — та же формула что в onMouseUp
  const speed = Math.min(dist * 4, MAX_SPEED);
  const vx = (dx / dist) * speed;
  const vy = (dy / dist) * speed;

  const NUM_DOTS = 20;        // максимум точек
  const TIME_STEP = 0.05;     // было 0.06 — точки чаще, расстояние между ними меньше
  const MAX_RADIUS = 2.3;     // было 5 — ближняя точка меньше шарика (шарик = 6)
  const MIN_RADIUS = 0.8;     // было 1.5 — дальняя точка совсем маленькая

  // Нормализуем импульс: 0..1 относительно MAX_SPEED
  const power = Math.min(dist * 4, MAX_SPEED) / MAX_SPEED;
  // Количество точек зависит от силы броска
  const dotCount = Math.max(2, Math.round(NUM_DOTS * power));

  let px = ball.x;
  let py = ball.y;
  let pvx = vx;
  let pvy = vy;

  for (let i = 0; i < dotCount; i++) {
    // Симулируем физику
    pvy += GRAVITY * TIME_STEP;
    pvx *= FRICTION;
    pvy *= FRICTION;
    px += pvx * TIME_STEP;
    py += pvy * TIME_STEP;

    // Останавливаем если вышли за пределы поля
    if (px < WALL_INNER || px > FIELD_SIZE - WALL_INNER ||
        py < WALL_INNER || py > FIELD_SIZE - WALL_INNER) break;

    // Радиус и прозрачность уменьшаются с расстоянием
    const t = i / (dotCount - 1);           // 0 = близко, 1 = далеко
    const r = MAX_RADIUS - t * (MAX_RADIUS - MIN_RADIUS);
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