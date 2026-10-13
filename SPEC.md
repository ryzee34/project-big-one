# The Big One

A fishing game for the browser, seen over the angler's shoulder. He stands at the end of the pier
from ryanhklee.com with his back to you, looking out over the water: rod in hand, bobber out there
somewhere, and the big one further out than he can comfortably cast. Pixel art in the site's two palettes, with
the site's sprites, and no engine.

## Goals

- A full round in under a minute: cast, wait, hook, fight, land, log.
- Looks like it belongs to the site: same palettes, same dithered sky, same water bands, same
  angler colours, Silkscreen for labels, Archivo for prose.
- Plays with a mouse, a finger or a keyboard. Works in portrait on a phone.
- No framework and no runtime dependencies. One canvas for the scene, plain DOM for text.
- Deterministic under a seed, so a script can drive the whole loop and screenshot every state.

## Non-goals for v1

- No accounts, no server, no leaderboard. The log lives in localStorage.
- No shop, bait, tackle or upgrades. No map, one spot.
- No 3D and no WebGL. The water is a painted plane.
- No music. Synthesised sound effects only.

## 1. Stage and grid

The stage fills the viewport. Everything in the scene is drawn on an offscreen canvas at grid
resolution and scaled up by an integer, exactly as the site does.

- `pixelSize = clamp(round(stageWidth / 200), 4, 8)` CSS px per grid cell.
- `gridWidth = ceil(stageWidth / pixelSize)`, `gridHeight = ceil(stageHeight / pixelSize)`.
- `imageSmoothingEnabled = false` on both contexts, `image-rendering: pixelated` on the canvas.
- Recompute on resize (debounced 100 ms) and rebake the sky and sprites.
- There is no separate phone or desktop layout. Every position below is a ratio of the grid, so a
  wider stage shows more water on both sides and a taller one shows more sky and more near water.
  A phone in portrait is about 98 cells across, a laptop about 206. `narrow` is a stage under
  720 CSS px wide; it only moves the moon and stacks the HUD pills.

Layout, in grid cells:

- `horizon = round(gridHeight * 0.42)`. Sky is rows `0 .. horizon - 1`. The horizon line is the
  single row `horizon - 1` in the palette's `horizon` colour, with the site's foam sparkle on it
  (`crest = sin(x / 7 + t / 420) + sin(x / 3.1 - t / 700)`, a cell where `crest > 0.85`).
- `deck = max(6, round(gridHeight * 0.07))`. The pier deck is the bottom `deck` rows: `woodMid`
  fill, the top row in `wood`, a `woodDark` seam every 6 columns running top to bottom.
- Water is rows `horizon .. gridHeight - deck - 1`. `nearRow = gridHeight - deck - 1`.
- Water bands use the site's proportions from the horizon down: `w1` 0 to 0.18, `w2` 0.18 to
  0.42, `w3` 0.42 to 0.7, `w4` 0.7 to 1. Far water is light, near water is dark.
- Ripples: `round(gridWidth * 0.11)` dashes in `ripple` at alpha 0.5, 2 to 4 cells long, placed
  by `hashNoise`, swaying 3 cells over 2400 ms. Dashes below the midpoint of the water are one
  cell longer.
- Night: 46 stars in the top 90 % of the sky with the site's twinkle, the `MOON` sprite at
  `(gridWidth - 34, 10)` (narrow stages: `(gridWidth - 22, max(4, horizon - 26))`), and the
  site's ten-row moon trail on the water. Day: three `CLOUD` sprites drifting.
- The sky is baked once per size and theme with the site's `bakeSky` (Bayer 4x4 dither across
  the last 45 % of each band).

### The water plane

A point on the water is `(ax, d)`: `ax` in `[-1, 1]` is left to right, `d` in `[0, 1]` is
distance from the pier. Screen position:

- `row(d) = horizon + 2 + round((nearRow - horizon - 2) * (1 - d) ^ 1.6)`
- `col(ax, d) = round(gridWidth / 2 + ax * gridWidth * 0.42 * (0.35 + 0.65 * (1 - d)))`
- Castable region: `d` in `[0.12, 1]`, `ax` in `[-0.9, 0.9]`.
- Distance bands: near `d < 0.4`, mid `0.4 <= d < 0.75`, far `d >= 0.75`.
- Yards for the HUD: `round(5 + 55 * d)`.

