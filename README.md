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
- **Zoom:** in Rotate mode, spread two fingers to zoom in or bring them together to zoom out. One finger still rotates; lifting either finger resumes rotation without a jump. In Squish mode, two fingers on the cheese retain the original squeeze gesture. A mouse wheel or trackpad pinch over the canvas also zooms when no direct contact is active. Use **+ / −** buttons in Rotate mode, or focus the canvas and press + / −; 0 restores the default zoom. Maximum zoom is **6×** the default view (previously about 1.9×). At close range, optical zoom keeps the camera outside the cheese instead of clipping into it. Zoom is bounded, and Reset view restores the starting angle and zoom.
- **Tap rotation alternatives:** in Rotate mode, use the left/right/up/down buttons or focus the canvas and use arrow keys. **Reset view** restores the initial camera angle without removing dents.
- **Squish:** switch back to press or pinch whichever face is now visible. Dragging the white area around the cube also rotates the view in Squish mode. On desktop, Shift-drag or right-drag turns the view directly.

- **Press and hold:** a localized dent deepens over roughly two seconds. Supported stylus/finger pressure adds depth; ordinary touch and mouse work without pressure hardware.
- **Drag:** pulls the contacted patch of material. A pointer stays captured even when it leaves the cube.
- **Pinch inward:** compresses along the two fingers' screen-space axis. Start both contacts on the cube. Moving outward releases the squeeze rather than zooming the scene.
- **Give it a squeeze:** each tap cycles through six different gestures: side squeeze, palm squash, thumb press, corner fold, front-to-back pinch, and diagonal squeeze. Each ramps in smoothly and releases automatically. Local presses follow the visible face; existing dents recover slowly while the next gesture takes shape. Reset clears deformation without restarting the gesture cycle. Useful without precise gestures.
- **The feel:** opens a small panel with squish resistance and recovery speed. Settings persist in this browser when local storage is available.
- **Sound:** enabled by default after your first squeeze. In **Settings**, switch sounds off or adjust volume; preferences are saved locally. Short, quiet sticky sounds mark contact, pressing and lift-off; movement and deformation stay silent. Holding and recovery stay silent. Keyboard and tap squeezing also produce sound.
- **Reset:** immediately restores the mesh and starting view, retaining your feel settings and selected interaction mode.
- **Keyboard:** Tab to the canvas; hold Space or Enter to squeeze. In Squish mode, arrow keys move and briefly activate a front-face press; in Rotate mode they turn the view. R resets when the canvas is focused. Tab to the separate squeeze/reset buttons for ordinary button operation. Escape closes settings. Sliders support standard keyboard input.
- **Reduced motion:** the system preference removes the whole-cube squeeze animation; direct local deformation remains available. There are no idle motions or automatic camera movements.
- Controls have accessible names, visible keyboard focus, and status announcements. No vibration, trackers, analytics or microphone access are required. The small foley file ships with the app and is fetched from the same host.

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

`sound.js` uses short excerpts of [“Slime” by qubodup](https://freesound.org/people/qubodup/sounds/127449/), a CC0 recording of real sticky slime. The audio is included locally in `assets/sounds/`; there are no third-party audio requests at runtime. See `assets/sounds/CREDITS.md` for source, license and edit details. The app preloads the small WAV and creates/resumes audio after a user gesture.

The audio focuses on short, quiet sticky contact and lift-off sounds. Excerpts are trimmed to about 140 ms for a press and 180 ms for release, at a lower level than the earlier mushy effects. Compression, sliding, holding and recovery do not produce repeated squelches or a background sound. The Squeeze button and keyboard actions get one soft press and one lift-off; direct touch events are deduplicated against animation transitions.

Playback speed varies only ±2%; there are no oscillators, pitch sweeps or noise loops. Soft fades and gentle compression control transitions. This is recorded slime foley trimmed to suggest sticky rubber contact, not a recording of the pictured cheese toy. Audio pauses when hidden and resumes with the next manipulation.

If you cannot hear it, check **Settings → Sound**, its volume slider, device/media volume, and the browser's site-mute setting, then tap **Squeeze**. Device/browser audio policies can vary. The visual squishy still works without Web Audio support.

## Performance and checks

The app targets display refresh with `requestAnimationFrame`, caps pixel ratio at 1.8, uses fewer vertices on small screens, skips mesh/render work when settled, and suspends animation when hidden. Rendering performance varies by phone/GPU; 60 fps is a target, not a guarantee. No real-device multi-touch or device-specific 60 fps claim is made.

JavaScript syntax and fifteen numerical deformation and zoom tests were checked during development. Narrow-screen browser QA covered rendering, a held local press, automatic squeezing, reset, the settings panel, drag rotation, tap rotation controls, view reset, and pressing a face after turning the view. Eleven real browser audio signal checks also passed: gesture unlock, press output, silence during holding and dragging, mute, unmuted contact, release silence, reset-tail cleanup, and suspension. The app sound switch and volume control were checked in the browser. Physical phone multi-touch and device audio behavior should be tested on your target devices.

To rerun the numerical checks with Node.js 20+:

```sh
node --test tests/*.test.js
```

For real Web Audio output checks, run the local server and visit **http://localhost:8000/tests/sound.html**, then click **Run audio checks**. It checks gesture unlock, audible signal generation, silence during holding and dragging, mute, unmuted contact, release silence, reset-tail cleanup, and suspension.

Five zoom checks verify pinch direction, frame-independent scaling, safe limits and degenerate contact spacing. Browser QA checked zoom buttons, wheel zoom and view reset; physical phone multi-touch remains unverified.

The numerical tests also verify that all six automatic squeeze profiles produce distinct stable shapes and that local presses follow alternate visible faces. They cover localized deformation, monotonic release, resistance and recovery behavior, pinch direction, stress/floor/reset stability, and frame-rate-independent release.

## Files

- `index.html` — accessible page and controls
- `styles.css` — responsive white layout
- `app.js` — mesh construction, rendering, ray casting, gestures, and UI
- `physics.js` — standalone deformation solver
- `squeezes.js` — six automatic squeeze profiles
- `zoom.js` — bounded two-finger zoom calculation
- `sound.js` — live gesture-driven recorded foley
- `assets/sounds/` — CC0 recording excerpts and provenance
- `vendor/three.module.js` — pinned Three.js 0.170.0
- `vendor/THREE-LICENSE.txt` — Three.js MIT license
- `tests/physics.test.js` — numerical verification
- `icon.svg` — local favicon

For changes, edit the source files and refresh the browser. There is no build step.

## Pearl squishy (2.2.0)

Use the Cheese / Pearl selector to change toys. Pearl is a welded, smooth spheroid with a physically based clearcoat, subtle thin-film iridescence, and a milky translucent body. Both toys retain their own dents while switching; the selected toy is remembered on this device. Existing rotation, zoom, touch, sound, and six squeeze styles work with both.

Both choices are included for now. `toys.js` separates toy identity and the planned `pearl-coconut-oil` entitlement from rendering. This is a future integration point only: no payment, purchase screen, or secure ownership verification exists. Before selling the native toy, integrate StoreKit with a registered product and verified entitlements, restore purchases, and handle pending/cancelled/revoked transactions. Never use the saved toy preference as proof of payment.
