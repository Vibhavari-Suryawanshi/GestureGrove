// Seeded PRNG so the tree's shape is stable across a session instead of
// re-randomizing every frame (which would make it flicker/jitter as it grows).
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_DEPTH = 6;

// Builds the branch structure once, up front. Each node only stores its
// angle relative to its parent and its full-grown length — actual screen
// position is computed at draw time via canvas transforms, anchored to
// wherever the hand currently is.
export function generateTree(seed = 1) {
  const rng = mulberry32(seed);

  function build(depth, length) {
    const node = { depth, length, children: [] };

    if (depth < MAX_DEPTH - 1) {
      const count = depth === 0 ? 3 : rng() < 0.7 ? 2 : 3;
      const baseSpread = 20 + rng() * 16; // degrees between siblings

      for (let i = 0; i < count; i++) {
        const angleOffset = (i - (count - 1) / 2) * baseSpread + (rng() - 0.5) * 12;
        node.children.push({
          angleOffset,
          node: build(depth + 1, length * (0.7 + rng() * 0.1)),
        });
      }
    }

    return node;
  }

  return build(0, 90);
}

// How "unlocked" a given depth level is, given the current growth value.
// Levels unlock sequentially: level 0 grows first, then level 1, etc.
function levelProgress(depth, growth) {
  return Math.min(1, Math.max(0, growth * MAX_DEPTH - depth));
}

// A tulip-like cluster of pointed, glowing petals — matches the reference
// look more closely than a rounded flower.
function drawTulip(ctx, size, opacity) {
  if (size <= 0.5 || opacity <= 0.02) return;
  const petalAngles = [-0.5, -0.22, 0, 0.22, 0.5];

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.shadowColor = "rgba(255, 90, 70, 0.9)";
  ctx.shadowBlur = size * 1.4;

  for (const a of petalAngles) {
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.22, -size * 0.65, 0, -size * 1.2);
    ctx.quadraticCurveTo(-size * 0.22, -size * 0.65, 0, 0);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, -size * 1.2);
    grad.addColorStop(0, "#ff3b2f");
    grad.addColorStop(1, "#ffb199");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawBranchNode(ctx, node, growth, glowColor) {
  const progress = levelProgress(node.depth, growth);
  if (progress <= 0) return;

  const len = node.length * Math.min(1, progress);

  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = Math.max(1, 2.5 - node.depth * 0.3);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len);
  ctx.stroke();
  ctx.restore();

  ctx.translate(0, -len);

  const isFullyGrown = progress >= 1;
  if (isFullyGrown) {
    for (const child of node.children) {
      ctx.save();
      ctx.rotate((child.angleOffset * Math.PI) / 180);
      drawBranchNode(ctx, child.node, growth, glowColor);
      ctx.restore();
    }
  }
}

// Draws the growing branch structure, rooted at (originX, originY) and
// growing generally upward. Doesn't draw flowers — those are drawn
// separately at the bloom hand's position, see drawBloomCluster below.
export function drawTree(ctx, tree, growth, originX, originY) {
  ctx.save();
  ctx.translate(originX, originY);
  drawBranchNode(ctx, tree, growth, "#4d94ff");
  ctx.restore();
}

// Draws a small cluster of tulip flowers centered on the bloom hand's
// position, sized and faded in according to the bloom value.
export function drawBloomCluster(ctx, x, y, bloom) {
  if (bloom <= 0.02) return;

  const flowerOffsets = [
    { dx: 0, dy: 0, scale: 1 },
    { dx: -26, dy: 10, scale: 0.75 },
    { dx: 24, dy: 14, scale: 0.7 },
    { dx: -10, dy: 34, scale: 0.6 },
  ];

  for (const f of flowerOffsets) {
    ctx.save();
    ctx.translate(x + f.dx, y + f.dy);
    drawTulip(ctx, (18 + bloom * 22) * f.scale, Math.min(1, bloom * 1.3));
    ctx.restore();
  }
}
