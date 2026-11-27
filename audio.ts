import { TRACKS } from "./fitness";

/** Procedural workout audio. No external files, works fully offline. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private trackKey = "hype";
  private volume = 0.65;
  private startedAt = 0;
  private held = 0;
  private starting = false;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume * 0.55;
      this.master.connect(this.ctx.destination);
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    }
    return this.ctx;
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume * 0.55, this.ctx.currentTime, 0.03);
  }

  get track() {
    return this.trackKey;
  }

  get isPlaying() {
    return !!this.timer;
  }

  elapsed() {
    return this.timer ? this.held + (Date.now() - this.startedAt) / 1000 : this.held;
  }

  seek(seconds: number) {
    this.held = Math.max(0, seconds);
    if (this.timer) this.startedAt = Date.now();
  }

  async play(trackKey?: string) {
    if (this.starting) return;
    this.starting = true;
    try {
      if (trackKey && trackKey !== this.trackKey) {
        this.trackKey = trackKey;
        this.step = 0;
        this.held = 0;
      }
      const ctx = this.ensure();
      if (ctx.state === "suspended") await ctx.resume();
      if (this.timer) return;
      this.startedAt = Date.now();
      this.nextNoteTime = ctx.currentTime + 0.06;
      this.timer = setInterval(() => this.schedule(), 25);
      this.schedule();
    } finally {
      this.starting = false;
    }
  }

  pause() {
    if (this.timer) {
      this.held = this.elapsed();
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  switchTrack(trackKey: string) {
    const wasPlaying = !!this.timer;
    this.pause();
    this.trackKey = trackKey;
    this.step = 0;
    this.held = 0;
    if (wasPlaying) void this.play();
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.timer) return;
    const cfg = TRACKS[this.trackKey] ?? TRACKS.hype;
    const sixteenth = 60 / cfg.bpm / 4;
    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      this.scheduleStep(this.step, this.nextNoteTime, cfg);
      this.nextNoteTime += sixteenth;
      this.step = (this.step + 1) % 16;
    }
  }

  private scheduleStep(step: number, time: number, cfg: (typeof TRACKS)[string]) {
    const ctx = this.ctx!;
    if (cfg.kick.includes(step)) this.kick(time);
    if (cfg.hats.includes(step)) this.hat(time, step % 4 === 0 ? 0.13 : 0.08);
    const bass = cfg.bass[step];
    if (bass) this.tone(bass, time, 0.19, "triangle", 0.24, 420);
    const lead = cfg.lead[step];
    if (lead) this.tone(lead, time, 0.16, cfg.leadWave, 0.062, 2600);
  }

  private kick(time: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(155, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.16);
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(gain).connect(this.master!);
    osc.start(time);
    osc.stop(time + 0.24);
  }

  private hat(time: number, level: number) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.055);
    source.connect(filter).connect(gain).connect(this.master!);
    source.start(time);
    source.stop(time + 0.08);
  }

  private tone(freq: number, time: number, duration: number, wave: OscillatorType, level: number, cutoff: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(filter).connect(gain).connect(this.master!);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  /** UI feedback effects (independent of the music gain). */
  chime(kind: "complete" | "tick" | "alarm" = "complete") {
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
    const notes = kind === "complete" ? [523.25, 659.25, 783.99, 1046.5] : kind === "alarm" ? [660, 880, 660, 880] : [880, 1174.66];
    notes.forEach((freq, i) => {
      const time = ctx.currentTime + i * (kind === "tick" ? 0.07 : 0.11);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === "tick" ? "sine" : "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(kind === "tick" ? 0.12 : 0.18, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      osc.connect(gain).connect(this.master!);
      osc.start(time);
      osc.stop(time + 0.32);
    });
  }
}

export const audioEngine = new AudioEngine();
