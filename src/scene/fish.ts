import { clamp, easeOutCubic, lerp } from "../math";
import { SPECIES } from "../game/species";
import {
  LANDING_MS,
  SHADOW_ALPHA,
  SHADOW_SURFACE_SPLASH_MS,
  SHADOW_WIDTH_BASE,
  SHADOW_WIDTH_GROW,
  SPLASH_MS,
} from "../game/tuning";
import type { Snapshot, SpeciesId } from "../game/types";
import { spriteColours, type Palette } from "../pixel/palettes";
import { bake } from "../pixel/raster";
import { bobberScale } from "./bobber";
import { paintSplash } from "./effects";
import { waterPoint, type Geometry, type Point } from "./geometry";

export type FishSprites = Record<SpeciesId, HTMLCanvasElement>;

const SURFACE_SHOW_S = 0.3;
const LANDING_LIFT = 4;
const LANDING_SCALE_PER_CELLS = 100;
const LANDING_SCALE_MAX = 2;

function landingScale(g: Geometry) {
  return clamp(Math.round(g.gridWidth / LANDING_SCALE_PER_CELLS), 1, LANDING_SCALE_MAX);
}

export function bakeFishSprites(palette: Palette): FishSprites {
  const colours = spriteColours(palette).catch;
  const sprites = {} as FishSprites;
  SPECIES.forEach((species) => {
    sprites[species.id] = bake(species.bitmap, colours);
  });
  return sprites;
}

export function paintShadow(ctx: CanvasRenderingContext2D, g: Geometry, palette: Palette, snap: Snapshot) {
  const shadow = snap.shadow;
  if (!shadow) return;
  const point = waterPoint(g, shadow.ax, shadow.d);
  const width = Math.round(SHADOW_WIDTH_BASE + SHADOW_WIDTH_GROW * clamp(shadow.size, 0, 1));
  const left = point.x - Math.floor(width / 2);
  const top = point.y + 1;

  ctx.globalAlpha = SHADOW_ALPHA;
  ctx.fillStyle = palette.fishDark;
  ctx.fillRect(left, top, width, 1);
  ctx.fillRect(left + 2, top + 1, Math.max(1, width - 4), 1);
  ctx.globalAlpha = 1;

  if (!shadow.surfacing) return;
  const period = SHADOW_SURFACE_SPLASH_MS / 1000;
  const phase = ((snap.time % period) + period) % period;
  if (phase >= SURFACE_SHOW_S) return;
  ctx.fillStyle = palette.foam;
  ctx.fillRect(left - 1, top, width + 2, 1);
}

export type LandingPose = { mouth: Point; alpha: number };

function landingCentre(g: Geometry, from: Point, t: number): Point {
  const to = { x: Math.round(g.gridWidth / 2), y: Math.round(g.gridHeight / 2) };
  const eased = easeOutCubic(clamp(t, 0, 1));
  return {
    x: Math.round(lerp(from.x, to.x, eased)),
    y: Math.round(lerp(from.y, to.y, eased) - Math.sin(Math.PI * clamp(t, 0, 1)) * LANDING_LIFT),
  };
}

export function paintLanding(
  ctx: CanvasRenderingContext2D,
  g: Geometry,
  palette: Palette,
  sprites: FishSprites,
  snap: Snapshot,
  alpha: number,
): LandingPose | null {
  const landing = snap.landing;
  if (!landing || alpha <= 0) return null;
  const from = waterPoint(g, snap.bobber.ax, snap.bobber.d);
  const t = clamp(landing.t, 0, 1);
  const sprite = sprites[landing.species];
  const scale = landingScale(g);
  const width = sprite.width * scale;
  const height = sprite.height * scale;
  const centre = landingCentre(g, from, t);
  const left = centre.x - Math.floor(width / 2);
  const top = centre.y - Math.floor(height / 2);

  paintSplash(ctx, palette, from, (t * LANDING_MS) / SPLASH_MS, !snap.reduced, bobberScale(snap.bobber.d));

  ctx.globalAlpha = alpha;
  ctx.save();
  ctx.translate(left + width, top);
  ctx.scale(-1, 1);
  ctx.drawImage(sprite, 0, 0, width, height);
  ctx.restore();
  ctx.globalAlpha = 1;

  return { mouth: { x: left, y: centre.y }, alpha };
}
