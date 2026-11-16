// All drawing: the field, the bodies, the comet and every screen. One canvas, one fixed
// 1280x720 logical area, scaled by CSS. Everything animated reads world.time, never the wall
// clock, so a screenshot staged from a fixed simulation paints the same frame every time.
import { FIELD, FONT, GATE, LAUNCH, PALETTE, SHARD } from './config.js';
import { LEVELS } from './levels.js';
import { bodyAt } from './physics.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_FAILED = 'failed';
export const SCREEN_WIN = 'win';

/** Deterministic 0..1 hash of two numbers, for craters and sparkles that must not move. */
function hash2(x, y) {
  let h = (Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663)) | 0;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star4(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = rot + (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.32;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function star5(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,213,74,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function text(ctx, str, x, y, size, color, weight = 600, align = 'center') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function createRenderer(canvas) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');

  function drawBackground(world) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.bgTop);
    g.addColorStop(0.55, PALETTE.bgMid);
    g.addColorStop(1, PALETTE.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const t = world.time;
    for (const n of world.decoration.nebulae) {
      const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      ng.addColorStop(0, `hsla(${n.hue}, 90%, 60%, 0.16)`);
      ng.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ng;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    for (const s of world.decoration.stars) {
      const tw = 0.45 + 0.55 * Math.sin(t * s.sp + s.tw);
      ctx.globalAlpha = tw * (s.layer === 0 ? 0.5 : s.layer === 1 ? 0.75 : 1);
      ctx.fillStyle = '#dfe8ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawOrbitPaths(world) {
    ctx.save();
    ctx.setLineDash([4, 10]);
    ctx.strokeStyle = 'rgba(160,180,255,0.25)';
    ctx.lineWidth = 1.5;
    for (const b of world.level.bodies) {
      if (!b.orbit) continue;
      ctx.beginPath();
      ctx.arc(b.orbit.cx, b.orbit.cy, b.orbit.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlanet(b, t) {
    const p = bodyAt(b, t);
    const glow = ctx.createRadialGradient(p.x, p.y, b.r * 0.4, p.x, p.y, b.r * 2.1);
    glow.addColorStop(0, `hsla(${b.hue ?? 220}, 85%, 60%, 0.30)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.r * 2.1, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(p.x - b.r * 0.35, p.y - b.r * 0.4, b.r * 0.1, p.x, p.y, b.r);
    g.addColorStop(0, `hsl(${b.hue ?? 220}, 70%, 72%)`);
    g.addColorStop(0.6, `hsl(${b.hue ?? 220}, 65%, 48%)`);
    g.addColorStop(1, `hsl(${b.hue ?? 220}, 70%, 26%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    // Craters, fixed per planet.
    ctx.fillStyle = `hsla(${b.hue ?? 220}, 60%, 30%, 0.5)`;
    for (let i = 0; i < 4; i += 1) {
      const a = hash2(p.x | 0, i * 7 + 3) * Math.PI * 2;
      const d = hash2(p.y | 0, i * 11 + 5) * b.r * 0.55;
      const cr = b.r * (0.12 + hash2(i, p.x | 0) * 0.14);
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, cr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHole(b, t) {
    const p = bodyAt(b, t);
    const glow = ctx.createRadialGradient(p.x, p.y, b.r, p.x, p.y, b.r * 3.2);
    glow.addColorStop(0, 'rgba(255,150,60,0.35)');
    glow.addColorStop(0.5, 'rgba(255,80,40,0.12)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    // Accretion ring, rotating.
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(t * 0.9);
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 5;
    ctx.setLineDash([26, 14]);
    ctx.beginPath();
    ctx.ellipse(0, 0, b.r * 2.0, b.r * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,100,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawMine(m, t) {
    const pulse = 1 + 0.12 * Math.sin(t * 4 + m.x);
    const glow = ctx.createRadialGradient(m.x, m.y, 2, m.x, m.y, 34 * pulse);
    glow.addColorStop(0, 'rgba(255,84,112,0.4)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 34 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5470';
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i * Math.PI) / 4 + t * 0.4;
      const x1 = m.x + Math.cos(a - 0.22) * 10;
      const y1 = m.y + Math.sin(a - 0.22) * 10;
      const x2 = m.x + Math.cos(a) * 22;
      const y2 = m.y + Math.sin(a) * 22;
      const x3 = m.x + Math.cos(a + 0.22) * 10;
      const y3 = m.y + Math.sin(a + 0.22) * 10;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
    }
    ctx.fill();
    ctx.fillStyle = '#3d0a14';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8ba0';
    ctx.beginPath();
    ctx.arc(m.x - 3, m.y - 3, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShard(s, index, world) {
    if (world.got.has(index)) return;
    const t = world.time;
    const pulse = 1 + 0.18 * Math.sin(t * 3 + index * 1.7);
    const glow = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 34 * pulse);
    glow.addColorStop(0, 'rgba(255,213,74,0.5)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 34 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    star4(ctx, s.x, s.y, SHARD.radius * pulse, t * 0.8 + index);
    ctx.fill();
    ctx.fillStyle = '#fff6c9';
    star4(ctx, s.x, s.y, SHARD.radius * 0.45 * pulse, t * 0.8 + index);
    ctx.fill();
  }

  function drawGate(world) {
    const g = world.level.gate;
    const t = world.time;
    const open = world.got.size === world.level.shards.length;
    const color = open ? PALETTE.gate : PALETTE.gateLocked;
    const glow = ctx.createRadialGradient(g.x, g.y, GATE.radius * 0.4, g.x, g.y, GATE.radius * 2.4);
    glow.addColorStop(0, open ? 'rgba(55,244,210,0.4)' : 'rgba(120,130,170,0.18)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(g.x, g.y, GATE.radius * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(t * (open ? 1.2 : 0.25));
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.setLineDash([18, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, GATE.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.x, g.y, GATE.radius * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    if (!open) {
      // Padlock: the gate waits for every shard.
      ctx.fillStyle = color;
      roundRect(ctx, g.x - 7, g.y - 2, 14, 11, 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(g.x, g.y - 2, 5, Math.PI, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#d8fff4';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 5 + 2 * Math.sin(t * 5), 0, Math.PI * 2);
      ctx.fill();
    }
    text(ctx, open ? 'GATE OPEN' : `GATE · ${world.got.size}/${world.level.shards.length}`, g.x, g.y + GATE.radius + 18, 12, open ? PALETTE.gate : PALETTE.muted, 700);
  }

  function drawPad(world, ui) {
    const pad = world.level.pad;
    const t = world.time;
    ctx.strokeStyle = 'rgba(127,231,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pad.x, pad.y, 26, 0, Math.PI * 2);
    ctx.stroke();
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
    ctx.fillStyle = `rgba(127,231,255,${0.15 + 0.2 * pulse})`;
    ctx.beginPath();
    ctx.arc(pad.x, pad.y, 26, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'LAUNCH', pad.x, pad.y + 42, 12, PALETTE.muted, 700);
    if (world.status === 'aim' && ui.aiming) {
      // The comet is pulled back toward the pointer while aiming.
      const aim = world.aimFromDrag(ui.aim);
      const pull = Math.min(aim.drag, LAUNCH.maxDrag) * 0.35;
      const rad = (aim.angle * Math.PI) / 180;
      const cx = pad.x - Math.cos(rad) * pull;
      const cy = pad.y - Math.sin(rad) * pull;
      ctx.strokeStyle = 'rgba(127,231,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pad.x - 24, pad.y + 6);
      ctx.lineTo(cx, cy);
      ctx.moveTo(pad.x + 24, pad.y + 6);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      drawCometHead(cx, cy, 1);
      // Predicted path, fading dots.
      const preview = world.previewFor(aim);
      for (let i = 0; i < preview.points.length; i += 1) {
        const p = preview.points[i];
        const a = Math.max(0.12, 0.85 - (i / preview.points.length) * 0.75);
        ctx.globalAlpha = a;
        ctx.fillStyle = preview.hit === 'crash' ? '#ff8ba0' : preview.hit === 'gate' ? '#37f4d2' : '#bfe9ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, i % 5 === 0 ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (preview.hit === 'gate') text(ctx, 'ON TARGET — RELEASE!', pad.x, pad.y - 52, 14, PALETTE.gate, 800);
      else if (preview.hit === 'crash') text(ctx, 'THAT PATH CRASHES', pad.x, pad.y - 52, 14, '#ff8ba0', 800);
      text(ctx, `POWER ${Math.round((aim.speed / LAUNCH.maxSpeed) * 100)}%`, pad.x, pad.y + 62, 13, PALETTE.text, 700);
    } else if (world.status === 'aim' && world.hint) {
      // Ghost aim: the Hint button's suggested launch, with its live preview.
      const aim = world.hint;
      const rad = (aim.angle * Math.PI) / 180;
      const cx = pad.x - Math.cos(rad) * 22;
      const cy = pad.y - Math.sin(rad) * 22;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad.x, pad.y);
      ctx.lineTo(pad.x + Math.cos(rad) * 46, pad.y + Math.sin(rad) * 46);
      ctx.stroke();
      ctx.restore();
      drawCometHead(cx, cy, 0.7);
      const preview = world.previewFor(aim);
      for (let i = 0; i < preview.points.length; i += 1) {
        const p = preview.points[i];
        ctx.globalAlpha = Math.max(0.1, 0.6 - (i / preview.points.length) * 0.5);
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      text(ctx, 'HINT — drag this way', pad.x, pad.y - 52, 13, PALETTE.gold, 700);
    } else if (world.status === 'aim') {
      const bob = Math.sin(t * 2) * 4;
      text(ctx, 'Drag back from the pad, release to launch', pad.x, pad.y - 56 + bob, 14, PALETTE.text, 600);
    }
  }

  function drawCometHead(x, y, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const glow = ctx.createRadialGradient(x, y, 1, x, y, 26);
    glow.addColorStop(0, 'rgba(255,255,255,0.9)');
    glow.addColorStop(0.35, 'rgba(127,231,255,0.55)');
    glow.addColorStop(1, 'rgba(127,231,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawComet(world) {
    if (world.status !== 'flying') return;
    const trail = world.trail;
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i += 1) {
        const a = i / trail.length;
        ctx.strokeStyle = `rgba(127,231,255,${(a * 0.75).toFixed(3)})`;
        ctx.lineWidth = 1 + a * 5;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
    }
    drawCometHead(world.comet.x, world.comet.y, 1);
  }

  function drawAttract(world) {
    const at = world.attract;
    if (!at) return;
    const path = at.path;
    const frac = (at.t % (at.dur + 1.2)) / (at.dur + 1.2);
    const idx = Math.min(path.length - 1, Math.floor(frac * path.length));
    for (let i = 1; i <= idx; i += 1) {
      const a = (i / path.length) * 0.6;
      ctx.strokeStyle = `rgba(127,231,255,${a.toFixed(3)})`;
      ctx.lineWidth = 1 + a * 4;
      ctx.beginPath();
      ctx.moveTo(path[i - 1].x, path[i - 1].y);
      ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }
    if (idx > 0) drawCometHead(path[idx].x, path[idx].y, 0.95);
  }

  function drawButton(b, primary = false) {
    ctx.fillStyle = primary ? '#2b3f9e' : PALETTE.button;
    roundRect(ctx, b.x, b.y, b.w, b.h, 9);
    ctx.fill();
    ctx.strokeStyle = primary ? '#7d9bff' : PALETTE.buttonEdge;
    ctx.lineWidth = primary ? 2 : 1.5;
    roundRect(ctx, b.x, b.y, b.w, b.h, 9);
    ctx.stroke();
    text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, b.size ?? 15, PALETTE.text, 700);
  }

  function drawHud(world, ui) {
    ctx.fillStyle = 'rgba(5,8,20,0.55)';
    ctx.fillRect(0, 0, FIELD.width, 52);
    text(ctx, `LEVEL ${world.levelIndex + 1} · ${world.level.name.toUpperCase()}`, 20, 27, 17, PALETTE.text, 800, 'left');
    text(ctx, `PAR ${world.level.par}`, 330, 27, 13, PALETTE.muted, 700, 'left');
    // Shards.
    const sx = 620;
    for (let i = 0; i < world.level.shards.length; i += 1) {
      const x = sx - (world.level.shards.length * 26) / 2 + i * 26 + 13;
      ctx.save();
      ctx.globalAlpha = world.got.has(i) ? 1 : 0.3;
      ctx.fillStyle = PALETTE.gold;
      star4(ctx, x, 26, 9, world.time * 0.8 + i);
      ctx.fill();
      ctx.restore();
    }
    text(ctx, `${world.got.size}/${world.level.shards.length}`, sx + (world.level.shards.length * 26) / 2 + 12, 27, 15, PALETTE.text, 700, 'left');
    // Launches left as comet dots.
    for (let i = 0; i < world.level.launches; i += 1) {
      const x = 812 + i * 20;
      ctx.save();
      ctx.globalAlpha = i < world.launchesLeft ? 1 : 0.25;
      ctx.fillStyle = '#7fe7ff';
      ctx.beginPath();
      ctx.arc(x, 26, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    text(ctx, 'LAUNCHES', 800, 27, 12, PALETTE.muted, 700, 'right');
    text(ctx, `SCORE ${world.totalScore}`, 1260, 27, 15, PALETTE.text, 800, 'right');
    for (const b of hudButtons(ui)) drawButton(b);
  }

  function hudButtons(ui) {
    return [
      { id: 'hint', x: 905, y: 10, w: 52, h: 32, label: 'Hint', size: 13 },
      { id: 'restart', x: 963, y: 10, w: 52, h: 32, label: 'Retry', size: 13 },
      { id: 'mute', x: 1021, y: 10, w: 52, h: 32, label: ui.muted ? 'Muted' : 'Mute', size: 13 },
      { id: 'pause', x: 1079, y: 10, w: 52, h: 32, label: 'Pause', size: 13 },
    ];
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, 16);
    ctx.stroke();
  }

  function levelButton(x, y, w, h, index, world, selected) {
    const locked = index + 1 > world.unlocked;
    const earned = world.stars[String(index)] ?? 0;
    ctx.fillStyle = locked ? 'rgba(20,26,52,0.9)' : selected ? '#2b3f9e' : PALETTE.button;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = selected ? '#7d9bff' : PALETTE.buttonEdge;
    ctx.lineWidth = selected ? 2 : 1;
    roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();
    text(ctx, `${index + 1}`, x + 24, y + h / 2, 20, locked ? PALETTE.muted : PALETTE.text, 800);
    text(ctx, locked ? 'Locked' : LEVELS[index].name, x + 44, y + h / 2 - 8, 13, locked ? PALETTE.muted : PALETTE.text, 700, 'left');
    for (let s = 0; s < 3; s += 1) {
      ctx.save();
      ctx.translate(x + 52 + s * 20, y + h - 18);
      star5(ctx, 0, 0, 7, s < earned);
      ctx.restore();
    }
  }

  function titleButtons(world) {
    const buttons = [];
    const w = 216;
    const h = 62;
    const gapX = 16;
    const gapY = 12;
    const x0 = (FIELD.width - (w * 5 + gapX * 4)) / 2;
    const y0 = 402;
    for (let i = 0; i < world.levelCount; i += 1) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      buttons.push({ id: `level-${i}`, x: x0 + col * (w + gapX), y: y0 + row * (h + gapY), w, h, index: i });
    }
    return buttons;
  }

  /** Buttons on screen now, for click hit-testing in main.js. */
  function layoutButtons(screen, world, ui) {
    if (screen === SCREEN_PLAY) return hudButtons(ui);
    if (screen === SCREEN_TITLE) {
      return titleButtons(world).map((b) => ({ ...b, label: '' }));
    }
    if (screen === SCREEN_PAUSED) {
      return [
        { id: 'resume', x: 490, y: 400, w: 300, h: 48, label: 'Resume  (P)', primary: true },
        { id: 'restart', x: 490, y: 458, w: 300, h: 48, label: 'Restart level  (R)' },
        { id: 'levels', x: 490, y: 516, w: 300, h: 48, label: 'Level select' },
      ];
    }
    if (screen === SCREEN_CLEAR) {
      const hasNext = world.levelIndex + 1 < world.levelCount;
      const list = [
        { id: 'replay', x: 400, y: 520, w: 200, h: 48, label: 'Replay' },
        { id: 'levels', x: 680, y: 520, w: 200, h: 48, label: 'Levels' },
      ];
      if (hasNext) list.unshift({ id: 'next', x: 400, y: 462, w: 480, h: 48, label: 'Next level  (Space)', primary: true });
      return list;
    }
    if (screen === SCREEN_FAILED) {
      return [
        { id: 'retry', x: 400, y: 462, w: 480, h: 48, label: 'Retry level  (Space)', primary: true },
        { id: 'levels', x: 400, y: 520, w: 480, h: 48, label: 'Level select' },
      ];
    }
    if (screen === SCREEN_WIN) {
      return [
        { id: 'again', x: 400, y: 500, w: 480, h: 48, label: 'Play again  (Space)', primary: true },
        { id: 'levels', x: 400, y: 558, w: 480, h: 48, label: 'Level select' },
      ];
    }
    return [];
  }

  function drawTitle(world, ui) {
    ctx.fillStyle = 'rgba(4,6,16,0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'STARSLING', 640, 150, 92, PALETTE.text, 900);
    ctx.save();
    ctx.shadowColor = '#4de8ff';
    ctx.shadowBlur = 34;
    text(ctx, 'STARSLING', 640, 150, 92, '#cfe9ff', 900);
    ctx.restore();
    text(ctx, 'A gravity-slingshot puzzle  ·  catch every shard, ride the planets, reach the gate', 640, 212, 19, '#c9d4f5', 600);
    text(ctx, 'Drag back from the pad to aim — the dotted path shows where you will fly.  R retry · H hint · M mute · P pause', 640, 246, 15, PALETTE.muted, 600);
    text(ctx, `BEST SCORE ${world.best}`, 640, 282, 16, PALETTE.gold, 800);
    text(ctx, 'CHOOSE A LEVEL', 640, 368, 15, PALETTE.muted, 800);
    for (const b of titleButtons(world)) levelButton(b.x, b.y, b.w, b.h, b.index, world, ui.selectedLevel === b.index);
    text(ctx, '10 hand-built levels · no two alike · every launch verified solvable', 640, 566, 14, PALETTE.muted, 600);
    text(ctx, 'Click a level, or press Space to play level 1', 640, 596, 14, PALETTE.text, 600);
  }

  function drawPaused(world) {
    ctx.fillStyle = 'rgba(4,6,16,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(390, 170, 500, 420);
    text(ctx, 'PAUSED', 640, 225, 44, PALETTE.text, 900);
    text(ctx, `${world.level.name}  ·  Level ${world.levelIndex + 1} of ${world.levelCount}`, 640, 275, 16, PALETTE.muted, 600);
    text(ctx, `Score ${world.totalScore}  ·  Best ${world.best}`, 640, 305, 16, PALETTE.text, 700);
    text(ctx, 'Drag to aim, release to fly. Collect every shard, then touch the gate.', 640, 340, 14, PALETTE.muted, 600);
    for (const b of layoutButtons(SCREEN_PAUSED, world, {})) drawButton(b, b.primary);
  }

  function drawClear(world) {
    ctx.fillStyle = 'rgba(4,6,16,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(380, 130, 520, 450);
    text(ctx, 'LEVEL CLEAR', 640, 185, 40, PALETTE.gate, 900);
    text(ctx, `${world.level.name}`, 640, 228, 18, PALETTE.text, 700);
    for (let s = 0; s < 3; s += 1) {
      ctx.save();
      ctx.translate(640 + (s - 1) * 64, 285);
      star5(ctx, 0, 0, 24, s < world.starsEarned);
      ctx.restore();
    }
    const unused = world.launchesLeft;
    text(ctx, `Shards  ${world.level.shards.length} × 100  =  ${world.level.shards.length * 100}`, 640, 340, 16, PALETTE.text, 600);
    text(ctx, `Clear bonus  500   ·   Unused launches  ${unused} × 250  =  ${unused * 250}`, 640, 370, 16, PALETTE.text, 600);
    if (world.starsEarned === 3) text(ctx, '3-star bonus  +300', 640, 400, 16, PALETTE.gold, 700);
    else if (world.starsEarned === 2) text(ctx, '2-star bonus  +150', 640, 400, 16, PALETTE.gold, 700);
    text(ctx, `LEVEL SCORE  ${world.levelScore}      TOTAL  ${world.totalScore}`, 640, 432, 18, PALETTE.text, 800);
    for (const b of layoutButtons(SCREEN_CLEAR, world, {})) drawButton(b, b.primary);
  }

  function drawFailed(world) {
    ctx.fillStyle = 'rgba(4,6,16,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(380, 150, 520, 430);
    text(ctx, 'OUT OF LAUNCHES', 640, 210, 36, '#ff8ba0', 900);
    text(ctx, `${world.level.name}  ·  ${world.got.size}/${world.level.shards.length} shards collected`, 640, 258, 17, PALETTE.text, 700);
    text(ctx, 'The comet is lost. The shards you caught stay caught —', 640, 300, 15, PALETTE.muted, 600);
    text(ctx, 'but a retry starts the level fresh. Watch the dotted path,', 640, 324, 15, PALETTE.muted, 600);
    text(ctx, 'and use H for a hint when a launch keeps missing.', 640, 348, 15, PALETTE.muted, 600);
    text(ctx, `Score ${world.totalScore}  ·  Best ${world.best}`, 640, 392, 16, PALETTE.text, 700);
    for (const b of layoutButtons(SCREEN_FAILED, world, {})) drawButton(b, b.primary);
  }

  function drawWin(world) {
    ctx.fillStyle = 'rgba(4,6,16,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(360, 110, 560, 500);
    text(ctx, 'ALL LEVELS CLEAR', 640, 170, 40, PALETTE.gold, 900);
    text(ctx, 'You slung the comet home through every system.', 640, 212, 17, PALETTE.text, 700);
    let totalStars = 0;
    for (const key of Object.keys(world.stars)) totalStars += world.stars[key];
    for (let s = 0; s < 3; s += 1) {
      ctx.save();
      ctx.translate(640 + (s - 1) * 64, 268);
      star5(ctx, 0, 0, 24, true);
      ctx.restore();
    }
    text(ctx, `${totalStars} / ${world.levelCount * 3} stars`, 640, 310, 18, PALETTE.gold, 800);
    text(ctx, `TOTAL SCORE  ${world.totalScore}`, 640, 350, 22, PALETTE.text, 800);
    text(ctx, `BEST  ${world.best}`, 640, 382, 16, PALETTE.muted, 700);
    text(ctx, 'Thanks for playing STARSLING.', 640, 420, 15, PALETTE.muted, 600);
    for (const b of layoutButtons(SCREEN_WIN, world, {})) drawButton(b, b.primary);
  }

  function drawField(world, ui) {
    drawBackground(world);
    drawOrbitPaths(world);
    drawGate(world);
    for (const b of world.level.bodies) {
      if (b.kind === 'hole') drawHole(b, world.time);
      else drawPlanet(b, world.time);
    }
    for (const m of world.level.mines) drawMine(m, world.time);
    for (let i = 0; i < world.level.shards.length; i += 1) drawShard(world.level.shards[i], i, world);
    drawPad(world, ui);
    drawComet(world);
    world.particles.draw(ctx);
  }

  return {
    draw(world, screen, ui) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      if (world.shake > 0) {
        const s = world.shake * 14;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      }
      if (screen === SCREEN_TITLE) {
        drawBackground(world);
        drawOrbitPaths(world);
        drawGate(world);
        for (const b of world.level.bodies) {
          if (b.kind === 'hole') drawHole(b, world.time);
          else drawPlanet(b, world.time);
        }
        for (let i = 0; i < world.level.shards.length; i += 1) drawShard(world.level.shards[i], i, world);
        drawAttract(world);
        world.particles.draw(ctx);
        drawTitle(world, ui);
        return;
      }
      drawField(world, ui);
      if (screen === SCREEN_PLAY) drawHud(world, ui);
      else if (screen === SCREEN_PAUSED) { drawHud(world, ui); drawPaused(world); }
      else if (screen === SCREEN_CLEAR) drawClear(world);
      else if (screen === SCREEN_FAILED) drawFailed(world);
      else if (screen === SCREEN_WIN) drawWin(world);
    },
    layoutButtons,
  };
}
