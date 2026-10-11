import { clamp } from "../math";
import {
  CAST_D_MAX,
  CAST_D_MIN,
  FLIGHT_BASE_MS,
  FLIGHT_PER_D_MS,
  PERFECT_POWER,
  POWER_FILL_MS,
  YARDS_BASE,
  YARDS_SPAN,
} from "./tuning";

export type CastTarget = { d: number; perfect: boolean };

export function powerAt(elapsedMs: number) {
  const period = POWER_FILL_MS * 2;
  const phase = ((elapsedMs % period) + period) % period;
  const raw = phase < POWER_FILL_MS ? phase / POWER_FILL_MS : 1 - (phase - POWER_FILL_MS) / POWER_FILL_MS;
  return clamp(raw, 0, 1);
}

export function isPerfect(power: number) {
  return power >= PERFECT_POWER;
}

export function targetFor(power: number): CastTarget {
  if (isPerfect(power)) return { d: CAST_D_MAX, perfect: true };
  return { d: clamp(CAST_D_MIN + (CAST_D_MAX - CAST_D_MIN) * power, CAST_D_MIN, CAST_D_MAX), perfect: false };
}

export function flightMs(d: number) {
  return FLIGHT_BASE_MS + FLIGHT_PER_D_MS * d;
}

export function yardsAt(d: number) {
  return Math.round(YARDS_BASE + YARDS_SPAN * d);
}
