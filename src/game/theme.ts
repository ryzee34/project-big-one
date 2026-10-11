import type { Theme } from "./types";

export const THEME_ATTRIBUTE = "data-theme";
export const THEME_STORAGE_KEY = "scene-theme";

export function initialTheme(hour: number): Theme {
  return hour < 6 || hour >= 18 ? "dark" : "light";
}

export function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function resolveTheme(): Theme {
  return document.documentElement.getAttribute(THEME_ATTRIBUTE) === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme, persist = true) {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
  if (!persist) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    return;
  }
}

export function watchTheme(onChange: (theme: Theme) => void) {
  const observer = new MutationObserver(() => onChange(resolveTheme()));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [THEME_ATTRIBUTE],
  });
  return () => observer.disconnect();
}