### Rod and angler

- Grip `G = (round(gridWidth * 0.74), gridHeight - deck + 2)`.
- Rod tip at rest `T = (round(gridWidth * 0.6), round(horizon + (nearRow - horizon) * 0.18))`.
- The rod is a pixel line from `G` to `T` in `rod`, drawn twice with a one-cell x offset for the
  first 60 % of its length and once for the rest, so it tapers. It is painted before the angler, so
  the figure covers it where they overlap.
- Under tension the tip moves by `(-6 * bend, 10 * bend)` cells, `bend = tension` eased out.
- The `ANGLER` sprite (`src/pixel/angler.ts`, 24 x 40, scale 1) is the site's angler seen from
  behind: beanie with its fold band, the nape in skin, shell jacket, denim below the hem. Its hand
  anchor is cell `(4, 26)`, the fist the rod leaves from, placed on `G`, so the sprite origin is
  `G - (4, 26)`. The rod hand is on the screen-left side of the body, so the rod leaves the figure
  up-left without crossing it; the other arm hangs with its hand at the hip. The stage bottom clips
  the figure around the thighs: the rows above the grip are always visible, the rows below it only
  as far as the deck allows.
- The reel is a 3x3 `rod` block four cells left of the grip and two rows below it, with a one-cell
  `accent` handle that steps around the site's `REEL_ORBIT` while reeling.
- The line runs from the tip to the bobber with the site's `drawPixelCurve`; the control point
  is the midpoint plus `(0, sag)`, `sag = clamp(length * 0.12, 1, 10) * (1 - tension)`.
- Idle bob: the angler, rod and line move by `round(sin(t / 1100) * 0.5)` cells. Off under
  reduced motion.

`ANGLER`, 24 x 40, keys from the site's angler map (`n` beanie, `N` fold, `s` skin, `o` shell,
`j` denim, `J` denim shadow):

```
............nnnnnn......
..........nnnnnnnnnn....
.........nnnnnnnnnnnn...
.........nnnnnnnnnnnn...
.........nnnnnnnnnnnn...
.........nnnnnnnnnnnn...
.........NNNNNNNNNNNN...
.........NNNNNNNNNNNN...
..........NNNNNNNNNN....
...........ssssssss.....
............ssssss......
............ssssss......
.........oooooooooooo...
.......oooooooooooooooo.
.....ooooooooooooooooooo
.....ooooooooooooooooooo
.....ooo.oooooooooooo.oo
.....ooo.oooooooooooo.oo
.....ooo.oooooooooooo.oo
.....ooo.oooooooooooo.oo
.....ooo.oooooooooooo.oo
.....ooo.oooooooooooo.oo
.....ooo.oooooooooooo.oo
.....ooo.oooooooooooo.oo
....sss..oooooooooooo.oo
...ssss..oooooooooooo.oo
...ssss..oooooooooooo.oo
...ssss..oooooooooooo.oo
.........JJJJJJJJJJJJJss
.........jjjjjjJjjjjjjss
.........jjjjjjJjjjjjj..
.........jjjjjjJjjjjjj..
.........jjjjjjJjjjjjj..
.........jjjjjjJjjjjjj..
.........jjjjjjJjjjjjj..
.........jjjjjjJjjjjjj..
.........jjjjjjJjjjjjj..
.........jjjjjjJjjjjjj..
.........jjjjjjJjjjjjj..
.........jjjjjjJjjjjjj..
```

### Bobber, splash, fish shadow

- `BOBBER` (5 x 6, `a` accent, `p` white). Scale 2 while `d < 0.4`, scale 1 beyond. Floats with
  `round(sin(t / 700))` cells of bob.
- Landing splash: three rings in `foam` over 1100 ms, each a one-cell dotted ellipse `2 + 6 * t`
  cells wide and a third as tall, plus six droplets that rise three cells and fall.
