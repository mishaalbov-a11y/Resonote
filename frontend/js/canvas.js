import { dots, drawDots, resolveDotsCollision, addDot, removeDot } from './dots.js';
const FIELD_SIZE = 600;
const BALL_RADIUS = 6;

const GRAVITY    = 800;
const FRICTION   = 1.0; // 0.995
const BOUNCE = 1.0; // стены не гасят скорость
// const MIN_SPEED  = 5;
const MAX_SPEED  = 1200;
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

  canvas.addEventListener('mousedown',   onMouseDown);
  canvas.addEventListener('contextmenu', onRightClick);
  canvas.addEventListener('click', onCanvasClick);

  window.addEventListener('blur', () => {
    if (isDragging) {
      isDragging = false;
      dragTarget = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    }
  });

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
  if (e.button !== 0) return;
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
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup',   onMouseUp);
      return;
    }
  }

  // Иначе — создаём новый шарик если есть слот
  if (balls.length >= MAX_BALLS) return;

  const margin   = WALL_INNER + BALL_RADIUS;
  const clampedX = Math.max(margin, Math.min(FIELD_SIZE - margin, pos.x));
  const clampedY = Math.max(margin, Math.min(FIELD_SIZE - margin, pos.y));
  const b = createBall(clampedX, clampedY);

  balls.push(b);
  isDragging = true;
  dragTarget = b;
  dragNow    = { ...pos };
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup',   onMouseUp);
}

function onMouseMove(e) {
  if (!isDragging) return;
  dragNow = getPos(e);
}

function onMouseUp(e) {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup',   onMouseUp);

  if (!isDragging) return;
  isDragging = false;
  dragNow = getPos(e);

  const dx = dragTarget.x - dragNow.x;
  const dy = dragTarget.y - dragNow.y;
  const dist = Math.sqrt(dx*dx + dy*dy);

  if (dist < 10) {
    dragTarget.active = true;
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
  e.preventDefault();

  // Edit — удаляем точку
  if (canvas.dataset.mode === 'edit') {
    const pos = getPos(e);
    for (let i = 0; i < dots.length; i++) {
      const dx = pos.x - dots[i].x;
      const dy = pos.y - dots[i].y;
      if (Math.sqrt(dx*dx + dy*dy) <= dots[i].radius * 2) {
        removeDot(i);
        return;
      }
    }
    return;
  }

  // Play — удаляем шарик
  if (canvas.dataset.mode === 'play') {
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
}

function onCanvasClick(e) {
  if (canvas.dataset.mode !== 'edit') return;

  const pos = getPos(e);

  // Проверяем не кликнули ли на существующую точку — удаляем по ПКМ позже
  const margin = WALL_INNER + 8; // 8 = дефолтный радиус точки
  const x = Math.max(margin, Math.min(FIELD_SIZE - margin, pos.x));
  const y = Math.max(margin, Math.min(FIELD_SIZE - margin, pos.y));

  addDot(x, y);
}

// ── Физика ─────────────────────────────────────
// ── Физика ─────────────────────────────────────
const SUBSTEPS = 8; // количество субшагов за кадр

function update(dt) {
  const subDt = dt / SUBSTEPS;

  for (let step = 0; step < SUBSTEPS; step++) {
    // Двигаем все шарики
    for (let b of balls) {
      if (!b.active) continue;

      b.vy += GRAVITY * subDt;
      b.vx *= Math.pow(FRICTION, subDt / (1/60)); // корректный FRICTION для субшага
      b.vy *= Math.pow(FRICTION, subDt / (1/60));
      b.x  += b.vx * subDt;
      b.y  += b.vy * subDt;

      // Стены
      resolveWallCollision(b);
      resolveDotsCollision(b);
      // Остановка
      // const speed = Math.sqrt(b.vx**2 + b.vy**2);
      // if (speed < MIN_SPEED && b.y + b.radius >= FIELD_SIZE - WALL_INNER - 1) {
      //   b.vx = 0;
      //   b.vy = 0;
      //   b.active = false;
      // }
    }

    // Столкновения между шариками на каждом субшаге
    resolveBallCollisions();
  }
}

// ── Столкновения шариков ───────────────────────
function resolveBallCollisions() {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const minDist = a.radius + b.radius;

      if (dist >= minDist || dist === 0) continue;

      // Нормаль столкновения
      const nx = dx / dist;
      const ny = dy / dist;

      // Разводим шарики — с учётом активности
      const overlap = (minDist - dist) / 2;
      if (a.active && b.active) {
        // Оба активны — разводим поровну
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
      } else if (a.active) {
        // b стоит — двигаем только a
        a.x -= nx * overlap * 2;
        a.y -= ny * overlap * 2;
      } else if (b.active) {
        // a стоит — двигаем только b
        b.x += nx * overlap * 2;
        b.y += ny * overlap * 2;
      }

      // Относительная скорость по нормали
      const dvx = b.vx - a.vx;
      const dvy = b.vy - a.vy;
      const dot = dvx * nx + dvy * ny;

      if (dot > 0) continue;

      // Обмен импульсами с коэффициентом упругости
      const restitution = BOUNCE;
      const impulse = (1 + restitution) * dot / 2;

      a.vx += impulse * nx;
      a.vy += impulse * ny;
      b.vx -= impulse * nx;
      b.vy -= impulse * ny;

      // Активируем неподвижный шарик если в него попали
      if (!a.active && b.active) a.active = true;
      if (!b.active && a.active) b.active = true;

      // Защита от улёта за стену после активации
      a.x = Math.max(WALL_INNER + a.radius, Math.min(FIELD_SIZE - WALL_INNER - a.radius, a.x));
      a.y = Math.max(WALL_INNER + a.radius, Math.min(FIELD_SIZE - WALL_INNER - a.radius, a.y));
      b.x = Math.max(WALL_INNER + b.radius, Math.min(FIELD_SIZE - WALL_INNER - b.radius, b.x));
      b.y = Math.max(WALL_INNER + b.radius, Math.min(FIELD_SIZE - WALL_INNER - b.radius, b.y));
    }
  }
}

// ── Столкновения со стенами ────────────────────
function resolveWallCollision(b) {
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
  drawDots(ctx);
  // Траектория
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

  const NUM_DOTS   = 20;
  const TIME_STEP  = 0.05;
  const MAX_RADIUS = 2.3;
  const MIN_RADIUS = 0.8;

  const power    = speed / MAX_SPEED;
  const dotCount = Math.max(2, Math.round(NUM_DOTS * power));

  let px = b.x, py = b.y;
  let pvx = vx, pvy = vy;

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