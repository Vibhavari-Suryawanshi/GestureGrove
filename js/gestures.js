// MediaPipe Hand Landmarker point indices we care about.
// Full 21-point map: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9; // base knuckle of the middle finger, used to scale for hand size/distance

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Returns "spread" — how far apart the thumb and index finger are — as a
// 0..1 value: 0 = fingers touching (pinched closed), 1 = fingers fully
// spread apart. This is a direct, reversible read of the current hand
// pose each frame, not something that accumulates over time.
// Normalized by hand size so it works the same whether the hand is close
// to or far from the camera.
export function spreadValue(landmarks) {
  if (!landmarks) return 0;

  const handScale = dist(landmarks[WRIST], landmarks[MIDDLE_MCP]) || 1;
  const raw = dist(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) / handScale;

  const CLOSE = 0.35; // normalized distance, fingers touching
  const OPEN = 1.1; // normalized distance, fingers fully spread

  const t = (raw - CLOSE) / (OPEN - CLOSE);
  return Math.min(1, Math.max(0, t));
}

// Exponential moving average smoother — raw landmark data is jittery
// frame-to-frame, this keeps growth/bloom feeling smooth instead of jumpy,
// while still tracking the live value closely in both directions.
export function createSmoother(alpha = 0.3) {
  let value = 0;
  return (target) => {
    value += (target - value) * alpha;
    return value;
  };
}
