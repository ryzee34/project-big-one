import type { Bitmap } from "../pixel/bitmaps";
export type Theme = "light" | "dark";
export type InputMode = "fine" | "coarse";
export type StateName = "idle" | "charge" | "cast" | "wait" | "bite" | "fight" | "landed" | "lost" | "retrieve";
export type Band = "near" | "mid" | "far";
export type SpeciesId = "perch" | "bass" | "tuna" | "grouper" | "shark" | "marlin";
export type Species = { id: SpeciesId; name: string; bitmap: Bitmap; lbMin: number; lbMax: number; pool: Record<Band, { day: number; night: number }>; pull: number; runRate: number; runSpeed: number; runLength: number; stamina: number };
export type Catch = { id: string; species: SpeciesId; lb: number; yards: number; night: boolean; at: number };
export type SaveData = { version: 1; catches: Catch[]; best: Partial<Record<SpeciesId, number>>; settings: { muted: boolean } };
export type Cue = "cast" | "plop" | "nibble" | "bite" | "snap" | "landed" | "release" | "perfect" | "retrieve";
export type EffectKind = "splash" | "ring" | "foam";
export type Effect = { kind: EffectKind; ax: number; d: number; start: number };
export type BobberMode = "hung" | "flying" | "floating" | "dipped" | "under" | "hidden";
export type Snapshot = {
  state: StateName; time: number; speed: number; reduced: boolean; theme: Theme;
  aim: number; power: number | null; perfect: boolean;
  bobber: { ax: number; d: number; mode: BobberMode; t: number };
  tension: number | null; lineOut: number | null; reeling: boolean; reelSpin: number; running: boolean;
  reelSpeed: number; crank: number; holding: boolean; inputMode: InputMode; showReelHint: boolean;
  shadow: { ax: number; d: number; size: number; surfacing: boolean } | null;
  species: SpeciesId | null;
  landing: { species: SpeciesId; t: number } | null;
  card: (Catch & { record: boolean; bigOne: boolean }) | null;
  toast: string | null; hint: string; showTitle: boolean; bigOneLanded: boolean;
  creelCount: number; menuOpen: boolean; muted: boolean;
  effects: Effect[]; cues: Cue[];
  announcements: string[];
};
export type Scenario = "wait" | "bite" | "fight" | "fightSnap" | "landed" | "lost";
export type GameEvent =
  | { type: "press" } | { type: "release" } | { type: "aim"; ax: number } | { type: "nudge"; dir: -1 | 1; held: boolean }
  | { type: "crank"; revs: number } | { type: "retrieve" } | { type: "keep" } | { type: "let-go" } | { type: "menu"; open: boolean }
  | { type: "mute"; muted: boolean } | { type: "theme"; theme: Theme } | { type: "reset-log" } | { type: "reduced"; reduced: boolean };
export type Rng = { next(): number; range(min: number, max: number): number; int(min: number, max: number): number };
export type MachineDeps = { rng: Rng; reduced: boolean; theme: Theme; inputMode: InputMode; save: SaveData; persist: (data: SaveData) => void };
export type Machine = { step(dt: number): void; dispatch(event: GameEvent): void; snapshot(): Snapshot; peek(): Snapshot; goto(state: StateName, scenario?: Scenario): void };
export type DebugApi = { state(): Snapshot; press(): void; release(): void; aim(ax: number): void; crank(revs: number): void; tick(ms: number): void; goto(state: StateName, scenario?: Scenario): void };
