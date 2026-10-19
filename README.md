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
- **Reduced motion:** the system preference removes the whole-cube squeeze animation; direct local deformation remains available. There are no idle motions. Pickup, drop and selection transitions are skipped with reduced motion.
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

## Bedroom opening (2.5.0)
The selected toy starts on a light oak table in an offline 3D bedroom. Tap the toy, press Enter/Space on the canvas, or use Pick up. A 1.45-second lift fades the room into the white squishing view. Reduced motion skips the lift. The table icon returns the toy to the room and resets its shape. Both toys share this flow; switching and deformation are paused during pickup.

## Sliding choices and Drop (2.6.0)
Choosing another squishy slides the current toy out and the new one in, in the direction of the selector. Touch deformation and repeat changes are paused during the transition. Drop returns the held toy to the table with a soft, non-bouncing landing and preserves its current deformation. Reduced motion skips both transitions.

## Optional Hand mode (2.7.0)

Open Settings → Enable hand mode and allow the front camera. Move the on-screen dots over the toy. Pinch thumb and index finger to grab/dent it, move the pinch to pull, close a hand to squeeze, and open it to release. Each gripping hand independently dents or pulls its own fingertip-sized attachment. A pinch on the table toy picks it up. Touch/mouse controls remain available and take priority during direct input. Camera gestures affect the toy in Squish mode; use the normal controls to rotate, switch toys or drop.

The mirrored preview has an × button to stop the camera. No microphone is requested, no video is recorded, and no camera frames or hand landmarks are uploaded. Processing runs in a local Web Worker using bundled MediaPipe Tasks Vision 0.10.21 and hand_landmarker model version 1. The library, two WASM variants, and model total approximately 26 MB, loaded only when Hand mode is enabled. The browser may cache these assets. No CDN is used at runtime. Native assets are packaged offline.

Serve over HTTPS (GitHub Pages) or localhost; opening index.html directly will not support camera/worker loading. Permission denial, unavailable cameras, model/worker failure and cancellation release resources and leave touch controls available. Lost/stale tracking releases the current press. Camera processing stops on leaving the page or when the app is backgrounded. Camera permission may need to be allowed in Safari or the operating-system settings.

Hand squeeze strength is estimated from finger spacing and curl, not measured physical pressure. Lighting, occlusion and device speed affect reliability. Tests cover synthetic landmarks and mocked camera/worker lifecycle; real camera accuracy, Safari/WKWebView compatibility and iPhone performance require device testing.

## Fingertip physics (2.8.0)
Touch, mouse, keyboard, and Hand mode now use compact fingertip contacts rather than broad palm deformation. Presses make smaller dents with independent shoulders; dragging lifts and stretches a small sticky attachment. Releasing keeps the same very slow, non-bouncing recovery. Two fingers or two camera hands act independently, without scaling the entire mesh. Camera closure strengthens the fingertip press and keeps its cursor between the index finger and thumb. The Squeeze button keeps its six styles, with smaller contact areas and greatly reduced whole-toy compression.

## Gravity and rolling (2.9.0)
Drop releases the toy under gravity with gentle sideways momentum and rotation. It lands without a bounce, compresses slightly on impact, and rolls or tips until friction stops it. Support height uses every vertex of the current deformed mesh; a sampled soft contact patch determines the supporting torque. The pearl has lower rolling resistance, while the cheese tends to settle onto a flatter face. This is a lightweight coupled approximation of rigid motion and the existing viscous mesh, not a full volumetric soft-body solver.

The landing shadow follows the toy and becomes stronger as it approaches the table. Tap the moving or resting toy, or Pick up, to lift it smoothly from its actual position and orientation. Reduced motion places the toy at rest immediately. A camera pinch must be released after Drop before it can pick the toy up again. Existing fingertip dents remain intact.

## Gentler fingertip response (2.9.1)
Fingertip press depth, drag strength and outward pull are scaled to 85% of their previous values. Contact footprint, slow recovery, and table gravity/rolling are unchanged.

## Ten fingertip previews and multi-hand input (2.10.0)
Hand mode now returns five separate fingertip positions per hand (up to two hands). Move fingertips over the toy: outline dots preview the surface location, filled dots indicate an active press, and gold/lavender distinguish the two tracked hands. Preview points attach to actual mesh triangles and move with their deformation. The camera inset shows the full finger skeleton.

Curl individual fingers to press. Pinch thumb and index finger and move to stretch; unpinched curls press without making large accidental pulls. Overlapping contact points share pressure rather than stacking the same dent repeatedly. The previous 15% gentler fingertip response is retained.

