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

Cookie-authenticated writes (`/auth/*`, `PATCH /me`, `PUT /me/password`, `POST /me/email`, `POST /me/email/confirm`, `POST /me/sessions/end-others`, `DELETE /me`) require header `X-CN-Request: 1`; when `SITE_ORIGINS` is set, a present `Origin` must be in that list. Otherwise 403 `code:UNTRUSTED_REQUEST`. All routes send `Cache-Control: no-store`.

Sign-in is email + password. The emailed code is only for creating an account and for a forgotten password; both go through the same `password/setup` step. Passwords are stored as salted scrypt hashes in `user_passwords` (`src/accounts/password.ts`); policy: 8–128 characters (code points, NFC), no composition rules, not a common password, not the email or its local part.

- `POST /api/v1/auth/login {email, password}` → sets cookie `cn_session` (HttpOnly, SameSite=Lax, Secure unless `COOKIE_SECURE=0`, `SESSION_DAYS` 30, slid once a day) and returns the `/me` body. Unknown email, account without a password and wrong password all answer the same 401 `code:LOGIN_FAILED` and take the same time (a dummy hash is checked). A disabled account → 403 `code:ACCOUNT_DISABLED`, only after the right password. Limits, no hard lockout: 30 / 15 min / IP, 10 / 15 min / email + IP, 30 / hour / email, else 429 `code:RATE_LIMITED`.
- `POST /api/v1/auth/otp/request {email, locale}` → always `{ok:true}` for a valid email (no account enumeration). Emails a 6-digit confirmation code valid `OTP_TTL_SECONDS` (600) that voids earlier codes. 3 requests / 15 min / email and 10 / hour / IP, else 429 `code:RATE_LIMITED`. Invalid email → 400 `code:EMAIL_INVALID`.
- `POST /api/v1/auth/password/setup {email, code, password}` → a new email creates the account; an existing one gets its password replaced and **every** session ended (a reset is how a stolen account is taken back). Then signs in like `login`. Audit `PASSWORD_SET` or `PASSWORD_RESET`. The password is checked before the code, so 400 `PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG` / `PASSWORD_COMMON` does not spend the code. Wrong or expired code → 400 `code:OTP_INVALID`; the 5th wrong guess (`OTP_MAX_ATTEMPTS`) kills the code. 30 attempts / hour / IP. Disabled account → 403 `code:ACCOUNT_DISABLED`. When the `auth.signupOpen` setting is off, `request` still answers `{ok:true}` for an unknown email but sends nothing, and `setup` for an unknown email → 403 `code:SIGNUP_CLOSED` (checked after the code, so it reveals nothing to someone without the mailbox).
- `POST /api/v1/auth/logout` → deletes the session, expires the cookie.
- `GET /api/v1/me` → `{ok:true, user:{id,email,displayName,publicAttribution,hasPassword}|null, plan:{pro,endsAt}, capabilities[], staff:{role,permissions[]}|null}`. Guests get `user:null` (200, not 401). Capabilities: guest `tool.use`, `contribution.anonymous`; signed in adds `contribution.attributed`, `contribution.track`, `contribution.evidence`; Pro adds `ai.agent`, `cloud.memory`, `sync.basic`, `byoai.history`.
- `PATCH /api/v1/me {displayName|null, publicAttribution}` → 401 without a session, 400 for names over 80 characters or containing control characters / `<` `>`.
- `PUT /api/v1/me/password {currentPassword, newPassword}` → `{ok:true, ended}`: changes the password and ends every other session (this one stays). Audit `PASSWORD_CHANGED`. 401 `SIGNED_OUT`; 400 `PASSWORD_WRONG` or a policy code; 409 `PASSWORD_NOT_SET` for accounts made before passwords (they use `password/setup`). Password checks are limited to 10 / 15 min / account.
- `POST /api/v1/me/sessions/end-others` → `{ok:true, ended}`: signs out every device except this one. Audit `SESSIONS_ENDED`.
- `POST /api/v1/me/email {email, password, locale}` → `{ok:true}`: emails a 6-digit code (`email_change_code`, `OTP_TTL_SECONDS`) to the **new** address and keeps one pending change per account in `email_changes`; a new request replaces it. Nothing changes yet, and whether the address is taken is not revealed here. 400 `EMAIL_INVALID` / `EMAIL_SAME`; 400 `PASSWORD_WRONG`; 409 `PASSWORD_NOT_SET`. 3 requests / 15 min / account and 10 / hour / IP, plus the password-check limit.
- `POST /api/v1/me/email/confirm {code}` → the `/me` body with the new email, plus `ended`: moves the account, ends every other session, voids live codes of the old address, mails `email_changed_old` to the old address (the new one masked as `n***@domain`). Audit `EMAIL_CHANGED` by `self` (no addresses in `user_audit`: it outlives a deleted account). 400 `OTP_INVALID` (5 wrong guesses kill the request, 30 / hour / IP); 409 `EMAIL_TAKEN` when another account holds the address, told only after the right code.
- `DELETE /api/v1/me {password}` → self-service deletion, same cleanup as the staff/CLI path (`AccountDeletionService`, audit `DELETED` by `self`): sessions, password, plans, saved items, source checks, drafts, plan notices, then the GoClaw agent, provider and MCP credential; submitted contributions stay, unlinked. 401 `SIGNED_OUT`; 400 `PASSWORD_WRONG`; 409 `PASSWORD_NOT_SET`; 409 `STAFF_ACCOUNT` (an account with a role must have it removed first); 502 `DELETE_FAILED` when cleanup fails (nothing is reported as deleted). Success clears the cookie and answers `{ok:true}`.

