# DocTools Frontend

Read README.md and AGENTS.md first. This is an independent Next.js repository for the copied public Free /doc-tools branch. Read docs/upstream/doc-tools.md for the source behavior. Preserve all copied feature files, UI, strings, catalog, engines and output behavior. docs/upstream-manifest.json records the original SHA-256 hashes.

Runtime composition is in src/runtime. Next.js hosts a persistent React Router data router. next.config.mjs replaces only useHubPrefs with the hydration adapter; src/proxy.ts handles legacy ?tool links before SSR. Browser-only engines must not evaluate during server rendering. Styles and assets preserve the upstream presentation.

The only backend dependency is HTTP: BACKEND_URL configures the external NestJS counter API. Keep flat {ok,...} envelopes. The Free app has no local login; login/Pro links point to ERPCons.

Run pnpm install --frozen-lockfile, pnpm test, pnpm build and pnpm lint within this repo. pnpm-workspace.yaml only configures allowed dependency build scripts for this single project. Do not add workspace packages, file dependencies or links to the backend repository.

Preserve Vietnamese UTF-8 without BOM. UI verification requires responsive screenshots and real file processing. Do not commit or push without explicit user instruction.
