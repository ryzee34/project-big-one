import { clamp } from "../math";
import { flightMs, isPerfect, powerAt, targetFor, yardsAt } from "./cast";
import { createFight, isSurfacing, stepFight, type FightState } from "./fight";
import { rollSpecies, rollWeight, sizeFor, speciesById } from "./species";
import {
  AIM_MAX,
  AIM_NUDGE_RATE,
  CATCH_LOG_CAP,
  HOOK_WINDOW_MS,
  HOOK_WINDOW_REDUCED_MS,
  LANDING_MS,
  LOST_TOAST_MS,
  NIBBLE_MS,
  RETRIEVE_MS,
  SNAP_SILENCE_MS,
  SPLASH_MS,
} from "./tuning";
import type {
  BobberMode,
  Catch,
  Cue,
  Effect,
  GameEvent,
  Machine,
  MachineDeps,
  SaveData,
  Scenario,
  Snapshot,
  Species,
  StateName,
  Theme,
} from "./types";
import { rollWait, type WaitPlan } from "./wait";

export type MachineSnapshot = Snapshot;
export type MachineOptions = MachineDeps & { now?: () => number };

export const HINTS = {
  cast: "HOLD TO CAST",
  wait: "WAIT FOR IT",
  bite: "HIT IT",
  fight: "HOLD TO REEL",
  gotIt: "YOU GOT IT",
  none: "",
} as const;

export const TOASTS = {
  snapped: "Snapped the line.",
  slack: "It threw the hook.",
} as const;

const REEL_SPIN_RATE = 120;
const SCENARIO_D = 0.6;
const SCENARIO_POWER = 0.5;
const SCENARIO_FIGHT_STAMINA = 0.5;
const SCENARIO_LANDED_LB = 4.2;
const MS = 1000;

type Float = { ax: number; d: number };

type Lost = { reason: "snapped" | "slack"; from: Float; elapsedMs: number; durationMs: number };

class GameMachine implements Machine {
  private state: StateName = "idle";
  private time = 0;
  private reduced: boolean;
  private theme: Theme;
  private readonly save: SaveData;
  private readonly rng: MachineDeps["rng"];
  private readonly persist: (data: SaveData) => void;
  private readonly now: (() => number) | null;

  private aim = 0;
  private nudge: -1 | 0 | 1 = 0;
  private chargeMs = 0;
  private power: number | null = null;
  private perfect = false;

  private float: Float = { ax: 0, d: 0 };
  private flightElapsedMs = 0;
  private flightDurationMs = 0;

  private species: Species | null = null;
  private lb = 0;
  private plan: WaitPlan = { duration: 0, nibbles: [] };
  private waitElapsed = 0;
  private nibbleIndex = 0;
  private nibbleUntil: number | null = null;
  private biteElapsedMs = 0;
  private biteWindowMs = HOOK_WINDOW_MS;

  private fight: FightState | null = null;
  private reelSpin = 0;

  private landing: Snapshot["landing"] = null;
  private landingElapsedMs = 0;
  private card: Snapshot["card"] = null;
  private lost: Lost | null = null;
  private retrieveElapsedMs = 0;

  private hint: string = HINTS.cast;
  private toast: string | null = null;
  private showTitle = true;
  private bigOneLanded = false;
  private menuOpen = false;

  private effects: Effect[] = [];
  private cues: Cue[] = [];
  private announcements: string[] = [];

  constructor(deps: MachineOptions) {
    this.rng = deps.rng;
    this.reduced = deps.reduced;
    this.theme = deps.theme;
    this.save = deps.save;
    this.persist = deps.persist;
    this.now = deps.now ?? null;
  }

  step(dt: number) {
    if (this.menuOpen || dt <= 0) return;
    this.time += dt;
    this.pruneEffects();
    switch (this.state) {
      case "idle":
        this.stepIdle(dt);
        break;
      case "charge":
        this.stepCharge(dt);
        break;
      case "cast":
        this.stepCast(dt);
        break;
      case "wait":
        this.stepWait(dt);
        break;
      case "bite":
        this.stepBite(dt);
        break;
      case "fight":
        this.stepFight(dt);
        break;
      case "landed":
        this.stepLanded(dt);
        break;
      case "lost":
        this.stepLost(dt);
        break;
      case "retrieve":
        this.stepRetrieve(dt);
        break;
    }
  }

