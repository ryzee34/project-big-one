import type { GameEvent, InputMode, Snapshot, Theme } from "../game/types";
import { el, releaseFocus, setClass, setHidden, setText, stopAll, trapFocus } from "./dom";
import { KEYS_ROW, detectInputMode, howToRows, renderHowTo } from "./howto";

export type MenuPanel = {
  el: HTMLElement;
  update(snap: Snapshot): void;
  showHelp(on: boolean): void;
  helpOpen(): boolean;
};

type Deps = {
  dispatch: (event: GameEvent) => void;
  openLog: () => void;
  setTheme: (theme: Theme) => void;
};

export function createMenu(deps: Deps): MenuPanel {
  const resume = el("button", { type: "button", class: "pill menu-item", "data-action": "resume", text: "Resume" });
  const help = el("button", { type: "button", class: "pill menu-item", "data-action": "help", text: "Help" });
  const log = el("button", { type: "button", class: "pill menu-item", "data-action": "log", text: "Log" });
  const theme = el("button", { type: "button", class: "pill menu-item", "data-action": "theme", text: "Theme: Night" });
  const sound = el("button", { type: "button", class: "pill menu-item", "data-action": "sound", text: "Sound: On" });
  const reset = el("button", { type: "button", class: "pill menu-item", "data-action": "reset", text: "Reset log" });
  const items = el("div", { class: "menu-items" }, [resume, help, log, theme, sound, reset]);
  const menuView = el("div", { class: "menu-view" }, [
    el("h2", { class: "panel-title", id: "menu-title", text: "Paused" }),
    items,
  ]);

  const back = el("button", { type: "button", class: "pill", "data-action": "help-back", text: "Back" });
  const helpList = el("ul", { class: "howto-list help-rows", "data-ui": "help-rows" });
  let helpMode: InputMode | null = null;
  const renderHelp = (mode: InputMode) => {
    if (mode === helpMode) return;
    helpMode = mode;
    renderHowTo(helpList, [...howToRows(mode), KEYS_ROW]);
  };
  renderHelp(detectInputMode());
  const helpView = el("div", { class: "help-view", "data-ui": "help" }, [
    el("h2", { class: "panel-title", text: "How to fish" }),
    el("p", { class: "card-prose", text: "There's a big one out past the point. It only bites far out, at night more than by day, and only once you've kept a few." }),
    helpList,
    el("div", { class: "card-footer" }, [el("span", { class: "pixel-label panel-note", text: "Press ? any time" }), back]),
  ]);
  helpView.hidden = true;

  const panel = el(
    "section",
    { class: "card panel menu-panel", "data-ui": "menu-panel", "data-interactive": "", role: "dialog", "aria-modal": "true", "aria-labelledby": "menu-title" },
    [menuView, helpView],
  );
  const scrim = el("div", { class: "scrim", "data-interactive": "" });
  const root = el("div", { class: "overlay menu-overlay" }, [scrim, panel]);
  root.hidden = true;
  stopAll(root);
  trapFocus(panel);

  let current: Snapshot | null = null;
  let armed = false;
  let armTimer = 0;
  const disarm = () => {
    armed = false;
    if (armTimer) window.clearTimeout(armTimer);
    armTimer = 0;
    setText(reset, "Reset log");
    setClass(reset, "is-accent", false);
  };

  const showHelp = (on: boolean) => {
    setHidden(helpView, !on);
    setHidden(menuView, on);
    if (on) back.focus({ preventScroll: true });
    else if (!root.hidden) resume.focus({ preventScroll: true });
  };

  const closeMenu = () => deps.dispatch({ type: "menu", open: false });
  resume.addEventListener("click", closeMenu);
  scrim.addEventListener("click", closeMenu);
  help.addEventListener("click", () => showHelp(true));
  back.addEventListener("click", () => showHelp(false));
  log.addEventListener("click", () => deps.openLog());
  theme.addEventListener("click", () => {
    const next: Theme = (current?.theme ?? "dark") === "dark" ? "light" : "dark";
    deps.setTheme(next);
  });
  sound.addEventListener("click", () => deps.dispatch({ type: "mute", muted: !(current?.muted ?? false) }));
  reset.addEventListener("click", () => {
    if (!armed) {
      armed = true;
      setText(reset, "Sure? Tap again");
      setClass(reset, "is-accent", true);
      armTimer = window.setTimeout(disarm, 4000);
      return;
    }
    disarm();
    deps.dispatch({ type: "reset-log" });
  });

  const update = (snap: Snapshot) => {
    const wasOpen = !root.hidden;
    current = snap;
    renderHelp(snap.inputMode);
    setText(theme, snap.theme === "dark" ? "Theme: Night" : "Theme: Day");
    setText(sound, snap.muted ? "Sound: Off" : "Sound: On");
    if (snap.menuOpen !== wasOpen) {
      if (!snap.menuOpen) releaseFocus(root);
      root.hidden = !snap.menuOpen;
      if (snap.menuOpen) {
        if (helpView.hidden) resume.focus({ preventScroll: true });
      } else {
        disarm();
        showHelp(false);
      }
    }
  };

  return { el: root, update, showHelp, helpOpen: () => !helpView.hidden && !root.hidden };
}
