// upload.js - client-side upload + OCR.Space extraction + Firestore save
import { auth, db, storage } from './firebase.js';
import { addDoc, collection, writeBatch, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Replace this with your full OCR.Space key (client-side visible). For production use a proxy to hide the key.
const OCR_KEY = 'K82819546588957';

const SUBJECTS = ['Anatomy','Physiology','Biochemistry','Fundamentals of Exercise Therapy','Fundamentals of Electro Therapy','Pharmacology','Pathology & Microbiology','Psychology','Psychiatry','Electrical Agents','Kinesio Therapeutics','General Surgery & Orthopedics','Medicine','OBGY','Physical Diagnosis & Manipulative Skills','Physiotherapy in Musculoskeletal Condition','Physiotherapy in Neurosciences','Physiotherapy in General Medical & General Surgical Condition','Physiotherapy in Community Health'];

const sel = document.getElementById('subjectSelect');
SUBJECTS.forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; sel.appendChild(o); });

const modeText = document.getElementById('modeText');
const modeImage = document.getElementById('modeImage');
const modePdf = document.getElementById('modePdf');
const textArea = document.getElementById('textArea');
const fileArea = document.getElementById('fileArea');

[modeText, modeImage, modePdf].forEach(r=>r.addEventListener('change', ()=> {
  if(modeText.checked){ textArea.style.display=''; fileArea.style.display='none'; } else { textArea.style.display='none'; fileArea.style.display=''; }
}));

let queue = [];
document.getElementById('addManual')?.addEventListener('click', ()=>{
  const subj = sel.value; if(!subj) return alert('Select subject');
  const q = document.getElementById('manualQ').value.trim();
  const opts = [document.getElementById('optA').value,document.getElementById('optB').value,document.getElementById('optC').value,document.getElementById('optD').value];
  const ans = parseInt(document.getElementById('manualAns').value,10);
  if(!q) return alert('Enter question');
  queue.push({questionText:q,options:opts,correctAnswerIndex:ans,explanation:document.getElementById('manualExp').value||'',mode:'text'});
  renderPreview();
});

document.getElementById('processBtn')?.addEventListener('click', async ()=>{
  const subj = sel.value; if(!subj) return alert('Select subject');
  const fQ = document.getElementById('fileQ').files[0];
  const fA = document.getElementById('fileA').files[0];
  if(!fQ||!fA) return alert('Select both files');
  document.getElementById('uploadStatus').textContent='Processing OCR...';
  try{
    const [qText,aText] = await Promise.all([ uploadToOCR(fQ), uploadToOCR(fA) ]);
    const parsedQ = parseQuestionsFromText(qText); const parsedA = parseAnswersFromText(aText);
    const combined = parsedQ.map(q=>{ const ans = parsedA[q.number]; const idx = ans?['a','b','c','d'].indexOf(ans):0; return {questionText:q.question, options:q.options, correctAnswerIndex: (idx>=0?idx:0), mode:'ocr'} });
    if(!combined.length){ alert('No pairs parsed'); document.getElementById('uploadStatus').textContent=''; return; }
    queue.push(...combined);
    renderPreview();
    document.getElementById('uploadStatus').textContent=`Detected ${combined.length} items`;
  }catch(e){ alert('OCR failed: '+e.message); document.getElementById('uploadStatus').textContent=''; }
});

async function uploadToOCR(file){
  if(!OCR_KEY || OCR_KEY.includes('xxxx')) throw new Error('Set OCR_KEY in upload.js');
  const fd = new FormData(); fd.append('apikey',OCR_KEY); fd.append('isOverlayRequired',false); fd.append('file', file, file.name);
  const res = await fetch('https://api.ocr.space/parse/image', { method:'POST', body: fd });
  const data = await res.json();
  if(data.IsErroredOnProcessing) throw new Error((data.ErrorMessage||'OCR error').toString());
  return data.ParsedResults[0].ParsedText || '';
}