Detection uses adaptive smoothing, gesture hysteresis, handedness plus palm-position assignment, brief identity retention for reacquisition, a higher-resolution camera request, and an adaptive inference cadence. Detailed mesh ray tests are limited to two per rendering frame and staggered across fingertips; active grabs retain their precise surface attachment. Hover dots can update over several frames when all ten fingers are present. Camera processing and all landmarks stay on the device.

This improves the input pipeline; it does not turn the camera into a force sensor or provide measured finger-to-object depth. Strength and intent remain estimates from finger shape. Real camera accuracy, occlusion behavior, and phone performance still require device testing. Automated checks use synthetic hand poses and mesh attachments.

## Easier squeeze and scrunch gestures (2.11.0)
Hover your fingertips over the toy, then loosely close two or more fingers to squeeze. Filled surface dots stay attached as fingers curl; opening your hand releases them. Recent real hover hits can become grips for 400ms, so closing fingers need not stay precisely over the same pixels. No contact is created if fingers never touched the model preview.

Multi-finger scrunches gather local surface patches inward with bounded tangential motion and smooth strength changes. They do not create outward pull or whole-object collapse. Thumb/index pinching still pulls its small attachment region. Each tracked hand has its own contact group; overlapping fingertips share pressure. The prior 15% gentler response and slow non-bouncing recovery remain. Camera strength is inferred from curl, not measured force. Live camera and iPhone evaluation remain necessary.

## Ignore folded fingers (2.12.0)
Curled-in fingertips are excluded from surface previews, contact acquisition and existing grips. This includes a thumb folded into the palm. Opening a finger restores its target with a wider reopening threshold to prevent flicker. Camera skeleton lines remain visible for tracking context, but folded fingertips have no endpoint dot or surface dot. Filtering happens before ray tests and clears their recent-hit cache, so closing a finger cannot reuse a stale hit. Pinching requires two eligible thumb/index targets.

Mild bends can still squeeze, while fully curled fingers release their individual contacts immediately. A fully closed fist produces no finger contacts. Depth-aware landmark distances reduce accidental folded classification when a finger points toward the camera. Camera accuracy still requires real device evaluation.

## Thicker rubber response (2.13.0)
Pinching and pulling now recruits a wider rounded shoulder in the surrounding material. Extension meets progressive resistance and saturates sooner, with less outward lift, to avoid thin sharp peaks. The contact center remains fingertip-sized when pressing; the supporting region broadens during pulling. Scrunch gathers retain their inward movement and normal touches retain their gentler strength. Slow recovery remains unchanged. This is a visual viscoelastic approximation rather than a layered finite-element material simulation.

## Camera bites (2.14.0)
Enable Camera mode in Settings, pick up a toy, and align your mouth over its surface in the main view. Open your mouth for about a quarter second (the mouth outline in the camera preview changes color when armed), then close it. A small surface dot previews the bite target. Both the open target and closing mouth must overlap the toy; gestures off the toy, during rotation, while it is on the table, or during a transition do not stamp it. Short lip movements, stale tracking, a missing face, long holds and repeated closed-mouth frames do not trigger bites. The cooldown is 900ms and another opening is required. Talking can still resemble a bite: intent and jaw pressure are estimates.

A bite briefly compresses the rubber and draws two curved dental arches together, gradually forming twelve shallow rounded tooth impressions wherever the rays hit actual geometry. Partial edge bites require at least four tooth hits. Marks use material-space vertex displacement and mesh normals, remain through slow recovery, and follow the toy when rotated or switched. Reset clears the current toy's marks. Repeated marks are bounded to prevent deep collapse; no chunks are removed. No sharp teeth or flat decal overlay is added.

Hand and face detection run in the existing local worker with one outstanding camera frame. Face Landmarker v1 adds approximately 3.6MB of bundled assets. If the face model fails, hand controls remain available. Enabling camera mode now processes hands and mouth landmarks locally; no identity recognition, uploads, recording or microphone is used. All processing stops when camera mode is disabled or the app is backgrounded. See https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js for the upstream API.

Automated validation covers synthetic mouth sequences, cancellation/rearming, bounded and persistent mesh impressions, reset, and worker degradation. Actual mouth tracking, camera framing, phone performance and visual feel still require physical-device testing. The iOS project has not been compiled or signed in this environment.

## Stricter folded-finger exclusion (2.15.0)
The prior weighted curl estimate could accept a folded tip if the other measurements or estimated depth looked extended. Eligibility now has independent hard vetoes for tips inside the projected palm and bends at both distal joints, with a stricter curl threshold. Excluded fingers contribute neither contacts nor group squeeze strength. Folding releases immediately, clears that tip's recent-hit cache, and hides both its dot and finger bones in the camera overlay. A previously hidden fingertip must be clearly extended for three consecutive detection frames before it can reappear or pinch.

