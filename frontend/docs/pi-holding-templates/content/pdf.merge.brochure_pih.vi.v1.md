# pdf.merge.brochure_pih.vi.v1

- **Product / feature**: doc-tools / `merge-pdf`
- **Title**: PIH brochure, 3 pages (demo)
- **Goal**: Show merge-PDF working on a realistic multi-document scenario (cover, content,
  contact page) without the visitor needing three files of their own ready to try it.
- **Source / rights**: Fully synthetic; "PI Holding", "ERPCons Demo", "Tekshot Demo", "Ubot
  Demo" are the group's own names used as fictional placeholders, no real figures. `rights: synthetic`.
- **sample_data**: `true` - every page is headed "PI HOLDING - SAMPLE TO TRY" and footed with
  a simulated-data notice.
- **Input**: none (three files generated in-browser via pdf-lib, one call each).
- **Expected**: three independent, loadable 1-page PDFs; merging them (existing, unmodified
  `mergeTask`) produces one 3-page PDF in cover/content/contact order. Verified by
  `pih-pdf-samples.test.ts` (page counts, distinct file names).
- **Steps**:
  1. Open `/ghep-pdf` (merge-pdf) with the flag on and no files chosen.
  2. Click "Dùng mẫu PI Holding" next to the file picker.
  3. Three sample pages appear in the file list, ready to reorder.
  4. Reorder/drop a page if you like, then run Merge.
  5. Download the merged brochure and confirm page order/content.
- **CTA**: none.
- **Review**: BU / product owner, CMO — pending. `review_status: draft`.
- **Access**: anonymous.
