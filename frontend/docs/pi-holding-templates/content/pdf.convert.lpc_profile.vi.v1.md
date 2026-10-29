# pdf.convert.lpc_profile.vi.v1

- **Product / feature**: doc-tools / `convert-file` (format convert, PDF -> Word/Excel/image)
- **Title**: LPC company profile (demo)
- **Goal**: Give the visitor a realistic one-page company-profile PDF to convert to Word (or
  Excel/JPG/PNG), so the "Convert" template type (spec: "Convert = LPC profile DOCX") is
  satisfied as the *output* of this tool, matching the tool's real input/output direction
  (PDF in, Office/image out - not the reverse).
- **Source / rights**: Fully synthetic "LPC Demo Co., Ltd." profile; no real company data.
  `rights: synthetic`.
- **sample_data**: `true` - headed "(demo)" and footed with a simulated-data notice.
- **Input**: none (one 1-page PDF generated in-browser via pdf-lib).
- **Expected**: a loadable 1-page PDF; converting it to Word with the existing, unmodified
  `convertTask`/`toWord` pipeline produces a .docx with the same headings/body text (OCR
  toggle may be left on or off - the sample is already native text, not a scan). Verified by
  `pih-pdf-samples.test.ts` (page count).
- **Steps**:
  1. Open `/chuyen-doi-file` (convert-file) with the flag on and no file chosen.
  2. Click "Dùng mẫu PI Holding" next to the file picker.
  3. The sample loads; pick "Word" as the target format.
  4. Run the conversion.
  5. Download and open the resulting .docx to confirm the text carried over.
- **CTA**: none.
- **Review**: BU / product owner, CMO — pending. `review_status: draft`.
- **Access**: anonymous.
