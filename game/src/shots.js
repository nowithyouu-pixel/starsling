// The screenshot scenes behind ?shot=title|play|clear|win. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_CRASH, EVENT_LOST, EVENT_TIMEOUT } from './physics.js';
import { SCREEN_CLEAR, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, SCREEN_FAILED } from './render.js';
import { WORLD_CLEAR } from './world.js';

const TITLE_SECONDS = 2.6;
const PLAY_SECONDS = 1.15;

/** Step the world forward `seconds` in fixed steps, stopping early when a flight ends. */
function stepFor(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const events = world.step(STEP);
    if (events & (WORLD_CLEAR | EVENT_CRASH | EVENT_LOST | EVENT_TIMEOUT)) break;
    if (world.status !== 'flying' && world.status !== 'aim') break;
  }
}

/** Fly a whole verified plan until the level clears (or the plan runs out). Each launch waits
 * for its verified time first: orbiting planets are only where the plan expects them then. */
function flyPlan(world) {
  const plan = world.level.solution ?? [];
  for (const step of plan) {
    if (world.status === 'clear') break;
    if (world.status !== 'aim') break;
    while (world.time < (step.wait ?? 0)) world.step(STEP);
    world.launch(step.angle, step.speed);
    const steps = Math.round(15 / STEP);
    for (let i = 0; i < steps; i += 1) {
      const events = world.step(STEP);
      if (events & (WORLD_CLEAR | EVENT_CRASH | EVENT_LOST | EVENT_TIMEOUT)) break;
    }
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any unknown name stages the title.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    // Twin Suns, mid-flight: two planets, three shards, a full trail behind the comet.
    world.loadLevel(2);
    const sol = world.level.solution[0];
    world.launch(sol.angle, sol.speed);
    stepFor(world, PLAY_SECONDS);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'clear') {
    // First Light, flown to the gate: the level-clear panel with its stars and score.
    world.loadLevel(0);
    flyPlan(world);
    return { screen: world.status === 'clear' ? SCREEN_CLEAR : SCREEN_FAILED };
  }
  if (name === 'win') {
    // Homecoming, flown to the gate, as a player who finished all ten levels sees it:
    // every level's stars and the summed total, staged from the real clear.
    world.loadLevel(9);
    flyPlan(world);
    if (world.status === 'clear') {
      for (let i = 0; i < world.levelCount; i += 1) world.stars[String(i)] = 3;
      world.totalScore = 12480;
      world.best = 12480;
    }
    return { screen: world.status === 'clear' ? SCREEN_WIN : SCREEN_FAILED };
  }
  // Title: the attract comet loops First Light's verified flight behind the level grid.
  world.startAttract();
  stepFor(world, TITLE_SECONDS);
  return { screen: SCREEN_TITLE };
}
