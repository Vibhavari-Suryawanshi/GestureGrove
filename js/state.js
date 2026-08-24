// Tunable feel constants — adjust these to change how responsive growth/bloom feel.
const GROWTH_DEADZONE = 0.15; // ignore tiny pinch noise below this
const GROWTH_RATE = 0.35; // reaches full growth after ~3s of a sustained firm pinch
const BLOOM_DEADZONE = 0.15;
const BLOOM_OPEN_RATE = 0.9; // flowers bloom quickly while pinching
const BLOOM_CLOSE_RATE = 0.25; // and close gently when you let go

export function createGrowthState() {
  return {
    growth: 0, // 0..1 — permanent, a tree doesn't un-grow
    bloom: 0, // 0..1 — reversible, flowers open and close
  };
}

// dt = seconds since last frame, keeps the rates independent of framerate.
export function updateState(state, rightPinch, leftPinch, dt) {
  if (rightPinch > GROWTH_DEADZONE) {
    state.growth = Math.min(1, state.growth + rightPinch * GROWTH_RATE * dt);
  }

  if (leftPinch > BLOOM_DEADZONE) {
    state.bloom = Math.min(1, state.bloom + leftPinch * BLOOM_OPEN_RATE * dt);
  } else {
    state.bloom = Math.max(0, state.bloom - BLOOM_CLOSE_RATE * dt);
  }
}
