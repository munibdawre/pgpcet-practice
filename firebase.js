// firebase.js - initialize Firebase (your config)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB6RuIeIbu34cIHqoScC3NYfpZHqXy2SME",
  authDomain: "pgpcet-practice.firebaseapp.com",
  projectId: "pgpcet-practice",
  storageBucket: "pgpcet-practice.firebasestorage.app",
  messagingSenderId: "332921568405",
  appId: "1:332921568405:web:475087028328263a982f9c",
  measurementId: "G-H67DHPRCMR"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// firebase.js placeholder
