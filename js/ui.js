// ============================================================
// voice → collage · v4 · interface
// guest moods & sliders · studio (every lever) · patch bay · language map · 3D sculpture · room wall · listen · MIDI
// ============================================================
$('noLabel').textContent = 'No. ' + pad3(collageNo);

// ---------- live voice features in the HUD ----------
const featBars = {};
FEATURES.forEach(f => {
  const d = document.createElement('div'); d.className = 'feat'; d.title = FEATURE_HINT[f];
  d.innerHTML = `<i></i><span>${f}</span>`; $('features').appendChild(d); featBars[f] = d.querySelector('i');
});
function showFeatures() { for (const f of FEATURES) featBars[f].style.height = Math.round(F[f] * 100) + '%'; }

// ---------- generic controls bound to P ----------
const bound = {}; // key -> [refresh fns]
const PAPER_KEYS = ['bg', 'texture', 'vignette', 'frame'];
function onParam(k) {
  if (k === 'mode') { syncMode(); }
  if (k === 'shape') { if (state === 'idle' || state === 'done') { applyShape(); if (state === 'done') clearPieces(); } }
  else if (PAPER_KEYS.includes(k)) paintPaper();
  if (state === 'done') render();
  if (k === 'sessionSec' && state === 'idle') showIdleTime();
  if (k === 'askQuestion') showQuestion();
  if (k === 'captionOnImage' && state === 'done') { redrawCaption(); render(); finalCanvas = exportCanvas(); }
  markPreset(null);
}
function control(item, compact) {
  const d = document.createElement('div'); d.className = 'lever' + (compact ? ' compact' : '');
  const k = item.k; let refresh;
  if (item.type === 'range') {
    d.innerHTML = `<span class="name">${item.label}</span><input type="range" min="0" max="100" step="1"><span class="ends"><span>${item.ends[0]}</span><span>${item.ends[1]}</span></span>`;
    const i = d.querySelector('input'); i.oninput = () => { P[k] = i.value / 100; sync(k, refresh); onParam(k); };
    refresh = () => { i.value = Math.round(P[k] * 100); };
  } else if (item.type === 'select') {
    d.innerHTML = `<span class="name">${item.label}</span><select>${item.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`;
    const s = d.querySelector('select'); s.onchange = () => { const v = s.value; P[k] = k === 'sessionSec' && v !== 'open' ? Number(v) : v; sync(k, refresh); onParam(k); };
    refresh = () => { s.value = String(P[k]); };
  } else if (item.type === 'color') {
    d.innerHTML = `<span class="name">${item.label}</span><span class="colorrow"><input type="color"><code></code></span>`;
    const c = d.querySelector('input'), code = d.querySelector('code'); c.oninput = () => { P[k] = c.value; code.textContent = c.value; sync(k, refresh); onParam(k); };
    refresh = () => { c.value = P[k]; code.textContent = P[k]; };
  } else if (item.type === 'check') {
    d.innerHTML = `<label class="ck"><input type="checkbox"> ${item.label}</label>`; d.classList.add('checkrow');
    const c = d.querySelector('input'); c.onchange = () => { P[k] = c.checked; sync(k, refresh); onParam(k); };
    refresh = () => { c.checked = !!P[k]; };
  }
  (bound[k] = bound[k] || []).push(refresh); refresh();
  return d;
}
function sync(k, except) { for (const f of bound[k] || []) if (f !== except) f(); }
function syncAll() { for (const k in bound) sync(k); syncSeries(); syncLang(); syncPatch(); }

// ---------- presets ----------
let activePreset = null;
function markPreset(name) { activePreset = name; document.querySelectorAll('.chip[data-p]').forEach(c => c.classList.toggle('on', c.dataset.p === name)); }
function applyPreset(name) {
  const pr = PRESETS[name]; const shapeChanged = pr.shape && pr.shape !== P.shape;
  P = { ...P, ...JSON.parse(JSON.stringify(pr)) };
  if (shapeChanged) applyShape(); else paintPaper();
  syncAll(); syncMode(); markPreset(name);
}
function surprise() {
  for (const it of ALL_ITEMS) {
    if (['recordVideo', 'pitchHeight', 'langArchive', 'sessionSec', 'sensitivity', 'copyChain', 'mode', 'autoSculpture'].includes(it.k)) continue;
    if (it.type === 'range') P[it.k] = Math.random() < .25 ? 0 : Math.round(rnd() * 100) / 100;
    else if (it.type === 'select') P[it.k] = it.options[Math.floor(rnd(it.options.length))];
    else if (it.type === 'color') P[it.k] = '#' + Math.floor(rnd(0xffffff)).toString(16).padStart(6, '0');
    else if (it.type === 'check') P[it.k] = Math.random() < .3;
  }
  // keep it legible: dark backgrounds get light ink and vice versa
  if (isDark(P.bg) === isDark(P.inkColor)) P.inkColor = isDark(P.bg) ? '#f4f1ea' : '#141414';
  for (const f of FEATURES) for (const t of TARGETS) P.patch[f + '>' + t] = Math.random() < .12 ? [-1, -.5, .5, 1][Math.floor(rnd(4))] : 0;
  P.leaks = Math.min(P.leaks, .6); P.aberration = Math.min(P.aberration, .5);
  applyShape(); syncAll(); markPreset('Surprise me');
}
function presetChip(name, parent) {
  const b = document.createElement('button'); b.className = 'chip'; b.dataset.p = name;
  b.innerHTML = `${name}<small>${PRESET_BLURB[name] || 'every lever, randomised'}</small>`;
  b.onclick = () => name === 'Surprise me' ? surprise() : applyPreset(name);
  parent.appendChild(b);
}
function buildGuestChips() { $('presetChips').innerHTML = ''; [...(P.mode === 'paint' ? GUEST_PAINT : GUEST_PRESETS), 'Surprise me'].forEach(n => presetChip(n, $('presetChips'))); markPreset(activePreset); }
buildGuestChips();
function setMode(m) {
  if (P.mode === m && activePreset) return;
  applyPreset(m === 'paint' ? 'Oil sketch' : 'Ransom note');
  syncMode();
}
function syncMode() {
  $('modeCollage').classList.toggle('on', P.mode !== 'paint'); $('modePaint').classList.toggle('on', P.mode === 'paint');
  $('introSub').textContent = P.mode === 'paint'
    ? 'Your voice drags oil paint across raw canvas. The pitch and sharpness of your voice mix the pigment; words that name a colour (sea, amour, 火, 사랑…) change it. Loud, rough sounds scratch through the wet paint. Your words are painted or carved in.'
    : 'Your voice tears paper from the archive. Louder makes bigger pieces, higher voices float up, a held sound tears a long strip, the words land as cut-out letters, and the language you speak chooses the city.';
  $('micBtn').textContent = P.mode === 'paint' ? 'Paint' : 'Start tearing';
  buildGuestChips(); showPigment();
  if (state === 'idle') { showIdleTime(); showStep(1); $('voiceHint').textContent = P.mode === 'paint' ? '· speak past the red line to paint' : '· speak past the red line to tear paper'; }
}
$('modeCollage').onclick = () => setMode('collage');
$('modePaint').onclick = () => setMode('paint');
[...Object.keys(PRESETS), 'Surprise me'].forEach(n => presetChip(n, $('studioPresets')));
['scatter', 'color', 'density'].forEach(k => $('guestLevers').appendChild(control(ALL_ITEMS.find(i => i.k === k), true)));

