// Converts a normalized landmark (0..1, raw/unmirrored frame space) into
// mirrored on-screen pixel coordinates matching the mirrored video draw.
export function landmarkToScreen(landmark, w, h) {
  return { x: (1 - landmark.x) * w, y: landmark.y * h };
}

// Midpoint between thumb tip (4) and index tip (8), in mirrored screen
// pixels — this is the "gap" a pinch/spread gesture happens in, and where
// the floating gauge should float.
export function pinchGapPosition(landmarks, w, h) {
  const thumb = landmarkToScreen(landmarks[4], w, h);
  const index = landmarkToScreen(landmarks[8], w, h);
  return { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 };
}

// Draws a small vertical gauge bar centered at (x, y) with a numeric label
// beside it — meant to float right in the gap between a hand's thumb and
// index finger.
export function drawGauge(ctx, x, y, value, label, color) {
  const barHeight = 60;
  const top = y - barHeight / 2;
  const bottom = y + barHeight / 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  ctx.lineWidth = 2;

  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();

  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(x, bottom);
  ctx.lineTo(x, bottom - barHeight * value);
  ctx.stroke();

  ctx.shadowBlur = 3;
  ctx.font = "500 15px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(`${label}: ${value.toFixed(2)}`, x + 10, y);
  ctx.restore();
}
