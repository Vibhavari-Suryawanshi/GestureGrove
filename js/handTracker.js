// Loads Google's pre-trained MediaPipe Hand Landmarker model and runs it
// against video frames. No training, no server — the model file is fetched
// once from Google's CDN and inference runs locally via WASM/GPU.
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export async function createHandTracker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });
}

// Runs detection on the current video frame and returns
// { Left: landmarks|null, Right: landmarks|null } keyed by the hand as the
// USER sees it on screen.
//
// Note: MediaPipe's handedness label is computed on the raw (unmirrored)
// camera frame, so it's the opposite of what a person sees of themselves in
// a normal "mirror-style" selfie view. We flip it here so "Right" always
// means the hand the user thinks of as their right hand.
export function detectHands(handLandmarker, videoEl, timestampMs) {
  const result = handLandmarker.detectForVideo(videoEl, timestampMs);
  const hands = { Left: null, Right: null };

  result.handedness.forEach((handednessArr, i) => {
    const cameraLabel = handednessArr[0].categoryName; // "Left" | "Right"
    const userLabel = cameraLabel === "Left" ? "Right" : "Left";
    hands[userLabel] = result.landmarks[i];
  });

  return hands;
}
