import type { Bitmap } from "./bitmaps";
import type { ColourMap } from "./palettes";

export function bitmapSize(bitmap: Bitmap) {
  return { width: bitmap[0]?.length ?? 0, height: bitmap.length };
}

export function bake(bitmap: Bitmap, colours: ColourMap): HTMLCanvasElement {
  const { width, height } = bitmapSize(bitmap);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  for (let row = 0; row < height; row++) {
    const line = bitmap[row] ?? "";
    for (let col = 0; col < line.length; col++) {
      const key = line[col];
      const colour = key ? colours[key] : undefined;
      if (!colour) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(col, row, 1, 1);
    }
  }
  return canvas;
}

export function withAlpha(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export function drawPixelLine(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  colour: string,
) {
  let x = Math.round(from.x);
  let y = Math.round(from.y);
  const endX = Math.round(to.x);
  const endY = Math.round(to.y);
  const dx = Math.abs(endX - x);
  const dy = Math.abs(endY - y);
  const stepX = x < endX ? 1 : -1;
  const stepY = y < endY ? 1 : -1;
  let error = dx - dy;

  ctx.fillStyle = colour;
  for (let guard = 0; guard < 4000; guard++) {
    ctx.fillRect(x, y, 1, 1);
    if (x === endX && y === endY) break;
    const doubled = 2 * error;
    if (doubled > -dy) {
      error -= dy;
      x += stepX;
    }
    if (doubled < dx) {
      error += dx;
      y += stepY;
    }
  }
}

export function drawPixelCurve(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  control: { x: number; y: number },
  to: { x: number; y: number },
  colour: string,
) {
  const span = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  const steps = Math.max(8, Math.round(span * 1.4));

  ctx.fillStyle = colour;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inverse = 1 - t;
    ctx.fillRect(
      Math.round(inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x),
      Math.round(inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y),
      1,
      1,
    );
  }
}
