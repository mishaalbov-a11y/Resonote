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

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function getNoteFreq(col, row, key) {
  const scale = SCALES[key] || SCALES['C'];
  const midi = scale[col] + ROW_OCTAVE[row];
  return midiToFreq(midi);
}

export function getNoteMidi(col, row, key) {
  const scale = SCALES[key] || SCALES['C'];
  return scale[col] + ROW_OCTAVE[row];
}

// ── Семплер ────────────────────────────────────
const sampleBuffers = {};

// Базовая нота семпла — C4 = MIDI 60
// Если твой файл записан на другой ноте — измени это число
const SAMPLE_BASE_MIDI = {
  piano: 60,  // C4
};

export async function loadSample(name, url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    sampleBuffers[name] = await audioCtx.decodeAudioData(arrayBuffer);
    console.log(`✓ Семпл загружен: ${name}`);
  } catch (e) {
    console.error(`✗ Ошибка загрузки семпла ${name}:`, e);
  }
}

export async function loadAllSamples() {
  await loadSample('piano', './samples/piano.wav');
  // Сюда позже добавим остальные инструменты
}

// ── Воспроизведение семпла ─────────────────────
export function playSample(inst, targetMidi, time = null) {
  if (!audioCtx || !masterGain) return;
  if (!sampleBuffers[inst]) {
    console.warn(`Семпл ${inst} не загружен`);
    return;
  }

  const t = time ?? audioCtx.currentTime;

  // Гуманизация
  const jitter    = (Math.random() - 0.5) * 0.025;
  const volJitter = 0.88 + Math.random() * 0.24;
  const startTime = t + Math.max(0, jitter);

  const src  = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();

  src.buffer = sampleBuffers[inst];

  // Транспонирование через playbackRate
  const semitones = targetMidi - (SAMPLE_BASE_MIDI[inst] ?? 60);
  src.playbackRate.value = Math.pow(2, semitones / 12);

  // Огибающая
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.85 * volJitter, startTime + 0.008);
  gain.gain.linearRampToValueAtTime(0, startTime + 2.5);

  src.connect(gain);
  gain.connect(masterGain);
  src.start(startTime);
}

// ── Ударные (синтез) ───────────────────────────
export function playKick(time = null) {
  if (!audioCtx || !masterGain) return;
  const t = time ?? audioCtx.currentTime;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
  gain.gain.setValueAtTime(0.9, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  osc.connect(gain); gain.connect(masterGain);
  osc.start(t); osc.stop(t + 0.3);
}

export function playSnare(time = null) {
  if (!audioCtx || !masterGain) return;
  const t = time ?? audioCtx.currentTime;
  const buf  = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.15, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src    = audioCtx.createBufferSource();
  const gain   = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  src.buffer = buf;
  filter.type = 'highpass'; filter.frequency.value = 1200;
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  src.connect(filter); filter.connect(gain); gain.connect(masterGain);
  src.start(t); src.stop(t + 0.18);
}

export function playHihat(time = null) {
  if (!audioCtx || !masterGain) return;
  const t = time ?? audioCtx.currentTime;
  const buf  = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src    = audioCtx.createBufferSource();
  const gain   = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  src.buffer = buf;
  filter.type = 'highpass'; filter.frequency.value = 7000;
  gain.gain.setValueAtTime(0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
  src.connect(filter); filter.connect(gain); gain.connect(masterGain);
  src.start(t); src.stop(t + 0.06);
}