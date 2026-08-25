export function createGrowthState() {
  return { growth: 0, bloom: 0 };
}

// Directly and reversibly ties the plant's state to hand pose each frame:
//   left hand spread  -> growth (stems get longer / more branches unlock)
//   right hand spread -> bloom  (flowers open)
// Both shrink back down immediately as fingers pinch back together.
// If a hand isn't currently visible, pass null for it and its value just
// holds at whatever it last was rather than snapping to zero.
export function updateState(state, leftSpread, rightSpread) {
  if (leftSpread !== null) state.growth = leftSpread;
  if (rightSpread !== null) state.bloom = rightSpread;
}
