# office.sheet.ubot_boq.vi.v1

- **Product / feature**: doc-tools / `office-sheet` (GridCraft editor)
- **Title**: Ubot BOQ - bill of quantities (demo)
- **Goal**: Give a visitor a realistic starting .xlsx (a titled BOQ table with real SUM/
  multiplication formulas, not just static numbers) to open in GridCraft and try editing
  formulas/formatting, instead of starting from completely blank.
- **Source / rights**: Fully synthetic bill of quantities for a fictional "Ubot Demo"
  deployment; no real pricing or project data. `rights: synthetic`.
- **sample_data**: `true` - title row says "(SỐ LIỆU GIẢ LẬP)" (simulated figures) and every
  line item is labelled "(demo)"; a closing row restates the data is illustrative.
- **Input**: none (one .xlsx generated in-browser via `exceljs`, already a repo dependency).
- **Expected**: a valid, non-empty .xlsx with a sheet named "BOQ Ubot (demo)", 4 line items
  with real `=C*D` formulas and a totals row with a real `SUM()` formula (not pre-computed
  numbers). Verified by `pih-office-samples.test.ts` (re-parses the file with ExcelJS and
  checks the formula strings, not just the resulting values). NOT verified inside the actual
  GridCraft iframe tonight - see the integration note below.
- **Integration note (read before enabling)**: same constraint and same download-only
  decision as `office.word.lpc_profile.vi.v1` - see that file for the full reasoning.
- **Steps**:
  1. Open `/soan-thao-bang-tinh` (office-sheet) with the flag on.
  2. Click "Download a sample file to try" below the existing "Open editor" button.
  3. Open GridCraft ("Open editor").
  4. Inside GridCraft, use its own Open-file control to pick the file you just downloaded.
  5. Change a quantity and confirm the "Thành tiền"/total cells recompute (proves the
     formulas survived the round trip, not just static values).
- **CTA**: none.
- **Review**: BU / product owner, CMO — pending, same open question about download-only UX
  as the Word template. `review_status: draft`.
- **Access**: anonymous.