function parseQuestionsFromText(text){
  const blocks=[]; const clean=(text||'').replace(/\r/g,'').replace(/\t/g,' ').replace(/\u00A0/g,' ');
  const inlineRe = /(?:(?:^|\n)\s*)(\d+)\.\s*([^\n(]+?)\s*(?:\(a\)|a\)|A\.|\s+\(a\))\s*([^\n(]+?)\s*(?:\(b\)|b\)|B\.|\s+\(b\))\s*([^\n(]+?)\s*(?:\(c\)|c\)|C\.|\s+\(c\))\s*([^\n(]+?)\s*(?:\(d\)|d\)|D\.|\s+\(d\))\s*([^\n]+)(?=\n\s*\d+\.|$)/gsi;
  let m; while((m=inlineRe.exec(clean))!==null){ const num=parseInt(m[1],10); const question=m[2].trim(); const options=[m[3].trim(),m[4].trim(),m[5].trim(),m[6].trim()]; blocks.push({number:num,question:question,options}); }
  if(blocks.length) return blocks;
  const lines=clean.split('\n').map(l=>l.trim()).filter(Boolean);
  for(let i=0;i<lines.length;i++){ const qMatch=lines[i].match(/^(\d+)\.\s*(.+)$/); if(qMatch){ const num=parseInt(qMatch[1],10); const question=qMatch[2].trim(); const opts=[]; for(let j=1;j<=6 && i+j<lines.length && opts.length<4;j++){ const line=lines[i+j]; const optMatch=line.match(/^[\(]?([a-dA-D])[\)\.]?\s*(.+)$/); if(optMatch) opts.push(optMatch[2].trim()); else { const alt=line.match(/^([a-dA-D])\.\s*(.+)$/); if(alt) opts.push(alt[2].trim()); } } if(opts.length===4) blocks.push({number:num,question:question,options:opts}); } }
  return blocks;
}

function parseAnswersFromText(text){
  const ans={}; const clean=(text||'').replace(/\r/g,'').replace(/\t/g,' ').replace(/\u00A0/g,' ');
  const re = /(\d+)\s*[\.\)]?\s*[\:\-\)]?\s*[\(]?([a-dA-D])[\)]?\s*(?:[:\-]|\)|\.|\s)?/g;
  let m;
  while((m=re.exec(clean))!==null){ const num=parseInt(m[1],10); const ch=m[2].toLowerCase(); if(!isNaN(num)) ans[num]=ch; }
  return ans;
}

function renderPreview(){
  const list = document.getElementById('previewList'); list.innerHTML='';
  queue.forEach((it,i)=>{ const el=document.createElement('div'); el.className='list-group-item'; el.innerHTML=`<div><strong>Q${i+1}</strong> ${escapeHtml(it.questionText)}<div class='small text-muted'>Answer: ${['A','B','C','D'][it.correctAnswerIndex||0]}</div></div>`; list.appendChild(el); });
  document.getElementById('previewBox').style.display = queue.length ? 'block' : 'none';
}

document.getElementById('saveBtn')?.addEventListener('click', async ()=>{
  const user = auth.currentUser; if(!user) return alert('Login first');
  const subj = sel.value; if(!subj) return alert('Select subject');
  try{
    const batchSize = 400;
    for(let i=0;i<queue.length;i+=batchSize){
      const chunk = queue.slice(i,i+batchSize);
      const batch = writeBatch(db);
      chunk.forEach(item=>{ const d=doc(collection(db, `subjects/${subj}/questions`)); batch.set(d, { questionText: item.questionText, options: item.options, correctAnswerIndex: item.correctAnswerIndex, explanation: item.explanation||'', mode:item.mode, uploadedBy:user.uid, createdAt: serverTimestamp() }); });
      await batch.commit();
    }
    alert('Saved '+queue.length+' questions'); queue=[]; renderPreview(); document.getElementById('uploadStatus').textContent='';
  }catch(e){ alert('Save error: '+e.message); }
});

function escapeHtml(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
// upload.js placeholder
