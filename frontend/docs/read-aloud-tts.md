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

1. `splitSpeechText` splits the **original** text into one chunk per sentence (long sentences split at commas, then spaces, max 220 characters) and keeps each chunk's `start`/`end` offsets, so the highlight marks what the user typed. It does not break after "TP.", "Q.", "P.", "ThS."… before a name or number, nor after a period followed by a lowercase letter ("v.v. và"). The device engine queues all chunks inside the click handler, because iOS only allows `speak()` in a user gesture and Chrome rejects or cuts long utterances.
2. Piper only: `normalizeVietnameseText` (pure, tested) runs **per chunk**, after splitting, because it changes the text length. It expands administrative abbreviations, spells unknown acronyms in Vietnamese, reads phone numbers digit by digit, adds "ngày/tháng" to dates and speaks email/URL symbols. Without it espeak reads "UBND" with English phonemes and "31/12" without "tháng".
3. Piper playback (`PiperPlayer`) creates the `AudioContext` in the click handler, synthesizes chunk by chunk and keeps at most 8 seconds of audio scheduled ahead.
4. "Download audio (WAV)" synthesizes every chunk and writes 16-bit mono PCM at 22,050 Hz. 20,000 characters is roughly 25 minutes and 66 MB of WAV, held in memory until download.

## Pause, speed and highlight

While reading or paused, the textarea is replaced by a read-only view (`ReadingView`) that marks the current sentence and, when known, the current word, and scrolls only its own box. Press Stop to edit again. The speed slider is applied 300 ms after the last movement.

| | Piper | Device voice |
| --- | --- | --- |
| Pause / resume | `AudioContext.suspend()` / `resume()`: exact sample, the synthesis loop waits because the clock is frozen | `cancel()`, then speak again from the last word boundary, or from the start of the sentence when the voice sends no boundaries |
| Speed while reading | Already scheduled audio is time-stretched with WSOLA (`utils/time-stretch.ts`, keeps pitch) from the sample being heard; later chunks are synthesized at the new `length_scale` | `cancel()` and speak again from the current word |
| Highlight | Sentence, from the AudioContext clock and a timeline of chunk start times (`utils/reading-timeline.ts`). No word highlight: Piper returns no timing per word | Sentence on `onstart`; word on `onboundary` |

Native `speechSynthesis.pause()` / `resume()` is not used: it hangs on Chrome Android and with online voices. Chrome's online "Google tiếng Việt" voice sends no boundary events, so it only gets the sentence highlight and resumes from the start of the sentence. A speed change re-speaks from a timer, outside a user gesture; iOS accepts this once the first `speak()` of the page came from a tap, but this has not been tested on a real iPhone.

Each read or export starts a worker and terminates it when done, stopped or unmounted, like `/xoa-phong`. There is no queue of pending reads.

## Download and offline

First use downloads about 96 MB (model 63 MB, phonemizer 18.7 MB, shared runtime 14.3 MB). The files are `optionalAssets` in `offline-manifest.json`: cached after first use, never precached.

## Measurements (12/10/2026, desktop Windows, Chrome headless against `next dev`)

- Native Python Piper: real-time factor about 0.02. ONNX Runtime Web WASM, one thread, in Node: about 0.15, rss 343 MB.
- In the browser with assets already in the HTTP cache: first audio 4.4–4.7 s after pressing Read (worker start, SHA-256 of 82 MB, session creation).
- 1,270 characters → 8 chunks, 64 s of audio, no playback underrun, at most 7.2 s scheduled ahead.

These are desktop numbers; phones have not been measured.
