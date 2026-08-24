https://vibhavari-suryawanshi.github.io/GestureGrove/
# Gesture Grove

A generative tree you grow and bloom using nothing but hand gestures in front of your webcam. No backend, no training, no build step — pure HTML/CSS/JS running entirely in the browser.

- **Right hand** — pinch (thumb + index finger) and hold to grow the tree
- **Left hand** — pinch to bloom the flowers; release to let them close again

## How it works

```
Webcam  →  Hand landmark detection  →  Gesture recognition  →  State  →  Tree renderer
```

1. **Webcam** — `getUserMedia` grabs the camera stream directly in the browser.
2. **Hand tracking** — [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) (Google's pre-trained model, loaded from a CDN) finds 21 landmarks per hand and labels each as left/right, entirely on-device.
3. **Gesture recognition** (`js/gestures.js`) — measures the distance between thumb tip and index tip, normalized by hand size, to get a 0–1 "pinch strength" per hand. No ML training involved, just geometry.
4. **State** (`js/state.js`) — smooths the pinch signal and accumulates it into `growth` (permanent, like a real tree) and `bloom` (reversible — flowers open and close).
5. **Tree renderer** (`js/tree.js`) — a seeded recursive branching structure is generated once at load, then revealed/animated on canvas according to `growth`, with flowers drawn at branch tips scaled by `bloom`.

A small "tracker monitor" in the bottom-right corner shows the mirrored camera feed with the live hand skeleton overlaid, colored by which hand it is — useful for debugging and for seeing what the model sees.

## Running locally

Camera access requires a secure context (HTTPS or `localhost`) and the code uses ES modules, so you need a local server — opening `index.html` directly as a `file://` URL won't work.

Any static server works, for example:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed `localhost` URL and click **Enable camera**.

## Deploying to GitHub Pages

This is a fully static site, so GitHub Pages needs no configuration beyond enabling it:

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages** → set the source to your default branch, root folder.
3. GitHub Pages serves over HTTPS by default, so camera access works out of the box.

## Tuning the feel

All of these live near the top of their respective files as named constants:

- `js/gestures.js` — `OPEN` / `CLOSED` thresholds that define what counts as a pinch.
- `js/state.js` — `GROWTH_RATE`, `BLOOM_OPEN_RATE`, `BLOOM_CLOSE_RATE` control how fast growth/bloom respond.
- `js/tree.js` — `MAX_DEPTH` (branch levels), the `PALETTE` colors, and the branch spread/length ratios inside `generateTree`.

## Possible next steps

- Let flowers bloom progressively at the *current* growth frontier, not just at final leaf tips.
- Save/share a grown tree (would need some form of storage — the one place a backend would actually help).
- Swap the recursive branching model for a proper L-system for more varied, botanically accurate shapes.
- Add wind sway using a subtle sine-based rotation offset per branch.
