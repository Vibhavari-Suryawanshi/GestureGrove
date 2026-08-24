import { startWebcam } from "./webcam.js";
import { createHandTracker, detectHands } from "./handTracker.js";
import { pinchStrength, createSmoother } from "./gestures.js";
import { createGrowthState, updateState } from "./state.js";
import { generateTree, drawTree } from "./tree.js";
import { drawMonitor } from "./monitor.js";

const video = document.getElementById("webcam");
const sceneCanvas = document.getElementById("scene");
const sceneCtx = sceneCanvas.getContext("2d");
const monitorCanvas = document.getElementById("monitor");
const monitorCtx = monitorCanvas.getContext("2d");
const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");
const hud = document.getElementById("hud");
const growthFill = document.getElementById("growthFill");
const bloomFill = document.getElementById("bloomFill");

const COLORS = { growth: "#8fbf6b", bloom: "#e8879e", scan: "#8fbf6b" };

function resizeScene() {
  sceneCanvas.width = window.innerWidth;
  sceneCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeScene);
resizeScene();

monitorCanvas.width = 200;
monitorCanvas.height = 150;

const tree = generateTree(7);
const state = createGrowthState();
const smoothRight = createSmoother();
const smoothLeft = createSmoother();

let handLandmarker = null;
let lastTime = performance.now();

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  startBtn.textContent = "Loading model…";

  try {
    await startWebcam(video);
    handLandmarker = await createHandTracker();

    startScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    monitorCanvas.classList.remove("hidden");

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

function loop(now) {
  requestAnimationFrame(loop);

  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  const hands = detectHands(handLandmarker, video, now);

  const rightPinch = smoothRight(pinchStrength(hands.Right));
  const leftPinch = smoothLeft(pinchStrength(hands.Left));
  updateState(state, rightPinch, leftPinch, dt);

  sceneCtx.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);
  drawTree(
    sceneCtx,
    tree,
    state.growth,
    state.bloom,
    sceneCanvas.width / 2,
    sceneCanvas.height - 40
  );

  growthFill.style.width = `${state.growth * 100}%`;
  bloomFill.style.width = `${state.bloom * 100}%`;

  drawMonitor(monitorCtx, video, hands, monitorCanvas.width, monitorCanvas.height, COLORS);
}
