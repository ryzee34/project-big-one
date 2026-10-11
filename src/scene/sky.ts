import type { Palette } from "../pixel/palettes";
import type { Geometry } from "./geometry";

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const SEAM_SPAN = 0.45;

export function bakeSky(gridWidth: number, skyHeight: number, stops: string[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, gridWidth);
  canvas.height = Math.max(1, skyHeight);

  const ctx = canvas.getContext("2d");
  const first = stops[0];
  if (!ctx || !first) return canvas;

  const bandHeight = skyHeight / stops.length;
  const flatUntil = 1 - SEAM_SPAN;

  for (let y = 0; y < skyHeight; y++) {
    const band = Math.min(stops.length - 1, Math.floor(y / bandHeight));
    const within = y / bandHeight - band;
    const current = stops[band] ?? first;
    const next = stops[Math.min(band + 1, stops.length - 1)] ?? current;

    const blend = band === stops.length - 1 || within <= flatUntil ? 0 : (within - flatUntil) / SEAM_SPAN;

    if (blend === 0) {
      ctx.fillStyle = current;
      ctx.fillRect(0, y, gridWidth, 1);
      continue;
    }

    const row = BAYER_4[y % 4] ?? [];
    for (let x = 0; x < gridWidth; x++) {
      ctx.fillStyle = blend > (row[x % 4] ?? 0) / 16 ? next : current;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return canvas;
}

export type SkyFrame = { time: number; animate: boolean; night: boolean };

export type SkySprites = { moon: HTMLCanvasElement | null; cloud: HTMLCanvasElement | null };

export function paintSky(
  ctx: CanvasRenderingContext2D,
  g: Geometry,
  palette: Palette,
  sky: HTMLCanvasElement | null,
  sprites: SkySprites,
  frame: SkyFrame,
) {
  const { gridWidth, horizon, moon, stars, clouds } = g;

  if (sky) {
    ctx.drawImage(sky, 0, 0);
  } else {
    ctx.fillStyle = palette.skyStops[0] ?? "#000000";
    ctx.fillRect(0, 0, gridWidth, horizon);
  }

  if (frame.night) {
    stars.forEach((star, i) => {
      const twinkle = frame.animate ? 0.55 + 0.45 * Math.sin(frame.time / 900 + i * 1.7) : 1;
      ctx.globalAlpha = (0.25 + star.brightness * 0.6) * twinkle;
      ctx.fillStyle = palette.star;
      ctx.fillRect(star.x, star.y, 1, 1);
    });
    ctx.globalAlpha = 1;
    if (sprites.moon) ctx.drawImage(sprites.moon, moon.x, moon.y);
  } else if (sprites.cloud) {
    const cloud = sprites.cloud;
    clouds.forEach((entry) => {
      const drift = frame.animate ? frame.time * 0.0008 * entry.speed * 60 : 0;
      ctx.drawImage(cloud, Math.round((entry.x + drift) % (gridWidth + 20)) - 10, entry.y);
    });
  }

  ctx.fillStyle = palette.horizon;
  ctx.fillRect(0, horizon - 1, gridWidth, 1);
}
