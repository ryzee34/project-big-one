import { SPECIES } from "../game/species";
import { RECENT_CATCHES } from "../game/tuning";
import type { GameEvent, SaveData } from "../game/types";
import { el, formatLb, releaseFocus, setClass, setHidden, setText, stopAll, trapFocus } from "./dom";
import { CLOSE_ICON, STAR_ICON, pixelIcon } from "./icons";

export type LogPanel = {
  el: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  refresh(save: SaveData, bigOneLanded: boolean): void;
};

type Deps = { dispatch: (event: GameEvent) => void; onClose: () => void };

export function createLog(deps: Deps): LogPanel {
  const closeButton = el("button", { type: "button", class: "pill pill-icon", "data-action": "close", "aria-label": "Close the log" }, [
    pixelIcon(CLOSE_ICON),
  ]);
  const header = el("div", { class: "panel-head" }, [
    el("h2", { class: "panel-title", id: "log-title", text: "Creel" }),
    closeButton,
  ]);
  const summary = el("p", { class: "card-prose panel-summary", "data-ui": "log-summary" });
  const speciesRows = new Map<string, { row: HTMLElement; best: HTMLElement; count: HTMLElement; star: HTMLElement }>();
  const table = el("div", { class: "log-table", role: "table", "aria-label": "Best and count by species" });
  table.append(
    el("div", { class: "log-row log-head", role: "row" }, [
      el("span", { class: "log-cell log-name", role: "columnheader", text: "Species" }),
      el("span", { class: "log-cell log-best", role: "columnheader", text: "Best" }),
      el("span", { class: "log-cell log-count", role: "columnheader", text: "Kept" }),
    ]),
  );
  for (const species of SPECIES) {
    const star = pixelIcon(STAR_ICON, "icon icon-star");
    const starWrap = el("span", { class: "log-star", "aria-label": "Landed" }, [star]);
    starWrap.hidden = true;
    const name = el("span", { class: "log-cell log-name", role: "cell" }, [species.name, starWrap]);
    const best = el("span", { class: "log-cell log-best", role: "cell" });
    const count = el("span", { class: "log-cell log-count", role: "cell" });
    const row = el("div", { class: "log-row", role: "row", "data-species": species.id }, [name, best, count]);
    speciesRows.set(species.id, { row, best, count, star: starWrap });
    table.append(row);
  }
  const recentTitle = el("h3", { class: "pixel-label panel-subtitle", text: "Recent" });
  const recent = el("ul", { class: "log-recent", "data-ui": "log-recent" });
  const reset = el("button", { type: "button", class: "pill", "data-action": "reset", text: "Reset" });
  const note = el("span", { class: "pixel-label panel-note", "data-ui": "log-note" });
  const footer = el("div", { class: "card-footer" }, [note, reset]);
  const panel = el(
    "section",
    { class: "card panel log-panel", "data-ui": "log", "data-interactive": "", role: "dialog", "aria-modal": "true", "aria-labelledby": "log-title" },
    [header, summary, table, recentTitle, recent, footer],
  );
  const scrim = el("div", { class: "scrim", "data-interactive": "" });
  const root = el("div", { class: "overlay log-overlay" }, [scrim, panel]);
  root.hidden = true;
  stopAll(root);
  trapFocus(panel);

  let armed = false;
  let armTimer = 0;
  const disarm = () => {
    armed = false;
    if (armTimer) window.clearTimeout(armTimer);
    armTimer = 0;
    setText(reset, "Reset");
    setClass(reset, "is-accent", false);
  };

  const close = () => {
    if (root.hidden) return;
    disarm();
    releaseFocus(root);
    root.hidden = true;
    deps.onClose();
  };
  const open = () => {
    if (!root.hidden) return;
    root.hidden = false;
    closeButton.focus({ preventScroll: true });
  };

  closeButton.addEventListener("click", close);
  scrim.addEventListener("click", close);
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

  const refresh = (save: SaveData, bigOneLanded: boolean) => {
    const counts = new Map<string, number>();
    const bigOne = bigOneLanded || save.best.marlin !== undefined;
    for (const entry of save.catches) {
      counts.set(entry.species, (counts.get(entry.species) ?? 0) + 1);
    }
    for (const species of SPECIES) {
      const cells = speciesRows.get(species.id);
      if (!cells) continue;
      const best = save.best[species.id];
      setText(cells.best, best === undefined ? "—" : formatLb(best));
      setText(cells.count, String(counts.get(species.id) ?? 0));
      setHidden(cells.star, !(species.id === "marlin" && bigOne));
    }
    const total = save.catches.length;
    setText(summary, total === 0 ? "Nothing kept yet. Cast a line." : `${total} kept.`);
    const latest = save.catches.slice(-RECENT_CATCHES).reverse();
    const key = latest.map((entry) => entry.id).join("|");
    if (recent.dataset.key !== key) {
      recent.dataset.key = key;
      recent.replaceChildren(
        ...latest.map((entry) => {
          const species = SPECIES.find((s) => s.id === entry.species);
          const name = species?.name ?? entry.species;
          return el("li", { class: "log-recent-row" }, [
            el("span", { class: "log-recent-name", text: name }),
            el("span", { class: "log-recent-meta", text: `${formatLb(entry.lb)} · ${entry.yards} yd · ${entry.night ? "night" : "day"}` }),
          ]);
        }),
      );
    }
    setHidden(recentTitle, total === 0);
    setHidden(recent, total === 0);
    setHidden(reset, total === 0 && Object.keys(save.best).length === 0);
    setText(note, total === 0 ? "" : "Best weights are kept forever");
  };

  refresh({ version: 1, catches: [], best: {}, settings: { muted: false } }, false);

  return { el: root, open, close, isOpen: () => !root.hidden, refresh };
}