- Fish shadow during the fight: a `fishDark` ellipse at alpha 0.6, two rows tall and
  `6 + 10 * size` cells wide (`size` 0 to 1 by species weight range), one row under the
  bobber's row, moving with the fish. When stamina drops under 0.3 the shadow surfaces: a
  one-row `foam` splash on its row every 1.5 s.

## 2. States

```
IDLE -> CHARGE -> CAST -> WAIT -> BITE -> FIGHT -> LANDED -> IDLE
                           |        |       |
                           v        v       v
                        RETRIEVE  WAIT     LOST -> IDLE
                           |     (missed)
                           v
                          IDLE
```

- `IDLE`: rod at rest, bobber hanging under the tip, aim marker on the water follows the
  pointer. First load shows the title.
- `CHARGE`: pointer or Space held. The power meter runs. Aim is locked at press.
- `CAST`: bobber in flight, 450 + 450 * d ms. Input ignored.
- `WAIT`: bobber floats. Nibbles happen. Press = `RETRIEVE`.
- `BITE`: bobber under. Press inside the window = `FIGHT`. Window expires = back to `WAIT`
  with a fresh, shorter roll.
- `FIGHT`: hold = reel, release = rest. Ends in `LANDED` or `LOST`.
- `LANDED`: the card. Keep or Release returns to `IDLE`.
- `LOST`: toast for 1200 ms, line reels in, `IDLE`.
- `RETRIEVE`: 700 ms reel-in, `IDLE`.
- Menu overlay from any state except `CAST`. The simulation clock stops while it is open.

The machine lives in one module with one `step(dt)` and one `dispatch(event)`; every timer is
simulation time, never wall time, so `?speed=` scales everything.

## 3. Controls

Pointer, mouse or touch, the whole stage is the target (`touch-action: none`):

| State | Move | Press and hold | Release | Tap |
|---|---|---|---|---|
| IDLE | aim x | start CHARGE | cast | |
| WAIT | | | | retrieve |
| BITE | | | | hook |
| FIGHT | circle while held: crank | steady reel | rest | |
| LANDED | | | | buttons |

Mouse wheel or trackpad scroll in FIGHT: crank, either direction.

Keyboard: Space is press and release. Left and Right slide the aim at 0.6 units per second.
R retrieves. Escape opens and closes the menu. M mutes. T toggles day and night. L opens the
log. ? opens the help card.

### Reeling

Reeling is a crank, not a switch. The machine keeps a smoothed crank rate in revolutions per
second and turns it into `reelSpeed` in `[0, 1]`:

- A `crank` event carries `revs`, a non-negative number of revolutions. On each event the rate
  gains `revs / 0.3`; every step the rate decays by `exp(-dt / 0.3)`, so a steady input of R
  revolutions per second settles at R. `crankSpeed = clamp(rate / 2.5, 0, 1)`: two and a half
  revolutions per second is full speed.
- Wheel: each `wheel` event in FIGHT is `revs = min(1, |deltaY| / scale)` with deltaY in pixels
  (lines count 16 px each, pages 400 px). The scale is 120 px per turn for an event that arrives
  40 ms or more after the previous one, a mouse notch, so three notches a second is full speed.
  An event that follows the previous one within 40 ms is part of a stream, a trackpad, and
  counts at 1000 px per turn, so one swipe with its momentum is a burst at about two thirds
  speed, a gentle scroll stays under the steady hold, and only a sustained hard scroll reaches
  full. Direction is ignored.
  The event is consumed so the page never scrolls, unless it targets a control inside the HUD,
  where panels keep scrolling.
- Circle: while the pointer is held in FIGHT, each move at least 6 px from the last sample has a
  heading. The signed change of heading between samples, wrapped to [-pi, pi], divided by 2 pi,
  is a turn step. A step larger than a quarter turn, or one against the direction of the steps
  before it, counts nothing and resets the spin. Steps in one direction accumulate and count only
  once they reach half a turn; that half turn is then `revs`, and every further step in that
  direction is `revs` on its own. Circling at any radius gives one revolution per loop; a straight
  drag, a trembling finger or a scrub gives nothing. Mouse and touch alike.
