import type { Theme } from "./types";

export type UrlParams = { seed: number | null; speed: number; theme: Theme | null; debug: boolean };

export function readParams(search: string): UrlParams {
  const query = new URLSearchParams(search);
  const seedRaw = query.get("seed");
  const seed = seedRaw !== null && /^-?\d+$/.test(seedRaw) ? Number(seedRaw) : null;
  const speedRaw = Number(query.get("speed"));
  const speed = Number.isFinite(speedRaw) && speedRaw > 0 ? speedRaw : 1;
  const themeRaw = query.get("theme");
  const theme = themeRaw === "light" || themeRaw === "dark" ? themeRaw : null;
  return { seed, speed, theme, debug: query.get("debug") === "1" };
}
