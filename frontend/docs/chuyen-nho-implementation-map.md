# Chuyen Nho implementation map

This map records how the supplied `docs/` archive relates to the current DocTools repositories. It is an implementation checklist, not a claim that the archived legal, tax, price, or administrative data has been independently verified.

## Baseline before this work

- `frontend/` is the public Next.js tool site. The catalog has 35 ready tools and one `soon` entry. Browser processing remains local; the only tool API call sends a slug for visit counting.
- `backend/` is a NestJS/Fastify/MySQL visit counter with `POST /api/v1/tools/visits` and `GET /api/v1/tools/stats`. It has no account, contribution, source registry, or family data service.
- The archived `chuyen-nho-source` is a standalone HTML/JavaScript application. Its server is a reference implementation backed by JSON files. Its paths, key handling, storage, and authentication cannot be copied into production unchanged.
- The `-1_1` archives add eight tools in `tools4.js`, a different build, video/PDF vendor files, and an expanded administrator guide. Shared files between archive versions should be compared by content before porting; the newer archive is the functional reference.

## Archived tool inventory

| Source module | Archived tool IDs | Reuse / target |
| --- | --- | --- |
| `tools1.js` | `so-thanh-chu`, `vietqr`, `hoa-don-xml`, `chuyen-font`, `doi-dia-chi`, `lich-am`, `luong`, `tien-dien` | New Vietnam-focused tools. Reuse existing QR and utility shells where possible. Payroll, electricity, VAT, and addresses require verified versioned sources. |
| `tools2.js` | `hoc-tap`, `chia-tien`, `pomodoro`, `flashcard`, `ghi-am`, `mau-don`, `vay`, `doc-to`, `kinh-lup`, `lua-dao`, `xoa-metadata`, `ghep-anh`, `so-sanh-gia`, `tro-ly`, `gop-y-quy-dinh` | New study, finance, safety, media, and contribution features. `xoa-metadata` is an explicit removal tool; existing image tools keep their current EXIF behavior. AI-dependent actions use BYOAI preview/consent. |
| `tools3.js` | `bang-vinh-danh`, `de-xuat-tien-ich` | New community feature backed by reviewed contribution/roadmap data. Rewards are granted after verification, not for unverified volume. |
| `tools4.js` | `nen-video`, `cat-video`, `tao-gif`, `tach-am-thanh`, `xoa-phong`, `mat-khau-pdf`, `tao-cv`, `khai-toan-nha` | New media/document/construction tools. Reuse PDF and image engines when possible. Video uses locally hosted WASM with explicit limits. |

The 33 archive tools are distinct catalog entries. Similar current tools (`money-calc`, `qr-create`, `quick-note`, image tools, PDF password support) may share engines or screens but should preserve their published routes and output behavior.

## Implemented in this checkout

- 28 of the 33 archived tool IDs now have separate ready routes. All eight `tools1.js` entries, all fifteen `tools2.js` entries, `de-xuat-tien-ich`, and four `tools4.js` entries are registered. The missing archive IDs are `bang-vinh-danh`, `nen-video`, `cat-video`, `tao-gif`, and `tach-am-thanh`.
- Calculators and parsers run locally. Address, payroll and electricity screens accept user-entered values or a signed rule package; they do not ship unverified archive tariffs or legal values as current law. The lunar conversion has dated reference tests. The invoice viewer does not claim cryptographic signature verification.
- Backend has an Ed25519 rule registry with immutable stage/activate/rollback audit, public read-only active snapshots, anonymous contribution receipts, flood/duplicate controls, and a trusted three-operator review CLI. Next.js proxies the new API paths. BYOAI previews/redacts prompts, accepts pasted JSON, shows selected differences and submits only after consent. Idea publication requires review; public idea listing excludes pending content.
- Family Calendar Web/PWA has a platform-neutral model, local IndexedDB persistence, members, recurring agenda, foreground reminders, local SOS contacts, backup/restore, ICS export and A4 print. Sharing, account recovery, push delivery and Native have not been implemented.
- The four video tools depend on a browser FFmpeg core. The tested official core declares GPL-2.0-or-later; its trial dependencies were removed from the delivered manifest while the owner chooses a distribution approach. The video routes are not exposed. The supplied archive does not include its `vendor/` assets.
- L2 account identity and L3 ERPCons/Tekshot capabilities remain outside this implementation until the identity method/contract is supplied. There is no verified community identity to support a trustworthy honor board, so `bang-vinh-danh` is not marked ready.