### Contributions from an account

- `POST /api/v1/contributions` with a session **and** the trusted-write header/origin records the submitter (table `contribution_submitters`) and takes an extra body field `attribution` (only literal `true` consents to showing the name). The response adds `tracked:true`. The limit is then 10 / rolling hour per account instead of 5 per IP. Without the header the cookie is ignored and the request is a guest's (`tracked:false`) — it never fails, so an old cached frontend keeps working.
- `GET /api/v1/me/contributions?page=1` → 401 `code:SIGNED_OUT` without a session. `{ok, page, pageSize:20, total, items:[{id,toolId,domain,status,sourceRefs,attribution,createdAt,changes,changeCount,canAddEvidence}]}`, newest first. `changes` holds at most 3 entries, each `before`/`after` clipped to 280 characters. Guest-filed contributions never appear.
- `POST /api/v1/me/contributions/:id/evidence {sourceRefs:[{url,type}]}` (trusted write, 22 KiB) → appends sources to the caller's own contribution while it is `NEEDS_SOURCE` or `NEEDS_REVIEW`; URLs already present are skipped, `NEEDS_SOURCE` becomes `NEEDS_REVIEW`, audit `EVIDENCE_ADDED` by `user:<id>`. Returns `{ok,status,sourceRefs}`. Someone else's or unknown id → 404; later statuses → 409 `code:EVIDENCE_CLOSED`; more than 10 sources in total → 400 `code:TOO_MANY_SOURCES`; invalid source → 400 `code:SOURCE_INVALID`.
- `GET /api/v1/me/contribution-drafts?toolId=` (session) → `{ok, items:[{id,toolId,domain,baseSnapshotId,jurisdiction,changes,sources,uncertainties,createdBy,createdAt}]}`, the caller's drafts not yet sent, newest first. Drafts are written by the AI agent through MCP (`createdBy:'agent'`); no one else can read them.
- `POST /api/v1/me/contribution-drafts/:id/submit {selectedIndexes:[int], attribution}` (session, trusted write, 4 KiB) → submits ONLY the picked rows as an account contribution (same validation, limits and audit as `POST /contributions`) and answers `{ok, receiptCode, status, tracked, contributionId}`. Empty, repeated or out-of-range indexes → 400 `code:SELECTION_INVALID`; a draft already sent, discarded or someone else's → 404 `code:NOT_FOUND`. The draft is claimed before submitting and released if the submission fails (duplicate 409, rate limit 429), so it can be retried. Uncertainties stay on the draft; contributions have no column for them.
- `DELETE /api/v1/me/contribution-drafts/:id` (session, trusted write) → discards an unsent draft; 404 otherwise.

Codes and session tokens are stored only as hashes (HMAC with `VISIT_HASH_SECRET` / SHA-256). Pro is granted by the trusted CLI (`npm run accounts -- grant-pro <email> <YYYY-MM-DD> <operator> [note]`, through the end of that Vietnam day; `revoke-pro`, `show`, `list-pro`) or by staff with `plans.manage`; every grant, revocation and login is written to `user_audit`. `npm run accounts -- change-email <email> <new email> <operator>` is the break-glass twin of the admin email change below (sessions end, both addresses are notified, the mails wait in the outbox for the running API).

