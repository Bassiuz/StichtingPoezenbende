// No Firebase imports here, so the cache logic can be tested with plain node.
export const CACHE_KEY = 'poezenbende-katten';
export const MAX_AGE_MS = 60 * 60 * 1000;

// Returns { katten, cache }: the cats to show and the cache to store (null = keep as is).
// Fresh cache: 0 reads. Stale cache with same version: 1 read. Changed: 1 + one per cat.
export async function loadKatten({ cache, now, fetchVersie, fetchKatten }) {
  if (cache && now - cache.checkedAt < MAX_AGE_MS) return { katten: cache.katten, cache: null };
  try {
    const versie = await fetchVersie();
    if (cache && cache.versie === versie) {
      return { katten: cache.katten, cache: { ...cache, checkedAt: now } };
    }
    const katten = await fetchKatten();
    return { katten, cache: { versie, checkedAt: now, katten } };
  } catch (e) {
    // Quota exhausted or offline: a stale carousel beats an empty one.
    console.warn('Loading cats failed', e);
    return { katten: cache ? cache.katten : [], cache: null };
  }
}
