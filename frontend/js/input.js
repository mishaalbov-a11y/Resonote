// ── Обработка ввода ────────────────────────────
// Вся логика мыши: бросок шарика, добавление/удаление точек и шариков

import {
  FIELD_SIZE, WALL_INNER, MAX_BALLS, MAX_SPEED,
  DRAG_DETECT_RADIUS_MULTIPLIER, DRAG_MIN_DIST,
} from './config.js';
import { state, MODE, createBall } from './state.js';
import { dots, addDot, removeDot } from './dots.js';

// Сохраняем rect canvas для пересчёта координат вне canvas-событий
let _canvasRect = { left: 0, top: 0 };

export function updateCanvasRect(canvas) {
  _canvasRect = canvas.getBoundingClientRect();
}

// ── Инициализация ──────────────────────────────
export function initInput(canvas) {
  updateCanvasRect(canvas);
  window.addEventListener('resize', () => updateCanvasRect(canvas));

  canvas.addEventListener('mousedown',   (e) => onMouseDown(e, canvas));
  canvas.addEventListener('contextmenu', (e) => onRightClick(e, canvas));
  canvas.addEventListener('click',       (e) => onCanvasClick(e, canvas));
  window.addEventListener('blur', onWindowBlur);
}

// ── Позиция мыши относительно canvas ──────────
function getPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getPosFromRect(e) {
  return { x: e.clientX - _canvasRect.left, y: e.clientY - _canvasRect.top };
}

// ── Mousedown: захват или создание шарика ──────
function onMouseDown(e, canvas) {
  if (e.button !== 0) return;
  if (state.mode !== MODE.PLAY) return;

  const pos = getPos(e, canvas);

  // Захватываем существующий шарик
  for (const b of state.balls) {
    const dx = pos.x - b.x;
    const dy = pos.y - b.y;
    if (Math.sqrt(dx * dx + dy * dy) <= b.radius * DRAG_DETECT_RADIUS_MULTIPLIER) {
      b.active = false;
      b.vx = 0;
      b.vy = 0;
      startDrag(b, pos);
      return;
    }
  }

  // Создаём новый шарик если есть слот
  if (state.balls.length >= MAX_BALLS) return;

  const margin = WALL_INNER + 6;
  const x = Math.max(margin, Math.min(FIELD_SIZE - margin, pos.x));
  const y = Math.max(margin, Math.min(FIELD_SIZE - margin, pos.y));
  const b = createBall(x, y);
  state.balls.push(b);
  startDrag(b, pos);
}

// ── Начало drag ────────────────────────────────
function startDrag(ball, pos) {
  state.drag.active = true;
  state.drag.target = ball;
  state.drag.currentPos = { ...pos };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup',   onMouseUp);
}

// ── Движение мыши ──────────────────────────────
function onMouseMove(e) {
  if (!state.drag.active) return;
  state.drag.currentPos = getPosFromRect(e);
}

// ── Mouseup: бросок ────────────────────────────
function onMouseUp(e) {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup',   onMouseUp);

  if (!state.drag.active) return;

  const pos    = getPosFromRect(e);
  const target = state.drag.target;

  state.drag.active = false;
  state.drag.target = null;

  const dx   = target.x - pos.x;
  const dy   = target.y - pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Слишком короткое оттягивание — активируем шарик на месте без броска
  if (dist < DRAG_MIN_DIST) {
    target.active = true;
    return;
  }

  const speed  = Math.min(dist * 4, MAX_SPEED);
  target.vx    = (dx / dist) * speed;
  target.vy    = (dy / dist) * speed;
  target.active = true;
}

// ── ПКМ: удаление точки (Edit) или шарика (Play) ──
function onRightClick(e, canvas) {
  e.preventDefault();
  const pos = getPos(e, canvas);

  if (state.mode === MODE.EDIT) {
    for (let i = 0; i < dots.length; i++) {
      const d  = dots[i];
      const dx = pos.x - d.x;
      const dy = pos.y - d.y;
      if (Math.sqrt(dx * dx + dy * dy) <= d.radius * 2) {
        removeDot(i);
        return;
      }
    }
    return;
  }

  if (state.mode === MODE.PLAY) {
    for (let i = 0; i < state.balls.length; i++) {
      const b  = state.balls[i];
      const dx = pos.x - b.x;
      const dy = pos.y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) <= b.radius * DRAG_DETECT_RADIUS_MULTIPLIER) {
        state.balls.splice(i, 1);
        return;
      }
    }
  }
}

// ── Клик в режиме Edit: добавление точки ──────
function onCanvasClick(e, canvas) {
  if (state.mode !== MODE.EDIT) return;
  const pos = getPos(e, canvas);

  const margin = WALL_INNER + 8;
  const x = Math.max(margin, Math.min(FIELD_SIZE - margin, pos.x));
  const y = Math.max(margin, Math.min(FIELD_SIZE - margin, pos.y));
  addDot(x, y);
}

// ── Сброс drag при потере фокуса окна ─────────
function onWindowBlur() {
  if (!state.drag.active) return;
  state.drag.active = false;
  state.drag.target = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup',   onMouseUp);
}