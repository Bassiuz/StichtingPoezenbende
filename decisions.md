# Decisions

## 2026-10-14 – Adoption cats in Firestore, photos inside the documents
- One document per cat in `katten`, photo stored as a compressed base64 data URL (WebP, JPEG fallback).
  Cloud Storage needs the Blaze plan with a billing account; this keeps the project on Spark,
  where hitting the quota means a stale carousel, never a bill.
- Visitors cache the list in localStorage for an hour. After that they read only `meta/versie`
  and refetch the cats only when the admin page has bumped it.
- Write access is an allowlist (`admin/{uid}`), so an accidentally enabled sign-up grants nothing.