## Cross-cutting work and dependencies

1. Port pure calculation/parsing engines by domain and add reference-vector tests. Do not install the monolithic `engines.js` bundle in the Next.js startup path.
2. Add a source registry, signed rule-package verification, immutable dataset snapshots, effective dates, evidence, audit log, and rollback before showing dynamic official-looking results as verified.
3. Add L1 anonymous and L2 account capabilities in this repository. L3 uses a defined entitlement/identity adapter until the ERPCons/Tekshot contract and access are available.
4. Implement BYOAI as preview/redaction, copy/open, import, diff, contribution, review, approval, and publication. AI output alone cannot publish a high-risk dataset.
5. Implement Family Calendar Web/PWA with one platform-neutral core, local IndexedDB storage, backup/restore, sharing relay, device recovery, and local-first SOS. Native phases are conditional on the document's product, security, legal, and store-policy gates.
6. Complete API, storage, security, real-output, responsive visual, and offline verification before release. Do not import archive secrets or treat bundled reference legal data as current authority.

## Authority order for conflicts

1. Explicit owner decisions already recorded in the current repositories, including preserving EXIF in existing image tools.
2. The BYOAI and Family Calendar DOCX governance and privacy requirements.
3. The newer `-1_1` archive as a functional reference for the 33 tools and administrator workflow.
4. Older archive variants and the PDF engine listing as comparison material.

Where the archive and current app have different behavior, implement the new feature behind a separate route/feature boundary and preserve existing output until the relevant regression checks pass.

## Remaining delivery plan and decisions

1. **Video (4 routes):** confirm the distribution license for the browser FFmpeg core. After the owner chooses GPL compliance or an LGPL-capable build, add one lazily loaded adapter under `src/features/tools/video/services/`, four focused pages under `video/pages/`, register the four routes in the catalog/types/runtime, self-host the core assets and test short/long video, trim boundaries, GIF duration, audio extraction, memory limits and mobile fallback. No FFmpeg package is part of the current dependency manifest.
2. **L2 identity and honor board:** select a local login/recovery method or provide the ERPCons/Tekshot identity contract. Add account tables and endpoints in `backend/src/identity/`, consented attribution on verified contributions, and a public aggregate endpoint plus `bang-vinh-danh` screen. Never rank anonymous submissions or self-claimed names as verified people.
3. **Family Share and recovery:** after the identity method is chosen, add a versioned encrypted relay, invite expiry, device credentials, revocation and recovery under `backend/src/family/` and `frontend/src/features/tools/family/`. Keep the local IndexedDB IDs and backup format portable. Test conflict handling, lost device, offline edits, child/senior visibility, private event exclusion, and SOS without network. Push notifications require a delivery provider and permission flow.
4. **L3 adapter:** map ERPCons/Tekshot subject and capabilities (`source.review`, `verify`, `approve`, `publish`, `rollback`, registry and audit) to the existing review transitions once the issuer, JWKS/verification method, audience and role contract are supplied. Replace self-declared CLI operator names for remote administration only after that mapping is tested. The trusted local CLI remains the current operating path.
5. **Verified rules and deployment:** source owners must provide current official evidence and a secure signing key workflow. Stage signed address, payroll, electricity and other rule packages; verify dates and signatures in frontend/backend; test stale-snapshot conflict and rollback. Configure the public key on both services, deploy the backend rewrite, then run production smoke tests without importing archived legal values as current facts.
6. **Native gate:** review product need, security model, legal/privacy text, store policies, offline conflict behavior and device testing. Only after those gates pass, reuse `family/core` in a native shell and add platform-specific notification, backup and sharing adapters.

The current code is not a complete release of every archived and cross-cutting feature. No repository commits or pushes are part of this plan without a separate owner request.
