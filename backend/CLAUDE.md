# DocTools Backend

Read README.md first. This is an independent NestJS/Fastify repository with a dedicated MySQL/InnoDB database. It serves the public tool counter, signed rule snapshots, and contribution intake/status APIs. Read docs/api.md before changing their contracts.

POST /api/v1/tools/visits and GET /api/v1/tools/stats preserve the flat {ok,...} envelopes, slug validation, upstream JSON body behavior and rolling 120/hour/IP flood limit. Over-limit visits still return {ok:true}. IP records use HMAC and expire; user file contents never reach this API.

Modules are under src. src/main.ts only composes the app; config/http-adapter.ts preserves parser and loopback proxy behavior. The database service creates its own tables. Keep controllers, services and repositories focused on their responsibilities. Never point this app at the ERPCons database.

The rules module serves only signed, active, effective rule snapshots. Trusted operator CLIs are the only write paths: the rules CLI stages/activates/rolls back; the contributions CLI can activate a staged package after review. Both publication paths require `RULE_SIGNING_PUBLIC_KEY_PEM`; the private signing key must stay outside this repo. Preserve immutable package rows and audit every stage/activate/rollback. Never publish archive legal or pricing data without an independently verified signed package.

The contributions module accepts only selected structured changes, source URLs, and minimal metadata. It limits anonymous submissions by HMAC IP, stores hashed receipt codes, and exposes status without content. Review and publication occur only through the trusted operator CLI. Verify source evidence, keep reviewer/approver/publisher separate, and require a staged signed rule package for rule publication. Ideas are a separate domain and become public only after three-stage review. The external L3 identity/capability adapter is not connected yet.

Run npm ci, npm test, npm run build and npm run lint within this repo. Tests use real MySQL and clean their own qa records. Each repository owns its package-lock.json and dependencies. The lockfile was verified with Node.js 24 and npm 11.11.0. Do not add npm workspaces, file dependencies or links to the frontend repository.

Preserve Vietnamese UTF-8 without BOM. Keep .env and generated dist/node_modules out of Git. Do not commit or push without explicit user instruction.