This is deliberately conservative: an occluded or foreshortened finger projected inside the palm is ignored even if estimated depth suggests extension. Keep fingertips visibly outside the palm for interactions. Mild bends outside the palm can still squeeze. Hand landmarks remain model estimates; real webcam testing is still required. Regression fixtures now include full joint chains, hooked fingers with long wrist distances, misleading depth, rolled/mirrored fists, and one-frame reopening glitches.

The bite target now uses a small oval mouth/teeth outline, distinct from round fingertip dots. It may remain visible when fingers are folded because it follows the mouth, not the fingers.

## Lighting presets (2.16.0)
Settings → Lighting offers Daylight, Dim, Sunset, and Cozy night. Presets change the actual hemisphere, key/fill colors and intensities, key direction, reflection strength, exposure, window appearance and bedside lamp glow. The minimal page and white background remain white. Daylight is the default; the choice is saved with existing preferences and restored on reload. Both toys inherit the current light, including during selection and pickup/drop transitions.

Changes blend over a short fade; reduced-motion users get immediate changes. Environment maps are reused, with no new image downloads or live rebaking. Cozy night illuminates the bedroom's bedside lamp and keeps a soft warm key on the held toy. The browser select supports keyboard and native mobile selection. Automated checks cover preset behavior, transitions, safe fallback and newly created toys; rendered appearance and mobile device performance still need visual testing.

## Camera depth gestures (2.17.0)
Enable Camera mode with your hand at a comfortable neutral distance. Move visible extended fingertips over the toy's preview dots. Moving the hand closer makes its palm appear larger and presses those contacts inward. Pinch thumb/index to grab, then move the hand farther from the camera to pull the attachment outward. Returning toward the camera presses it back in; opening the pinch releases it. Sideways camera motion stays tangential, with outward lift controlled by depth. Mouse/touch behavior is unchanged.

Depth uses projected palm width and wrist-to-middle-knuckle length rather than fingertip spread. Both dimensions must change consistently; one-axis foreshortening from a hand turn is rejected. A smoothed logarithmic size ratio, dead zone and hysteresis suppress idle jitter. Each hand has its own neutral reference and every pinch captures a fresh pull reference. Tracking loss, clipped palms or camera aspect changes reset depth; curled-finger eligibility still takes priority.

This is relative apparent-size inference from one camera, not measured distance or force. Keep a similar hand angle and the whole palm in frame. Finger-only movement without a palm size change cannot provide reliable depth. Pulls retain the broad, thick-rubber response and soft limits. Automated tests cover near/far direction, regrabbing, jitter, rotation rejection, tracking interruption and normal-direction mesh response. Actual camera feel and phone performance require device testing.

## Larger oak desk (2.17.1)
The main desk is about 35% wider and deeper, with a 2.5× thicker top and sturdier repositioned legs. Its upper surface stays at the same height so pickup, shadows, drop and rolling contact remain aligned.

## Jaw-based bites and more usable hand tracking (2.18.0)
Bites now require the Face Landmarker jaw-opening expression channel rather than lip gap alone, corroborated by lower-face/chin contraction when available. Resting jaw bias calibrates from relaxed closed-mouth frames. Open the jaw briefly, then bring the teeth together; the lips may remain parted. Closing just the lips while holding the jaw open does not trigger a bite. The mouth target and camera mouth outline are hidden when the jaw is closed. The closing frame may still complete an already armed bite. This estimates jaw closure; the model does not detect tooth surfaces or verify actual dental contact. Missing jaw expressions disable bites instead of falling back to lip closure.

Hands run on every submitted frame, while face/expression inference is rate-limited to at most one update per 120ms. The single-frame queue is preserved; intermediate hand-only results do not erase jaw state. Hand acquisition thresholds are closer to upstream defaults, and hand identity/depth continuity tolerates slower frames. Capture timestamps drive gesture timing. Late frames are discarded with feedback. These changes protect cadence but actual frame rate depends on hardware.

Folded tips inside the actual projected palm remain excluded. A polygon follows the palm outline, avoiding the old broad rectangular mask. Deliberate curved thumb/index pinches outside the palm are eligible; ordinary folded/hooked fingers remain filtered. Two clear observations restore a previously hidden fingertip, reducing the prior three-frame delay. The overlay uses the source hand index, so rejecting one hand cannot hide the other hand's preview.

Camera preview shows hand/fingertip counts. Recenter hands resets both gesture references while leaving camera permission and the worker running; hold a comfortable neutral pose, tap it, then move closer to press or pinch and retreat to pull. Camera frames and facial expressions remain local, without recording, uploads or identity recognition.

