// test.js - builds paper from subject collections and handles UI
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const DISTRIBUTION = {'Anatomy':4,'Physiology':4,'Biochemistry':2,'Fundamentals of Exercise Therapy':5,'Fundamentals of Electro Therapy':5,'Pharmacology':2,'Pathology & Microbiology':4,'Psychology':1,'Psychiatry':1,'Electrical Agents':7,'Kinesio Therapeutics':7,'General Surgery & Orthopedics':6,'Medicine':6,'OBGY':3,'Physical Diagnosis & Manipulative Skills':8,'Physiotherapy in Musculoskeletal Condition':10,'Physiotherapy in Neurosciences':10,'Physiotherapy in General Medical & General Surgical Condition':10,'Physiotherapy in Community Health':5};

let paper=[]; let answers={}; let idx=0; let timeLeft=90*60;

onAuthStateChanged(auth, async user=>{ if(!user) return window.location.href='index.html'; await buildPaper(); renderQuestion(); startTimer(); });

async function buildPaper(){
  const subs=Object.keys(DISTRIBUTION);
  let paperArr=[];
  for(const s of subs){
    const need=DISTRIBUTION[s];
    const snap = await getDocs(query(collection(db, `subjects/${s}/questions`), limit(500)));
    const arr=[];
    snap.forEach(d=>arr.push({...d.data(), id:d.id, subject:s}));
    arr.sort(()=>0.5-Math.random());
    paperArr.push(...arr.slice(0,need));
  }
  // if <100, top-up randomly across subjects
  if(paperArr.length<100){
    const pool=[];
    for(const s of subs){
      const snap = await getDocs(query(collection(db, `subjects/${s}/questions`), limit(500)));
      snap.forEach(d=>pool.push({...d.data(), id:d.id, subject:s}));
    }
    pool.sort(()=>0.5-Math.random());
    while(paperArr.length<100 && pool.length) paperArr.push(pool.shift());
  }
  paperArr.sort(()=>0.5-Math.random());
  paper=paperArr.slice(0,100);
  sessionStorage.setItem('currentPaper', JSON.stringify(paper));
}

function renderQuestion(){
  const q=paper[idx];
  if(!q){ document.getElementById('questionArea').innerHTML='<div class="p-3">No question</div>'; return; }
  document.getElementById('qCount').textContent=`Q ${idx+1} / ${paper.length}`;
  let opts='';
  for(let i=0;i<4;i++){
    const checked = answers[idx]===i?'checked':'';
    opts+=`<label class="option ${answers[idx]===i?'answered':''}"><input type="radio" name="opt" value="${i}" ${checked}/> <strong>${String.fromCharCode(65+i)}</strong>. ${escapeHtml(q.options?.[i]||'Option')}</label>`;
  }
  document.getElementById('questionArea').innerHTML=`<div><div style="font-weight:700">(${q.subject}) ${escapeHtml(q.questionText||q.question)}</div><div class="mt-3">${opts}</div></div>`;
  document.querySelectorAll('input[name="opt"]').forEach(r=>r.addEventListener('change',e=>{ answers[idx]=parseInt(e.target.value,10); renderPalette(); }));
}

document.getElementById('saveNext')?.addEventListener('click', ()=>{ if(idx<paper.length-1) idx++; renderQuestion(); renderPalette(); });
document.getElementById('prev')?.addEventListener('click', ()=>{ if(idx>0) idx--; renderQuestion(); renderPalette(); });
document.getElementById('submit')?.addEventListener('click', submitTest);

function renderPalette(){ const pal=document.getElementById('palette'); pal.innerHTML = paper.map((_,i)=>`<button class='btn btn-sm ${answers[i]!=null?'btn-success':'btn-outline-secondary'}' onclick='goto(${i})'>${i+1}</button>`).join(' '); }
window.goto = (i)=>{ idx=i; renderQuestion(); renderPalette(); }

function startTimer(){ const el=document.getElementById('timeLeft'); const tick=()=>{ const m=Math.floor(timeLeft/60), s=timeLeft%60; el.textContent=`Time left: ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; if(timeLeft<=0){ submitTest(); return; } timeLeft--; setTimeout(tick,1000); }; tick(); }

async function submitTest(){
  if(!confirm('Submit test?')) return;
  let score=0;
  const detailed = paper.map((q,i)=>{ const chosen=answers[i]??null; const correct=q.correctAnswerIndex||0; if(chosen===correct) score++; return {questionText:q.questionText||q.question, options:q.options||[], chosen, correct, explanation:q.explanation||'', subject:q.subject}; });
  const { addDoc, collection, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
  const user = auth.currentUser;
  try{
    await addDoc(collection(db, 'attempts'), { uid: user.uid, score, total: paper.length, detailed, createdAt: serverTimestamp() });
    sessionStorage.setItem('lastResult', JSON.stringify({score,total:paper.length,detailed}));
    window.location.href='result.html';
  }catch(e){ alert('Save failed: '+e.message); }
}

function escapeHtml(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])); }
// test.js placeholder
