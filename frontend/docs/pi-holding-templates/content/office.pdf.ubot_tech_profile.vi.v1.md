# office.pdf.ubot_tech_profile.vi.v1

- **Product / feature**: doc-tools / `edit-pdf` (PDF edit)
- **Title**: Ubot tech profile (demo)
- **Goal**: Let a visitor try PDF text-edit, highlight and annotation tools on a document
  that already has realistic structure (heading, body paragraphs, a small table across two
  pages), instead of starting from a truly blank page - without touching any real PI Holding
  company data.
- **Source / rights**: Fully synthetic. "Ubot" is used only as a fictional product name for
  this sample (it is PI Holding's own sub-brand name, not a third-party mark), and every
  figure/claim on the page is invented for this document alone. `rights: synthetic`.
- **sample_data**: `true` - every page carries an inline "(DEMO)" label in the heading and a
  footer note ("Simulated data - for feature demonstration only, not real figures.").
- **Input**: none (one click generates the file in-browser; nothing is uploaded or downloaded
  from a server).
- **Expected**: a loadable 2-page PDF with the given headings/body text, immediately editable
  in the same tool the real "invoice/contract/notes" samples already use. Verified
  automatically by `pih-pdf-samples.test.ts` (page count, independent file per call).
- **Steps**:
  1. Open `/chinh-sua-pdf` (edit-pdf) with the flag on and no file chosen yet.
  2. In the sample list, click "Ubot tech profile (demo)" alongside the existing samples.
  3. The sample loads into the editor exactly like the existing invoice/contract/notes samples.
  4. Try editing text, adding a highlight or a sticky note.
  5. Export/download to see your edited copy - the original generator is untouched and will
     produce the identical starting file again next time.
- **CTA**: none (`cta: null`). Intentionally no link out, to keep this the lowest-friction
  possible example of "non-intrusive" content per spec section 1.
- **Review**: BU / product owner, legal (brand-name use within PI Holding's own group), CMO —
  all pending. `review_status: draft`.
- **Access**: anonymous (`access.anonymous: true`) - no login required, consistent with the
  existing sample mechanism it extends.