101 automated checks exercise jaw versus lip closure, closed-mouth previews, throttled face updates, pinch eligibility, slow-frame continuity and recentering, along with the existing physics. These are synthetic and mocked pipeline checks; real-camera accuracy, tooth-contact timing and iPhone performance still require device testing. Upstream expression channels: https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/drawing_styles/face_landmarker/Blendshapes.

## Lighting-matched backgrounds (2.19.0)
The page, WebGL clear color, room fog and supported browser theme color now follow the lighting preset: white Daylight, cool gray Dim, peach Sunset and deep plum Cozy night. Backgrounds blend with the existing light transition and follow the saved lighting choice. Pickup/drop fog uses the current background color. Controls keep readable light panels and night-mode text contrast. This supersedes the earlier always-white background behavior.

## Sustained expressive grips (2.20.0)
A confirmed camera pinch or press has no gesture-duration cutoff. Keep holding and the material continues creeping into a deeper, wider dent or a longer, broad-shouldered pull. Further hand movement continues to control it. Mouse/touch holds gain the same sustained deformation. Soft strain limits remain to preserve thick rubber and prevent unlimited collapse; creep gradually approaches those limits rather than stretching forever. The prior 15% gentler response and slow non-bouncing recovery remain.

Brief ambiguous pinch spans preserve an existing pinch for up to 180ms and keep its depth reference. A clear wide opening or tips folded into the palm releases immediately. An already attached contact can retain its last confirmed load for up to 650ms of missing-hand detections; it cannot create new grabs or increase creep while missing. A longer loss, camera stop, mode switch, reset or recenter releases it. Nearby reidentified hands cannot duplicate an old held load. Recenter explicitly clears retained contacts. Camera stalls still have the normal stale-frame failsafe.

Sustained pressure and stretch recruit a broader region over several seconds, increasing attainable depth and pull without a narrow membrane effect. The maximum mesh-displacement guard is unchanged. Existing bite impressions, lighting and one-shot Squeeze profiles retain their behavior. Automated checks cover hold duration, creep progression, frame-rate agreement, broad shoulders, non-folding sample vertices, release recovery, uncertain pinches and dropout expiry. Real-camera feel and mobile performance still require device testing.

## Exaggerated held camera contacts (2.21.0)
Sustained camera pokes and pulls progressively deepen or extend farther, with a rounded fingertip cap and supporting shoulder to keep the rubber thick. Brief touches retain their gentler response. The hold remains active until gesture release; tracking-loss safeguards still apply. Soft strain limits protect the mesh, and recovery remains slow and overdamped. Automated synthetic contact checks cover amplitude, cap thickness, locality and release; real webcam and signed-device feel require device testing.

## Wall lighting moods (2.22.0)
The shared plaster on both room walls smoothly changes with the lighting: ivory daylight, cool blue-gray dim, peach sunset, and muted mauve cozy night. Returning to daylight restores the original plaster color.

## Persistent thick camera grips (2.23.0)
Thumb and index now share one persistent material attachment instead of dividing pinch strength across overlapping contacts. Its anchor persists until release and survives a tracked fingertip visibility swap. Held camera contacts transport a finger-width cap plus a smoothly supported column of nearby material; the opposite side stays outside the deformation support. Depth travel remains expressive beyond the old normalized gesture ceiling. Closer hands deepen finger pokes, and retreating pinches stretch outward. This is a volume-shaped deformation field, not a full volumetric rubber solver. Soft limits and tracking-loss safeguards remain. Synthetic tests cover merged grips, anchors, extended depth, thick caps and release; real camera feel still requires device testing.

## Deep finger-sized held pokes (2.24.0)
Holding a stationary click, touch, or camera poke progressively forms a deep indentation with a finger-width rounded bottom and compact supporting rim. Dragging transitions back to the thick stretch field. Release retains slow recovery. Synthetic tests check click/camera depth, width, locality and monotonic release; real device feel needs testing.

## Smaller poke craters (2.25.0)
Held click, touch and camera pokes retain their depth with a narrower rounded bottom and a one-third smaller surrounding crater radius. Pull grips retain their wider support.

## Long cheese-pull strands (2.26.0)
Camera pinch-and-retreat and pointer drag now generate a dedicated 64-ring, 24-sided stretch mesh. It maintains a finger-thick shaft and rounded cap, with a flared root buried into the body and a matching material. Travel can reach six cube half-widths; the main body supplies a small rooted shoulder instead of carrying the entire extension. Held creep adds length, and release retracts slowly without bounce. Reset and toy switching dispose the added meshes. New contacts target the original body mesh; the strand is a visual extension rather than a separate grabbable soft body or a full collision/volume simulation. Automated geometry tests cover length, thickness, outward faces, finite normals and release; visual and real-camera testing remain unverified.

