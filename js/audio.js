// Процедурный звук на Web Audio API: никаких аудиофайлов, всё синтезируется на лету.

const NOTE = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, Ds5: 622.3, E5: 659.3, G5: 784, B5: 987.8, C6: 1046.5, A3: 220, B3: 246.9, F3: 174.6, G3: 196, E3: 164.8, Gs3: 207.7 };

const MOODS = {
  tension: [
    [NOTE.A3, NOTE.C4, NOTE.E4],
    [NOTE.F3, NOTE.A3, NOTE.C4],
    [NOTE.G3, NOTE.B3, NOTE.D4],
    [NOTE.E3, NOTE.Gs3, NOTE.B3],
  ],
  calm: [
    [NOTE.A3, NOTE.C4, NOTE.E4],
    [NOTE.F3, NOTE.A3, NOTE.C4],
    [NOTE.C4, NOTE.E4, NOTE.G4],
    [NOTE.G3, NOTE.B3, NOTE.D4],
  ],
  dawn: [
    [NOTE.C4, NOTE.E4, NOTE.G4],
    [NOTE.A3, NOTE.C4, NOTE.E4],
    [NOTE.F3, NOTE.A3, NOTE.C4],
    [NOTE.G3, NOTE.B3, NOTE.D4],
  ],
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.loops = {};
    this.music = { timer: null, mood: null, step: 0 };
    this.heartBpm = 0;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      this.ctx = null;
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(c.destination);
    this.sfxBus = this._bus(0.8);
    this.musicBus = this._bus(0.3);
    this.ambBus = this._bus(0.6);
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });
  }

  _bus(vol) {
    const g = this.ctx.createGain();
    g.gain.value = vol;
    g.connect(this.master);
    return g;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  tone({ f = 440, type = 'sine', dur = 0.2, vol = 0.2, at = 0, attack = 0.005, slide = null, bus = 'sfx', lp = null, bp = null }) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t0 = c.currentTime + at;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(attack, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o;
    if (lp || bp) {
      const flt = c.createBiquadFilter();
      flt.type = lp ? 'lowpass' : 'bandpass';
      flt.frequency.value = lp || bp;
      flt.Q.value = bp ? 1.2 : 0.7;
      node.connect(flt);
      node = flt;
    }
    node.connect(g);
    g.connect(bus === 'music' ? this.musicBus : bus === 'amb' ? this.ambBus : this.sfxBus);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.2, at = 0, type = 'lowpass', f = 1000, f2 = null, q = 0.7, attack = 0.005 }) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t0 = c.currentTime + at;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const flt = c.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(f, t0);
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    flt.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(attack, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(this.sfxBus);
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.05);
  }

  // ───────── короткие эффекты ─────────
  click() { this.tone({ f: 900, type: 'triangle', dur: 0.04, vol: 0.07 }); }
  hover() { this.tone({ f: 1500, type: 'sine', dur: 0.03, vol: 0.025 }); }
  blip(pitch = 520) { this.tone({ f: pitch + Math.random() * 60, type: 'square', dur: 0.025, vol: 0.018, lp: 1800 }); }
  notify() {
    this.tone({ f: 880, dur: 0.14, vol: 0.12 });
    this.tone({ f: 1320, dur: 0.22, vol: 0.12, at: 0.1 });
  }
  pin() {
    this.tone({ f: 260, type: 'triangle', dur: 0.18, vol: 0.18, slide: 180 });
    this.noise({ dur: 0.05, vol: 0.12, f: 3000, type: 'highpass' });
  }
  success() {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => this.tone({ f, type: 'triangle', dur: 0.3, vol: 0.13, at: i * 0.08 }));
  }
  bigWin() {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.C6].forEach((f, i) => this.tone({ f, type: 'triangle', dur: 0.45, vol: 0.13, at: i * 0.11 }));
    [NOTE.C4, NOTE.G4].forEach((f) => this.tone({ f, type: 'sine', dur: 1.6, vol: 0.12, attack: 0.05, at: 0.3 }));
  }
  fail() {
    this.tone({ f: 330, type: 'sawtooth', dur: 0.55, vol: 0.09, slide: 160, lp: 900 });
    this.tone({ f: 247, type: 'sawtooth', dur: 0.7, vol: 0.08, slide: 110, lp: 700, at: 0.15 });
  }
  wrong() { this.tone({ f: 180, type: 'square', dur: 0.16, vol: 0.06, lp: 600 }); }
  stamp() {
    this.noise({ dur: 0.14, vol: 0.45, f: 500 });
    this.tone({ f: 95, dur: 0.22, vol: 0.45, slide: 45 });
  }
  whoosh() { this.noise({ dur: 0.45, vol: 0.12, type: 'bandpass', f: 300, f2: 2400, q: 1.4, attack: 0.15 }); }
  freeze() {
    this.noise({ dur: 0.7, vol: 0.08, type: 'highpass', f: 3000, attack: 0.05 });
    for (let i = 0; i < 6; i++) this.tone({ f: 1800 + Math.random() * 2400, dur: 0.25, vol: 0.04, at: i * 0.06 });
  }
  coin() {
    this.tone({ f: NOTE.B5, type: 'square', dur: 0.06, vol: 0.035 });
    this.tone({ f: 1319, type: 'square', dur: 0.14, vol: 0.035, at: 0.06 });
  }
  pickup() {
    this.noise({ dur: 0.08, vol: 0.1, f: 1500, type: 'bandpass' });
    this.tone({ f: 1200, dur: 0.05, vol: 0.05, at: 0.05 });
  }
  hangup() {
    [0, 0.45, 0.9].forEach((at) => this.tone({ f: 425, dur: 0.3, vol: 0.08, at }));
  }

  // ───────── циклы ─────────
  _loop(name, ms, fn) {
    this._stop(name);
    fn();
    this.loops[name] = setInterval(fn, ms);
  }
  _stop(name) {
    if (this.loops[name]) clearInterval(this.loops[name]);
    delete this.loops[name];
  }

  alarm(on) {
    if (!on) return this._stop('alarm');
    this._loop('alarm', 1600, () => {
      this.tone({ f: 620, type: 'sawtooth', dur: 0.5, vol: 0.035, slide: 840, lp: 1400 });
      this.tone({ f: 840, type: 'sawtooth', dur: 0.5, vol: 0.03, slide: 620, lp: 1400, at: 0.55 });
    });
  }

  ring(on) {
    if (!on) return this._stop('ring');
    this._loop('ring', 2000, () => {
      [NOTE.E5, NOTE.G5, NOTE.B5, NOTE.G5, NOTE.E5, NOTE.G5].forEach((f, i) => {
        this.tone({ f, type: 'sine', dur: 0.16, vol: 0.12, at: i * 0.13 });
        this.tone({ f: f * 2, type: 'triangle', dur: 0.08, vol: 0.03, at: i * 0.13 });
      });
      this.tone({ f: 120, type: 'square', dur: 0.4, vol: 0.05, lp: 260 });
      this.tone({ f: 120, type: 'square', dur: 0.4, vol: 0.05, lp: 260, at: 0.6 });
    });
  }

  ringback(on) {
    if (!on) return this._stop('ringback');
    this._loop('ringback', 3000, () => this.tone({ f: 425, dur: 0.9, vol: 0.07, attack: 0.02 }));
  }

  heartbeat(bpm) {
    bpm = Math.round(bpm);
    if (!bpm) {
      this.heartBpm = 0;
      return this._stop('heart');
    }
    if (Math.abs(bpm - this.heartBpm) < 5 && this.loops.heart) return;
    this.heartBpm = bpm;
    this._loop('heart', 60000 / bpm, () => {
      this.tone({ f: 75, dur: 0.14, vol: 0.32, slide: 42 });
      this.tone({ f: 62, dur: 0.12, vol: 0.2, slide: 38, at: 0.17 });
    });
  }

  holdMusic(ms) {
    const seq = [NOTE.E5, NOTE.Ds5, NOTE.E5, NOTE.Ds5, NOTE.E5, NOTE.B4, NOTE.D5, NOTE.C5, NOTE.A4, 0, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.B4, 0, NOTE.E4, NOTE.Gs3 * 2, NOTE.B4, NOTE.C5];
    const step = 0.2;
    const total = ms / 1000;
    let t = 0;
    while (t < total - step) {
      for (const f of seq) {
        if (t >= total - step) break;
        if (f) this.tone({ f, type: 'square', dur: step * 0.9, vol: 0.03, at: t, bp: 1100 });
        t += step;
      }
      t += step * 2;
    }
  }

  // ───────── эмбиент и музыка ─────────
  startAmbient() {
    if (!this.ctx || this.amb) return;
    const c = this.ctx;
    const mk = (type, f, vol) => {
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const flt = c.createBiquadFilter();
      flt.type = type;
      flt.frequency.value = f;
      const g = c.createGain();
      g.gain.value = vol;
      src.connect(flt);
      flt.connect(g);
      g.connect(this.ambBus);
      src.start();
      return g;
    };
    this.amb = {
      rain: mk('bandpass', 2200, 0.05),
      rainLow: mk('lowpass', 500, 0.05),
      hum: mk('lowpass', 120, 0.1),
    };
  }

  setRain(level) {
    if (!this.amb) return;
    const t = this.ctx.currentTime;
    this.amb.rain.gain.setTargetAtTime(0.05 * level, t, 1.2);
    this.amb.rainLow.gain.setTargetAtTime(0.05 * level, t, 1.2);
  }

  startMusic(mood) {
    if (!this.ctx) return;
    if (this.music.mood === mood) return;
    this.stopMusic();
    if (!mood) return;
    this.music.mood = mood;
    this.music.step = 0;
    const play = () => {
      const chords = MOODS[mood];
      const chord = chords[this.music.step % chords.length];
      this.music.step++;
      this._pad(chord, mood === 'dawn' ? 9 : 8);
      if (mood === 'dawn') {
        chord.forEach((f, i) => this.tone({ f: f * 2, type: 'triangle', dur: 1.2, vol: 0.025, at: 1 + i * 0.35, bus: 'music' }));
      }
    };
    play();
    this.music.timer = setInterval(play, 7000);
  }

  stopMusic() {
    if (this.music.timer) clearInterval(this.music.timer);
    this.music.timer = null;
    this.music.mood = null;
  }

  _pad(freqs, dur) {
    const c = this.ctx;
    const t0 = c.currentTime;
    const flt = c.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 650;
    flt.Q.value = 0.4;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.11, t0 + 2.2);
    g.gain.setValueAtTime(0.11, t0 + dur - 2.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    flt.connect(g);
    g.connect(this.musicBus);
    for (const f of freqs) {
      for (const det of [-7, 7]) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(flt);
        o.start(t0);
        o.stop(t0 + dur + 0.1);
      }
    }
    const sub = c.createOscillator();
    sub.frequency.value = freqs[0] / 2;
    const sg = c.createGain();
    sg.gain.value = 0.35;
    sub.connect(sg);
    sg.connect(g);
    sub.start(t0);
    sub.stop(t0 + dur + 0.1);
  }

  stopAllLoops() {
    for (const k of Object.keys(this.loops)) this._stop(k);
    this.heartBpm = 0;
  }
}

export const audio = new AudioEngine();