  dispatch(event: GameEvent) {
    switch (event.type) {
      case "menu":
        if (event.open && this.state === "cast") return;
        if (event.open && this.state === "charge") this.cancelCharge();
        this.menuOpen = event.open;
        return;
      case "mute":
        this.save.settings.muted = event.muted;
        this.persist(this.save);
        return;
      case "theme":
        this.theme = event.theme;
        return;
      case "reduced":
        this.reduced = event.reduced;
        return;
      case "reset-log":
        this.save.catches = [];
        this.save.best = {};
        this.persist(this.save);
        return;
    }
    switch (event.type) {
      case "release":
        this.release();
        return;
      case "nudge":
        if (event.held && this.menuOpen) return;
        this.nudge = event.held ? event.dir : this.nudge === event.dir ? 0 : this.nudge;
        return;
      default:
        break;
    }
    if (this.menuOpen) return;
    switch (event.type) {
      case "press":
        this.press();
        return;
      case "aim":
        if (this.state === "idle") this.aim = clamp(event.ax, -AIM_MAX, AIM_MAX);
        return;
      case "retrieve":
        if (this.state === "wait" || this.state === "bite") this.beginRetrieve();
        return;
      case "keep":
        this.keep();
        return;
      case "let-go":
        this.letGo();
        return;
    }
  }

  snapshot(): MachineSnapshot {
    const snap = this.peek();
    this.cues = [];
    this.announcements = [];
    return snap;
  }

  peek(): MachineSnapshot {
    const fight = this.fight;
    const shadow =
      this.state === "fight" && fight
        ? { ax: fight.ax, d: fight.lineOut, size: sizeFor(fight.species, fight.lb), surfacing: isSurfacing(fight) }
        : null;
    return {
      state: this.state,
      time: this.time,
      speed: 1,
      reduced: this.reduced,
      theme: this.theme,
      aim: this.aim,
      power: this.power,
      perfect: this.perfect,
      bobber: this.bobberSnapshot(),
      tension: this.state === "fight" && fight ? fight.tension : null,
      lineOut: this.state === "fight" && fight ? fight.lineOut : null,
      reeling: this.isReeling(),
      reelSpin: this.reelSpin,
      running: this.state === "fight" && fight ? fight.running : false,
      shadow,
      species: this.species ? this.species.id : null,
      landing: this.landing,
      card: this.card,
      toast: this.toast,
      hint: this.hint,
      showTitle: this.showTitle,
      bigOneLanded: this.bigOneLanded,
      creelCount: this.save.catches.length,
      menuOpen: this.menuOpen,
      muted: this.save.settings.muted,
      effects: this.effects.slice(),
      cues: this.cues.slice(),
      announcements: this.announcements.slice(),
    };
  }

  goto(state: StateName, scenario?: Scenario) {
    this.menuOpen = false;
    this.toIdle();
    const target = scenario ?? state;
    if (target !== "idle") this.showTitle = false;
    switch (target) {
      case "idle":
        return;
      case "charge":
        this.beginCharge();
        return;
      case "cast":
        this.beginCharge();
        this.launch(targetFor(SCENARIO_POWER));
        return;
      case "retrieve":
        this.placeFloat(SCENARIO_D);
        this.beginRetrieve();
        return;
      case "wait":
        this.placeFloat(SCENARIO_D);
        return;
      case "bite":
        this.placeFloat(SCENARIO_D);
        this.beginBite();
        return;
      case "fight":
      case "fightSnap":
        this.placeFloat(SCENARIO_D, speciesById("bass"));
        this.hook();
        if (this.fight) {
          this.fight.stamina = SCENARIO_FIGHT_STAMINA;
          this.fight.reeling = false;
          if (target === "fightSnap") {
            this.fight.pinTension = true;
            this.fight.tension = 1;
          }
        }
        return;
      case "landed":
        this.placeFloat(SCENARIO_D, speciesById("bass"), SCENARIO_LANDED_LB);
        this.hook();
        if (this.fight) {
          this.fight.reeling = false;
          this.fight.lineOut = 0;
        }
        this.land();
        return;
      case "lost":
        this.placeFloat(SCENARIO_D, speciesById("bass"));
        this.hook();
        if (this.fight) this.fight.reeling = false;
        this.lose("slack");
        return;
    }
  }

