import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function launchChrome({ port, width, height, extraArgs = [] }) {
  const profile = mkdtempSync(join(tmpdir(), "big-one-cdp-"));
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profile}`,
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${width},${height}`,
      `--remote-debugging-port=${port}`,
      ...extraArgs,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((entry) => entry.type === "page") ?? null;
    } catch {
      target = null;
    }
  }
  if (!target) {
    chrome.kill("SIGKILL");
    rmSync(profile, { recursive: true, force: true });
    throw new Error(`chrome did not expose a page on port ${port}`);
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    if (msg.method) events.push(msg);
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? "evaluate failed");
    }
    return result.result.value;
  };

  const exited = () => chrome.exitCode !== null || chrome.signalCode !== null;
  const close = async () => {
    try {
      ws.close();
    } catch {
      chrome.kill();
    }
    chrome.kill();
    for (let i = 0; i < 20 && !exited(); i++) await sleep(100);
    if (!exited()) chrome.kill("SIGKILL");
    for (let i = 0; i < 10 && !exited(); i++) await sleep(100);
    for (let i = 0; i < 5; i++) {
      try {
        rmSync(profile, { recursive: true, force: true });
        return;
      } catch {
        await sleep(200);
      }
    }
  };

  return { send, evaluate, events, close };
}

function startPreview(port) {
  const root = new URL("..", import.meta.url).pathname;
  const child = spawn(
    process.execPath,
    [`${root}node_modules/vite/bin/vite.js`, "preview", "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
    {
      cwd: root,
      stdio: "ignore",
      env: process.env,
    },
  );
  const stop = () => {
    child.kill();
  };
  const ready = (async () => {
    for (let i = 0; i < 80; i++) {
      await sleep(250);
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`);
        if (response.ok) return;
      } catch {
        continue;
      }
    }
    stop();
    throw new Error(`vite preview did not answer on ${port}`);
  })();
  return { ready, stop };
}

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = `${ROOT}tools/out/`;
const PREVIEW_PORT = Number(process.env.PORT ?? 4184);
const CDP_PORT = Number(process.env.CDP_PORT ?? 9345);
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PREVIEW_PORT}`;
const SEED = 7;
const SPEED = 8;
const SAVE_KEY = "the-big-one:v1";
const THEMES = ["dark", "light"];
const DESKTOP = { name: "desktop", width: 1440, height: 900 };
const PHONE = { name: "phone", width: 390, height: 844 };
const READY_MS = 8000;
const WATCHDOG_MS = 300000;
const GAME_MISSING =
  "window.game is missing: the page did not expose the debug api. src/game/debug.ts must assign exposeDebug(...) to window.game when the url has debug=1, and main.ts must call it.";

const HELPERS = `
  const game = window.game;
  const canvas = document.querySelector('canvas[data-ui="stage"]');
  const ctx = canvas.getContext("2d");
  const px = Math.max(4, Math.min(8, Math.round(innerWidth / 200)));
  const gridW = Math.ceil(innerWidth / px);
  const gridH = Math.ceil(innerHeight / px);
  const horizon = Math.round(gridH * 0.42);
  const deck = Math.max(6, Math.round(gridH * 0.07));
  const nearRow = gridH - deck - 1;
  const grip = { x: Math.round(gridW * 0.74), y: gridH - deck + 2 };
  const geometry = { px, gridW, gridH, horizon, deck, nearRow, grip, viewport: [innerWidth, innerHeight] };
  const waterPoint = (ax, d) => ({
    x: Math.round(gridW / 2 + ax * gridW * 0.42 * (0.35 + 0.65 * (1 - d))),
    y: horizon + 2 + Math.round((nearRow - horizon - 2) * Math.pow(1 - d, 1.6)),
  });
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const readPixels = () => {
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return (gx, gy) => {
      const cx = Math.round((gx + 0.5) * px);
      const cy = Math.round((gy + 0.5) * px);
      if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) return null;
      const x = Math.round(cx * scale);
      const y = Math.round(cy * scale);
      if (x >= canvas.width || y >= canvas.height) return null;
      const i = (y * canvas.width + x) * 4;
      const d = img.data;
      return "#" + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
    };
  };
  const tally = (cell, x0, x1, y0, y1) => {
    const counts = {};
    let total = 0;
    for (let y = Math.max(0, y0); y <= Math.min(gridH - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(gridW - 1, x1); x++) {
        const c = cell(x, y);
        if (c === null) continue;
        total++;
        counts[c] = (counts[c] ?? 0) + 1;
      }
    }
    return { total, counts };
  };
  const text = (selector) => {
    const el = document.querySelector(selector);
    return el ? el.textContent.trim() : null;
  };
  const rectOf = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const inside = r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
    return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), inside };
  };
  const snap = () => game.state();
  const stepUntil = (predicate, maxMs, stepMs) => {
    let elapsed = 0;
    let s = snap();
    while (elapsed < maxMs && !predicate(s)) {
      game.tick(stepMs);
      elapsed += stepMs;
      s = snap();
    }
    return { snap: s, elapsed };
  };
`;

const probe = (body) => `(async () => {
  await document.fonts.ready;
  ${HELPERS}
  ${body}
})()`;

function readPalettes() {
  const source = readFileSync(`${ROOT}src/pixel/palettes.ts`, "utf8");
  const palettes = {};
  for (const theme of THEMES) {
    const start = source.indexOf(`\n  ${theme}: {`);
    const end = source.indexOf("\n  },", start);
    if (start < 0 || end < 0) throw new Error(`could not find the ${theme} palette in src/pixel/palettes.ts`);
    const block = source.slice(start, end);
    const stops = block.match(/skyStops:\s*\[([^\]]*)\]/);
    if (!stops) throw new Error(`could not find skyStops in the ${theme} palette`);
    const palette = { skyStops: [...stops[1].matchAll(/"(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase()) };
    for (const m of block.matchAll(/(\w+):\s*"(#[0-9A-Fa-f]{6}|)"/g)) palette[m[1]] = m[2].toUpperCase();
    palettes[theme] = palette;
  }
  return palettes;
}

const share = (t, colours) => {
  const set = new Set(colours.filter(Boolean));
  let hit = 0;
  for (const [c, n] of Object.entries(t.counts)) if (set.has(c)) hit += n;
  return t.total ? hit / t.total : 0;
};
const count = (t, colour) => (colour ? t.counts[colour] ?? 0 : 0);
const outside = (t, colours) => {
  const set = new Set(colours.filter(Boolean));
  let n = 0;
  for (const [c, k] of Object.entries(t.counts)) if (!set.has(c)) n += k;
  return n;
};
const top = (t, n = 4) =>
  Object.entries(t.counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([c, k]) => `${c}x${k}`)
    .join(" ");
const pct = (v) => `${Math.round(v * 100)}%`;

function drainErrors(chrome) {
  const errors = [];
  for (const e of chrome.events) {
    if (e.method === "Runtime.exceptionThrown") {
      const d = e.params.exceptionDetails;
      errors.push(`exception: ${d.exception?.description ?? d.text}`);
    } else if (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") {
      errors.push(`console.error: ${e.params.args.map((a) => a.value ?? a.description ?? a.type).join(" ")}`);
    } else if (e.method === "Log.entryAdded" && e.params.entry.level === "error") {
      errors.push(`log: ${e.params.entry.text} ${e.params.entry.url ?? ""}`.trim());
    } else if (e.method === "Network.responseReceived" && e.params.response.status >= 400) {
      errors.push(`request: ${e.params.response.status} ${e.params.response.url}`);
    } else if (e.method === "Network.loadingFailed" && !e.params.canceled) {
      errors.push(`request failed: ${e.params.errorText}`);
    }
  }
  chrome.events.length = 0;
  return errors;
}

async function openGame(chrome, run, extra = "") {
  const url = `${BASE_URL}/?debug=1&seed=${SEED}&speed=${SPEED}&theme=${run.theme}${extra}`;
  await chrome.send("Page.navigate", { url });
  const started = Date.now();
  let ready = null;
  while (Date.now() - started < READY_MS) {
    await sleep(100);
    try {
      ready = await chrome.evaluate(`(() => ({
        game: typeof window.game === "object" && window.game !== null && typeof window.game.state === "function",
        stage: Boolean(document.querySelector('canvas[data-ui="stage"]')),
        href: location.href,
      }))()`);
    } catch {
      ready = null;
    }
    if (ready && ready.game && ready.stage) break;
  }
  if (!ready || !ready.stage) throw new Error(`the stage canvas never appeared at ${url}`);
  if (!ready.game) {
    const error = new Error(GAME_MISSING);
    error.fatal = true;
    throw error;
  }
  await chrome.evaluate(probe("await frame(); return true;"));
}

async function runStep(run, chrome, id, label, fn) {
  const record = { step: id, label, ok: true, checks: [], screenshots: [], errors: [] };
  const check = (ok, message) => {
    record.checks.push({ ok: Boolean(ok), message });
    if (!ok) record.ok = false;
  };
  const shot = async (suffix = "") => {
    const name = `${run.prefix}-${id}${suffix}.png`;
    const data = await chrome.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUT}${name}`, Buffer.from(data.data, "base64"));
    record.screenshots.push(`tools/out/${name}`);
  };
  try {
    await fn({ check, shot });
  } catch (error) {
    record.ok = false;
    record.checks.push({ ok: false, message: `threw: ${error.message}` });
    if (error.fatal) record.fatal = true;
  }
  record.errors = drainErrors(chrome);
  if (record.errors.length) record.ok = false;
  run.steps.push(record);
  if (!record.ok) run.ok = false;
  return record;
}

const stepIdle = (palette) => async ({ check, shot }, chrome, run) => {
  const r = await chrome.evaluate(
    probe(`
      await frame();
      const cell = readPixels();
      const s = snap();
      const hooks = ["stage", "hint", "live", "creel", "creel-count", "theme", "mute", "menu"];
      const present = Object.fromEntries(hooks.map((h) => [h, Boolean(document.querySelector('[data-ui="' + h + '"]'))]));
      return {
        geometry,
        state: s.state,
        theme: s.theme,
        showTitle: s.showTitle,
        hint: text('[data-ui="hint"]'),
        title: text('[data-ui="title"]'),
        hintRect: rectOf('[data-ui="hint"]'),
        present,
        top: tally(cell, 0, gridW - 1, 0, 2),
        near: tally(cell, 0, gridW - 1, nearRow - 2, nearRow),
        hands: tally(cell, grip.x - 7, grip.x + 7, grip.y - 6, grip.y + 6),
        skyBand: tally(cell, Math.floor(gridW * 0.25), Math.ceil(gridW * 0.75), 0, 19),
      };
    `),
  );
  run.geometry = r.geometry;
  run.skyBaseline = outside(r.skyBand, [...palette.skyStops, palette.star, palette.moon, palette.cloud, palette.horizon]);
  check(r.state === "idle", `state is idle (got ${r.state})`);
  check(r.theme === run.theme, `snapshot theme is ${run.theme} (got ${r.theme})`);
  check(r.showTitle === true, `title shown on first load (showTitle=${r.showTitle}, title text "${r.title ?? ""}")`);
  const missing = Object.entries(r.present).filter(([, v]) => !v).map(([k]) => k);
  check(missing.length === 0, `hud hooks present${missing.length ? `, missing: ${missing.join(", ")}` : ""}`);
  const skyShare = share(r.top, palette.skyStops);
  check(skyShare >= 0.8, `top rows are sky stops (${pct(skyShare)}; ${top(r.top)})`);
  const w4Share = share(r.near, [palette.w4]);
  check(w4Share >= 0.5, `near water rows are w4 ${palette.w4} (${pct(w4Share)}; ${top(r.near)})`);
  const skin = count(r.hands, palette.skin);
  check(skin >= 1, `hands region contains skin ${palette.skin} (${skin} cells; ${top(r.hands)})`);
  check(r.hint && r.hint.length > 0, `hint has text ("${r.hint ?? ""}")`);
  check(r.hintRect && r.hintRect.inside, `hint is inside the viewport (${JSON.stringify(r.hintRect)})`);
  await shot();
};

const stepCast = (palette) => async ({ check, shot }, chrome) => {
  const charge = await chrome.evaluate(
    probe(`
      game.press();
      game.tick(400);
      const held = snap();
      await frame();
      const cell = readPixels();
      return {
        state: held.state,
        power: held.power,
        rendered: snap().state,
        meter: tally(cell, grip.x - 24, grip.x - 7, grip.y - 50, grip.y + 8),
      };
    `),
  );
  check(charge.state === "charge", `press starts charge (got ${charge.state}, power ${charge.power})`);
  const meterCells = count(charge.meter, palette.accent);
  check(meterCells >= 6, `power meter accent fill left of the hands, inside the viewport (${meterCells} cells; ${top(charge.meter)})`);
  await shot("-charge");
  const flight = await chrome.evaluate(
    probe(`
      game.release();
      const seen = [snap().state];
      const started = performance.now();
      while (performance.now() - started < 2000) {
        await pause(10);
        const s = snap().state;
        if (seen[seen.length - 1] !== s) seen.push(s);
        if (s === "wait") break;
      }
      await frame();
      const s = snap();
      const wp = waterPoint(s.bobber.ax, s.bobber.d);
      const cell = readPixels();
      return {
        seen,
        state: s.state,
        bobber: s.bobber,
        showTitle: s.showTitle,
        waterPoint: wp,
        around: tally(cell, wp.x - 8, wp.x + 8, wp.y - 14, wp.y + 4),
        live: text('[data-ui="live"]'),
        hint: text('[data-ui="hint"]'),
      };
    `),
  );
  check(flight.seen.includes("cast"), `release enters cast (states seen: ${flight.seen.join(" > ")})`);
  check(flight.state === "wait", `wait reached within 2 s of wall time (got ${flight.state})`);
  check(flight.bobber.mode === "floating" || flight.bobber.mode === "dipped", `bobber floats (mode ${flight.bobber.mode}, ax ${flight.bobber.ax.toFixed(2)}, d ${flight.bobber.d.toFixed(2)})`);
  const accent = count(flight.around, palette.accent);
  check(accent >= 1, `bobber accent ${palette.accent} near the water point (${flight.waterPoint.x},${flight.waterPoint.y}) (${accent} cells; ${top(flight.around)})`);
  check(flight.showTitle === false, `title fades on the first cast (showTitle=${flight.showTitle})`);
  await shot();
};

const stepBite = (palette) => async ({ check, shot }, chrome, run) => {
  const bite = await chrome.evaluate(
    probe(`
      game.goto("bite", "bite");
      const s = snap();
      await frame();
      return { state: s.state, bobber: s.bobber, hint: text('[data-ui="hint"]'), rendered: snap().state };
    `),
  );
  check(bite.state === "bite", `goto bite enters bite (got ${bite.state})`);
  check(bite.bobber.mode === "under", `bobber is under on the bite (mode ${bite.bobber.mode})`);
  await shot("-bite");
  const fight = await chrome.evaluate(
    probe(`
      game.goto("bite", "bite");
      game.press();
      const s = snap();
      await frame();
      const cell = readPixels();
      return {
        state: s.state,
        tension: s.tension,
        species: s.species,
        hint: text('[data-ui="hint"]'),
        skyBand: tally(cell, Math.floor(gridW * 0.25), Math.ceil(gridW * 0.75), 0, 19),
      };
    `),
  );
  check(fight.state === "fight", `press inside the hook window enters fight (got ${fight.state})`);
  check(typeof fight.tension === "number", `tension is set in the fight (${fight.tension})`);
  const meter = outside(fight.skyBand, [...palette.skyStops, palette.star, palette.moon, palette.cloud, palette.horizon]) - (run.skyBaseline ?? 0);
  const need = Math.round(run.geometry.gridW * 0.15);
  check(meter >= need, `tension meter painted top centre, inside the viewport (${meter} new non-sky cells, need ${need})`);
  await shot();
};

const stepLand = () => async ({ check, shot }, chrome) => {
  const held = await chrome.evaluate(
    probe(`
      game.press();
      const done = stepUntil((s) => s.state === "landed" || s.state === "lost", 20000, 50);
      game.release();
      await frame();
      return { state: done.snap.state, elapsed: done.elapsed, toast: done.snap.toast, species: done.snap.species, lineOut: done.snap.lineOut, tension: done.snap.tension };
    `),
  );
  check(held.state === "landed" || held.state === "lost", `holding the reel for 20 s ends in landed or lost (got ${held.state} after ${held.elapsed} ms, toast ${JSON.stringify(held.toast)})`);
  await shot("-fight");
  const card = await chrome.evaluate(
    probe(`
      game.goto("landed", "landed");
      const started = performance.now();
      let s = snap();
      let el = null;
      while (performance.now() - started < 3000) {
        s = snap();
        el = document.querySelector('[data-ui="card"]');
        if (s.card && el && (text('[data-ui="card-species"]') ?? "").length > 0) break;
        await pause(20);
      }
      await frame();
      const r = el ? el.getBoundingClientRect() : null;
      return {
        state: s.state,
        card: s.card,
        inDom: Boolean(el),
        visible: r ? r.width > 0 && r.height > 0 : false,
        species: text('[data-ui="card-species"]'),
        lb: text('[data-ui="card-lb"]'),
        yards: text('[data-ui="card-yards"]'),
        keep: Boolean(document.querySelector('[data-ui="card"] [data-action="keep"]')),
        letGo: Boolean(document.querySelector('[data-ui="card"] [data-action="let-go"]')),
      };
    `),
  );
  check(card.state === "landed", `goto landed enters landed (got ${card.state})`);
  check(card.card && card.card.species === "bass", `snapshot card is a bass (${JSON.stringify(card.card)})`);
  check(card.inDom && card.visible, "card is in the DOM and visible");
  check(card.species && /bass/i.test(card.species), `card species reads bass (got "${card.species}")`);
  check(card.lb && /4\.2/.test(card.lb), `card weight reads 4.2 lb (got "${card.lb}")`);
  check(card.keep && card.letGo, `card has keep and let-go buttons (keep ${card.keep}, let-go ${card.letGo})`);
  await shot();
  const kept = await chrome.evaluate(
    probe(`
      const button = document.querySelector('[data-ui="card"] [data-action="keep"]');
      if (!button) return { clicked: false };
      button.click();
      const started = performance.now();
      let creel = null;
      let saved = null;
      let s = snap();
      while (performance.now() - started < 2000) {
        await pause(20);
        s = snap();
        creel = text('[data-ui="creel-count"]');
        try { saved = JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)})); } catch { saved = null; }
        if (creel === "1" && saved && Array.isArray(saved.catches) && saved.catches.length === 1 && s.state === "idle") break;
      }
      await frame();
      return { clicked: true, state: s.state, creelCount: s.creelCount, creel, saved, live: text('[data-ui="live"]') };
    `),
  );
  check(kept.clicked, "keep button clicked");
  check(kept.state === "idle", `keep returns to idle (got ${kept.state})`);
  const catches = kept.saved && Array.isArray(kept.saved.catches) ? kept.saved.catches : null;
  check(catches && catches.length === 1, `localStorage ${SAVE_KEY} holds one catch (got ${catches ? catches.length : "no save"})`);
  check(catches && catches[0] && catches[0].species === "bass", `the saved catch is a bass (${JSON.stringify(catches && catches[0])})`);
  check(kept.saved && kept.saved.version === 1 && kept.saved.best && kept.saved.best.bass === 4.2, `save has version 1 and best.bass 4.2 (best ${JSON.stringify(kept.saved && kept.saved.best)})`);
  check(kept.creel === "1", `creel pill reads 1 (got "${kept.creel}", snapshot creelCount ${kept.creelCount})`);
  await shot("-kept");
};

const stepSnap = () => async ({ check, shot }, chrome) => {
  const r = await chrome.evaluate(
    probe(`
      game.goto("fight", "fightSnap");
      const entered = snap();
      const lost = stepUntil((s) => s.state === "lost", 5000, 25);
      const toast = stepUntil((s) => s.state !== "lost" || Boolean(s.toast), 3000, 25);
      await frame();
      return {
        entered: entered.state,
        tension: entered.tension,
        lost: lost.snap.state,
        lostAfter: lost.elapsed,
        toast: toast.snap.toast,
        toastState: toast.snap.state,
        domToast: text('[data-ui="toast"]'),
        hint: text('[data-ui="hint"]'),
        live: text('[data-ui="live"]'),
      };
    `),
  );
  check(r.entered === "fight", `goto fightSnap enters fight (got ${r.entered}, tension ${r.tension})`);
  check(r.lost === "lost", `pinned tension snaps the line into lost (got ${r.lost} after ${r.lostAfter} ms)`);
  check(r.toast && /snapped/i.test(r.toast), `snap message shown (toast ${JSON.stringify(r.toast)}, dom toast ${JSON.stringify(r.domToast)}, live ${JSON.stringify(r.live)})`);
  await shot();
};

const stepReduced = () => async ({ check, shot }, chrome, run) => {
  await chrome.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await openGame(chrome, run);
  const r = await chrome.evaluate(
    probe(`
      await frame();
      const matches = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const first = snap();
      const a = canvas.toDataURL();
      await pause(500);
      await frame();
      const second = snap();
      const b = canvas.toDataURL();
      return { matches, reduced: first.reduced, states: [first.state, second.state], identical: a === b, bytes: a.length };
    `),
  );
  check(r.matches, "prefers-reduced-motion is emulated");
  check(r.reduced === true, `snapshot reports reduced motion (reduced=${r.reduced})`);
  check(r.states[0] === "idle" && r.states[1] === "idle", `both frames are idle (${r.states.join(", ")})`);
  check(r.identical, `two idle frames 500 ms apart are identical (${r.bytes} bytes of canvas data)`);
  await shot();
  await chrome.send("Emulation.setEmulatedMedia", { features: [] });
};

async function runSuite(size, theme, palette, steps) {
  const run = {
    name: `${size.name}-${theme}`,
    theme,
    viewport: [size.width, size.height],
    prefix: size.name === "desktop" ? theme : `${theme}-${size.name}`,
    ok: true,
    steps: [],
  };
  const chrome = await launchChrome({ port: CDP_PORT, width: size.width, height: size.height });
  active.chrome = chrome;
  try {
    await chrome.send("Page.enable");
    await chrome.send("Runtime.enable");
    await chrome.send("Log.enable");
    await chrome.send("Network.enable");
    await chrome.send("Emulation.setDeviceMetricsOverride", {
      width: size.width,
      height: size.height,
      deviceScaleFactor: 1,
      mobile: size.width < 720,
    });
    const opened = await runStep(run, chrome, 0, "open /?debug=1 and wait for window.game", async () => {
      await openGame(chrome, run);
    });
    if (opened.fatal) return run;
    if (!opened.ok) return run;
    for (const [id, label, fn] of steps) {
      await runStep(run, chrome, id, label, (tools) => fn(tools, chrome, run));
    }
  } finally {
    active.chrome = null;
    await chrome.close();
  }
  return run;
}

const active = { chrome: null, preview: null };
async function cleanup() {
  if (active.chrome) {
    const chrome = active.chrome;
    active.chrome = null;
    await chrome.close().catch(() => undefined);
  }
  if (active.preview) {
    active.preview.stop();
    active.preview = null;
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    cleanup().finally(() => process.exit(1));
  });
}

const watchdog = setTimeout(() => {
  console.error(`drive timed out after ${WATCHDOG_MS / 1000} s`);
  cleanup().finally(() => process.exit(1));
}, WATCHDOG_MS);

const summary = { ok: false, baseUrl: BASE_URL, seed: SEED, speed: SPEED, runs: [], failures: [] };
let exitCode = 1;
try {
  mkdirSync(OUT, { recursive: true });
  if (!process.env.BASE_URL && !existsSync(`${ROOT}dist/index.html`)) {
    throw new Error("dist/index.html is missing: run vite build before node tools/drive.mjs");
  }
  const palettes = readPalettes();
  if (!process.env.BASE_URL) {
    active.preview = startPreview(PREVIEW_PORT);
    await active.preview.ready;
  }

  const plan = [
    { size: DESKTOP, full: true },
    { size: PHONE, full: false },
  ];
  let fatal = false;
  for (const { size, full } of plan) {
    for (const theme of THEMES) {
      if (fatal) break;
      const palette = palettes[theme];
      const steps = [
        [1, "idle: sky stops, w4 water, skin on the hands", stepIdle(palette)],
        [2, "press, 400 ms, release: cast then wait, bobber accent on the water", stepCast(palette)],
        [3, "goto bite, press: fight", stepBite(palette)],
        [4, "hold 20 s: landed or lost; goto landed, keep, one catch saved", stepLand()],
        [5, "goto fightSnap: lost with the snap message", stepSnap()],
      ];
      if (full) steps.push([6, "reduced motion: two idle frames identical", stepReduced()]);
      const run = await runSuite(size, theme, palette, steps);
      summary.runs.push(run);
      if (run.steps.some((s) => s.fatal)) fatal = true;
    }
  }

  for (const run of summary.runs) {
    for (const step of run.steps) {
      for (const c of step.checks) if (!c.ok) summary.failures.push(`${run.name} step ${step.step}: ${c.message}`);
      for (const e of step.errors) summary.failures.push(`${run.name} step ${step.step}: ${e}`);
    }
  }
  summary.ok = summary.failures.length === 0 && summary.runs.length === 4;
  exitCode = summary.ok ? 0 : 1;
} catch (error) {
  summary.failures.push(error.message);
  exitCode = 1;
} finally {
  clearTimeout(watchdog);
  await cleanup();
}

console.log(JSON.stringify(summary, null, 2));
process.exit(exitCode);
