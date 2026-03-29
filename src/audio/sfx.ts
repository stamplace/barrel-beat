type ToneType = OscillatorType;

type BeepOptions = {
  frequency: number;
  duration: number;
  type?: ToneType;
  gain?: number;
  attack?: number;
  release?: number;
  slideTo?: number | null;
};

export class SfxController {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtx) return null;
      if (!this.ctx) this.ctx = new AudioCtx();
      return this.ctx;
    } catch {
      return null;
    }
  }

  unlock(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
  }

  private beep({
    frequency,
    duration,
    type = 'square',
    gain = 0.045,
    attack = 0.006,
    release = 0.09,
    slideTo = null,
  }: BeepOptions): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const start = ctx.currentTime + 0.001;
    const end = start + duration;

    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo !== null) {
      osc.frequency.linearRampToValueAtTime(slideTo, end);
    }

    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.linearRampToValueAtTime(gain, start + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, end + release);

    osc.connect(amp);
    amp.connect(ctx.destination);

    osc.start(start);
    osc.stop(end + release + 0.01);
  }

  private burst(steps: Array<BeepOptions & { delay?: number }>): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const base = ctx.currentTime;
    for (const step of steps) {
      const delay = step.delay ?? 0;
      window.setTimeout(() => this.beep(step), Math.max(0, delay * 1000));
    }
    void base;
  }

  start(): void {
    this.burst([
      { frequency: 440, slideTo: 520, duration: 0.09, type: 'triangle', gain: 0.04, delay: 0 },
      { frequency: 620, slideTo: 720, duration: 0.11, type: 'triangle', gain: 0.045, delay: 0.09 },
    ]);
  }

  move(): void {
    this.beep({
      frequency: 220,
      slideTo: 180,
      duration: 0.045,
      type: 'square',
      gain: 0.02,
      attack: 0.002,
      release: 0.03,
    });
  }

  ladder(): void {
    this.burst([
      { frequency: 330, duration: 0.05, type: 'triangle', gain: 0.028, delay: 0 },
      { frequency: 420, duration: 0.06, type: 'triangle', gain: 0.03, delay: 0.05 },
    ]);
  }

  warn(): void {
    this.burst([
      { frequency: 240, duration: 0.04, type: 'sawtooth', gain: 0.03, delay: 0 },
      { frequency: 240, duration: 0.04, type: 'sawtooth', gain: 0.03, delay: 0.07 },
    ]);
  }

  throw(): void {
    this.beep({
      frequency: 180,
      slideTo: 120,
      duration: 0.12,
      type: 'square',
      gain: 0.045,
      attack: 0.003,
      release: 0.05,
    });
  }

  hit(): void {
    this.burst([
      { frequency: 160, slideTo: 90, duration: 0.08, type: 'sawtooth', gain: 0.06, delay: 0 },
      { frequency: 110, slideTo: 70, duration: 0.1, type: 'square', gain: 0.045, delay: 0.04 },
    ]);
  }

  goal(): void {
    this.burst([
      { frequency: 520, duration: 0.07, type: 'triangle', gain: 0.035, delay: 0 },
      { frequency: 660, duration: 0.08, type: 'triangle', gain: 0.04, delay: 0.06 },
      { frequency: 880, duration: 0.11, type: 'triangle', gain: 0.05, delay: 0.14 },
    ]);
  }

  share(): void {
    this.burst([
      { frequency: 740, duration: 0.05, type: 'triangle', gain: 0.03, delay: 0 },
      { frequency: 980, duration: 0.07, type: 'triangle', gain: 0.04, delay: 0.06 },
    ]);
  }

  restart(): void {
    this.burst([
      { frequency: 280, duration: 0.05, type: 'triangle', gain: 0.025, delay: 0 },
      { frequency: 320, duration: 0.05, type: 'triangle', gain: 0.025, delay: 0.04 },
    ]);
  }

  gameOver(): void {
    this.burst([
      { frequency: 280, slideTo: 210, duration: 0.12, type: 'square', gain: 0.04, delay: 0 },
      { frequency: 190, slideTo: 120, duration: 0.18, type: 'square', gain: 0.045, delay: 0.1 },
    ]);
  }
}
