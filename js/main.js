import { startWebcam } from "./webcam.js";
import { createHandTracker, detectHands } from "./handTracker.js";
import { spreadValue, createSmoother } from "./gestures.js";
import { createGrowthState, updateState } from "./state.js";
import { generateTree, drawPlant } from "./tree.js";
import { pinchGapPosition, drawGauge } from "./handOverlay.js";
import { createParticles, drawAmbientGlow } from "./particles.js";

const video = document.getElementById("webcam");
const sceneCanvas = document.getElementById("scene");
const sceneCtx = sceneCanvas.getContext("2d");
const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");

const GROWTH_COLOR = "#4d94ff"; // left hand
const BLOOM_COLOR = "#ff6b6b"; // right hand

// Warm pollen/spark colors for the ambient particle drift — independent of
// the per-flower palette in tree.js, kept soft and consistent instead.
const PARTICLE_PALETTE = ["#ffd23f", "#ff9f1c", "#8ac926", "#f15bb5", "#4d94ff"];

function resizeScene() {
  sceneCanvas.width = window.innerWidth;
  sceneCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeScene);
resizeScene();

// `tree` is reassigned (not const) so it can be regenerated with a fresh
// random shape each time growth cycles back up from fully closed.
let tree = generateTree(Date.now());
let wasIdle = true;

const state = createGrowthState();
const smoothLeft = createSmoother();
const smoothRight = createSmoother();
const particles = createParticles();

let handLandmarker = null;
let lastTime = performance.now();

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  startBtn.textContent = "Loading model…";

  try {
    await startWebcam(video);
    handLandmarker = await createHandTracker();

    startScreen.classList.add("hidden");

    lastTime = performance.now();
    requestAnimationFrame(loop);
  } catch (err) {
    console.error(err);
    startBtn.disabled = false;
    startBtn.textContent = "Enable camera";
    alert(
      "Couldn't access the camera or load the tracking model. Check camera permissions and try again."
    );
  }
});

// Draws the live camera feed mirrored and stretched to fill the canvas.
// Stretching (rather than a true "cover" crop) keeps the math simple and
// lines landmark coordinates up 1:1 with on-screen pixels.
function drawVideoBackground() {
  sceneCtx.save();
  sceneCtx.scale(-1, 1);
  sceneCtx.drawImage(video, -sceneCanvas.width, 0, sceneCanvas.width, sceneCanvas.height);
  sceneCtx.restore();

  // Slight dark overlay so the glowing flowers pop against the feed.
  sceneCtx.fillStyle = "rgba(0, 0, 0, 0.25)";
  sceneCtx.fillRect(0, 0, sceneCanvas.width, sceneCanvas.height);
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = now - lastTime;
  lastTime = now;

  const hands = detectHands(handLandmarker, video, now);

  // Left hand's finger spread -> growth. Right hand's finger spread -> bloom.
  // Both are read directly each frame (reversible), not accumulated.
  const leftSpread = hands.Left ? smoothLeft(spreadValue(hands.Left)) : null;
  const rightSpread = hands.Right ? smoothRight(spreadValue(hands.Right)) : null;
  updateState(state, leftSpread, rightSpread);

  // Once the plant has closed all the way down, the next time it starts
  // growing again it gets a brand new random shape.
  if (state.growth < 0.03) {
    wasIdle = true;
  } else if (wasIdle && state.growth > 0.06) {
    tree = generateTree(Date.now() + Math.floor(Math.random() * 100000));
    wasIdle = false;
  }

  drawVideoBackground();

  const w = sceneCanvas.width;
  const h = sceneCanvas.height;

  // Plant is rooted bottom-center. Sized off the larger of width/height
  // (not just height) so on wide landscape frames the branches have enough
  // reach to fan all the way out toward the left/right edges instead of
  // staying bunched in a bubble above the trunk.
  const baseLength = Math.max(w, h) * 0.62;
  const originX = w * 0.5;
  const originY = h * 0.98;

  // Soft breathing glow behind the canopy, and drifting pollen once the
  // flowers are open — both purely time-driven, so they keep the scene
  // feeling alive continuously rather than only reacting to hand pose.
  drawAmbientGlow(sceneCtx, originX, originY - baseLength * 0.55, baseLength * 0.55, state.growth, now);

  drawPlant(sceneCtx, tree, state.growth, state.bloom, originX, originY, baseLength, now);

  particles.update(
    dt,
    originX,
    originY - baseLength * 0.6,
    baseLength * 0.3,
    baseLength * 0.18,
    state.bloom * Math.min(1, state.growth * 3),
    PARTICLE_PALETTE
  );
  particles.draw(sceneCtx);

  if (hands.Left) {
    const pos = pinchGapPosition(hands.Left, w, h);
    drawGauge(sceneCtx, pos.x, pos.y, state.growth, "Grow", GROWTH_COLOR);
  }
  if (hands.Right) {
    const pos = pinchGapPosition(hands.Right, w, h);
    drawGauge(sceneCtx, pos.x, pos.y, state.bloom, "Bloom", BLOOM_COLOR);
  }
}
