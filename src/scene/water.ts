import { hashNoise } from "../math";
import {
  MOON_TRAIL_LENGTH,
  RIPPLE_ALPHA,
  RIPPLE_RATIO,
  RIPPLE_SWAY_CELLS,
  RIPPLE_SWAY_MS,
  SPARKLE_THRESHOLD,
  WATER_BANDS,
} from "../game/tuning";
import type { Palette } from "../pixel/palettes";
import { waterDepth, type Geometry } from "./geometry";

export type WaterFrame = { time: number; animate: boolean; night: boolean };

export function paintWater(ctx: CanvasRenderingContext2D, g: Geometry, palette: Palette, frame: WaterFrame) {
  const { gridWidth, horizon, nearRow } = g;
  const depth = waterDepth(g);
  const shades = [palette.w1, palette.w2, palette.w3, palette.w4];

  WATER_BANDS.forEach((band, i) => {
    const top = horizon + Math.round(depth * band.from);
    const bottom = Math.min(nearRow + 1, horizon + Math.ceil(depth * band.to) + 1);
    ctx.fillStyle = shades[i] ?? palette.w4;
    ctx.fillRect(0, top, gridWidth, Math.max(0, bottom - top));
  });

  const count = Math.round(gridWidth * RIPPLE_RATIO);
  const midpoint = horizon + depth / 2;
  ctx.globalAlpha = RIPPLE_ALPHA;
  ctx.fillStyle = palette.ripple;
  for (let i = 0; i < count; i++) {
    const sway = frame.animate ? Math.sin(frame.time / RIPPLE_SWAY_MS + i) * RIPPLE_SWAY_CELLS : 0;
    const y = horizon + 2 + Math.floor(hashNoise(i + 55) * Math.max(1, depth - 3));
    const length = 2 + Math.round(hashNoise(i + 200) * 2) + (y > midpoint ? 1 : 0);
    ctx.fillRect(Math.round(hashNoise(i + 5) * gridWidth + sway), y, length, 1);
  }
  ctx.globalAlpha = 1;

  if (frame.night) paintMoonTrail(ctx, g, palette, frame);
}

export function paintMoonTrail(ctx: CanvasRenderingContext2D, g: Geometry, palette: Palette, frame: WaterFrame) {
  const { horizon, moon, nearRow } = g;
  ctx.fillStyle = palette.moon;
  for (let i = 0; i < MOON_TRAIL_LENGTH; i++) {
    const y = horizon + 2 + i * 2;
    if (y > nearRow) break;
    const width = Math.max(2, Math.round((9 - i * 0.7) * (0.5 + hashNoise(i + 12))));
    const jitter = Math.round((hashNoise(i + 31) - 0.5) * 5);
    const bob = frame.animate ? Math.round(Math.sin(frame.time / 700 + i)) : 0;
    ctx.globalAlpha = 0.22 * (1 - i / (MOON_TRAIL_LENGTH + 1));
    ctx.fillRect(moon.x + 4 - Math.round(width / 2) + jitter, y + bob, width, 1);
  }
  ctx.globalAlpha = 1;
}

export function paintSparkle(ctx: CanvasRenderingContext2D, g: Geometry, palette: Palette, frame: WaterFrame) {
  const { gridWidth, horizon } = g;
  const time = frame.animate ? frame.time : 0;
  ctx.fillStyle = palette.foam;
  for (let x = 0; x < gridWidth; x++) {
    const crest = Math.sin(x / 7 + time / 420) + Math.sin(x / 3.1 - time / 700);
    if (crest > SPARKLE_THRESHOLD) ctx.fillRect(x, horizon - 1, 1, 1);
  }
}
