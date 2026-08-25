// Seeded PRNG so a given tree's shape is stable while it's on screen,
// without repeating the exact same shape every time you regrow it (see
// how `generateTree` is called fresh from main.js on each grow cycle).
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
const ROOT_WIDTH = 24; // trunk thickness in px, tapers as it branches
const WIDTH_DECAY = 0.8;

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

// How long THIS node's own segment is, as a multiplier of a shared unit.
// Branches with a big remaining flower budget (early, major limbs) reach
// further out; branches close to a single flower taper down as they
// approach the tip — this is what makes it grow longer right after it
// starts dividing, rather than shrinking immediately.
function segmentLengthFactor(numLeaves, depth, rng) {
  if (depth === 0) return 1.0 + (rng() - 0.5) * 0.2; // trunk
  if (numLeaves >= 5) return 1.2 + rng() * 0.6; // major limb, reaches far out toward the edges
  if (numLeaves >= 2) return 0.8 + rng() * 0.34; // mid branch
  return 0.48 + rng() * 0.26; // short final stem into the flower
}

// Recursively splits a "budget" of flowers across branches. A node with
// numLeaves === 1 becomes a flower tip. Otherwise it splits into 2 (mostly)
// or occasionally 3 unevenly-sized branches, each recursing with its own
// share of the remaining flower budget.
function buildNode(numLeaves, depth, rng) {
  const node = {
    depth,
    children: [],
    lengthFactor: segmentLengthFactor(numLeaves, depth, rng),
    // Unique per-node phase so wind sway and flower shimmer animate out of
    // sync with each other — otherwise the whole plant would move as one
    // rigid piece instead of feeling alive.
    phase: rng() * Math.PI * 2,
  };

  if (numLeaves <= 1) {
    return node; // leaf — a flower will be drawn here, color/size assigned later
  }

  const k = numLeaves >= 3 && rng() < 0.28 ? 3 : 2;
  const parts = partition(numLeaves, k, rng);

  // Wider, and wider still the closer a branch is to becoming individual
  // flower tips, AND wider near the root — this is what fans the plant out
  // across the whole frame instead of bunching everything into a tight
  // bouquet above the trunk.
  const spreadBoost = numLeaves <= 2 ? 34 : numLeaves <= 4 ? 20 : numLeaves <= 7 ? 8 : 0;
  const depthBoost = depth <= 1 ? 34 : depth === 2 ? 16 : 0;
  const baseSpread = 40 + rng() * 28 + spreadBoost + depthBoost;

  // Give each branch angular room proportional to how many flowers it's
  // carrying (by sqrt, so it's not too extreme) rather than splitting the
  // angle evenly — a branch feeding 5 flowers needs more spread than one
  // feeding 1, or their flowers end up crowding each other.
  const weights = parts.map((p) => Math.sqrt(p));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  let cursor = 0;
  for (let i = 0; i < k; i++) {
    const center = (cursor + weights[i] / 2) / weightSum - 0.5; // -0.5..0.5
    cursor += weights[i];
    const angleOffset = center * baseSpread * k + (rng() - 0.5) * 14;
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
// TOTAL_FLOWERS flower tips exist — each with its own color and size.
// Call this again with a new seed any time you want a freshly-shaped plant.
export function generateTree(seed = 1) {
  const rng = mulberry32(seed);

  // depth 0 is a plain, unbranched trunk — branching only starts at depth 1.
  const trunkChild = buildNode(TOTAL_FLOWERS, 1, rng);
  const root = {
    depth: 0,
    children: [{ angleOffset: 0, node: trunkChild }],
    lengthFactor: 1,
    phase: rng() * Math.PI * 2,
  };

  const leaves = [];
  collectLeaves(root, leaves);
  const colors = shuffle(PALETTE, rng);
  leaves.forEach((leaf, i) => {
    leaf.color = colors[i % colors.length];
    leaf.sizeScale = 0.75 + rng() * 0.75; // each flower is its own random size
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

function darken(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const nr = Math.round(r * (1 - amount));
  const ng = Math.round(g * (1 - amount));
  const nb = Math.round(b * (1 - amount));
  return `rgb(${nr}, ${ng}, ${nb})`;
}

// How "unlocked" a given depth level is, given the current growth value.
// Levels unlock sequentially: the trunk grows first, then each branch level.
function levelProgress(depth, growth, maxDepth) {
  return Math.min(1, Math.max(0, growth * (maxDepth + 1) - depth));
}

// Draws one tapered, glossy black branch segment from (0,0) to (0,-len) in
// the current local space — a filled shape with a cross-width gradient
// (dark at the edges, a lighter streak down the middle) to read as a
// rounded, 3D cylinder rather than a flat line.
function drawStemSegment(ctx, len, widthBottom, widthTop) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;

  const grad = ctx.createLinearGradient(-widthBottom / 2, 0, widthBottom / 2, 0);
  grad.addColorStop(0, "#000000");
  grad.addColorStop(0.32, "#2b2b2b");
  grad.addColorStop(0.5, "#565656");
  grad.addColorStop(0.68, "#2b2b2b");
  grad.addColorStop(1, "#000000");
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(-widthBottom / 2, 0);
  ctx.lineTo(-widthTop / 2, -len);
  ctx.quadraticCurveTo(0, -len - widthTop * 0.4, widthTop / 2, -len);
  ctx.lineTo(widthBottom / 2, 0);
  ctx.quadraticCurveTo(0, widthBottom * 0.3, -widthBottom / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// A small dark-green sepal cluster at the base of a flower, drawn behind
// the petals so its tips peek out from underneath them.
function drawSepals(ctx, bloom, size) {
  const angles = [-0.85, -0.35, 0.35, 0.85];
  const length = size * (0.45 + bloom * 0.15);
  const width = size * 0.16;

  ctx.save();
  for (const a of angles) {
    ctx.save();
    ctx.rotate(a * (0.5 + bloom * 0.5));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(width, -length * 0.6, 0, -length);
    ctx.quadraticCurveTo(-width, -length * 0.6, 0, 0);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, -length);
    grad.addColorStop(0, "#0f3d20");
    grad.addColorStop(1, "#2e7d4f");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// Draws a flower bud in its own color and size. At bloom = 0 it's a thin
// closed spike; as bloom increases it widens and fans open into a full
// flower, with a sepal base and a small center disc for extra depth.
// `time` + `phase` drive a small continuous twinkle/breathing motion so
// bloomed flowers stay lively even when hands are holding still.
function drawBud(ctx, bloom, color, sizeScale, time = 0, phase = 0) {
  const petalAngles = [-0.55, -0.26, 0, 0.26, 0.55];
  const spread = bloom;
  const length = (54 + bloom * 66) * sizeScale;
  const width = (9 + bloom * 30) * sizeScale;

  // Gentle continuous breathing scale + glow twinkle, only noticeable once
  // the flower has actually opened up a bit.
  const pulse = 1 + Math.sin(time * 0.0026 + phase * 1.7) * 0.045 * bloom;
  const shimmer = 0.85 + Math.sin(time * 0.0032 + phase) * 0.15;

  ctx.save();
  ctx.scale(pulse, pulse);
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;

  drawSepals(ctx, bloom, length);

  ctx.shadowColor = color;
  ctx.shadowBlur = (10 + bloom * 18) * shimmer;
  ctx.shadowOffsetY = 0;

  for (const a of petalAngles) {
    ctx.save();
    ctx.rotate(a * spread);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(width, -length * 0.55, 0, -length);
    ctx.quadraticCurveTo(-width, -length * 0.55, 0, 0);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-width, 0, width, 0);
    grad.addColorStop(0, darken(color, 0.35));
    grad.addColorStop(0.5, lighten(color, 0.3));
    grad.addColorStop(1, darken(color, 0.35));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // Small center disc where the petals converge, for a finished 3D look.
  ctx.beginPath();
  ctx.arc(0, 0, width * 0.32, 0, Math.PI * 2);
  const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 0.32);
  centerGrad.addColorStop(0, "#7a4a1f");
  centerGrad.addColorStop(1, "#3d2410");
  ctx.fillStyle = centerGrad;
  ctx.fill();

  ctx.restore();
}

function drawNode(ctx, node, growth, bloom, maxDepth, segmentUnit, time) {
  const progress = levelProgress(node.depth, growth, maxDepth);
  if (progress <= 0) return;

  // Continuous wind sway: a slow sine offset, unique per branch via its
  // phase, growing stronger further out toward the tips. Runs all the time
  // off `time`, independent of hand tracking, so the plant never sits
  // perfectly still once it's grown in.
  const swayDeg = (1.1 + node.depth * 1.35) * Math.min(1, progress);
  const sway = Math.sin(time * 0.0011 + (node.phase || 0)) * swayDeg;
  ctx.rotate((sway * Math.PI) / 180);

  const fullLen = segmentUnit * node.lengthFactor;
  const len = fullLen * Math.min(1, progress);

  const widthBottom = Math.max(2.5, ROOT_WIDTH * Math.pow(WIDTH_DECAY, node.depth));
  const widthTop = Math.max(2, ROOT_WIDTH * Math.pow(WIDTH_DECAY, node.depth + 1));
  drawStemSegment(ctx, len, widthBottom, widthTop);

  ctx.translate(0, -len);

  const isTip = node.children.length === 0;
  if (isTip && progress > 0.15) {
    drawBud(ctx, bloom, node.color || "#ff3b2f", node.sizeScale || 1, time, node.phase || 0);
  }

  if (progress >= 1) {
    for (const child of node.children) {
      ctx.save();
      ctx.rotate((child.angleOffset * Math.PI) / 180);
      drawNode(ctx, child.node, growth, bloom, maxDepth, segmentUnit, time);
      ctx.restore();
    }
  }
}

// Draws the whole plant, rooted at (originX, originY). `baseLength` should
// scale with the canvas size so the plant fills the screen on any device.
// `time` (e.g. the rAF timestamp) drives the continuous idle animation —
// wind sway on the branches and a slow twinkle/breathing pulse on open
// flowers — so the plant keeps feeling alive even while growth/bloom hold
// still between gestures.
export function drawPlant(ctx, tree, growth, bloom, originX, originY, baseLength, time = 0) {
  // segmentUnit picked so a typical trunk + a couple of major limbs roughly
  // reach baseLength — exact reach varies since branch length is randomized.
  const segmentUnit = baseLength / (tree.maxDepth + 1.4);

  ctx.save();
  ctx.translate(originX, originY);
  drawNode(ctx, tree.root, growth, bloom, tree.maxDepth, segmentUnit, time);
  ctx.restore();
}
