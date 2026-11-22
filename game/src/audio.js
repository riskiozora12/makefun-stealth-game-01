// Every sound is synthesised with WebAudio: no audio files, nothing to load.
// The context is created on the first user gesture (browsers block audio
// before one) and every call is a no-op while muted or before that.

export function createAudio() {
  let context = null;
  let master = null;
  let ambient = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return false;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      startAmbient();
      return true;
    } catch {
      return false;
    }
  }

  /** A low, slow drone under the game: two detuned sines through a lowpass. */
  function startAmbient() {
    if (ambient || !context) return;
    const gain = context.createGain();
    gain.gain.value = 0.045;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    for (const freq of [55, 55.7, 110.3]) {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start();
    }
    filter.connect(gain);
    gain.connect(master);
    ambient = gain;
  }

  /** A short burst of filtered noise: a footstep. `heavy` is a guard's boot. */
  function noiseBurst(when, duration, frequency, volume) {
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 1.1;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(when);
  }

  /** A pure tone with an exponential decay, for chimes and stings. */
  function tone(when, frequency, duration, volume, type = 'sine') {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, when);
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }

  return {
    ensure,
    /** True while muted; the M key and the title screen toggle it. */
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    footstep(heavy) {
      if (!context || muted) return;
      noiseBurst(context.currentTime, 0.09, heavy ? 300 : 620, heavy ? 0.16 : 0.07);
    },
    pebble() {
      if (!context || muted) return;
      const now = context.currentTime;
      tone(now, 1180, 0.07, 0.12, 'triangle');
      tone(now + 0.06, 880, 0.09, 0.1, 'triangle');
    },
    pickup() {
      if (!context || muted) return;
      const now = context.currentTime;
      tone(now, 660, 0.16, 0.16, 'sine');
      tone(now + 0.09, 990, 0.22, 0.16, 'sine');
    },
    alert() {
      if (!context || muted) return;
      const now = context.currentTime;
      tone(now, 220, 0.35, 0.2, 'sawtooth');
      tone(now + 0.02, 233, 0.35, 0.2, 'sawtooth');
      tone(now + 0.18, 330, 0.3, 0.16, 'sawtooth');
    },
    caught() {
      if (!context || muted) return;
      const now = context.currentTime;
      tone(now, 196, 0.5, 0.22, 'sawtooth');
      tone(now + 0.05, 185, 0.5, 0.22, 'sawtooth');
      tone(now + 0.1, 98, 0.7, 0.2, 'square');
    },
    door() {
      if (!context || muted) return;
      const now = context.currentTime;
      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(320, now + 0.5);
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 500;
      filter.Q.value = 4;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.6);
    },
    fanfare() {
      if (!context || muted) return;
      const now = context.currentTime;
      [523, 659, 784, 1047].forEach((freq, i) => {
        tone(now + i * 0.11, freq, 0.3, 0.15, 'triangle');
      });
    },
    click() {
      if (!context || muted) return;
      tone(context.currentTime, 520, 0.06, 0.1, 'triangle');
    },
  };
}