// ---------- studio sections ----------
for (const sec of SCHEMA) {
  const det = document.createElement('details'); det.className = 'sec'; if (sec.sec === 'Canvas' || sec.sec === 'Words') det.open = true;
  det.innerHTML = `<summary>${sec.sec}</summary><div class="grid"></div>`;
  const grid = det.querySelector('.grid'); sec.items.forEach(it => grid.appendChild(control(it)));
  if (sec.sec === 'Images') {
    const sb = document.createElement('div'); sb.innerHTML = '<div class="lbl" style="margin:8px 0 6px">Series to tear from (when language isn’t choosing)</div><div id="seriesBox"></div>'; grid.appendChild(sb);
  }
  $('studioSections').appendChild(det);
}
Object.entries(SERIES).forEach(([k, label]) => {
  const l = document.createElement('label'); l.className = 'ck'; l.innerHTML = `<input type="checkbox" value="${k}"> ${label}`;
  l.querySelector('input').onchange = () => { const on = [...document.querySelectorAll('#seriesBox input')].filter(i => i.checked).map(i => i.value); P.series = on.length === Object.keys(SERIES).length ? null : on; markPreset(null); };
  $('seriesBox').appendChild(l);
});
function syncSeries() { document.querySelectorAll('#seriesBox input').forEach(c => c.checked = !P.series || P.series.includes(c.value)); }

// language → archive map
const LANG_LABEL = { en: 'English', fr: 'French', zh: 'Chinese', ko: 'Korean', ja: 'Japanese', es: 'Spanish', other: 'Any other' };
Object.keys(LANG_DEFAULT).forEach(code => {
  const row = document.createElement('div'); row.className = 'langrow';
  row.innerHTML = `<span class="name">${LANG_LABEL[code]}</span><input type="text" data-lang="${code}" spellcheck="false">`;
  row.querySelector('input').oninput = e => { P.langMap[code] = e.target.value; };
  $('langMap').appendChild(row);
});
function syncLang() { document.querySelectorAll('#langMap input').forEach(i => i.value = P.langMap[i.dataset.lang] || ''); }
$('langPrefixes').textContent = [...new Set(Object.keys(SOURCES).map(n => n.split('__')[0].replace(/-\d.*$/, '')))].join(' · ');

// patch bay: voice features × visual targets
const PATCH_STEPS = [0, .5, 1, -.5, -1], PATCH_LABEL = { 0: '·', .5: '+', 1: '++', '-0.5': '−', '-1': '−−' };
(function buildPatch() {
  const t = document.createElement('table'); t.className = 'patch';
  t.innerHTML = `<tr><th></th>${TARGETS.map(x => `<th>${x}</th>`).join('')}</tr>` + FEATURES.map(f => `<tr><th title="${FEATURE_HINT[f]}">${f}</th>${TARGETS.map(x => `<td><button data-f="${f}" data-t="${x}"></button></td>`).join('')}</tr>`).join('');
  t.querySelectorAll('button').forEach(b => b.onclick = () => {
    const key = b.dataset.f + '>' + b.dataset.t, cur = P.patch[key] || 0;
    P.patch[key] = PATCH_STEPS[(PATCH_STEPS.indexOf(cur) + 1) % PATCH_STEPS.length]; syncPatch(); markPreset(null);
  });
  $('patchBay').appendChild(t);
})();
function syncPatch() {
  document.querySelectorAll('.patch button').forEach(b => { const v = P.patch[b.dataset.f + '>' + b.dataset.t] || 0; b.textContent = PATCH_LABEL[String(v)] ?? '·'; b.className = v > 0 ? 'pos' : v < 0 ? 'neg' : ''; b.style.opacity = v ? .35 + Math.abs(v) * .65 : 1; });
}
$('patchClear').onclick = () => { P.patch = {}; syncPatch(); };

