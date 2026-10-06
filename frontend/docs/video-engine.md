# Browser video tools

The Free app exposes `/nen-video`, `/cat-video`, `/tao-gif`, and `/tach-am-thanh`. All file processing is local. The owner approved the official GPL core on 2026-10-05. L3 ERPCons/Tekshot integration is outside this delivery.

## Runtime

- `video/services/video-engine.ts` lazily imports `@ffmpeg/ffmpeg` only after the user starts a task. An unmodified module worker loads local core assets using absolute, base-path-aware HTTP URLs. Single-thread mode does not require SharedArrayBuffer or cross-origin isolation headers.
- Each job owns one worker. Concurrent jobs in the same page are refused. Cancel, navigation, errors, and successful completion terminate that worker; its WASM memory and filesystem are discarded. Input/output preview object URLs are revoked on replacement and unmount.
- `ffprobe` inspects the actual streams before encoding. Core 0.12.10 leaves its return value at `-1` even when it emits valid probe JSON, so the adapter accepts `0`/`-1` and validates the JSON, dimensions, duration, and streams. No user filename or arbitrary command enters FFmpeg arguments.
- MP4 output uses H.264/AAC, an ultrafast encoder preset, and even dimensions. Trim re-encodes, with timing limited to frame accuracy. GIF palette generation is restricted to the chosen input interval. Audio extraction uses the first audio stream and fails clearly for silent videos.
- Limits: 100 MiB input, 600 seconds, 3840 x 2160 pixels; GIF <=20 seconds, <=640 px wide, <=15 fps. These are application ceilings, not a guarantee that every device can process that workload. The UI recommends short clips below 30 MiB on phones. Loading times out after 90 seconds; processing is bounded by 10 minutes.
- Compression can increase the size of an already compressed input. The UI reports the actual result rather than promising a size reduction. MP3/M4A are lossy; WAV is uncompressed PCM. Video outputs remove copied metadata and chapters.

## Assets and offline

`npm ci`, `npm run dev`, and `npm run build` run `scripts/prepare-video.mjs`. It requires exactly `@ffmpeg/core` 0.12.10 and `@ffmpeg/ffmpeg` 0.12.15, copies their unmodified ESM runtime files to `public/vendor/ffmpeg/core-0.12.10-wrapper-0.12.15/`, and emits an asset SHA-256 manifest. No CDN is accessed during video processing or builds.

The offline manifest lists video runtime files as `optionalAssets`. They are excluded from installation precache so visiting an unrelated tool does not download the approximately 32 MB core. The existing service worker caches successful same-origin requests during use. Offline processing requires those resources to have been cached previously; a first offline use cannot load the core.

## License and source provenance

- Browser wrapper 0.12.15: MIT, source tag `v12.15`, commit `71aa99d37c02a7b4c435275ca9ef50e612f6efa1`.
- Core 0.12.10: package declares GPL-2.0-or-later. Its runtime reports FFmpeg 5.1.4, Emscripten 3.1.40 and `--enable-gpl`.
- `public/vendor/ffmpeg/NOTICE.txt`, `COPYING.GPLv2`, and `MIT.txt` accompany the runtime. The tools link to the notice.
- `source/ffmpeg-wasm-v0.12.10.tar.gz` archives the upstream source/build recipe at commit `c3a763857c5e615ae8674715ad5e4f63ff469e9d`. `source/Dockerfile` lists FFmpeg and linked library source/version references; the archive includes binding code and library build scripts.
- The recipe uses Emscripten 3.1.40. On a Docker build host, extract the archive and run `docker buildx build --build-arg FFMPEG_ST=yes --build-arg EXTRA_CFLAGS=-O3\ -msimd128 --build-arg EXTRA_LDFLAGS=-O3\ -msimd128 -o output .` following the archived upstream build instructions. Match its single-thread build configuration before substituting rebuilt assets.

The published npm package omits dependency commit provenance and the recipe contains moving branches. The archived recipe and checksums do not establish a bit-for-bit rebuild or a complete corresponding-source bundle for every linked library. Distribution review must resolve those upstream source details before claiming full GPL compliance. This work does not change the license of the rest of the application or deploy it.

## Verification

`video-wasm.test.ts` runs the unmodified core against synthetic audio/video: MP4 compression, fractional trimming, GIF dimensions/duration, MP3/M4A/WAV stream inspection, and a 61-second silent video. Validation tests cover oversized input, invalid ranges, duration/resolution limits, and absent audio. Lifecycle tests verify worker disposal, failures, cancellation, and concurrent-job refusal. Browser QA covers the actual production worker path and responsive pages separately from those tests.

### Verification record: 2026-10-05

- Frontend: 106 test files / 1,276 tests pass, including 15 new video checks. TypeScript and production builds pass with both empty basePath and `/doc-tools`; each build emits 142 static pages.
- The local production app ran on ports 3010 (root) and 3011 (prefixed) during QA. A synthetic 640x360 / 24 fps / 4-second clip with a sine audio track produced a 0.62 MiB MP4 from a 0.86 MiB input. Its browser duration was 4.017 seconds and the preview reached readyState 4.
- Browser trim from 1.25 to 2.75 seconds produced a 1.5-second MP4. The GIF decoded at 480x270. MP3 preview reached readyState 4 and duration 4.017 seconds. A silent clip produced the specific missing-audio error. Cancel during worker loading showed the cancellation message and restored the controls.
- Screenshots were opened and inspected at observed CSS widths 390, 768 and 1280. Document scrollWidth matched clientWidth at each width; settings and output reflowed without horizontal overflow. The IAB had 110% zoom, so physical viewport overrides were adjusted to reach those measured CSS widths. Evidence is in ignored `qa-output/video/`.
- The actual `/doc-tools/nen-video` worker job completed. All four prefixed pages, the notice and worker returned HTTP 200. Five local runtime checksums matched their pinned package copies. The offline manifest lists those five URLs under the prefix as optional and does not precache them.
- Before fixes, seven WASM tests failed because of ffprobe's `-1` return; after investigating valid probe JSON, only the five-fps clip's frame quantization assertion failed. Those concrete issues were corrected and the final suite passed. Browser QA also found webpack's file-URL worker resolution, fixed with absolute HTTP URLs and guarded by a regression assertion.
- **Browser output verification is partial:** clicking the download button and the browser's media-download API both timed out waiting for a download event in the Codex IAB. Download persistence to disk was not verified; no alternate Chrome/Edge connector was available. Real output bytes/stream metadata and in-browser previews were verified separately.
- **Offline/device verification is partial:** no disconnected browser run or physical phone memory ceiling was tested. Optional asset paths, checksums, and the existing runtime-cache behavior were checked. Unsupported-browser fallback is implemented but was not exercised on a real unsupported device.
