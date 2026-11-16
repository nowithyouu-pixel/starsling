// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps, and the renderer paints what is there. The game moves between six screens: title,
// play, paused, level clear, out of launches, and victory.
// ?seed=N fixes the decoration. ?shot=title|play|clear|win (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { LAUNCH } from './config.js';
import { createRandom } from './random.js';
import { createWorld, WORLD_CLEAR, WORLD_FAILED } from './world.js';
import { EVENT_CRASH, EVENT_GATE, EVENT_LOST, EVENT_SHARD, EVENT_TIMEOUT } from './physics.js';
import { ACTION_CONFIRM, ACTION_HINT, ACTION_MUTE, ACTION_NEXT, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_CLEAR, SCREEN_FAILED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;
/** A drag only counts as a launch when the pointer pulled this far from the pad. */
const PAD_GRAB = 130;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas);

let screen = SCREEN_TITLE;
let selectedLevel = 0;
let muted = false;
let wasAiming = false;
let dragFromPad = false;

function ui() {
  return {
    muted,
    aiming: input.isAiming() && dragFromPad,
    aim: input.aim(),
    selectedLevel,
  };
}

function announce(message) {
  status.textContent = message;
}

function playLevel(index) {
  world.loadLevel(index);
  selectedLevel = index;
  screen = SCREEN_PLAY;
  announce(`Level ${index + 1}: ${world.level.name}. ${world.level.sub}`);
}

function toTitle() {
  world.startAttract();
  screen = SCREEN_TITLE;
  announce('STARSLING. Choose a level, or press Space to play.');
}

function hitButton(click) {
  if (!click) return false;
  const buttons = renderer.layoutButtons(screen, world, ui());
  for (const b of buttons) {
    if (click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h) {
      return b.id;
    }
  }
  return false;
}

function handleClick(click) {
  const id = hitButton(click);
  if (id === false) return;
  audio.unlock();
  audio.click();
  if (id.startsWith('level-')) {
    const index = Number(id.slice('level-'.length));
    if (index + 1 <= world.unlocked) playLevel(index);
    else audio.denied();
    return;
  }
  if (id === 'hint') {
    world.hint = world.hintLaunch();
    if (!world.hint) audio.denied();
  } else if (id === 'restart' || id === 'retry' || id === 'replay') {
    playLevel(world.levelIndex);
  } else if (id === 'mute') {
    setMuted(!muted);
  } else if (id === 'pause') {
    screen = SCREEN_PAUSED;
    announce('Paused.');
  } else if (id === 'resume') {
    screen = SCREEN_PLAY;
    announce('Playing.');
  } else if (id === 'levels') {
    toTitle();
  } else if (id === 'next') {
    nextLevel();
  } else if (id === 'again') {
    playLevel(0);
  }
}

function nextLevel() {
  if (world.levelIndex + 1 < world.levelCount) playLevel(world.levelIndex + 1);
  else {
    screen = SCREEN_WIN;
    announce(`All levels clear. Total score ${world.totalScore}.`);
  }
}

function setMuted(value) {
  muted = value;
  audio.setMuted(value);
}

function handleActions() {
  const actions = input.takeActions();
  if (actions & ACTION_MUTE) setMuted(!muted);
  if (screen === SCREEN_TITLE) {
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      playLevel(selectedLevel);
    }
    return;
  }
  if (screen === SCREEN_PLAY) {
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & ACTION_RESTART) {
      playLevel(world.levelIndex);
    } else if (actions & ACTION_HINT) {
      world.hint = world.hintLaunch();
      if (!world.hint) audio.denied();
      else audio.click();
    }
    return;
  }
  if (screen === SCREEN_PAUSED) {
    if (actions & ACTION_PAUSE || actions & ACTION_CONFIRM) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (actions & ACTION_RESTART) {
      playLevel(world.levelIndex);
    }
    return;
  }
  if (screen === SCREEN_CLEAR) {
    if (actions & (ACTION_CONFIRM | ACTION_NEXT)) nextLevel();
    else if (actions & ACTION_RESTART) playLevel(world.levelIndex);
    return;
  }
  if (screen === SCREEN_FAILED) {
    if (actions & ACTION_CONFIRM) playLevel(world.levelIndex);
    return;
  }
  if (screen === SCREEN_WIN) {
    if (actions & ACTION_CONFIRM) playLevel(0);
  }
}

