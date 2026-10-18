# Local hand tracking assets

MediaPipe Tasks Vision 0.10.21 from https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-0.10.21.tgz. vision.js is the upstream ESM bundle transformed to a classic IIFE named SquishyVision using esbuild (no source behavior changes). The classic worker supports MediaPipe’s importScripts-based WASM loader.

Hand Landmarker float16 model, version 1, from https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task.

Upstream: https://github.com/google-ai-edge/mediapipe. Included LICENSE is the upstream Apache 2.0 license and notice. All runtime assets are served from this app, never a CDN.

SHA-256:
- LICENSE: 8707eef0533987efc5b155d64761eeb6e20793f50b9bd1a68dad1cf4719d0ed8
- hand_landmarker.task: fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1
- vision.js: c7953dfd12ab8ae80a39cdf2f1f693f4ca06769151a75eba73a46656884b4d1a
- wasm/vision_wasm_internal.js: 4a97e2520ba506c680ecd6ba6acfb146888afa0e2746d57f205352bc6ebb82eb
- wasm/vision_wasm_internal.wasm: f00ec4731faa23b3e714d00e88d4d10e2df5c0a427d3a2b4ae6e3526fdd14ef7
- wasm/vision_wasm_nosimd_internal.js: 927def7b465c51b86e4b3060f93646aca4e27121f4b8fc0483786e407ea9cf1f
- wasm/vision_wasm_nosimd_internal.wasm: 3821ea9b1f7fb8c549ef2a064ef5c85750bf375c545a49fd6eea0df44a95f1f4
