import type { InputMode } from "../game/types";
import { el, setClass, setHidden, setText } from "./dom";
import { SPIN_ICON, WHEEL_ICON, pixelIcon } from "./icons";

export type ReelHint = {
  el: HTMLElement;
  update(show: boolean, mode: InputMode): void;
};

const LABELS: Record<InputMode, string> = { coarse: "SPIN", fine: "SCROLL" };

export function createReelHint(): ReelHint {
  const spin = pixelIcon(SPIN_ICON, "icon icon-spin");
  const wheel = pixelIcon(WHEEL_ICON, "icon icon-wheel");
  const label = el("span", { class: "pill-label", "data-ui": "reel-hint-label", text: LABELS.coarse });
  const root = el("div", { class: "pill reel-hint", "data-ui": "reel-hint", "aria-hidden": "true" }, [spin, wheel, label]);
  root.hidden = true;

  const update = (show: boolean, mode: InputMode) => {
    setClass(spin, "is-off", mode !== "coarse");
    setClass(wheel, "is-off", mode !== "fine");
    setText(label, LABELS[mode]);
    setHidden(root, !show);
  };

  return { el: root, update };
}