  private isReeling() {
    if (this.state === "fight") return this.fight?.reeling ?? false;
    if (this.state === "retrieve") return true;
    if (this.state === "lost") return this.lost?.reason === "slack";
    return false;
  }

  private bobberSnapshot(): Snapshot["bobber"] {
    const { ax, d } = this.float;
    const at = (mode: BobberMode, t = 0) => ({ ax, d, mode, t });
    switch (this.state) {
      case "idle":
      case "charge":
        return { ax: this.aim, d: 0, mode: "hung", t: 0 };
      case "cast":
        return at("flying", this.flightDurationMs > 0 ? clamp(this.flightElapsedMs / this.flightDurationMs, 0, 1) : 1);
      case "wait":
        return at(this.nibbleUntil !== null ? "dipped" : "floating");
      case "bite":
        return at("under");
      case "fight": {
        const fight = this.fight;
        if (!fight) return at("floating");
        return { ax: fight.ax, d: Math.max(0, fight.lineOut), mode: fight.running ? "dipped" : "floating", t: 0 };
      }
      case "landed":
        return at("hidden");
      case "lost": {
        const lost = this.lost;
        if (!lost || lost.reason === "snapped") return at("hidden");
        const t = clamp(lost.elapsedMs / LOST_TOAST_MS, 0, 1);
        return { ax: lost.from.ax, d: lost.from.d, mode: "flying", t };
      }
      case "retrieve":
        return at("flying", clamp(this.retrieveElapsedMs / RETRIEVE_MS, 0, 1));
    }
  }

  private pruneEffects() {
    const life = SPLASH_MS / MS;
    if (this.effects.some((e) => this.time - e.start > life)) {
      this.effects = this.effects.filter((e) => this.time - e.start <= life);
    }
  }

  private addEffect(kind: Effect["kind"], ax: number, d: number) {
    this.effects.push({ kind, ax, d, start: this.time });
  }

  private press() {
    switch (this.state) {
      case "idle":
        this.beginCharge();
        return;
      case "wait":
        this.beginRetrieve();
        return;
      case "bite":
        this.hook();
        return;
      case "fight":
        if (this.fight) this.fight.reeling = true;
        return;
      default:
        return;
    }
  }

  private release() {
    switch (this.state) {
      case "charge":
        this.launch(targetFor(this.power ?? 0));
        return;
      case "fight":
        if (this.fight) this.fight.reeling = false;
        return;
      default:
        return;
    }
  }

  private stepIdle(dt: number) {
    if (this.nudge !== 0) this.aim = clamp(this.aim + this.nudge * AIM_NUDGE_RATE * dt, -AIM_MAX, AIM_MAX);
  }

  private beginCharge() {
    this.state = "charge";
    this.chargeMs = 0;
    this.power = 0;
    this.perfect = false;
    this.hint = HINTS.cast;
  }

  private cancelCharge() {
    this.state = "idle";
    this.chargeMs = 0;
    this.power = null;
    this.perfect = false;
    this.hint = this.bigOneLanded ? HINTS.gotIt : HINTS.cast;
  }

  private stepCharge(dt: number) {
    this.chargeMs += dt * MS;
    this.power = powerAt(this.chargeMs);
    this.perfect = isPerfect(this.power);
  }

