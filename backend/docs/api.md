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

`GET /api/v1/contributions/receipt/:code` returns `{ok:true,contribution:{status,createdAt}|null}` with no proposed content or reviewer identity. The 24-byte random receipt is stored only as a SHA-256 hash. `GET /api/v1/contributions/ideas` returns the latest 50 published ideas as `{id,text,author}`; `author` is the submitter's display name only when the contribution was sent with `attribution:true` and the account currently has `publicAttribution` on, a display name and is active, otherwise `null`. Both GET endpoints send `Cache-Control: no-store`.

`POST /api/v1/contributions/receipt/:code/sources` accepts `{sourceRefs:[{url,type}]}` only while the receipt is in `NEEDS_SOURCE`, changes it to `NEEDS_REVIEW`, and records `SOURCES_ADDED`. It returns 404 for unknown receipts or already progressed submissions. The route has a 22 KiB body limit.

The trusted CLI or a staff account in the admin area (below) transitions `NEEDS_REVIEW → VERIFIED → APPROVED → PUBLISHED` and records every transition. Reviewer, approver and publisher identities must differ. High-risk domains require an official-type reference and a human verification note. Publishing a rule contribution requires a staged Ed25519 package of the same kind, that has not expired; if the proposal names a base snapshot digest, it must still be the package in effect. The package activation and contribution audit share a transaction. Idea publication requires the same operator separation but no rule package. Public API clients cannot review, approve, or publish.

## Accounts and email sign-in

Cookie-authenticated writes (`/auth/*`, `PATCH /me`) require header `X-CN-Request: 1`; when `SITE_ORIGINS` is set, a present `Origin` must be in that list. Otherwise 403 `code:UNTRUSTED_REQUEST`. All routes send `Cache-Control: no-store`.

- `POST /api/v1/auth/otp/request {email, locale}` → always `{ok:true}` for a valid email (no account enumeration). Emails a 6-digit code valid `OTP_TTL_SECONDS` (600) that voids earlier codes. 3 requests / 15 min / email and 10 / hour / IP, else 429 `code:RATE_LIMITED`. Invalid email → 400 `code:EMAIL_INVALID`.
- `POST /api/v1/auth/otp/verify {email, code}` → creates the user on first sign-in, sets cookie `cn_session` (HttpOnly, SameSite=Lax, Secure unless `COOKIE_SECURE=0`, `SESSION_DAYS` 30, slid once a day) and returns the `/me` body. Wrong or expired code → 400 `code:OTP_INVALID`; the 5th wrong guess (`OTP_MAX_ATTEMPTS`) kills the code. 30 verifications / hour / IP. Disabled account → 403 `code:ACCOUNT_DISABLED`. When the `auth.signupOpen` setting is off, `request` still answers `{ok:true}` for an unknown email but sends nothing, and `verify` for an unknown email → 403 `code:SIGNUP_CLOSED` (checked after the code, so it reveals nothing to someone without the mailbox).
- `POST /api/v1/auth/logout` → deletes the session, expires the cookie.
- `GET /api/v1/me` → `{ok:true, user:{id,email,displayName,publicAttribution}|null, plan:{pro,endsAt}, capabilities[], staff:{role,permissions[]}|null}`. Guests get `user:null` (200, not 401). Capabilities: guest `tool.use`, `contribution.anonymous`; signed in adds `contribution.attributed`, `contribution.track`, `contribution.evidence`; Pro adds `ai.agent`, `cloud.memory`, `sync.basic`, `byoai.history`.
- `PATCH /api/v1/me {displayName|null, publicAttribution}` → 401 without a session, 400 for names over 80 characters or containing control characters / `<` `>`.

### Contributions from an account

