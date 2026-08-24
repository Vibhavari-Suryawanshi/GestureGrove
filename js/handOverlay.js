// MediaPipe's 21-point hand skeleton connections, used to draw the faint
// AR-style tracking lines over each detected hand.
const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

// Converts a normalized landmark (0..1, raw/unmirrored frame space) into
// mirrored on-screen pixel coordinates matching the mirrored video draw.
export function landmarkToScreen(landmark, w, h) {
  return { x: (1 - landmark.x) * w, y: landmark.y * h };
}

// Draws faint glowing skeleton lines over a detected hand — this is what
// gives the "AR tracking" feel from the reference clip.
export function drawSkeleton(ctx, landmarks, w, h, color) {
  if (!landmarks) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;

  for (const [a, b] of CONNECTIONS) {
    const p1 = landmarkToScreen(landmarks[a], w, h);
    const p2 = landmarkToScreen(landmarks[b], w, h);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  ctx.restore();
}

// Draws a small vertical gauge bar + numeric label next to a hand,
// matching the "Grow: 0.35" / "Bloom: 0.21" readouts in the reference clip.
export function drawGauge(ctx, x, y, value, label, color) {
  const barHeight = 70;
  const barX = x + 40;
  const barTop = y - barHeight / 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(barX, barTop);
  ctx.lineTo(barX, barTop + barHeight);
  ctx.stroke();

  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(barX, barTop + barHeight);
  ctx.lineTo(barX, barTop + barHeight * (1 - value));
  ctx.stroke();

  ctx.globalAlpha = 0.85;
  ctx.shadowBlur = 3;
  ctx.font = "500 15px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(`${label}: ${value.toFixed(2)}`, barX + 10, y);
  ctx.restore();
}
