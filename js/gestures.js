// MediaPipe Hand Landmarker point indices we care about.
// Full 21-point map: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9; // base knuckle of the middle finger, used to scale for hand size/distance

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Returns pinch strength: 0 = fingers fully open, 1 = thumb and index touching.
// Normalized by hand size so it works the same whether the hand is close to
// or far from the camera.
export function pinchStrength(landmarks) {
  if (!landmarks) return 0;

  const handScale = dist(landmarks[WRIST], landmarks[MIDDLE_MCP]) || 1;
  const raw = dist(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) / handScale;

  const OPEN = 1.1; // normalized distance, fingers spread
  const CLOSED = 0.35; // normalized distance, fingers touching

  const t = (OPEN - raw) / (OPEN - CLOSED);
  return Math.min(1, Math.max(0, t));
}

// Exponential moving average smoother — raw landmark data is jittery
// frame-to-frame, this keeps growth/bloom feeling smooth instead of jumpy.
// Call the returned function once per frame with the latest raw value.
export function createSmoother(alpha = 0.25) {
  let value = 0;
  return (target) => {
    value += (target - value) * alpha;
    return value;
  };
}
