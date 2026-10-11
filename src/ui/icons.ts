import type { Bitmap } from "../pixel/bitmaps";

const SVG_NS = "http://www.w3.org/2000/svg";

export const SPEAKER_ON: Bitmap = [
  ".............",
  "......s......",
  ".....ss...s..",
  "....sss..s.s.",
  ".ssssss.s..s.",
  ".ssssss.s.s.s",
  ".ssssss.s.s.s",
  ".ssssss.s.s.s",
  ".ssssss.s..s.",
  "....sss..s.s.",
  ".....ss...s..",
  "......s......",
  ".............",
];

export const SPEAKER_OFF: Bitmap = [
  ".............",
  "......s......",
  ".....ss......",
  "....sss......",
  ".ssssss..s.s.",
  ".ssssss...s..",
  ".ssssss...s..",
  ".ssssss...s..",
  ".ssssss..s.s.",
  "....sss......",
  ".....ss......",
  "......s......",
  ".............",
];

export const MENU_ICON: Bitmap = [
  ".............",
  ".............",
  ".sssssssssss.",
  ".sssssssssss.",
  ".............",
  ".............",
  ".sssssssssss.",
  ".sssssssssss.",
  ".............",
  ".............",
  ".sssssssssss.",
  ".sssssssssss.",
  ".............",
];

export const CLOSE_ICON: Bitmap = [
  ".............",
  ".ss.......ss.",
  ".sss.....sss.",
  "..sss...sss..",
  "...sss.sss...",
  "....sssss....",
  ".....sss.....",
  "....sssss....",
  "...sss.sss...",
  "..sss...sss..",
  ".sss.....sss.",
  ".ss.......ss.",
  ".............",
];

export const STAR_ICON: Bitmap = [
  "....s....",
  "....s....",
  "...sss...",
  "sssssssss",
  ".sssssss.",
  "..sssss..",
  "..sssss..",
  ".sss.sss.",
  "ss.....ss",
];

export function pixelIcon(bitmap: Bitmap, className = "icon"): SVGSVGElement {
  const width = bitmap[0]?.length ?? 0;
  const height = bitmap.length;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("class", className);
  svg.style.setProperty("--cols", String(width));
  svg.style.setProperty("--rows", String(height));
  for (let y = 0; y < height; y++) {
    const line = bitmap[y] ?? "";
    for (let x = 0; x < line.length; x++) {
      if (line[x] === ".") continue;
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", "1");
      rect.setAttribute("height", "1");
      rect.setAttribute("data-k", line[x] ?? "");
      svg.appendChild(rect);
    }
  }
  return svg;
}
