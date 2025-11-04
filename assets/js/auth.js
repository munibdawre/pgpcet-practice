// simple auth handlers using Firebase Auth
import { auth } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.getElementById('openSignup')?.addEventListener('click', ()=> new bootstrap.Modal(document.getElementById('signupModal')).show());
document.getElementById('btnCreate')?.addEventListener('click', async ()=>{
  const name = document.getElementById('suName').value.trim();
  const email = document.getElementById('suEmail').value.trim();
  const pass = document.getElementById('suPass').value;
  if(!name||!email||!pass) return alert('Fill all fields');
  try{
    await createUserWithEmailAndPassword(auth,email,pass);
    window.location.href='home.html';
  }catch(e){ alert(e.message); }
});

document.getElementById('btnLogin')?.addEventListener('click', async ()=>{
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  if(!email||!pass) return alert('Enter email & password');
  try{
    await signInWithEmailAndPassword(auth,email,pass);
    window.location.href='home.html';
  }catch(e){ alert('Login failed: '+e.message); }
});
// auth.js placeholder
