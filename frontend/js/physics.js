// ── Физика ─────────────────────────────────────
// Чистые функции: обновление позиций, отскоки, столкновения

import {
  GRAVITY, FRICTION, BOUNCE,
  SUBSTEPS, FIELD_SIZE, WALL_INNER,
} from './config.js';
import { resolveDotsCollision } from './dots.js';

// ── Главный шаг симуляции ──────────────────────
// Возвращает массив индексов точек, в которые попали за этот кадр
export function updatePhysics(balls, dt) {
  const subDt = dt / SUBSTEPS;
  const hitDotIndices = [];

  for (let step = 0; step < SUBSTEPS; step++) {
    for (const b of balls) {
      if (!b.active) continue;
      stepBall(b, subDt);
      resolveWallCollision(b);
      const hitIndex = resolveDotsCollision(b);
      if (hitIndex !== -1) hitDotIndices.push(hitIndex);
    }
    resolveBallCollisions(balls);
  }

  return hitDotIndices;
}

// ── Шаг одного шарика ─────────────────────────
function stepBall(b, subDt) {
  b.vy += GRAVITY * subDt;
  const frictionFactor = Math.pow(FRICTION, subDt / (1 / 60));
  b.vx *= frictionFactor;
  b.vy *= frictionFactor;
  b.x  += b.vx * subDt;
  b.y  += b.vy * subDt;
}

// ── Отскок от стен ─────────────────────────────
function resolveWallCollision(b) {
  const min = WALL_INNER + b.radius;
  const max = FIELD_SIZE - WALL_INNER - b.radius;

  if (b.x < min) { b.x = min; b.vx =  Math.abs(b.vx) * BOUNCE; }
  if (b.x > max) { b.x = max; b.vx = -Math.abs(b.vx) * BOUNCE; }
  if (b.y < min) { b.y = min; b.vy =  Math.abs(b.vy) * BOUNCE; }
  if (b.y > max) { b.y = max; b.vy = -Math.abs(b.vy) * BOUNCE; }
}

// ── Столкновения между шариками ────────────────
function resolveBallCollisions(balls) {
  const bound = { min: WALL_INNER, max: FIELD_SIZE - WALL_INNER };

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];

      const dx   = b.x - a.x;
      const dy   = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.radius + b.radius;

      if (dist >= minDist || dist === 0) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = (minDist - dist) / 2;

      // Расталкиваем с учётом активности
      if (a.active && b.active) {
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
      } else if (a.active) {
        a.x -= nx * overlap * 2;
        a.y -= ny * overlap * 2;
      } else if (b.active) {
        b.x += nx * overlap * 2;
        b.y += ny * overlap * 2;
      }

      // Обмен импульсами
      const dvx = b.vx - a.vx;
      const dvy = b.vy - a.vy;
      const relVelDot = dvx * nx + dvy * ny;
      if (relVelDot > 0) continue;

      const impulse = (1 + BOUNCE) * relVelDot / 2;
      a.vx += impulse * nx;
      a.vy += impulse * ny;
      b.vx -= impulse * nx;
      b.vy -= impulse * ny;

      // Активируем неподвижный шарик если в него попали
      if (!a.active && b.active) a.active = true;
      if (!b.active && a.active) b.active = true;

      // Защита от выхода за стену после активации
      clampBall(a, bound);
      clampBall(b, bound);
    }
  }
}

// ── Удержание шарика в границах поля ──────────
function clampBall(b, bound) {
  b.x = Math.max(bound.min + b.radius, Math.min(bound.max - b.radius, b.x));
  b.y = Math.max(bound.min + b.radius, Math.min(bound.max - b.radius, b.y));
}