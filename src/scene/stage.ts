import { RESIZE_DEBOUNCE_MS } from "../game/tuning";
import { computeGeometry, type Geometry } from "./geometry";

export type Stage = {
  canvas: HTMLCanvasElement;
  grid: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  geometry(): Geometry;
  resize(): void;
  onResize(cb: (g: Geometry) => void): () => void;
  present(): void;
  destroy(): void;
};

function viewportSize() {
  const width = Math.max(1, Math.round(window.innerWidth || document.documentElement.clientWidth || 1));
  const height = Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight || 1));
  return { width, height };
}

function backingScale() {
  const ratio = window.devicePixelRatio || 1;
  return Math.max(1, Math.min(3, Math.round(ratio)));
}

export function createStage(canvas: HTMLCanvasElement): Stage {
  const grid = document.createElement("canvas");
  const gridCtx = grid.getContext("2d");
  const screenCtx = canvas.getContext("2d");
  if (!gridCtx || !screenCtx) throw new Error("canvas 2d context unavailable");

  const listeners = new Set<(g: Geometry) => void>();
  let g: Geometry = computeGeometry(1, 1);
  let timer = 0;
  let appliedScale = 0;

  const apply = () => {
    const { width, height } = viewportSize();
    g = computeGeometry(width, height);
    const scale = backingScale();
    appliedScale = scale;
    grid.width = g.gridWidth;
    grid.height = g.gridHeight;
    const cssWidth = g.gridWidth * g.pixelSize;
    const cssHeight = g.gridHeight * g.pixelSize;
    canvas.width = cssWidth * scale;
    canvas.height = cssHeight * scale;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    gridCtx.imageSmoothingEnabled = false;
    screenCtx.imageSmoothingEnabled = false;
    listeners.forEach((cb) => cb(g));
  };

  const scheduled = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, RESIZE_DEBOUNCE_MS);
  };

  window.addEventListener("resize", scheduled);
  window.addEventListener("orientationchange", scheduled);
  apply();

  return {
    canvas,
    grid,
    ctx: gridCtx,
    geometry: () => g,
    resize: apply,
    onResize(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    present() {
      if (backingScale() !== appliedScale) apply();
      screenCtx.imageSmoothingEnabled = false;
      screenCtx.clearRect(0, 0, canvas.width, canvas.height);
      screenCtx.drawImage(grid, 0, 0, canvas.width, canvas.height);
    },
    destroy() {
      window.clearTimeout(timer);
      window.removeEventListener("resize", scheduled);
      window.removeEventListener("orientationchange", scheduled);
      listeners.clear();
    },
  };
}
