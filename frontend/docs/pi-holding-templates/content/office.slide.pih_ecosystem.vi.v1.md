# office.slide.pih_ecosystem.vi.v1

- **Product / feature**: doc-tools / `office-slide` (DeckCraft editor)
- **Title**: PI Holding / ERPCons ecosystem overview (demo)
- **Status**: implemented (download-only), same pattern as Word/Excel. Originally BLOCKED
  overnight because no `.pptx` generation library existed in the repo; unblocked during a
  follow-up daytime session by adding `pptxgenjs` as a new dependency.
- **Why download-only**: same DeckCraft iframe constraint as Word (`office.word.lpc_profile.vi.v1`
  has the full writeup) - no verified way to pre-load content without touching the vendor engine.
  User downloads the generated `.pptx` and opens it themselves via DeckCraft's own "Mở tệp"
  control.
- **Dependency note**: `pptxgenjs@4.0.1` pulls in `image-size@1.2.1`, which has an open
  high-severity advisory (DoS via infinite loop parsing malformed JXL/HEIF/ICNS images). The
  generator (`createPihOfficeEcosystemPptx`) never calls `addImage` - every slide uses only text
  boxes and shapes - so that code path is not exercised by this feature. Still a new transitive
  dependency in the lockfile; worth a security-team look before `enabled: true`.
- **Slide outline (implemented)**:
  1. **Cover**: "PI HOLDING - Ecosystem overview (demo)"
  2. **Ecosystem diagram (demo)**: rounded-rect boxes for "ERPCons Demo", "Tekshot Demo",
     "Ubot Demo", "DocTools Demo" with arrow text between them - fictional names, no real org
     chart or revenue.
  3. **Highlights (demo)**: 2 bullet points each for ERPCons Demo / Tekshot Demo / Ubot Demo,
     clearly invented examples.
  4. **Closing (demo)**: simulated-data notice, no CTA.
- **Source / rights**: fully synthetic. `rights: synthetic`.
- **Testing done**: `pih-office-samples.test.ts` checks the output is a valid zip, has exactly 4
  `ppt/slides/slideN.xml` parts, and the diagram slide's XML contains the expected labels.
  **Not yet done**: opening the actual file in real PowerPoint and in DeckCraft to visually
  confirm layout/fonts/colors render as intended - needs a human with those apps.
- **Review**: not started. `review_status: draft`.
