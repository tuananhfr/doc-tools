# Incremental Free workspace adapters

The existing React Router entry points, guest access, local file processing, FlowTask/FlowResult, authentication, AI and ERPCons handoff are retained. The runtime workspace registry references the native CV/form/design template definitions and records version, input, export, storage and owner metadata. No generic server session/job/result platform has been introduced.

Family Calendar keeps /lich-gia-dinh and its existing storage keys as a separate product. Its entry is outside the Free tool catalog. Advanced construction prices, planning, law, standards and dossier checks belong to ERPCons; Chuyện Nhỏ retains its existing user-input Free calculators.

CV has five templates sharing CvDraft and local PDF/DOCX serializers. Draft persistence is opt-in. Forms share PrintDocument with CV; each form kind retains its in-memory draft. Added agreement/employment forms are user-filled references with a disclaimer, not certified legal templates.

Single ID-photo input remains the default. The optional mixed workspace retains per-photo crop, size, copies and appearance. Background replacement is for solid backgrounds; clothing is a manually positioned raster overlay. The single-photo camera accepts one shot; mixed capture reuses the existing multi-photo camera.

The original simple collage remains available. Its optional shop workspace processes up to 100 original images through six layouts with a logo and PDF/image/ZIP export. Quick design has eight flat print-area presets and optional local brand information. PNG/JPEG exports have 300 DPI metadata; PDF stores physical dimensions. No 3D product rendering is promised.

Static QR, barcode and A4 labels remain local. Optional dynamic QR and /quan-ly-ma use the approved /api/v1/codes contract, two new CREATE-only tables and an atomic UTC-hour guest limit (default 10, configurable). Creation returns a confidential management key once; public QR URLs never contain it. Scans require connectivity. Receipt state is local; server expiry/revocation checks are authoritative. Explicit consent covers destination/timestamps/key-hash storage; device key saving is opt-in. See ../backend/docs/api.md from the repository root.

Deployment requires rebuilding/restarting both applications; pushing does not deploy. Backend SITE_PUBLIC_URL must be the canonical site URL, including any base path. No feature sandbox flag is used. Existing secrets and deployed tables must be preserved.

OCR is explicitly a separate work package. This repair contains no OCR engine replacement. Local diagnostic evidence is saved outside tracked source under qa-output/2026-10-12-repair-v1-1.