- `POST /api/v1/contributions` with a session **and** the trusted-write header/origin records the submitter (table `contribution_submitters`) and takes an extra body field `attribution` (only literal `true` consents to showing the name). The response adds `tracked:true`. The limit is then 10 / rolling hour per account instead of 5 per IP. Without the header the cookie is ignored and the request is a guest's (`tracked:false`) — it never fails, so an old cached frontend keeps working.
- `GET /api/v1/me/contributions?page=1` → 401 `code:SIGNED_OUT` without a session. `{ok, page, pageSize:20, total, items:[{id,toolId,domain,status,sourceRefs,attribution,createdAt,changes,changeCount,canAddEvidence}]}`, newest first. `changes` holds at most 3 entries, each `before`/`after` clipped to 280 characters. Guest-filed contributions never appear.
- `POST /api/v1/me/contributions/:id/evidence {sourceRefs:[{url,type}]}` (trusted write, 22 KiB) → appends sources to the caller's own contribution while it is `NEEDS_SOURCE` or `NEEDS_REVIEW`; URLs already present are skipped, `NEEDS_SOURCE` becomes `NEEDS_REVIEW`, audit `EVIDENCE_ADDED` by `user:<id>`. Returns `{ok,status,sourceRefs}`. Someone else's or unknown id → 404; later statuses → 409 `code:EVIDENCE_CLOSED`; more than 10 sources in total → 400 `code:TOO_MANY_SOURCES`; invalid source → 400 `code:SOURCE_INVALID`.
- `GET /api/v1/me/contribution-drafts?toolId=` (session) → `{ok, items:[{id,toolId,domain,baseSnapshotId,jurisdiction,changes,sources,uncertainties,createdBy,createdAt}]}`, the caller's drafts not yet sent, newest first. Drafts are written by the AI agent through MCP (`createdBy:'agent'`); no one else can read them.
- `POST /api/v1/me/contribution-drafts/:id/submit {selectedIndexes:[int], attribution}` (session, trusted write, 4 KiB) → submits ONLY the picked rows as an account contribution (same validation, limits and audit as `POST /contributions`) and answers `{ok, receiptCode, status, tracked, contributionId}`. Empty, repeated or out-of-range indexes → 400 `code:SELECTION_INVALID`; a draft already sent, discarded or someone else's → 404 `code:NOT_FOUND`. The draft is claimed before submitting and released if the submission fails (duplicate 409, rate limit 429), so it can be retried. Uncertainties stay on the draft; contributions have no column for them.
- `DELETE /api/v1/me/contribution-drafts/:id` (session, trusted write) → discards an unsent draft; 404 otherwise.

Codes and session tokens are stored only as hashes (HMAC with `VISIT_HASH_SECRET` / SHA-256). Pro is granted by the trusted CLI (`npm run accounts -- grant-pro <email> <YYYY-MM-DD> <operator> [note]`, through the end of that Vietnam day; `revoke-pro`, `show`, `list-pro`) or by staff with `plans.manage`; every grant, revocation and login is written to `user_audit`.

## Outgoing mail

