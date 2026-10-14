import { collection, doc, getDoc, getDocs } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import { db } from './firebase.js';
import { CACHE_KEY, loadKatten } from './katten-cache.js';

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or blocked: next visit just reads again.
  }
}

async function fetchVersie() {
  const snap = await getDoc(doc(db, 'meta', 'versie'));
  return snap.exists() ? snap.data().v.toMillis() : 0;
}

async function fetchKatten() {
  const snap = await getDocs(collection(db, 'katten'));
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.aangemaakt.toMillis() - a.aangemaakt.toMillis())
    .map(({ naam, tekst, foto }) => ({ naam, tekst, foto }));
}

function renderKatten(katten) {
  const section = document.getElementById('katten-section');
  if (!katten.length) return;
  const carousel = section.querySelector('.katten-carousel');
  for (const kat of katten) {
    const item = document.createElement('div');
    item.className = 'text-center px-2';
    const img = document.createElement('img');
    img.src = kat.foto;
    img.alt = kat.naam;
    img.className = 'rounded mb-3';
    img.style.cssText = 'width:100%;height:320px;object-fit:cover';
    const naam = document.createElement('h4');
    naam.textContent = kat.naam;
    const tekst = document.createElement('p');
    tekst.textContent = kat.tekst;
    item.append(img, naam, tekst);
    carousel.append(item);
  }
  section.hidden = false;
  $(carousel).owlCarousel({
    loop: katten.length > 3,
    margin: 20,
    nav: true,
    navText: ['<span class="icon-arrow_back">', '<span class="icon-arrow_forward">'],
    responsive: { 0: { items: 1 }, 768: { items: 2 }, 1000: { items: 3 } },
  });
}

const { katten, cache } = await loadKatten({ cache: readCache(), now: Date.now(), fetchVersie, fetchKatten });
if (cache) writeCache(cache);
renderKatten(katten);
