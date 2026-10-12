import { createAudio } from "./game/audio";
import { exposeDebug } from "./game/debug";
import { createHaptics } from "./game/haptics";
import { bindInput, type KeyAction } from "./game/input";
import { startLoop } from "./game/loop";
import { createMachine } from "./game/machine";
import { readParams } from "./game/params";
import { createLazyRng, createRng } from "./game/rng";
import { loadSave, storeSave } from "./game/save";
import { applyTheme, initialTheme, storedTheme, watchTheme } from "./game/theme";
import type { GameEvent, Snapshot } from "./game/types";
import { createRenderer } from "./scene/render";
import { createStage } from "./scene/stage";
import { detectInputMode } from "./ui/howto";
import { mountUi } from "./ui/hud";

const params = readParams(window.location.search);
const theme = params.theme ?? storedTheme() ?? initialTheme(new Date().getHours());
applyTheme(theme, params.theme === null);
void document.fonts.load("9px Silkscreen");
void document.fonts.load("14px Archivo");

const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-ui="stage"]');
const root = document.getElementById("ui");
if (!canvas || !root) throw new Error("stage canvas or ui root missing");

const stage = createStage(canvas);
const renderer = createRenderer(stage, theme);
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

let firstFrame: number | null = null;
const seedFromClock = () => Math.floor(performance.timeOrigin + (firstFrame ?? performance.now()));
const rng = params.seed === null ? createLazyRng(seedFromClock) : createRng(params.seed);

const boot = () => {
  const audio = createAudio();
  const haptics = createHaptics();
  const machine = createMachine({
    rng,
    reduced: motion.matches,
    theme,
    inputMode: detectInputMode(),
    save: loadSave(),
    persist: storeSave,
    now: () => Date.now(),
  });
  const dispatch = (event: GameEvent) => machine.dispatch(event);

  const ui = mountUi(root, { dispatch, unlockAudio: audio.unlock });

  const render = (snap: Snapshot, now: number) => {
    if (firstFrame === null) firstFrame = now;
    renderer.render(snap, snap.reduced ? 0 : now);
    ui.update(snap);
    audio.update(snap);
    haptics.update(snap);
    for (const cue of snap.cues) audio.play(cue);
  };
  const loop = startLoop({ machine, render, speed: params.speed });
  exposeDebug(machine, loop.advance);

  watchTheme((next) => {
    renderer.setTheme(next);
    dispatch({ type: "theme", theme: next });
  });
  motion.addEventListener("change", (event) => dispatch({ type: "reduced", reduced: event.matches }));

  const onKey = (action: KeyAction) => {
    switch (action) {
      case "menu":
        dispatch({ type: "menu", open: !machine.peek().menuOpen });
        return;
      case "mute":
        dispatch({ type: "mute", muted: !machine.peek().muted });
        return;
      case "theme":
        applyTheme(machine.peek().theme === "dark" ? "light" : "dark");
        return;
      default:
        return;
    }
  };
  const fromInput = (event: GameEvent) => {
    if (event.type === "press") audio.unlock();
    dispatch(event);
  };
  bindInput(canvas, fromInput, () => machine.peek().state, onKey);
};

boot();
