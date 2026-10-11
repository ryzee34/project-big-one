import { bandFor } from "./species";
import {
  NIBBLE_MARGIN_S,
  NIBBLE_MAX,
  WAIT_FAR_MAX_S,
  WAIT_FAR_MIN_S,
  WAIT_MAX_S,
  WAIT_MIN_S,
  WAIT_RETRY_MAX_S,
  WAIT_RETRY_MIN_S,
} from "./tuning";
import type { Rng } from "./types";

export type WaitPlan = { duration: number; nibbles: number[] };

function waitBounds(d: number, retry: boolean): { min: number; max: number } {
  if (retry) return { min: WAIT_RETRY_MIN_S, max: WAIT_RETRY_MAX_S };
  if (bandFor(d) === "far") return { min: WAIT_FAR_MIN_S, max: WAIT_FAR_MAX_S };
  return { min: WAIT_MIN_S, max: WAIT_MAX_S };
}

export function rollWait(rng: Rng, d: number, retry: boolean): WaitPlan {
  const bounds = waitBounds(d, retry);
  const duration = rng.range(bounds.min, bounds.max);
  const count = rng.int(0, NIBBLE_MAX);
  const from = NIBBLE_MARGIN_S;
  const to = duration - NIBBLE_MARGIN_S;
  const nibbles: number[] = [];
  if (to > from) {
    for (let i = 0; i < count; i++) nibbles.push(rng.range(from, to));
  }
  nibbles.sort((a, b) => a - b);
  return { duration, nibbles };
}
