import type { InputMode } from "../game/types";
import { el, releaseFocus, setHidden, stopAll, trapFocus } from "./dom";
import { howToRows, introNote, introSeen, markIntroSeen, renderHowTo } from "./howto";

export type IntroCard = {
  el: HTMLElement;
  isOpen(): boolean;
  close(): void;
  setMode(mode: InputMode): void;
};

const CONTROL_SELECTOR = "button, input, select, textarea, a";

export function createIntro(initialMode: InputMode): IntroCard {
  const list = el("ul", { class: "howto-list", "data-ui": "intro-rows" });
  const note = el("p", { class: "intro-note", "data-ui": "intro-note", text: "" });
  const done = el("button", { type: "button", class: "pill is-accent", "data-action": "intro-done", text: "GOT IT" });
  const card = el(
    "section",
    { class: "card intro-card", "data-ui": "intro", "data-interactive": "", role: "dialog", "aria-labelledby": "intro-title" },
    [
      el("h2", { class: "panel-title", id: "intro-title", text: "How to fish" }),
      list,
      note,
      el("div", { class: "card-footer intro-footer" }, [el("span", { class: "pixel-label panel-note", text: "? for help" }), done]),
    ],
  );
  const root = el("div", { class: "intro-overlay" }, [card]);
  stopAll(root);
  trapFocus(card);

  let mode = initialMode;
  let open = !introSeen();
  root.hidden = !open;
  const renderNote = () => {
    const text = introNote(mode);
    note.textContent = text ?? "";
    note.hidden = text === null;
  };
  renderHowTo(list, howToRows(mode));
  renderNote();

  const setMode = (next: InputMode) => {
    if (next === mode) return;
    mode = next;
    renderHowTo(list, howToRows(mode));
    renderNote();
  };

  const close = () => {
    if (!open) return;
    open = false;
    markIntroSeen();
    releaseFocus(root);
    setHidden(root, true);
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("keydown", onKeyDown, true);
  };

  done.addEventListener("click", close);

  const onPointerDown = (event: PointerEvent) => {
    if (!open) return;
    const target = event.target;
    if (target instanceof Element && root.contains(target)) return;
    close();
    if (target instanceof Element && target.closest(CONTROL_SELECTOR)) return;
    event.stopImmediatePropagation();
    event.preventDefault();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "?" || event.key === "l" || event.key === "L") {
      close();
      return;
    }
    if (event.key === "Escape") {
      close();
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      const target = event.target;
      if (target instanceof Element && target.closest(CONTROL_SELECTOR)) return;
      close();
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  };

  if (open) {
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.requestAnimationFrame(() => done.focus({ preventScroll: true }));
  }

  return { el: root, isOpen: () => open, close, setMode };
}
