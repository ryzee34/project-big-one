import { BASS, FISH, GROUPER, MARLIN, SHARK, TUNA } from "../pixel/bitmaps";
import {
  BAND_FAR_FROM,
  BAND_MID_FROM,
  MARLIN_CHANCE_DAY,
  MARLIN_CHANCE_NIGHT,
  MARLIN_MIN_D,
  MARLIN_MIN_LOG,
  WEIGHT_CURVE,
} from "./tuning";
import type { Band, Rng, Species, SpeciesId, Theme } from "./types";

export const SPECIES: Species[] = [
  {
    id: "perch",
    name: "Perch",
    bitmap: FISH,
    lbMin: 0.4,
    lbMax: 2.5,
    pool: { near: { day: 5, night: 3 }, mid: { day: 2, night: 1 }, far: { day: 0, night: 0 } },
    pull: 0.5,
    runRate: 0.25,
    runSpeed: 0.05,
    runLength: 0.8,
    stamina: 0.6,
  },
  {
    id: "bass",
    name: "Bass",
    bitmap: BASS,
    lbMin: 1,
    lbMax: 9,
    pool: { near: { day: 3, night: 4 }, mid: { day: 4, night: 4 }, far: { day: 1, night: 1 } },
    pull: 0.8,
    runRate: 0.4,
    runSpeed: 0.07,
    runLength: 1.0,
    stamina: 0.9,
  },
  {
    id: "tuna",
    name: "Tuna",
    bitmap: TUNA,
    lbMin: 8,
    lbMax: 60,
    pool: { near: { day: 0, night: 0 }, mid: { day: 2, night: 1 }, far: { day: 4, night: 2 } },
    pull: 1.1,
    runRate: 0.5,
    runSpeed: 0.12,
    runLength: 1.6,
    stamina: 1.3,
  },
  {
    id: "grouper",
    name: "Grouper",
    bitmap: GROUPER,
    lbMin: 5,
    lbMax: 45,
    pool: { near: { day: 0, night: 1 }, mid: { day: 1, night: 3 }, far: { day: 2, night: 4 } },
    pull: 1.3,
    runRate: 0.2,
    runSpeed: 0.04,
    runLength: 1.2,
    stamina: 1.1,
  },
  {
    id: "shark",
    name: "Shark",
    bitmap: SHARK,
    lbMin: 30,
    lbMax: 250,
    pool: { near: { day: 0, night: 0 }, mid: { day: 0, night: 0 }, far: { day: 1, night: 3 } },
    pull: 1.38,
    runRate: 0.45,
    runSpeed: 0.1,
    runLength: 1.5,
    stamina: 1.8,
  },
  {
    id: "marlin",
    name: "The Big One",
    bitmap: MARLIN,
    lbMin: 300,
    lbMax: 600,
    pool: { near: { day: 0, night: 0 }, mid: { day: 0, night: 0 }, far: { day: 0, night: 0 } },
    pull: 1.32,
    runRate: 0.6,
    runSpeed: 0.14,
    runLength: 2.0,
    stamina: 2.6,
  },
];

export const SPECIES_BY_ID: Record<SpeciesId, Species> = Object.fromEntries(
  SPECIES.map((s) => [s.id, s]),
) as Record<SpeciesId, Species>;

export function speciesById(id: SpeciesId): Species {
  return SPECIES_BY_ID[id];
}

export function bandFor(d: number): Band {
  if (d < BAND_MID_FROM) return "near";
  if (d < BAND_FAR_FROM) return "mid";
  return "far";
}

export function rollSpecies(rng: Rng, d: number, theme: Theme, logCount: number): Species {
  const band = bandFor(d);
  const night = theme === "dark";
  const marlin = SPECIES_BY_ID.marlin;
  if (band === "far" && d >= MARLIN_MIN_D && logCount >= MARLIN_MIN_LOG) {
    const chance = night ? MARLIN_CHANCE_NIGHT : MARLIN_CHANCE_DAY;
    if (rng.next() < chance) return marlin;
  }
  const candidates = SPECIES.filter((s) => s.id !== "marlin");
  const weights = candidates.map((s) => (night ? s.pool[band].night : s.pool[band].day));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < candidates.length; i++) {
    const weight = weights[i] ?? 0;
    const candidate = candidates[i];
    if (!candidate || weight <= 0) continue;
    roll -= weight;
    if (roll < 0) return candidate;
  }
  return candidates[candidates.length - 1] ?? marlin;
}

export function rollWeight(rng: Rng, species: Species): number {
  const r = rng.next();
  const lb = species.lbMin + (species.lbMax - species.lbMin) * Math.pow(r, WEIGHT_CURVE);
  return Math.round(lb * 10) / 10;
}

export function sizeFor(species: Species, lb: number): number {
  const span = species.lbMax - species.lbMin;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (lb - species.lbMin) / span));
}
