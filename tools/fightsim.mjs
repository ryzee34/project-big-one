import { readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const TUNING_FILE = "src/game/tuning.ts";
const SPECIES_FILE = "src/game/species.ts";
const SPECIES_FIELDS = ["pull", "runRate", "runSpeed", "runLength", "stamina"];
const TUNING_NAMES = {
  tensionStart: "FIGHT_TENSION_START",
  pullFloor: "FIGHT_PULL_FLOOR",
  pullSpan: "FIGHT_PULL_SPAN",
  runLengthMin: "RUN_LENGTH_MIN",
  runLengthMax: "RUN_LENGTH_MAX",
  lineMax: "CAST_D_MAX",
  reelLineRate: "REEL_LINE_RATE",
  reelTensionDrag: "REEL_TENSION_DRAG",
  reelTensionRate: "REEL_TENSION_RATE",
  reelStaminaDrain: "REEL_STAMINA_DRAIN",
  restTensionRate: "REST_TENSION_RATE",
  staminaDrainRunning: "STAMINA_DRAIN_RUNNING",
  staminaDrainIdle: "STAMINA_DRAIN_IDLE",
  snapHoldS: "SNAP_HOLD_S",
  slackTension: "SLACK_TENSION",
  slackHoldS: "SLACK_HOLD_S",
  holdReelSpeed: "HOLD_REEL_SPEED",
  reelIdleSpeed: "REEL_IDLE_SPEED",
  crankFullRps: "CRANK_FULL_RPS",
  crankDecayS: "CRANK_DECAY_S",
};

const NUMBER = "(-?[0-9]+(?:\\.[0-9]+)?)";

function readTuning() {
  const source = readFileSync(`${ROOT}${TUNING_FILE}`, "utf8");
  const tuning = {};
  for (const [key, name] of Object.entries(TUNING_NAMES)) {
    const match = source.match(new RegExp(`export const ${name} = ${NUMBER};`));
    if (!match) throw new Error(`could not find ${name} in ${TUNING_FILE}`);
    tuning[key] = Number(match[1]);
  }
  return tuning;
}

function readSpecies() {
  const source = readFileSync(`${ROOT}${SPECIES_FILE}`, "utf8");
  const species = {};
  for (const block of source.split(/\n {2}\{\n/).slice(1)) {
    const id = block.match(/id: "(\w+)"/);
    if (!id) continue;
    const entry = {};
    for (const field of SPECIES_FIELDS) {
      const match = block.match(new RegExp(`\\n {4}${field}: ${NUMBER},`));
      if (!match) throw new Error(`could not find ${field} for ${id[1]} in ${SPECIES_FILE}`);
      entry[field] = Number(match[1]);
    }
    species[id[1]] = entry;
  }
  if (Object.keys(species).length === 0) throw new Error(`no species blocks found in ${SPECIES_FILE}`);
  return species;
}

const TUNING = readTuning();
const SPECIES = readSpecies();

const STEP_S = 1 / 120;
const MAX_FIGHT_S = 600;
const FIGHTS = 300;
const START_D = 0.7;
const MARLIN_START_D = 1;
const REST_ABOVE_TENSION = 0.3;
const SWEEP_THRESHOLDS = [0.3, 0.4, 0.5, 0.6];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(species, d, next, policy) {
  const f = {
    lineOut: d,
    tension: TUNING.tensionStart,
    stamina: species.stamina,
    running: false,
    runLeft: 0,
    snapTimer: 0,
    slackTimer: 0,
    reel: 0,
  };
  let rate = 0;
  let t = 0;
  while (t < MAX_FIGHT_S) {
    const input = policy(f);
    rate += (input.rps * STEP_S) / TUNING.crankDecayS;
    rate *= Math.exp(-STEP_S / TUNING.crankDecayS);
    const reel = Math.max(input.hold ? TUNING.holdReelSpeed : 0, clamp(rate / TUNING.crankFullRps, 0, 1));
    f.reel = reel;
    const vigour = clamp(f.stamina, 0, 1);
    const pull = species.pull * (TUNING.pullFloor + TUNING.pullSpan * vigour);
    if (!f.running && next() < species.runRate * vigour * STEP_S) {
      f.running = true;
      f.runLeft = (TUNING.runLengthMin + (TUNING.runLengthMax - TUNING.runLengthMin) * next()) * species.runLength;
      next();
    }
    if (f.running) {
      f.tension += pull * STEP_S;
      f.lineOut = Math.min(TUNING.lineMax, f.lineOut + species.runSpeed * STEP_S);
      f.runLeft -= STEP_S;
      if (f.runLeft <= 0) f.running = false;
    }
    f.lineOut -= TUNING.reelLineRate * reel * (1 - TUNING.reelTensionDrag * f.tension) * STEP_S;
    f.tension += (TUNING.reelTensionRate * reel - TUNING.restTensionRate * (1 - reel)) * STEP_S;
    f.stamina -= TUNING.reelStaminaDrain * reel * STEP_S;
    f.stamina -= (f.running ? TUNING.staminaDrainRunning : TUNING.staminaDrainIdle) * STEP_S;
    f.tension = clamp(f.tension, 0, 1);
    t += STEP_S;
    if (f.lineOut <= 0) return { out: "landed", t };
    f.snapTimer = f.tension >= 1 ? f.snapTimer + STEP_S : 0;
    if (f.snapTimer >= TUNING.snapHoldS) return { out: "snapped", t };
    const idle = reel <= TUNING.reelIdleSpeed;
    f.slackTimer = idle && f.tension <= TUNING.slackTension && f.lineOut > 0 ? f.slackTimer + STEP_S : 0;
    if (f.slackTimer >= TUNING.slackHoldS) return { out: "slack", t };
  }
  return { out: "timeout", t };
}

const HOLD = { rps: 0, hold: true };
const CRANK = { rps: TUNING.crankFullRps, hold: false };
const REST = { rps: 0, hold: false };

const crankWithRests = (threshold) => (f) => (f.running || f.tension > threshold ? REST : CRANK);

const POLICIES = {
  "hold only": () => HOLD,
  "crank with rests": crankWithRests(REST_ABOVE_TENSION),
  "crank straight through": () => CRANK,
};

function tallyFights(species, d, policy) {
  const tally = { landed: 0, snapped: 0, slack: 0, timeout: 0, seconds: 0 };
  for (let i = 1; i <= FIGHTS; i++) {
    const result = simulate(species, d, createRng(i * 7919), policy);
    tally[result.out] += 1;
    tally.seconds += result.t;
  }
  return {
    landed: tally.landed / FIGHTS,
    snapped: tally.snapped / FIGHTS,
    slack: tally.slack / FIGHTS,
    timeout: tally.timeout,
    meanS: tally.seconds / FIGHTS,
  };
}

const startFor = (name) => (name === "marlin" ? MARLIN_START_D : START_D);

function runTable(policies) {
  const rows = [];
  for (const [name, species] of Object.entries(SPECIES)) {
    for (const [policyName, policy] of Object.entries(policies)) {
      rows.push({ species: name, policy: policyName, ...tallyFights(species, startFor(name), policy) });
    }
  }
  return rows;
}

const pct = (v) => `${Math.round(v * 100)}%`.padStart(5);
const pad = (s, n) => String(s).padEnd(n);

function printTable(rows) {
  console.log(`${pad("species", 9)} ${pad("policy", 24)} ${pad("land", 6)} ${pad("snap", 6)} ${pad("slack", 6)} ${pad("mean s", 7)}`);
  for (const row of rows) {
    const timeout = row.timeout ? ` timeout ${row.timeout}` : "";
    console.log(`${pad(row.species, 9)} ${pad(row.policy, 24)} ${pct(row.landed)} ${pct(row.snapped)} ${pct(row.slack)} ${row.meanS.toFixed(1).padStart(7)}${timeout}`);
  }
}

printTable(runTable(POLICIES));

if (process.argv.includes("sweep")) {
  console.log("");
  console.log(`crank with rests, resting above each tension (crank ${TUNING.crankFullRps} rev/s fading over ${TUNING.crankDecayS} s)`);
  const sweep = Object.fromEntries(SWEEP_THRESHOLDS.map((threshold) => [`rest above ${threshold}`, crankWithRests(threshold)]));
  printTable(runTable(sweep));
}