- Hold: while the press is held (pointer or Space) `holdSpeed = 0.5`, the steady reel.
- `reelSpeed = max(holdSpeed, crankSpeed)`. `reeling` is `reelSpeed > 0.05`, and the reel handle
  spins at `120 * reelSpeed` units per second.

The fight hint reads SCROLL TO REEL on a fine pointer and SPIN TO REEL on a coarse one. The
input mode is `(pointer: coarse)` at boot. A reel indicator (section 11) shows until the first
crank of each fight, which for the circle means the first half turn.

Accessibility: the canvas is `aria-hidden`; every control is a real button with a label; a
polite live region announces state changes ("Cast, 42 yards", "Bite", "Landed a 4.2 lb bass",
"Snapped the line"). `prefers-reduced-motion`: no idle bob or sway, no droplets, instant
transitions, hook window 1300 ms instead of 900.

## 4. Casting

- The power meter fills 0 to 1 in 1100 ms, drains back in 1100 ms, and repeats until release.
- Distance `d = 0.12 + 0.88 * P`. Releasing at `P >= 0.97` is a perfect cast: `d = 1`, the
  meter flashes `accent`, the ping sound plays.
- Flight: `t` from 0 to 1 over the flight time. `x = lerp(tipCol, targetCol, easeOut(t))`,
  `y = lerp(tipRow, targetRow, t) - sin(pi * t) * (8 + 14 * d)`. The bobber switches to
  scale 1 at `t > 0.5` when the target is beyond `d = 0.4`. The line follows.
- Landing: splash, plop sound, live region "Cast, N yards", then `WAIT`.

## 5. Waiting and the bite

- On landing, roll the species from the band and the theme (section 7), then the wait
  `T ~ U(4, 12)` s, or `U(6, 16)` s in the far band.
- Nibbles: `randInt(0, 3)` of them at random times in `(1, T - 1)`. A nibble dips the bobber one
  cell for 220 ms with a tick and a one-ring ripple. Pressing on a nibble retrieves the line, so
  a dip and a full submerge must read differently.
- At `T` the bite: the bobber is drawn three cells lower under a one-row `foam` splash, the rod
  tip dips three cells, the thunk plays, an `accent` "!" appears two rows above the water point.
- Hook window 900 ms (1300 under reduced motion). Press inside it = `FIGHT`. Miss = the bobber
  pops back with a foam ring and a new roll with `T ~ U(3, 8)` s.
- Retrieve at any point in `WAIT`: 700 ms of reel clicks while the line shortens to the tip.

## 6. The fight

State: `lineOut` starts at `d`; `tension` starts at 0.35; `stamina` starts at the species
value; `running` false. Per simulation step of `dt` seconds with species `S`:

- `pull = S.pull * (0.35 + 0.65 * clamp(stamina, 0, 1))`.
- A run starts with probability `S.runRate * clamp(stamina, 0, 1) * dt` and lasts
  `U(0.6, 1.4) * S.runLength` s. While running: `tension += pull * dt`,
  `lineOut += S.runSpeed * dt` (cap 1).
- With `reelSpeed` from section 3: `lineOut -= 0.14 * reelSpeed * (1 - 0.6 * tension) * dt`,
  `tension += (0.7 * reelSpeed - 1.2 * (1 - reelSpeed)) * dt`, `stamina -= 0.08 * reelSpeed * dt`.
  At rest tension falls 1.2 per second; a full crank raises it 0.7 per second; the steady hold
  at 0.5 lets it fall 0.25 per second. Holding alone lands perch and bass and takes about twelve
  seconds on a bass; tuna, shark and the big one pull harder than the hold can shed, so they need
  the crank, and rests whenever they run.
- Always: `stamina -= (running ? 0.10 : 0.02) * dt`. `tension` is clamped to `[0, 1]`.
- Snap: `tension >= 1` for 0.8 s without a break: `LOST`, "Snapped the line." The grace is
  long enough to see the red and stop cranking.
