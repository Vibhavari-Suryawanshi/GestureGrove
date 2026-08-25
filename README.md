https://vibhavari-suryawanshi.github.io/GestureGrove/
# Gesture Grove

A single generative plant, growing on your live webcam feed, controlled entirely by your hands.

- **Left hand** — spread your thumb and index finger apart to grow the stems; bring them back together and they shrink back down
- **Right hand** — spread your thumb and index finger apart to bloom the flowers; bring them together and they close back up

Both are direct and fully reversible — the plant follows your current hand pose in real time, it doesn't "remember" or accumulate growth over time.

No backend, no training, no build step — pure HTML/CSS/JS running entirely in the browser.

## How it works

```
Webcam  →  Hand landmark detection  →  Gesture recognition  →  State  →  Plant renderer
```

1. **Webcam** — `getUserMedia` grabs the camera stream directly in the browser.
2. **Hand tracking** — [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) (Google's pre-trained model, loaded from a CDN) finds 21 landmarks per hand and labels each as left/right, entirely on-device.
3. **Gesture recognition** (`js/gestures.js`) — measures the distance between thumb tip and index tip, normalized by hand size, to get a 0–1 "spread" value per hand: 0 when pinched closed, 1 when fully spread apart. No ML training involved, just geometry.
4. **State** (`js/state.js`) — directly ties `growth` to the left hand's spread and `bloom` to the right hand's spread, each frame. If a hand briefly isn't detected, its value just holds rather than snapping to zero.
5. **Rendering** — each frame, the live mirrored video is redrawn as the canvas background, then:
   - `js/tree.js` draws the plant as **one connected structure**: glowing blue branches, rooted at a fixed point on screen, revealed progressively as `growth` increases. A flower bud sits right at every currently-growing tip — closed and thin at `bloom = 0`, fanning open into a full flower as `bloom` increases. Branches split at angles weighted by how many flowers they carry, so flower tips fan out instead of clustering together. Every branch also has a slow, continuous wind sway, and open flowers get a subtle breathing/twinkle pulse — both purely time-driven, so the plant keeps feeling alive even while growth/bloom are holding still.
   - `js/particles.js` draws a soft breathing glow behind the canopy and drifts warm pollen-like particles up and away from the flowers once they're blooming — again continuous, not tied to hand pose.
   - `js/handOverlay.js` draws a small floating gauge bar and a `Grow: 0.XX` / `Bloom: 0.XX` label right in the gap between each hand's thumb and index finger.

The plant itself always lives in the same spot on screen (bottom-left), like a real plant would — only the floating gauges follow your hands around.

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

- `js/gestures.js` — `CLOSE` / `OPEN` thresholds that define the spread range, and the smoothing `alpha`.
- `js/tree.js` — `MAX_DEPTH` (branch levels), the root's branch count and `baseSpread`/`spreadBoost` (how far flowers fan apart) inside `buildNode`, the bud shape/colors in `drawBud`, and the wind-sway amount (`swayDeg`) plus flower pulse/shimmer amounts in `drawNode`/`drawBud`.
- `js/particles.js` — spawn rate, drift speed, and colors for the ambient pollen live in `createParticles`; the background glow's size/opacity live in `drawAmbientGlow`.
- `js/handOverlay.js` — gauge bar size and label font live in `drawGauge`.
- `js/main.js` — the plant's fixed screen position is set in the `drawPlant(...)` call inside `loop()`, and `PARTICLE_PALETTE` controls the ambient particle colors.

## Possible next steps

- Add a few different plant seeds/shapes the person can cycle through.
- Save/share a grown plant, e.g. a screenshot button (would need some form of storage for a gallery — the one place a backend would actually help).
- Swap the recursive branching model for a proper L-system for more varied, botanically accurate shapes.
- Add wind sway using a subtle sine-based rotation offset per branch.
- Use a true "object-fit: cover" crop for the video background instead of stretching, for non-square aspect ratios.

- Let flowers bloom progressively at the *current* growth frontier, not just at final leaf tips.
- Save/share a grown tree (would need some form of storage — the one place a backend would actually help).
- Swap the recursive branching model for a proper L-system for more varied, botanically accurate shapes.
- Add wind sway using a subtle sine-based rotation offset per branch.
