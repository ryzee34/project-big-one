import type { Machine, Snapshot } from "./types";

export const STEP_S = 1 / 120;
const MAX_FRAME_MS = 250;
const MAX_SIM_MS = 1000;
const MS = 1000;

export type LoopOptions = { machine: Machine; render: (snap: Snapshot, now: number) => void; speed: number };
export type Loop = { stop(): void; setSpeed(s: number): void; advance(ms: number): void };

export function startLoop(opts: LoopOptions): Loop {
  const { machine, render } = opts;
  let speed = opts.speed;
  let last: number | null = null;
  let lastNow = 0;
  let accumulator = 0;
  let handle = 0;
  let stopped = false;

  const simulate = (simMs: number) => {
    accumulator += simMs / MS;
    while (accumulator >= STEP_S) {
      machine.step(STEP_S);
      accumulator -= STEP_S;
    }
  };

  const draw = (now: number) => {
    lastNow = now;
    const snap = machine.snapshot();
    snap.speed = speed;
    render(snap, now);
  };

  const frame = (now: number) => {
    if (stopped) return;
    handle = window.requestAnimationFrame(frame);
    if (document.hidden) {
      last = null;
      return;
    }
    if (last !== null) simulate(Math.min(Math.min(now - last, MAX_FRAME_MS) * speed, MAX_SIM_MS));
    last = now;
    draw(now);
  };

  const onVisibility = () => {
    if (document.hidden) last = null;
  };

  document.addEventListener("visibilitychange", onVisibility);
  handle = window.requestAnimationFrame(frame);

  return {
    stop() {
      stopped = true;
      window.cancelAnimationFrame(handle);
      document.removeEventListener("visibilitychange", onVisibility);
    },
    setSpeed(s) {
      if (Number.isFinite(s) && s > 0) speed = s;
    },
    advance(ms) {
      simulate(ms);
      draw(lastNow);
    },
  };
}
