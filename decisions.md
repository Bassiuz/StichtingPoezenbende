# Decisions

## 2026-10-14 – Adoption cats in Firestore, photos inside the documents
- One document per cat in `katten`, photo stored as a compressed base64 data URL (WebP, JPEG fallback).
  Cloud Storage needs the Blaze plan with a billing account; this keeps the project on Spark,
  where hitting the quota means a stale carousel, never a bill.
- Visitors cache the list in localStorage for an hour. After that they read only `meta/versie`
  and refetch the cats only when the admin page has bumped it.
- Write access is an allowlist (`admin/{uid}`), so an accidentally enabled sign-up grants nothing.

## 2026-10-14 – Extra photos in a separate document
- Up to 5 extra photos per cat live in `fotos/{katId}` (about 180 KB each, so they fit one 1 MiB doc).
  They are read only when a visitor opens that cat, keeping the homepage at 0–1 reads and the
  localStorage cache small. The cat doc keeps `extraFotos` (a count) so cats without extras cost no read.

## 2026-10-14 – Hiding cats
- `verborgen` (bool, required on every cat) hides a cat from the site but keeps it in the admin list.
- Enforced in the rules, not only in the query: visitors can read a cat only when `verborgen == false`,
  so they must filter on it. Deliberately no `get(..., false)` default: with a field-mask query the
  default made hidden cats readable.
