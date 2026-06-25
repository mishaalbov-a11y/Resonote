const FIELD_SIZE = 600;
const BALL_RADIUS = 6;

const GRAVITY   = 800;
const FRICTION  = 0.995;
const BOUNCE    = 0.75;
const MIN_SPEED = 5;
const MAX_SPEED = 1200; // максимальная скорость броска

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

  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx) * BOUNCE;
  }
  if (ball.x + ball.radius >= FIELD_SIZE) {
    ball.x = FIELD_SIZE - ball.radius;
    ball.vx = -Math.abs(ball.vx) * BOUNCE;
  }
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy) * BOUNCE;
  }
  if (ball.y + ball.radius >= FIELD_SIZE) {
    ball.y = FIELD_SIZE - ball.radius;
    ball.vy = -Math.abs(ball.vy) * BOUNCE;
  }

  const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
  if (speed < MIN_SPEED && ball.y + ball.radius >= FIELD_SIZE - 1) {
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
    // Пунктирная линия от шарика до мыши
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(dragNow.x, dragNow.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Стрелка направления полёта (противоположно оттяжке)
    const dx = ball.x - dragNow.x;
    const dy = ball.y - dragNow.y;
    drawArrow(ball.x, ball.y, ball.x + dx, ball.y + dy);
  }

  // Шарик
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
}

function drawArrow(x1, y1, x2, y2) {
  const headLen = 10;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Наконечник
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6),
             y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6),
             y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
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