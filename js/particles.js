// Ambient floating pollen/spark particles that drift up and away from the
// bloomed flowers on their own, frame after frame — this is what keeps the
// scene feeling alive even when the plant's growth/bloom values are
// momentarily holding still (e.g. no hands currently in frame). Spawn rate
// and glow intensity scale with the current bloom value, but the particles
// themselves are purely time-driven once spawned: not tied to gestures.

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function createParticles(max = 90) {
  let particles = [];

  function spawn(x, y, spreadX, spreadY, color) {
    particles.push({
      x: x + rand(-spreadX, spreadX),
      y: y + rand(-spreadY, spreadY),
      vx: rand(-8, 8),
      vy: rand(-34, -14),
      size: rand(1.3, 3.2),
      life: 0,
      maxLife: rand(2.2, 4.6),
      color,
      drift: rand(0, Math.PI * 2),
    });
  }

  // originX/Y: roughly where the flower canopy is. spreadX/Y: how wide an
  // area to spawn across. intensity: 0..1, drives spawn rate and glow.
  function update(dt, originX, originY, spreadX, spreadY, intensity, palette) {
    const dtSec = Math.min(0.05, dt / 1000); // clamp so tab-switches don't dump a flood of particles

    const spawnCount = intensity > 0.04 ? Math.floor(intensity * 2.4 * (dt / 16.7)) : 0;
    for (let i = 0; i < spawnCount && particles.length < max; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      spawn(originX, originY, spreadX, spreadY, color);
    }

    for (const p of particles) {
      p.life += dtSec;
      p.x += p.vx * dtSec + Math.sin(p.life * 2.2 + p.drift) * 0.7;
      p.y += p.vy * dtSec;
    }

    particles = particles.filter((p) => p.life < p.maxLife);
  }

  function draw(ctx) {
    if (particles.length === 0) return;
    ctx.save();
    for (const p of particles) {
      const t = p.life / p.maxLife;
      const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      ctx.globalAlpha = Math.max(0, alpha) * 0.85;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return { update, draw };
}

// Soft, slowly breathing glow behind the plant — another purely
// time-driven ambient touch, independent of hand tracking.
export function drawAmbientGlow(ctx, x, y, radius, intensity, time) {
  if (intensity <= 0.01) return;
  const pulse = 0.5 + Math.sin(time * 0.0012) * 0.5; // 0..1
  const r = radius * (0.85 + pulse * 0.25);

  ctx.save();
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  const alpha = 0.1 + intensity * 0.16;
  grad.addColorStop(0, `rgba(143, 191, 107, ${alpha})`);
  grad.addColorStop(1, "rgba(143, 191, 107, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