// defaults
let resetAfter = true; try { resetAfter = localStorage.getItem('vc_resetAfter') !== '0'; } catch (e) {}
$('resetAfter').checked = resetAfter;
$('resetAfter').onchange = e => { resetAfter = e.target.checked; try { localStorage.setItem('vc_resetAfter', resetAfter ? '1' : '0'); } catch (x) {} };
$('saveDefaults').onclick = () => { savedDefaults = JSON.parse(JSON.stringify(P)); try { localStorage.setItem('vc4_defaults', JSON.stringify(P)); } catch (e) {} note('Saved. Every guest now starts from these settings.'); };
$('resetDefaults').onclick = () => { P = JSON.parse(JSON.stringify(DEFAULTS)); savedDefaults = JSON.parse(JSON.stringify(P)); try { localStorage.removeItem('vc4_defaults'); } catch (e) {} applyShape(); syncAll(); markPreset(null); note('Back to factory settings.'); };
const note = t => { $('studioNote').textContent = t; };
const openStudio = () => { studioUnlocked = true; syncAll(); $('studio').classList.add('show'); };
$('closeStudio').onclick = () => $('studio').classList.remove('show');
$('studio').onclick = e => { if (e.target.id === 'studio') $('studio').classList.remove('show'); };
let taps = [];
$('noLabel').addEventListener('click', () => { const t = performance.now(); taps = taps.filter(x => t - x < 700); taps.push(t); if (taps.length >= 3) { taps = []; openStudio(); } });
document.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 's' || e.key === 'S') $('studio').classList.contains('show') ? $('studio').classList.remove('show') : openStudio();
  if (e.key === 'w' || e.key === 'W') $('archive').classList.contains('show') ? $('archive').classList.remove('show') : openArchive();
  if (e.key === 'Escape') { $('studio').classList.remove('show'); $('archive').classList.remove('show'); close3D(); }
});

// ---------- MIDI knobs (learn) ----------
const MIDI_ORDER = ['scatter', 'color', 'density', 'letterMix', 'wordSize', 'wordsVsImages', 'edge', 'tilt', 'layout', 'zoom', 'contrast', 'blur', 'grain', 'leaks', 'depth3d', 'wave'];
let midiMap = {}; try { midiMap = JSON.parse(localStorage.getItem('vc_midi') || '{}'); } catch (e) {}
$('midiNote').textContent = `Connect, then turn knobs one by one: the first ${MIDI_ORDER.length} you move become ${MIDI_ORDER.map(k => LABEL_OF[k]).join(' · ')}.`;
$('midiBtn').onclick = async () => {
  if (!navigator.requestMIDIAccess) { $('midiNote').textContent = 'This browser has no Web MIDI. Use Chrome on a laptop.'; return; }
  try {
    const access = await navigator.requestMIDIAccess(); const hook = () => access.inputs.forEach(inp => { inp.onmidimessage = onMidi; }); hook(); access.onstatechange = hook;
    const n = [...access.inputs.values()].length; $('midiNote').textContent = n ? `Connected (${n}). Turn a knob to assign it.` : 'No MIDI device found. Plug one in and press again.';
  } catch (e) { $('midiNote').textContent = 'MIDI permission was refused.'; }
};
$('midiReset').onclick = () => { midiMap = {}; try { localStorage.removeItem('vc_midi'); } catch (e) {} $('midiNote').textContent = 'Knob assignments cleared.'; };
function onMidi(ev) {
  const [st, cc, val] = ev.data; if ((st & 0xf0) !== 0xb0) return;
  let key = midiMap[cc];
  if (!key) { const used = Object.values(midiMap); key = MIDI_ORDER.find(k => !used.includes(k)); if (!key) return; midiMap[cc] = key; try { localStorage.setItem('vc_midi', JSON.stringify(midiMap)); } catch (e) {} $('midiNote').textContent = `Knob ${cc} → ${LABEL_OF[key]}`; }
  P[key] = val / 127; sync(key); onParam(key);
}

// ---------- Deepgram key ----------
function refreshKeyUI() { $('keyToggle').textContent = dgKey ? 'Words: on · change Deepgram key' : 'Words: off · add Deepgram key'; setWordsStatus(dgKey ? 'words: ready' : 'words: off (no key)'); }
$('keyToggle').onclick = () => { $('keyPanel').classList.toggle('show'); $('keyIn').value = ''; $('keyIn').focus(); };
$('keySave').onclick = () => { const v = $('keyIn').value.trim(); if (!v) return; dgKey = v; try { localStorage.setItem('vc_dg', v); } catch (e) {} $('keyIn').value = ''; $('keyPanel').classList.remove('show'); refreshKeyUI(); };
$('keyClear').onclick = () => { dgKey = ''; try { localStorage.removeItem('vc_dg'); } catch (e) {} $('keyPanel').classList.remove('show'); refreshKeyUI(); };

// ---------- a question to begin ----------
let currentQuestion = '', qOrder = [];
function nextQuestion() {
  if (!qOrder.length) qOrder = QUESTIONS.map((_, i) => i).sort(() => Math.random() - .5);
  currentQuestion = QUESTIONS[qOrder.pop()]; showQuestion();
}
function showQuestion() {
  const on = P.askQuestion && currentQuestion;
  $('qBox').style.display = on ? '' : 'none';
  $('qText').textContent = currentQuestion;
  $('introTitle').style.display = on ? 'none' : ''; $('intro').classList.toggle('qon', !!on);
  $('qBanner').textContent = on ? currentQuestion : '';
}
$('qNext').onclick = () => nextQuestion();
// two steps: reflect on the question (nothing recording), then press to begin
function showStep(n) {
  $('step1').style.display = n === 1 ? '' : 'none'; $('step2').style.display = n === 2 ? '' : 'none';
  const on = P.askQuestion && currentQuestion;
  $('q2Label').style.display = on ? '' : 'none'; $('qText2').textContent = on ? currentQuestion : '';
  if (state === 'idle') setStatus(n === 1 ? (on ? 'Read the question. Take your time — nothing is recording.' : 'Choose a mode, then press “I’m ready”.') : (P.mode === 'paint' ? 'Press “Paint” when you’re ready to speak.' : 'Press “Start tearing” when you’re ready to speak.'));
}
$('readyBtn').onclick = () => showStep(2);
$('backBtn').onclick = () => showStep(1);
nextQuestion();

