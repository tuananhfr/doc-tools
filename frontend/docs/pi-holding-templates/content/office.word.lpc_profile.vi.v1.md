# office.word.lpc_profile.vi.v1

- **Product / feature**: doc-tools / `office-word` (WordCraft editor)
- **Title**: LPC company profile (demo)
- **Goal**: Give a visitor a realistic starting .docx (heading, intro paragraph, a small
  table, a bullet list) to open in WordCraft and try editing, instead of starting from
  completely blank.
- **Source / rights**: Fully synthetic "LPC Demo Co., Ltd." profile; no real company data.
  `rights: synthetic`.
- **sample_data**: `true` - the document title and body text are explicitly labelled "(demo)"
  / "simulated data" throughout.
- **Input**: none (one .docx generated in-browser via the `docx` library, already a repo
  dependency used elsewhere for CV export).
- **Expected**: a valid, non-empty .docx file (OOXML zip) that WordCraft can open via its own
  "Open file" control. Verified by `pih-office-samples.test.ts` (zip signature, non-empty).
  NOT verified inside the actual WordCraft iframe tonight - see the integration note below.
- **Integration note (read before enabling)**: this template is **download-only**. WordCraft
  loads a static vendored `index.html` in an iframe with no observed `postMessage`/query-param
  channel to pre-load a document, and the vendor bundle itself is not present in this
  checkout to inspect further. Rather than guess at (or modify) the vendor engine, the UI
  offers a "Download a sample file to try" button next to the existing "Open editor" button;
  the user downloads a fresh copy (never a shared master) and opens it themselves with
  WordCraft's own Open-file UI. This is weaker than the fully wired samples elsewhere (no
  automatic load) and should be called out explicitly in review.
- **Steps**:
  1. Open `/soan-thao-van-ban` (office-word) with the flag on.
  2. Click "Download a sample file to try" below the existing "Open editor" button.
  3. Open WordCraft ("Open editor").
  4. Inside WordCraft, use its own Open-file control to pick the file you just downloaded.
  5. Edit a copy; the original generator will produce an identical fresh file next time.
- **CTA**: none.
- **Review**: BU / product owner, CMO — pending, AND a product decision on whether
  download-only is an acceptable UX for v1 or whether a real WordCraft content-injection API
  should be requested from the vendor/upstream first. `review_status: draft`.
- **Access**: anonymous.
