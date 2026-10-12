import { HAPTIC_BITE_MS, HAPTIC_INTERVAL_MS, HAPTIC_PULSE_MS, HAPTIC_TENSION } from "./tuning";
import type { Snapshot } from "./types";

type Haptics = { update(snap: Snapshot): void };

function vibrator(): ((ms: number) => void) | null {
  if (typeof navigator === "undefined") return null;
  const fn: unknown = navigator.vibrate;
  if (typeof fn !== "function") return null;
  return (ms) => {
    if (!(navigator.userActivation?.hasBeenActive ?? true)) return;
    try {
      navigator.vibrate(ms);
    } catch {
      return;
    }
  };
}

export function createHaptics(): Haptics {
  const pulse = vibrator();
  let lastPulse: number | null = null;
  if (!pulse) return { update: () => undefined };
  const interval = HAPTIC_INTERVAL_MS / 1000;
  return {
    update(snap) {
      if (snap.cues.includes("bite")) pulse(HAPTIC_BITE_MS);
      const hot = snap.state === "fight" && !snap.menuOpen && snap.tension !== null && snap.tension > HAPTIC_TENSION;
      if (!hot) {
        lastPulse = null;
        return;
      }
      if (lastPulse === null || snap.time < lastPulse || snap.time - lastPulse >= interval) {
        pulse(HAPTIC_PULSE_MS);
        lastPulse = snap.time;
      }
    },
  };
}
