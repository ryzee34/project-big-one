export type ThemeName = "light" | "dark";

export type Palette = {
  skyStops: string[];
  horizon: string;
  cloud: string;
  star: string;
  moon: string;
  w1: string;
  w2: string;
  w3: string;
  w4: string;
  foam: string;
  ripple: string;
  wood: string;
  woodMid: string;
  woodDark: string;
  beanie: string;
  beanieFold: string;
  skin: string;
  eye: string;
  boots: string;
  shell: string;
  denim: string;
  denimDark: string;
  sneaker: string;
  accent: string;
  accentDark: string;
  white: string;
  fish: string;
  fishDark: string;
  fishLight: string;
  rod: string;
  line: string;
  weed: string;
  weedDark: string;
  weedLight: string;
  lanternBody: string;
  glow: string;
  drip: string;
};

export const PALETTES: Record<ThemeName, Palette> = {
  light: {
    skyStops: [
      "#A8BFC8",
      "#B4C8CF",
      "#C0D2D7",
      "#CBDADD",
      "#D5E2E3",
      "#DEE9E9",
    ],
    horizon: "#B3C6CC",
    cloud: "#E6EEEF",
    star: "",
    moon: "",
    w1: "#8FB2BA",
    w2: "#6E96A2",
    w3: "#527886",
    w4: "#3B5D6B",
    foam: "#E2EDEE",
    ripple: "#A2C0C6",
    wood: "#A87C51",
    woodMid: "#87613E",
    woodDark: "#5C4128",
    beanie: "#2E474D",
    beanieFold: "#44636A",
    skin: "#DEAF89",
    eye: "#22333A",
    boots: "#26262B",
    shell: "#5F6E48",
    denim: "#2F3A4A",
    denimDark: "#1C2530",
    sneaker: "#F2F5F5",
    accent: "#C9541F",
    accentDark: "#8E3A13",
    white: "#F2F5F5",
    fish: "#2E4852",
    fishDark: "#1B333C",
    fishLight: "#6D8D96",
    rod: "#4A3324",
    line: "#5C7B83",
    weed: "#5A6E3C",
    weedDark: "#3C4B27",
    weedLight: "#7F9455",
    lanternBody: "",
    glow: "",
    drip: "#5C7B83",
  },
  dark: {
    skyStops: [
      "#04070C",
      "#070B12",
      "#0A1119",
      "#0E1721",
      "#131F2B",
      "#1A2834",
    ],
    horizon: "#22303C",
    cloud: "",
    star: "#C6D6D6",
    moon: "#E6E0C8",
    w1: "#1E3F4A",
    w2: "#17323C",
    w3: "#11252D",
    w4: "#0B181E",
    foam: "#47757E",
    ripple: "#254A55",
    wood: "#4E3927",
    woodMid: "#3A291C",
    woodDark: "#241A11",
    beanie: "#1E3238",
    beanieFold: "#2E4A50",
    skin: "#C08E6A",
    eye: "#0B1418",
    boots: "#141418",
    shell: "#A9B6B8",
    denim: "#1C2530",
    denimDark: "#121820",
    sneaker: "#B8C4C6",
    accent: "#E8834E",
    accentDark: "#B25A2C",
    white: "#DCE6E6",
    fish: "#071319",
    fishDark: "#03090D",
    fishLight: "#22434E",
    rod: "#2A1E15",
    line: "#5C787E",
    weed: "#28381F",
    weedDark: "#172212",
    weedLight: "#3E5530",
    lanternBody: "#3A2A1C",
    glow: "#F0B84E",
    drip: "#DCE6E6",
  },
};

export type ColourMap = Record<string, string>;

export function spriteColours(palette: Palette) {
  return {
    angler: {
      n: palette.beanie,
      N: palette.beanieFold,
      s: palette.skin,
      e: palette.eye,
      o: palette.shell,
      z: palette.eye,
      j: palette.denim,
      J: palette.denimDark,
      w: palette.sneaker,
      b: palette.boots,
    } as ColourMap,
    creel: {
      w: palette.woodDark,
      W: palette.woodMid,
      b: palette.wood,
    } as ColourMap,
    haul: {
      f: palette.accent,
      d: palette.accentDark,
      e: palette.eye,
    } as ColourMap,
    bobber: {
      a: palette.accent,
      p: palette.white,
    } as ColourMap,
    catch: {
      f: palette.fish,
      d: palette.fishDark,
      l: palette.fishLight,
      e: palette.eye,
    } as ColourMap,
    lantern: {
      l: palette.woodDark,
      L: palette.lanternBody || palette.woodMid,
      g: palette.glow || palette.accent,
    } as ColourMap,
    cloud: {
      C: palette.cloud || "#000000",
    } as ColourMap,
    moon: {
      m: palette.moon || "#000000",
    } as ColourMap,
  };
}
