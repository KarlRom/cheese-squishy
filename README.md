# Cheese, please.

[Open the live squishy](https://karlrom.github.io/cheese-squishy/) · [GitHub repository](https://github.com/KarlRom/cheese-squishy)

A complete mobile-first browser squishy on a pure white background. A rounded 3D cheese cube with sculpted pores on every face, perspective, self-shadowing, free view rotation, local dents, soft dragging, two-finger compression, and deliberately slow, non-oscillating recovery.

## Run locally

No install, bundler, account, API key, or internet connection is required. Three.js is included under `vendor/` with its MIT license.

1. Extract the ZIP and open a terminal in the `cheese-squishy` folder.
2. Start a static server:

   ```sh
   python3 -m http.server 8000 --bind 0.0.0.0
   ```

3. Visit **http://localhost:8000** in a recent Safari, Chrome, Firefox, or Edge with WebGL 2 and hardware acceleration enabled.
4. Stop the server with **Ctrl+C** when finished.

Use a static server rather than double-clicking `index.html`: browsers restrict JavaScript module imports on `file://` URLs. Any static hosting service will also work. If port 8000 is busy, choose another port and use that number in the URL.

## Try it on a phone

- Connect the computer and phone to the same trusted Wi-Fi.
- Find the computer's local Wi-Fi IP in its network settings (for example, `192.168.1.20`).
- While the local server runs, open **http://YOUR-COMPUTER-IP:8000** on the phone. `localhost` on your phone means the phone itself, not your computer.
- Allow Python through the computer's local-network firewall if prompted. Guest Wi-Fi/client isolation may prevent devices connecting; a hosted HTTPS page avoids that restriction.
- Press directly on the cube and hold. Drag the same finger to pull the material. Put two fingers on the cube and bring them together to compress it. Up to four simultaneous contact points are supported.
- The interactive canvas disables page gestures only inside its area; outside it, normal page scrolling and browser zoom remain available.

The visible interface contains only the cheese and essential controls. Instructions and status announcements remain available to screen readers; the settings panel starts closed.

## Controls and accessibility

- **Rotate 3D:** switch modes, then drag with one finger or the mouse to turn the cheese through 360° horizontally and tilt to inspect the top and underside. There is no automatic spinning or inertia. Rotation changes the view around the same live 3D mesh, so your dents remain on the correct faces.
- **Tap rotation alternatives:** in Rotate mode, use the left/right/up/down buttons or focus the canvas and use arrow keys. **Reset view** restores the initial camera angle without removing dents.
- **Squish:** switch back to press or pinch whichever face is now visible. Dragging the white area around the cube also rotates the view in Squish mode. On desktop, Shift-drag or right-drag turns the view directly.

- **Press and hold:** a localized dent deepens over roughly two seconds. Supported stylus/finger pressure adds depth; ordinary touch and mouse work without pressure hardware.
- **Drag:** pulls the contacted patch of material. A pointer stays captured even when it leaves the cube.
- **Pinch inward:** compresses along the two fingers' screen-space axis. Start both contacts on the cube. Moving outward releases the squeeze rather than zooming the scene.
- **Give it a squeeze:** one tap makes a broad squeeze and releases it automatically. Useful without precise gestures.
- **The feel:** opens a small panel with squish resistance and recovery speed. Settings persist in this browser when local storage is available.
- **Sound:** enabled by default after your first squeeze. In **Settings**, switch sounds off or adjust volume; preferences are saved locally. Live filtered textures and gentle bubble-like squelches respond to pressure changes, dragging speed, pinch motion, and release. Stationary holding becomes quieter; recovery does not make continuous noise. Keyboard and tap squeezing also produce sound.
- **Reset:** immediately restores the mesh and starting view, retaining your feel settings and selected interaction mode.
- **Keyboard:** Tab to the canvas; hold Space or Enter to squeeze. In Squish mode, arrow keys move and briefly activate a front-face press; in Rotate mode they turn the view. R resets when the canvas is focused. Tab to the separate squeeze/reset buttons for ordinary button operation. Escape closes settings. Sliders support standard keyboard input.
- **Reduced motion:** the system preference removes the whole-cube squeeze animation; direct local deformation remains available. There are no idle motions or automatic camera movements.
- Controls have accessible names, visible keyboard focus, and status announcements. No vibration, trackers, analytics, microphone access, or audio downloads are required.

## Deploy to GitHub Pages

1. Create a GitHub repository, then upload **the contents of `cheese-squishy/`** to the repository root. Keep `vendor/` and all other subfolders intact. `index.html` must be at the root of the publishing folder, not inside an extra nested folder.
2. Commit the files to your default branch, usually `main`.
3. In the repository, go to **Settings → Pages → Build and deployment**.
4. Choose **Deploy from a branch**, select `main` and **/ (root)**, then save. These steps follow [GitHub’s publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
5. Wait for GitHub's Pages deployment to finish. Open the URL **GitHub displays** in Pages settings, including on your phone.

All asset imports are relative, so both account sites and repository subpath sites work. `.nojekyll` keeps this a plain static site. No custom domain, secrets, build action, or server backend is needed. If you use a private repository, GitHub Pages availability depends on your GitHub plan and repository settings.

GitHub Pages provides the public deployment URL in the repository’s **Settings → Pages** after publishing succeeds. A localhost preview is only on your computer; same-Wi-Fi preview works only while your local server is running.

## How the squishy works

- Six dense surface grids are welded into one indexed, seamless mesh before rounding. Mobile uses 64 subdivisions per edge (24,578 unique vertices); larger viewports use 80 (38,402 unique vertices).
- Pores are geometric recesses, not flat decals. All faces mix rotated ovals, deep pockets, shallow bowls and tiny dimples, with subtly irregular outlines and smoothly rolled mouths. Recess colors add a restrained ambient-occlusion cue. Their walls, surface shading, and the rest of the mesh all deform together.
- Ray casting finds the touched triangle; barycentric coordinates map that point back to the original material. Each contact applies a Gaussian indentation, tangential pull, and a soft displaced rim. Two fingers also apply broad axial compression with transverse bulging.
- `physics.js` stores a displacement field at every vertex. Loading approaches a bounded deformation; unloading uses a first-order exponential relaxation without a velocity state or spring. There is no elastic overshoot or bounce. Default relaxation time is about 53 seconds: about 160 seconds for 95% recovery. The slider covers 6–90 second time constants, or about 18–270 seconds for 95% recovery.
- This is an intentionally controlled viscoelastic surface approximation, not a calibrated volumetric material simulation. Displacement limits keep intense gestures stable; extreme gestures may still look stylized. It cannot reproduce physical touch feedback through a screen.
- Smooth vertex normals update with deformation. Perspective, studio lighting, real-time self-shadowing, soft material highlights, cavity shading, smooth satin surface highlights, and a feathered contact shadow create the tactile appearance against pure white.

## Sound

`sound.js` synthesizes audio locally using the Web Audio API: damp filtered noise, two moving wet resonances, and short granular peel sounds. Pressing makes a low viscous squelch; dragging adds irregular tacky texture; releasing pulls apart a few short sticky strands. There are no pitched bubble oscillators. These are designed squishy effects, not recordings of a physical toy. The graph starts/resumes inside a deliberate user gesture, following [Web Audio autoplay guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices#autoplay_policy). A smoothed master volume and compressor control transients. Audio pauses when the tab is hidden or the window loses focus and resumes with the next manipulation.

If you cannot hear it, check **Settings → Sound**, its volume slider, device/media volume, and the browser's site-mute setting, then tap **Squeeze**. Device/browser audio policies can vary. The visual squishy still works without Web Audio support.

## Performance and checks

The app targets display refresh with `requestAnimationFrame`, caps pixel ratio at 1.8, uses fewer vertices on small screens, skips mesh/render work when settled, and suspends animation when hidden. Rendering performance varies by phone/GPU; 60 fps is a target, not a guarantee. No real-device multi-touch or device-specific 60 fps claim is made.

JavaScript syntax and seven numerical physics tests were checked during development. Narrow-screen browser QA covered rendering, a held local press, automatic squeezing, reset, the settings panel, drag rotation, tap rotation controls, view reset, and pressing a face after turning the view. Eight real browser audio signal checks also passed: gesture unlock, press output, drag response, mute, unmute/pinch, release silence, reset-tail cleanup, and suspension. The app sound switch and volume control were checked in the browser. Physical phone multi-touch and device audio behavior should be tested on your target devices.

To rerun the numerical checks with Node.js 20+:

```sh
node --test tests/physics.test.js
```

For real Web Audio output checks, run the local server and visit **http://localhost:8000/tests/sound.html**, then click **Run audio checks**. It checks gesture unlock, audible signal generation, drag response, mute, unmute/pinch, release silence, reset-tail cleanup, and suspension.

The numerical tests cover localized deformation, monotonic release, resistance and recovery behavior, pinch direction, stress/floor/reset stability, and frame-rate-independent release.

## Files

- `index.html` — accessible page and controls
- `styles.css` — responsive white layout
- `app.js` — mesh construction, rendering, ray casting, gestures, and UI
- `physics.js` — standalone deformation solver
- `sound.js` — live gesture-driven procedural squishy audio
- `vendor/three.module.js` — pinned Three.js 0.170.0
- `vendor/THREE-LICENSE.txt` — Three.js MIT license
- `tests/physics.test.js` — numerical verification
- `icon.svg` — local favicon

For changes, edit the source files and refresh the browser. There is no build step.
