import { clamp } from "../math";
import {
  AIM_MAX,
  CAST_D_MAX,
  FIGHT_PULL_FLOOR,
  FIGHT_PULL_SPAN,
  FIGHT_TENSION_START,
  REEL_LINE_RATE,
  REEL_STAMINA_DRAIN,
  REEL_TENSION_DRAG,
  REEL_TENSION_RATE,
  REST_TENSION_RATE,
  RUN_LENGTH_MAX,
  RUN_LENGTH_MIN,
  SHADOW_SURFACE_STAMINA,
  SLACK_HOLD_S,
  SLACK_TENSION,
  SNAP_HOLD_S,
  STAMINA_DRAIN_IDLE,
  STAMINA_DRAIN_RUNNING,
} from "./tuning";
import type { Rng, Species } from "./types";

const RUN_SWAY_RATE = 2;

export type FightState = {
  species: Species;
  lb: number;
  ax: number;
  hookedD: number;
  lineOut: number;
  tension: number;
  stamina: number;
  running: boolean;
  runLeft: number;
  runDir: -1 | 1;
  snapTimer: number;
  slackTimer: number;
  reeling: boolean;
  pinTension: boolean;
};

export type FightOutcome = "fighting" | "landed" | "snapped" | "slack";

export function createFight(species: Species, lb: number, d: number, ax: number): FightState {
  return {
    species,
    lb,
    ax,
    hookedD: d,
    lineOut: d,
    tension: FIGHT_TENSION_START,
    stamina: species.stamina,
    running: false,
    runLeft: 0,
    runDir: 1,
    snapTimer: 0,
    slackTimer: 0,
    reeling: false,
    pinTension: false,
  };
}

export function isSurfacing(fight: FightState) {
  return fight.stamina < SHADOW_SURFACE_STAMINA;
}

export function stepFight(fight: FightState, dt: number, rng: Rng): FightOutcome {
  const s = fight.species;
  const vigour = clamp(fight.stamina, 0, 1);
  const pull = s.pull * (FIGHT_PULL_FLOOR + FIGHT_PULL_SPAN * vigour);

  if (!fight.running && rng.next() < s.runRate * vigour * dt) {
    fight.running = true;
    fight.runLeft = rng.range(RUN_LENGTH_MIN, RUN_LENGTH_MAX) * s.runLength;
    fight.runDir = rng.next() < 0.5 ? -1 : 1;
  }

  if (fight.running) {
    fight.tension += pull * dt;
    fight.lineOut = Math.min(CAST_D_MAX, fight.lineOut + s.runSpeed * dt);
    fight.ax = clamp(fight.ax + fight.runDir * s.runSpeed * RUN_SWAY_RATE * dt, -AIM_MAX, AIM_MAX);
    fight.runLeft -= dt;
    if (fight.runLeft <= 0) fight.running = false;
  }

  if (fight.reeling) {
    fight.lineOut -= REEL_LINE_RATE * (1 - REEL_TENSION_DRAG * fight.tension) * dt;
    fight.tension += REEL_TENSION_RATE * dt;
    fight.stamina -= REEL_STAMINA_DRAIN * dt;
  } else {
    fight.tension -= REST_TENSION_RATE * dt;
  }

  fight.stamina -= (fight.running ? STAMINA_DRAIN_RUNNING : STAMINA_DRAIN_IDLE) * dt;
  fight.tension = clamp(fight.tension, 0, 1);
  if (fight.pinTension) fight.tension = 1;

  if (fight.lineOut <= 0) {
    fight.lineOut = 0;
    return "landed";
  }

  fight.snapTimer = fight.tension >= 1 ? fight.snapTimer + dt : 0;
  if (fight.snapTimer >= SNAP_HOLD_S) return "snapped";

  fight.slackTimer = fight.tension <= SLACK_TENSION && fight.lineOut > 0 ? fight.slackTimer + dt : 0;
  if (fight.slackTimer >= SLACK_HOLD_S) return "slack";

  return "fighting";
}