- Slack: `tension <= 0.04` for 2.5 s while `lineOut > 0` and `reelSpeed <= 0.05`: `LOST`, "It
  threw the hook." A line being taken in cannot go slack.
- Land: `lineOut <= 0`: `LANDED`.

The tension meter has three zones: 0 to 0.4 in `ink-soft`, 0.4 to 0.85 in `accent`, 0.85 to 1
in `accentDark` with the creak sound. The orange zone starts at 0.4 because that is where a big
fish needs you to stop cranking: resting at 0.3 lands the marlin about seven times in ten in the
simulator, resting at 0.6 never did under the earlier, harsher crank. The rod bend and the line sag follow `tension`. Fish
stamina is not shown; the surfacing shadow is the tell. Every constant above lives in
`src/game/tuning.ts`.

## 7. Species

Weights in pounds. Pool weights are relative within a band; 0 means never. Day is the light
theme, night the dark one.

| id | name | sprite | lb | near day/night | mid day/night | far day/night | pull | runRate | runSpeed | runLength | stamina |
|---|---|---|---|---|---|---|---|---|---|---|---|
| perch | Perch | `FISH` 16x10 | 0.4 to 2.5 | 5 / 3 | 2 / 1 | 0 / 0 | 0.5 | 0.25 | 0.05 | 0.8 | 0.6 |
| bass | Bass | `BASS` 18x13 | 1 to 9 | 3 / 4 | 4 / 4 | 1 / 1 | 0.8 | 0.4 | 0.07 | 1.0 | 0.9 |
| tuna | Tuna | `TUNA` 20x14 | 8 to 60 | 0 / 0 | 2 / 1 | 4 / 2 | 1.1 | 0.5 | 0.12 | 1.6 | 1.3 |
| grouper | Grouper | `GROUPER` 34x16 | 5 to 45 | 0 / 1 | 1 / 3 | 2 / 4 | 1.3 | 0.2 | 0.04 | 1.2 | 1.1 |
| shark | Shark | `SHARK` 26x14 | 30 to 250 | 0 / 0 | 0 / 0 | 1 / 3 | 1.38 | 0.45 | 0.10 | 1.5 | 1.8 |
| marlin | The Big One | `MARLIN` 36x16 | 300 to 600 | 0 / 0 | 0 / 0 | see below | 1.32 | 0.6 | 0.14 | 2.0 | 2.6 |

Shark and marlin pull were first written as 1.5 and 1.7. A 300-fight simulation of the section 6
model showed the marlin snapping the line every time at 1.7, because a run adds tension faster than
resting relieves it, and the shark snapping about four times in ten. At 1.38 and 1.32, with the
crank fading as in section 3 and the player resting whenever the fish runs or tension passes 0.3,
the marlin lands about eight times in ten after a long fight and the shark nearly always.
Those are the values that ship.

The big one only takes a bait at `d >= 0.9`, and only once three fish are in the log. In that
case it replaces the far roll with probability 0.08 at night and 0.03 by day. Landing it puts a
`THE BIG ONE` badge on the card, a star on its log row, and changes the idle hint to
"YOU GOT IT" for the rest of the session.

Weight roll: `lb = min + (max - min) * r ^ 2.2`, `r` from the seeded generator, one decimal.
`NEW RECORD` when it beats the stored best for that species. `size` for the shadow is
`(lb - min) / (max - min)`.

All sprites use the site's catch colour map (`f` fish, `d` fishDark, `l` fishLight, `e` eye)
and face the same way as the site's catches. `MARLIN` is new, 36 x 16. A starting shape; refine
it, keep the size and the four colours:

```
.....................dd.............
...................dddd.............
.................ddddddd............
...............ddddddddddd..........
.............dddddddddddddddd.....d.
...........dddddddddddddddddddd...dd
.........ffffffffffffffffffffffff.dd
ddddddddffeffffffffffffffffffffffffd
.........ffffffffffffffffffffffffdd.
..........lllllllllllllllllllllfff..
............llllllllllllllllllll.dd.
..............llllllll.....ll.....dd
................llll..............dd
....................................
....................................
....................................
```

## 8. Landing, the card and the log

