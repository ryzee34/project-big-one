import { DECK_SEAM_EVERY } from "../game/tuning";
import type { Palette } from "../pixel/palettes";
import type { Geometry } from "./geometry";

export function paintPier(ctx: CanvasRenderingContext2D, g: Geometry, palette: Palette) {
  const { gridWidth, gridHeight, deck } = g;
  const top = gridHeight - deck;

  ctx.fillStyle = palette.woodMid;
  ctx.fillRect(0, top, gridWidth, deck);
  ctx.fillStyle = palette.wood;
  ctx.fillRect(0, top, gridWidth, 1);
  ctx.fillStyle = palette.woodDark;
  for (let seam = DECK_SEAM_EVERY - 1; seam < gridWidth; seam += DECK_SEAM_EVERY) {
    ctx.fillRect(seam, top, 1, deck);
  }
}
