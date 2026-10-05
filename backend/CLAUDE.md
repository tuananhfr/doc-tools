# DocTools Backend

Read README.md first. This is an independent NestJS/Fastify repository with a dedicated MySQL/InnoDB database. It serves only the public Free tool counter API. Read docs/api.md before changing its contract.

POST /api/v1/tools/visits and GET /api/v1/tools/stats preserve the flat {ok,...} envelopes, slug validation, upstream JSON body behavior and rolling 120/hour/IP flood limit. Over-limit visits still return {ok:true}. IP records use HMAC and expire; user file contents never reach this API.

Modules are under src. src/main.ts only composes the app; config/http-adapter.ts preserves parser and loopback proxy behavior. The database service creates its own tables. Keep controllers, services and repositories focused on their responsibilities. Never point this app at the ERPCons database.

Run npm ci, npm test, npm run build and npm run lint within this repo. Tests use real MySQL and clean their own qa records. Each repository owns its package-lock.json and dependencies. The lockfile was verified with Node.js 24 and npm 11.11.0. Do not add npm workspaces, file dependencies or links to the frontend repository.

Preserve Vietnamese UTF-8 without BOM. Keep .env and generated dist/node_modules out of Git. Do not commit or push without explicit user instruction.
