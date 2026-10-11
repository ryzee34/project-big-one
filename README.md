# The Big One

Play it: https://ryzee34.github.io/the-big-one/

A fishing game for the browser, seen over the angler's shoulder. He stands at the end of the pier
from ryanhklee.com, rod in hand, and casts out over the water. Perch and bass bite close in, tuna
and grouper further out, sharks at the edge of your reach. Somewhere past the point there is a
marlin that nobody has landed.

Pixel art in the site's two palettes, drawn on one canvas at grid resolution and scaled up by
whole pixels. Day and night follow the clock on the first visit and your choice after that.
A round takes under a minute: cast, wait, hook, fight, land, log. The log lives in
localStorage. There is no server, no account and no runtime dependency.

## Controls

Mouse, finger or keyboard. The whole stage is the target.

| While | Do | Result |
| --- | --- | --- |
| Idle | Move the pointer | Aim left and right |
| Idle | Press and hold | Charge the cast. The power meter fills and drains until you let go |
| Idle | Release | Cast. Release at the very top of the meter for a perfect cast to the far water |
| Waiting | Tap | Reel the line back in |
| Bite | Tap inside the window | Hook the fish |
| Fight | Hold | Reel. Tension rises, line comes in |
| Fight | Release | Rest. Tension falls, the fish may run |
| Landed | Keep or Release | Log the catch or put it back |

The bobber dips for a nibble and goes under for a bite. Only the bite counts; pressing on a
nibble reels in. During the fight, keep the tension meter out of the dark end: at full tension
for half a second the line snaps, and with no tension at all for a few seconds the fish throws
the hook. A fish that is tiring shows itself at the surface.

Keyboard: Space presses and releases. Left and Right slide the aim. R retrieves. M mutes.
T toggles day and night. L opens the log. Escape opens and closes the menu. ? opens help.

Every control in the HUD is a real button and state changes are announced to a polite live
region. With `prefers-reduced-motion` the ambient motion stops and the hook window is longer.

## Scripts

Node 22. Install with `npm install`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build into `dist` |
| `npm run preview` | Serve `dist` locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint .` |
| `npm run check` | Typecheck, lint, build, then the headless drive described below |

## URL parameters

| Parameter | Meaning |
| --- | --- |
| `seed=N` | Seed the random generator. The same seed gives the same casts, waits, nibbles, bites and fish. Without it the seed comes from the first frame timestamp |
| `speed=N` | Multiply simulation time. `speed=8` runs a whole round in a few seconds. Default 1 |
| `theme=light` or `theme=dark` | Force a theme for this load without touching the stored choice |
| `debug=1` | Expose `window.game` with `state()`, `press()`, `release()`, `aim(ax)`, `tick(ms)` and `goto(state, scenario)` |

Every timer in the game runs on simulation time, so `speed` scales all of it, and every random
draw goes through the seeded generator, so a seed replays a session exactly.

## The check

`npm run check` runs `tsc --noEmit`, `eslint .`, `vite build` and then `node tools/drive.mjs`.

The drive starts `vite preview`, launches headless Chrome over the DevTools Protocol and opens
`/?debug=1&seed=7&speed=8&theme=<theme>` for dark and light. For each theme it:

1. Screenshots the idle scene and reads the canvas: the top rows must be sky stops, the near
   water rows the deepest water colour, the hands region the skin colour. The HUD hooks and the
   hint must be present and inside the viewport.
2. Presses, steps 400 ms of simulation, releases. The state has to pass through cast and
   reach wait within two seconds of wall time, with the bobber's accent colour at the water
   point. The power meter must be painted left of the hands while charging.
3. Jumps to the bite scenario and presses: the state must be fight and the tension meter must
   be painted top centre.
4. Holds the reel for up to 20 s of simulation until landed or lost, then jumps to the landed
   scenario: the card must be in the DOM naming a 4.2 lb bass. It clicks KEEP and expects one
   catch under `the-big-one:v1` in localStorage and a creel pill reading 1.
5. Jumps to the pinned-tension scenario and expects lost with the snap message.
6. Emulates `prefers-reduced-motion` and compares two idle frames 500 ms apart, which must be
   identical.

Steps 1 to 5 repeat at 390 by 844 with mobile emulation; the default viewport is 1440 by 900.
Console errors, uncaught exceptions and failed requests are collected in every step and fail
the run. Screenshots land in `tools/out/<theme>-<step>.png` and `<theme>-phone-<step>.png`.
The script prints a JSON summary of every check and exits 1 on any failure. Chrome and the
preview server are always shut down, including on failure or a signal.

Environment: `PORT` picks the preview port (default 4184), `CDP_PORT` the Chrome debugging port
(default 9345), and `BASE_URL` points the drive at a server that is already running instead of
starting the preview. If the page never exposes `window.game` the drive stops with a message
saying so rather than running checks that cannot pass.

## Layout

```
index.html
src/main.ts            boot: params, theme, stage, renderer, loop, input, HUD
src/math.ts            clamp, lerp, easing and hashNoise shared with the site
src/pixel/             bitmaps, palettes and the raster helpers shared with the site
src/scene/             stage, geometry, sky, water, pier, rod, bobber, fish, effects, meters, render
src/game/              types, tuning, species, rng, machine, cast, wait, fight, loop, input, params,
                       save, audio, theme, debug
src/ui/                dom, hud, card, log, menu, icons
src/styles.css         tokens, pills, card
public/fonts/          Silkscreen and Archivo, self-hosted
tools/drive.mjs        the headless check
SPEC.md                the full specification
```
