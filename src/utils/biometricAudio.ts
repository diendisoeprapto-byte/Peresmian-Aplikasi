/**
 * Web Audio API synthesizer for futuristic biometric scanning and inauguration success effects.
 * Zero external audio assets required.
 */

class BiometricAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private scanOscBase: OscillatorNode | null = null;
  private scanOscHarmonic: OscillatorNode | null = null;
  private scanLfo: OscillatorNode | null = null;
  private scanGain: GainNode | null = null;
  private scanFilter: BiquadFilterNode | null = null;
  private pulseInterval: number | null = null;
  private currentProgress = 0;
  private isScanning = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.analyser) {
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -18;
      analyser.connect(this.ctx.destination);
      this.analyser = analyser;
    }
    return this.ctx;
  }

  private getOutputNode(): AudioNode | null {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    return this.analyser ?? ctx.destination;
  }

  public getFrequencyBinCount(): number {
    return this.analyser ? this.analyser.frequencyBinCount : 64;
  }

  public getFrequencyData(target: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(target);
    return true;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public startScan(): void {
    const ctx = this.ensureContext();
    const output = this.getOutputNode();
    if (!ctx || !output) return;

    this.stopScanImmediate();
    this.isScanning = true;
    this.currentProgress = 0;

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.18, now + 0.14);
    masterGain.connect(output);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);
    filter.Q.setValueAtTime(2.5, now);
    filter.connect(masterGain);

    // Primary rising futuristic hum
    const oscBase = ctx.createOscillator();
    oscBase.type = 'sawtooth';
    oscBase.frequency.setValueAtTime(140, now);
    oscBase.connect(filter);

    // Crystalline upper harmonic
    const oscHarmonic = ctx.createOscillator();
    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(420, now);
    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.35, now);
    oscHarmonic.connect(harmonicGain);
    harmonicGain.connect(masterGain);

    // Subtle tremolo LFO
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(9, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.04, now);
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);

    oscBase.start(now);
    oscHarmonic.start(now);
    lfo.start(now);

    this.scanOscBase = oscBase;
    this.scanOscHarmonic = oscHarmonic;
    this.scanLfo = lfo;
    this.scanGain = masterGain;
    this.scanFilter = filter;

    // Periodic biometric verification ticks
    this.triggerScanTick(0);
    this.pulseInterval = window.setInterval(() => {
      if (this.isScanning) {
        this.triggerScanTick(this.currentProgress);
      }
    }, 170);
  }

  public updateProgress(progress: number): void {
    this.currentProgress = Math.max(0, Math.min(1, progress));
    if (!this.ctx || !this.isScanning) return;

    const now = this.ctx.currentTime;
    const baseFreq = 140 + this.currentProgress * 220;
    const harmonicFreq = 420 + this.currentProgress * 540;
    const filterFreq = 320 + this.currentProgress * 1600;
    const lfoRate = 9 + this.currentProgress * 14;

    this.scanOscBase?.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.scanOscHarmonic?.frequency.setTargetAtTime(harmonicFreq, now, 0.04);
    this.scanFilter?.frequency.setTargetAtTime(filterFreq, now, 0.05);
    this.scanLfo?.frequency.setTargetAtTime(lfoRate, now, 0.05);
  }

  private triggerScanTick(progress: number): void {
    const ctx = this.ctx;
    const output = this.getOutputNode();
    if (!ctx || !output) return;

    const now = ctx.currentTime;
    const tickOsc = ctx.createOscillator();
    const tickGain = ctx.createGain();

    tickOsc.type = 'sine';
    tickOsc.frequency.setValueAtTime(760 + progress * 680, now);

    tickGain.gain.setValueAtTime(0.0001, now);
    tickGain.gain.exponentialRampToValueAtTime(0.08, now + 0.008);
    tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

    tickOsc.connect(tickGain);
    tickGain.connect(output);

    tickOsc.start(now);
    tickOsc.stop(now + 0.075);
  }

  public cancelScan(): void {
    if (!this.isScanning) return;
    const ctx = this.ctx;
    const output = this.getOutputNode();
    this.stopScanImmediate();

    if (!ctx || !output) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc.connect(gain);
    gain.connect(output);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  private stopScanImmediate(): void {
    this.isScanning = false;
    if (this.pulseInterval !== null) {
      window.clearInterval(this.pulseInterval);
      this.pulseInterval = null;
    }

    const ctx = this.ctx;
    const oscBase = this.scanOscBase;
    const oscHarmonic = this.scanOscHarmonic;
    const lfo = this.scanLfo;
    const gain = this.scanGain;

    this.scanOscBase = null;
    this.scanOscHarmonic = null;
    this.scanLfo = null;
    this.scanGain = null;
    this.scanFilter = null;

    if (ctx && gain) {
      const now = ctx.currentTime;
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.0001, now, 0.03);
      } catch {
        // Ignore if context closed
      }
      window.setTimeout(() => {
        try {
          oscBase?.stop();
          oscHarmonic?.stop();
          lfo?.stop();
          oscBase?.disconnect();
          oscHarmonic?.disconnect();
          lfo?.disconnect();
          gain.disconnect();
        } catch {
          // Already stopped
        }
      }, 120);
    }
  }

  public playSuccess(): void {
    this.stopScanImmediate();
    const ctx = this.ensureContext();
    const output = this.getOutputNode();
    if (!ctx || !output) return;

    const now = ctx.currentTime;

    // Warm sub-bass ceremonial swell
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(65.41, now); // C2
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(0.28, now + 0.08);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    subOsc.connect(subGain);
    subGain.connect(output);
    subOsc.start(now);
    subOsc.stop(now + 1.55);

    // Ascending crystalline inauguration arpeggio (C5 - E5 - G5 - B5 - C6)
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.065;
      const duration = idx === notes.length - 1 ? 1.35 : 0.7;

      const osc = ctx.createOscillator();
      const oscShimmer = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      oscShimmer.type = 'sine';
      oscShimmer.frequency.setValueAtTime(freq * 2, start);

      const shimmerGain = ctx.createGain();
      shimmerGain.gain.setValueAtTime(0.22, start);

      noteGain.gain.setValueAtTime(0.0001, start);
      noteGain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(noteGain);
      oscShimmer.connect(shimmerGain);
      shimmerGain.connect(noteGain);
      noteGain.connect(output);

      osc.start(start);
      oscShimmer.start(start);
      osc.stop(start + duration + 0.05);
      oscShimmer.stop(start + duration + 0.05);
    });
  }
}

export const biometricAudio = new BiometricAudioEngine();
