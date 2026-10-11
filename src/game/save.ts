import { CATCH_LOG_CAP } from "./tuning";
import type { Catch, SaveData, SpeciesId } from "./types";

export const SAVE_KEY = "the-big-one:v1";

const SPECIES_IDS: readonly SpeciesId[] = ["perch", "bass", "tuna", "grouper", "shark", "marlin"];

export function emptySave(): SaveData {
  return { version: 1, catches: [], best: {}, settings: { muted: false } };
}

function isSpeciesId(value: unknown): value is SpeciesId {
  return typeof value === "string" && (SPECIES_IDS as readonly string[]).includes(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readCatch(value: unknown): Catch | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  if (typeof entry.id !== "string" || !isSpeciesId(entry.species)) return null;
  if (!isFiniteNumber(entry.lb) || !isFiniteNumber(entry.yards) || !isFiniteNumber(entry.at)) return null;
  return {
    id: entry.id,
    species: entry.species,
    lb: entry.lb,
    yards: entry.yards,
    night: entry.night === true,
    at: entry.at,
  };
}

function readSave(value: unknown): SaveData | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || !Array.isArray(raw.catches)) return null;
  const catches: Catch[] = [];
  for (const item of raw.catches) {
    const entry = readCatch(item);
    if (entry) catches.push(entry);
  }
  const best: Partial<Record<SpeciesId, number>> = {};
  if (raw.best && typeof raw.best === "object") {
    for (const [key, lb] of Object.entries(raw.best as Record<string, unknown>)) {
      if (isSpeciesId(key) && isFiniteNumber(lb)) best[key] = lb;
    }
  }
  const settings = raw.settings && typeof raw.settings === "object" ? (raw.settings as Record<string, unknown>) : {};
  return {
    version: 1,
    catches: catches.slice(-CATCH_LOG_CAP),
    best,
    settings: { muted: settings.muted === true },
  };
}

export function loadSave(): SaveData {
  try {
    const text = window.localStorage.getItem(SAVE_KEY);
    if (!text) return emptySave();
    return readSave(JSON.parse(text)) ?? emptySave();
  } catch {
    return emptySave();
  }
}

export function storeSave(data: SaveData): void {
  const trimmed: SaveData = {
    version: 1,
    catches: data.catches.slice(-CATCH_LOG_CAP),
    best: data.best,
    settings: { muted: data.settings.muted },
  };
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(trimmed));
  } catch {
    return;
  }
}
