// Requests camera access and wires the stream into the given <video> element.
// Camera access requires HTTPS (or localhost) — browsers block it on plain HTTP.
export async function startWebcam(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: "user" },
    audio: false,
  });

  videoEl.srcObject = stream;

  // Wait for the video to actually have dimensions before we start
  // feeding frames into the hand tracker.
  await new Promise((resolve) => {
    videoEl.onloadedmetadata = () => resolve();
  });

  await videoEl.play();
  return stream;
}
