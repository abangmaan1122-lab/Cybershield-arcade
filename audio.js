/**
 * ============================================================================
 * CyberShield: Packet Defender — Procedural Web Audio Synthesizer
 * Menghasilkan efek suara retro-modern secara real-time tanpa aset audio eksternal.
 * ============================================================================
 */

const SoundEngine = (() => {
  const MUTE_KEY = 'cybershield_muted_v1';
  let ctx = null;
  let isMuted = localStorage.getItem(MUTE_KEY) === 'true';

  function ensureContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function playTone({ freqStart, freqEnd, duration, type = 'sine', volume = 0.12, delay = 0 }) {
    if (isMuted) return;
    const audioCtx = ensureContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  return {
    isMuted() {
      return isMuted;
    },

    toggleMute() {
      isMuted = !isMuted;
      localStorage.setItem(MUTE_KEY, String(isMuted));
      if (!isMuted) {
        this.playCatchData();
      }
      return isMuted;
    },

    playShoot() {
      playTone({ freqStart: 780, freqEnd: 240, duration: 0.09, type: 'triangle', volume: 0.09 });
    },

    playCatchData() {
      playTone({ freqStart: 520, freqEnd: 780, duration: 0.1, type: 'sine', volume: 0.12 });
      playTone({ freqStart: 780, freqEnd: 1040, duration: 0.12, type: 'sine', volume: 0.12, delay: 0.06 });
    },

    playHitArmor() {
      playTone({ freqStart: 220, freqEnd: 140, duration: 0.08, type: 'square', volume: 0.08 });
    },

    playDestroyEnemy() {
      playTone({ freqStart: 300, freqEnd: 65, duration: 0.18, type: 'sawtooth', volume: 0.12 });
    },

    playPowerUp() {
      playTone({ freqStart: 440, freqEnd: 660, duration: 0.1, type: 'triangle', volume: 0.13 });
      playTone({ freqStart: 660, freqEnd: 880, duration: 0.1, type: 'triangle', volume: 0.13, delay: 0.07 });
      playTone({ freqStart: 880, freqEnd: 1320, duration: 0.15, type: 'triangle', volume: 0.13, delay: 0.14 });
    },

    playDamage() {
      playTone({ freqStart: 160, freqEnd: 70, duration: 0.25, type: 'sawtooth', volume: 0.16 });
    },

    playWaveUp() {
      playTone({ freqStart: 440, freqEnd: 554, duration: 0.11, type: 'sine', volume: 0.12 });
      playTone({ freqStart: 554, freqEnd: 659, duration: 0.11, type: 'sine', volume: 0.12, delay: 0.09 });
      playTone({ freqStart: 659, freqEnd: 880, duration: 0.2, type: 'sine', volume: 0.14, delay: 0.18 });
    },

    playGameOver() {
      playTone({ freqStart: 340, freqEnd: 260, duration: 0.18, type: 'sawtooth', volume: 0.13 });
      playTone({ freqStart: 260, freqEnd: 180, duration: 0.2, type: 'sawtooth', volume: 0.13, delay: 0.16 });
      playTone({ freqStart: 180, freqEnd: 95, duration: 0.35, type: 'sawtooth', volume: 0.14, delay: 0.34 });
    }
  };
})();