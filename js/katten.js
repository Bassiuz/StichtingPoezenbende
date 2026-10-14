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
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.aangemaakt.toMillis() - a.aangemaakt.toMillis())
    .map(({ id, naam, tekst, foto, extraFotos = 0 }) => ({ id, naam, tekst, foto, extraFotos }));
}

// Extra photos are read only when a visitor opens that cat, once per page load.
const extraCache = new Map();
async function fetchExtra(kat) {
  if (!kat.id || !kat.extraFotos) return [];
  if (!extraCache.has(kat.id)) {
    extraCache.set(kat.id, getDoc(doc(db, 'fotos', kat.id))
      .then((snap) => (snap.exists() ? snap.data().fotos : []))
      .catch(() => []));
  }
  return extraCache.get(kat.id);
}

function toonFoto(fotos, index) {
  $('#kat-modal-foto').attr('src', fotos[index]);
  $('#kat-modal-thumbs img').each((i, img) => img.classList.toggle('actief', i === index));
}

async function openKat(kat) {
  $('#kat-modal-naam').text(kat.naam);
  $('#kat-modal-tekst').text(kat.tekst);
  const thumbs = document.getElementById('kat-modal-thumbs');
  thumbs.replaceChildren();
  let fotos = [kat.foto];
  let index = 0;
  toonFoto(fotos, 0);
  $('#kat-modal-foto').off('click').on('click', () => {
    index = (index + 1) % fotos.length;
    toonFoto(fotos, index);
  });
  $('#kat-modal').modal('show');
  const extra = await fetchExtra(kat);
  if (!extra.length) return;
  fotos = [kat.foto, ...extra];
  fotos.forEach((foto, i) => {
    const img = document.createElement('img');
    img.src = foto;
    img.alt = `${kat.naam} foto ${i + 1}`;
    img.onclick = () => { index = i; toonFoto(fotos, i); };
    thumbs.append(img);
  });
  toonFoto(fotos, index);
}

function renderKatten(katten) {
  const section = document.getElementById('katten-section');
  if (!katten.length) return;
  const carousel = section.querySelector('.katten-carousel');
  katten.forEach((kat, i) => {
    const item = document.createElement('div');
    item.className = 'kat text-center';
    item.dataset.index = i;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    const img = document.createElement('img');
    img.src = kat.foto;
    img.alt = kat.naam;
    img.className = 'rounded mb-3';
    const naam = document.createElement('h4');
    naam.textContent = kat.naam;
    const tekst = document.createElement('p');
    tekst.className = 'kat-tekst';
    tekst.textContent = kat.tekst;
    const meer = document.createElement('span');
    meer.className = 'text-primary';
    meer.textContent = 'Meer over ' + kat.naam + ' →';
    item.append(img, naam, tekst, meer);
    carousel.append(item);
  });
  // Delegated, because owl's loop mode clones the items.
  $(carousel).on('click keydown', '.kat', (e) => {
    if (e.type === 'keydown' && e.key !== 'Enter') return;
    openKat(katten[e.currentTarget.dataset.index]);
  });
  section.hidden = false;
  $(carousel).owlCarousel({
    loop: katten.length > 3,
    margin: 30,
    nav: true,
    dots: false,
    navText: ['<span class="icon-arrow_back">', '<span class="icon-arrow_forward">'],
    responsive: { 0: { items: 1 }, 768: { items: 2 }, 1000: { items: 3 } },
  });
}

const { katten, cache } = await loadKatten({ cache: readCache(), now: Date.now(), fetchVersie, fetchKatten });
if (cache) writeCache(cache);
renderKatten(katten);
