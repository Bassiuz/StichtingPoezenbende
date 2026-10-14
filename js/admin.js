import {
  addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { app, db } from './firebase.js';
import { CACHE_KEY } from './katten-cache.js';

const auth = getAuth(app);
const $ = (id) => document.getElementById(id);

// Shrinks until the base64 fits well under the 400 KB rule limit (1 MiB doc max).
async function compress(file) {
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
    if (url.length < 350000) return url;
  }
  throw new Error('Foto is te groot, probeer een andere.');
}

// Bumping the version makes visitors' caches refetch; clearing ours shows it here at once.
async function bumpVersie() {
  await setDoc(doc(db, 'meta', 'versie'), { v: serverTimestamp() });
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
    const knop = document.createElement('button');
    knop.className = 'btn btn-outline-danger btn-sm';
    knop.textContent = 'Verwijderen';
    knop.onclick = async () => {
      if (!confirm(`${d.data().naam} van de website halen?`)) return;
      await deleteDoc(d.ref);
      await bumpVersie();
      await toonLijst();
    };
    li.append(img, naam, knop);
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

$('nieuw').onsubmit = async (e) => {
  e.preventDefault();
  const knop = e.submitter;
  knop.disabled = true;
  $('status').className = 'mt-2 mb-0';
  $('status').textContent = 'Bezig met opslaan...';
  try {
    const foto = await compress($('foto').files[0]);
    await addDoc(collection(db, 'katten'), {
      naam: $('naam').value.trim(),
      tekst: $('tekst').value.trim(),
      foto,
      aangemaakt: serverTimestamp(),
    });
    await bumpVersie();
    e.target.reset();
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

$('uitloggen').onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  $('login').hidden = !!user;
  $('beheer').hidden = !user;
  if (user) toonLijst();
});
