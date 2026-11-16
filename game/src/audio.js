// Synthesized sound, WebAudio only: no audio files, no network. The context is created on the
// first user gesture (browsers block audio before one); everything degrades to silence when
// audio is unavailable or muted.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let musicTimer = 0;
  // A slow pentatonic walk for the ambient music, one soft pluck every beat.
  const MELODY = [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33];
  let note = 0;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
    return ctx;
  }

  function tone(freq, freq2, dur, type, gain, when = 0) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freq2 !== null && freq2 !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, gain, cutoff) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(c.destination);
    src.start(t0);
  }

  return {
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') void c.resume();
    },
    setMuted(value) { muted = value; },
    isMuted() { return muted; },
    click() { tone(660, null, 0.07, 'sine', 0.12); },
    launch() { tone(320, 90, 0.35, 'sine', 0.22); noise(0.25, 0.1, 1200); },
    shard() { tone(880, null, 0.12, 'sine', 0.16); tone(1318.5, null, 0.18, 'sine', 0.14, 0.07); },
    crash() { noise(0.4, 0.3, 900); tone(120, 40, 0.4, 'triangle', 0.25); },
    gate() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, null, 0.3, 'sine', 0.15, i * 0.09));
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, null, 0.45, 'triangle', 0.14, i * 0.12));
    },
    denied() { tone(160, 110, 0.18, 'square', 0.08); },
    /** One soft pluck when its beat comes due; call every frame with dt. */
    music(dt) {
      if (muted) return;
      musicTimer -= dt;
      if (musicTimer > 0) return;
      musicTimer = 0.55;
      tone(MELODY[note % MELODY.length], null, 0.9, 'sine', 0.045);
      note += 1;
    },
  };
}
