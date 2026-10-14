// Run: node js/katten-cache.test.mjs
import assert from 'node:assert/strict';
import { loadKatten, MAX_AGE_MS } from './katten-cache.js';

let reads = 0;
const fetchVersie = async () => { reads++; return 2; };
const fetchKatten = async () => { reads++; return [{ naam: 'Mies' }]; };
const old = { versie: 2, checkedAt: 0, katten: [{ naam: 'Oud' }] };

let r = await loadKatten({ cache: old, now: MAX_AGE_MS - 1, fetchVersie, fetchKatten });
assert.equal(reads, 0, 'fresh cache must not read');
assert.equal(r.cache, null);

r = await loadKatten({ cache: old, now: MAX_AGE_MS + 1, fetchVersie, fetchKatten });
assert.equal(reads, 1, 'same version reads only the version doc');
assert.equal(r.katten[0].naam, 'Oud');
assert.equal(r.cache.checkedAt, MAX_AGE_MS + 1);

reads = 0;
r = await loadKatten({ cache: { ...old, versie: 1 }, now: MAX_AGE_MS + 1, fetchVersie, fetchKatten });
assert.equal(reads, 2, 'changed version refetches the cats');
assert.equal(r.katten[0].naam, 'Mies');

r = await loadKatten({ cache: null, now: 5, fetchVersie, fetchKatten });
assert.equal(r.cache.versie, 2, 'empty cache fills');

const failing = async () => { throw new Error('quota'); };
r = await loadKatten({ cache: old, now: MAX_AGE_MS + 1, fetchVersie: failing, fetchKatten });
assert.equal(r.katten[0].naam, 'Oud', 'failure falls back to stale cache');
r = await loadKatten({ cache: null, now: 1, fetchVersie: failing, fetchKatten });
assert.deepEqual(r.katten, []);

console.log('katten-cache ok');
