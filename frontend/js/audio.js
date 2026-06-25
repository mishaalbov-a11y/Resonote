// ── AudioContext ───────────────────────────────
let audioCtx = null;
let masterGain = null;

export function initAudio() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.7;
  masterGain.connect(audioCtx.destination);
  console.log('Resonote AudioContext ready');
}

export function getAudioCtx() { return audioCtx; }

// ── Пентатоника (MIDI ноты) ────────────────────
const SCALES = {
  C:  [60, 62, 64, 67, 69,  72, 74, 76, 79, 81,  84, 86, 79, 76, 74, 72],
  Am: [57, 60, 62, 64, 67,  69, 72, 74, 76, 79,  81, 79, 76, 74, 72, 69],
  F:  [53, 55, 57, 60, 62,  65, 67, 69, 72, 74,  77, 74, 72, 69, 67, 65],
  Dm: [50, 53, 55, 57, 60,  62, 65, 67, 69, 72,  74, 72, 69, 67, 65, 62],
};

const ROW_OCTAVE = [0, -12, -24, -36, -36, 0, 0, 0];

export function getNoteMidi(col, row, key) {
  const scale = SCALES[key] || SCALES['C'];
  return scale[col] + ROW_OCTAVE[row];
}

export function getNoteFreq(col, row, key) {
  return midiToFreq(getNoteMidi(col, row, key));
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ── Семплер ────────────────────────────────────
const sampleBuffers = {};

// Базовая MIDI нота каждого семпла
// Если семпл записан на C4 = 60, транспонирование идёт от 60
const SAMPLE_BASE_MIDI = {
  piano:  60,  // C4
  harp:   60,  // C4
  bell:   60,  // C4
  guitar: 52,  // E4
  organ:  48,  // C3
  bass:   31,  // G1 — записан на G1
};

// Настройки огибающей для каждого инструмента
const SAMPLE_ENV = {
  piano:  { attack: 0.008, release: 2.5,  vol: 0.85 },
  harp:   { attack: 0.004, release: 2.0,  vol: 0.80 },
  bell:   { attack: 0.003, release: 3.5,  vol: 0.75 },
  guitar: { attack: 0.012, release: 1.8,  vol: 0.80 },
  organ:  { attack: 0.06,  release: 1.2,  vol: 0.70 },
  bass:   { attack: 0.010, release: 1.0,  vol: 0.90 },
};

async function loadSample(name, url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    sampleBuffers[name] = await audioCtx.decodeAudioData(arrayBuffer);
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ Ошибка загрузки ${name}:`, e);
  }
}

export async function loadAllSamples() {
  console.log('Загружаем семплы...');
  await Promise.all([
    loadSample('piano',  './samples/piano.wav'),
    loadSample('harp',   './samples/harp.wav'),
    loadSample('bell',   './samples/bell.wav'),
    loadSample('guitar', './samples/guitar.wav'),
    loadSample('organ',  './samples/organ.wav'),
    loadSample('bass',   './samples/bass.wav'),
    loadSample('kick',   './samples/kick.wav'),
    loadSample('snare',  './samples/snare.wav'),
    loadSample('hihat',  './samples/hihat.wav'),
    loadSample('drum4',  './samples/drum4.wav'),
  ]);
  console.log('✓ Все семплы загружены');
}

// ── Воспроизведение семпла ─────────────────────
export function playSample(inst, targetMidi, time = null) {
  if (!audioCtx || !masterGain) return;
  if (!sampleBuffers[inst]) {
    console.warn(`Семпл не загружен: ${inst}`);
    return;
  }

  const t = time ?? audioCtx.currentTime;

  // Гуманизация
  const jitter    = (Math.random() - 0.5) * 0.025;
  const volJitter = 0.88 + Math.random() * 0.24;
  const startTime = t + Math.max(0, jitter);

  const env = SAMPLE_ENV[inst] ?? { attack: 0.01, release: 1.5, vol: 0.8 };

  const src  = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();

  src.buffer = sampleBuffers[inst];

  // Транспонирование
  const baseMidi = SAMPLE_BASE_MIDI[inst] ?? 60;
  const semitones = targetMidi - baseMidi;
  src.playbackRate.value = Math.pow(2, semitones / 12);

  // Огибающая
  const peak = env.vol * volJitter;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peak, startTime + env.attack);
  gain.gain.linearRampToValueAtTime(0, startTime + env.release);

  src.connect(gain);
  gain.connect(masterGain);
  src.start(startTime);
}

// ── Воспроизведение ударных (без питча) ────────
export function playDrum(inst, time = null) {
  if (!audioCtx || !masterGain) return;
  if (!sampleBuffers[inst]) {
    console.warn(`Семпл не загружен: ${inst}`);
    return;
  }

  const t = time ?? audioCtx.currentTime;
  const volJitter = 0.88 + Math.random() * 0.24;

  const src  = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();

  src.buffer = sampleBuffers[inst];
  src.playbackRate.value = 1.0; // тон не меняем

  gain.gain.setValueAtTime(0.85 * volJitter, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

  src.connect(gain);
  gain.connect(masterGain);
  src.start(t);
}

// Удобные обёртки для ударных
export const playKick  = (t) => playDrum('kick',  t);
export const playSnare = (t) => playDrum('snare', t);
export const playHihat = (t) => playDrum('hihat', t);
export const playDrum4 = (t) => playDrum('drum4', t);