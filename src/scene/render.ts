import { clamp } from "../math";
import { AIM_MARKER_D, BITE_TIP_DIP_CELLS, CARD_FADE_MS, CAST_D_MAX, CAST_D_MIN } from "../game/tuning";
import type { Snapshot, Theme } from "../game/types";
import { ANGLER, type AnglerSprite } from "../pixel/angler";
import { BOBBER, CLOUD, MOON } from "../pixel/bitmaps";
import { PALETTES, spriteColours, type Palette } from "../pixel/palettes";
import { bake } from "../pixel/raster";
import { paintBiteMark, paintBobber, placeBobber, retrievePlacement, type BobberPlacement } from "./bobber";
import { paintEffects } from "./effects";
import { bakeFishSprites, paintLanding, paintShadow, type FishSprites } from "./fish";
import { waterPoint, type Geometry, type Point } from "./geometry";
import { paintPowerMeter, paintTensionMeter, resolveMeterColours } from "./meters";
import { paintPier } from "./pier";
import { anglerColours, anglerOrigin, idleBob, paintAngler, paintLine, paintRod, rodTip } from "./rod";
import { bakeSky, paintSky } from "./sky";
import type { Stage } from "./stage";
import { paintSparkle, paintWater } from "./water";

export type Renderer = {
  render(snap: Snapshot, now: number): void;
  setTheme(t: Theme): void;
  resize(): void;
  destroy(): void;
};

type Sprites = {
  angler: HTMLCanvasElement;
  bobber: HTMLCanvasElement;
  moon: HTMLCanvasElement | null;
  cloud: HTMLCanvasElement | null;
  fish: FishSprites;
};

const LANDING_LINE_TENSION = 0.7;

function bakeSprites(palette: Palette, theme: Theme, angler: AnglerSprite): Sprites {
  const colours = spriteColours(palette);
  return {
    angler: bake(angler.bitmap, anglerColours(palette)),
    bobber: bake(BOBBER, colours.bobber),
    moon: theme === "dark" ? bake(MOON, colours.moon) : null,
    cloud: theme === "light" ? bake(CLOUD, colours.cloud) : null,
    fish: bakeFishSprites(palette),
  };
}

function paintAimMarker(ctx: CanvasRenderingContext2D, g: Geometry, palette: Palette, snap: Snapshot) {
  if (snap.state !== "idle" && snap.state !== "charge") return;
  const d = snap.power === null ? AIM_MARKER_D : CAST_D_MIN + (CAST_D_MAX - CAST_D_MIN) * snap.power;
  const point = waterPoint(g, snap.aim, d);
  ctx.fillStyle = snap.perfect ? palette.white : palette.accent;
  ctx.fillRect(point.x - 1, point.y, 3, 1);
  ctx.fillRect(point.x, point.y - 2, 1, 1);
}

function reelingIn(snap: Snapshot) {
  return snap.state === "retrieve" || snap.state === "lost";
}

function bobberPlacement(g: Geometry, tip: Point, snap: Snapshot, now: number, animate: boolean): BobberPlacement {
  if (snap.landing) return { anchor: tip, scale: 1, lineEnd: tip, visible: false, under: false };
  if (reelingIn(snap) && snap.bobber.mode !== "hidden") return retrievePlacement(g, tip, snap.bobber);
  return placeBobber(g, tip, snap.bobber, now, animate);
}

export function createRenderer(stage: Stage, initialTheme: Theme): Renderer {
  const angler = ANGLER;
  let theme = initialTheme;
  let palette = PALETTES[theme];
  let sprites = bakeSprites(palette, theme, angler);
  let meterColours = resolveMeterColours(theme);
  let sky: HTMLCanvasElement | null = null;
  let cardSince: number | null = null;

  const rebakeSky = () => {
    const g = stage.geometry();
    sky = bakeSky(g.gridWidth, g.horizon, palette.skyStops);
  };

  rebakeSky();
  const unsubscribe = stage.onResize(() => {
    rebakeSky();
    sprites = bakeSprites(palette, theme, angler);
  });

  const fishAlpha = (snap: Snapshot) => {
    if (!snap.card) {
      cardSince = null;
      return 1;
    }
    if (cardSince === null) cardSince = snap.time;
    if (snap.reduced) return 0;
    return 1 - clamp((snap.time - cardSince) / (CARD_FADE_MS / 1000), 0, 1);
  };

  const render = (snap: Snapshot, now: number) => {
    const g = stage.geometry();
    const ctx = stage.ctx;
    const animate = !snap.reduced;
    const night = theme === "dark";
    const frame = { time: now, animate, night };

    ctx.clearRect(0, 0, g.gridWidth, g.gridHeight);
    paintSky(ctx, g, palette, sky, sprites, frame);
    paintWater(ctx, g, palette, frame);
    paintSparkle(ctx, g, palette, frame);
    paintEffects(ctx, g, palette, snap);
    paintShadow(ctx, g, palette, snap);
    paintAimMarker(ctx, g, palette, snap);
    paintPier(ctx, g, palette);

    const bob = idleBob(now, animate);
    const tension = snap.tension ?? 0;
    const dip = snap.state === "bite" ? BITE_TIP_DIP_CELLS : 0;
    const rodFrame = { tension, bob, dip, reelSpin: snap.reelSpin, reeling: snap.reeling };
    const tip = rodTip(g, tension, bob, dip);
    const bobber = bobberPlacement(g, tip, snap, now, animate);

    paintRod(ctx, g, palette, rodFrame);
    if (bobber.visible) paintLine(ctx, palette, tip, bobber.lineEnd, tension);
    paintBobber(ctx, palette, sprites.bobber, bobber);
    if (snap.state === "bite") paintBiteMark(ctx, palette, bobber);

    const pose = paintLanding(ctx, g, palette, sprites.fish, snap, fishAlpha(snap));
    if (pose) {
      ctx.globalAlpha = pose.alpha;
      paintLine(ctx, palette, tip, pose.mouth, LANDING_LINE_TENSION);
      ctx.globalAlpha = 1;
    }

    paintAngler(ctx, g, palette, sprites.angler, angler, rodFrame);
    paintPowerMeter(ctx, g, palette, snap, anglerOrigin(g, angler, bob));
    paintTensionMeter(ctx, g, palette, meterColours, snap);

    stage.present();
  };

  return {
    render,
    setTheme(next) {
      if (next === theme) return;
      theme = next;
      palette = PALETTES[theme];
      sprites = bakeSprites(palette, theme, angler);
      meterColours = resolveMeterColours(theme);
      rebakeSky();
    },
    resize() {
      stage.resize();
    },
    destroy() {
      unsubscribe();
    },
  };
}
