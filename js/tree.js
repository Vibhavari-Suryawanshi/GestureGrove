// Seeded PRNG so the plant's shape is stable across a session instead of
// re-randomizing every frame (which would make it flicker as it grows).
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A fixed, capped number of individual stems fanning out from one root —
// keeps the flower count predictable (never more than this) instead of a
// branching tree that multiplies out of control as it grows.
const NUM_STEMS = 7;
const SEGMENTS_PER_STEM = 4;

// Builds the stem layout once, up front: each stem is a short chain of
// segments with slight angle jitter for a gentle natural curve, fanned out
// across a wide spread so stems spread apart and don't overlap each other.
export function generateStems(seed = 1) {
  const rng = mulberry32(seed);
  const stems = [];

  for (let i = 0; i < NUM_STEMS; i++) {
    const t = NUM_STEMS === 1 ? 0.5 : i / (NUM_STEMS - 1);
    const baseAngle = -58 + t * 116 + (rng() - 0.5) * 8; // fan spread, degrees from straight up
    const lengthFactor = 0.78 + rng() * 0.34; // vary stem length so tips don't line up

    const segments = [];
    for (let s = 0; s < SEGMENTS_PER_STEM; s++) {
      segments.push({ angleOffset: s === 0 ? baseAngle : (rng() - 0.5) * 12 });
    }

    stems.push({ segments, lengthFactor });
  }

  return stems;
}

// Walks a stem's segment chain and returns the polyline points for however
// much of it is currently revealed by `growth`, plus the tip position/angle
// (in local space, relative to the stem's root) so a bud can be placed there.
function computeStemPoints(stem, totalLength, growth) {
  const revealed = totalLength * Math.max(0, Math.min(1, growth));
  const segLength = totalLength / SEGMENTS_PER_STEM;

  let x = 0;
  let y = 0;
  let dirAngleDeg = 0;
  let remaining = revealed;
  const points = [{ x, y }];

  for (let s = 0; s < SEGMENTS_PER_STEM; s++) {
    dirAngleDeg += stem.segments[s].angleOffset;
    const rad = (dirAngleDeg * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad); // 0deg = straight up

    const thisSegLen = Math.max(0, Math.min(segLength, remaining));
    x += dx * thisSegLen;
    y += dy * thisSegLen;
    points.push({ x, y });
    remaining -= thisSegLen;
    if (remaining <= 0) break;
  }

  return { points, tip: { x, y }, tipAngleDeg: dirAngleDeg, revealed };
}

// Draws a flower bud at the current stem's origin (0,0 in local space,
// already translated/rotated to the tip). At bloom = 0 it's a thin closed
// spike; as bloom increases it widens and fans open into a full flower.
function drawBud(ctx, bloom) {
  const petalAngles = [-0.5, -0.24, 0, 0.24, 0.5];
  const spread = bloom; // 0 = petals collapsed together, 1 = fully fanned
  const length = 40 + bloom * 42;
  const width = 6 + bloom * 24;

  ctx.save();
  ctx.shadowColor = "rgba(255, 90, 70, 0.85)";
  ctx.shadowBlur = 10 + bloom * 18;

  for (const a of petalAngles) {
    ctx.save();
    ctx.rotate(a * spread);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(width, -length * 0.55, 0, -length);
    ctx.quadraticCurveTo(-width, -length * 0.55, 0, 0);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, -length);
    grad.addColorStop(0, "#ff3b2f");
    grad.addColorStop(1, "#ffb199");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// Draws the whole plant — a fixed number of stems, each with a bud at its
// tip — rooted at (originX, originY). `baseLength` should scale with the
// canvas size so the plant fills the screen on any device.
export function drawPlant(ctx, stems, growth, bloom, originX, originY, baseLength) {
  for (const stem of stems) {
    const totalLength = baseLength * stem.lengthFactor;
    const { points, tip, tipAngleDeg, revealed } = computeStemPoints(stem, totalLength, growth);
    if (revealed <= 0) continue;

    ctx.save();
    ctx.translate(originX, originY);

    ctx.shadowColor = "#4d94ff";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "#4d94ff";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    if (revealed > totalLength * 0.05) {
      ctx.translate(tip.x, tip.y);
      ctx.rotate((tipAngleDeg * Math.PI) / 180);
      drawBud(ctx, bloom);
    }

    ctx.restore();
  }
}
