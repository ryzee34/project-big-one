import { clamp, hashNoise } from "../math";
import {
  CLOUD_COUNT,
  DECK_MIN_ROWS,
  DECK_RATIO,
  GRIP_X_RATIO,
  GRIP_Y_BELOW_DECK_TOP,
  HORIZON_RATIO,
  MAX_PIXEL_SIZE,
  MIN_PIXEL_SIZE,
  MOON_NARROW,
  MOON_WIDE,
  NARROW_BREAKPOINT,
  STAR_COUNT,
  STAR_SKY_SHARE,
  TARGET_GRID_WIDTH,
  TIP_X_RATIO,
  TIP_Y_WATER_RATIO,
  WATER_DEPTH_POWER,
  WATER_FAR_SCALE,
  WATER_HALF_WIDTH_RATIO,
  WATER_ROW_OFFSET,
  YARDS_BASE,
  YARDS_SPAN,
} from "../game/tuning";

export type Point = { x: number; y: number };
export type Star = { x: number; y: number; brightness: number };
export type Cloud = { x: number; y: number; speed: number };

export type Geometry = {
  stageWidth: number;
  stageHeight: number;
  pixelSize: number;
  gridWidth: number;
  gridHeight: number;
  narrow: boolean;
  horizon: number;
  deck: number;
  nearRow: number;
  grip: Point;
  tip: Point;
  moon: Point;
  stars: Star[];
  clouds: Cloud[];
};

function scatterStars(gridWidth: number, horizon: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.floor(hashNoise(i + 1) * gridWidth),
      y: Math.floor(hashNoise(i + 91) * horizon * STAR_SKY_SHARE),
      brightness: hashNoise(i + 300),
    });
  }
  return stars;
}

function scatterClouds(gridWidth: number, horizon: number): Cloud[] {
  const clouds: Cloud[] = [];
  for (let i = 0; i < CLOUD_COUNT; i++) {
    clouds.push({
      x: hashNoise(i + 7) * gridWidth,
      y: 6 + Math.floor(hashNoise(i + 40) * horizon * 0.42),
      speed: 0.12 + hashNoise(i + 60) * 0.16,
    });
  }
  return clouds;
}

function pixelSizeFor(stageWidth: number) {
  return clamp(Math.round(stageWidth / TARGET_GRID_WIDTH), MIN_PIXEL_SIZE, MAX_PIXEL_SIZE);
}

export function computeGeometry(stageWidth: number, stageHeight: number): Geometry {
  const narrow = stageWidth < NARROW_BREAKPOINT;
  const pixelSize = pixelSizeFor(stageWidth);
  const gridWidth = Math.ceil(stageWidth / pixelSize);
  const gridHeight = Math.ceil(stageHeight / pixelSize);
  const horizon = Math.round(gridHeight * HORIZON_RATIO);
  const deck = Math.max(DECK_MIN_ROWS, Math.round(gridHeight * DECK_RATIO));
  const nearRow = gridHeight - deck - 1;
  const grip = { x: Math.round(gridWidth * GRIP_X_RATIO), y: gridHeight - deck + GRIP_Y_BELOW_DECK_TOP };
  const tip = {
    x: Math.round(gridWidth * TIP_X_RATIO),
    y: Math.round(horizon + (nearRow - horizon) * TIP_Y_WATER_RATIO),
  };
  const moon = narrow
    ? { x: gridWidth - MOON_NARROW.right, y: Math.max(MOON_NARROW.minTop, horizon - MOON_NARROW.aboveHorizon) }
    : { x: gridWidth - MOON_WIDE.right, y: MOON_WIDE.top };

  return {
    stageWidth,
    stageHeight,
    pixelSize,
    gridWidth,
    gridHeight,
    narrow,
    horizon,
    deck,
    nearRow,
    grip,
    tip,
    moon,
    stars: scatterStars(gridWidth, horizon),
    clouds: scatterClouds(gridWidth, horizon),
  };
}

export function waterDepth(g: Geometry) {
  return g.nearRow - g.horizon + 1;
}

export function row(g: Geometry, d: number) {
  const top = g.horizon + WATER_ROW_OFFSET;
  return top + Math.round((g.nearRow - top) * Math.pow(1 - d, WATER_DEPTH_POWER));
}

export function col(g: Geometry, ax: number, d: number) {
  return Math.round(
    g.gridWidth / 2 + ax * g.gridWidth * WATER_HALF_WIDTH_RATIO * (WATER_FAR_SCALE + (1 - WATER_FAR_SCALE) * (1 - d)),
  );
}

export function waterPoint(g: Geometry, ax: number, d: number): Point {
  return { x: col(g, ax, d), y: row(g, d) };
}

export function yardsFor(d: number) {
  return Math.round(YARDS_BASE + YARDS_SPAN * d);
}
