// The game state: which level is loaded, how many launches are left, which shards are
// collected, the comet's flight, the score and the saved progress. The physics lives in
// physics.js; this file only owns the rules around it: shards persist across launches, the
// gate opens once every shard is collected, stars are earned by clearing near par.
import { BEST_KEY, LAUNCH, SCORE, STARS_KEY, STEP, UNLOCK_KEY } from './config.js';
import { LEVELS } from './levels.js';
import { bodyAt, EVENT_CRASH, EVENT_GATE, EVENT_LOST, EVENT_SHARD, EVENT_TIMEOUT, previewPath, simulate, stepComet } from './physics.js';
import { createParticles } from './particles.js';

export const WORLD_CLEAR = 32;
export const WORLD_FAILED = 64;

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

export function createWorld(random) {
  const particles = createParticles();
  const stars = readJson(STARS_KEY, {});
  const savedBest = Number(readJson(BEST_KEY, 0)) || 0;
  let unlocked = Number(readJson(UNLOCK_KEY, 1)) || 1;
  const bestScores = {};

  const world = {
    levelIndex: 0,
    level: LEVELS[0],
    time: 0,
    status: 'aim', // 'aim' | 'flying' | 'clear' | 'failed'
    comet: { x: 0, y: 0, vx: 0, vy: 0, flight: 0 },
    got: new Set(),
    launchesLeft: 3,
    launchesUsed: 0,
    trail: [],
    shake: 0,
    starsEarned: 0,
    levelScore: 0,
    totalScore: 0,
    best: savedBest,
    hint: null, // { angle, speed } shown as a ghost aim, or null
    attract: null, // { path, t } ghost comet looping behind the title screen
    random,
    particles,
    // Starfield and nebula blobs, seeded once so every visit looks the same.
    decoration: null,
  };

  function buildDecoration() {
    const rand = random;
    const starsBg = [];
    for (let layer = 0; layer < 3; layer += 1) {
      const count = [90, 60, 30][layer];
      for (let i = 0; i < count; i += 1) {
        starsBg.push({
          x: rand() * 1280, y: rand() * 720,
          r: 0.6 + rand() * (layer === 2 ? 1.6 : 1.0),
          tw: rand() * Math.PI * 2, sp: 0.5 + rand() * 1.5,
          layer,
        });
      }
    }
    const nebulae = [];
    for (let i = 0; i < 4; i += 1) {
      nebulae.push({ x: rand() * 1280, y: rand() * 720, r: 220 + rand() * 260, hue: [265, 190, 340, 210][i] });
    }
    // Craters per planet, keyed by level/body index at draw time.
    world.decoration = { stars: starsBg, nebulae };
  }
  buildDecoration();

  function recomputeTotal() {
    let total = 0;
    for (const key of Object.keys(bestScores)) total += bestScores[key];
    world.totalScore = total;
    if (total > world.best) {
      world.best = total;
      writeJson(BEST_KEY, total);
    }
  }

  function loadLevel(index) {
    world.levelIndex = index;
    world.level = LEVELS[index];
    world.time = 0;
    world.status = 'aim';
    world.comet = { x: world.level.pad.x, y: world.level.pad.y, vx: 0, vy: 0, flight: 0 };
    world.got = new Set();
    world.launchesLeft = world.level.launches;
    world.launchesUsed = 0;
    world.trail = [];
    world.shake = 0;
    world.starsEarned = 0;
    world.levelScore = 0;
    world.hint = null;
    particles.clear();
  }

  function starsFor(used, par) {
    if (used <= par) return 3;
    if (used <= par + 1) return 2;
    return 1;
  }

  function clearLevel() {
    world.status = 'clear';
    world.starsEarned = starsFor(world.launchesUsed, world.level.par);
    const unused = world.launchesLeft;
    const starBonus = world.starsEarned === 3 ? SCORE.star3 : world.starsEarned === 2 ? SCORE.star2 : 0;
    world.levelScore = world.level.shards.length * SCORE.shard + SCORE.clear + unused * SCORE.unusedLaunch + starBonus;
    const key = String(world.levelIndex);
    bestScores[key] = Math.max(bestScores[key] ?? 0, world.levelScore);
    const prevStars = stars[key] ?? 0;
    if (world.starsEarned > prevStars) {
      stars[key] = world.starsEarned;
      writeJson(STARS_KEY, stars);
    }
    if (world.levelIndex + 1 < LEVELS.length && unlocked < world.levelIndex + 2) {
      unlocked = world.levelIndex + 2;
      writeJson(UNLOCK_KEY, unlocked);
    }
    recomputeTotal();
    particles.burst(world.level.gate.x, world.level.gate.y, 60, 260, 1.2, 3, '#37f4d2');
    particles.burst(world.level.gate.x, world.level.gate.y, 40, 180, 1.0, 2.5, '#ffd54a');
  }

  function failLevel() {
    world.status = 'failed';
    world.shake = 0.5;
  }

  function endFlight(events) {
    if (events & EVENT_GATE) {
      clearLevel();
      return;
    }
    world.launchesLeft -= 1;
    world.comet = { x: world.level.pad.x, y: world.level.pad.y, vx: 0, vy: 0, flight: 0 };
    world.trail = [];
    if (world.launchesLeft <= 0) failLevel();
    else world.status = 'aim';
  }

  // The API is the state object itself (not a copy): the loop reads world.time, world.status
  // and the rest every frame, so every mutation must land on this one object.
  Object.defineProperty(world, 'stars', { get() { return stars; } });
  Object.defineProperty(world, 'unlocked', { get() { return unlocked; } });
  Object.defineProperty(world, 'levelCount', { get() { return LEVELS.length; } });
  world.loadLevel = loadLevel;
  world.startAttract = function startAttract() {
    loadLevel(0);
    const sol = LEVELS[0].solution[0];
    const run = simulate(LEVELS[0], sol.angle, sol.speed, 0, 14);
    world.attract = { path: run.path, t: 0, dur: Math.max(1, run.flight) };
  };
  /** Aim from a drag: pointer pulled back from the pad. Returns { angle, speed, drag }. */
  world.aimFromDrag = function aimFromDrag(pointer) {
    const dx = world.level.pad.x - pointer.x;
    const dy = world.level.pad.y - pointer.y;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, LAUNCH.maxDrag);
    const speed = (clamped / LAUNCH.maxDrag) * LAUNCH.maxSpeed;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { angle, speed, drag: clamped, len };
  };
  world.previewFor = function previewFor(aim) {
    const rad = (aim.angle * Math.PI) / 180;
    return previewPath(
      world.level,
      world.level.pad.x, world.level.pad.y,
      Math.cos(rad) * aim.speed, Math.sin(rad) * aim.speed,
      world.time,
    );
  };
  world.launch = function launch(angle, speed) {
    if (world.status !== 'aim') return false;
    const rad = (angle * Math.PI) / 180;
    world.comet = {
      x: world.level.pad.x, y: world.level.pad.y,
      vx: Math.cos(rad) * speed, vy: Math.sin(rad) * speed, flight: 0,
    };
    world.launchesUsed += 1;
    world.status = 'flying';
    world.trail = [{ x: world.comet.x, y: world.comet.y }];
    world.hint = null;
    particles.puff(world.level.pad.x, world.level.pad.y, '#7fe7ff');
    return true;
  };
  /** The next verified launch that still helps: a new shard, else the gate run. */
  world.hintLaunch = function hintLaunch() {
    const plan = world.level.solution ?? [];
    for (const step of plan) {
      const r = simulate(world.level, step.angle, step.speed, world.time, 14, world.got);
      if (r.won || r.newShards > 0) return { angle: step.angle, speed: step.speed };
    }
    return plan.length ? { angle: plan[0].angle, speed: plan[0].speed } : null;
  };
  world.step = function step(dt) {
    let events = 0;
    world.time += dt;
    if (world.attract) {
      world.attract.t += dt;
      if (world.attract.t > world.attract.dur + 1.2) world.attract.t = 0;
    }
    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt);
    particles.step(dt);
    if (world.status !== 'flying') return events;
    let acc = dt;
    while (acc >= STEP) {
      const ev = stepComet(world.level, world.comet, world.got, STEP, world.time - acc);
      acc -= STEP;
      events |= ev;
      if (ev & EVENT_SHARD) {
        particles.burst(world.comet.x, world.comet.y, 18, 160, 0.7, 2.5, '#ffd54a');
      }
      if (ev & (EVENT_GATE | EVENT_CRASH | EVENT_LOST | EVENT_TIMEOUT)) {
        if (ev & EVENT_CRASH) {
          particles.burst(world.comet.x, world.comet.y, 50, 300, 1.0, 3, '#ff5470');
          particles.burst(world.comet.x, world.comet.y, 30, 200, 0.9, 2.5, '#ffb347');
          world.shake = 0.45;
        }
        endFlight(ev);
        if (world.status === 'clear') events |= WORLD_CLEAR;
        if (world.status === 'failed') events |= WORLD_FAILED;
        break;
      }
      world.trail.push({ x: world.comet.x, y: world.comet.y });
      if (world.trail.length > 46) world.trail.shift();
    }
    return events;
  };
  world.bodyAt = bodyAt;
  return world;
}