## Stretch-smoothed bite marks (2.27.0)
Local stretching gradually fades tooth impressions in the affected patch over several seconds, including long strand pulls. Untouched marks remain intact, and idle recovery or compressive pokes do not erase them. Automated checks cover locality, gradual fading and frame-rate independence.

## Tamer cheese pulls (2.28.0)
Pointer and camera strands now use roughly half the previous extension, a three-half-width travel cap, and gentler loading. Finger-thick shafts, slow release, and stretch-smoothed bite marks are retained.

## Compact tapered pulls (2.29.0)
The cylindrical shaft is replaced with a continuously narrowing, slightly flattened stretched patch, a broader rooted connection, and a smaller rounded grip. Extension gains are reduced again with a 1.6-half-width cap. Slow release and local bite-mark smoothing remain. Shape checks cover taper, finite normals and bounded travel; visual realism still requires device review.

## Independent stretch lifetimes (2.30.0)
Each pointer grab and camera pinch receives a fresh stretch identity. Active grips and released, recovering shapes have separate lifetimes, preventing later grabs from moving an old extension. New geometry emerges gradually along the requested pull direction, with the body deformation blended into the added shape rather than switching abruptly. Recovery shrinks the shape nearly flush before disposal. Regression checks cover reused device IDs, fresh pinch identities and small first-frame geometry.

## Connected surface pulls (2.31.0)
Removed the separate strand meshes. Pointer and camera pulls now deform only the original connected squishy surface, with a restrained camera grip extension and broad smooth support. Deep pokes, persistent grip anchors, slow recovery and local bite-mark smoothing remain. Regression tests check connected vertex continuity, ordered surface vertices and restrained actual camera-grip displacement. Visual appearance remains unverified on-device.

## Dense reference-video feel (2.32.0)
Updated the existing connected-mesh implementation from the three supplied reference clips: deep retained finger dents, short folded edges and dense whole-hand compression. Production contacts reduce outward pull and tangential tensile travel by 65 percent, without reducing poke depth or inward scrunch gathering. Two or more attached fingers in a non-pinched closing hand engage broad cube compression; button squeeze macros also use stronger compression. Shallow localized crease fields accompany gathering and full-hand pressure. Default recovery time is about 102 seconds per exponential time constant, retaining about 91 percent of a dent after ten seconds, with no velocity or rebound. White daylight presentation, mobile touch, connected geometry and slow bite-mark smoothing remain. This remains a deformation approximation, not a volume-conserving skin-and-filling solver. Automated tests cover tension reduction, retained dents, compression eligibility and monotonic release; in-app camera/visual behavior still requires device verification.

## Pull reduction adjusted (2.33.0)
Pull and tensile drag now retain 80 percent of the pre-reference-tuning response (20 percent reduction instead of 65 percent). Dense compression, folds, dent depth and slow recovery are unchanged.

## Calmer camera gestures (2.34.0)
Camera mode waits for a fingertip to hold steady over the squishy for about a quarter second before starting a press, pinch, or pickup. Moving across the frame, leaving the surface, losing tracking, or releasing the gesture resets this short hold. Approaching with an open palm no longer presses all visible fingers; approach pressing requires a pointed index, while curled fingers and deliberate pinches keep their existing interactions. A new pinch measures pulling from the moment the grip engages, so earlier hand movement cannot produce an immediate outward jerk. The camera remains an estimate of intent rather than a pressure sensor.

## Camera wrist rotation (2.35.0)
With the toy picked up and Camera mode on, hold one open hand upright with four fingers pointing up for a moment, then twist your wrist to turn the squishy. Translation across the camera view does not rotate it. Lower or curl the hand to release rotation and resume fingertip squishing. Sudden tracking jumps are ignored, and the pose suppresses accidental pokes while it is held.

## Smooth camera rotation (2.36.0)
Wrist rotation now follows a filtered angular speed on every display frame instead of jumping once per camera sample. It eases into a twist and briefly coasts as the wrist stops or the pose is released. Tracking gaps and abrupt landmark jumps still do not add spin.

## Vertical camera rotation (2.37.0)
Keep an open hand upright in Camera mode. Twist the wrist side to side for horizontal rotation, or tilt the palm toward and away from the camera for vertical rotation. Both axes use smooth, bounded motion with a brief coast. The vertical gesture uses landmark depth, so a clear view of the wrist and knuckles helps.