// ---------- finish when you're ready ----------
$('finishBtn').onclick = () => { if (state === 'listening') finish(); };
document.addEventListener('keydown', e => { if (e.key === 'Enter' && state === 'listening' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) finish(); });

// ---------- start ----------
$('micBtn').onclick = () => startMic();
let pendingFile = null;
$('fileIn').onchange = e => { const f = e.target.files && e.target.files[0]; if (!f) return; pendingFile = f; $('fileName').textContent = f.name.length > 18 ? 'this recording' : f.name; $('playFile').style.display = 'inline-block'; e.target.value = ''; };
$('playFile').onclick = () => { if (pendingFile) { $('playFile').style.display = 'none'; startFile(pendingFile); pendingFile = null; } };

// ---------- after a collage ----------
let finalCanvas = null, listenMode = false;
async function afterCollage() {
  finalCanvas = exportCanvas();
  lastCollage = mk(W, H); lastCollage.getContext('2d').drawImage(finalCanvas, 0, 0);
  $('videoBtn').style.display = videoBlob ? '' : 'none';
  $('listenBtn').style.display = audioBuffer ? '' : 'none';
  $('after').classList.add('show');
  $('signNote').textContent = artistName ? `Signed “${artistName}” — saved to the archive.` : 'Saved to the archive. Sign it with your name:';
  $('nameAfter').value = artistName;
  try { await saveWork(); } catch (e) { $('signNote').textContent = 'Couldn’t save to the archive on this device.'; }
  try { localStorage.setItem('vc_no', String(collageNo + 1)); } catch (e) {}
  if (P.autoSculpture) open3D();
}
function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
async function shareOrDownload(blob, name) {
  try { const file = new File([blob], name, { type: blob.type }); if (navigator.canShare && navigator.canShare({ files: [file] }) && /Mobi|Android|iPhone|iPad/.test(navigator.userAgent)) { await navigator.share({ files: [file] }); return; } } catch (e) {}
  downloadBlob(blob, name);
}
$('saveBtn').onclick = () => { (finalCanvas || exportCanvas()).toBlob(b => shareOrDownload(b, fileBase({ no: collageNo, name: artistName }) + '.png'), 'image/png'); };
$('videoBtn').onclick = () => { if (videoBlob) shareOrDownload(videoBlob, fileBase({ no: collageNo, name: artistName }) + (videoBlob.type.includes('mp4') ? '.mp4' : '.webm')); };
$('listenBtn').onclick = () => { listenMode = !listenMode; $('listenBtn').classList.toggle('on', listenMode); $('stage').classList.toggle('listening', listenMode); setStatus(listenMode ? 'Tap any piece to hear the moment that tore it.' : 'Done. Save it, listen back, or open it in 3D.'); };
$('sculptBtn').onclick = () => open3D();
function resetToIdle(resetParams) {
  if (state === 'done' || state === 'idle') { if (state === 'done') { collageNo++; } }
  $('noLabel').textContent = 'No. ' + pad3(collageNo); close3D(); listenMode = false; $('listenBtn').classList.remove('on'); $('stage').classList.remove('listening');
  if (resetParams && resetAfter) { const m = P.mode; P = JSON.parse(JSON.stringify(savedDefaults)); if (m !== P.mode) { P.mode = m; if (m === 'paint') P = { ...P, ...JSON.parse(JSON.stringify(PAINT_PRESETS['Oil sketch'])) }; } markPreset(null); }
  applyShape(); clearPieces(); syncAll(); syncMode(); state = 'idle'; showIdleTime(); showLevel(0); refreshKeyUI(); $('hud').classList.add('idle');
  captionInfo = null; currentWorkId = null; $('pieceLabel').style.display = 'none'; $('after').classList.remove('show'); $('intro').classList.remove('hidden'); $('controls').classList.remove('hidden');
}
$('againBtn').onclick = () => { resetToIdle(true); remixFrom = null; showRemixChip(); setArtistName('', false); $('nameIn').value = ''; nextQuestion(); showStep(1); };
// ---------- drag anything once the piece is done ----------
const canvasPt = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * W / r.width, (ev.clientY - r.top) * H / r.height]; };
function pieceAt(px, py) {
  for (let i = history.length - 1; i >= 0; i--) {
    const s = history[i]; if (!s.canvas) continue;
    const dx = px - s.x, dy = py - s.y, c = Math.cos(-s.rot), sn = Math.sin(-s.rot), lx = dx * c - dy * sn, ly = dx * sn + dy * c;
    if (Math.abs(lx) < s.w / 2 && Math.abs(ly) < s.h / 2) return s;
  }
  return null;
}
let drag = null, smear = null, arrangeTimer = null;
function arranged() { // keep the saved image in step with the new arrangement
  clearTimeout(arrangeTimer);
  arrangeTimer = setTimeout(async () => { finalCanvas = exportCanvas(); if (currentWorkId) { try { await updateWork(currentWorkId, { img: await toBlob(finalCanvas), thumb: thumbOf(finalCanvas) }); } catch (e) {} } }, 600);
}
cv.addEventListener('pointerdown', ev => {
  if (state !== 'done' || listenMode) return;
  const [px, py] = canvasPt(ev);
  if (P.mode === 'collage') {
    const s = pieceAt(px, py); if (!s) return;
    history.splice(history.indexOf(s), 1); history.push(s); // bring to the front
    dragPiece = s; drag = { s, ox: px - s.x, oy: py - s.y }; rebuildFromHistory(); render();
  } else { smear = { x: px, y: py }; } // paint: drag smears the wet paint
  cv.setPointerCapture && cv.setPointerCapture(ev.pointerId); ev.preventDefault();
});
cv.addEventListener('pointermove', ev => {
  if (state === 'done' && !listenMode && !drag && !smear) { const [px, py] = canvasPt(ev); cv.style.cursor = P.mode === 'paint' ? 'crosshair' : pieceAt(px, py) ? 'grab' : 'default'; }
  if (drag) { const [px, py] = canvasPt(ev); drag.s.x = px - drag.ox; drag.s.y = py - drag.oy; cv.style.cursor = 'grabbing'; render(); }
  if (smear) {
    const [px, py] = canvasPt(ev), r = lerp(26, 70, P.brushSize), d = Math.hypot(px - smear.x, py - smear.y), n = Math.max(1, Math.ceil(d / 6));
    for (let k = 1; k <= n; k++) {
      const x0 = lerp(smear.x, px, (k - 1) / n), y0 = lerp(smear.y, py, (k - 1) / n), x1 = lerp(smear.x, px, k / n), y1 = lerp(smear.y, py, k / n);
      sctx.save(); sctx.globalAlpha = .55; sctx.beginPath(); sctx.arc(x1, y1, r, 0, Math.PI * 2); sctx.clip();
      sctx.drawImage(layers.settled, x0 - r, y0 - r, r * 2, r * 2, x1 - r, y1 - r, r * 2, r * 2); sctx.restore();
    }
    smear = { x: px, y: py }; render();
  }
});
const endDrag = () => {
  if (drag) { dragPiece = null; drag = null; rebuildFromHistory(); render(); arranged(); cv.style.cursor = 'grab'; }
  if (smear) { smear = null; arranged(); }
};
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
cv.addEventListener('wheel', ev => { // scroll over a piece to turn it
  if (state !== 'done' || listenMode || P.mode !== 'collage') return;
  const [px, py] = canvasPt(ev), s = pieceAt(px, py); if (!s) return;
  ev.preventDefault(); s.rot += ev.deltaY * .0025; rebuildFromHistory(); render(); arranged();
}, { passive: false });

