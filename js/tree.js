// Seeded PRNG so the plant's branch shape is stable across a session instead
// of re-randomizing every frame (which would make it flicker as it grows).
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
// position is computed at draw time via canvas transforms, anchored to a
// fixed point on screen (the whole plant is one piece that lives in one
// place, rather than jumping around with your hand).
export function generateTree(seed = 1) {
  const rng = mulberry32(seed);

  function build(depth, length) {
    const node = { depth, length, children: [] };

    if (depth < MAX_DEPTH - 1) {
      const count = depth === 0 ? 4 : rng() < 0.7 ? 2 : 3;
      const baseSpread = 18 + rng() * 14; // degrees between siblings

      for (let i = 0; i < count; i++) {
        const angleOffset = (i - (count - 1) / 2) * baseSpread + (rng() - 0.5) * 10;
        node.children.push({
          angleOffset,
          node: build(depth + 1, length * (0.7 + rng() * 0.1)),
        });
      }
    }

    return node;
  }

  return build(0, 70);
}

// How "unlocked" a given depth level is, given the current growth value.
// Levels unlock sequentially: level 0 grows first, then level 1, etc.
function levelProgress(depth, growth) {
  return Math.min(1, Math.max(0, growth * MAX_DEPTH - depth));
}

// Draws a flower bud right at a branch tip. At bloom = 0 it's a thin closed
// spike; as bloom increases it widens and fans open into a full flower —
// always visible once the branch has grown there, just closed vs open.
function drawBud(ctx, bloom) {
  const petalAngles = [-0.5, -0.24, 0, 0.24, 0.5];
  const spread = bloom; // 0 = petals collapsed together, 1 = fully fanned
  const length = 22 + bloom * 14;
  const width = 3 + bloom * 11;

  ctx.save();
  ctx.shadowColor = "rgba(255, 90, 70, 0.85)";
  ctx.shadowBlur = 6 + bloom * 10;

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

function drawPlantNode(ctx, node, growth, bloom) {
  const progress = levelProgress(node.depth, growth);
  if (progress <= 0) return;

  const len = node.length * Math.min(1, progress);

  ctx.save();
  ctx.shadowColor = "#4d94ff";
  ctx.shadowBlur = 6;
  ctx.strokeStyle = "#4d94ff";
  ctx.lineWidth = Math.max(1, 2.5 - node.depth * 0.3);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len);
  ctx.stroke();
  ctx.restore();

  ctx.translate(0, -len);

  const isFullyGrown = progress >= 1;
  const isTip = node.children.length === 0;

  // A bud sits at the current growing edge of the plant: either a true
  // leaf tip, or a branch that hasn't finished growing (and so hasn't
  // unlocked its children yet). This keeps flowers appearing right where
  // the plant is actively growing, as one connected piece.
  if (isTip || !isFullyGrown) {
    drawBud(ctx, bloom);
  }

  if (isFullyGrown) {
    for (const child of node.children) {
      ctx.save();
      ctx.rotate((child.angleOffset * Math.PI) / 180);
      drawPlantNode(ctx, child.node, growth, bloom);
      ctx.restore();
    }
  }
}

// Draws the whole plant — branches and flower buds together as one piece —
// rooted at a fixed (originX, originY) and growing upward.
export function drawPlant(ctx, tree, growth, bloom, originX, originY) {
  ctx.save();
  ctx.translate(originX, originY);
  drawPlantNode(ctx, tree, growth, bloom);
  ctx.restore();
}
