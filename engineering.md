# Engineering

- Static site on GitHub Pages; no build step. Firebase is loaded as ES modules from gstatic.
- Firestore reads: only one-off `getDoc`/`getDocs`, never `onSnapshot` listeners.
- Cache logic lives in `js/katten-cache.js` without Firebase imports; test with `node js/katten-cache.test.mjs`.
- English in code and comments, Dutch only in on-screen text.
