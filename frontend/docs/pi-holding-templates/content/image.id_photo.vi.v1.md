# image.id_photo.vi.v1 (N/A - already covered, nothing built)

- **Product / feature**: doc-tools / `anh-the` (ID photo)
- **Spec theme**: "licensed demo photo (fully synthetic placeholder)" - already the hard
  decision's requirement regardless of what this run found.
- **Decision**: **N/A, not implemented.** `IdPhotoPage.tsx` already has a generic sample via
  `ImageStudioUpload`'s `onSample`/`sampleUrl`/`sampleLabel` props, pointed at the same shared
  placeholder image as `RemoveBackgroundPage` (`/assets/id-photo/portrait-demo-v2.png`). A
  face/ID-photo template also has no natural "PI Holding brand case study" angle the way a
  document, spreadsheet or QR sample does - there is nothing PI-Holding-specific to add beyond
  what already ships. Left untouched.
