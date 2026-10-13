import type { InputMode } from "../game/types";
import type { Bitmap } from "../pixel/bitmaps";
import { el } from "./dom";
import { FLOAT_ICON, HOLD_ICON, KEYS_ICON, SPIN_ICON, TAP_ICON, WHEEL_ICON, pixelIcon } from "./icons";

export type HowToRow = { id: string; icon: Bitmap; term: string; body: string };

export const INTRO_STORAGE_KEY = "the-big-one:intro";

export const KEYS_ROW: HowToRow = {
  id: "keys",
  icon: KEYS_ICON,
  term: "Keys",
  body: "Space holds the steady reel and casts. The wheel cranks. Left and Right aim. R retrieve, M mute, T theme, L log, ? help, Escape menu.",
};

export function howToRows(mode: InputMode): HowToRow[] {
  return [
    { id: "cast", icon: HOLD_ICON, term: "Cast", body: "Hold to charge, let go to cast." },
    { id: "wait", icon: FLOAT_ICON, term: "Wait", body: "Watch the bobber and wait for a fish to pull it underwater." },
    { id: "hook", icon: TAP_ICON, term: "Hook", body: "Tap the moment it goes under." },
    mode === "coarse"
      ? { id: "reel", icon: SPIN_ICON, term: "Reel", body: "Spin your finger on the screen to reel in." }
      : { id: "reel", icon: WHEEL_ICON, term: "Reel", body: "Scroll the wheel to reel in, hold to reel steady." },
  ];
}

export function introNote(mode: InputMode): string | null {
  return mode === "fine" ? "For the best experience, play it on a mobile device." : null;
}

export function renderHowTo(list: HTMLElement, rows: HowToRow[]) {
  list.replaceChildren();
  for (const row of rows) {
    list.append(
      el("li", { class: "howto-row", "data-row": row.id }, [
        el("span", { class: "howto-icon" }, [pixelIcon(row.icon, `icon icon-${row.id}`)]),
        el("span", { class: "howto-text" }, [
          el("span", { class: "pixel-label howto-term", text: row.term }),
          el("span", { class: "howto-body", text: row.body }),
        ]),
      ]),
    );
  }
}

export function detectInputMode(): InputMode {
  try {
    return window.matchMedia("(pointer: coarse)").matches ? "coarse" : "fine";
  } catch {
    return "fine";
  }
}

export function introSeen(): boolean {
  try {
    return window.localStorage.getItem(INTRO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "1");
  } catch {
    return;
  }
}
