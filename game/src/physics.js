// The flight model, pure functions over plain data: no DOM, no randomness, so the same code
// runs in the browser and in the Node solver that verifies every level is winnable.
// Screen coordinates: x east, y south, angles in degrees (0 = east, 90 = south).
import { COMET, FIELD, GATE, MINE, SHARD, SOFT2, STEP } from './config.js';

/** Where a body is at sim time `t` (orbiting bodies move on a circle). */
export function bodyAt(body, t) {
  if (!body.orbit) return { x: body.x, y: body.y };
  const a = body.orbit.phase + body.orbit.speed * t;
  return {
    x: body.orbit.cx + Math.cos(a) * body.orbit.radius,
    y: body.orbit.cy + Math.sin(a) * body.orbit.radius,
  };
}

/** Gravity acceleration at (x, y) at time t, from every body of the level. */
export function gravityAt(level, x, y, t) {
  let ax = 0;
  let ay = 0;
  for (const body of level.bodies) {
    const p = bodyAt(body, t);
    const dx = p.x - x;
    const dy = p.y - y;
    const d2 = dx * dx + dy * dy + SOFT2;
    const s = body.mu / (d2 * Math.sqrt(d2));
    ax += dx * s;
    ay += dy * s;
  }
  return { ax, ay };
}

export const EVENT_NONE = 0;
export const EVENT_SHARD = 1;
export const EVENT_CRASH = 2;
export const EVENT_GATE = 4;
export const EVENT_LOST = 8;
export const EVENT_TIMEOUT = 16;

/**
 * Advance one fixed step. `c` is the comet {x, y, vx, vy, flight}; `got` is a Set of shard
 * indexes already collected. Returns an event bitmask. The comet never moves after an event
 * that ends the flight (crash, gate, lost, timeout).
 */
export function stepComet(level, c, got, dt, t) {
  const g = gravityAt(level, c.x, c.y, t);
  c.vx += g.ax * dt;
  c.vy += g.ay * dt;
  c.x += c.vx * dt;
  c.y += c.vy * dt;
  c.flight += dt;

  for (const body of level.bodies) {
    const p = bodyAt(body, t);
    const dx = c.x - p.x;
    const dy = c.y - p.y;
    const d = Math.hypot(dx, dy);
    if (body.kind === 'hole') {
      if (d < (body.kill ?? 30)) return EVENT_CRASH;
    } else if (d < body.r + COMET.radius - 2) {
      return EVENT_CRASH;
    }
  }
  for (const mine of level.mines) {
    if (Math.hypot(c.x - mine.x, c.y - mine.y) < MINE.kill) return EVENT_CRASH;
  }
  let events = EVENT_NONE;
  for (let i = 0; i < level.shards.length; i += 1) {
    if (got.has(i)) continue;
    const s = level.shards[i];
    if (Math.hypot(c.x - s.x, c.y - s.y) < SHARD.collect) {
      got.add(i);
      events |= EVENT_SHARD;
    }
  }
  if (got.size === level.shards.length) {
    if (Math.hypot(c.x - level.gate.x, c.y - level.gate.y) < GATE.win) return events | EVENT_GATE;
  }
  if (c.x < -80 || c.x > FIELD.width + 80 || c.y < -80 || c.y > FIELD.height + 80) return events | EVENT_LOST;
  if (c.flight >= COMET.maxFlight) return events | EVENT_TIMEOUT;
  return events;
}

/**
 * Fly one launch from the pad at `angleDeg`/`speed`, starting at sim time `t0`, for at most
 * `maxTime` seconds. `already` holds shard indexes collected by earlier launches of this level:
 * shards persist across launches, and the gate opens once every shard is collected. Returns
 * { won, shards, got, newShards, reason, flight, path, minGate }.
 */
export function simulate(level, angleDeg, speed, t0 = 0, maxTime = COMET.maxFlight, already = new Set()) {
  const rad = (angleDeg * Math.PI) / 180;
  const c = {
    x: level.pad.x, y: level.pad.y,
    vx: Math.cos(rad) * speed, vy: Math.sin(rad) * speed, flight: 0,
  };
  const got = new Set(already);
  const before = got.size;
  const path = [{ x: c.x, y: c.y }];
  let t = t0;
  let reason = 'timeout';
  let won = false;
  let minGate = Math.hypot(c.x - level.gate.x, c.y - level.gate.y);
  const steps = Math.ceil(maxTime / STEP);
  for (let i = 0; i < steps; i += 1) {
    const events = stepComet(level, c, got, STEP, t);
    t += STEP;
    minGate = Math.min(minGate, Math.hypot(c.x - level.gate.x, c.y - level.gate.y));
    if (i % 4 === 0) path.push({ x: c.x, y: c.y });
    if (events & EVENT_GATE) { won = true; reason = 'gate'; break; }
    if (events & EVENT_CRASH) { reason = 'crash'; break; }
    if (events & EVENT_LOST) { reason = 'lost'; break; }
    if (events & EVENT_TIMEOUT) { reason = 'timeout'; break; }
  }
  return { won, shards: got.size, got: [...got].sort((a, b) => a - b), newShards: got.size - before, reason, flight: c.flight, path, minGate };
}

/**
 * The dotted aim preview: same physics, from an arbitrary position and velocity, for `steps`
 * steps. Stops early on a crash or the gate. Returns the points and what it would hit.
 */
export function previewPath(level, x, y, vx, vy, t0, steps = 300) {
  const c = { x, y, vx, vy, flight: 0 };
  const got = new Set();
  const points = [];
  let t = t0;
  let hit = null;
  for (let i = 0; i < steps; i += 1) {
    const events = stepComet(level, c, got, STEP, t);
    t += STEP;
    if (i % 3 === 0) points.push({ x: c.x, y: c.y, shard: (events & EVENT_SHARD) !== 0 });
    if (events & EVENT_GATE) { hit = 'gate'; break; }
    if (events & EVENT_CRASH) { hit = 'crash'; break; }
    if (events & (EVENT_LOST | EVENT_TIMEOUT)) { hit = 'lost'; break; }
  }
  return { points, hit, shards: got.size };
}