- Landing: the fish sprite rises from the water point along the line to the centre of the
  stage over 900 ms, flipped to face the pier, with a splash where it left the water. Then the
  canvas fish fades out over 200 ms while the card fades in.
- The card is DOM in the site's recipe: 3 px solid `--line` border, hard shadow 6 px by 6 px
  in `--hard` (4 px on narrow stages), `--surface` fill, padding 18 px 20 px 16 px. Label row in
  Silkscreen 9 px uppercase (SPECIES, WEIGHT, DISTANCE), the name in Archivo 27 px bold, the
  fish drawn in a canvas at four screen pixels per cell, one line of prose in Archivo 14 px
  ("A 4.2 lb bass from 35 yards out."), badges as accent pills, and two pixel pills: KEEP and
  RELEASE.
- KEEP writes the catch and bumps the creel count. RELEASE writes nothing and plays a splash.
- The log panel (DOM, from the creel pill or L): one row per species with best weight and
  count, then the ten most recent catches, and a RESET button that asks once.
- Save: localStorage key `the-big-one:v1`:
  `{ version: 1, catches: [{ id, species, lb, yards, night, at }], best: { [species]: lb },
  settings: { muted } }`. `catches` is capped at 200, oldest dropped; `best` is kept forever.
  Written on every change. Unparseable data is ignored and overwritten.

## 9. Day and night

`data-theme` on `<html>`, `dark` or `light`, stored under `scene-theme` like the site. First
visit: night when the local hour is before 6 or from 18, otherwise day. After that the stored
choice wins. The HUD toggle uses the site's `SUN_ICON` and `MOON_ICON`. A theme change rebakes
the sky and the sprites from the other palette and swaps the CSS tokens; nothing else changes.

## 10. Sound

Web Audio only, created on the first user gesture. One master gain with a mute toggle (M or
the HUD button), stored in settings. Nothing is loaded; every effect is synthesised:

| effect | recipe |
|---|---|
| cast | band-passed noise, 180 ms, filter sweeping down |
| plop | sine 420 to 90 Hz over 120 ms plus a noise tick |
| nibble | square 880 Hz, 40 ms |
| bite | sine 140 Hz, 160 ms, plus noise |
| reel | a noise tick every 140 ms at the steady reel down to 60 ms at full crank, pitch rising with speed; the retrieve and the lost reel-in tick at the fast cadence |
| creak | sawtooth 70 Hz with vibrato while tension is above 0.85 |
| snap | noise burst 60 ms, then 400 ms of silence before the toast |
| landed | square arpeggio C5 E5 G5, 90 ms each |
| release | filtered noise, 200 ms |
| perfect | sine 1320 Hz, 80 ms |

## 11. HUD

DOM over the canvas, in the site's pill recipe (Silkscreen 9 px, 16 px line height,
uppercase, 3 px edge, 3 px hard shadow).

- Top left: the catches pill, labelled CATCHES with the `CREEL` icon and the kept count. Opens
  the log.
- Top right: theme, mute and menu pills with baked pixel icons. On narrow stages the pills shrink
  to icons only.
- Bottom centre: the state hint. HOLD TO CAST, WAIT FOR IT, HIT IT, SCROLL TO REEL or SPIN TO
  REEL by input mode, and the LOST toasts.
- Reel indicator: a pill near the reel, left of the angler and above the deck, shown while
  `showReelHint` is true: during FIGHT until the first crank event of that fight, or for eight
  seconds at most. Coarse pointer: a circular-arrow pixel icon turning slowly with the label
  SPIN. Fine pointer: a mouse-wheel pixel icon with up and down arrows and the label SCROLL.
  The turn is a CSS animation on wall time. Static under reduced motion.
- Intro card, first visit only: HOW TO FISH centred below the title block, four rows with pixel
  icons.
  Hold to charge, let go to cast. Watch the bobber and wait for a fish to pull it underwater.
  Tap the moment it goes under. Spin your finger on the screen to reel in (coarse) or Scroll the wheel to reel in, hold to reel steady
  (fine). On a fine pointer a muted line follows the rows: For the best
  experience, play it on a mobile device. A GOT IT pill closes it, as do Escape, Space, Enter or a press on the stage, and that
  press or key does not cast; ? and L close it and open help or the log. Closing stores
  `the-big-one:intro` in localStorage so it never returns; the menu's Help shows the same rows
  plus a fifth row for the keys.
