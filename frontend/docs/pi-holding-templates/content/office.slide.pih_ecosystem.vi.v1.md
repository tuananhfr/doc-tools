# office.slide.pih_ecosystem.vi.v1 (BLOCKED - content only, no integration)

- **Product / feature**: doc-tools / `office-slide` (DeckCraft editor)
- **Title**: PI Holding / ERPCons ecosystem overview (demo)
- **Goal (intended, not built)**: A short deck (cover, ecosystem diagram slide, one
  product-highlights slide, closing slide) introducing the fictional "PIH ecosystem" the same
  way the PDF/Word/Excel samples do, to try DeckCraft.
- **Why this is BLOCKED tonight**: two independent blockers, either one alone would be enough:
  1. Same DeckCraft iframe constraint as Word/Excel (`office.word.lpc_profile.vi.v1` has the
     full writeup) - no verified way to pre-load content without touching the vendor engine.
  2. Unlike Word (`docx`) and Excel (`exceljs`), **no .pptx generation library exists anywhere
     in this repo** (no `pptxgenjs` or equivalent), so even the "download-only" fallback used
     for Word/Excel is not available without adding a new dependency. Hand-rolling a raw OOXML
     `.pptx` zip (XML slide parts, relationships, content-types) by hand, overnight, with no
     test harness to confirm PowerPoint/DeckCraft actually opens the result, was judged too
     risky to ship even behind a flag - a corrupt "sample" file would be a worse user
     experience than no sample at all.
- **Decision**: content is drafted below for BU/CMO review and for scoping a follow-up PR; NO
  frontend code references this `template_id`; it does not appear in any manifest as enabled,
  and no UI button exists for it.
- **Draft slide outline (for a future PR, once a pptx generator is approved)**:
  1. **Cover**: "PI HOLDING - Ecosystem overview (demo)"
  2. **Ecosystem diagram (demo)**: boxes for "ERPCons Demo", "Tekshot Demo", "Ubot Demo",
     "DocTools Demo" with simple arrows - all fictional names, no real org chart or revenue.
  3. **Highlights (demo)**: 3 bullet points per fictional product, clearly invented examples.
  4. **Closing (demo)**: a simulated-data notice, no CTA.
- **Source / rights**: would be fully synthetic, same rules as every other template here.
  `rights: synthetic` (pre-assigned for when this is picked back up).
- **Review**: not started - this is a scoping note, not a deliverable ready for review.
  `review_status: draft`.
