# StichtingPoezenbende
public repository for Stichting Poezenbende

## Adoption cats carousel

Cats for adoption live in Firestore (project `stichting-poezenbende`, free Spark plan) and are
managed by the shelter owner at `/admin.html`. The homepage section `#katten-section` stays
hidden while there are no cats.

- Deploy rules: `firebase deploy --only firestore:rules --account devaan.bas@gmail.com`
- Test the cache logic: `node js/katten-cache.test.mjs`
- Give someone write access: create the user under Authentication, then add an empty
  document `admins/{uid}` in Firestore.