cv.addEventListener('click', ev => {
  if (state !== 'done' || !listenMode) return;
  const r = cv.getBoundingClientRect(), px = (ev.clientX - r.left) * W / r.width, py = (ev.clientY - r.top) * H / r.height;
  for (let i = history.length - 1; i >= 0; i--) {
    const s = history[i], dx = px - s.x, dy = py - s.y, c = Math.cos(-s.rot), sn = Math.sin(-s.rot), lx = dx * c - dy * sn, ly = dx * sn + dy * c;
    if (Math.abs(lx) < s.w / 2 && Math.abs(ly) < s.h / 2) {
      let w = s.word && s.a0 ? { text: s.text, a0: s.a0, a1: s.a1 } : null;
      if (!w && spokenWords.length) w = spokenWords[Math.floor(rnd(spokenWords.length))]; // photo scraps: a random spoken word
      highlight = { rec: s, until: performance.now() + 1400 };
      if (w) { playWord(w); setStatus(`▶ “${w.text}”`); }
      else { playRange(s.t - .25, s.t + .45); setStatus('▶ (no words heard — add a Deepgram key for word-by-word)'); }
      return;
    }
  }
  if (spokenWords.length) { const w = spokenWords[Math.floor(rnd(spokenWords.length))]; playWord(w); setStatus(`▶ “${w.text}”`); }
});

// ---------- archive: every piece made on this device, full size, signed, downloadable, remixable ----------
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('voice-collage', 2);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('wall')) db.createObjectStore('wall', { keyPath: 'id', autoIncrement: true }); if (!db.objectStoreNames.contains('works')) db.createObjectStore('works', { keyPath: 'id', autoIncrement: true }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
const toBlob = (c, type = 'image/jpeg', q = .92) => new Promise(r => c.toBlob(r, type, q));
function thumbOf(c) { const t = mk(480, Math.round(480 * c.height / c.width)); t.getContext('2d').drawImage(c, 0, 0, t.width, t.height); return t.toDataURL('image/jpeg', .82); }
const slug = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9぀-鿿가-힯]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
const fileBase = w => `collage-${pad3(w.no)}${w.name ? '-' + slug(w.name) : ''}`;
let currentWorkId = null;
async function saveWork() {
  const rec = {
    no: collageNo, name: artistName, at: Date.now(), mode: P.mode, shape: P.shape, question: P.askQuestion ? currentQuestion : '',
    img: await toBlob(finalCanvas), thumb: thumbOf(finalCanvas), video: videoBlob || null,
    words: heardWords.slice(0, 80), langs: [...heardLangs.keys()], params: JSON.parse(JSON.stringify(P)),
    parent: remixFrom ? remixFrom.id : null, parentNo: remixFrom ? remixFrom.no : null, parentName: remixFrom ? remixFrom.name : '',
  };
  const db = await idb(), tx = db.transaction('works', 'readwrite'), req = tx.objectStore('works').add(rec);
  await new Promise(r => tx.oncomplete = r); currentWorkId = req.result; return currentWorkId;
}
async function updateWork(id, patch) {
  const db = await idb(), tx = db.transaction('works', 'readwrite'), st = tx.objectStore('works'), g = st.get(id);
  await new Promise(r => g.onsuccess = r); if (g.result) st.put({ ...g.result, ...patch }); await new Promise(r => tx.oncomplete = r);
}
async function getWork(id) { const db = await idb(); return new Promise(res => { const g = db.transaction('works').objectStore('works').get(id); g.onsuccess = () => res(g.result); g.onerror = () => res(null); }); }
async function allWorks(withBlobs) {
  const db = await idb();
  return new Promise(res => { const out = []; const c = db.transaction('works').objectStore('works').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { const v = cur.value; out.push(withBlobs ? v : { ...v, img: null, video: v.video ? true : null }); cur.continue(); } else res(out); }; });
}
async function deleteWork(id) { const db = await idb(), tx = db.transaction('works', 'readwrite'); tx.objectStore('works').delete(id); await new Promise(r => tx.oncomplete = r); }

