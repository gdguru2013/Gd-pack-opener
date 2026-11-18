class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public setMuted(next: boolean) {
    this.muted = next;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'triangle', volume = 0.08, delay = 0) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playPackSelect() {
    this.playTone(440, 0.08, 'triangle', 0.06, 0);
    this.playTone(660, 0.1, 'triangle', 0.05, 0.04);
  }

  public playPackTear() {
    this.playTone(220, 0.14, 'sawtooth', 0.05, 0);
    this.playTone(330, 0.16, 'triangle', 0.07, 0.06);
    this.playTone(554, 0.22, 'sine', 0.08, 0.12);
    this.playTone(880, 0.28, 'sine', 0.07, 0.18);
  }

  public playCardReveal(isDemon: boolean, isHighRating: boolean, isRareVariant = false) {
    if (isDemon) {
      this.playTone(293.66, 0.22, 'triangle', 0.08, 0);
      this.playTone(440, 0.24, 'triangle', 0.08, 0.06);
      this.playTone(587.33, 0.34, 'sine', 0.09, 0.12);
      if (isHighRating || isRareVariant) {
        this.playTone(880, 0.42, 'sine', 0.08, 0.18);
      }
      if (isRareVariant) {
        this.playTone(1174.66, 0.45, 'sine', 0.07, 0.24);
      }
      return;
    }

    this.playTone(523.25, 0.14, 'sine', 0.07, 0);
    this.playTone(659.25, 0.18, 'sine', 0.06, 0.05);
    if (isHighRating || isRareVariant) {
      this.playTone(783.99, 0.26, 'triangle', 0.07, 0.1);
    }
    if (isRareVariant) {
      this.playTone(1046.5, 0.34, 'sine', 0.07, 0.16);
    }
  }

  public playOrbsGain() {
    this.playTone(659.25, 0.1, 'sine', 0.06, 0);
    this.playTone(880, 0.15, 'sine', 0.06, 0.06);
  }
}

export const soundFX = new SoundEngine();
