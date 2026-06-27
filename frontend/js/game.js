// ── Game ───────────────────────────────────────
// Оркестратор: инициализация, игровой цикл, связь модулей

import { FIELD_SIZE } from './config.js';
import { state, MODE } from './state.js';
import { updatePhysics } from './physics.js';
import { initRenderer, render } from './renderer.js';
import { initInput } from './input.js';
import { audioEngine } from './audio.js';

let lastTime;

// ── Инициализация ──────────────────────────────
export function initGame(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width  = FIELD_SIZE;
  canvas.height = FIELD_SIZE;

  initRenderer(ctx);
  initInput(canvas);

  // Preload аудио при наведении — до первого клика
  canvas.addEventListener('mouseenter', onFirstEnter, { once: true });

  // Активация AudioContext требует жеста пользователя
  canvas.addEventListener('mousedown', onFirstInteraction, { once: true });

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// ── Переключение режима (вызывается из index.html) ──
export function setMode(mode) {
  state.mode = mode;
}

// ── Preload при наведении ──────────────────────
function onFirstEnter() {
  audioEngine.init();
  if (!state.audio.samplesLoaded) {
    state.audio.samplesLoaded = true;
    audioEngine.loadAllSamples();
  }
}

// ── Активация AudioContext на первом клике ─────
function onFirstInteraction() {
  audioEngine.init();
  if (!state.audio.samplesLoaded) {
    state.audio.samplesLoaded = true;
    audioEngine.loadAllSamples();
  }
}

// ── Игровой цикл ───────────────────────────────
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  const hitIndices = updatePhysics(state.balls, dt);
  hitIndices.forEach(() => playHitSound());

  render(state.balls, state.drag);
  requestAnimationFrame(gameLoop);
}

// ── Звук попадания в точку ─────────────────────
const AM_PENTATONIC = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79];

function playHitSound() {
  const midi = AM_PENTATONIC[Math.floor(Math.random() * AM_PENTATONIC.length)];
  audioEngine.playSample('piano', midi);
}