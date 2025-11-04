import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
const list = document.getElementById('attemptList');
onAuthStateChanged(auth, async user=>{
  if(!user) return window.location.href='index.html';
  const q = query(collection(db,'attempts'), where('uid','==',user.uid), orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  const arr=[];
  snap.forEach(d=>{ const dd=d.data(); arr.push(`<div class="p-2 border mb-2"><strong>${new Date(dd.createdAt?.toDate?.()||dd.createdAt).toLocaleString()}</strong><div>Score: ${dd.score}/100</div><div class="mt-2"><button class="btn btn-sm btn-outline-secondary" onclick="viewAttempt('${d.id}')">View</button></div></div>`); });
  list.innerHTML = arr.length?arr.join(''):'<div class="text-muted">No attempts yet</div>';
});
window.viewAttempt = async (id)=>{ sessionStorage.setItem('viewAttemptId', id); window.location.href='result.html'; };
// attempts.js placeholder
