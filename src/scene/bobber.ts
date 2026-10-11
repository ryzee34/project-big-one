import { clamp, easeOutCubic, lerp } from "../math";
import {
  BITE_DIP_CELLS,
  BITE_MARK_ROWS_ABOVE,
  BOBBER_BIG_UNTIL_D,
  BOBBER_BOB_MS,
  FLIGHT_ARC_BASE,
  FLIGHT_ARC_PER_D,
  FLIGHT_SCALE_SWITCH_T,
  NIBBLE_DIP_CELLS,
} from "../game/tuning";
import { BOBBER } from "../pixel/bitmaps";
import type { Palette } from "../pixel/palettes";
import { bitmapSize } from "../pixel/raster";
import type { Snapshot } from "../game/types";
import { waterPoint, type Geometry, type Point } from "./geometry";

const HANG_CELLS = 10;
const WATERLINE_ROW = 3;
const MARK_WIDTH = 2;
const MARK_BAR_ROWS = 3;
const MARK_ROWS = MARK_BAR_ROWS + 2;
const MARK_CLEARANCE = 2;

export type BobberPlacement = { anchor: Point; scale: number; lineEnd: Point; visible: boolean; under: boolean };

export function bobberScale(d: number) {
  return d < BOBBER_BIG_UNTIL_D ? 2 : 1;
}

function bobberTop(placement: BobberPlacement) {
  return placement.anchor.y - WATERLINE_ROW * placement.scale;
}

function flightPoint(g: Geometry, tip: Point, ax: number, d: number, t: number): Point {
  const target = waterPoint(g, ax, d);
  return {
    x: Math.round(lerp(tip.x, target.x, easeOutCubic(t))),
    y: Math.round(lerp(tip.y, target.y, t) - Math.sin(Math.PI * t) * (FLIGHT_ARC_BASE + FLIGHT_ARC_PER_D * d)),
  };
}

function hungPlacement(tip: Point): BobberPlacement {
  const anchor = { x: tip.x, y: tip.y + HANG_CELLS };
  return { anchor, scale: 2, lineEnd: { x: tip.x, y: anchor.y - WATERLINE_ROW * 2 }, visible: true, under: false };
}

export function retrievePlacement(g: Geometry, tip: Point, bobber: Snapshot["bobber"]): BobberPlacement {
  const surface = waterPoint(g, bobber.ax, bobber.d);
  const home = hungPlacement(tip).anchor;
  const p = clamp(bobber.t, 0, 1);
  const anchor = { x: Math.round(lerp(surface.x, home.x, p)), y: Math.round(lerp(surface.y, home.y, p)) };
  const scale = bobberScale(lerp(bobber.d, 0, p));
  return { anchor, scale, lineEnd: { x: anchor.x, y: anchor.y - WATERLINE_ROW * scale }, visible: true, under: false };
}

export function placeBobber(g: Geometry, tip: Point, bobber: Snapshot["bobber"], time: number, animate: boolean): BobberPlacement {
  const bob = animate ? Math.round(Math.sin(time / BOBBER_BOB_MS)) : 0;
  switch (bobber.mode) {
    case "hidden":
      return { anchor: tip, scale: 1, lineEnd: tip, visible: false, under: false };
    case "hung":
      return hungPlacement(tip);
    case "flying": {
      const anchor = flightPoint(g, tip, bobber.ax, bobber.d, bobber.t);
      const far = bobber.d >= BOBBER_BIG_UNTIL_D && bobber.t > FLIGHT_SCALE_SWITCH_T;
      const scale = far ? 1 : 2;
      return { anchor, scale, lineEnd: { x: anchor.x, y: anchor.y - WATERLINE_ROW * scale }, visible: true, under: false };
    }
    case "floating":
    case "dipped":
    case "under": {
      const surface = waterPoint(g, bobber.ax, bobber.d);
      const dip = bobber.mode === "dipped" ? NIBBLE_DIP_CELLS : bobber.mode === "under" ? BITE_DIP_CELLS : 0;
      const anchor = { x: surface.x, y: surface.y + bob + dip };
      const scale = bobberScale(bobber.d);
      return { anchor, scale, lineEnd: surface, visible: true, under: bobber.mode === "under" };
    }
  }
}

export function paintBobber(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  sprite: HTMLCanvasElement,
  placement: BobberPlacement,
) {
  if (!placement.visible) return;
  const { width, height } = bitmapSize(BOBBER);
  const { anchor, scale } = placement;
  const left = anchor.x - Math.floor((width * scale) / 2);
  const top = bobberTop(placement);
  ctx.drawImage(sprite, left, top, width * scale, height * scale);
  if (placement.under) {
    ctx.fillStyle = palette.foam;
    ctx.fillRect(left - 1, placement.lineEnd.y, width * scale + 2, 1);
  }
}

export function paintBiteMark(ctx: CanvasRenderingContext2D, palette: Palette, placement: BobberPlacement) {
  if (!placement.visible) return;
  const aboveWater = placement.lineEnd.y - BITE_MARK_ROWS_ABOVE - 1;
  const bottom = Math.min(aboveWater, bobberTop(placement) - MARK_CLEARANCE);
  const top = bottom - MARK_ROWS + 1;
  const left = placement.anchor.x - Math.floor(MARK_WIDTH / 2);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(left, top, MARK_WIDTH, MARK_BAR_ROWS);
  ctx.fillRect(left, bottom, MARK_WIDTH, 1);
}
