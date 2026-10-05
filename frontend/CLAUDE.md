# DocTools Frontend

Read README.md and AGENTS.md first. This is an independent Next.js repository for the copied public Free DocTools branch. The homepage is /, the complete directory is /cong-cu, and tools are /<slug>; legacy /doc-tools URLs redirect permanently to the root routes. Read docs/upstream/doc-tools.md for the source behavior. Preserve the copied tool workspaces, catalog, engines and output behavior. The approved public website redesign lives in src/features/site and src/styles/site; the homepage and directory reuse the existing catalog and URL helpers. The shared URL helpers normalize the root branch so tool links and leave guards work at /. docs/upstream-manifest.json records the original SHA-256 hashes.

Runtime composition is in src/runtime. Next.js hosts a persistent React Router data router. next.config.mjs replaces only useHubPrefs with the hydration adapter; src/proxy.ts handles legacy /doc-tools and ?tool links before SSR. Browser-only engines must not evaluate during server rendering. ToolsLayout composes the shared website header, the persistent tool scroll region, and a website-only footer. Non-editor tool workspaces retain the upstream split panel. Directory filters use q and nhom query parameters and restore after hydration. The site uses self-hosted Be Vietnam Pro and blue/navy tokens scoped to the public website. Build regenerates the offline manifest including the directory, brand assets and emitted Next image sizes.

The only backend dependency is HTTP: BACKEND_URL configures the external NestJS counter API. Keep flat {ok,...} envelopes. The Free app has no local login; login/Pro links point to ERPCons.

Run npm ci, npm test, npm run build and npm run lint within this repo. Each repository owns its package-lock.json and dependencies. The lockfile was verified with Node.js 24 and npm 11.11.0. Do not add npm workspaces, file dependencies or links to the backend repository.

Preserve Vietnamese UTF-8 without BOM. UI verification requires responsive screenshots and real file processing. Do not commit or push without explicit user instruction.
