import { startWebcam } from "./webcam.js";
import { createHandTracker, detectHands } from "./handTracker.js";
import { pinchStrength, createSmoother } from "./gestures.js";
import { createGrowthState, updateState } from "./state.js";
import { generateTree, drawTree, drawBloomCluster } from "./tree.js";
import { drawSkeleton, drawGauge, landmarkToScreen } from "./handOverlay.js";

const video = document.getElementById("webcam");
const sceneCanvas = document.getElementById("scene");
const sceneCtx = sceneCanvas.getContext("2d");
const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");

const GROWTH_COLOR = "#4d94ff";
const BLOOM_COLOR = "#ff6b6b";
const WRIST = 0;

function resizeScene() {
  sceneCanvas.width = window.innerWidth;
  sceneCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeScene);
resizeScene();

const tree = generateTree(7);
const state = createGrowthState();
const smoothRight = createSmoother();
const smoothLeft = createSmoother();

// Remembers the last known wrist position so the tree doesn't jump to a
// default spot the instant tracking briefly drops a hand.
let lastRightWrist = null;
let lastLeftWrist = null;

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

  // Slight dark overlay so the glowing tree/flowers pop against the feed.
  sceneCtx.fillStyle = "rgba(0, 0, 0, 0.25)";
  sceneCtx.fillRect(0, 0, sceneCanvas.width, sceneCanvas.height);
}

function loop(now) {
  requestAnimationFrame(loop);

  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  const hands = detectHands(handLandmarker, video, now);

  const rightPinch = smoothRight(pinchStrength(hands.Right));
  const leftPinch = smoothLeft(pinchStrength(hands.Left));
  updateState(state, rightPinch, leftPinch, dt);

  drawVideoBackground();

  const w = sceneCanvas.width;
  const h = sceneCanvas.height;

  if (hands.Right) {
    lastRightWrist = landmarkToScreen(hands.Right[WRIST], w, h);
    drawSkeleton(sceneCtx, hands.Right, w, h, GROWTH_COLOR);
  }
  if (hands.Left) {
    lastLeftWrist = landmarkToScreen(hands.Left[WRIST], w, h);
    drawSkeleton(sceneCtx, hands.Left, w, h, BLOOM_COLOR);
  }

  // The tree grows rooted at the right wrist; falls back to bottom-center
  // until a right hand has been seen at least once.
  const treeOrigin = lastRightWrist || { x: w / 2, y: h - 60 };
  drawTree(sceneCtx, tree, state.growth, treeOrigin.x, treeOrigin.y);

  if (lastLeftWrist) {
    drawBloomCluster(sceneCtx, lastLeftWrist.x, lastLeftWrist.y - 40, state.bloom);
  }

  if (lastRightWrist) {
    drawGauge(sceneCtx, lastRightWrist.x, lastRightWrist.y, state.growth, "Grow", GROWTH_COLOR);
  }
  if (lastLeftWrist) {
    drawGauge(sceneCtx, lastLeftWrist.x, lastLeftWrist.y, state.bloom, "Bloom", BLOOM_COLOR);
  }
}