  private launch(target: { d: number; perfect: boolean }) {
    this.state = "cast";
    this.showTitle = false;
    this.power = null;
    this.perfect = target.perfect;
    this.float = { ax: this.aim, d: target.d };
    this.flightElapsedMs = 0;
    this.flightDurationMs = flightMs(target.d);
    this.hint = HINTS.wait;
    if (target.perfect) this.cues.push("perfect");
    this.cues.push("cast");
  }

  private stepCast(dt: number) {
    this.flightElapsedMs += dt * MS;
    if (this.flightElapsedMs >= this.flightDurationMs) this.splashDown();
  }

  private splashDown() {
    const { ax, d } = this.float;
    this.addEffect("splash", ax, d);
    this.cues.push("plop");
    this.perfect = false;
    this.announcements.push(`Cast, ${yardsAt(d)} yards`);
    this.placeFloat(d, null, null, ax);
  }

  private placeFloat(d: number, species: Species | null = null, lb: number | null = null, ax = this.float.ax) {
    this.float = { ax, d };
    this.species = species ?? rollSpecies(this.rng, d, this.theme, this.save.catches.length);
    this.lb = lb ?? rollWeight(this.rng, this.species);
    this.beginWait(false);
  }

  private beginWait(retry: boolean) {
    this.state = "wait";
    this.plan = rollWait(this.rng, this.float.d, retry);
    this.waitElapsed = 0;
    this.nibbleIndex = 0;
    this.nibbleUntil = null;
    this.hint = HINTS.wait;
    this.toast = null;
  }

  private stepWait(dt: number) {
    this.waitElapsed += dt;
    if (this.nibbleUntil !== null && this.time >= this.nibbleUntil) this.nibbleUntil = null;
    while (this.nibbleIndex < this.plan.nibbles.length) {
      const next = this.plan.nibbles[this.nibbleIndex];
      if (next === undefined || this.waitElapsed < next) break;
      this.nibbleIndex += 1;
      this.nibbleUntil = this.time + NIBBLE_MS / MS;
      this.cues.push("nibble");
      this.addEffect("ring", this.float.ax, this.float.d);
    }
    if (this.waitElapsed >= this.plan.duration) this.beginBite();
  }

  private beginBite() {
    this.state = "bite";
    this.nibbleUntil = null;
    this.biteElapsedMs = 0;
    this.biteWindowMs = this.reduced ? HOOK_WINDOW_REDUCED_MS : HOOK_WINDOW_MS;
    this.hint = HINTS.bite;
    this.cues.push("bite");
    this.addEffect("foam", this.float.ax, this.float.d);
    this.announcements.push("Bite");
  }

  private stepBite(dt: number) {
    this.biteElapsedMs += dt * MS;
    if (this.biteElapsedMs >= this.biteWindowMs) {
      this.addEffect("ring", this.float.ax, this.float.d);
      this.beginWait(true);
    }
  }

  private hook() {
    const species = this.species;
    if (!species) return;
    this.state = "fight";
    this.fight = createFight(species, this.lb, this.float.d, this.float.ax);
    this.fight.reeling = true;
    this.hint = HINTS.fight;
  }

  private stepFight(dt: number) {
    const fight = this.fight;
    if (!fight) {
      this.toIdle();
      return;
    }
    if (fight.reeling) this.reelSpin += REEL_SPIN_RATE * dt;
    const outcome = stepFight(fight, dt, this.rng);
    this.float = { ax: fight.ax, d: Math.max(0, fight.lineOut) };
    switch (outcome) {
      case "landed":
        this.land();
        return;
      case "snapped":
        this.lose("snapped");
        return;
      case "slack":
        this.lose("slack");
        return;
      case "fighting":
        return;
    }
  }

  private land() {
    const fight = this.fight;
    if (!fight) return;
    this.state = "landed";
    this.landing = { species: fight.species.id, t: 0 };
    this.landingElapsedMs = 0;
    this.card = null;
    this.hint = HINTS.none;
    this.cues.push("landed");
    this.announcements.push(`Landed a ${fight.lb} lb ${fight.species.name.toLowerCase()}`);
  }

