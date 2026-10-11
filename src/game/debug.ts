import type { DebugApi, Machine } from "./types";

declare global {
  interface Window {
    game?: DebugApi;
  }
}

export function createDebugApi(machine: Machine, step: (ms: number) => void): DebugApi {
  return {
    state: () => machine.peek(),
    press: () => machine.dispatch({ type: "press" }),
    release: () => machine.dispatch({ type: "release" }),
    aim: (ax) => machine.dispatch({ type: "aim", ax }),
    tick: (ms) => step(ms),
    goto: (state, scenario) => machine.goto(state, scenario),
  };
}

export function exposeDebug(machine: Machine, step: (ms: number) => void): DebugApi {
  const api = createDebugApi(machine, step);
  const enabled = new URLSearchParams(window.location.search).get("debug") === "1";
  if (enabled) window.game = api;
  return api;
}
