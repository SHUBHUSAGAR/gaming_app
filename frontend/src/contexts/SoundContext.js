import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const SoundContext = createContext(null);

// Web Audio API procedural sound generators
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(generator) {
    if (!this.enabled) return;
    try {
      this.init();
      generator(this.ctx);
    } catch (e) {
      // Silently fail if audio not available
    }
  }

  // === SOUND GENERATORS ===

  betPlaced() {
    this.play((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    });
  }

  win() {
    this.play((ctx) => {
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.12;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    });
  }

  bigWin() {
    this.play((ctx) => {
      // Triumphant fanfare
      const notes = [523, 659, 784, 1047, 1318, 1568];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i < 3 ? 'sine' : 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.1;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    });
  }

  lose() {
    this.play((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    });
  }

  cashout() {
    this.play((ctx) => {
      // Coin cascade
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.06;
        osc.frequency.setValueAtTime(2000 + i * 400, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.12);
      }
    });
  }

  cardFlip() {
    this.play((ctx) => {
      // Filtered noise burst (whoosh)
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(8000, ctx.currentTime + 0.08);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime);
    });
  }

  diceRoll() {
    this.play((ctx) => {
      // Multiple short clicks (rattle)
      for (let i = 0; i < 8; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.04 + Math.random() * 0.02;
        osc.frequency.setValueAtTime(1500 + Math.random() * 2000, t);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        osc.start(t);
        osc.stop(t + 0.03);
      }
    });
  }

  crash() {
    this.play((ctx) => {
      // Explosion: noise burst + low frequency drop
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime);

      // Low thud
      const osc = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc.type = 'sine';
      osc.connect(g2);
      g2.connect(ctx.destination);
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
      g2.gain.setValueAtTime(0.2, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    });
  }

  timerWarning() {
    this.play((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    });
  }

  tick() {
    this.play((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(1500, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.03);
    });
  }

  spinTick() {
    this.play((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(2500 + Math.random() * 500, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    });
  }

  notification() {
    this.play((ctx) => {
      const notes = [880, 1100, 880];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.15;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    });
  }

  deposit() {
    this.play((ctx) => {
      // Ascending coins
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.08;
        osc.frequency.setValueAtTime(600 + i * 200, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
      }
    });
  }

  multiplierTick() {
    this.play((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    });
  }
}

const engine = new SoundEngine();

export function SoundProvider({ children }) {
  const [muted, setMuted] = useState(() => localStorage.getItem('cooe-sound-muted') === 'true');

  useEffect(() => {
    engine.enabled = !muted;
    localStorage.setItem('cooe-sound-muted', muted);
  }, [muted]);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      engine.init();
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const toggleMute = useCallback(() => setMuted(m => !m), []);

  const sound = {
    muted,
    toggleMute,
    betPlaced: useCallback(() => engine.betPlaced(), []),
    win: useCallback(() => engine.win(), []),
    bigWin: useCallback(() => engine.bigWin(), []),
    lose: useCallback(() => engine.lose(), []),
    cashout: useCallback(() => engine.cashout(), []),
    cardFlip: useCallback(() => engine.cardFlip(), []),
    diceRoll: useCallback(() => engine.diceRoll(), []),
    crash: useCallback(() => engine.crash(), []),
    timerWarning: useCallback(() => engine.timerWarning(), []),
    tick: useCallback(() => engine.tick(), []),
    spinTick: useCallback(() => engine.spinTick(), []),
    notification: useCallback(() => engine.notification(), []),
    deposit: useCallback(() => engine.deposit(), []),
    multiplierTick: useCallback(() => engine.multiplierTick(), []),
  };

  return (
    <SoundContext.Provider value={sound}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => useContext(SoundContext);
