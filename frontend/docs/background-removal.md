# Background removal

`/xoa-phong` automatically runs U2-NetP in a dedicated browser worker with ONNX Runtime Web 1.30.0, WASM and one CPU thread. The server serves static assets only. Image bytes, model inputs and results are not sent to an inference service.

## Assets and provenance

- Model: `public/vendor/background-removal/u2netp-309c8469.onnx`, 4,574,861 bytes.
- SHA-256: `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`.
- ONNX artifact: <https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx>.
- Architecture and upstream weights: <https://github.com/xuebinqin/U-2-Net>, Apache-2.0; license included as `LICENSE-U2NET`.
- Preprocessing reference: <https://github.com/danielgatis/rembg/blob/main/rembg/sessions/u2netp.py> and `base.py`.
- Runtime: <https://github.com/microsoft/onnxruntime/tree/v1.30.0>, MIT; license included as `LICENSE-ONNXRUNTIME`.

The model is checked into Git. Runtime binaries are copied from the pinned npm package by `scripts/prepare-background-removal.mjs` during postinstall, predev and prebuild. Those generated binaries are ignored. Preparation verifies the model hash and runtime version, and does not download assets. The shared manifest is `src/features/tools/image/services/background-removal-model.json`.

## Processing and memory

JPG, PNG and WebP inputs are limited to 20 MiB. The editable output keeps the original aspect ratio with its longest side capped at 2200 px. Inference uses RGB at 320 x 320, channel-first normalization, and the first model output. Browser canvas resizing is used; it is not bit-identical to Pillow's Lanczos resizing.

The predicted soft alpha is resized to the editable dimensions and multiplied by the original alpha. Brush keep/erase strokes override it, with the existing 30-stroke undo history. Solid output backgrounds use alpha compositing. `background-removal.ts` remains available for the separate ID-photo workflow; `/xoa-phong` never falls back to that color-based algorithm.

Only one inference job is retained. Choosing another file, cancelling or leaving the page aborts its job and terminates its worker. Completion and errors also terminate the worker. This discards the runtime's WASM heap instead of retaining it between images. Initializing a new worker for each image adds startup time; HTTP/service-worker caches reuse downloaded bytes. A 180-second watchdog terminates stalled jobs. Failed/cancelled jobs cannot export a previous image, and retry is explicit.

The initial standalone CPU diagnostic on the supplied 526 x 526 product image took approximately 1.1-1.4 seconds per inference and increased Chrome renderer private committed memory by about 298 MiB. The integrated worker test, with two sequential jobs, measured increases of 294-309 MiB during processing and 20-31 MiB after worker termination and a three-second idle period. This is a desktop Windows measurement, not a real-phone guarantee. Worker termination limits retained runtime memory; it does not guarantee a lower active peak or immediate release of all browser process memory. Large input decoding, canvas and brush history consume additional memory.

## Loading and offline behavior

Runtime/model assets use `withBase()` and versioned same-origin URLs. They are requested only after choosing an image. The production service worker caches successful GETs after first use. They are declared as optional assets rather than added to the initial offline precache. The first uncached offline attempt reports an error and offers retry; it does not claim success or use a different method.

## Verification

- Pure tests cover normalization, soft alpha, original transparency, solid backgrounds and stroke overrides; existing mask-stroke and solid-background tests remain valid.
- Browser QA exercises the supplied image, PNG download, brush keep/erase/undo, output colors, corrupt input, model-fetch failure, retry, cancellation, replacement-file races and worker termination.
- Responsive screenshots cover 390, 768 and 1440 CSS px. Mobile emulation runs on desktop hardware and is not a real-device performance test.
- Evidence is written to `qa-output/background-removal-check/`, which is ignored by Git. Build and TypeScript status must be reported separately from visual evidence.
