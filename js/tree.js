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

const TOTAL_FLOWERS = 12;
const LENGTH_DECAY = 0.76; // each branch level is a bit shorter than its parent

const PALETTE = [
  "#ff3b2f", "#ff9f1c", "#ffd23f", "#8ac926",
  "#3a86ff", "#8338ec", "#ff006e", "#fb5607",
  "#06d6a0", "#ef476f", "#118ab2", "#f15bb5",
];

// Splits `n` into `k` positive parts that are uneven (not just n/k each) —
// this is what makes the branching feel natural instead of symmetric.
function partition(n, k, rng) {
  if (k <= 1) return [n];

  const weights = Array.from({ length: k }, () => 0.7 + rng() * 0.6);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.max(1, Math.floor((w / weightSum) * n)));

  let diff = n - parts.reduce((a, b) => a + b, 0);
  let i = 0;
  while (diff > 0) {
    parts[i % k]++;
    diff--;
    i++;
  }
  while (diff < 0) {
    const idx = i % k;
    if (parts[idx] > 1) {
      parts[idx]--;
      diff++;
    }
    i++;
  }
  return parts;
}

// Recursively splits a "budget" of flowers across branches. A node with
// numLeaves === 1 becomes a flower tip. Otherwise it splits into 2 (mostly)
// or occasionally 3 unevenly-sized branches, each recursing with its own
// share of the remaining flower budget.
function buildNode(numLeaves, depth, rng) {
  const node = { depth, children: [] };

  if (numLeaves <= 1) {
    return node; // leaf — a flower will be drawn here, color assigned later
  }

  const k = numLeaves >= 3 && rng() < 0.28 ? 3 : 2;
  const parts = partition(numLeaves, k, rng);
  const baseSpread = 26 + rng() * 16;

  for (let i = 0; i < k; i++) {
    const angleOffset = (i - (k - 1) / 2) * baseSpread + (rng() - 0.5) * 16;
    node.children.push({ angleOffset, node: buildNode(parts[i], depth + 1, rng) });
  }

  return node;
}

function collectLeaves(node, out) {
  if (node.children.length === 0) {
    out.push(node);
  } else {
    for (const c of node.children) collectLeaves(c.node, out);
  }
}

function maxDepthOf(node) {
  if (node.children.length === 0) return node.depth;
  return Math.max(...node.children.map((c) => maxDepthOf(c.node)));
}

// Fisher-Yates using the seeded RNG so color assignment is stable per seed.
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Builds the whole plant once: a single trunk (depth 0) that, once grown,
// splits unevenly into branches, which split again, until exactly
// TOTAL_FLOWERS flower tips exist — each assigned its own color.
export function generateTree(seed = 1) {
  const rng = mulberry32(seed);

  // depth 0 is a plain, unbranched trunk — branching only starts at depth 1.
  const trunkChild = buildNode(TOTAL_FLOWERS, 1, rng);
  const root = { depth: 0, children: [{ angleOffset: 0, node: trunkChild }] };

  const leaves = [];
  collectLeaves(root, leaves);
  const colors = shuffle(PALETTE, rng);
  leaves.forEach((leaf, i) => {
    leaf.color = colors[i % colors.length];
  });

  return { root, maxDepth: maxDepthOf(root) };
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function lighten(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

// How "unlocked" a given depth level is, given the current growth value.
// Levels unlock sequentially: the trunk grows first, then each branch level.
function levelProgress(depth, growth, maxDepth) {
  return Math.min(1, Math.max(0, growth * (maxDepth + 1) - depth));
}

// Draws a flower bud in its own color. At bloom = 0 it's a thin closed
// spike; as bloom increases it widens and fans open into a full flower.
function drawBud(ctx, bloom, color) {
  const petalAngles = [-0.5, -0.24, 0, 0.24, 0.5];
  const spread = bloom;
  const length = 34 + bloom * 36;
  const width = 5 + bloom * 20;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 8 + bloom * 16;

  for (const a of petalAngles) {
    ctx.save();
    ctx.rotate(a * spread);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(width, -length * 0.55, 0, -length);
    ctx.quadraticCurveTo(-width, -length * 0.55, 0, 0);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, -length);
    grad.addColorStop(0, color);
    grad.addColorStop(1, lighten(color, 0.55));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawNode(ctx, node, growth, bloom, maxDepth, segmentBase) {
  const progress = levelProgress(node.depth, growth, maxDepth);
  if (progress <= 0) return;

  const fullLen = segmentBase * Math.pow(LENGTH_DECAY, node.depth);
  const len = fullLen * Math.min(1, progress);

  ctx.save();
  ctx.shadowColor = "#4d94ff";
  ctx.shadowBlur = 7;
  ctx.strokeStyle = "#4d94ff";
  ctx.lineWidth = Math.max(1.5, 4 - node.depth * 0.35);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len);
  ctx.stroke();
  ctx.restore();

  ctx.translate(0, -len);

  const isTip = node.children.length === 0;
  if (isTip && progress > 0.15) {
    drawBud(ctx, bloom, node.color || "#ff3b2f");
  }

  if (progress >= 1) {
    for (const child of node.children) {
      ctx.save();
      ctx.rotate((child.angleOffset * Math.PI) / 180);
      drawNode(ctx, child.node, growth, bloom, maxDepth, segmentBase);
      ctx.restore();
    }
  }
}

// Draws the whole plant, rooted at (originX, originY). `baseLength` should
// scale with the canvas size so the plant fills the screen on any device.
export function drawPlant(ctx, tree, growth, bloom, originX, originY, baseLength) {
  // segmentBase is picked so the full chain of decaying segments down to
  // maxDepth roughly sums to baseLength.
  const decaySum = (1 - Math.pow(LENGTH_DECAY, tree.maxDepth + 1)) / (1 - LENGTH_DECAY);
  const segmentBase = baseLength / decaySum;

  ctx.save();
  ctx.translate(originX, originY);
  drawNode(ctx, tree.root, growth, bloom, tree.maxDepth, segmentBase);
  ctx.restore();
}
