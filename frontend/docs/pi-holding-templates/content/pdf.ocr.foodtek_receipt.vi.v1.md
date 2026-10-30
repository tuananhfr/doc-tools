# pdf.ocr.foodtek_receipt.vi.v1

- **Product / feature**: doc-tools / `ocr` (OCR, Tesseract WASM, existing pipeline unmodified)
- **Title**: Foodtek stock-receipt (demo, fictional company)
- **Goal**: Give the visitor a realistic "stock receipt" image with printed Vietnamese text
  and a short itemized list, so OCR has structured, legible content to read - instead of
  requiring them to photograph a real document (which might contain real personal/business
  data) just to try the feature.
- **Source / rights**: Fully synthetic. "Foodtek" is a fictional company name invented only
  for this sample (it is NOT a real PI Holding customer, partner, or product, and must not be
  confused with any real company of a similar name). Drawn entirely with the Canvas API -
  no camera photo, no real document, no face. `rights: synthetic`.
- **sample_data**: `true` - the image itself says "FOODTEK DEMO - PHIẾU NHẬP KHO (MẪU)" in
  its header and every field is labelled "(demo)"; the note line states it is not a real
  document.
- **Input**: none (one PNG image drawn in-browser via Canvas 2D).
- **Expected**: OCR correctly reads the header, the four labelled fields (receipt number,
  date, warehouse, supplier) and the three line items. Not independently re-verified
  automatically tonight (canvas generation needs a DOM, which vitest's node environment does
  not provide - see `tests/results/pdf.md`); the OCR pipeline itself is pre-existing and
  unmodified.
- **Steps**:
  1. Open `/doc-anh` (OCR) with the flag on and no files chosen.
  2. Click "Dùng mẫu PI Holding" next to the file picker.
  3. The receipt image loads; run OCR recognition.
  4. Review the recognized text/fields in the usual review screen.
  5. Export (PDF/DOCX/XLSX/CSV/JSON as usual) and confirm the demo labels came through.
- **CTA**: none.
- **Review**: BU / product owner, CMO — pending. `review_status: draft`.
- **Access**: anonymous.
