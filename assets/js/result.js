// result.js - read lastResult from sessionStorage and render
const data = JSON.parse(sessionStorage.getItem('lastResult')||'null');
if(!data){ alert('No result'); window.location.href='home.html'; }
document.getElementById('scoreHeader').textContent = `Your Score: ${data.score} / ${data.total}`;
let detailed = data.detailed;
document.getElementById('reviewBtn').addEventListener('click', ()=>{
  const area = document.getElementById('reviewArea');
  area.style.display = area.style.display==='block'?'none':'block';
  if(area.style.display==='block'){
    area.innerHTML = detailed.map((d,i)=>{ const ok = d.chosen===d.correct; const tick = ok? '✅':'❌'; const opts = (d.options||[]).map((o,idx)=>`<div class="${idx===d.correct?'option correct':(idx===d.chosen&&!ok?'option wrong':'option')}"><strong>${String.fromCharCode(65+idx)}</strong>. ${o}</div>`).join(''); const exp = d.explanation?`<div class="small-note"><strong>Explanation:</strong> ${d.explanation}</div>`:''; return `<div class="mb-2 p-2 border">${tick} Q${i+1} (${d.subject}) ${d.questionText}<div class="mt-2">${opts}</div>${exp}</div>`; }).join('');
  }
});
// result.js placeholder
