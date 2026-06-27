// ── Состояние игры ─────────────────────────────
// Единый объект, описывающий всё текущее состояние

import { BALL_RADIUS } from './config.js';

// Режимы игры
export const MODE = {
  PLAY: 'play',
  EDIT: 'edit',
};

// Фабрика шарика — здесь, потому что знает структуру объекта
export function createBall(x, y) {
  return { x, y, vx: 0, vy: 0, radius: BALL_RADIUS, active: false };
}

// Центральный объект состояния
export const state = {
  mode: MODE.PLAY,

  balls: [],

  // Drag-состояние (прицеливание и бросок)
  drag: {
    active: false,
    target: null,
    currentPos: { x: 0, y: 0 },
  },

  audio: {
    samplesLoaded: false,
  },
};