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
  if (k === 'shape') { if (state === 'idle' || state === 'done') { applyShape(); if (state === 'done') clearPieces(); } }
  else if (PAPER_KEYS.includes(k)) paintPaper();
  if (state === 'done') render();
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
    const s = d.querySelector('select'); s.onchange = () => { P[k] = typeof item.options[0] === 'number' ? Number(s.value) : s.value; sync(k, refresh); onParam(k); };
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
  syncAll(); markPreset(name);
}
function surprise() {
  for (const it of ALL_ITEMS) {
    if (['recordVideo', 'pitchHeight', 'langArchive', 'sessionSec', 'sensitivity', 'copyChain'].includes(it.k)) continue;
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
[...GUEST_PRESETS, 'Surprise me'].forEach(n => presetChip(n, $('presetChips')));
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
const openStudio = () => { syncAll(); $('studio').classList.add('show'); };
$('closeStudio').onclick = () => $('studio').classList.remove('show');
$('studio').onclick = e => { if (e.target.id === 'studio') $('studio').classList.remove('show'); };
$('openWall').onclick = () => { $('studio').classList.remove('show'); openWall(); };
let taps = [];
$('noLabel').addEventListener('click', () => { const t = performance.now(); taps = taps.filter(x => t - x < 700); taps.push(t); if (taps.length >= 3) { taps = []; openStudio(); } });
document.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 's' || e.key === 'S') $('studio').classList.contains('show') ? $('studio').classList.remove('show') : openStudio();
  if (e.key === 'w' || e.key === 'W') $('wall').classList.contains('show') ? $('wall').classList.remove('show') : openWall();
  if (e.key === 'Escape') { $('studio').classList.remove('show'); $('wall').classList.remove('show'); close3D(); }
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
  try { await saveToWall(); } catch (e) {}
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
$('saveBtn').onclick = () => { (finalCanvas || exportCanvas()).toBlob(b => shareOrDownload(b, `collage-${pad3(collageNo)}.png`), 'image/png'); };
$('videoBtn').onclick = () => { if (videoBlob) shareOrDownload(videoBlob, `collage-${pad3(collageNo)}.${videoBlob.type.includes('mp4') ? 'mp4' : 'webm'}`); };
$('listenBtn').onclick = () => { listenMode = !listenMode; $('listenBtn').classList.toggle('on', listenMode); $('stage').classList.toggle('listening', listenMode); setStatus(listenMode ? 'tap any piece to hear it' : 'done'); };
$('sculptBtn').onclick = () => open3D();
$('againBtn').onclick = () => {
  collageNo++; $('noLabel').textContent = 'No. ' + pad3(collageNo); close3D(); listenMode = false; $('listenBtn').classList.remove('on'); $('stage').classList.remove('listening');
  if (resetAfter) { P = JSON.parse(JSON.stringify(savedDefaults)); markPreset(null); }
  applyShape(); clearPieces(); syncAll(); setRing(0); setStatus('ready'); showLevel(0); refreshKeyUI();
  state = 'idle'; $('after').classList.remove('show'); $('intro').classList.remove('hidden'); $('controls').classList.remove('hidden');
};
cv.addEventListener('click', ev => {
  if (state !== 'done' || !listenMode) return;
  const r = cv.getBoundingClientRect(), px = (ev.clientX - r.left) * W / r.width, py = (ev.clientY - r.top) * H / r.height;
  for (let i = history.length - 1; i >= 0; i--) {
    const s = history[i], dx = px - s.x, dy = py - s.y, c = Math.cos(-s.rot), sn = Math.sin(-s.rot), lx = dx * c - dy * sn, ly = dx * sn + dy * c;
    if (Math.abs(lx) < s.w / 2 && Math.abs(ly) < s.h / 2) {
      highlight = { rec: s, until: performance.now() + 1600 }; playSlice(s.t);
      setStatus(`▶ ${Math.floor(s.t / 60)}:${String(Math.floor(s.t % 60)).padStart(2, '0')}`); return;
    }
  }
});

// ---------- room wall (every collage tonight, on this device) ----------
function idb() { return new Promise((res, rej) => { const r = indexedDB.open('voice-collage', 1); r.onupgradeneeded = () => r.result.createObjectStore('wall', { keyPath: 'id', autoIncrement: true }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function saveToWall() {
  const t = mk(420, Math.round(420 * H / W)); t.getContext('2d').drawImage(finalCanvas, 0, 0, t.width, t.height);
  const db = await idb(); const tx = db.transaction('wall', 'readwrite');
  tx.objectStore('wall').add({ no: collageNo, img: t.toDataURL('image/jpeg', .82), langs: [...heardLangs.keys()], words: heardWords.slice(0, 40), at: Date.now(), shape: P.shape });
  await new Promise(r => tx.oncomplete = r);
}
async function readWall() { const db = await idb(); return new Promise(res => { const out = []; const c = db.transaction('wall').objectStore('wall').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push(cur.value); cur.continue(); } else res(out); }; }); }
async function openWall() {
  let items = []; try { items = await readWall(); } catch (e) {}
  const since = Date.now() - 1000 * 60 * 60 * 14; const tonight = items.filter(i => i.at > since);
  const langs = new Map(); tonight.forEach(i => (i.langs || []).forEach(l => langs.set(l, (langs.get(l) || 0) + 1)));
  let dn = null; try { dn = new Intl.DisplayNames(['en'], { type: 'language' }); } catch (e) {}
  $('wallMeta').textContent = `${tonight.length} voice${tonight.length === 1 ? '' : 's'} tonight` + (langs.size ? ` · ${[...langs.entries()].sort((a, b) => b[1] - a[1]).map(([l, n]) => `${(dn && dn.of(l)) || l} ${n}`).join(' · ')}` : '');
  $('wallGrid').innerHTML = tonight.slice().reverse().map(i => `<figure><img src="${i.img}" alt="Collage ${i.no}"><figcaption>No. ${pad3(i.no)}${i.words && i.words.length ? ' · “' + i.words.slice(0, 4).join(' ') + '”' : ''}</figcaption></figure>`).join('') || '<p class="note">No collages yet tonight.</p>';
  $('wall').classList.add('show'); $('wallClear').textContent = 'Clear the wall'; $('wallClear').dataset.armed = '';
}
$('wallClose').onclick = () => $('wall').classList.remove('show');
$('wallClear').onclick = async () => {
  if (!$('wallClear').dataset.armed) { $('wallClear').dataset.armed = '1'; $('wallClear').textContent = 'Tap again to delete every collage'; return; }
  const db = await idb(); const tx = db.transaction('wall', 'readwrite'); tx.objectStore('wall').clear(); await new Promise(r => tx.oncomplete = r); openWall();
};

// ---------- 3D sculpture ----------
let three = null, r3 = null;
async function open3D() {
  if (!history.length) return;
  $('view3d').classList.add('show'); $('view3dNote').textContent = 'building the sculpture…';
  try { three = three || await import(new URL('js/vendor/three.module.min.js', location.href).href); }
  catch (e) { try { three = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js'); } catch (e2) { $('view3dNote').textContent = 'Couldn’t load 3D.'; return; } }
  const T = three; close3D(true);
  const host = $('view3dCanvas'), rect = $('stage').getBoundingClientRect();
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(rect.width, rect.height); renderer.outputColorSpace = T.SRGBColorSpace;
  host.innerHTML = ''; host.appendChild(renderer.domElement);
  const scene = new T.Scene(); scene.fog = new T.Fog(new T.Color(P.bg), 2200, 6200);
  const cam = new T.PerspectiveCamera(35, rect.width / rect.height, 1, 20000);
  const span = lerp(80, 1100, P.depth3d), N = history.length, group = new T.Group(); scene.add(group);
  const tex = c => { const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; };
  const paper = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshBasicMaterial({ map: tex(layers.paper), transparent: true }));
  paper.position.z = -span * .6 - 40; group.add(paper);
  const pieces = history.map((s, i) => {
    const m = new T.Mesh(new T.PlaneGeometry(s.canvas.width, s.canvas.height), new T.MeshBasicMaterial({ map: tex(s.canvas), transparent: true, opacity: s.alpha, side: T.DoubleSide, depthWrite: false }));
    const z = ((i / Math.max(1, N - 1)) - .5) * span + (s.z || 0) * span * .25 + (s.word ? span * .18 : 0);
    m.position.set(s.x - W / 2, -(s.y - H / 2), 0); m.rotation.z = -s.rot; m.userData.z = z; m.renderOrder = i + 1; group.add(m); return m;
  });
  const dist = (Math.max(H, W * rect.height / rect.width) / 2) / Math.tan(T.MathUtils.degToRad(17.5)) * 1.5;
  let px = 0, py = 0;
  const onMove = e => { const r = renderer.domElement.getBoundingClientRect(); px = ((e.clientX - r.left) / r.width - .5) * 2; py = ((e.clientY - r.top) / r.height - .5) * 2; };
  const onTilt = e => { if (e.gamma != null) { px = clamp(e.gamma / 30, -1, 1); py = clamp((e.beta - 40) / 30, -1, 1); } };
  renderer.domElement.addEventListener('pointermove', onMove); window.addEventListener('deviceorientation', onTilt);
  const t0 = performance.now(); let raf;
  const tick = () => {
    const t = (performance.now() - t0) / 1000, ex = easeOut(clamp(t / 1.8, 0, 1));
    pieces.forEach(m => { m.position.z = m.userData.z * ex; });
    const a = Math.sin(t * .35) * .55 * ex + px * .35, b = py * .2;
    cam.position.set(Math.sin(a) * dist, Math.sin(b) * dist * .5, Math.cos(a) * dist); cam.lookAt(0, 0, 0);
    renderer.render(scene, cam); raf = requestAnimationFrame(tick);
  };
  tick();
  r3 = { renderer, stop: () => { cancelAnimationFrame(raf); renderer.domElement.removeEventListener('pointermove', onMove); window.removeEventListener('deviceorientation', onTilt); renderer.dispose(); } };
  $('view3dNote').textContent = 'move your mouse or tilt your phone';
}
function close3D(keepOpen) { if (r3) { r3.stop(); r3 = null; } if (!keepOpen) $('view3d').classList.remove('show'); }
$('flatBtn').onclick = () => close3D();
$('turntableBtn').onclick = async () => {
  if (!r3 || typeof MediaRecorder === 'undefined') return;
  const c = r3.renderer.domElement, vm = pickMime(['video/webm;codecs=vp9', 'video/webm', 'video/mp4']);
  const rec = new MediaRecorder(c.captureStream(30), vm ? { mimeType: vm, videoBitsPerSecond: 8e6 } : undefined), ch = [];
  rec.ondataavailable = e => e.data.size && ch.push(e.data);
  $('view3dNote').textContent = 'recording 8 seconds…'; rec.start(250);
  await new Promise(r => setTimeout(r, 8000)); await stopRec(rec);
  shareOrDownload(new Blob(ch, { type: rec.mimeType || 'video/webm' }), `sculpture-${pad3(collageNo)}.${(rec.mimeType || '').includes('mp4') ? 'mp4' : 'webm'}`);
  $('view3dNote').textContent = 'saved · move your mouse or tilt your phone';
};

// ---------- boot ----------
applyShape(); syncAll(); refreshKeyUI();
(function frame() {
  if (highlight && performance.now() > highlight.until) { highlight = null; render(); }
  if (state !== 'done' || anims.length || highlight) render();
  requestAnimationFrame(frame);
})();
loadSources();
window.__vc = { applyPreset, surprise, get P() { return P; }, placeWord, open3D, openWall, get history() { return history; } };