## Outgoing mail

Mail goes through the `mail_outbox` table and an in-process worker (every 15 s, plus immediately after enqueue). `MAIL_TRANSPORT`: `direct` (resolve the recipient's MX, deliver on port 25 with verified STARTTLS, DKIM-sign), `smtp` (`SMTP_HOST`/`PORT`/`SECURE`/`USER`/`PASS`) or `log` (development: prints the message, sends nothing). Transient failures retry after 1, 5, 30 min, 2 h and 6 h; 5xx rejections fail immediately; one-time codes past their expiry are dropped unsent. The payload is replaced with `{}` once a message is sent or failed. `npm run mail -- dkim-keygen <dir outside repo> [selector]` creates the DKIM key and prints the `.env` lines and DNS records; `npm run mail -- test <email>` sends one message through the configured transport.

### End of Pro

An hourly job (`PlanLifecycleService`, first run 2 minutes after start) mails `pro_expiring` once per plan end when Pro ends within 7 days; a renewal that moves the end earns a fresh reminder. After Pro ends, saved items are read-only for 90 days. The `cloud_purge` warning goes out 7 days before that, and the items are deleted only once the warning is at least 7 days old, so an account whose Pro ended long ago is warned first and never purged in the same run. Renewing before the purge keeps everything. Disabled accounts are neither mailed nor purged. Only `saved_items` are deleted; source-check history stays. Sent notices live in `plan_notices (user_id, kind, plan_end)`, which is also what makes the job idempotent. Both mails are bilingual (Vietnamese, then English; accounts store no language) and link to `SITE_PUBLIC_URL` (default `https://lpc.vn/doc-tools`).

## Admin area

Staff routes live under `/api/v1/admin/*` and back the frontend's `/quan-tri` pages. There is no separate login: an account with a row in `user_roles` signs in with the same email and password, and its session lasts 12 hours instead of `SESSION_DAYS`. Roles are `reviewer` ⊂ `admin` ⊂ `owner`; permissions per role are in `src/roles/roles.ts`. The first owner is created on the server with `npm run accounts -- grant-role <email> owner <operator>` (also `revoke-role`, `list-roles`).

Every admin route, reads included, requires the trusted-write header and origin (otherwise 403 `UNTRUSTED_REQUEST`), so a cross-site page cannot even read staff data with the cookie. Then: no session → 401 `SIGNED_OUT`; no role → 403 `NOT_STAFF`; a staff session older than 12 h → 401 `STAFF_REAUTH`; missing permission → 403 `FORBIDDEN`. Responses are `Cache-Control: no-store`. Lists page with `?page=` (25 per page) and answer `{ok, page, pageSize, total, items}`. Business refusals are 409/404 with `{ok:false, code, message}` and a Vietnamese message.

| Route | Permission | Notes |
| --- | --- | --- |
| `GET /admin/whoami` · `GET /admin/overview` | `dashboard.view` | Overview: user / Pro / contribution / mail counts, 14-day visit and sign-up series, top 5 tools over 7 days |
| `GET /admin/tools?days=7\|30\|90` · `GET /admin/tools/:tool` | `tools.view` | Daily counts come from `tool_visit_days` (Vietnam day), which starts empty; all-time totals from `tool_visits` |
| `GET /admin/users?q&status&plan&staff` · `GET /admin/users/:id` | `users.view` | Detail adds sessions (metadata only), plan history, contributions, `user_audit` and admin audit |
| `POST /admin/users/:id/disable {reason}` · `/enable` · `/sessions/end` · `PATCH /:id/profile` · `DELETE /:id {confirmEmail}` | `users.manage` | Refused for yourself (`SELF_TARGET`), for another staff account unless you hold `roles.manage` (`STAFF_TARGET`), and for the last active owner (`LAST_OWNER`). Delete needs the exact email (`CONFIRM_MISMATCH`) |
| `POST /admin/users/:id/email {email, reason, password}` | `users.manage` | Support path for someone who lost the old mailbox: no code, the new owner proves the mailbox by resetting the password there. Same target rules as above; `reason` is required (≤ 300, `NOTE_REQUIRED`) and the caller's own password is re-checked (`PASSWORD_WRONG`, after `EMAIL_INVALID` / `EMAIL_SAME` / `EMAIL_TAKEN`, so typos do not cost attempts). Ends every session of the account, voids live codes of the old address, mails `email_changed_old` (new address masked) and `email_changed_new` (with the reset link). Audit `USER_EMAIL_CHANGED` with `old → new: reason`; `user_audit` `EMAIL_CHANGED` by the staff email |
| `POST /admin/users/:id/pro {until:"YYYY-MM-DD", note}` · `/pro/revoke {note}` | `plans.manage` | Same rules as the CLI: through the end of that Vietnam day, the later end date wins |
| `GET /admin/contributions?status&domain&queue=open` · `GET /:id` · `POST /:id/transition {action, note, digest}` | `contributions.review` | `action`: `verify` (note ≥ 10 chars), `approve`, `reject` (note required), `publish`, `supersede`, `revoke`. Same three-person rule as the CLI (`SAME_PERSON`); publishing rule data checks the staged signed package by `digest` (`PACKAGE_*`, `SIGNING_KEY_MISSING`, `BASE_CHANGED`). Signing and staging packages stay in the CLI |
| `GET /admin/mail?status` · `GET /admin/mail/dns` | `mail.view` | Outbox rows never include `payload`; `config` is the configuration in effect, secrets as set/unset only. DNS check looks up MX, SPF, DKIM, DMARC live (5 s timeout) |
| `POST /admin/mail/test {to?}` | `mail.test` | Queues a `test` message to `to` or to the caller |
| `GET /admin/settings` · `PUT /admin/settings/:key {value}` · `DELETE /admin/settings/:key` | `settings.manage` | Runtime switches in `app_settings` (cached 30 s per process): `auth.signupOpen`, `contributions.guestHourly`, `contributions.accountHourly`, `cloud.maxItems`, `cloud.maxMegabytes`. `system` reports the configuration in effect, secrets as set/unset, never their content |
| `GET /admin/integrations` · `PUT /admin/integrations/mail\|goclaw {password, values, secrets}` · `DELETE /admin/integrations/:group {password}` | `settings.manage` | Mail and GoClaw settings, see below |
| `POST /admin/integrations/mail/dkim {password, selector}` | `settings.manage` | Generates an RSA-2048 DKIM key on the server, stores it sealed, sets the selector and answers `record {selector, host, value}` (the TXT record to publish); the private key is never returned |
| `POST /admin/integrations/mail/verify` | `mail.test` | Logs in to the SMTP server without sending: `{result: {ok, error}}`. 400 `NOT_SMTP` for other transports |
| `GET /admin/roles` · `PUT /admin/roles {email, role}` · `DELETE /admin/roles/:userId` | `roles.manage` | The account must already exist; changing a role ends that person's sessions; the last owner cannot be removed or demoted |
| `GET /admin/ai?q&status` · `GET /admin/ai/status` | `ai.view` | Members' AI keys (provider type, model, status, agent state; never the key). `status` reads GoClaw live: reachable, MCP server registered, `background.provider` (reported, never changed), plus `reconcile`, the last hourly reconciliation of this process (`{at, checked, expired, drift, stray, errors}` or `null`) |
| `POST /admin/ai/mcp/register` · `POST /admin/ai/agents/sync` | `ai.manage` | Same as `npm run ai -- register-mcp` / `sync-agents`. Register: 503 `AI_UNAVAILABLE` without GoClaw, 502 `GOCLAW_ERROR` (Vietnamese message) when GoClaw refuses or the MCP address is not set. Sync answers `{promptVersion, updated, failed[]}` |
| `POST /admin/ai/:userId/disable` · `/enable` | `ai.manage` | Disable turns the agent off, disables the provider and revokes the MCP token; the member cannot undo it. Enable only lifts the block: status becomes `failed` and the member must check the key again |
| `GET /admin/audit?actor&target` | `audit.view` | `admin_audit`, newest first |

### Mail and GoClaw settings

An owner sets the outgoing mail (transport, sender, HELO, SMTP host/port/TLS/user/password, DKIM domain and key) and GoClaw (address, gateway token, public WebSocket and files addresses, MCP address and allowed IPs) from the admin area. Precedence is admin area, then `.env`, then the default; each group is saved whole in `app_settings` (`integration.mail`, `integration.goclaw`), so after the first save the `.env` values of that group no longer apply. Changes apply at once in the process that saved them and within 30 s in others; the mail transport is rebuilt, nothing restarts.

- Secrets (`smtpPassword`, `gatewayToken`, the DKIM key) go to `app_secrets`, sealed with AES-256-GCM under a key derived from `CONFIG_ENCRYPTION_KEY`, bound to their name. No API ever returns them: `GET` answers each as `{source: "ui"|"env"|null, updatedBy, updatedAt, readable}`; `readable: false` means the key changed since it was sealed. Without `CONFIG_ENCRYPTION_KEY`, typing a secret → 409 `ENCRYPTION_KEY_MISSING`.
- `secrets` per field: a string sets it, `null` removes the admin-set value, absent keeps it.
- Input is checked first (400 `INVALID_INPUT`, no password attempt used), then `password` like `DELETE /me` (400 `PASSWORD_WRONG`, 10 checks / 15 min / account).
- A password or token is tied to its address. Changing the SMTP host or the GoClaw address while one is in use → 400 `SECRET_REQUIRED` unless a new one (or `null`) is sent, and the stored one is dropped. The `.env` password / token is only ever sent to the `.env` host / address.
- `DELETE` returns the group to `.env`, removing its admin-set secrets too.
- `CONFIG_FROM_ENV_ONLY=1` ignores everything saved here (a way back in after a bad value; also what the test suite sets). The CLIs (`npm run ai`, `npm run mail -- test`) read the same saved settings.
- Audit: `INTEGRATION_CHANGED` (names of changed fields and `<secret>=set|removed`, never values), `INTEGRATION_RESET`, `DKIM_GENERATED`, `MCP_REGISTERED`, `AGENTS_SYNCED`.

Every write is recorded in `admin_audit` (actor id + email, action, target, detail ≤ 1000 chars). Failed mail cannot be resent from the admin area: its payload is wiped when it leaves the queue so one-time codes are not kept.

## Intro pages for host sites (landings)

Each industry website (office, family, construction…) shows its own Chuyện Nhỏ intro page by reverse-proxying one of its paths to `<DocTools>/gioi-thieu/<key>`. The frontend renders that page; this module stores its content. Blocks are fixed: staff change text, pictures, accent colour, logo and light/dark mode, nothing else. Vietnamese only. Tables `landing_pages` (draft + published copy per key) and `landing_assets` (uploaded pictures); picture bytes live on disk in `LANDING_ASSET_DIR` (default `data/landing-assets`).

| Route | Who | Notes |
| --- | --- | --- |
| `GET /landings/:key` | public | Published copy only: `{ok, landing:{key, publishedAt, ...doc}}`, `no-store`. 404 `NOT_FOUND` when the key is unknown or unpublished. Read by the frontend server, which caches it 60 s |
| `GET /landings/assets/:id` | public | Picture bytes. `id` is the sha256 of the file, so the response is `immutable` for a year, with `nosniff` and `Cross-Origin-Resource-Policy: cross-origin` (host sites on other domains show it). Unknown id, or a row whose file is gone → 404 |
| `GET /admin/landings` | `landings.manage` | `{ok, landings:[summary]}`; summary = `{key, name, rev, publishedRev, published, unpublishedChanges, createdAt, updatedAt, updatedBy, publishedAt, publishedBy}` (seconds) |
| `POST /admin/landings {key, name}` | `landings.manage` | `key` matches `^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$` and never changes; the draft starts as a copy of the office page's copy. 409 `LANDING_EXISTS` |
| `GET /admin/landings/:key` | `landings.manage` | `{ok, landing:{...summary, draft, publishedContent}}` (`publishedContent` is `null` when unpublished) |
| `PUT /admin/landings/:key {name?, draft, baseRev}` | `landings.manage` | Replaces the draft whole. `baseRev` is the `rev` the editor loaded; if someone saved since → 409 `LANDING_CONFLICT` with the current `landing` summary. Body ≤ 64 KiB |
| `POST /admin/landings/:key/publish {baseRev}` | `landings.manage` | Copies the draft at `baseRev` to the published copy, after checking it again (a tool retired since the save fails here). Same 409 |
| `POST /admin/landings/:key/unpublish` | `landings.manage` | Public route answers 404 again; the draft stays. There is no delete |
| `POST /admin/landings/assets` | `landings.manage` | Raw bytes, `Content-Type: application/octet-stream`, file name URI-encoded in `X-CN-Filename`. PNG, JPEG or WebP by magic bytes (never SVG: these files are served from DocTools' own origin) → 415 `UPLOAD_TYPE`; over `LANDING_ASSET_MAX_BYTES` (default 5 MiB, hard cap 10 MiB) → 413 `UPLOAD_TOO_LARGE`. Answers `{ok, asset:{id, mimeType, size}}`; the same file twice gives the same id |

The draft (`LandingDoc`, `src/landings/landing-content.ts`) is checked on every save and publish. The first bad field answers 400 `INVALID_INPUT` with `field` as a dotted path (`hero.title`, `cases.items.1.target`) so the editor can point at it.
- Text is one plain line: control characters and line breaks collapse to a space, markup is kept literally (the page escapes it). Caps: 60 for buttons and link labels, 120 for titles, 400 for paragraphs, 70 / 200 for `meta.title` / `meta.description`.
- `theme.accent` is `#rrggbb`, `theme.mode` is `light` or `dark`; pictures are asset ids or `null` (the page then uses the office page's artwork).
- `tools.items` and every other `items` array hold exactly 3 entries. A tool slug must be a `ready` tool in `data/tool-catalog.json`; an empty tool title or body is filled from the catalog on the page. A use-case `target` is a ready tool or one of `cong-cu`, `tai-lieu-pdf`, `gia-dinh`, `xay-dung`, `huong-dan`.
- `canonicalUrl` is the page's address on the host site (https; plain http only for `localhost` / `127.0.0.1`), or empty to credit DocTools.

Audit: `LANDING_CREATED`, `LANDING_DRAFT_SAVED` / `LANDING_PUBLISHED` (detail `rev N`), `LANDING_UNPUBLISHED`, `LANDING_ASSET_UPLOADED` (detail = asset id), target type `landing`.

`LANDING_ASSET_DIR` must survive deploys (keep it outside the release folder, or exclude it from `rsync --delete`). A database row whose file is gone answers 404, and the page shows a broken picture without any error.

How host sites proxy the page: `frontend/docs/landing-host-proxy.md`.

## Saved items (Pro)

Table `saved_items`: per account, either a saved tool result (`kind: result`, the tool page's own JSON in `payload`) or a favourite tool (`kind: bookmark`, at most one per tool). The server list is the only copy; devices re-read it (on focus and every minute) instead of syncing changes, so a delete is a real `DELETE` with no tombstone.

| Route | Who | Notes |
| --- | --- | --- |
| `GET /me/saved` | signed in | `{ok, items:[{id, kind, toolId, title, size, rev, createdAt, updatedAt}], usage:{items, bytes, maxItems, maxBytes}, writable, purgeAt}`, newest change first, never the payload. `writable` is false once Pro has ended; `purgeAt` (seconds) is when the read-only items will be deleted, `null` while Pro is active or nothing is left |
| `GET /me/saved/:id` | signed in | `{ok, item}` with `payload` |
| `POST /me/saved {toolId, title, payload}` | Pro, trusted write | `toolId` must be a ready tool slug, `title` ≤ 120 characters (control characters become spaces), `payload` a plain object ≤ 256 KiB as JSON. Returns `{ok, item}` without payload |
| `PATCH /me/saved/:id {baseRev, title?, payload?, force?}` | Pro, trusted write | Results only. `baseRev` is the revision the device last read; if the item moved on, 409 `SAVED_CONFLICT` with `item` (the server's current meta) so the person can choose, then resend with `force: true` to overwrite. A lost race between two writes also answers `SAVED_CONFLICT` |
| `DELETE /me/saved/:id` | signed in, trusted write | Also allowed after Pro ends |
| `PUT /me/saved/bookmarks/:toolId` · `DELETE /me/saved/bookmarks/:toolId` | Pro / signed in, trusted write | Both idempotent |

Quotas are runtime settings: `cloud.maxItems` (default 500, bookmarks count) and `cloud.maxMegabytes` (default 20). Over quota → 409 `CLOUD_QUOTA`; checked before the write, so two simultaneous saves can overshoot by one item. Making an item smaller is always allowed, even over the cap. Other codes: `SIGNED_OUT` 401, `PRO_REQUIRED` 403, `INVALID_INPUT` 400, `NOT_FOUND` 404 (also for another account's id), `CLOUD_ITEM_TOO_LARGE` 413. Account deletion removes every row.

## AI assistant (Pro)

Each Pro member brings their own AI key. The backend registers it in a shared GoClaw as one provider and one agent named `cn-<userId>`, and the browser chats with GoClaw directly over WebSocket using a short-lived ticket. The key goes to GoClaw (stored encrypted there) and is never kept or returned here.

| Route | Who | Notes |
| --- | --- | --- |
| `GET /ai/provider-types` | anyone | Supported provider types `{type,label,apiBase,customBase}`; only `openai_compat` accepts a custom `apiBase` |
| `GET /ai/setup` | signed in | `{available, provider:{type,apiBase,model,status,lastError,verifiedAt}\|null, agent:{status,upToDate}\|null}`; `available:false` when `GOCLAW_GATEWAY_TOKEN` is unset |
| `PUT /ai/provider {type, apiKey, apiBase?}` | Pro, trusted write, 4 KiB | Saves the key (status `verifying`) and answers the setup plus `models` (≤ 300, from the provider) |
| `POST /ai/provider/verify {model}` | Pro, trusted write | GoClaw sends one short test call. Failure → 422 `AI_VERIFY_FAILED`, status `failed`, provider disabled. Success → status `ready`, agent created/updated, prompt files written, MCP tools granted, agent switched on last |
| `DELETE /ai/provider` | signed in, trusted write | Agent off, then provider deleted, then MCP credential dropped |
| `POST /ai/session` | Pro, trusted write | `{token, wsUrl, filesUrl, userId, agentKey, expiresAt}`. `filesUrl` is GoClaw's HTTP root for signed `/v1/files/...` links in history (`GOCLAW_PUBLIC_FILES_URL`, else derived from `wsUrl`). Re-checks GoClaw first; a provider or agent that drifted (disabled, renamed, pointed elsewhere) switches the agent off and answers 409 `AI_NOT_READY`. An agent switched off because Pro ended is provisioned again here after a renewal, provided the GoClaw provider is still enabled under the same name |
| `POST /ai/source-checks {toolId, baseSnapshotId, sessionKey}` | Pro, trusted write, 2 KiB | Records that a source check started (table `ai_source_checks`). `toolId` is a ready tool slug, `baseSnapshotId` the package digest or `null`, `sessionKey` must be one of the caller's own agent sessions (`agent:cn-<userId>:ws:direct:<uuid>`); otherwise 400 `INVALID_INPUT`. A draft the agent creates within 6 h for the same tool is linked to the latest check. Returns `{ok,id}` |
| `GET /ai/history?before=` | signed in (also after Pro ends) | The caller's source checks, newest first, 30 per page: `{ok, items:[{id, toolId, baseSnapshotId, createdAt, draft, contributionId, contributionStatus}], next}`. `draft` is `none` (no draft linked), `open`, `submitted` or `discarded` (the draft row is gone). `next` is an opaque `<createdAt>.<id>` cursor or `null`; a malformed one is 400 `INVALID_INPUT`. Question text is never stored, so there is nothing more to show |

| `POST /ai/uploads` | Pro, trusted write, 10 MiB | Body is the raw file (`Content-Type: application/octet-stream`), name in header `X-CN-Filename` (URI-encoded). Images only (PNG, JPEG, WebP, GIF), recognised by their first bytes, not the name. Returns `{ok, upload:{id, filename, mimeType, size, expiresAt}}` (`expiresAt` in seconds) |
| `POST /ai/uploads/:id/link` | Pro, trusted write | `{ok, url, expiresAt}`: a single-use link valid 5 minutes, for `media[].path` of GoClaw `chat.send` |
| `DELETE /ai/uploads/:id` | signed in, trusted write | Removes the file and revokes an unused link. The row stays until expiry so the daily quota still counts it |
| `GET /ai/uploads/:id/raw/:token/:name` | GoClaw only (`MCP_ALLOWED_IPS`) | Serves the file once (`attachment`, `nosniff`, `no-store`); unknown, used or expired link → 404 |

Error codes: `SIGNED_OUT` 401, `PRO_REQUIRED` 403, `AI_DISABLED` 403 (staff block), `INVALID_INPUT` / `INVALID_API_BASE` 400, `AI_NO_PROVIDER` / `AI_NOT_READY` 409, `UPLOAD_TOO_LARGE` 413, `UPLOAD_TYPE` 415, `AI_VERIFY_FAILED` 422, `UPLOAD_QUOTA` 429, `AI_UPSTREAM` 502, `AI_UNAVAILABLE` 503.

### Attachments in chat

Images go through `/ai/uploads`: the browser uploads, asks for a link, passes it in `chat.send` **without a `filename`**, then deletes the upload once the send settles. GoClaw downloads the link and keeps its own copy; without a filename it names the copy `<uuid>.<ext>`, which its vault enrichment skips (a named copy would be summarised and embedded with the tenant's background provider, i.e. not the member's key). Text files (TXT, MD, CSV, JSON) never reach this API: the browser puts them in the message as ```` ```cn-file name="…" ```` blocks. PDF, Word, Excel and audio are refused on both sides, and the agent's `tools_config` denies `read_image`, `read_audio`, `read_document`, `read_video` because those tools choose their provider across the whole tenant.

Limits: 10 MiB per file (GoClaw cuts a downloaded URL at 10 MiB without an error), `AI_UPLOAD_DAILY_BYTES` per member over a rolling 24 h (default 2 GiB), files removed after `AI_UPLOAD_RETENTION_DAYS` (default 7) by an hourly sweep, and on account deletion. The link host is `AI_UPLOAD_PUBLIC_URL` (default: `MCP_PUBLIC_URL` without `/mcp/sse`); GoClaw's SSRF check refuses private hosts, so it must be public in production.

Ordering is the guard rail: GoClaw runs an agent whose provider is missing or disabled on a random provider of the tenant, possibly another customer's key. So the agent is always switched off BEFORE its provider is touched, and switched on only after a successful check. `apiBase` must be `https://` and resolve to public addresses only (`AI_DEV_ALLOW_PRIVATE_API_BASE=1` lifts this in development; GoClaw has its own SSRF check that this flag does not lift).

### MCP tools for the agent

GoClaw calls back `GET /api/v1/mcp/sse` (SSE transport) with header `X-CN-MCP-Token`, a per-member token rotated on every successful check and revoked on disable or deletion. `MCP_ALLOWED_IPS` restricts callers (403 `MCP_FORBIDDEN`); an unknown or revoked token is 401 `MCP_UNAUTHORIZED`; at most 4 open streams per member. Messages go to `POST /api/v1/mcp/messages?sessionId=` (JSON-RPC: `initialize`, `ping`, `tools/list`, `tools/call`). Tools: `cn_find_tools`, `cn_tool_guide`, `cn_open_tool` (returns a ```` ```cn-action ```` block the site turns into an "open tool" button). They read `data/tool-catalog.json`, generated by the frontend's `scripts/export-tool-catalog.mjs`.

Source-check tools (since agent prompt `PROMPT_VERSION` 2; it is now 3, which adds the attachment rules and pushes `tools_config`):

- `cn_get_rules {kind, query?}` — `kind` ∈ `electricity`, `vat`, `payroll`, `addresses`. Answers the package in effect `{snapshotId, effectiveFrom, effectiveTo, source, data}` plus a `fieldHint` for draft field paths (`tiers.<i>.price`, `ward`…), or says there is none. Addresses never send the full ward list: `data` holds the provinces, a ward count and up to 30 wards matching `query`.
- `cn_create_contribution_draft {toolId, domain, baseSnapshotId, changes[], sources[], uncertainties[], jurisdiction}` — validated like a contribution (high-risk domains need a source; at most 20 uncertainties of 1000 characters). It only stores a draft for the member (table `contribution_drafts`, at most 20 open per member); nothing is submitted. The answer tells the agent to say so.
- `cn_my_contributions {status?}` — the member's latest contributions and open drafts, so the agent does not draft the same change twice.

CLI: `npm run ai -- status` (GoClaw reachability, MCP registration, `background.provider`), `npm run ai -- register-mcp` (creates or updates the `chuyen-nho` MCP server from `MCP_PUBLIC_URL`), `npm run ai -- sync-agents` (pushes the current prompt files and `tools_config` to agents below `PROMPT_VERSION`), `npm run ai -- reconcile` (runs the reconciliation below once).

Reconciliation (`AiReconcileService`) runs hourly when GoClaw is configured, first 5 minutes after start. For every agent we created it switches the agent OFF in GoClaw when Pro has ended (`expired`; the provider is kept so a renewal resumes without the key), when the provider or agent drifted (`drift`; provider marked `failed`, as in `/ai/session`), or when our record says inactive but GoClaw runs it (`stray`). It never switches anything on. A GoClaw error skips that member until the next hour (`errors`).
