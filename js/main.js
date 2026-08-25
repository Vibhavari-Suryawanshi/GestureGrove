import { startWebcam } from "./webcam.js";
import { createHandTracker, detectHands } from "./handTracker.js";
import { spreadValue, createSmoother } from "./gestures.js";
import { createGrowthState, updateState } from "./state.js";
import { generateStems, drawPlant } from "./tree.js";
import { pinchGapPosition, drawGauge } from "./handOverlay.js";

const video = document.getElementById("webcam");
const sceneCanvas = document.getElementById("scene");
const sceneCtx = sceneCanvas.getContext("2d");
const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");

const GROWTH_COLOR = "#4d94ff"; // left hand
const BLOOM_COLOR = "#ff6b6b"; // right hand

function resizeScene() {
  sceneCanvas.width = window.innerWidth;
  sceneCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeScene);
resizeScene();

const stems = generateStems(7);
const state = createGrowthState();
const smoothLeft = createSmoother();
const smoothRight = createSmoother();

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

  // Slight dark overlay so the glowing plant pops against the feed.
  sceneCtx.fillStyle = "rgba(0, 0, 0, 0.25)";
  sceneCtx.fillRect(0, 0, sceneCanvas.width, sceneCanvas.height);
}

function loop(now) {
  requestAnimationFrame(loop);
  lastTime = now;

  const hands = detectHands(handLandmarker, video, now);

  // Left hand's finger spread -> growth. Right hand's finger spread -> bloom.
  // Both are read directly each frame (reversible), not accumulated.
  const leftSpread = hands.Left ? smoothLeft(spreadValue(hands.Left)) : null;
  const rightSpread = hands.Right ? smoothRight(spreadValue(hands.Right)) : null;
  updateState(state, leftSpread, rightSpread);

  drawVideoBackground();

  const w = sceneCanvas.width;
  const h = sceneCanvas.height;

  // Plant is rooted bottom-center and sized relative to the viewport so it
  // fills the screen the same way on any device.
  const baseLength = Math.min(w, h) * 0.62;
  drawPlant(sceneCtx, stems, state.growth, state.bloom, w * 0.5, h * 0.98, baseLength);

  if (hands.Left) {
    const pos = pinchGapPosition(hands.Left, w, h);
    drawGauge(sceneCtx, pos.x, pos.y, state.growth, "Grow", GROWTH_COLOR);
  }
  if (hands.Right) {
    const pos = pinchGapPosition(hands.Right, w, h);
    drawGauge(sceneCtx, pos.x, pos.y, state.bloom, "Bloom", BLOOM_COLOR);
  }
}
