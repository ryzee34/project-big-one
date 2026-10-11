import { createRng } from "./rng";
import { REEL_TENSION_DRAG, TENSION_ZONE_HOT } from "./tuning";
import type { Cue, Snapshot } from "./types";

const FLOOR = 0.0001;
const ATTACK_S = 0.006;
const REEL_TICK_S = 0.09;
const NOISE_SECONDS = 1;
const NOISE_SEED = 0x5eed;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;

type Voice = { osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode };

type Audio = {
  unlock(): void;
  setMuted(m: boolean): void;
  isMuted(): boolean;
  play(cue: Cue): void;
  update(snap: Snapshot): void;
};

function buildNoise(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rng = createRng(NOISE_SEED);
  for (let i = 0; i < length; i++) {
    data[i] = rng.next() * 2 - 1;
  }
  return buffer;
}

function envelope(ctx: AudioContext, peak: number, at: number, duration: number, attack = ATTACK_S): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(FLOOR, at + duration);
  return gain;
}

export function createAudio(): Audio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let muted = false;
  let creak: Voice | null = null;
  let lastTick: number | null = null;
  let lastTime = 0;

  const live = () => (ctx !== null && master !== null && noise !== null && !muted ? ctx : null);

  const tone = (type: OscillatorType, from: number, to: number, duration: number, peak: number, at: number) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + duration);
    const gain = envelope(ctx, peak, at, duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  };

  const hiss = (
    filter: BiquadFilterType,
    from: number,
    to: number,
    q: number,
    duration: number,
    peak: number,
    at: number,
    offset = 0,
  ) => {
    if (!ctx || !master || !noise) return;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const shape = ctx.createBiquadFilter();
    shape.type = filter;
    shape.Q.setValueAtTime(q, at);
    shape.frequency.setValueAtTime(from, at);
    if (to !== from) shape.frequency.exponentialRampToValueAtTime(to, at + duration);
    const gain = envelope(ctx, peak, at, duration);
    source.connect(shape);
    shape.connect(gain);
    gain.connect(master);
    source.start(at, offset % NOISE_SECONDS);
    source.stop(at + duration + 0.02);
  };

  const reelTick = (speed: number) => {
    if (!ctx) return;
    const at = ctx.currentTime;
    const centre = 1400 + 2600 * Math.min(1, Math.max(0, speed));
    hiss("bandpass", centre, centre, 3, 0.024, 0.6, at, lastTime);
  };

  const startCreak = () => {
    if (!ctx || !master || creak) return;
    const at = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(70, at);
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(5.5, at);
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(4, at);
    lfo.connect(depth);
    depth.connect(osc.frequency);
    const soften = ctx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.setValueAtTime(520, at);
    soften.Q.setValueAtTime(2, at);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(FLOOR, at);
    gain.gain.exponentialRampToValueAtTime(0.07, at + 0.08);
    osc.connect(soften);
    soften.connect(gain);
    gain.connect(master);
    osc.start(at);
    lfo.start(at);
    creak = { osc, lfo, gain };
  };

  const stopCreak = () => {
    if (!ctx || !creak) return;
    const at = ctx.currentTime;
    const voice = creak;
    creak = null;
    voice.gain.gain.cancelScheduledValues(at);
    voice.gain.gain.setValueAtTime(Math.max(FLOOR, voice.gain.gain.value), at);
    voice.gain.gain.exponentialRampToValueAtTime(FLOOR, at + 0.09);
    voice.osc.stop(at + 0.12);
    voice.lfo.stop(at + 0.12);
  };

  const applyMute = () => {
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.012);
    if (muted) stopCreak();
  };

  const activated = () => navigator.userActivation?.hasBeenActive ?? true;

  const unlock = () => {
    if (!ctx) {
      if (!activated()) return;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.setValueAtTime(muted ? 0 : 1, ctx.currentTime);
      master.connect(ctx.destination);
      noise = buildNoise(ctx);
    }
    if (ctx.state === "suspended") void ctx.resume();
  };

  const play = (cue: Cue) => {
    if (!ctx || ctx.state === "suspended") unlock();
    const now = live();
    if (!now) return;
    const at = now.currentTime;
    switch (cue) {
      case "cast":
        hiss("bandpass", 2600, 420, 1, 0.18, 0.6, at, lastTime);
        return;
      case "plop":
        tone("sine", 420, 90, 0.12, 0.28, at);
        hiss("highpass", 2800, 2800, 1, 0.026, 0.16, at, lastTime + 0.3);
        return;
      case "nibble":
        tone("square", 880, 880, 0.04, 0.1, at);
        return;
      case "bite":
        tone("sine", 140, 140, 0.16, 0.3, at);
        hiss("lowpass", 900, 300, 0.8, 0.13, 0.22, at, lastTime + 0.5);
        return;
      case "snap":
        hiss("highpass", 1400, 1400, 0.7, 0.06, 0.42, at, lastTime + 0.1);
        return;
      case "landed":
        tone("square", C5, C5, 0.09, 0.1, at);
        tone("square", E5, E5, 0.09, 0.1, at + 0.09);
        tone("square", G5, G5, 0.09, 0.1, at + 0.18);
        return;
      case "release":
        hiss("lowpass", 700, 2600, 0.9, 0.2, 0.5, at, lastTime + 0.7);
        return;
      case "perfect":
        tone("sine", 1320, 1320, 0.08, 0.2, at);
        return;
      case "retrieve":
        reelTick(1);
        return;
    }
  };

  const update = (snap: Snapshot) => {
    if (snap.muted !== muted) {
      muted = snap.muted;
      applyMute();
    }
    lastTime = snap.time;
    if (!live()) {
      lastTick = null;
      if (creak) stopCreak();
      return;
    }
    const reeling = snap.reeling || snap.state === "retrieve";
    if (reeling) {
      if (lastTick === null || snap.time < lastTick || snap.time - lastTick >= REEL_TICK_S) {
        const drag = snap.tension === null ? 0 : REEL_TENSION_DRAG * snap.tension;
        reelTick(1 - drag);
        lastTick = snap.time;
      }
    } else {
      lastTick = null;
    }
    const hot = snap.state === "fight" && snap.tension !== null && snap.tension > TENSION_ZONE_HOT;
    if (hot) startCreak();
    else if (creak) stopCreak();
  };

  return {
    unlock,
    setMuted(m) {
      muted = m;
      applyMute();
    },
    isMuted: () => muted,
    play,
    update,
  };
}