function handleDragRelease() {
  if (!wasAiming || input.isAiming()) return;
  wasAiming = false;
  if (screen !== SCREEN_PLAY || world.status !== 'aim' || !dragFromPad) {
    dragFromPad = false;
    return;
  }
  dragFromPad = false;
  const aim = world.aimFromDrag(input.aim());
  if (aim.len < LAUNCH.minDrag) return;
  audio.unlock();
  if (world.launch(aim.angle, aim.speed)) {
    audio.launch();
    announce('Launched.');
  }
}

function handleEvents(events) {
  if (events & EVENT_SHARD) {
    audio.shard();
    announce(`Shard ${world.got.size} of ${world.level.shards.length}.`);
  }
  if (events & EVENT_CRASH) {
    audio.crash();
    announce(world.launchesLeft > 0 ? `Crashed. ${world.launchesLeft} launch${world.launchesLeft === 1 ? '' : 'es'} left.` : 'Crashed. No launches left.');
  } else if (events & (EVENT_LOST | EVENT_TIMEOUT)) {
    audio.denied();
    announce(world.launchesLeft > 0 ? `Comet lost. ${world.launchesLeft} launch${world.launchesLeft === 1 ? '' : 'es'} left.` : 'Comet lost. No launches left.');
  }
  if (events & EVENT_GATE) audio.gate();
  if (events & WORLD_CLEAR) {
    screen = SCREEN_CLEAR;
    audio.win();
    announce(`Level clear. ${world.starsEarned} stars. Score ${world.levelScore}.`);
    if (world.levelIndex + 1 === world.levelCount) {
      screen = SCREEN_WIN;
      announce(`All levels clear. Total score ${world.totalScore}.`);
    }
  }
  if (events & WORLD_FAILED) {
    screen = SCREEN_FAILED;
    announce(`Out of launches. ${world.got.size} of ${world.level.shards.length} shards.`);
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  screen = scene.screen;
  let painted = 0;
  function paint() {
    renderer.draw(world, screen, ui());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  toTitle();
  let last = performance.now();

  // Arrow keys pick a level on the title screen; digits jump straight to one.
  window.addEventListener('keydown', (event) => {
    if (screen !== SCREEN_TITLE) return;
    if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
      const dir = event.code === 'ArrowRight' ? 1 : -1;
      selectedLevel = (selectedLevel + dir + world.levelCount) % world.levelCount;
      event.preventDefault();
    } else if (/^Digit([1-9])$/.test(event.code)) {
      const n = Number(event.code.slice(5)) - 1;
      if (n < world.levelCount) selectedLevel = n;
      event.preventDefault();
    } else if (event.code === 'Digit0') {
      selectedLevel = 9;
      event.preventDefault();
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    // A drag starts only from the pad, so button taps never launch the comet.
    if (input.isAiming() && !wasAiming && screen === SCREEN_PLAY && world.status === 'aim') {
      const down = input.down();
      dragFromPad = Math.hypot(down.x - world.level.pad.x, down.y - world.level.pad.y) < PAD_GRAB;
      wasAiming = true;
    } else if (input.isAiming()) {
      wasAiming = true;
    }
    handleDragRelease();
    handleClick(input.takeClick());
    handleActions();

    let events = 0;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY || screen === SCREEN_CLEAR || screen === SCREEN_FAILED || screen === SCREEN_WIN) {
      events = world.step(dt);
    }
    handleEvents(events);
    if (screen === SCREEN_PLAY) audio.music(dt);
    renderer.draw(world, screen, ui());
  }

  // Leaving the tab pauses a running game rather than letting the flight run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('STARSLING. Choose a level, or press Space to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
