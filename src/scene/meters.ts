import { clamp } from "../math";
import { PERFECT_POWER, POWER_METER_CELLS, TENSION_METER, TENSION_ZONE_HOT, TENSION_ZONE_SOFT } from "../game/tuning";
import type { Snapshot, Theme } from "../game/types";
import type { Palette } from "../pixel/palettes";
import type { Geometry, Point } from "./geometry";

const TRACK_ALPHA = 0.55;
const POWER_GAP = 3;
const TENSION_TOP = 3;
const PERFECT_FLASH_T = 0.3;
const INK_SOFT_TOKEN = "--ink-soft";
const INK_SOFT_FALLBACK: Record<Theme, string> = { light: "#405d65", dark: "#8aa2a6" };

export type MeterColours = { inkSoft: string };

export function resolveMeterColours(theme: Theme): MeterColours {
  const root = document.documentElement;
  const applied = root.getAttribute("data-theme") === theme;
  const token = applied ? window.getComputedStyle(root).getPropertyValue(INK_SOFT_TOKEN).trim() : "";
  return { inkSoft: token || INK_SOFT_FALLBACK[theme] };
}

function paintTrack(ctx: CanvasRenderingContext2D, palette: Palette, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = palette.line;
  ctx.fillRect(x - 1, y - 1, width + 2, 1);
  ctx.fillRect(x - 1, y + height, width + 2, 1);
  ctx.fillRect(x - 1, y, 1, height);
  ctx.fillRect(x + width, y, 1, height);
  ctx.globalAlpha = TRACK_ALPHA;
  ctx.fillStyle = palette.fishDark;
  ctx.fillRect(x, y, width, height);
  ctx.globalAlpha = 1;
}

function powerMeterOrigin(g: Geometry, handsOrigin: Point): Point {
  const { width, height } = POWER_METER_CELLS;
  return { x: handsOrigin.x - width - POWER_GAP, y: g.nearRow - height + 1 };
}

function perfectFlash(snap: Snapshot) {
  return snap.state === "cast" && snap.perfect && snap.bobber.mode === "flying" && snap.bobber.t < PERFECT_FLASH_T;
}

export function paintPowerMeter(ctx: CanvasRenderingContext2D, g: Geometry, palette: Palette, snap: Snapshot, handsOrigin: Point) {
  const flash = perfectFlash(snap);
  const charging = snap.state === "charge" && snap.power !== null;
  if (!charging && !flash) return;
  const { width, height } = POWER_METER_CELLS;
  const origin = powerMeterOrigin(g, handsOrigin);
  const power = flash ? 1 : clamp(snap.power ?? 0, 0, 1);
  const perfect = power >= PERFECT_POWER;
  const filled = Math.round(height * power);
  const perfectRows = Math.max(1, Math.round(height * (1 - PERFECT_POWER)));

  paintTrack(ctx, palette, origin.x, origin.y, width, height);
  ctx.fillStyle = perfect && !flash ? palette.white : palette.accent;
  ctx.fillRect(origin.x, origin.y + height - filled, width, filled);
  if (flash) return;
  ctx.fillStyle = palette.white;
  ctx.fillRect(origin.x, origin.y, width, perfectRows);
}

function tensionColour(palette: Palette, colours: MeterColours, value: number) {
  if (value < TENSION_ZONE_SOFT) return colours.inkSoft;
  if (value < TENSION_ZONE_HOT) return palette.accent;
  return palette.accentDark;
}

export function paintTensionMeter(
  ctx: CanvasRenderingContext2D,
  g: Geometry,
  palette: Palette,
  colours: MeterColours,
  snap: Snapshot,
) {
  if (snap.state !== "fight" || snap.tension === null) return;
  const width = Math.round(g.gridWidth * TENSION_METER.widthRatio);
  const height = TENSION_METER.height;
  const x = Math.round((g.gridWidth - width) / 2);
  const y = TENSION_TOP;
  const tension = clamp(snap.tension, 0, 1);
  const filled = Math.round(width * tension);

  paintTrack(ctx, palette, x, y, width, height);
  for (let i = 0; i < filled; i++) {
    ctx.fillStyle = tensionColour(palette, colours, (i + 0.5) / width);
    ctx.fillRect(x + i, y, 1, height);
  }
  ctx.fillStyle = palette.white;
  [TENSION_ZONE_SOFT, TENSION_ZONE_HOT].forEach((zone) => {
    const col = x + Math.round(width * zone);
    ctx.fillRect(col, y - 1, 1, 1);
    ctx.fillRect(col, y + height, 1, 1);
  });
}
