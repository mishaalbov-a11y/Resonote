// ── Рендер ─────────────────────────────────────
// Только отрисовка: поле, шары, точки, траектория

import {
  FIELD_SIZE, WALL_INNER, MAX_SPEED,
  GRAVITY, TRAJECTORY_DOTS, TRAJECTORY_TIME_STEP,
  TRAJECTORY_DOT_MAX_R, TRAJECTORY_DOT_MIN_R,
} from './config.js';
import { drawDots } from './dots.js';

let ctx;

export function initRenderer(canvasCtx) {
  ctx = canvasCtx;
}

// ── Главный кадр ───────────────────────────────
export function render(balls, drag) {
  drawBackground();
  drawBorder();
  drawBalls(balls);
  drawDots(ctx);
  if (drag.active && drag.target) {
    drawTrajectory(drag.target, drag.currentPos);
  }
}

// ── Фон и рамка ────────────────────────────────
function drawBackground() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, FIELD_SIZE, FIELD_SIZE);
}

function drawBorder() {
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, FIELD_SIZE - 2, FIELD_SIZE - 2);
}

// ── Шарики ─────────────────────────────────────
function drawBalls(balls) {
  ctx.fillStyle = 'white';
  for (const b of balls) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Пунктирная траектория броска ───────────────
function drawTrajectory(ball, mousePos) {
  const dx   = ball.x - mousePos.x;
  const dy   = ball.y - mousePos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 10) return;

  const speed = Math.min(dist * 4, MAX_SPEED);
  const power = speed / MAX_SPEED;
  const count = Math.max(5, Math.round(TRAJECTORY_DOTS * power));

  let px  = ball.x;
  let py  = ball.y;
  let pvx = (dx / dist) * speed;
  let pvy = (dy / dist) * speed;

  const min = WALL_INNER + ball.radius;
  const max = FIELD_SIZE - WALL_INNER - ball.radius;

  for (let i = 0; i < count; i++) {
    pvy += GRAVITY * TRAJECTORY_TIME_STEP;
    px  += pvx * TRAJECTORY_TIME_STEP;
    py  += pvy * TRAJECTORY_TIME_STEP;

    // Отскоки от стен для предпросмотра траектории
    if (px < min) { px = min; pvx = Math.abs(pvx); }
    if (px > max) { px = max; pvx = -Math.abs(pvx); }
    if (py < min) { py = min; pvy = Math.abs(pvy); }
    if (py > max) { py = max; pvy = -Math.abs(pvy); }

    const progress = i / count;
    const alpha = 1 - progress;
    const r = TRAJECTORY_DOT_MIN_R +
              (TRAJECTORY_DOT_MAX_R - TRAJECTORY_DOT_MIN_R) * (1 - progress);

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.fill();
  }
}