// signing: a name typed before or after a piece goes into its caption and the archive
let nameTimer = null;
function setArtistName(v, fromAfter) {
  artistName = (v || '').trim().slice(0, 40);
  if (!fromAfter) $('nameAfter').value = artistName; else $('nameIn').value = artistName;
  if (state === 'done' && captionInfo) {
    clearTimeout(nameTimer);
    nameTimer = setTimeout(async () => {
      redrawCaption(); render(); finalCanvas = exportCanvas();
      if (currentWorkId) { try { await updateWork(currentWorkId, { name: artistName, img: await toBlob(finalCanvas), thumb: thumbOf(finalCanvas) }); } catch (e) {} }
      $('signNote').textContent = artistName ? `Signed — saved to the archive as “${artistName}”.` : 'Unsigned.';
    }, 500);
  }
}
$('nameIn').oninput = e => setArtistName(e.target.value, false);
$('nameAfter').oninput = e => setArtistName(e.target.value, true);

// archive view
let archiveFilter = 'tonight', studioUnlocked = false, detailURLs = [];
async function openArchive() {
  let items = []; try { items = await allWorks(false); } catch (e) {}
  const since = Date.now() - 1000 * 60 * 60 * 14, shown = (archiveFilter === 'tonight' ? items.filter(i => i.at > since) : items).slice().reverse();
  const langs = new Map(); shown.forEach(i => (i.langs || []).forEach(l => langs.set(l, (langs.get(l) || 0) + 1)));
  let dn = null; try { dn = new Intl.DisplayNames(['en'], { type: 'language' }); } catch (e) {}
  $('archMeta').textContent = `${shown.length} piece${shown.length === 1 ? '' : 's'}${archiveFilter === 'tonight' ? ' tonight' : ' in total'}` + (langs.size ? ` · ${[...langs.entries()].sort((a, b) => b[1] - a[1]).map(([l, n]) => `${(dn && dn.of(l)) || l} ${n}`).join(' · ')}` : '');
  $('archTonight').classList.toggle('on', archiveFilter === 'tonight'); $('archAll').classList.toggle('on', archiveFilter === 'all');
  $('archGrid').innerHTML = shown.map(i => `<figure data-id="${i.id}" tabindex="0"><img src="${i.thumb}" alt="Collage ${i.no}"><figcaption><b>No. ${pad3(i.no)}${i.name ? ' · ' + escapeHtml(i.name) : ''}</b>${i.parentNo ? `<br>after No. ${pad3(i.parentNo)}${i.parentName ? ' by ' + escapeHtml(i.parentName) : ''}` : ''}${i.words && i.words.length ? '<br>“' + escapeHtml(i.words.slice(0, 5).join(' ')) + '”' : ''}<br><span>${i.mode === 'paint' ? 'paint' : 'collage'}${i.video ? ' · video' : ''}</span></figcaption></figure>`).join('') || '<p class="note">Nothing here yet — the first piece will appear as soon as someone finishes.</p>';
  $('archGrid').querySelectorAll('figure').forEach(f => { f.onclick = () => openDetail(Number(f.dataset.id)); f.onkeydown = e => { if (e.key === 'Enter') openDetail(Number(f.dataset.id)); }; });
  $('archDetail').classList.remove('show'); $('archList').style.display = '';
  $('archAdmin').style.display = studioUnlocked ? '' : 'none';
  $('archive').classList.add('show');
}
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function openDetail(id) {
  const w = await getWork(id); if (!w) return;
  detailURLs.forEach(u => URL.revokeObjectURL(u)); detailURLs = [];
  const u = URL.createObjectURL(w.img); detailURLs.push(u);
  $('detImg').src = u;
  const d = new Date(w.at);
  $('detTitle').textContent = `No. ${pad3(w.no)}${w.name ? ' — ' + w.name : ''}`;
  $('detMeta').textContent = [`${w.mode === 'paint' ? 'Paint' : 'Collage'} · ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, w.question ? `Asked: ${w.question}` : '', w.parentNo ? `after No. ${pad3(w.parentNo)}${w.parentName ? ' by ' + w.parentName : ''}` : '', w.words && w.words.length ? `Said: “${w.words.join(' ')}”` : ''].filter(Boolean).join('\n');
  $('detVideo').style.display = w.video ? '' : 'none';
  $('detDelete').style.display = studioUnlocked ? '' : 'none'; $('detDelete').textContent = 'Delete'; $('detDelete').dataset.armed = '';
  $('detImg').onclick = null;
  $('detDownload').onclick = () => shareOrDownload(w.img, fileBase(w) + '.jpg');
  $('detVideo').onclick = () => w.video && shareOrDownload(w.video, fileBase(w) + (w.video.type.includes('mp4') ? '.mp4' : '.webm'));
  $('detRemix').onclick = () => startRemix(w);
  $('detDelete').onclick = async () => { if (!$('detDelete').dataset.armed) { $('detDelete').dataset.armed = '1'; $('detDelete').textContent = 'Tap again to delete'; return; } await deleteWork(w.id); openArchive(); };
  $('archList').style.display = 'none'; $('archDetail').classList.add('show');
}
$('detBack').onclick = () => { $('archDetail').classList.remove('show'); $('archList').style.display = ''; };
$('archClose').onclick = () => $('archive').classList.remove('show');
$('archive').onclick = e => { if (e.target.id === 'archive') $('archive').classList.remove('show'); };
$('archTonight').onclick = () => { archiveFilter = 'tonight'; openArchive(); };
$('archAll').onclick = () => { archiveFilter = 'all'; openArchive(); };
$('openArchive').onclick = () => openArchive();
$('archiveBtn').onclick = () => openArchive();
$('openWall').onclick = () => { $('studio').classList.remove('show'); openArchive(); };
$('archZip').onclick = async () => {
  $('archZip').textContent = 'Packing…';
  try {
    if (!window.JSZip) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vendor/jszip.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    const works = await allWorks(true), zip = new JSZip(), meta = [];
    for (const w of works) {
      const base = fileBase(w); zip.file(base + '.jpg', w.img); if (w.video) zip.file(base + (w.video.type.includes('mp4') ? '.mp4' : '.webm'), w.video);
      meta.push({ no: w.no, name: w.name, at: new Date(w.at).toISOString(), mode: w.mode, question: w.question || null, words: w.words, languages: w.langs, after: w.parentNo || null, afterName: w.parentName || null, settings: w.params });
    }
    zip.file('archive.json', JSON.stringify(meta, null, 2));
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `voice-collage-archive-${new Date().toISOString().slice(0, 10)}.zip`);
  } catch (e) { $('archMeta').textContent = 'Could not build the zip: ' + e.message; }
  $('archZip').textContent = 'Download everything (.zip)';
};
$('archClear').onclick = async () => {
  if (!$('archClear').dataset.armed) { $('archClear').dataset.armed = '1'; $('archClear').textContent = 'Tap again to delete the whole archive'; return; }
  const db = await idb(), tx = db.transaction('works', 'readwrite'); tx.objectStore('works').clear(); await new Promise(r => tx.oncomplete = r);
  $('archClear').dataset.armed = ''; $('archClear').textContent = 'Delete the whole archive'; openArchive();
};

// remix: load someone's piece with its exact settings and paint/tear on top of it
async function startRemix(w) {
  const img = new Image(); const url = URL.createObjectURL(w.img);
  await new Promise(r => { img.onload = r; img.onerror = r; img.src = url; });
  remixFrom = { id: w.id, no: w.no, name: w.name || '', img };
  $('archive').classList.remove('show');
  resetToIdle(false); showStep(1);
  P = { ...JSON.parse(JSON.stringify(DEFAULTS)), ...JSON.parse(JSON.stringify(w.params || {})), autoSculpture: false };
  applyShape(); syncAll(); syncMode(); markPreset(null);
  drawRemixBase(); render();
  showRemixChip();
}
function showRemixChip() {
  const c = $('remixChip');
  if (!remixFrom) { c.style.display = 'none'; return; }
  c.style.display = ''; $('remixText').textContent = `Remixing No. ${pad3(remixFrom.no)}${remixFrom.name ? ' by ' + remixFrom.name : ''} — your voice goes on top`;
}
$('remixCancel').onclick = () => { remixFrom = null; showRemixChip(); clearPieces(); render(); };

// ---------- 3D sculpture: full-screen, lit, with real depth and shadows ----------
let three = null, r3 = null;
async function open3D() {
  if (!history.length && P.mode !== 'paint') return;
  $('view3d').classList.add('show'); document.body.classList.add('in3d'); $('view3dNote').textContent = 'building the sculpture…';
  try { three = three || await import(new URL('js/vendor/three.module.min.js', location.href).href); }
  catch (e) { try { three = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js'); } catch (e2) { $('view3dNote').textContent = 'Couldn’t load 3D.'; return; } }
  const T = three; close3D(true);
  const host = $('view3dCanvas'), vw = window.innerWidth, vh = window.innerHeight;
  const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(vw, vh); renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.innerHTML = ''; host.appendChild(renderer.domElement);
  const dark = isDark(P.bg), room = new T.Color(dark ? '#0d0c0b' : '#2a2724');
  const scene = new T.Scene(); scene.background = room; scene.fog = new T.Fog(room, 3800, 9000);
  const cam = new T.PerspectiveCamera(32, vw / vh, 1, 30000);
  // light like a gallery wall: a warm key from the upper left, a cool fill
  scene.add(new T.HemisphereLight(0xfff4e6, 0x30302c, .9));
  const key = new T.DirectionalLight(0xfff1dd, 2.1); key.position.set(-1400, 1600, 2200); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.normalBias = 1.5;
  Object.assign(key.shadow.camera, { left: -W, right: W, top: H, bottom: -H, near: 100, far: 7000 }); key.shadow.camera.updateProjectionMatrix();
  scene.add(key);
  const fill = new T.DirectionalLight(0xc8d6ff, .45); fill.position.set(1600, -400, 1200); scene.add(fill);
  const tex = c => { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  const span = lerp(120, 1400, P.depth3d), group = new T.Group(); scene.add(group);
  const cutout = (canvas, opts = {}) => { // a paper cut-out that casts a shadow in its own shape
    const map = tex(canvas);
    const mat = new T.MeshStandardMaterial({ map, transparent: true, alphaTest: .45, side: T.DoubleSide, roughness: .92, metalness: 0, opacity: opts.opacity ?? 1 });
    const m = new T.Mesh(new T.PlaneGeometry(canvas.width, canvas.height), mat);
    m.castShadow = true; m.receiveShadow = true;
    m.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map, alphaTest: .45 });
    return m;
  };
  const pieces = [];
  if (P.mode === 'paint') {
    // the painting as a relief: thick paint stands up from the canvas and catches the light
    const cw = 300, chh = Math.round(300 * H / W), colour = mk(W, H), cg = colour.getContext('2d');
    cg.save(); shapePath(cg); cg.clip(); cg.drawImage(layers.paper, 0, 0); cg.drawImage(layers.settled, 0, 0); if (P.captionOnImage) cg.drawImage(layers.caption, 0, 0); cg.restore();
    const hm = mk(cw, chh), hg = hm.getContext('2d'); if ('filter' in hg) hg.filter = 'blur(1.2px)'; hg.drawImage(layers.settled, 0, 0, cw, chh);
    const hd = hg.getImageData(0, 0, cw, chh).data;
    const geo = new T.PlaneGeometry(W, H, cw - 1, chh - 1), pos = geo.attributes.position, relief = lerp(8, 160, P.depth3d) * lerp(.6, 1.4, P.impasto);
    for (let i = 0; i < pos.count; i++) {
      const gx = i % cw, gy = Math.floor(i / cw), k = (gy * cw + gx) * 4, a = hd[k + 3] / 255, lum = (hd[k] + hd[k + 1] + hd[k + 2]) / 765;
      pos.setZ(i, a * relief * (.75 + lum * .5));
    }
    geo.computeVertexNormals();
    const cmap = tex(colour);
    const mat = new T.MeshStandardMaterial({ map: cmap, roughness: .55, metalness: 0, transparent: true, alphaTest: .4 });
    const slab = new T.Mesh(geo, mat); slab.castShadow = true; slab.receiveShadow = true;
    slab.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: cmap, alphaTest: .4 });
    slab.userData.z = 0; group.add(slab); pieces.push(slab);
    // the canvas has thickness: a stretcher edge behind it
    const back = new T.Mesh(new T.BoxGeometry(W, H, 60), new T.MeshStandardMaterial({ color: new T.Color(P.bg).multiplyScalar(.8), roughness: .9 }));
    back.position.z = -32; back.receiveShadow = true; if (P.shape === 'portrait' || P.shape === 'square' || P.shape === 'landscape' || P.shape === 'scroll' || P.shape === 'postcard') group.add(back);
  } else {
    // collage: the backing board, then every scrap and word floating at its own depth
    const board = cutout(layers.paper); board.position.z = -span * .55 - 30; board.castShadow = false; group.add(board);
    const edge = new T.Mesh(new T.BoxGeometry(W, H, 40), new T.MeshStandardMaterial({ color: new T.Color(P.bg).multiplyScalar(.72), roughness: .95 }));
    edge.position.z = board.position.z - 21; edge.receiveShadow = true; if (!['circle', 'blob', 'arch'].includes(P.shape)) group.add(edge);
    if (P.captionOnImage) { const cap = cutout(layers.caption); cap.position.z = span * .5 + 20; cap.userData.z = cap.position.z; group.add(cap); pieces.push(cap); }
    const list = history.filter(s => s.canvas), N = list.length;
    list.forEach((s, i) => {
      const m = cutout(s.canvas, { opacity: s.alpha });
      const z = ((i / Math.max(1, N - 1)) - .5) * span + (s.z || 0) * span * .2 + (s.word ? span * .22 : 0);
      m.position.set(s.x - W / 2, -(s.y - H / 2), 0); m.rotation.z = -s.rot;
      m.rotation.y = rnd(-.12, .12) * P.depth3d; m.rotation.x = rnd(-.08, .08) * P.depth3d; // a little curl, like real paper
      m.userData.z = z; m.renderOrder = i + 1; group.add(m); pieces.push(m);
    });
  }
  // orbit: drag to turn, scroll to zoom, slow drift when left alone
  const fitDist = (Math.max(H, W * vh / vw) / 2) / Math.tan(T.MathUtils.degToRad(16)) * 1.25;
  let yaw = -.5, pitch = .12, dist = fitDist, dragging = false, lx = 0, ly = 0, lastTouch = 0;
  const el = renderer.domElement;
  const down = e => { dragging = true; lx = e.clientX; ly = e.clientY; lastTouch = performance.now(); el.setPointerCapture && el.setPointerCapture(e.pointerId); };
  const move = e => { if (!dragging) return; yaw -= (e.clientX - lx) * .006; pitch = clamp(pitch + (e.clientY - ly) * .004, -.7, .7); lx = e.clientX; ly = e.clientY; lastTouch = performance.now(); };
  const up = () => { dragging = false; };
  const wheel = e => { e.preventDefault(); dist = clamp(dist * (1 + e.deltaY * .001), fitDist * .35, fitDist * 2.2); lastTouch = performance.now(); };
  const onTilt = e => { if (e.gamma != null && !dragging) { yaw = clamp(e.gamma / 35, -1.2, 1.2); pitch = clamp((e.beta - 45) / 60, -.6, .6); lastTouch = performance.now(); } };
  const onResize = () => { renderer.setSize(window.innerWidth, window.innerHeight); cam.aspect = window.innerWidth / window.innerHeight; cam.updateProjectionMatrix(); };
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', wheel, { passive: false }); window.addEventListener('deviceorientation', onTilt); window.addEventListener('resize', onResize);
  const t0 = performance.now(); let raf, autoOrbit = false;
  const tick = () => {
    const now = performance.now(), t = (now - t0) / 1000, ex = easeOut(clamp((t - .3) / 2.2, 0, 1));
    pieces.forEach(m => { m.position.z = m.userData.z * ex; });
    if (autoOrbit || now - lastTouch > 3500) yaw += .0035; // gentle drift
    const cy = Math.cos(pitch);
    cam.position.set(Math.sin(yaw) * cy * dist, Math.sin(pitch) * dist, Math.cos(yaw) * cy * dist); cam.lookAt(0, 0, 0);
    renderer.render(scene, cam); raf = requestAnimationFrame(tick);
  };
  tick();
  r3 = { renderer, setAuto: v => { autoOrbit = v; }, stop: () => {
    cancelAnimationFrame(raf); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up);
    el.removeEventListener('wheel', wheel); window.removeEventListener('deviceorientation', onTilt); window.removeEventListener('resize', onResize); renderer.dispose();
  } };
  $('view3dNote').textContent = 'drag to turn it · scroll to come closer · tilt your phone';
}
function close3D(keepOpen) { if (r3) { r3.stop(); r3 = null; } if (!keepOpen) { $('view3d').classList.remove('show'); document.body.classList.remove('in3d'); } }
$('flatBtn').onclick = () => close3D();

// ---------- boot ----------
applyShape(); syncAll(); refreshKeyUI(); showIdleTime(); syncMode(); showStep(1);
(function frame() {
  if (highlight && performance.now() > highlight.until) { highlight = null; render(); }
  if (state !== 'done' || anims.length || highlight) render();
  requestAnimationFrame(frame);
})();
loadSources();
window.__vc = { applyPreset, surprise, get P() { return P; }, placeWord, open3D, openArchive, startRemix, allWorks, get history() { return history; } };
