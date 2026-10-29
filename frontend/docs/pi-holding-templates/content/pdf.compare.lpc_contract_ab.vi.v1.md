# pdf.compare.lpc_contract_ab.vi.v1

- **Product / feature**: doc-tools / `compare-pdf` (document compare)
- **Title**: LPC contract, versions A/B (demo)
- **Goal**: Show that compare-PDF actually finds and highlights real differences, by giving
  the visitor two versions that are deliberately close but not identical, rather than two
  unrelated files or two copies of the same one.
- **Source / rights**: Fully synthetic "framework agreement" between a fictional "LPC Demo
  Co., Ltd." and a fictional "Demo Customer". No real contract, company, or figure.
  `rights: synthetic`.
- **sample_data**: `true` - headed "PI HOLDING - SAMPLE TO TRY" / "(demo)" and footed with a
  simulated-data notice on both versions.
- **Input**: none (two 1-page PDFs generated in-browser via pdf-lib).
- **Expected**: version B differs from version A in three deliberate, detectable ways: a
  longer term (12 -> 24 months), a different contract value, and one added clause (Article 4)
  that does not exist in version A. Verified by `pih-pdf-samples.test.ts` as a byte-length
  proxy (full text-diff re-verification was out of scope for an automated test tonight - see
  `tests/results/pdf.md`).
- **Steps**:
  1. Open `/so-sanh-pdf` (compare-pdf) with the flag on and no files chosen.
  2. Click "Dùng mẫu PI Holding" next to the file picker - both A and B load at once, in order.
  3. Run Compare.
  4. Confirm the report highlights the term, value, and the added clause.
  5. (Optional) Toggle "ignore case/space" options and re-run to see they do not hide the
     real differences.
- **CTA**: none.
- **Review**: BU / product owner, CMO — pending. `review_status: draft`.
- **Access**: anonymous.
