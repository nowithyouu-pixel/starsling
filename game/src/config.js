// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Slingshot: velocity = drag vector * LAUNCH_SCALE, capped at MAX_SPEED. */
export const LAUNCH = { scale: 2.2, maxSpeed: 620, minDrag: 20, maxDrag: 282 };

export const COMET = { radius: 8, trail: 46, maxFlight: 14 };

/** Gravity softening (px^2 added to r^2) so a comet skimming a planet does not slingshot to infinity. */
export const SOFT2 = 900;

export const SHARD = { radius: 14, collect: 30 };
export const GATE = { radius: 30, win: 46 };
export const MINE = { radius: 15, kill: 24 };

export const SCORE = { shard: 100, clear: 500, unusedLaunch: 250, star3: 300, star2: 150 };

export const PALETTE = {
  bgTop: '#0b1030',
  bgMid: '#131a45',
  bgBottom: '#05060f',
  nebulaA: 'rgba(124, 77, 255, 0.20)',
  nebulaB: 'rgba(0, 229, 255, 0.14)',
  nebulaC: 'rgba(255, 110, 150, 0.13)',
  text: '#eef2ff',
  muted: '#9aa5c8',
  gold: '#ffd54a',
  cyan: '#4de8ff',
  comet: '#ffffff',
  cometGlow: '#7fe7ff',
  gate: '#37f4d2',
  gateLocked: '#5a6480',
  mine: '#ff5470',
  panel: 'rgba(10, 14, 34, 0.88)',
  panelEdge: 'rgba(120, 150, 255, 0.35)',
  button: '#1d2a5e',
  buttonEdge: '#4d6bff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'starsling.best';
export const STARS_KEY = 'starsling.stars';
export const UNLOCK_KEY = 'starsling.unlocked';
