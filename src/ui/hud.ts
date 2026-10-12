import { loadSave } from "../game/save";
import { speciesById } from "../game/species";
import { applyTheme, resolveTheme } from "../game/theme";
import type { GameEvent, InputMode, SaveData, Snapshot, StateName, Theme } from "../game/types";
import { CREEL, MOON_ICON, SUN_ICON } from "../pixel/bitmaps";
import { yardsFor } from "../scene/geometry";
import { createCard } from "./card";
import { el, formatLb, setAttr, setClass, setInert, setText, stopAll } from "./dom";
import { detectInputMode } from "./howto";
import { MENU_ICON, SPEAKER_OFF, SPEAKER_ON, pixelIcon } from "./icons";
import { createIntro } from "./intro";
import { createLog } from "./log";
import { createMenu } from "./menu";
import { createReelHint } from "./reelhint";

export type Ui = { update(snap: Snapshot): void };

type Deps = { dispatch: (e: GameEvent) => void; unlockAudio: () => void; getSave?: () => SaveData };

const TITLE_LINE = "There's a big one out past the point. Nobody has landed it.";
const TOAST_FADE_MS = 180;
const GROUND: Record<Theme, string> = { light: "#d6e2e4", dark: "#0a1119" };

function announcement(prev: Snapshot | null, snap: Snapshot): string | null {
  if (prev && prev.state === snap.state) return null;
  const from: StateName | null = prev?.state ?? null;
  switch (snap.state) {
    case "cast":
      return "Casting";
    case "wait":
      if (from === "cast") return `Cast, ${yardsFor(snap.bobber.d)} yards`;
      if (from === "bite") return "Missed it";
      return null;
    case "bite":
      return "Bite";
    case "fight":
      return "Hooked, reel it in";
    case "retrieve":
      return "Reeling in";
    case "lost":
      return null;
    case "idle":
      return from === "landed" || from === "lost" || from === "retrieve" ? "Ready to cast" : null;
    default:
      return null;
  }
}

