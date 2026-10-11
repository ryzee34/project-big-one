import { clamp } from "../math";
import { AIM_MARKER_D, AIM_MAX, WATER_FAR_SCALE, WATER_HALF_WIDTH_RATIO } from "./tuning";
import type { GameEvent, StateName } from "./types";

export type KeyAction = "menu" | "mute" | "theme" | "log" | "help";

const UI_SELECTOR = "#ui";
const CONTROL_SELECTOR = "button, input, select, textarea, a, [contenteditable]";
const TEXT_SELECTOR = "input, select, textarea, [contenteditable]";

export function aimFromPointer(clientX: number, left: number, width: number) {
  if (width <= 0) return 0;
  const half = width * WATER_HALF_WIDTH_RATIO * (WATER_FAR_SCALE + (1 - WATER_FAR_SCALE) * (1 - AIM_MARKER_D));
  const offset = clientX - left - width / 2;
  return clamp(offset / half, -AIM_MAX, AIM_MAX);
}

function insideUi(target: EventTarget | null) {
  return target instanceof Element && target.closest(UI_SELECTOR) !== null;
}

function onControl(target: EventTarget | null) {
  return target instanceof Element && target.closest(CONTROL_SELECTOR) !== null;
}

function inField(target: EventTarget | null) {
  return target instanceof Element && target.closest(TEXT_SELECTOR) !== null;
}

function blurUi() {
  const active = document.activeElement;
  if (active instanceof HTMLElement && insideUi(active)) active.blur();
}

export function bindInput(
  target: HTMLElement,
  dispatch: (e: GameEvent) => void,
  getState: () => StateName,
  onKey?: (action: KeyAction) => void,
): () => void {
  target.style.touchAction = "none";
  let activePointer: number | null = null;
  let spaceHeld = false;
  const arrows: Record<"ArrowLeft" | "ArrowRight", boolean> = { ArrowLeft: false, ArrowRight: false };

  const aimAt = (clientX: number) => {
    const rect = target.getBoundingClientRect();
    dispatch({ type: "aim", ax: aimFromPointer(clientX, rect.left, rect.width) });
  };

  const capture = (pointerId: number) => {
    try {
      target.setPointerCapture(pointerId);
      return true;
    } catch {
      return false;
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (insideUi(event.target)) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (activePointer !== null) return;
    activePointer = event.pointerId;
    event.preventDefault();
    blurUi();
    capture(event.pointerId);
    if (getState() === "idle") aimAt(event.clientX);
    dispatch({ type: "press" });
  };

  const onPointerMove = (event: PointerEvent) => {
    if (insideUi(event.target)) return;
    if (getState() === "idle") aimAt(event.clientX);
  };

  const endPointer = (event: PointerEvent) => {
    if (activePointer === null || event.pointerId !== activePointer) return;
    activePointer = null;
    dispatch({ type: "release" });
  };

  const releaseAll = () => {
    if (activePointer !== null) {
      activePointer = null;
      dispatch({ type: "release" });
    }
    if (spaceHeld) {
      spaceHeld = false;
      dispatch({ type: "release" });
    }
    if (arrows.ArrowLeft) {
      arrows.ArrowLeft = false;
      dispatch({ type: "nudge", dir: -1, held: false });
    }
    if (arrows.ArrowRight) {
      arrows.ArrowRight = false;
      dispatch({ type: "nudge", dir: 1, held: false });
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case " ":
        if (onControl(event.target)) return;
        event.preventDefault();
        if (event.repeat || spaceHeld) return;
        spaceHeld = true;
        dispatch({ type: "press" });
        return;
      case "ArrowLeft":
      case "ArrowRight": {
        if (onControl(event.target)) return;
        event.preventDefault();
        if (event.repeat || arrows[event.key]) return;
        arrows[event.key] = true;
        dispatch({ type: "nudge", dir: event.key === "ArrowLeft" ? -1 : 1, held: true });
        return;
      }
      case "r":
      case "R":
        if (inField(event.target) || event.repeat) return;
        dispatch({ type: "retrieve" });
        return;
      case "Escape":
        if (event.repeat) return;
        onKey?.("menu");
        return;
      case "m":
      case "M":
        if (inField(event.target) || event.repeat) return;
        onKey?.("mute");
        return;
      case "t":
      case "T":
        if (inField(event.target) || event.repeat) return;
        onKey?.("theme");
        return;
      case "l":
      case "L":
        if (inField(event.target) || event.repeat) return;
        onKey?.("log");
        return;
      case "?":
        if (inField(event.target) || event.repeat) return;
        onKey?.("help");
        return;
      default:
        return;
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    switch (event.key) {
      case " ":
        if (!spaceHeld) return;
        spaceHeld = false;
        dispatch({ type: "release" });
        return;
      case "ArrowLeft":
      case "ArrowRight":
        if (!arrows[event.key]) return;
        arrows[event.key] = false;
        dispatch({ type: "nudge", dir: event.key === "ArrowLeft" ? -1 : 1, held: false });
        return;
      default:
        return;
    }
  };

  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", endPointer);
  target.addEventListener("pointercancel", endPointer);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", releaseAll);

  return () => {
    target.removeEventListener("pointerdown", onPointerDown);
    target.removeEventListener("pointermove", onPointerMove);
    target.removeEventListener("pointerup", endPointer);
    target.removeEventListener("pointercancel", endPointer);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("blur", releaseAll);
    target.style.touchAction = "";
  };
}
