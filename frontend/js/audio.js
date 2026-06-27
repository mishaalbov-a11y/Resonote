// ── AudioEngine ────────────────────────────────
// Инкапсулирует Web Audio API, загрузку семплов и воспроизведение

// Базовые MIDI-ноты семплов
const SAMPLE_BASE_MIDI = {
  piano:  60,
  harp:   60,
  bell:   60,
  guitar: 52,
  organ:  48,
  bass:   31,
};

// Огибающие инструментов
const SAMPLE_ENV = {
  piano:  { attack: 0.008, release: 2.5, vol: 0.85 },
  harp:   { attack: 0.004, release: 2.0, vol: 0.80 },
  bell:   { attack: 0.003, release: 3.5, vol: 0.75 },
  guitar: { attack: 0.012, release: 1.8, vol: 0.80 },
  organ:  { attack: 0.06,  release: 1.2, vol: 0.70 },
  bass:   { attack: 0.010, release: 1.0, vol: 0.90 },
};

// Пентатонические гаммы (MIDI)
const SCALES = {
  C:  [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 79, 76, 74, 72],
  Am: [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 79, 76, 74, 72, 69],
  F:  [53, 55, 57, 60, 62, 65, 67, 69, 72, 74, 77, 74, 72, 69, 67, 65],
  Dm: [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74, 72, 69, 67, 65, 62],
};

const ROW_OCTAVE = [0, -12, -24, -36, -36, 0, 0, 0];

class AudioEngine {
  constructor() {
    this._ctx        = null;
    this._masterGain = null;
    this._buffers    = {};
  }

  // ── Инициализация (вызывать после жеста пользователя) ──
  init() {
    if (this._ctx) return;
    this._ctx = new AudioContext();
    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = 0.7;
    this._masterGain.connect(this._ctx.destination);
  }

  get ready() {
    return this._ctx !== null;
  }

  // ── Загрузка всех семплов ──────────────────────
  async loadAllSamples() {
    if (!this._ctx) return;
    const files = [
      'piano', 'harp', 'bell', 'guitar', 'organ', 'bass',
      'kick', 'snare', 'hihat', 'drum4',
    ];
    await Promise.all(files.map(name => this._loadSample(name, `./samples/${name}.wav`)));
  }

  async _loadSample(name, url) {
    try {
      const response    = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this._buffers[name] = await this._ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error(`Ошибка загрузки семпла "${name}":`, e);
    }
  }

  // ── Воспроизведение ноты ───────────────────────
  playSample(instrument, targetMidi, time = null) {
    if (!this._ctx || !this._masterGain) return;
    if (!this._buffers[instrument]) return;

    const t         = time ?? this._ctx.currentTime;
    const env       = SAMPLE_ENV[instrument] ?? { attack: 0.01, release: 1.5, vol: 0.8 };
    const jitter    = (Math.random() - 0.5) * 0.025;
    const volMult   = 0.88 + Math.random() * 0.24;
    const startTime = t + Math.max(0, jitter);

    const src  = this._ctx.createBufferSource();
    const gain = this._ctx.createGain();

    src.buffer = this._buffers[instrument];
    src.playbackRate.value = Math.pow(2, (targetMidi - (SAMPLE_BASE_MIDI[instrument] ?? 60)) / 12);

    const peak = env.vol * volMult;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + env.attack);
    gain.gain.linearRampToValueAtTime(0, startTime + env.release);

    src.connect(gain);
    gain.connect(this._masterGain);
    src.start(startTime);
  }

  // ── Воспроизведение ударных (без транспонирования) ──
  playDrum(instrument, time = null) {
    if (!this._ctx || !this._masterGain) return;
    if (!this._buffers[instrument]) return;

    const t       = time ?? this._ctx.currentTime;
    const volMult = 0.88 + Math.random() * 0.24;

    const src  = this._ctx.createBufferSource();
    const gain = this._ctx.createGain();

    src.buffer = this._buffers[instrument];
    src.playbackRate.value = 1.0;

    gain.gain.setValueAtTime(0.85 * volMult, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    src.connect(gain);
    gain.connect(this._masterGain);
    src.start(t);
  }

  // ── Получение MIDI-ноты по сетке ──────────────
  getNoteMidi(col, row, key = 'C') {
    const scale = SCALES[key] ?? SCALES['C'];
    return scale[col] + ROW_OCTAVE[row];
  }

  getNoteFreq(col, row, key = 'C') {
    return 440 * Math.pow(2, (this.getNoteMidi(col, row, key) - 69) / 12);
  }
}

// Единственный экземпляр — синглтон
export const audioEngine = new AudioEngine();