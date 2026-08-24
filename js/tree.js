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

const MAX_DEPTH = 7;

// Builds the tree's structure once, up front. Each node only stores its
// angle relative to its parent and its full-grown length — actual screen
// position is computed at draw time via canvas transforms.
export function generateTree(seed = 1) {
  const rng = mulberry32(seed);

  function build(depth, length) {
    const node = { depth, length, children: [] };

    if (depth < MAX_DEPTH - 1) {
      const count = depth === 0 ? 2 : rng() < 0.8 ? 2 : 3;
      const baseSpread = 22 + rng() * 14; // degrees between siblings

      for (let i = 0; i < count; i++) {
        const angleOffset = (i - (count - 1) / 2) * baseSpread + (rng() - 0.5) * 10;
        node.children.push({
          angleOffset,
          node: build(depth + 1, length * (0.68 + rng() * 0.1)),
        });
      }
    }

    return node;
  }

  return build(0, 130);
}

// How "unlocked" a given depth level is, given the current growth value.
// Levels unlock sequentially: level 0 grows first, then level 1, etc.
function levelProgress(depth, growth) {
  return Math.min(1, Math.max(0, growth * MAX_DEPTH - depth));
}

function lerpColor(a, b, t) {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function drawFlower(ctx, size, colors) {
  if (size <= 0.5) return;
  const petals = 5;

  ctx.save();
  for (let i = 0; i < petals; i++) {
    ctx.rotate((Math.PI * 2) / petals);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.55, size * 0.32, size * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.petal;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = colors.center;
  ctx.fill();
  ctx.restore();
}

function drawNode(ctx, node, growth, bloom, palette) {
  const progress = levelProgress(node.depth, growth);
  if (progress <= 0) return;

  const len = node.length * Math.min(1, progress);
  const t = node.depth / MAX_DEPTH;

  ctx.strokeStyle = lerpColor(palette.trunk, palette.tip, t);
  ctx.lineWidth = Math.max(1.5, 10 * (1 - t));
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len);
  ctx.stroke();

  ctx.translate(0, -len);

  const isFullyGrown = progress >= 1;
  const isTip = node.children.length === 0;

  if (isFullyGrown && isTip) {
    drawFlower(ctx, 6 + bloom * 16, palette.flower);
  }

  if (isFullyGrown) {
    for (const child of node.children) {
      ctx.save();
      ctx.rotate((child.angleOffset * Math.PI) / 180);
      drawNode(ctx, child.node, growth, bloom, palette);
      ctx.restore();
    }
  }
}

const PALETTE = {
  trunk: [74, 55, 40], // warm brown at the base
  tip: [143, 191, 107], // fresh green at growing tips
  flower: { petal: "#e8879e", center: "#e8a23c" },
};

export function drawTree(ctx, tree, growth, bloom, originX, originY) {
  ctx.save();
  ctx.translate(originX, originY);
  drawNode(ctx, tree, growth, bloom, PALETTE);
  ctx.restore();
}
