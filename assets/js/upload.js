// upload.js - Updated for single text box input (question + options + answer + explanation)
import { auth, db } from './firebase.js';
import { collection, writeBatch, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const OCR_KEY = 'K82819546588957';

const SUBJECTS = [
  'Anatomy','Physiology','Biochemistry','Fundamentals of Exercise Therapy','Fundamentals of Electro Therapy',
  'Pharmacology','Pathology & Microbiology','Psychology','Psychiatry','Electrical Agents','Kinesio Therapeutics',
  'General Surgery & Orthopedics','Medicine','OBGY','Physical Diagnosis & Manipulative Skills',
  'Physiotherapy in Musculoskeletal Condition','Physiotherapy in Neurosciences',
  'Physiotherapy in General Medical & General Surgical Condition','Physiotherapy in Community Health'
];

// Populate subject dropdown
const sel = document.getElementById('subjectSelect');
SUBJECTS.forEach(s => {
  const o = document.createElement('option');
  o.value = s;
  o.textContent = s;
  sel.appendChild(o);
});

const modeText = document.getElementById('modeText');
const modeImage = document.getElementById('modeImage');
const modePdf = document.getElementById('modePdf');
const textArea = document.getElementById('textArea');
const fileArea = document.getElementById('fileArea');

[modeText, modeImage, modePdf].forEach(r => r.addEventListener('change', () => {
  if (modeText.checked) {
    textArea.style.display = '';
    fileArea.style.display = 'none';
  } else {
    textArea.style.display = 'none';
    fileArea.style.display = '';
  }
}));

let queue = [];

// Handle manual text upload (single big text box)
document.getElementById('addManual')?.addEventListener('click', () => {
  const subj = sel.value;
  if (!subj) return alert('Select subject first');

  const text = document.getElementById('bulkText').value.trim();
  if (!text) return alert('Enter text to parse');

  const parsed = parseTextToQuestions(text);
  if (!parsed.length) return alert('No valid questions found. Check your format.');

  queue.push(...parsed.map(q => ({ ...q, mode: 'text' })));
  renderPreview();
});

// OCR Upload handlers remain same
document.getElementById('processBtn')?.addEventListener('click', async () => {
  const subj = sel.value;
  if (!subj) return alert('Select subject');
  const fQ = document.getElementById('fileQ').files[0];
  const fA = document.getElementById('fileA').files[0];
  if (!fQ || !fA) return alert('Select both files');
  document.getElementById('uploadStatus').textContent = 'Processing OCR...';
  try {
    const [qText, aText] = await Promise.all([uploadToOCR(fQ), uploadToOCR(fA)]);
    const parsedQ = parseQuestionsFromText(qText);
    const parsedA = parseAnswersFromText(aText);
    const combined = parsedQ.map(q => {
      const ans = parsedA[q.number];
      const idx = ans ? ['a', 'b', 'c', 'd'].indexOf(ans) : 0;
      return { questionText: q.question, options: q.options, correctAnswerIndex: idx >= 0 ? idx : 0, explanation: '', mode: 'ocr' };
    });
    queue.push(...combined);
    renderPreview();
    document.getElementById('uploadStatus').textContent = `Detected ${combined.length} items`;
  } catch (e) {
    alert('OCR failed: ' + e.message);
    document.getElementById('uploadStatus').textContent = '';
  }
});

async function uploadToOCR(file) {
  if (!OCR_KEY) throw new Error('Set OCR_KEY');
  const fd = new FormData();
  fd.append('apikey', OCR_KEY);
  fd.append('isOverlayRequired', false);
  fd.append('file', file, file.name);
  const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.IsErroredOnProcessing) throw new Error((data.ErrorMessage || 'OCR error').toString());
  return data.ParsedResults[0].ParsedText || '';
}