- Haptics: on devices with `navigator.vibrate`, after the first user gesture, a 20 ms pulse on
  the bite and 30 ms pulses every 250 ms while tension is above 0.85 in a fight.
- Power meter: canvas, vertical, 4 cells wide and 24 tall, left of the angler, `accent` fill with
  a `white` top segment for the perfect zone.
- Tension meter: canvas, horizontal, top centre, 40 % of the grid wide and 3 cells tall, the
  three zones from section 6.
- Title on first load: THE BIG ONE in Silkscreen at 24 px (three screen pixels per cell), the
  hint under it, and one line in Archivo 14 px: "The big one is out there… somewhere. No one
  has landed it." It fades on the first cast and never returns.
- Menu overlay: Resume, Help, Log, Theme, Sound, Reset log.

## 12. Tech

- Vite and TypeScript, strict, `noUncheckedIndexedAccess`. No runtime dependencies. Dev
  dependencies: vite, typescript, eslint with typescript-eslint. Node 22.
- Fonts self-hosted in `public/fonts`: `silkscreen-latin.woff2` and the Archivo variable latin
  file (both SIL Open Font License), copied from the résumé folder. Silkscreen uses
  `font-display: block`.
- The pixel library is copied from the portfolio, not imported: `bitmaps.ts`, `palettes.ts`
  and `raster.ts` from `lib/pixel`, `bakeSky` from `lib/scene/sky.ts`, the water, surface and
  pier painters from `lib/scene/renderer.ts`, and `clamp`, `lerp`, `easeOutCubic` and
  `hashNoise` from `lib/math.ts`. `MARLIN` is added to `bitmaps.ts`; the angler sprite lives in
  `src/pixel/angler.ts`. Palettes stay byte for byte the same.

```
index.html
src/main.ts
src/pixel/bitmaps.ts  palettes.ts  raster.ts  angler.ts
src/scene/stage.ts  geometry.ts  sky.ts  water.ts  pier.ts  rod.ts  bobber.ts  fish.ts
          effects.ts  render.ts
src/game/types.ts  tuning.ts  species.ts  rng.ts  machine.ts  cast.ts  wait.ts  fight.ts
         loop.ts  input.ts  save.ts  audio.ts  haptics.ts  theme.ts  debug.ts
src/ui/hud.ts  card.ts  log.ts  menu.ts  icons.ts  dom.ts  howto.ts  intro.ts  reelhint.ts
src/styles.css
public/fonts/
tools/drive.mjs  fightsim.mjs
SPEC.md  README.md
```

- Loop: `requestAnimationFrame`, fixed simulation step of 1/120 s with an accumulator, render
  at display rate, pause on `document.hidden`. `?speed=N` multiplies simulation time.
- Random: mulberry32 seeded from `?seed=` or `Date.now()`. Every draw goes through it.
  `Math.random` is not used anywhere.
- Debug hook, only with `?debug=1`: `window.game = { state(), press(), release(), aim(ax),
  crank(revs), tick(ms), goto(name, scenario) }`. Scenarios: `wait` (bobber at `d = 0.6`), `bite`,
  `fight` (bass, stamina 0.5), `fightSnap` (tension pinned at 1), `landed` (bass, 4.2 lb),
  `lost`.
- Conventions: no code comments, small modules, functions over classes except the machine,
  double quotes, semicolons, two-space indent. Commit messages short and plain.

## 13. Done means

`npm run check` passes: `tsc --noEmit`, `eslint .`, `vite build`, then `node tools/drive.mjs`.

`tools/drive.mjs` runs headless Chrome over the Chrome DevTools Protocol against
`vite preview`, opens `/?debug=1&seed=7&speed=8`, and for each theme:

