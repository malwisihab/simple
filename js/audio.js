// ========================================================
// SimpleCommunicate - Aesthetic Audio Synthesizer
// Pure Web Audio API: 10 pilihan nada kangen
// ========================================================

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.currentTone = localStorage.getItem('simplecom_tone') || 'kalimba';
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setTone(toneName) {
    this.currentTone = toneName;
    localStorage.setItem('simplecom_tone', toneName);
  }

  // Nama nada -> frekuensi (contoh: 'C5', 'F#4')
  static noteFreq(name) {
    const map = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    const m = /^([A-G]#?)(\d)$/.exec(name);
    if (!m) return 440;
    const midi = (parseInt(m[2], 10) + 1) * 12 + map[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Mainkan satu nada (bisa berlapis partial supaya terdengar seperti alat musik)
  _note(freq, time, opts) {
    const o = Object.assign(
      { type: 'sine', gain: 0.15, attack: 0.01, decay: 0.8, partials: [[1, 1]] },
      opts || {}
    );
    o.partials.forEach(([ratio, mul]) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      osc.type = o.type;
      osc.frequency.setValueAtTime(freq * ratio, time);

      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(o.gain * mul, time + o.attack);
      g.gain.exponentialRampToValueAtTime(0.0001, time + o.attack + o.decay);

      osc.connect(g);
      g.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + o.attack + o.decay + 0.05);
    });
  }

  // events = [['C5', 0], ['E5', 0.14], ...]  (nada, waktu mulai dalam detik)
  _play(events, opts) {
    const now = this.ctx.currentTime;
    events.forEach(([name, t]) => {
      this._note(SoundManager.noteFreq(name), now + t, opts);
    });
  }

  // ---- Titik masuk utama ----
  playKangenAlert(toneOverride) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const tone = toneOverride || this.currentTone;

    switch (tone) {
      case 'musicbox':  this.playMusicBoxMelody(); break;
      case 'heartbeat': this.playHeartbeatMelody(); break;
      case 'piano':     this.playPianoMelody(); break;
      case 'bell':      this.playBellMelody(); break;
      case 'harp':      this.playHarpMelody(); break;
      case 'marimba':   this.playMarimbaMelody(); break;
      case 'sparkle':   this.playSparkleMelody(); break;
      case 'lullaby':   this.playLullabyMelody(); break;
      case 'dingdong':  this.playDingDongMelody(); break;
      default:          this.playKalimbaMelody();
    }
  }

  // 1. Kalimba (arpeggio hangat)
  playKalimbaMelody() {
    const now = this.ctx.currentTime;
    const notes = [739.99, 932.33, 1108.73, 1479.98];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.9);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.95);
    });
  }

  // 2. Kotak Musik (denting tinggi seperti peri)
  playMusicBoxMelody() {
    const now = this.ctx.currentTime;
    const notes = [1318.51, 1661.22, 1975.53, 2637.02];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);

      gain.gain.setValueAtTime(0, now + idx * 0.11);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.11 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.85);
    });
  }

  // 3. Detak Jantung
  playHeartbeatMelody() {
    const now = this.ctx.currentTime;

    this.createThump(now, 85, 30);
    this.createThump(now + 0.18, 70, 25);

    const shimmer = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(587.33, now + 0.2);
    sGain.gain.setValueAtTime(0.08, now + 0.2);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    shimmer.connect(sGain);
    sGain.connect(this.ctx.destination);
    shimmer.start(now + 0.2);
    shimmer.stop(now + 0.85);
  }

  createThump(time, startFreq, endFreq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.15);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  // 4. Piano Lembut
  playPianoMelody() {
    this._play(
      [['C5', 0], ['E5', 0.15], ['G5', 0.3], ['C6', 0.45], ['E6', 0.7], ['G5', 1.0], ['C6', 1.25]],
      { type: 'triangle', gain: 0.16, decay: 1.1, partials: [[1, 1], [2, 0.25], [3, 0.1]] }
    );
  }

  // 5. Lonceng
  playBellMelody() {
    this._play(
      [['G5', 0], ['C6', 0.4], ['E6', 0.8], ['C6', 1.4]],
      { type: 'sine', gain: 0.14, attack: 0.005, decay: 1.8, partials: [[1, 1], [2.76, 0.35], [5.4, 0.15]] }
    );
  }

  // 6. Harpa (petikan cepat naik)
  playHarpMelody() {
    this._play(
      [['C5', 0], ['E5', 0.08], ['G5', 0.16], ['B5', 0.24], ['D6', 0.32], ['G6', 0.4], ['D6', 0.7], ['B5', 0.78]],
      { type: 'triangle', gain: 0.14, attack: 0.008, decay: 1.2, partials: [[1, 1], [2, 0.2]] }
    );
  }

  // 7. Marimba (ceria dan pendek)
  playMarimbaMelody() {
    this._play(
      [['C5', 0], ['E5', 0.13], ['G5', 0.26], ['E5', 0.39], ['C5', 0.52], ['G5', 0.65], ['C6', 0.78], ['C6', 1.0]],
      { type: 'sine', gain: 0.22, attack: 0.005, decay: 0.35, partials: [[1, 1], [4, 0.2]] }
    );
  }

  // 8. Bintang (kerlap-kerlip turun)
  playSparkleMelody() {
    this._play(
      [
        ['C7', 0], ['B6', 0.07], ['G6', 0.14], ['E6', 0.21], ['D6', 0.28], ['C6', 0.35],
        ['E7', 0.6], ['C7', 0.67], ['G6', 0.74], ['E6', 0.81]
      ],
      { type: 'sine', gain: 0.09, attack: 0.005, decay: 0.6 }
    );
  }

  // 9. Nina Bobo (melodi lambat dan menenangkan)
  playLullabyMelody() {
    this._play(
      [['E5', 0], ['G5', 0.3], ['E5', 0.6], ['C5', 0.9], ['D5', 1.2], ['E5', 1.5], ['G5', 1.9]],
      { type: 'triangle', gain: 0.16, attack: 0.03, decay: 0.9, partials: [[1, 1], [2, 0.12]] }
    );
  }

  // 10. Ding Dong (bel pintu)
  playDingDongMelody() {
    this._play(
      [['E5', 0], ['C5', 0.55]],
      { type: 'sine', gain: 0.18, attack: 0.005, decay: 1.4, partials: [[1, 1], [2, 0.3], [3, 0.1]] }
    );
  }

  // Suara ketukan kecil untuk tombol
  playSoftTap() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Ding catatan masuk
  playNoteDing() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1046.5, now + 0.08);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }
}

window.soundManager = new SoundManager();