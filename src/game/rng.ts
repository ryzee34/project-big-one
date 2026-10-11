import type { Rng } from "./types";

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
  };
}

export function createLazyRng(seed: () => number): Rng {
  let inner: Rng | null = null;
  const rng = () => (inner ??= createRng(seed()));
  return {
    next: () => rng().next(),
    range: (min, max) => rng().range(min, max),
    int: (min, max) => rng().int(min, max),
  };
}
