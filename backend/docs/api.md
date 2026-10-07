# Public tool counter API

## Optional quality aggregates

`POST /api/v1/tools/quality` accepts exactly `{event,tool}`. Events: `zero-result`, `reformulation`, `tool-opened`, `completion`, `download`. Tools: `none`, `compress-pdf`, `merge-pdf`, `split-pdf`, `scan-to-pdf`, `compress-image`, `ocr`, `image-to-text`, `qr-create`. Search events must use `none`; other events must name a supported tool. Unknown fields or dimensions return 400 `{ok:false,message}`. Success is 200 `{ok:true}`, `Cache-Control: no-store`, with the existing 1 KiB limit. No public reporting endpoint exists.

The frontend sends nothing unless `NEXT_PUBLIC_QUALITY_EVENTS=1` was set at build time AND the user opts in for the current in-memory session. Reload clears consent. Requests omit credentials and referrers; there is no offline queue. No query, filename, OCR text, corrected value, document, persistent identifier, or training sample is accepted. Metrics are event counts, not unique users or verified real-world task success. A download event means the download button was clicked.

`quality_daily` stores daily aggregate counts only. `quality_flood` stores daily rotating HMAC hashes and hourly counts to cap 120 events/hour/IP, across concurrent API instances. A minute cleanup removes buckets older than the preceding hour (at most approximately two hours). The hashing domain is separate from visit counters. New tables use idempotent `CREATE TABLE IF NOT EXISTS`; no existing data migration is needed.

Trusted operators run `node dist/cli/quality.js YYYY-MM-DD YYYY-MM-DD` to export aggregate JSON locally. Existing authentication and ERPCons databases are not involved.

## Contract

Both endpoints are public, under /api/v1/tools, and send Cache-Control: no-store. Responses use flat {ok,...} envelopes matching ERPCons.

POST /visits accepts a JSON object with tool matching /^[a-z0-9][a-z0-9-]{0,47}$/. Successful calls return HTTP 200 and {"ok":true}. Invalid JSON/body or tool returns HTTP 400 with {"ok":false,"message":"..."}; invalid tool also includes errors.tool. A rolling 120/hour/IP flood limit suppresses further increments while returning the same successful envelope.

GET /stats returns HTTP 200 and {"ok":true,"total":number,"tools":{"slug":number}}. total is the sum of all tool counts.

## Storage and integration

MySQL/InnoDB tables: tool_visits, visit_flood_locks and visit_flood_events. Counters use atomic SQL upserts. A database transaction and per-IP lock serialize flood checks across instances. IP addresses are HMAC hashed with VISIT_HASH_SECRET; expired flood records are cleaned periodically. The API receives only tool slugs.

The server defaults to 127.0.0.1:3003 and trusts only loopback proxy addresses. The independently deployed Next.js frontend configures its API proxy with BACKEND_URL. The two repositories share no source files or dependency links.

Tests use a dedicated qa slug and test IP, remove their own rows and verify malformed/empty JSON, invalid slugs, concurrent counting, proxy client IP, rolling limits and expiry.

## Signed rule packages

`GET /api/v1/rules/:kind` returns `{ok:true,package,upcoming}` for a lowercase hyphenated kind. `package` is the published package in effect today (Vietnam calendar date, `Asia/Ho_Chi_Minh`) or `null`; when several published packages are valid, the one with the latest `effectiveFrom` wins. `upcoming` is the published package with the nearest future `effectiveFrom`, or `null`. The response is `Cache-Control: no-store`. The server verifies Ed25519 before each response; a missing key or a failed verification of `package` returns 503, while an `upcoming` package that fails verification is returned as `null`. There is no public write endpoint. A local operator CLI stages, publishes (`activate`, which schedules a package dated in the future) or withdraws (`rollback`, after which the previous package applies again) packages and records each action in `rule_audit`.

## Anonymous contributions

`POST /api/v1/contributions` accepts JSON `{toolId,domain,baseSnapshotId,proposedChanges:[{field,before,after}],sourceRefs:[{url,type}],jurisdiction}`. Nullable metadata can be omitted. The request body limit is 128 KiB on this route; the visit route keeps its 1 KiB limit. A valid submission returns HTTP 200 `{ok:true,receiptCode,status}` where status is `NEEDS_SOURCE` or `NEEDS_REVIEW`. Invalid or sensitive input returns 400; a duplicate returns 409 with `code:DUPLICATE_CONTRIBUTION`; the sixth distinct submission within a rolling hour for one HMAC IP returns 429. No AI output is trusted or published by this API.

`GET /api/v1/contributions/receipt/:code` returns `{ok:true,contribution:{status,createdAt}|null}` with no proposed content or reviewer identity. The 24-byte random receipt is stored only as a SHA-256 hash. `GET /api/v1/contributions/ideas` returns the latest 50 published ideas. Both GET endpoints send `Cache-Control: no-store`.

`POST /api/v1/contributions/receipt/:code/sources` accepts `{sourceRefs:[{url,type}]}` only while the receipt is in `NEEDS_SOURCE`, changes it to `NEEDS_REVIEW`, and records `SOURCES_ADDED`. It returns 404 for unknown receipts or already progressed submissions. The route has a 22 KiB body limit.

The trusted CLI transitions `NEEDS_REVIEW → VERIFIED → APPROVED → PUBLISHED` and records every transition. Reviewer, approver and publisher identities must differ. High-risk domains require an official-type reference and a human verification note. Publishing a rule contribution requires a staged Ed25519 package of the same kind, that has not expired; if the proposal names a base snapshot digest, it must still be the package in effect. The package activation and contribution audit share a transaction. Idea publication requires the same operator separation but no rule package. Public API clients cannot review, approve, or publish.