  private stepLanded(dt: number) {
    if (!this.landing || this.card) return;
    this.landingElapsedMs += dt * MS;
    const t = clamp(this.landingElapsedMs / LANDING_MS, 0, 1);
    this.landing = { species: this.landing.species, t };
    if (t >= 1) this.showCard();
  }

  private showCard() {
    const fight = this.fight;
    if (!fight) return;
    const species = fight.species;
    const best = this.save.best[species.id] ?? 0;
    const at = this.now ? this.now() : Math.round(this.time * MS);
    const id = `${species.id}-${this.save.catches.length + 1}-${Math.floor(this.rng.next() * 0xffffffff).toString(16)}`;
    const entry: Catch = {
      id,
      species: species.id,
      lb: fight.lb,
      yards: yardsAt(fight.hookedD),
      night: this.theme === "dark",
      at,
    };
    const bigOne = species.id === "marlin";
    this.card = { ...entry, record: fight.lb > best, bigOne };
    if (bigOne) this.bigOneLanded = true;
  }

  private keep() {
    if (this.state !== "landed" || !this.card) return;
    const card = this.card;
    const entry: Catch = { id: card.id, species: card.species, lb: card.lb, yards: card.yards, night: card.night, at: card.at };
    this.save.catches.push(entry);
    while (this.save.catches.length > CATCH_LOG_CAP) this.save.catches.shift();
    const best = this.save.best[entry.species] ?? 0;
    if (entry.lb > best) this.save.best[entry.species] = entry.lb;
    this.persist(this.save);
    this.announcements.push(`Kept a ${entry.lb} lb ${speciesById(entry.species).name.toLowerCase()}`);
    this.toIdle();
  }

  private letGo() {
    if (this.state !== "landed" || !this.card) return;
    this.cues.push("release");
    this.addEffect("splash", this.float.ax, this.float.d);
    this.announcements.push("Released");
    this.toIdle();
  }

  private lose(reason: Lost["reason"]) {
    this.state = "lost";
    const silenceMs = reason === "snapped" ? SNAP_SILENCE_MS : 0;
    this.lost = { reason, from: { ...this.float }, elapsedMs: 0, durationMs: silenceMs + LOST_TOAST_MS };
    this.toast = null;
    this.hint = HINTS.none;
    if (reason === "snapped") {
      this.cues.push("snap");
      return;
    }
    this.cues.push("retrieve");
    this.showLostToast(TOASTS.slack);
  }

  private showLostToast(text: string) {
    this.toast = text;
    this.announcements.push(text.replace(/\.$/, ""));
  }

  private stepLost(dt: number) {
    const lost = this.lost;
    if (!lost) {
      this.toIdle();
      return;
    }
    lost.elapsedMs += dt * MS;
    if (lost.reason === "slack") this.reelSpin += REEL_SPIN_RATE * dt;
    if (lost.reason === "snapped" && this.toast === null && lost.elapsedMs >= SNAP_SILENCE_MS) this.showLostToast(TOASTS.snapped);
    if (lost.elapsedMs >= lost.durationMs) this.toIdle();
  }

  private beginRetrieve() {
    this.state = "retrieve";
    this.retrieveElapsedMs = 0;
    this.nibbleUntil = null;
    this.hint = HINTS.none;
    this.cues.push("retrieve");
  }

  private stepRetrieve(dt: number) {
    this.retrieveElapsedMs += dt * MS;
    this.reelSpin += REEL_SPIN_RATE * dt;
    if (this.retrieveElapsedMs >= RETRIEVE_MS) this.toIdle();
  }

  private toIdle() {
    this.state = "idle";
    this.power = null;
    this.perfect = false;
    this.species = null;
    this.lb = 0;
    this.fight = null;
    this.landing = null;
    this.card = null;
    this.lost = null;
    this.toast = null;
    this.nibbleUntil = null;
    this.float = { ax: this.aim, d: 0 };
    this.hint = this.bigOneLanded ? HINTS.gotIt : HINTS.cast;
  }
}

export function createMachine(deps: MachineOptions): Machine {
  return new GameMachine(deps);
}
