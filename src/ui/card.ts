import { CARD_FISH_SCALE } from "../game/tuning";
import { speciesById } from "../game/species";
import type { GameEvent, Snapshot, Theme } from "../game/types";
import { PALETTES, spriteColours } from "../pixel/palettes";
import { bake, bitmapSize } from "../pixel/raster";
import { el, formatLb, releaseFocus, setClass, setHidden, setText, stopAll, trapFocus } from "./dom";

type CardData = NonNullable<Snapshot["card"]>;

export type CatchCard = {
  el: HTMLElement;
  update(card: CardData | null, theme: Theme): void;
};

export function catchProse(card: CardData) {
  const species = speciesById(card.species);
  if (card.species === "marlin") {
    return `The big one. ${formatLb(card.lb)} from ${card.yards} yards out.`;
  }
  return `A ${formatLb(card.lb)} ${species.name.toLowerCase()} from ${card.yards} yards out.`;
}

export function createCard(dispatch: (event: GameEvent) => void): CatchCard {
  const speciesValue = el("span", { class: "card-eyebrow-value", "data-ui": "card-eyebrow-species" });
  const lbValue = el("span", { class: "card-eyebrow-value", "data-ui": "card-lb" });
  const yardsValue = el("span", { class: "card-eyebrow-value", "data-ui": "card-yards" });
  const eyebrow = el("div", { class: "card-eyebrow" }, [
    el("span", {}, [el("span", { class: "card-eyebrow-label", text: "Species " }), speciesValue]),
    el("span", {}, [el("span", { class: "card-eyebrow-label", text: "Weight " }), lbValue]),
    el("span", {}, [el("span", { class: "card-eyebrow-label", text: "Distance " }), yardsValue]),
  ]);
  const canvas = el("canvas", { class: "card-fish", "aria-hidden": "true" });
  const title = el("h2", { class: "card-title", "data-ui": "card-species" });
  const prose = el("p", { class: "card-prose", "data-ui": "card-prose" });
  const recordBadge = el("span", { class: "pill is-accent card-badge", "data-ui": "badge-record", text: "New record" });
  const bigOneBadge = el("span", { class: "pill is-accent card-badge", "data-ui": "badge-big-one", text: "The big one" });
  const badges = el("div", { class: "card-badges" }, [recordBadge, bigOneBadge]);
  const keep = el("button", { type: "button", class: "pill", "data-action": "keep", text: "Keep" });
  const letGo = el("button", { type: "button", class: "pill", "data-action": "let-go", text: "Release" });
  const footer = el("div", { class: "card-footer" }, [letGo, keep]);
  const card = el(
    "section",
    { class: "card catch-card", "data-ui": "card", "data-interactive": "", role: "dialog", "aria-modal": "true", "aria-labelledby": "catch-card-title" },
    [eyebrow, el("div", { class: "card-fish-wrap" }, [canvas]), title, prose, badges, footer],
  );
  title.id = "catch-card-title";
  card.hidden = true;
  stopAll(card);
  trapFocus(card);

  keep.addEventListener("click", () => dispatch({ type: "keep" }));
  letGo.addEventListener("click", () => dispatch({ type: "let-go" }));

  let shownId: string | null = null;
  let drawnKey = "";

  const drawFish = (card: CardData, theme: Theme) => {
    const key = `${card.species}:${theme}`;
    if (key === drawnKey) return;
    drawnKey = key;
    const species = speciesById(card.species);
    const { width, height } = bitmapSize(species.bitmap);
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const cssWidth = width * CARD_FISH_SCALE;
    const cssHeight = height * CARD_FISH_SCALE;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sprite = bake(species.bitmap, spriteColours(PALETTES[theme]).catch);
    ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  };

  const update = (data: CardData | null, theme: Theme) => {
    if (!data) {
      if (shownId !== null) {
        shownId = null;
        releaseFocus(card);
        setClass(card, "is-visible", false);
        setHidden(card, true);
      }
      return;
    }
    if (data.id !== shownId) {
      shownId = data.id;
      const species = speciesById(data.species);
      setText(speciesValue, species.name);
      setText(lbValue, formatLb(data.lb));
      setText(yardsValue, `${data.yards} yd`);
      setText(title, species.name);
      setText(prose, catchProse(data));
      setHidden(recordBadge, !data.record);
      setHidden(bigOneBadge, !data.bigOne);
      setHidden(badges, !data.record && !data.bigOne);
      setHidden(card, false);
      void card.offsetWidth;
      setClass(card, "is-visible", true);
      keep.focus({ preventScroll: true });
    }
    drawFish(data, theme);
  };

  return { el: card, update };
}
