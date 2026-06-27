// ── Точки-ноты ─────────────────────────────────

export const dots = [];

// Типы точек
export const DOT_TYPES = {
  NORMAL:  'normal',
  SOFT:    'soft',
  ELASTIC: 'elastic',
};

// Коэффициент отскока для каждого типа
export const DOT_BOUNCE = {
  normal:  1.0,
  soft:    0.6,
  elastic: 1.4,
};

// ── Фабрика точки ──────────────────────────────
export function createDot(x, y, radius = 8, type = DOT_TYPES.NORMAL) {
  return { x, y, radius, type };
}

// ── CRUD ───────────────────────────────────────
export function addDot(x, y, radius, type) {
  dots.push(createDot(x, y, radius, type));
}

export function removeDot(index) {
  dots.splice(index, 1);
}

// ── Отрисовка ──────────────────────────────────
export function drawDots(ctx) {
  for (const d of dots) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);

    if (d.type === DOT_TYPES.ELASTIC) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (d.type === DOT_TYPES.SOFT) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
    } else {
      ctx.fillStyle = 'white';
      ctx.fill();
    }
  }
}

// ── Физика столкновений ────────────────────────
// Возвращает индекс точки попадания или -1
export function resolveDotsCollision(ball) {
  for (let i = 0; i < dots.length; i++) {
    const d    = dots[i];
    const dx   = ball.x - d.x;
    const dy   = ball.y - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = ball.radius + d.radius;

    if (dist >= minDist || dist === 0) continue;

    const nx = dx / dist;
    const ny = dy / dist;

    // Выталкиваем шарик из точки
    ball.x += nx * (minDist - dist);
    ball.y += ny * (minDist - dist);

    // Отражаем скорость с коэффициентом типа точки
    const bounce  = DOT_BOUNCE[d.type] ?? DOT_BOUNCE.normal;
    const dotProd = ball.vx * nx + ball.vy * ny;
    ball.vx = (ball.vx - 2 * dotProd * nx) * bounce;
    ball.vy = (ball.vy - 2 * dotProd * ny) * bounce;

    return i;
  }
  return -1;
}