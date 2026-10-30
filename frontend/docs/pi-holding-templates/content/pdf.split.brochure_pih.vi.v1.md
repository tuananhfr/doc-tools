# pdf.split.brochure_pih.vi.v1

- **Product / feature**: doc-tools / `split-pdf`
- **Title**: PIH brochure booklet, 6 pages (demo)
- **Goal**: Show split-PDF (by page range or every N pages) on a document long enough for the
  feature to make sense, without the visitor supplying their own multi-page file.
- **Source / rights**: Fully synthetic, no real figures. `rights: synthetic`.
- **sample_data**: `true` - every page says "PAGE i / 6 (DEMO)" plus a simulated-data footer.
- **Input**: none (one 6-page PDF generated in-browser via pdf-lib).
- **Expected**: a loadable 6-page PDF; splitting it (existing, unmodified `splitTask`) by
  range or every-N-pages produces the expected number of parts. Verified by
  `pih-pdf-samples.test.ts` (page count = 6).
- **Steps**:
  1. Open `/tach-pdf` (split-pdf) with the flag on and no file chosen.
  2. Click "Dùng mẫu PI Holding" next to the file picker.
  3. The 6-page sample loads.
  4. Pick a split mode (ranges, or every N pages) and run.
  5. Download the resulting parts and confirm page counts.
- **CTA**: none.
- **Review**: BU / product owner, CMO — pending. `review_status: draft`.
- **Access**: anonymous.
