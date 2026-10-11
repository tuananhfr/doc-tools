# Entertainment foundation

Scope: Dev Implementation Pack 1.1.1 technical sandbox, not an approved interpretation service. Anonymous users need no Pro subscription or AI key. Approved corpora, expert vectors, account history and BYO-AI integration remain separate release work.

## Flags and deployment

Both flags default off. For an internal preview, build/start the frontend with `NEXT_PUBLIC_ENT_SANDBOX=1`, and start the backend with `ENT_SANDBOX_ENABLED=1`. The frontend flag is baked into the Next build. The backend flag can close all execution endpoints without a frontend rebuild. Keep both flags off for production until the content/release gates are approved. Disabled entries remain `soon`; sandbox pages have `noindex, nofollow` and are excluded from the sitemap.

`ENT_SESSION_TTL_SECONDS` defaults to 900; valid range is 60..3600. Rollback: disable the backend flag, rebuild the frontend with its flag off, then restart through the existing deployment process. Keep the new tables; no destructive rollback is necessary.

DatabaseService creates four additive tables from `src/entertainment/entertainment.schema.ts`: source registry, version registry, temporary draw snapshots and hashed-IP rate windows. Registry tables are foundation structures; they contain no pre-approved content. No existing account, Pro or rule tables are changed. The API identifies the supplied pack as a **draft specification**, not an approved cultural source.

## API contracts

All routes live under `/api/v1/ent`, with `Cache-Control: no-store`.

| Route | Contract |
| --- | --- |
| GET tools | Flag, draft sources, version identifiers; `public_release: BLOCKED` |
| POST numerology/calculate | `birth_date` YYYY-MM-DD, optional empty `name` string, `personal_year` integer; no raw input persistence |
| POST cards/draw | `spread` 1/3/5/7/9, `reversed: false` |
| POST tarot/draw | `spread` 1/3/5/7/10, boolean `reversed`; numbered technical positions only |
| GET almanac/day?date=YYYY-MM-DD | Existing lunar conversion, UTC+7, 1800..2199; unapproved folk extensions BLOCKED |
| POST reports | `draw_key`; returns the original immutable snapshot for local PDF/PNG export |

POST requires `X-CN-Request: 1` and the existing trusted-origin guard. Draws additionally require `Idempotency-Key`: base36 creation timestamp, underscore, 32 lowercase random hex characters. The client clock may be at most 30 seconds ahead of the server. Treat keys as temporary capabilities; do not log or share them.

Same key plus same settings returns the identical snapshot, including request ID, orientation and expiry. Concurrent inserts converge through a unique hashed key. Same key plus changed settings/deck returns 409. Expired keys return 410 even after database cleanup; an explicit new-session action creates a new key. Report replay is idempotent by `draw_key`, and never draws another deck.

All successful execution envelopes carry `request_id`, `rule_version`, `source_ids`, `verification_level: TECHNICAL_SANDBOX`, `disclaimer_id: cn-ent-reference-v1`, `public_release: BLOCKED`. Flags off returns 503. Bad input returns 400/422, untrusted write 403, missing report session 404, rate limit 429. Draw retries reuse cached snapshots without consuming rate quota. New calculations, calendar comparisons and draws share a 30 requests/minute hashed-IP limit.

## Method and privacy

Numerology is explicitly a draft total-digit method: preserve 11/22/33 at every reduction; NFC, strip combining marks, Đ→D, A-Z only; AEIOU vowels and Y consonant. Unsupported scripts fail explicitly. A group without eligible letters has a null value, not an invented result. No personality text or prediction is emitted.

Card manifests contain identities only, matching the supplied 52/78 entries. CSPRNG Fisher-Yates sampling has no replacement. The frontend serves local CC0 playing-card faces and public-domain Rider-Waite-Smith Tarot images, with per-card source/license records; see frontend/docs/entertainment-artwork.md. Artwork does not certify interpretation content. Ten-card Tarot uses numbered positions; no unapproved Celtic Cross mapping is implied.

Names and dates are sent only after explicit frontend confirmation and processed in request memory. They are not written to database/account history. Draw settings and identities are stored under a hashed key until access expiry. Expired rows are physically deleted at the next draw; old rate windows are deleted at the next limited operation. No scheduled retention job is included in this phase. PDF/PNG are generated on-device and include the reference disclaimer and source/version details. PDFs currently use raster report pages, not selectable text. No account-history storage or new AI call occurs.

The existing public lunar calendar remains available with its existing engine. A source/version/export panel documents the draft extension boundary. Backend parity is a consistency check, not independent astronomical validation. Expert calendars, approved seasonal/folk mappings, corpus licenses and legal/content approval remain required before public expansion.

## Verification

Backend: build then run `node --test tests/entertainment-engine.test.cjs tests/entertainment-http.test.cjs`. HTTP tests use WAMP MySQL, isolated fixture keys/IPs and fixture-only cleanup. `CONFIG_FROM_ENV_ONLY=1` prevents stored mail/GoClaw settings from being activated. Frontend: `npm test`, `npm run lint`, `npm run build` with preview flag, then the responsive browser report under `frontend/qa-output/2026-10-11-entertainment`.
