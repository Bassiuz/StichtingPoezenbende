import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

// Public web config; access is controlled by firestore.rules, not by this key.
export const app = initializeApp({
  apiKey: 'AIzaSyCO2EJxkevwJ4q2RZAftAsLPsAXtA9XR8M',
  authDomain: 'stichting-poezenbende.firebaseapp.com',
  projectId: 'stichting-poezenbende',
  appId: '1:244649126155:web:9aef980db4de1d862b9a0e',
});
export const db = getFirestore(app);
