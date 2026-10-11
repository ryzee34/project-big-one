import { clamp, easeOutCubic, lerp } from "../math";
import {
  IDLE_BOB_AMPLITUDE,
  IDLE_BOB_MS,
  LINE_SAG_MAX,
  LINE_SAG_MIN,
  LINE_SAG_RATIO,
  REEL_BELOW_FIST,
  REEL_SIZE,
  ROD_BEND_DX,
  ROD_BEND_DY,
  ROD_THICK_SHARE,
} from "../game/tuning";
import type { AnglerSprite } from "../pixel/angler";
import { REEL_ORBIT } from "../pixel/bitmaps";
import { spriteColours, type ColourMap, type Palette } from "../pixel/palettes";
import { bitmapSize, drawPixelCurve, drawPixelLine } from "../pixel/raster";
import type { Geometry, Point } from "./geometry";

export type RodFrame = { tension: number; bob: number; dip: number; reelSpin: number; reeling: boolean };

const HANDLE_STEP = 12;
const REEL_LEFT_OF_GRIP = 4;

export function anglerColours(palette: Palette): ColourMap {
  return spriteColours(palette).angler;
}

export function idleBob(time: number, animate: boolean) {
  return animate ? Math.round(Math.sin(time / IDLE_BOB_MS) * IDLE_BOB_AMPLITUDE) : 0;
}

function rodBend(tension: number) {
  return easeOutCubic(clamp(tension, 0, 1));
}

export function rodTip(g: Geometry, tension: number, bob: number, dip = 0): Point {
  const bend = rodBend(tension);
  return {
    x: g.tip.x + Math.round(ROD_BEND_DX * bend),
    y: g.tip.y + Math.round(ROD_BEND_DY * bend) + bob + dip,
  };
}

export function anglerOrigin(g: Geometry, sprite: AnglerSprite, bob: number): Point {
  return {
    x: g.grip.x - sprite.hand.x * sprite.scale,
    y: g.grip.y - sprite.hand.y * sprite.scale + bob,
  };
}

export function paintRod(ctx: CanvasRenderingContext2D, g: Geometry, palette: Palette, frame: RodFrame) {
  const grip = { x: g.grip.x, y: g.grip.y + frame.bob };
  const tip = rodTip(g, frame.tension, frame.bob, frame.dip);
  const thick = {
    x: lerp(grip.x, tip.x, ROD_THICK_SHARE),
    y: lerp(grip.y, tip.y, ROD_THICK_SHARE),
  };
  drawPixelLine(ctx, grip, tip, palette.rod);
  drawPixelLine(ctx, { x: grip.x + 1, y: grip.y }, { x: thick.x + 1, y: thick.y }, palette.rod);
}

export function paintAngler(
  ctx: CanvasRenderingContext2D,
  g: Geometry,
  palette: Palette,
  baked: HTMLCanvasElement,
  sprite: AnglerSprite,
  frame: RodFrame,
) {
  const origin = anglerOrigin(g, sprite, frame.bob);
  const { width, height } = bitmapSize(sprite.bitmap);
  ctx.drawImage(baked, origin.x, origin.y, width * sprite.scale, height * sprite.scale);

  const reel = {
    x: g.grip.x - REEL_LEFT_OF_GRIP * sprite.scale,
    y: g.grip.y + frame.bob + REEL_BELOW_FIST,
  };
  const size = REEL_SIZE * sprite.scale;
  const step = Math.floor(frame.reelSpin / HANDLE_STEP);
  const orbit = REEL_ORBIT[((step % REEL_ORBIT.length) + REEL_ORBIT.length) % REEL_ORBIT.length] ?? REEL_ORBIT[0];
  ctx.fillStyle = palette.rod;
  ctx.fillRect(reel.x, reel.y, size, size);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(reel.x + (1 + orbit[0]) * sprite.scale, reel.y + (1 + orbit[1]) * sprite.scale, sprite.scale, sprite.scale);
}

export function paintLine(ctx: CanvasRenderingContext2D, palette: Palette, from: Point, to: Point, tension: number) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const sag = clamp(length * LINE_SAG_RATIO, LINE_SAG_MIN, LINE_SAG_MAX) * (1 - clamp(tension, 0, 1));
  drawPixelCurve(
    ctx,
    from,
    { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 + sag },
    to,
    palette.line,
  );
}
