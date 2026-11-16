// The ten levels of STARSLING. Coordinates are in the 1280x720 field. A body bends the comet
// with mu (its gravity strength); a hole is a black hole that swallows the comet inside kill.
// `solution` is the launch the Hint button shows and the screenshots fly: angle in degrees
// (0 = east, 90 = south, screen coordinates) and speed in px/s. Every solution is verified by
// scripts/solve-test.mjs (kept out of the shipped game) before a level ships.
export const LEVELS = [
  {
    name: 'First Light', sub: 'Drag back from the pad, release to fly.',
    pad: { x: 150, y: 580 }, gate: { x: 1120, y: 160 },
    bodies: [],
    mines: [],
    shards: [{ x: 640, y: 360 }, { x: 900, y: 300 }],
    launches: 3, par: 1, solution: [{ angle: 338.0, speed: 604, wait: 0.00 }],
  },
  {
    name: 'Gentle Curve', sub: 'Let the planet bend your path.',
    pad: { x: 150, y: 600 }, gate: { x: 1130, y: 140 },
    bodies: [{ x: 640, y: 360, r: 55, mu: 3500000, kind: 'planet', hue: 265 }],
    mines: [],
    shards: [{ x: 640, y: 200 }, { x: 950, y: 420 }],
    launches: 3, par: 2, solution: [{ angle: 291.8, speed: 91, wait: 0.00 }, { angle: 342.0, speed: 616, wait: 12.68 }],
  },
  {
    name: 'Twin Suns', sub: 'Two pulls, one thread between them.',
    pad: { x: 140, y: 620 }, gate: { x: 1140, y: 120 },
    bodies: [
      { x: 500, y: 280, r: 48, mu: 3000000, kind: 'planet', hue: 200 },
      { x: 800, y: 460, r: 48, mu: 3000000, kind: 'planet', hue: 20 },
    ],
    mines: [],
    shards: [{ x: 650, y: 360 }, { x: 950, y: 240 }, { x: 400, y: 500 }],
    launches: 3, par: 2, solution: [{ angle: 336.0, speed: 508, wait: 0.00 }],
  },
  {
    name: 'Minefield', sub: 'The mines guard the gate. Go around.',
    pad: { x: 150, y: 600 }, gate: { x: 1130, y: 360 },
    bodies: [{ x: 620, y: 380, r: 60, mu: 4000000, kind: 'planet', hue: 150 }],
    mines: [{ x: 850, y: 300 }, { x: 950, y: 430 }, { x: 780, y: 520 }],
    shards: [{ x: 620, y: 220 }, { x: 900, y: 180 }, { x: 1050, y: 520 }],
    launches: 3, par: 2, solution: [{ angle: 302.2, speed: 145, wait: 0.00 }, { angle: 22.0, speed: 136, wait: 8.90 }],
  },
  {
    name: 'Black Hole Waltz', sub: 'Skim the dark. Never touch it.',
    pad: { x: 150, y: 360 }, gate: { x: 1130, y: 360 },
    bodies: [{ x: 640, y: 360, r: 24, mu: 11000000, kind: 'hole', kill: 32 }],
    mines: [],
    shards: [{ x: 640, y: 140 }, { x: 640, y: 580 }, { x: 950, y: 360 }],
    launches: 3, par: 2, solution: [{ angle: 36.2, speed: 229, wait: 0.00 }, { angle: 326.0, speed: 256, wait: 6.23 }],
  },
  {
    name: 'Moving Target', sub: 'The planet wanders. Time your launch.',
    pad: { x: 150, y: 600 }, gate: { x: 1140, y: 140 },
    bodies: [{
      x: 780, y: 360, r: 50, mu: 3500000, kind: 'planet', hue: 280,
      orbit: { cx: 640, cy: 360, radius: 140, speed: 0.5, phase: 0 },
    }],
    mines: [],
    shards: [{ x: 640, y: 180 }, { x: 900, y: 500 }],
    launches: 4, par: 2, solution: [{ angle: 299.4, speed: 212, wait: 3.74 }, { angle: 332.0, speed: 616, wait: 23.74 }],
  },
  {
    name: 'Crosswinds', sub: 'Two pulls in opposite directions.',
    pad: { x: 140, y: 140 }, gate: { x: 1140, y: 600 },
    bodies: [
      { x: 450, y: 220, r: 52, mu: 4000000, kind: 'planet', hue: 200 },
      { x: 830, y: 500, r: 52, mu: 4000000, kind: 'planet', hue: 340 },
    ],
    mines: [{ x: 640, y: 360 }, { x: 640, y: 470 }],
    shards: [{ x: 500, y: 480 }, { x: 820, y: 220 }, { x: 1080, y: 300 }],
    launches: 3, par: 3, solution: [{ angle: 343.0, speed: 269, wait: 0.00 }, { angle: 52.0, speed: 304, wait: 5.28 }],
  },
  {
    name: 'The Gauntlet', sub: 'Three planets, one corridor.',
    pad: { x: 130, y: 360 }, gate: { x: 1150, y: 360 },
    bodies: [
      { x: 420, y: 360, r: 46, mu: 3000000, kind: 'planet', hue: 210 },
      { x: 640, y: 300, r: 46, mu: 3000000, kind: 'planet', hue: 30 },
      { x: 860, y: 380, r: 46, mu: 3000000, kind: 'planet', hue: 160 },
    ],
    mines: [],
    shards: [{ x: 420, y: 180 }, { x: 640, y: 520 }, { x: 860, y: 180 }, { x: 1050, y: 520 }],
    launches: 4, par: 3, solution: [{ angle: 309.2, speed: 194, wait: 0.00 }, { angle: 26.0, speed: 352, wait: 7.17 }],
  },
  {
    name: 'Event Horizon', sub: 'Everything falls toward the middle.',
    pad: { x: 130, y: 600 }, gate: { x: 1150, y: 120 },
    bodies: [
      { x: 640, y: 360, r: 24, mu: 13000000, kind: 'hole', kill: 32 },
      { x: 400, y: 180, r: 40, mu: 2500000, kind: 'planet', hue: 190 },
      { x: 880, y: 540, r: 40, mu: 2500000, kind: 'planet', hue: 45 },
    ],
    mines: [{ x: 640, y: 220 }, { x: 640, y: 500 }],
    shards: [{ x: 300, y: 540 }, { x: 980, y: 180 }, { x: 1150, y: 520 }],
    launches: 4, par: 3, solution: [{ angle: 347.4, speed: 616, wait: 0.00 }, { angle: 288.2, speed: 122, wait: 2.65 }, { angle: 348.0, speed: 616, wait: 15.05 }],
  },
  {
    name: 'Homecoming', sub: 'Everything you learned, at once.',
    pad: { x: 130, y: 120 }, gate: { x: 1150, y: 640 },
    bodies: [
      { x: 640, y: 360, r: 24, mu: 10000000, kind: 'hole', kill: 32 },
      {
        x: 840, y: 360, r: 46, mu: 3000000, kind: 'planet', hue: 280,
        orbit: { cx: 640, cy: 360, radius: 235, speed: 0.35, phase: 0 },
      },
      { x: 950, y: 180, r: 44, mu: 3000000, kind: 'planet', hue: 170 },
    ],
    mines: [{ x: 500, y: 520 }, { x: 820, y: 480 }, { x: 1080, y: 360 }],
    shards: [
      { x: 300, y: 200 }, { x: 640, y: 140 }, { x: 950, y: 360 },
      { x: 1150, y: 300 }, { x: 500, y: 600 },
    ],
    launches: 5, par: 4, solution: [{ angle: 293.4, speed: 87, wait: 5.51 }, { angle: 328.0, speed: 208, wait: 23.51 }],
  },
];
