import { clamp } from "../math";
import {
  AIM_MARKER_D,
  AIM_MAX,
  CIRCLE_MAX_STEP_REVS,
  CIRCLE_MIN_STEP_PX,
  CIRCLE_PRIME_REVS,
  WATER_FAR_SCALE,
  WATER_HALF_WIDTH_RATIO,
  WHEEL_LINE_PX,
  WHEEL_MAX_REVS_PER_EVENT,
  WHEEL_PAGE_PX,
  WHEEL_PX_PER_REV,
  WHEEL_STREAM_GAP_MS,
  WHEEL_STREAM_PX_PER_REV,
} from "./tuning";
import type { GameEvent, StateName } from "./types";

export type KeyAction = "menu" | "mute" | "theme" | "log" | "help";

const UI_SELECTOR = "#ui";
const CONTROL_SELECTOR = "button, input, select, textarea, a, [contenteditable]";
const TEXT_SELECTOR = "input, select, textarea, [contenteditable]";
const WHEEL_MODE_PX: Record<number, number> = { 0: 1, 1: WHEEL_LINE_PX, 2: WHEEL_PAGE_PX };
const TAU = Math.PI * 2;

export function wheelRevs(deltaY: number, deltaMode: number, streamed = false) {
  const px = Math.abs(deltaY) * (WHEEL_MODE_PX[deltaMode] ?? 1);
  return Math.min(WHEEL_MAX_REVS_PER_EVENT, px / (streamed ? WHEEL_STREAM_PX_PER_REV : WHEEL_PX_PER_REV));
}

export type Spin = { dir: number; wound: number };

export function createSpin(): Spin {
  return { dir: 0, wound: 0 };
}

export function headingTurn(previous: number, heading: number) {
  let delta = heading - previous;
  if (delta > Math.PI) delta -= TAU;
  else if (delta < -Math.PI) delta += TAU;
  return delta / TAU;
}

export function spinRevs(spin: Spin, turn: number) {
  const dir = Math.sign(turn);
  if (dir === 0 || Math.abs(turn) > CIRCLE_MAX_STEP_REVS || (spin.dir !== 0 && dir !== spin.dir)) {
    spin.dir = 0;
    spin.wound = 0;
    return 0;
  }
  spin.dir = dir;
  if (spin.wound >= CIRCLE_PRIME_REVS) return Math.abs(turn);
  spin.wound += Math.abs(turn);
  return spin.wound >= CIRCLE_PRIME_REVS ? spin.wound : 0;
}

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
  let sample: { x: number; y: number } | null = null;
  let heading: number | null = null;
  let spin = createSpin();
  const arrows: Record<"ArrowLeft" | "ArrowRight", boolean> = { ArrowLeft: false, ArrowRight: false };

  const resetCircle = () => {
    sample = null;
    heading = null;
    spin = createSpin();
  };

  const circle = (x: number, y: number) => {
    if (!sample) {
      sample = { x, y };
      return;
    }
    const dx = x - sample.x;
    const dy = y - sample.y;
    if (Math.hypot(dx, dy) < CIRCLE_MIN_STEP_PX) return;
    sample = { x, y };
    const next = Math.atan2(dy, dx);
    if (heading !== null) {
      const revs = spinRevs(spin, headingTurn(heading, next));
      if (revs > 0) dispatch({ type: "crank", revs });
    }
    heading = next;
  };

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
    resetCircle();
    sample = { x: event.clientX, y: event.clientY };
    blurUi();
    capture(event.pointerId);
    if (getState() === "idle") aimAt(event.clientX);
    dispatch({ type: "press" });
  };

  const onPointerMove = (event: PointerEvent) => {
    if (insideUi(event.target)) return;
    const state = getState();
    if (state === "idle") aimAt(event.clientX);
    if (state === "fight" && activePointer !== null && event.pointerId === activePointer) circle(event.clientX, event.clientY);
  };

  let lastWheelAt = -Infinity;
  const onWheel = (event: WheelEvent) => {
    if (getState() !== "fight" || insideUi(event.target)) return;
    event.preventDefault();
    const streamed = event.timeStamp - lastWheelAt < WHEEL_STREAM_GAP_MS;
    lastWheelAt = event.timeStamp;
    dispatch({ type: "crank", revs: wheelRevs(event.deltaY, event.deltaMode, streamed) });
  };

  const endPointer = (event: PointerEvent) => {
    if (activePointer === null || event.pointerId !== activePointer) return;
    activePointer = null;
    resetCircle();
    dispatch({ type: "release" });
  };

  const releaseAll = () => {
    if (activePointer !== null) {
      activePointer = null;
      resetCircle();
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
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", releaseAll);

  return () => {
    target.removeEventListener("pointerdown", onPointerDown);
    target.removeEventListener("pointermove", onPointerMove);
    target.removeEventListener("pointerup", endPointer);
    target.removeEventListener("pointercancel", endPointer);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("blur", releaseAll);
    target.style.touchAction = "";
  };
}
