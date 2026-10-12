# Read aloud: Chuyen Nho voice (Piper)

`/doc-to-van-ban` offers two engines. "Device voice" uses the browser's Web Speech API. "Chuyen Nho voice" runs the Piper `vi_VN-vais1000-medium` VITS model in a dedicated browser worker with ONNX Runtime Web 1.30.0 (WASM, one thread) and an espeak-ng phonemizer compiled to WebAssembly. Text, audio and the exported WAV never leave the browser; the server only serves static assets.

## Assets and provenance

| Asset | Location | Tracked | Source |
| --- | --- | --- | --- |
| Voice model, 63,201,294 bytes, SHA-256 `ec7c89e2…2dab` | `public/vendor/tts/vi_VN-vais1000-medium-ec7c89e2.onnx` | Git | rhasspy/piper-voices `vi/vi_VN/vais1000/medium` |
| Phonemizer `piper_phonemize.wasm` + `.data` (18 MB, all espeak-ng languages) | `public/vendor/tts/piper-phonemize-1.0.0/` | generated | npm `@diffusionstudio/piper-wasm@1.0.0` |
| ONNX Runtime WASM | `public/vendor/background-removal/ort-1.30.0/` | generated | shared with `/xoa-phong` |

`src/features/tools/accessibility/config/piper-voice.json` holds file names, sizes, SHA-256 values and inference scales. `scripts/prepare-tts.mjs` (postinstall / predev / prebuild, after `prepare-background-removal.mjs`) verifies the model hash, copies the phonemizer files after checking their hashes, and fails if the shared runtime is missing. It never downloads anything. The worker verifies every hash again before use.

The npm `main` field of `piper-wasm` is broken (`/build/...`), so the worker imports `@diffusionstudio/piper-wasm/build/piper_phonemize.js` directly. The Emscripten loader detects workers through `importScripts`, which module workers lack; the worker therefore passes the downloaded bytes through `wasmBinary` and `getPreloadedPackage` instead of letting it fetch them.

## Licensing (reviewed as for FFmpeg)

- Voice data: VAIS-1000, CC BY 4.0. Attribution is shown on the tool page and in `public/vendor/tts/NOTICE.txt` with `MODEL_CARD-vais1000`.
- **Open item:** the model card says the voice was fine-tuned from the U.S. English `lessac` Piper voice. The lessac (Blizzard) corpus has its own terms; the legal review must confirm that commercial distribution of the fine-tuned weights is allowed.
- Phonemizer: npm declares MIT, but the binary embeds eSpeak NG (GPL-3.0-or-later). `COPYING.GPLv3` and source pointers ship in `public/vendor/tts/`. The upstream build recipe clones repositories without pinned commits, so a rebuild is not guaranteed to be byte-identical.
- Other Piper voices for Vietnamese are not usable: `vivos-x_low` is CC BY-NC-SA, `25hours_single-low` has no stated license.

## Processing

1. `normalizeVietnameseText` (pure, tested) expands administrative abbreviations, spells unknown acronyms in Vietnamese, reads phone numbers digit by digit, adds "ngày/tháng" to dates and speaks email/URL symbols. Without it espeak reads "UBND" with English phonemes and "31/12" without "tháng".
2. `splitSpeechText` splits into chunks of at most 220 characters (sentences, then commas, then spaces). The device engine queues all chunks inside the click handler, because iOS only allows `speak()` in a user gesture and Chrome rejects or cuts long utterances.
3. Piper playback creates the `AudioContext` in the click handler, synthesizes chunk by chunk and keeps at most 8 seconds of audio scheduled ahead. Speed changes apply to the next synthesized chunk (`length_scale = 1 / rate`).
4. "Download audio (WAV)" synthesizes every chunk and writes 16-bit mono PCM at 22,050 Hz. 20,000 characters is roughly 25 minutes and 66 MB of WAV, held in memory until download.

Each read or export starts a worker and terminates it when done, stopped or unmounted, like `/xoa-phong`. There is no queue of pending reads.

## Download and offline

First use downloads about 96 MB (model 63 MB, phonemizer 18.7 MB, shared runtime 14.3 MB). The files are `optionalAssets` in `offline-manifest.json`: cached after first use, never precached.

## Measurements (12/10/2026, desktop Windows, Chrome headless against `next dev`)

- Native Python Piper: real-time factor about 0.02. ONNX Runtime Web WASM, one thread, in Node: about 0.15, rss 343 MB.
- In the browser with assets already in the HTTP cache: first audio 4.4–4.7 s after pressing Read (worker start, SHA-256 of 82 MB, session creation).
- 1,270 characters → 8 chunks, 64 s of audio, no playback underrun, at most 7.2 s scheduled ahead.

These are desktop numbers; phones have not been measured.
