// ── Точки ──────────────────────────────────────

export const dots = [];

// Типы точек
export const DOT_TYPES = {
  NORMAL:   'normal',   // стандартный отскок
  SOFT:     'soft',     // замедляет шарик
  ELASTIC:  'elastic',  // ускоряет шарик
};

// Коэффициент отскока для каждого типа
export const DOT_BOUNCE = {
  normal:  1.0,
  soft:    0.6,
  elastic: 1.4,
};

// Фабрика точки
export function createDot(x, y, radius = 8, type = DOT_TYPES.NORMAL) {
  return { x, y, radius, type };
}

// Добавить точку
export function addDot(x, y, radius, type) {
  dots.push(createDot(x, y, radius, type));
}

// Удалить точку по индексу
export function removeDot(index) {
  dots.splice(index, 1);
}

// Отрисовка всех точек
export function drawDots(ctx) {
  for (let d of dots) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);

    if (d.type === DOT_TYPES.ELASTIC) {
      // Упругая — яркий чёткий контур
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (d.type === DOT_TYPES.SOFT) {
      // Мягкая — заполненная с меньшей яркостью
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
    } else {
      // Обычная — заполненная белая
      ctx.fillStyle = 'white';
      ctx.fill();
    }
  }
}

// Проверка столкновения шарика с точками
// Возвращает индекс точки с которой столкнулись или -1
export function resolveDotsCollision(ball) {
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i];
    const dx = ball.x - d.x;
    const dy = ball.y - d.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const minDist = ball.radius + d.radius;

    if (dist >= minDist || dist === 0) continue;

    // Нормаль отскока
    const nx = dx / dist;
    const ny = dy / dist;

    // Выталкиваем шарик
    const overlap = minDist - dist;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    // Отражаем скорость по нормали с коэффициентом типа точки
    const bounce = DOT_BOUNCE[d.type];
    const dot = ball.vx * nx + ball.vy * ny;
    ball.vx = (ball.vx - 2 * dot * nx) * bounce;
    ball.vy = (ball.vy - 2 * dot * ny) * bounce;

    return i; // вернули индекс точки — пригодится для звука
  }
  return -1;
}