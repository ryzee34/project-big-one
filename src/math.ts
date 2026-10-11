export function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

export function easeOutBack(t: number) {
  const overshoot = 1.15;
  return (
    1 + (overshoot + 1) * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2)
  );
}

export function hashNoise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}
