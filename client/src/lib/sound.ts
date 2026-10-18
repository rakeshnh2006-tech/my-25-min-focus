class SoundManager {
  private ctx: AudioContext | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private rainGainNode: GainNode | null = null;
  private isRainActive: boolean = false;
  private rainVolume: number = 0.5;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Harmonious chime when a focus session completes (major chord arpeggio)
   */
  playSessionComplete() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const startTime = ctx.currentTime + idx * 0.12;
      const duration = 1.2;

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  /**
   * Uplifting two-tone chime when a break ends (E5, A5)
   */
  playBreakComplete() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [659.25, 880.0]; // E5, A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const startTime = ctx.currentTime + idx * 0.15;
      const duration = 0.9;

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  /**
   * Subtle tactile tick
   */
  playTick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  }

  /**
   * Procedural Ambient Rain Synthesizer (Pink Noise + Low-Pass Filter)
   * 100% offline, zero network requests, zero audio file downloads.
   */
  startRain(volume: number = 0.5) {
    const ctx = this.getContext();
    if (!ctx) return;

    if (this.isRainActive) {
      this.setRainVolume(volume);
      return;
    }

    this.rainVolume = volume;

    try {
      // 5-second buffer of generated noise
      const bufferSize = ctx.sampleRate * 5;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise filter algorithm (Paul Kellet's method)
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Lowpass filter to simulate gentle rain against a window
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.35), ctx.currentTime + 1.2);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();

      this.rainSource = whiteNoise;
      this.rainGainNode = gain;
      this.isRainActive = true;
    } catch (err) {
      console.warn('Could not start procedural ambient rain:', err);
    }
  }

  stopRain() {
    if (!this.isRainActive || !this.rainSource) return;

    try {
      if (this.ctx && this.rainGainNode) {
        this.rainGainNode.gain.setValueAtTime(this.rainGainNode.gain.value, this.ctx.currentTime);
        this.rainGainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
      }
      setTimeout(() => {
        try {
          this.rainSource?.stop();
          this.rainSource?.disconnect();
          this.rainSource = null;
          this.rainGainNode = null;
        } catch {
          // ignore
        }
      }, 900);
    } catch {
      // ignore
    } finally {
      this.isRainActive = false;
    }
  }

  setRainVolume(volume: number) {
    this.rainVolume = volume;
    if (this.isRainActive && this.rainGainNode && this.ctx) {
      const targetGain = Math.max(0.0001, volume * 0.35);
      this.rainGainNode.gain.setValueAtTime(this.rainGainNode.gain.value, this.ctx.currentTime);
      this.rainGainNode.gain.exponentialRampToValueAtTime(targetGain, this.ctx.currentTime + 0.1);
    }
  }

  startAmbientRain(volume: number = 0.5) {
    return this.startRain(volume);
  }

  stopAmbientRain() {
    return this.stopRain();
  }

  getRainState() {
    return {
      isPlaying: this.isRainActive,
      volume: this.rainVolume,
    };
  }
}

export const soundManager = new SoundManager();
