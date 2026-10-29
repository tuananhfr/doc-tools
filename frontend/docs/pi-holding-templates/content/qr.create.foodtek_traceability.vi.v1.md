# qr.create.foodtek_traceability.vi.v1

- **Product / feature**: doc-tools / `qr-create` (static QR)
- **Title**: Foodtek batch traceability text (demo, fictional company)
- **Goal**: Give the visitor one-click realistic QR content (a batch-traceability style
  message) instead of an empty text field, so they immediately see a non-trivial QR code and
  can scan it to confirm it reads back correctly.
- **Source / rights**: Fully synthetic. "Foodtek" is a fictional company name invented only
  for this sample (see the note in `pdf.ocr.foodtek_receipt.vi.v1.md` - same fictional
  company used for narrative consistency across the OCR and QR samples, not a real brand).
  `rights: synthetic`.
- **sample_data**: `true` - the encoded text itself contains "FOODTEK DEMO" and an explicit
  "(dữ liệu minh hoạ, không phải mã tra cứu thật)" ("illustrative data, not a real lookup
  code") disclaimer, so even a scanned/shared QR carries the label.
- **Input**: none (one click patches the existing form state).
- **Expected**: `buildPayload()` returns `{ok:true}` and the text contains "DEMO"; the
  resulting QR is scannable (matrix is produced, not null). Verified by
  `pih-qr-sample.test.ts`, reusing the real production `buildPayload`/`createMatrix`
  functions (no mock).
- **Why `text` and not `url`**: a `url`-kind sample would need a real, live, HTTPS address to
  avoid ever producing a QR that errors or 404s when scanned (spec T14). Rather than host a
  throwaway page or point at an unrelated real URL, the sample uses the `text` kind, which has
  nothing to resolve - the demo label lives inside the scanned text itself.
- **Steps**:
  1. Open `/tao-ma-qr` (qr-create), static tab, with the flag on.
  2. Click "Dùng nội dung mẫu" above the content form.
  3. The QR preview updates immediately with the sample text.
  4. Scan it with a phone to confirm it reads back the same demo text.
  5. Download as PNG/SVG/PDF as usual.
- **CTA**: none.
- **Review**: BU / product owner, CMO — pending. `review_status: draft`.
- **Access**: anonymous.