export function mountUi(root: HTMLElement, deps: Deps): Ui {
  const creelCount = el("span", { class: "pill-count", "data-ui": "creel-count", text: "0" });
  const creel = el("button", { type: "button", class: "pill hud-pill", "data-ui": "creel", "aria-label": "Open the log" }, [
    pixelIcon(CREEL, "icon icon-creel"),
    el("span", { class: "pill-label", text: "Catches" }),
    creelCount,
  ]);
  const sun = pixelIcon(SUN_ICON, "icon icon-sun");
  const moon = pixelIcon(MOON_ICON, "icon icon-moon");
  const themeLabel = el("span", { class: "pill-label", text: "Night" });
  const theme = el("button", { type: "button", class: "pill hud-pill", "data-ui": "theme", "aria-label": "Switch to day" }, [sun, moon, themeLabel]);
  const speakerOn = pixelIcon(SPEAKER_ON, "icon icon-sound-on");
  const speakerOff = pixelIcon(SPEAKER_OFF, "icon icon-sound-off");
  const muteLabel = el("span", { class: "pill-label", text: "Sound" });
  const mute = el("button", { type: "button", class: "pill hud-pill", "data-ui": "mute", "aria-label": "Mute sound", "aria-pressed": "false" }, [
    speakerOn,
    speakerOff,
    muteLabel,
  ]);
  const menu = el("button", { type: "button", class: "pill hud-pill", "data-ui": "menu", "aria-label": "Open the menu" }, [
    pixelIcon(MENU_ICON, "icon icon-menu"),
    el("span", { class: "pill-label", text: "Menu" }),
  ]);
  const topLeft = el("div", { class: "hud-corner hud-top-left" }, [creel]);
  const topRight = el("div", { class: "hud-corner hud-top-right" }, [theme, mute, menu]);

  const titleText = el("h1", { class: "title-word", "data-ui": "title", text: "The Big One" });
  const titleHint = el("p", { class: "pixel-label title-hint", "data-ui": "title-hint", text: "" });
  const titleProse = el("p", { class: "title-prose", text: TITLE_LINE });
  const titleBlock = el("div", { class: "title-block", "data-ui": "title-block" }, [titleText, titleHint, titleProse]);

  const hint = el("p", { class: "pill hud-hint", "data-ui": "hint", text: "" });
  const toast = el("p", { class: "pill is-accent hud-toast", "data-ui": "toast", role: "status", text: "" });
  const bottom = el("div", { class: "hud-bottom" }, [toast, hint]);
  const reelHint = createReelHint();
  const intro = createIntro(detectInputMode());

  const live = el("div", { class: "visually-hidden", "data-ui": "live", "aria-live": "polite", "aria-atomic": "true" });

  const readSave = deps.getSave ?? loadSave;
  let latest: Snapshot | null = null;
  let logPausing = false;
  let resetPending = false;
  const dispatch = (event: GameEvent) => {
    if (event.type === "reset-log") resetPending = true;
    deps.dispatch(event);
  };
  const card = createCard(dispatch);
  const setTheme = (next: Theme) => {
    applyTheme(next);
    dispatch({ type: "theme", theme: next });
  };
  const refreshLog = () => log.refresh(readSave(), latest?.bigOneLanded ?? false);
  const openLog = (fromMenu: boolean) => {
    refreshLog();
    if (!fromMenu && latest && latest.state !== "cast" && !latest.menuOpen) {
      logPausing = true;
      dispatch({ type: "menu", open: true });
    }
    log.open();
  };
  const log = createLog({
    dispatch,
    onClose: () => {
      if (!logPausing) return;
      logPausing = false;
      dispatch({ type: "menu", open: false });
    },
  });
  const menuPanel = createMenu({ dispatch, openLog: () => openLog(true), setTheme });

  creel.addEventListener("click", () => {
    if (log.isOpen()) log.close();
    else openLog(false);
  });
  theme.addEventListener("click", () => setTheme((latest?.theme ?? resolveTheme()) === "dark" ? "light" : "dark"));
  mute.addEventListener("click", () => dispatch({ type: "mute", muted: !(latest?.muted ?? false) }));
  menu.addEventListener("click", () => dispatch({ type: "menu", open: !(latest?.menuOpen ?? false) }));

  const hud = el("div", { class: "hud" }, [topLeft, topRight, titleBlock, reelHint.el, bottom, live, intro.el, card.el, menuPanel.el, log.el]);
  for (const pill of [creel, theme, mute, menu]) {
    stopAll(pill);
    pill.addEventListener("click", (event) => {
      if ((event as MouseEvent).detail > 0) pill.blur();
    });
  }
  root.append(hud);

  let unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    deps.unlockAudio();
  };
  hud.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target instanceof Element && event.target.closest("button")) unlock();
    },
    true,
  );
  hud.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" && event.target instanceof Element && event.target.closest("button")) unlock();
    },
    true,
  );

  window.addEventListener(
    "keydown",
    (event) => {
      const target = event.target;
      const inUi = target instanceof Node && target !== document.body && hud.contains(target);
      if (event.key === "Escape") {
        if (menuPanel.helpOpen()) {
          menuPanel.showHelp(false);
          event.stopImmediatePropagation();
          event.preventDefault();
          return;
        }
        if (log.isOpen()) {
          log.close();
          event.stopImmediatePropagation();
          event.preventDefault();
          return;
        }
        return;
      }
      if (inUi) {
        if (event.key === " " || event.key === "Enter") {
          event.stopImmediatePropagation();
          return;
        }
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "l" || event.key === "L") {
        if (latest?.card) return;
        if (log.isOpen()) log.close();
        else openLog(false);
        event.stopImmediatePropagation();
        event.preventDefault();
        return;
      }
      if (event.key === "?") {
        if (latest?.state === "cast" || latest?.card) return;
        if (latest?.menuOpen) menuPanel.showHelp(!menuPanel.helpOpen());
        else {
          wantHelp = true;
          dispatch({ type: "menu", open: true });
        }
        event.stopImmediatePropagation();
        event.preventDefault();
        return;
      }
      if (log.isOpen()) event.stopImmediatePropagation();
    },
    true,
  );
  window.addEventListener(
    "keyup",
    (event) => {
      const target = event.target;
      const inUi = target instanceof Node && target !== document.body && hud.contains(target);
      if (inUi && (event.key === " " || event.key === "Enter")) event.stopImmediatePropagation();
      else if (log.isOpen()) event.stopImmediatePropagation();
    },
    true,
  );

  let wantHelp = false;
  let prev: Snapshot | null = null;
  let titleGone = false;
  let lastLive = "";
  let liveFlip = false;
  let lastCreel = -1;
  let lastTheme: Theme | null = null;
  let lastBigOne = false;
  let toastTimer = 0;
  let dialogOpen = false;
  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  const update = (snap: Snapshot) => {
    latest = snap;
    const mode: InputMode = snap.inputMode;
    intro.setMode(mode);
    reelHint.update(snap.showReelHint, mode);

    if (snap.theme !== lastTheme) {
      lastTheme = snap.theme;
      if (resolveTheme() !== snap.theme) applyTheme(snap.theme);
      if (themeMeta) setAttr(themeMeta, "content", GROUND[snap.theme]);
      const dark = snap.theme === "dark";
      setText(themeLabel, dark ? "Night" : "Day");
      setAttr(theme, "aria-label", dark ? "Switch to day" : "Switch to night");
      setClass(sun, "is-off", dark);
      setClass(moon, "is-off", !dark);
    }

    const muted = snap.muted;
    if (!prev || prev.muted !== muted) {
      setText(muteLabel, muted ? "Muted" : "Sound");
      setAttr(mute, "aria-label", muted ? "Unmute sound" : "Mute sound");
      setAttr(mute, "aria-pressed", muted ? "true" : "false");
      setClass(speakerOn, "is-off", muted);
      setClass(speakerOff, "is-off", !muted);
    }

    let logStale = resetPending;
    resetPending = false;
    if (snap.creelCount !== lastCreel) {
      lastCreel = snap.creelCount;
      setText(creelCount, String(snap.creelCount));
      setAttr(creel, "aria-label", `Open the log, ${snap.creelCount} kept`);
      logStale = true;
    }
    if (snap.bigOneLanded !== lastBigOne) {
      lastBigOne = snap.bigOneLanded;
      logStale = true;
    }
    if (logStale && log.isOpen()) refreshLog();

    setText(hint, snap.hint);
    setText(titleHint, snap.hint);
    const toastText = snap.toast ?? "";
    if (toastText !== "") {
      if (toastTimer) window.clearTimeout(toastTimer);
      toastTimer = 0;
      setText(toast, toastText);
    } else if (toast.textContent !== "" && !toastTimer) {
      toastTimer = window.setTimeout(() => {
        toastTimer = 0;
        if (!latest?.toast) setText(toast, "");
      }, TOAST_FADE_MS);
    }
    setClass(toast, "is-visible", toastText !== "");
    setClass(hint, "is-quiet", toastText !== "" || snap.hint === "");

    if (!titleGone && !snap.showTitle) {
      titleGone = true;
      setClass(titleBlock, "is-gone", true);
    }
    if (!titleGone) setClass(titleBlock, "is-visible", snap.showTitle);

    card.update(snap.card, snap.theme);
    if (snap.card && (!prev || !prev.card)) {
      const species = speciesById(snap.card.species);
      const line = snap.card.species === "marlin" ? `Landed the big one, ${formatLb(snap.card.lb)}` : `Landed a ${formatLb(snap.card.lb)} ${species.name.toLowerCase()}`;
      announce(snap.card.record ? `${line}. New record` : line);
    }

    menuPanel.update(snap);
    if (wantHelp && snap.menuOpen) {
      wantHelp = false;
      menuPanel.showHelp(true);
    }
    if (!snap.menuOpen && prev?.menuOpen && log.isOpen()) {
      logPausing = false;
      log.close();
    }

    const modal = snap.card !== null || snap.menuOpen || log.isOpen();
    if (modal !== dialogOpen) {
      dialogOpen = modal;
      setInert(topLeft, modal);
      setInert(topRight, modal);
    }

    const message = announcement(prev, snap);
    if (message) announce(message);
    if (snap.toast !== null && snap.toast !== prev?.toast) announce(snap.toast.replace(/\.$/, ""));
    prev = snap;
  };

  const announce = (message: string) => {
    if (message === lastLive) {
      liveFlip = !liveFlip;
      setText(live, liveFlip ? `${message}.` : message);
      return;
    }
    lastLive = message;
    setText(live, message);
  };

  return { update };
}