1. IDLE screenshot. The top rows contain the sky stops, the bottom water rows contain `w4`, the
   cells around the grip contain `skin` (the angler's rod hand).
2. `press`, 400 ms, `release`. State is CAST then WAIT within 2 s of wall time. The bobber's
   `accent` is present near the water point.
3. `goto bite`, `press`. State is FIGHT.
4. Hold for 20 s of simulation time. State is LANDED or LOST. Then `goto landed`: the card is in
   the DOM with the species and weight; click KEEP; localStorage holds one catch and the creel
   pill reads 1.
5. `goto fightSnap`. State becomes LOST with the snap message.
6. With `prefers-reduced-motion` emulated, two IDLE frames 500 ms apart are identical.
7. The default viewport is 1440 by 900. Steps 1 to 5 repeat at 390 by 844, where the angler, the
   meters and the hint must also be inside the viewport.
8. No console errors in any step. Screenshots go to `tools/out`, which is ignored by git.
9. First load shows the intro card; GOT IT hides it and sets the localStorage flag; a reload
   does not show it again.
10. `goto fight`: the reel indicator is visible and `showReelHint` is true. Twelve real wheel
    events of 100 px over 600 ms raise `crank` above zero and `reelSpeed` above the steady
    hold, hide the indicator, and reduce `lineOut`. On the phone size the same is done with a
    real circular touch drag of about two loops. This step runs at speed 1, because the crank
    fades in simulation time while the input is timed in wall time.
11. `goto fight` then a 30 s hold with no crank lands the bass: the steady reel alone wins a
    half-tired fish.
12. `tools/fightsim.mjs` runs the section 6 model for every species under three policies,
    hold only, full crank with rests, and full crank without rests, and prints landing rates.
    It reads its constants from `src/game/tuning.ts` and `src/game/species.ts`, models the
    crank's gain and fade, and its rests policy rests while the fish runs or tension is above
    0.3. Bass lands under hold only nearly always; the marlin lands with crank and rests about
    eight times in ten; a full crank straight through a run snaps.

Build output under 120 KB gzipped. Then the hand check: ten rounds on the desktop and five on a
phone; a nibble and a bite read differently at a glance; a fight is winnable but not free; a
perfect cast at night finds the big one within about fifteen far casts.

## 14. Deploy

Vercel through the GitHub integration, the same as the portfolio: a static Vite build from
`dist`, served at the project's default `vercel.app` address. No custom domain for now; if one is
wanted later it is one CNAME on Cloudflare. The portfolio links to it from a project write-up
later.

## 15. Decisions

- The big one is the marlin, a new sprite.
- Five regular species plus the marlin. No other new fish in v1.
- The vantage point is the pier.
- No custom domain for now; the Vercel address is enough for a personal project.
- Phone and desktop from the same build: one fluid scene, pointer controls on both, keyboard as
  the desktop extra. Phone portrait is in v1; landscape on a phone is the same scene wider.
- The angler is shown from behind, over the shoulder, instead of first-person hands. Decided on
  7 October after the first play: the hands read as a head, and a figure facing the water feels
  more natural.
- Reeling is a crank: the mouse wheel on a desktop, a circling finger on a phone, with the held
  press as the steady fallback, plus an intro card and a reel indicator so players know. Decided on
  11 October: holding felt flat, and a spin is the gesture a reel asks for.
- The wheel was loosened on 13 October after Ryan's trackpad snapped the line twice from one
  swipe: streamed wheel events count at 1000 px per turn, the crank raises tension 0.7 per second
  instead of 0.9, and the line holds for 0.8 s at full tension before it snaps.

## 16. Build order

1. Scaffold, copy the pixel library, fonts and tokens. The stage renders sky, water, pier,
   angler and rod in both themes and both orientations.
2. Random, loop, input, the machine through IDLE, CHARGE, CAST, WAIT, RETRIEVE.
3. Nibbles, the bite window, the fight model, the meters, LANDED and LOST.
4. Card, log, save, HUD, menu, theme, sound.
5. The debug hook and `tools/drive.mjs`. Fix until `npm run check` passes.
6. README: controls, the check command, the seed and speed parameters.
