// Short-lived spark particles: shard bursts, crash debris, gate shimmer, launch puffs.
// One pool, allocated once; dead particles are reused, never allocated per frame.
export function createParticles(capacity = 320) {
  const pool = [];
  for (let i = 0; i < capacity; i += 1) {
    pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#ffffff', alive: false });
  }

  function spawn(x, y, vx, vy, life, size, color) {
    for (const p of pool) {
      if (p.alive) continue;
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.max = life; p.size = size; p.color = color; p.alive = true;
      return;
    }
  }

  return {
    burst(x, y, count, speed, life, size, color) {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.7);
        spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), size, color);
      }
    },
    puff(x, y, color) {
      for (let i = 0; i < 10; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const s = 20 + Math.random() * 50;
        spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.4 + Math.random() * 0.3, 2.5, color);
      }
    },
    step(dt) {
      for (const p of pool) {
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) { p.alive = false; continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - 1.6 * dt;
        p.vy *= 1 - 1.6 * dt;
      }
    },
    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of pool) {
        if (!p.alive) continue;
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
    clear() {
      for (const p of pool) p.alive = false;
    },
  };
}