// New text parser for single text box
function parseTextToQuestions(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const blocks = [];
  let current = { question: '', options: [], answer: '', explanation: '' };

  for (const line of lines) {
    if (/^\d+\./.test(line)) {
      if (current.question) blocks.push({ ...current });
      current = { question: line.replace(/^\d+\.\s*/, ''), options: [], answer: '', explanation: '' };
    } else if (/^[A-Da-d][\)\.\:]/.test(line)) {
      const opt = line.replace(/^[A-Da-d][\)\.\:]\s*/, '');
      current.options.push(opt);
    } else if (/^Answer[:\-]/i.test(line)) {
      current.answer = line.split(/[:\-]/)[1]?.trim().charAt(0).toUpperCase();
    } else if (/^Explanation[:\-]/i.test(line)) {
      current.explanation = line.split(/[:\-]/)[1]?.trim();
    } else {
      // continuation of question or explanation
      if (!current.answer && current.options.length < 4) current.question += ' ' + line;
      else current.explanation += ' ' + line;
    }
  }
  if (current.question) blocks.push(current);

  // Convert answer letter to index
  return blocks.map(q => ({
    questionText: q.question,
    options: q.options,
    correctAnswerIndex: ['A', 'B', 'C', 'D'].indexOf(q.answer || 'A'),
    explanation: q.explanation || ''
  }));
}

// Existing OCR parsers unchanged
function parseQuestionsFromText(text) {
  const blocks = [];
  const clean = (text || '').replace(/\r/g, '').replace(/\t/g, ' ').replace(/\u00A0/g, ' ');
  const inlineRe = /(?:(?:^|\n)\s*)(\d+)\.\s*([^\n(]+?)\s*(?:\(a\)|a\)|A\.|\s+\(a\))\s*([^\n(]+?)\s*(?:\(b\)|b\)|B\.|\s+\(b\))\s*([^\n(]+?)\s*(?:\(c\)|c\)|C\.|\s+\(c\))\s*([^\n(]+?)\s*(?:\(d\)|d\)|D\.|\s+\(d\))\s*([^\n]+)(?=\n\s*\d+\.|$)/gsi;
  let m;
  while ((m = inlineRe.exec(clean)) !== null) {
    const num = parseInt(m[1], 10);
    const question = m[2].trim();
    const options = [m[3].trim(), m[4].trim(), m[5].trim(), m[6].trim()];
    blocks.push({ number: num, question: question, options });
  }
  return blocks;
}

function parseAnswersFromText(text) {
  const ans = {};
  const clean = (text || '').replace(/\r/g, '').replace(/\t/g, ' ').replace(/\u00A0/g, ' ');
  const re = /(\d+)\s*[\.\)]?\s*[\:\-\)]?\s*[\(]?([a-dA-D])[\)]?/g;
  let m;
  while ((m = re.exec(clean)) !== null) {
    const num = parseInt(m[1], 10);
    const ch = m[2].toLowerCase();
    if (!isNaN(num)) ans[num] = ch;
  }
  return ans;
}

// Preview renderer
function renderPreview() {
  const list = document.getElementById('previewList');
  list.innerHTML = '';
  queue.forEach((it, i) => {
    const el = document.createElement('div');
    el.className = 'list-group-item';
    el.innerHTML = `
      <div>
        <strong>Q${i + 1}</strong> ${escapeHtml(it.questionText)}<br>
        ${it.options.map((o, idx) => `<div class="small">${['A', 'B', 'C', 'D'][idx]}. ${escapeHtml(o)}</div>`).join('')}
        <div class="small text-muted">Answer: ${['A', 'B', 'C', 'D'][it.correctAnswerIndex || 0]}</div>
      </div>`;
    list.appendChild(el);
  });
  document.getElementById('previewBox').style.display = queue.length ? 'block' : 'none';
}

// Save to Firestore
document.getElementById('saveBtn')?.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return alert('Login first');
  const subj = sel.value;
  if (!subj) return alert('Select subject');
  try {
    const batchSize = 400;
    for (let i = 0; i < queue.length; i += batchSize) {
      const chunk = queue.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach(item => {
        const d = doc(collection(db, `subjects/${subj}/questions`));
        batch.set(d, {
          questionText: item.questionText,
          options: item.options,
          correctAnswerIndex: item.correctAnswerIndex,
          explanation: item.explanation || '',
          mode: item.mode,
          uploadedBy: user.uid,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
    }
    alert(`Saved ${queue.length} questions`);
    queue = [];
    renderPreview();
    document.getElementById('uploadStatus').textContent = '';
  } catch (e) {
    alert('Save error: ' + e.message);
  }
});

function escapeHtml(s) {
  return (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
