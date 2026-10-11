import { hashNoise } from "../math";
import {
  SPLASH_DROPLETS,
  SPLASH_DROPLET_RISE,
  SPLASH_MS,
  SPLASH_RING_ASPECT,
  SPLASH_RING_BASE,
  SPLASH_RING_GROW,
  SPLASH_RINGS,
} from "../game/tuning";
import type { Effect, Snapshot } from "../game/types";
import type { Palette } from "../pixel/palettes";
import { bobberScale } from "./bobber";
import { waterPoint, type Geometry, type Point } from "./geometry";

const RING_MS = 600;
const FOAM_MS = 450;
const RING_STAGGER = 0.18;
const DROPLET_SHARE = 0.6;
const RING_GROW = 5;

function plotEllipse(ctx: CanvasRenderingContext2D, centre: Point, rx: number, ry: number, dotted: boolean) {
  const steps = Math.max(8, Math.round(rx * 3));
  for (let i = 0; i < steps; i++) {
    if (dotted && i % 2 === 1) continue;
    const angle = (i / steps) * Math.PI * 2;
    ctx.fillRect(Math.round(centre.x + Math.cos(angle) * rx), Math.round(centre.y + Math.sin(angle) * ry), 1, 1);
  }
}

export function paintSplash(ctx: CanvasRenderingContext2D, palette: Palette, origin: Point, progress: number, droplets: boolean, scale = 1) {
  if (progress < 0 || progress >= 1) return;
  ctx.fillStyle = palette.foam;
  const span = 1 - (SPLASH_RINGS - 1) * RING_STAGGER;
  for (let i = 0; i < SPLASH_RINGS; i++) {
    const p = (progress - i * RING_STAGGER) / span;
    if (p <= 0 || p >= 1) continue;
    const rx = ((SPLASH_RING_BASE + SPLASH_RING_GROW * p) * scale) / 2;
    plotEllipse(ctx, origin, rx, Math.max(1, rx * SPLASH_RING_ASPECT), true);
  }
  if (!droplets) return;
  const p = progress / DROPLET_SHARE;
  if (p >= 1) return;
  for (let i = 0; i < SPLASH_DROPLETS; i++) {
    const spread = (hashNoise(i + 3) - 0.5) * 2 * (2 + 4 * p) * scale;
    const rise = SPLASH_DROPLET_RISE * scale * (0.6 + 0.4 * hashNoise(i + 21));
    ctx.fillRect(origin.x + Math.round(spread), origin.y - Math.round(Math.sin(Math.PI * p) * rise), 1, 1);
  }
}

function paintRing(ctx: CanvasRenderingContext2D, palette: Palette, origin: Point, progress: number, scale = 1) {
  if (progress < 0 || progress >= 1) return;
  ctx.fillStyle = palette.foam;
  const rx = ((SPLASH_RING_BASE + RING_GROW * progress) * scale) / 2;
  plotEllipse(ctx, origin, rx, Math.max(1, rx * SPLASH_RING_ASPECT), true);
}

function paintFoam(ctx: CanvasRenderingContext2D, palette: Palette, origin: Point, progress: number, scale = 1) {
  if (progress < 0 || progress >= 1) return;
  const width = (3 + Math.round(4 * progress)) * scale;
  ctx.fillStyle = palette.foam;
  ctx.fillRect(origin.x - Math.floor(width / 2), origin.y, width, 1);
}

function effectDuration(kind: Effect["kind"]) {
  switch (kind) {
    case "splash":
      return SPLASH_MS;
    case "ring":
      return RING_MS;
    case "foam":
      return FOAM_MS;
  }
}

export function paintEffects(ctx: CanvasRenderingContext2D, g: Geometry, palette: Palette, snap: Snapshot) {
  snap.effects.forEach((effect) => {
    const age = (snap.time - effect.start) * 1000;
    const progress = age / effectDuration(effect.kind);
    if (progress < 0 || progress >= 1) return;
    const origin = waterPoint(g, effect.ax, effect.d);
    const scale = bobberScale(effect.d);
    switch (effect.kind) {
      case "splash":
        paintSplash(ctx, palette, origin, progress, !snap.reduced, scale);
        break;
      case "ring":
        paintRing(ctx, palette, origin, progress, scale);
        break;
      case "foam":
        paintFoam(ctx, palette, origin, progress, scale);
        break;
    }
  });
}
