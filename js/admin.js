import {
  collection, doc, getDoc, getDocs, serverTimestamp, writeBatch,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { app, db } from './firebase.js';
import { CACHE_KEY } from './katten-cache.js';

const auth = getAuth(app);
const $ = (id) => document.getElementById(id);
const MAX_EXTRA = 5;

// Set while editing an existing cat; null means the form adds a new one.
let bewerkRef = null;
// Extra photos (data URLs) of the cat in the form, saved together on submit.
let extraFotos = [];

function toonExtra() {
  const lijst = $('extra-lijst');
  lijst.replaceChildren();
  extraFotos.forEach((foto, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'position-relative mr-2 mb-2';
    const img = document.createElement('img');
    img.src = foto;
    img.alt = '';
    img.className = 'rounded';
    img.style.cssText = 'width:64px;height:64px;object-fit:cover';
    const weg = document.createElement('button');
    weg.type = 'button';
    weg.className = 'btn btn-danger btn-sm position-absolute py-0 px-1';
    weg.style.cssText = 'top:-6px;right:-6px;line-height:1.2';
    weg.textContent = '×';
    weg.setAttribute('aria-label', 'Foto verwijderen');
    weg.onclick = () => { extraFotos.splice(i, 1); toonExtra(); };
    wrap.append(img, weg);
    lijst.append(wrap);
  });
}

async function startBewerken(d) {
  bewerkRef = d.ref;
  $('naam').value = d.data().naam;
  $('tekst').value = d.data().tekst;
  $('foto').required = false;
  $('form-titel').textContent = `${d.data().naam} bewerken (hoofdfoto leeg laten = huidige houden)`;
  $('annuleren').hidden = false;
  $('status').textContent = '';
  $('nieuw').scrollIntoView({ behavior: 'smooth' });
  const snap = await getDoc(doc(db, 'fotos', d.id));
  extraFotos = snap.exists() ? snap.data().fotos : [];
  toonExtra();
}

function stopBewerken() {
  bewerkRef = null;
  extraFotos = [];
  toonExtra();
  $('nieuw').reset();
  $('foto').required = true;
  $('form-titel').textContent = 'Kat toevoegen';
  $('annuleren').hidden = true;
}

// Shrinks until the base64 fits under maxLength. Main photo 350 KB (rule limit 400 KB);
// extras 180 KB each so five of them fit in one 1 MiB document.
async function compress(file, maxLength) {
  const bitmap = await createImageBitmap(file);
  for (const width of [1000, 800, 600, 400]) {
    const scale = Math.min(1, width / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let url = canvas.toDataURL('image/webp', 0.7);
    // Older Safari cannot encode WebP and silently returns PNG.
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', 0.7);
    if (url.length < maxLength) return url;
  }
  throw new Error('Foto is te groot, probeer een andere.');
}

// Bumping the version makes visitors' caches refetch; clearing ours shows it here at once.
async function commitMetVersie(batch) {
  batch.set(doc(db, 'meta', 'versie'), { v: serverTimestamp() });
  await batch.commit();
  localStorage.removeItem(CACHE_KEY);
}

async function toonLijst() {
  const snap = await getDocs(collection(db, 'katten'));
  const lijst = $('lijst');
  lijst.replaceChildren();
  const docs = snap.docs.sort((a, b) => b.data().aangemaakt.toMillis() - a.data().aangemaakt.toMillis());
  for (const d of docs) {
    const li = document.createElement('li');
    li.className = 'd-flex align-items-center mb-2';
    const img = document.createElement('img');
    img.src = d.data().foto;
    img.alt = '';
    img.style.cssText = 'width:64px;height:64px;object-fit:cover';
    img.className = 'rounded mr-3';
    const naam = document.createElement('span');
    naam.className = 'flex-grow-1';
    naam.textContent = d.data().naam;
    const bewerk = document.createElement('button');
    bewerk.className = 'btn btn-outline-secondary btn-sm mr-2';
    bewerk.textContent = 'Bewerken';
    bewerk.onclick = () => startBewerken(d);
    const knop = document.createElement('button');
    knop.className = 'btn btn-outline-danger btn-sm';
    knop.textContent = 'Verwijderen';
    knop.onclick = async () => {
      if (!confirm(`${d.data().naam} van de website halen?`)) return;
      const batch = writeBatch(db);
      batch.delete(d.ref);
      batch.delete(doc(db, 'fotos', d.id));
      await commitMetVersie(batch);
      if (bewerkRef?.id === d.id) stopBewerken();
      await toonLijst();
    };
    li.append(img, naam, bewerk, knop);
    lijst.append(li);
  }
  if (!docs.length) lijst.textContent = 'Er staan nu geen katten op de website.';
}

$('login').onsubmit = async (e) => {
  e.preventDefault();
  $('login-fout').textContent = '';
  try {
    await signInWithEmailAndPassword(auth, $('email').value, $('wachtwoord').value);
  } catch {
    $('login-fout').textContent = 'Inloggen mislukt. Controleer e-mail en wachtwoord.';
  }
};

$('extra').onchange = async (e) => {
  const bestanden = [...e.target.files];
  e.target.value = '';
  $('status').className = 'mt-2 mb-0';
  if (extraFotos.length + bestanden.length > MAX_EXTRA) {
    $('status').className = 'text-danger mt-2 mb-0';
    $('status').textContent = `Maximaal ${MAX_EXTRA} extra foto's.`;
    return;
  }
  $('status').textContent = "Foto's verkleinen...";
  try {
    for (const bestand of bestanden) extraFotos.push(await compress(bestand, 180000));
    $('status').textContent = '';
  } catch (err) {
    $('status').className = 'text-danger mt-2 mb-0';
    $('status').textContent = err.message;
  }
  toonExtra();
};

$('nieuw').onsubmit = async (e) => {
  e.preventDefault();
  const knop = e.submitter;
  knop.disabled = true;
  $('status').className = 'mt-2 mb-0';
  $('status').textContent = 'Bezig met opslaan...';
  try {
    const velden = {
      naam: $('naam').value.trim(),
      tekst: $('tekst').value.trim(),
      extraFotos: extraFotos.length,
    };
    const bestand = $('foto').files[0];
    if (bestand) velden.foto = await compress(bestand, 350000);
    const ref = bewerkRef ?? doc(collection(db, 'katten'));
    const batch = writeBatch(db);
    if (bewerkRef) batch.update(ref, velden);
    else batch.set(ref, { ...velden, aangemaakt: serverTimestamp() });
    const fotosRef = doc(db, 'fotos', ref.id);
    if (extraFotos.length) batch.set(fotosRef, { fotos: extraFotos });
    else batch.delete(fotosRef);
    await commitMetVersie(batch);
    stopBewerken();
    $('status').textContent = 'Opgeslagen! Bezoekers zien het binnen een uur.';
    await toonLijst();
  } catch (err) {
    console.error(err);
    $('status').className = 'text-danger mt-2 mb-0';
    $('status').textContent = err.message.startsWith('Foto') ? err.message : 'Opslaan mislukt.';
  } finally {
    knop.disabled = false;
  }
};

$('annuleren').onclick = stopBewerken;

$('uitloggen').onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  $('login').hidden = !!user;
  $('beheer').hidden = !user;
  if (user) toonLijst();
});
