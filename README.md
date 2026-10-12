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
| Fight | Scroll the wheel, or circle a held finger or mouse | Crank. Two and a half turns a second is full speed; the faster you crank, the faster the line comes in and the faster tension climbs |
| Fight | Hold | The steady reel at half speed. Safe and slow |
| Fight | Let go and stop cranking | Rest. Tension falls, the fish may run |
| Landed | Keep or Release | Log the catch or put it back |

The bobber dips for a nibble and goes under for a bite. Only the bite counts; pressing on a
nibble reels in.

Reeling is a crank, not a switch. On a desktop, scroll the mouse wheel or trackpad in either
direction; each 240 px of scroll is one turn of the reel. On a phone, keep a finger down and
move it in circles; every loop is one turn, at any radius, and a straight drag counts for
nothing. The spin only counts once the finger has gone half a turn the same way, and a
reversal or a jerk starts that count again, so a trembling or scrubbing finger is just the
hold. The crank fades in about a third of a second once you stop, so a steady rhythm keeps a
steady speed. Holding without cranking, with a finger, the mouse button or Space, is the
steady reel: slower, but it never lets the line go slack. Cranking at full speed is quick and
risky: it raises tension by itself, and a fish that runs on top of that will snap the line, so
rest when the meter goes dark. With no tension at all for a few seconds the fish throws the
hook, except while you are taking line in. A fish that is tiring shows itself at the surface.

The first visit opens a How to fish card over the title: hold to cast, a dip is a nibble and
under is a bite, tap when it goes under, and how to reel on your kind of pointer. GOT IT,
Escape or a press on the stage closes it (that press does not cast), and it never comes back
once closed; the Help view in the menu shows the same rows plus the keys. During a fight a small
pill beside the reel says SCROLL (mouse) or SPIN (touch) until you crank for the first time, or
for eight seconds at most.

Keyboard: Space presses and releases, so holding it is the steady reel. Left and Right slide
the aim. R retrieves. M mutes. T toggles day and night. L opens the log. Escape opens and closes
the menu. ? opens help.

Phones that support `navigator.vibrate` get a short pulse on the bite and a tick every quarter
second while tension is in the dark end of the meter.

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
| `npm run sim` | Runs the fight model for every species under three policies (hold only, crank with rests, crank straight through) and prints landing, snap and slack rates. The constants are read from `src/game/tuning.ts` and `src/game/species.ts`, and the crank fades the way the game's does. `node tools/fightsim.mjs sweep` adds a table of rest thresholds |

## URL parameters

| Parameter | Meaning |
| --- | --- |
| `seed=N` | Seed the random generator. The same seed gives the same casts, waits, nibbles, bites and fish. Without it the seed comes from the first frame timestamp |
| `speed=N` | Multiply simulation time. `speed=8` runs a whole round in a few seconds. Default 1 |
| `theme=light` or `theme=dark` | Force a theme for this load without touching the stored choice |
| `debug=1` | Expose `window.game` with `state()`, `press()`, `release()`, `aim(ax)`, `crank(revs)`, `tick(ms)` and `goto(state, scenario)` |

Every timer in the game runs on simulation time, so `speed` scales all of it, and every random
draw goes through the seeded generator, so a seed replays a session exactly.

## The check

`npm run check` runs `tsc --noEmit`, `eslint .`, `vite build` and then `node tools/drive.mjs`.

The drive starts `vite preview`, launches headless Chrome over the DevTools Protocol and opens
`/?debug=1&seed=7&speed=8&theme=<theme>` for dark and light. Each run starts in a fresh browser
profile, so the first thing it sees is the intro card, and that is the first check (step 9 in
the spec's list): the card must be shown on first load with its four rows and a GOT IT pill. A
real click on GOT IT hides it, writes `the-big-one:intro` to localStorage and does not reach the
game; a reload keeps it hidden. The drive then clears the flag, reloads, and presses the stage:
the card closes, the flag is written again, and the game stays idle, so the closing press never
charges a cast. With the card out of the way, for each theme it:

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

Two reel checks follow, steps 10 and 11 in the spec's list. Step 10 reloads at `speed=1`,
because the crank decays in simulation time and the input below is timed in wall time, and
jumps to the fight scenario. The reel indicator must be visible, left of the angler and above
the deck, clear of the hint pill, reading SCROLL with the hint SCROLL TO REEL on the desktop and
SPIN with SPIN TO REEL on the phone, and `showReelHint` must be true. On the desktop the drive
then sends twelve real wheel events of 100 px over 600 ms through `Input.dispatchMouseEvent`; on
the phone a real touch drag of 24 moves around a 60 px circle, two loops in 800 ms, through
`Input.dispatchTouchEvent`. The crank must rise above zero and `reelSpeed` above the steady
hold, the indicator must hide, `lineOut` must shrink and the page must not scroll; on the
desktop every wheel event must have been consumed. If the bass happened to run during the input
the fight is reset and the input repeated, up to three times, so the line check measures the
crank and not the fish. Step 11 jumps to the fight scenario, presses, and steps 30 s of
simulation time with no crank: the state must be landed, the crank must have stayed at zero and
`reelSpeed` at the steady hold throughout.

Steps 9, 1 to 5, 10 and 11 run at 1440 by 900 and again at 390 by 844 with mobile and touch
emulation, which is what makes `(pointer: coarse)` true for the phone run; step 6 runs on the
desktop only. Console errors, uncaught exceptions and failed requests are collected in every
step and fail the run. Screenshots land in `tools/out/<theme>-<step>.png` and
`<theme>-phone-<step>.png`; `-9-intro` is the intro card and `-10-hint` the reel indicator.
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
                       save, audio, haptics, theme, debug
src/ui/                dom, hud, card, log, menu, icons, howto, intro, reelhint
src/styles.css         tokens, pills, card, intro card, reel indicator
public/fonts/          Silkscreen and Archivo, self-hosted
tools/drive.mjs        the headless check
tools/fightsim.mjs     the fight model under three reeling policies
SPEC.md                the full specification
```