Mail goes through the `mail_outbox` table and an in-process worker (every 15 s, plus immediately after enqueue). `MAIL_TRANSPORT`: `direct` (resolve the recipient's MX, deliver on port 25 with verified STARTTLS, DKIM-sign), `smtp` (`SMTP_HOST`/`PORT`/`SECURE`/`USER`/`PASS`) or `log` (development: prints the message, sends nothing). Transient failures retry after 1, 5, 30 min, 2 h and 6 h; 5xx rejections fail immediately; one-time codes past their expiry are dropped unsent. The payload is replaced with `{}` once a message is sent or failed. `npm run mail -- dkim-keygen <dir outside repo> [selector]` creates the DKIM key and prints the `.env` lines and DNS records; `npm run mail -- test <email>` sends one message through the configured transport.

## Admin area

Staff routes live under `/api/v1/admin/*` and back the frontend's `/quan-tri` pages. There is no separate login: an account with a row in `user_roles` signs in with the same email code, and its session lasts 12 hours instead of `SESSION_DAYS`. Roles are `reviewer` ⊂ `admin` ⊂ `owner`; permissions per role are in `src/roles/roles.ts`. The first owner is created on the server with `npm run accounts -- grant-role <email> owner <operator>` (also `revoke-role`, `list-roles`).

Every admin route, reads included, requires the trusted-write header and origin (otherwise 403 `UNTRUSTED_REQUEST`), so a cross-site page cannot even read staff data with the cookie. Then: no session → 401 `SIGNED_OUT`; no role → 403 `NOT_STAFF`; a staff session older than 12 h → 401 `STAFF_REAUTH`; missing permission → 403 `FORBIDDEN`. Responses are `Cache-Control: no-store`. Lists page with `?page=` (25 per page) and answer `{ok, page, pageSize, total, items}`. Business refusals are 409/404 with `{ok:false, code, message}` and a Vietnamese message.

| Route | Permission | Notes |
| --- | --- | --- |
| `GET /admin/whoami` · `GET /admin/overview` | `dashboard.view` | Overview: user / Pro / contribution / mail counts, 14-day visit and sign-up series, top 5 tools over 7 days |
| `GET /admin/tools?days=7\|30\|90` · `GET /admin/tools/:tool` | `tools.view` | Daily counts come from `tool_visit_days` (Vietnam day), which starts empty; all-time totals from `tool_visits` |
| `GET /admin/users?q&status&plan&staff` · `GET /admin/users/:id` | `users.view` | Detail adds sessions (metadata only), plan history, contributions, `user_audit` and admin audit |
| `POST /admin/users/:id/disable {reason}` · `/enable` · `/sessions/end` · `PATCH /:id/profile` · `DELETE /:id {confirmEmail}` | `users.manage` | Refused for yourself (`SELF_TARGET`), for another staff account unless you hold `roles.manage` (`STAFF_TARGET`), and for the last active owner (`LAST_OWNER`). Delete needs the exact email (`CONFIRM_MISMATCH`) |
| `POST /admin/users/:id/pro {until:"YYYY-MM-DD", note}` · `/pro/revoke {note}` | `plans.manage` | Same rules as the CLI: through the end of that Vietnam day, the later end date wins |
| `GET /admin/contributions?status&domain&queue=open` · `GET /:id` · `POST /:id/transition {action, note, digest}` | `contributions.review` | `action`: `verify` (note ≥ 10 chars), `approve`, `reject` (note required), `publish`, `supersede`, `revoke`. Same three-person rule as the CLI (`SAME_PERSON`); publishing rule data checks the staged signed package by `digest` (`PACKAGE_*`, `SIGNING_KEY_MISSING`, `BASE_CHANGED`). Signing and staging packages stay in the CLI |
| `GET /admin/mail?status` · `GET /admin/mail/dns` | `mail.view` | Outbox rows never include `payload`; `config` reports set/unset only. DNS check looks up MX, SPF, DKIM, DMARC live (5 s timeout) |
| `POST /admin/mail/test {to?}` | `mail.test` | Queues a `test` message to `to` or to the caller |
| `GET /admin/settings` · `PUT /admin/settings/:key {value}` · `DELETE /admin/settings/:key` | `settings.manage` | Runtime settings in `app_settings` (non-secret only, cached 30 s per process): `auth.signupOpen`, `contributions.guestHourly`, `contributions.accountHourly`. `system` reports `.env` values as set/unset, never their content |
| `GET /admin/roles` · `PUT /admin/roles {email, role}` · `DELETE /admin/roles/:userId` | `roles.manage` | The account must already exist; changing a role ends that person's sessions; the last owner cannot be removed or demoted |
| `GET /admin/ai?q&status` · `GET /admin/ai/status` | `ai.view` | Members' AI keys (provider type, model, status, agent state; never the key). `status` reads GoClaw live: reachable, MCP server registered, `background.provider` (reported, never changed) |
| `POST /admin/ai/:userId/disable` · `/enable` | `ai.manage` | Disable turns the agent off, disables the provider and revokes the MCP token; the member cannot undo it. Enable only lifts the block: status becomes `failed` and the member must check the key again |
| `GET /admin/audit?actor&target` | `audit.view` | `admin_audit`, newest first |

Every write is recorded in `admin_audit` (actor id + email, action, target, detail ≤ 1000 chars). Failed mail cannot be resent from the admin area: its payload is wiped when it leaves the queue so one-time codes are not kept.

## AI assistant (Pro)

Each Pro member brings their own AI key. The backend registers it in a shared GoClaw as one provider and one agent named `cn-<userId>`, and the browser chats with GoClaw directly over WebSocket using a short-lived ticket. The key goes to GoClaw (stored encrypted there) and is never kept or returned here.

| Route | Who | Notes |
| --- | --- | --- |
| `GET /ai/provider-types` | anyone | Supported provider types `{type,label,apiBase,customBase}`; only `openai_compat` accepts a custom `apiBase` |
| `GET /ai/setup` | signed in | `{available, provider:{type,apiBase,model,status,lastError,verifiedAt}\|null, agent:{status,upToDate}\|null}`; `available:false` when `GOCLAW_GATEWAY_TOKEN` is unset |
| `PUT /ai/provider {type, apiKey, apiBase?}` | Pro, trusted write, 4 KiB | Saves the key (status `verifying`) and answers the setup plus `models` (≤ 300, from the provider) |
| `POST /ai/provider/verify {model}` | Pro, trusted write | GoClaw sends one short test call. Failure → 422 `AI_VERIFY_FAILED`, status `failed`, provider disabled. Success → status `ready`, agent created/updated, prompt files written, MCP tools granted, agent switched on last |
| `DELETE /ai/provider` | signed in, trusted write | Agent off, then provider deleted, then MCP credential dropped |
| `POST /ai/session` | Pro, trusted write | `{token, wsUrl, userId, agentKey, expiresAt}`. Re-checks GoClaw first; a provider or agent that drifted (disabled, renamed, pointed elsewhere) switches the agent off and answers 409 `AI_NOT_READY` |
| `POST /ai/source-checks {toolId, baseSnapshotId, sessionKey}` | Pro, trusted write, 2 KiB | Records that a source check started (table `ai_source_checks`). `toolId` is a ready tool slug, `baseSnapshotId` the package digest or `null`, `sessionKey` must be one of the caller's own agent sessions (`agent:cn-<userId>:ws:direct:<uuid>`); otherwise 400 `INVALID_INPUT`. A draft the agent creates within 6 h for the same tool is linked to the latest check. Returns `{ok,id}` |

Error codes: `SIGNED_OUT` 401, `PRO_REQUIRED` 403, `AI_DISABLED` 403 (staff block), `INVALID_INPUT` / `INVALID_API_BASE` 400, `AI_NO_PROVIDER` / `AI_NOT_READY` 409, `AI_VERIFY_FAILED` 422, `AI_UPSTREAM` 502, `AI_UNAVAILABLE` 503.

Ordering is the guard rail: GoClaw runs an agent whose provider is missing or disabled on a random provider of the tenant, possibly another customer's key. So the agent is always switched off BEFORE its provider is touched, and switched on only after a successful check. `apiBase` must be `https://` and resolve to public addresses only (`AI_DEV_ALLOW_PRIVATE_API_BASE=1` lifts this in development; GoClaw has its own SSRF check that this flag does not lift).

### MCP tools for the agent

GoClaw calls back `GET /api/v1/mcp/sse` (SSE transport) with header `X-CN-MCP-Token`, a per-member token rotated on every successful check and revoked on disable or deletion. `MCP_ALLOWED_IPS` restricts callers (403 `MCP_FORBIDDEN`); an unknown or revoked token is 401 `MCP_UNAUTHORIZED`; at most 4 open streams per member. Messages go to `POST /api/v1/mcp/messages?sessionId=` (JSON-RPC: `initialize`, `ping`, `tools/list`, `tools/call`). Tools: `cn_find_tools`, `cn_tool_guide`, `cn_open_tool` (returns a ```` ```cn-action ```` block the site turns into an "open tool" button). They read `data/tool-catalog.json`, generated by the frontend's `scripts/export-tool-catalog.mjs`.

Source-check tools (agent prompt `PROMPT_VERSION` 2):

- `cn_get_rules {kind, query?}` — `kind` ∈ `electricity`, `vat`, `payroll`, `addresses`. Answers the package in effect `{snapshotId, effectiveFrom, effectiveTo, source, data}` plus a `fieldHint` for draft field paths (`tiers.<i>.price`, `ward`…), or says there is none. Addresses never send the full ward list: `data` holds the provinces, a ward count and up to 30 wards matching `query`.
- `cn_create_contribution_draft {toolId, domain, baseSnapshotId, changes[], sources[], uncertainties[], jurisdiction}` — validated like a contribution (high-risk domains need a source; at most 20 uncertainties of 1000 characters). It only stores a draft for the member (table `contribution_drafts`, at most 20 open per member); nothing is submitted. The answer tells the agent to say so.
- `cn_my_contributions {status?}` — the member's latest contributions and open drafts, so the agent does not draft the same change twice.

CLI: `npm run ai -- status` (GoClaw reachability, MCP registration, `background.provider`), `npm run ai -- register-mcp` (creates or updates the `chuyen-nho` MCP server from `MCP_PUBLIC_URL`), `npm run ai -- sync-agents` (pushes the current prompt files to agents below `PROMPT_VERSION`).
