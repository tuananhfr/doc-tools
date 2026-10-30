# image.before_after.vi.v1 (N/A - already covered, nothing built)

- **Product / feature**: doc-tools / `xoa-phong` (remove background) and related image tools
- **Spec theme**: "Buildtek project photo, rights cleared" - per the hard decision this run
  operates under, this would have had to be a fully synthetic placeholder regardless (no real
  Buildtek asset may be used).
- **Decision**: **N/A, not implemented.** `RemoveBackgroundPage.tsx` already has a generic
  "try a sample" affordance (`sample()` fetching a shared placeholder image at
  `/assets/id-photo/portrait-demo-v2.png`) that produces a natural before/after view once
  background removal runs. Adding a second, PI-Holding-specific placeholder image would mean
  sourcing/reviewing another synthetic asset for a feature that already lets a first-time
  visitor try the exact same thing today. The marginal value did not justify the added rights/
  review surface area for an overnight pass.
- **If revisited**: the natural next step would be a second entry in the same existing sample
  picker (not a new mechanism), themed as a generic "product photo (demo)" rather than a named
  brand, since a before/after background-removal demo does not carry an obvious PI-Holding
  branding opportunity the way a document template does.
