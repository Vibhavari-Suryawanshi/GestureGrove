// MediaPipe's 21-point hand skeleton connections, used only to draw the
// debug skeleton overlay in the small tracker monitor.
const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

// Draws a small "security camera" style monitor: mirrored webcam feed with
// the detected hand skeleton overlaid, colored by which hand it is.
// This makes tracking quality visible at a glance and doubles as a debug view.
export function drawMonitor(ctx, video, hands, w, h, colors) {
  ctx.clearRect(0, 0, w, h);

  // Mirror the feed so it matches how the user sees themselves.
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -w, 0, w, h);
  ctx.restore();

  // Faint scanline texture for a technical/CV-monitor feel.
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = colors.scan;
  for (let y = 0; y < h; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const [label, landmarks] of Object.entries(hands)) {
    if (!landmarks) continue;

    const color = label === "Right" ? colors.growth : colors.bloom;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;

    // Landmarks come from the raw (unmirrored) frame, so we flip x to
    // line them up with the mirrored video drawn above.
    for (const [a, b] of CONNECTIONS) {
      const p1 = landmarks[a];
      const p2 = landmarks[b];
      ctx.beginPath();
      ctx.moveTo((1 - p1.x) * w, p1.y * h);
      ctx.lineTo((1 - p2.x) * w, p2.y * h);
      ctx.stroke();
    }

    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc((1 - p.x) * w, p.y * h, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
