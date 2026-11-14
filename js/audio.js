// ============================================================
// voice → collage · v4 · listening
// mic/file input · voice features · patch bay · Deepgram words · recording · session flow
// ============================================================
let audioCtx, analyser, buf, fbuf, srcNode, mediaStream, mediaEl, recDest;
let gate = .02, floor = .01, state = 'idle', tStart = 0, sessionMs = 15000, openEnded = false;
const OPEN_CAP_MS = 10 * 60 * 1000; // safety stop for open-ended sessions
function sessionLength() { openEnded = P.sessionSec === 'open'; return openEnded ? OPEN_CAP_MS : (parseInt(P.sessionSec, 10) || 15) * 1000; }
const progressMs = () => openEnded ? Math.min(90000, sessionMs) : sessionMs; // layouts that spread over time use 90 s when open-ended
let runStart = 0, voicedMs = 0, lastSpawn = 0, lastT = 0, pitchHist = [], lastPitch = 180, totalVoiced = 0;
let collageNo = 1; try { collageNo = parseInt(localStorage.getItem('vc_no') || '1', 10) || 1; } catch (e) {}
const F = { volume: 0, pitch: .5, brightness: .5, speed: 0, breath: 0, pause: 0 };
let onsets = [], quietSince = 0, lastLoud = .4;

function rmsOf(b) { let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; return Math.sqrt(s / b.length); }
function pitchOf(b, sr) {
  let SIZE = b.length, r1 = 0, r2 = SIZE - 1; const thres = .2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(b[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(b[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  const x = b.slice(r1, r2); SIZE = x.length; if (SIZE < 256) return -1;
  const minLag = Math.floor(sr / 900), maxLag = Math.min(SIZE - 1, Math.floor(sr / 65)), c = new Float32Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) { let s = 0; for (let i = 0; i < SIZE - lag; i++) s += x[i] * x[i + lag]; c[lag] = s; }
  let d = minLag; while (d < maxLag && c[d] > c[d + 1]) d++;
  let maxv = -1, maxpos = -1; for (let i = d; i <= maxLag; i++) if (c[i] > maxv) { maxv = c[i]; maxpos = i; }
  if (maxpos <= 0 || maxv < c[0] * .3) return -1;
  let T0 = maxpos; const a = c[T0 - 1] || 0, bb = c[T0], cc = c[T0 + 1] || 0, A = (a + cc - 2 * bb) / 2, B = (cc - a) / 2; if (A) T0 -= B / (2 * A);
  return sr / T0;
}
const gateFrom = fl => Math.max(lerp(.03, .006, P.sensitivity), fl * lerp(3.6, 1.7, P.sensitivity));
const loudOf = r => clamp((r - gate) / (lerp(.32, .12, P.sensitivity) - gate), 0, 1);
const pitchNorm = p => clamp((Math.log(p) - Math.log(80)) / (Math.log(500) - Math.log(80)), 0, 1);

function spectral() {
  analyser.getFloatFrequencyData(fbuf);
  const sr = audioCtx.sampleRate, binHz = sr / analyser.fftSize; let num = 0, den = 0, logSum = 0, n = 0;
  for (let i = 2; i < Math.min(fbuf.length, Math.floor(6000 / binHz)); i++) {
    const p = Math.pow(10, fbuf[i] / 10) + 1e-12; num += i * binHz * p; den += p; logSum += Math.log(p); n++;
  }
  const centroid = den ? num / den : 0, flat = n ? Math.exp(logSum / n) / (den / n) : 0;
  return { brightness: clamp((centroid - 300) / 3200, 0, 1), breath: clamp(flat * 3, 0, 1) };
}
function updateFeatures(r, voiced, now) {
  const sm = (k, v, a = .8) => { F[k] = F[k] * a + v * (1 - a); };
  sm('volume', voiced ? loudOf(r) : 0, .6);
  if (voiced) {
    sm('pitch', pitchNorm(lastPitch), .7);
    const sp = spectral(); sm('brightness', sp.brightness); sm('breath', sp.breath);
  }
  onsets = onsets.filter(t => now - t < 3000);
  sm('speed', clamp(onsets.length / 9, 0, 1), .9);
  showFeatures();
}
function mods() {
  const m = {}; for (const t of TARGETS) { let v = 0; for (const f of FEATURES) v += (P.patch[f + '>' + t] || 0) * F[f]; m[t] = v; } return m;
}

// ---------- Deepgram live words ----------
let dgKey = ''; try { dgKey = localStorage.getItem('vc_dg') || ''; } catch (e) {}
let dg = null, dgTap = null, dgMute = null, pcmBuf = [], pcmLen = 0, dgSR = 48000, dgSendTimer = null, dgAudioStart = 0;
let spokenWords = []; // every word Deepgram heard, with wall-clock start/end (ms)
function onPcm(d) { if (!dgAudioStart) dgAudioStart = performance.now() - d.length / dgSR * 1000; pcmBuf.push(d); pcmLen += d.length; }
function setWordsStatus(t) { $('wordsStatus').textContent = t; }
async function dgStart(node) {
  if (!dgKey) return;
  dgSR = audioCtx.sampleRate; pcmBuf = []; pcmLen = 0; dgAudioStart = 0; spokenWords = [];
  const url = 'wss://api.deepgram.com/v1/listen?model=nova-3&language=multi&interim_results=true&endpointing=250&encoding=linear16&sample_rate=16000&channels=1';
  try { dg = new WebSocket(url, ['token', dgKey]); } catch (e) { dg = null; setWordsStatus('words: could not connect'); return; }
  dg.binaryType = 'arraybuffer'; setWordsStatus('words: connecting…');
  dg.onopen = () => setWordsStatus('words: listening');
  dg.onerror = () => setWordsStatus('words: connection failed (check key / wifi)');
  dg.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.type !== 'Results' || !m.is_final) return;
    const alt = m.channel && m.channel.alternatives && m.channel.alternatives[0]; if (!alt) return;
    const fb = (alt.languages && alt.languages[0]) || null;
    for (const w of (alt.words || [])) placeWord(w.punctuated_word || w.word, w.language || fb, w.start, w.end);
  };
  try {
    const code = "class T extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor('pcm-tap',T)";
    if (!audioCtx.__tapLoaded) { await audioCtx.audioWorklet.addModule(URL.createObjectURL(new Blob([code], { type: 'application/javascript' }))); audioCtx.__tapLoaded = true; }
    dgTap = new AudioWorkletNode(audioCtx, 'pcm-tap'); dgTap.port.onmessage = e => onPcm(e.data);
  } catch (e) {
    dgTap = audioCtx.createScriptProcessor(4096, 1, 1);
    dgTap.onaudioprocess = e => onPcm(e.inputBuffer.getChannelData(0).slice(0));
  }
  dgMute = audioCtx.createGain(); dgMute.gain.value = 0;
  node.connect(dgTap); dgTap.connect(dgMute); dgMute.connect(audioCtx.destination);
  dgSendTimer = setInterval(dgFlush, 100);
}
function dgFlush() {
  if (!pcmLen) return;
  if (!dg) { pcmBuf = []; pcmLen = 0; return; }
  if (dg.readyState !== 1) return; // still connecting: keep buffering
  const all = new Float32Array(pcmLen); let o = 0; for (const b of pcmBuf) { all.set(b, o); o += b.length; }
  pcmBuf = []; pcmLen = 0;
  const ratio = dgSR / 16000, n = Math.floor(all.length / ratio), out = new Int16Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.max(-1, Math.min(1, all[Math.floor(i * ratio)])) * 0x7fff;
  dg.send(out.buffer);
}
async function dgStop() {
  if (dgSendTimer) { clearInterval(dgSendTimer); dgSendTimer = null; }
  if (!dg) { try { dgTap && dgTap.disconnect(); dgMute && dgMute.disconnect(); } catch (e) {} return; }
  dgFlush(); const sock = dg; dg = null;
  try { dgTap && dgTap.disconnect(); dgMute && dgMute.disconnect(); } catch (e) {}
  if (sock.readyState === 1) {
    try { sock.send(JSON.stringify({ type: 'CloseStream' })); } catch (e) {}
    await new Promise(r => { const t = setTimeout(r, 1800); sock.addEventListener('close', () => { clearTimeout(t); r(); }); });
  }
  try { sock.close(); } catch (e) {}
}

// ---------- words onto the page ----------
let wordsPlaced = 0, wordRects = [], heardWords = [];
// ---------- the transcript: after the countdown, every captured word flows onto the page in reading order ----------
let transcriptQueue = [], tFlow = null;
let liveFlusher = null;
function planTranscript(expected) {
  const b = bounds(), words = expected ? Array.from({ length: expected }, () => 'words') : transcriptQueue.map(w => w.text);
  const face = P.mode === 'paint' ? (P.typeface !== 'mixed' ? (TYPEFACES[P.typeface] || TYPEFACES.hand).join('|') : '|"Marker Felt", "Chalkboard SE", "Bradley Hand", cursive') : null;
  const widthOf = (t, size) => P.mode === 'paint' ? paintWordWidth(t, size, face) : t.length * size * .74 + size * .5;
  // the biggest size at which everything said fits on the page (with room for late words)
  let size = lerp(46, 110, P.wordSize);
  for (let k = 0; k < 14; k++) {
    let x = 0, lines = 1; const lineW = b.w - 80;
    for (const t of words.concat(['…', '…', '…'])) { const w = widthOf(t, size) + size * .35; if (x + w > lineW) { lines++; x = 0; } x += w; }
    if (lines * size * 1.55 <= b.h * .86) break; size *= .88;
  }
  const lines = []; tFlow = { size, face, x: b.x0 + 40, y: 0, lineH: size * 1.55, b, widthOf };
  return tFlow;
}
function flowNextWord() {
  const w = transcriptQueue.shift(); if (!w) return false;
  const f = tFlow, b = f.b;
  const s = P.mode === 'paint' ? null : makeWord(w.text, f.size);
  const ww = s ? s.w - 30 : f.widthOf(w.text, f.size); // a cut-out word's canvas has 15px of margin each side
  if (f.x + ww > b.x1 - 40 && f.x > b.x0 + 40) { f.x = b.x0 + 40 + rnd(0, f.size * .6); f.y += f.lineH; }
  if (f.y === 0) f.y = b.y0 + f.size * 1.1;
  if (f.y > b.y1 - f.size * .4) { f.y = b.y0 + f.size * (1.1 + rnd(.3, .7)); f.x = b.x0 + 40 + rnd(0, f.size * 2); } // page full: keep writing, layered on top
  const y = f.y + rnd(-.12, .12) * f.size;
  if (s) pushPiece(s, f.x + ww / 2, y, rnd(-.05, .05) * (1 + P.tilt * 2), { word: true, t: recTime(), a0: w.a0, a1: w.a1, text: w.text });
  else paintWordJob(w.text, w.lang, w.a0, w.a1, { x: f.x, y, size: f.size, face: f.face });
  f.x += ww + f.size * .35;
  return true;
}
function startLiveWords() {
  clearInterval(liveFlusher); liveFlusher = null;
  if (P.wordsWhen !== 'flowing') return;
  const expected = openEnded ? 90 : Math.round(sessionMs / 1000 * 2.2); // about 2.2 words a second
  planTranscript(expected);
  liveFlusher = setInterval(() => { if (state === 'listening') flowNextWord(); }, 110);
}
async function writeTranscript(dgDone) {
  if (P.wordsWhen === 'scattered') return dgDone;
  if (P.wordsWhen === 'flowing') { clearInterval(liveFlusher); liveFlusher = null; if (!tFlow) planTranscript(); setStatus('Time’s up — the last words are still landing…'); }
  else { planTranscript(); setStatus('Time’s up — writing what you said onto the page…'); }
  let finished = false; dgDone.then(() => { finished = true; });
  const gap = lerp(260, 90, P.settle);
  while (!finished || transcriptQueue.length) {
    if (!flowNextWord()) await new Promise(r => setTimeout(r, 60)); else await new Promise(r => setTimeout(r, gap));
  }
}
const heardLangs = new Map();
function placeWord(text, lang, start, end) {
  text = (text || '').trim(); if (!text) return;
  let a0 = 0, a1 = 0;
  if (dgAudioStart && start != null && end != null) { a0 = dgAudioStart + start * 1000; a1 = dgAudioStart + Math.max(end, start + .12) * 1000; spokenWords.push({ text, a0, a1 }); }
  if (lang) { const base = lang.split('-')[0]; heardLangs.set(base, (heardLangs.get(base) || 0) + 1); currentLang = base; }
  heardWords.push(text); $('heard').textContent = '“' + text + '”';
  if (state !== 'listening' && state !== 'settling') return;
  if (P.wordsWhen !== 'scattered') { transcriptQueue.push({ text, lang, a0, a1 }); return; } // 'flowing' writes them as they come; 'after' holds them
  if (P.mode === 'paint') { if (wordsPlaced < 40) { paintWordJob(text, lang, a0, a1); wordsPlaced++; } return; }
  if (wordsPlaced >= Math.round(lerp(6, 36, P.wordsVsImages))) return;
  if (Math.random() > clamp(P.wordsVsImages * 2.2, 0, 1)) return;
  const m = mods();
  const size = lerp(lerp(26, 62, P.wordSize), lerp(56, 150, P.wordSize), lastLoud) * (wordsPlaced > 14 ? .82 : 1) * clamp(1 + m.size, .4, 2.2);
  const s = makeWord(text, size, m);
  const b = bounds();
  if (s.w > b.w * .95) { const k = (b.w * .95) / s.w, c2 = mk(s.w * k, s.h * k); c2.getContext('2d').drawImage(s.canvas, 0, 0, c2.width, c2.height); s.canvas = c2; s.w = c2.width; s.h = c2.height; }
  const anchor = positionFor(s.w, s.h, F.pitch, F.volume, clamp((performance.now() - tStart) / progressMs(), 0, 1)); scrapIdx--;
  let best = null, bestO = Infinity;
  for (let k = 0; k < 14; k++) {
    const cx = clamp(anchor.x + rnd(-260, 260), b.x0 + s.w / 2, b.x1 - s.w / 2), cy = clamp(anchor.y + rnd(-280, 280), b.y0 + s.h / 2, b.y1 - s.h / 2);
    let o = 0;
    for (const r of wordRects) { const ix = Math.max(0, Math.min(cx + s.w / 2, r.x + r.w / 2) - Math.max(cx - s.w / 2, r.x - r.w / 2)); const iy = Math.max(0, Math.min(cy + s.h / 2, r.y + r.h / 2) - Math.max(cy - s.h / 2, r.y - r.h / 2)); o += ix * iy; }
    o += Math.hypot(cx - anchor.x, cy - anchor.y) * 2;
    if (o < bestO) { bestO = o; best = [cx, cy]; }
  }
  const [x, y] = best; wordRects.push({ x, y, w: s.w * .8, h: s.h * .7 });
  const wr = lerp(.02, .3, Math.max(P.tilt, P.scatter * .8));
  pushPiece(s, x + m.drift * 200, y, rnd(-wr, wr) + m.tilt * .5, { word: true, alpha: clamp(1 - Math.max(0, m.fade) * .75, .25, 1), z: 1 + m.depth, t: recTime(), a0, a1, text });
  wordsPlaced++;
}
function langNames() {
  const codes = [...heardLangs.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  let dn = null; try { dn = new Intl.DisplayNames(['en'], { type: 'language' }); } catch (e) {}
  return codes.slice(0, 3).map(c => (dn && dn.of(c)) || c);
}

// ---------- paper from the voice ----------
function spawnFrom(r, held, now) {
  const loud = loudOf(r), m = mods();
  const interval = lerp(230, 95, loud) * lerp(2.6, .45, P.density);
  if (now - lastSpawn < interval) return;
  lastSpawn = now;
  if (held > 650) return;
  if (Math.random() > clamp((1 - P.wordsVsImages) * 2.2, .06, 1)) return;
  const pn = P.pitchHeight ? F.pitch : Math.random();
  const cap = Math.round(lerp(40, 160, P.density));
  let area = lerp(70 * 70, 430 * 430, Math.pow(loud, .8)) * lerp(.75, 1.05, P.density) * (history.length > cap ? .55 : 1) * clamp(1 + m.size, .3, 2.5);
  let aspect = P.scrapShape === 'strip' ? rnd(3, 6) : rnd(.55, 1.8);
  if (P.scrapShape === 'circle') aspect = 1;
  let w = Math.sqrt(area * aspect), h = area / w;
  if (P.layoutMode === 'grid') { const b = bounds(), cols = Math.round(lerp(3, 7, P.density)); w = b.w / cols * rnd(.85, 1.1); h = w / aspect; }
  const pos = positionFor(w, h, pn, loud, clamp((now - tStart) / progressMs(), 0, 1));
  const tr = lerp(.01, .55, P.tilt);
  const s = makeScrap(w, h, lerp(.18, .92, pn), m);
  pushPiece(s, pos.x + m.drift * 300, pos.y, rnd(-tr, tr) + m.tilt * .6, { alpha: clamp(1 - Math.max(0, m.fade) * .75, .2, 1), z: loud + m.depth, t: recTime() });
}
function placeStrip(held) {
  if (P.wordsVsImages > .9 && Math.random() < .7) return;
  const m = mods(), pn = P.pitchHeight ? F.pitch : Math.random(), b = bounds();
  const len = clamp(lerp(380, 1150, (held - 650) / 2600), 300, b.w * .95), th = rnd(46, 92), tr = lerp(.03, .6, P.tilt);
  const pos = positionFor(len, th, pn, F.volume, clamp((performance.now() - tStart) / progressMs(), 0, 1));
  const prevShape = P.scrapShape; if (prevShape === 'circle' || prevShape === 'triangle') P.scrapShape = 'rect';
  const s = makeScrap(len, th, lerp(.2, .9, pn), m); P.scrapShape = prevShape;
  pushPiece(s, pos.x, pos.y, rnd(-tr, tr) + m.tilt * .6, { z: .5 + m.depth, t: recTime() });
}

// ---------- recording (stop-motion video + audio for listen mode) ----------
let videoRec = null, audioRec = null, videoChunks = [], audioChunks = [], recStart = 0, videoBlob = null, audioBuffer = null;
const recTime = () => recStart ? (performance.now() - recStart) / 1000 : 0;
function pickMime(list) { for (const m of list) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {} } return ''; }
function startRecording() {
  videoBlob = null; audioBuffer = null; videoChunks = []; audioChunks = []; recStart = performance.now();
  if (typeof MediaRecorder === 'undefined') return;
  try {
    const am = pickMime(['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']);
    audioRec = new MediaRecorder(recDest.stream, am ? { mimeType: am } : undefined);
    audioRec.ondataavailable = e => e.data.size && audioChunks.push(e.data); audioRec.start(250);
  } catch (e) { audioRec = null; }
  if (P.recordVideo && cv.captureStream) {
    try {
      const vs = cv.captureStream(30), ms = new MediaStream([...vs.getVideoTracks(), ...recDest.stream.getAudioTracks()]);
      const vm = pickMime(['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']);
      videoRec = new MediaRecorder(ms, vm ? { mimeType: vm, videoBitsPerSecond: 6e6 } : undefined);
      videoRec.ondataavailable = e => e.data.size && videoChunks.push(e.data); videoRec.start(250);
    } catch (e) { videoRec = null; }
  }
}
const stopRec = rec => new Promise(res => { if (!rec || rec.state === 'inactive') return res(); rec.onstop = res; try { rec.stop(); } catch (e) { res(); } });
async function stopAudioRecording() {
  await stopRec(audioRec);
  if (audioChunks.length) { try { audioBuffer = await audioCtx.decodeAudioData(await new Blob(audioChunks, { type: audioRec.mimeType }).arrayBuffer()); } catch (e) { audioBuffer = null; } }
  audioRec = null;
}
async function stopVideoRecording() {
  await stopRec(videoRec);
  if (videoChunks.length) videoBlob = new Blob(videoChunks, { type: videoRec.mimeType || 'video/webm' });
  videoRec = null;
}
let playing = null;
function playRange(t0, t1) { // seconds within the recording
  if (!audioBuffer) return false;
  try { playing && playing.stop(); } catch (e) {}
  const src = audioCtx.createBufferSource(); src.buffer = audioBuffer; src.connect(audioCtx.destination);
  const s = clamp(t0, 0, audioBuffer.duration - .05); src.start(0, s, clamp(t1 - t0, .12, 3)); playing = src; return true;
}
// a word's own sound: Deepgram's word timing mapped onto our recording's clock
function playWord(w) { return playRange((w.a0 - recStart) / 1000 - .07, (w.a1 - recStart) / 1000 + .1); }

// ---------- session flow ----------
async function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  analyser = audioCtx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0;
  buf = new Float32Array(analyser.fftSize); fbuf = new Float32Array(analyser.frequencyBinCount);
  recDest = audioCtx.createMediaStreamDestination();
}
async function startMic() {
  $('msg').textContent = '';
  try {
    await ensureAudio();
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false } });
  } catch (e) { $('msg').textContent = 'The microphone isn’t available. Allow mic access in the browser, or use a voice recording.'; return; }
  srcNode = audioCtx.createMediaStreamSource(mediaStream); srcNode.connect(analyser); srcNode.connect(recDest);
  await dgStart(srcNode);
  sessionMs = sessionLength();
  begin(true);
}
async function startFile(file) {
  $('msg').textContent = '';
  await ensureAudio();
  if (mediaEl) { mediaEl.pause(); mediaEl.remove(); }
  mediaEl = document.createElement('video'); mediaEl.src = URL.createObjectURL(file); mediaEl.playsInline = true; mediaEl.setAttribute('playsinline', '');
  mediaEl.style.display = 'none'; document.body.appendChild(mediaEl);
  srcNode = audioCtx.createMediaElementSource(mediaEl); srcNode.connect(analyser); analyser.connect(audioCtx.destination); srcNode.connect(recDest);
  await dgStart(srcNode);
  try { await mediaEl.play(); } catch (e) { $('msg').textContent = 'Couldn’t play that file. Try another recording.'; return; }
  openEnded = false; sessionMs = Math.min(isFinite(mediaEl.duration) ? mediaEl.duration * 1000 : 20000, 120000);
  mediaEl.onended = () => finish();
  $('voiceHint').textContent = '· the recording is playing';
  begin(false);
}
function begin(calibrate) {
  clearPieces(); resetLayout(); seedShape(); prepareGhost(); drawRemixBase();
  wordsPlaced = 0; wordRects = []; heardWords = []; transcriptQueue = []; tFlow = null; clearInterval(liveFlusher); liveFlusher = null; heardLangs.clear(); currentLang = null; totalVoiced = 0; onsets = []; $('heard').textContent = '';
  for (const k in F) F[k] = k === 'pitch' || k === 'brightness' ? .5 : 0;
  $('intro').classList.add('hidden'); $('after').classList.remove('show'); $('controls').classList.add('hidden');
  document.body.classList.add('immersive', 'im-live'); document.body.classList.remove('im-done'); setTimeout(() => window.dispatchEvent(new Event('resize')), 950);
  floor = .008; gate = .02;
  if (calibrate) {
    state = 'calibrating'; $('hud').classList.remove('idle'); $('voiceHint').textContent = P.mode === 'paint' ? '· speak past the red line to paint' : '· speak past the red line to tear paper'; setStatus('Stay quiet for a second — measuring the room…'); const samples = [], t0 = performance.now();
    const cal = () => {
      analyser.getFloatTimeDomainData(buf); samples.push(rmsOf(buf)); showLevel(samples[samples.length - 1]);
      if (performance.now() - t0 < 1200) return requestAnimationFrame(cal);
      samples.sort((a, b) => a - b); floor = samples[Math.floor(samples.length * .6)] || .008; gate = gateFrom(floor); go();
    };
    cal();
  } else go();
}
function go() {
  state = 'listening'; tStart = performance.now(); lastT = tStart; runStart = 0; voicedMs = 0; lastSpawn = 0; quietSince = tStart;
  $('hud').classList.remove('idle'); startRecording(); startLiveWords(); setStatus(speakPrompt()); $('finishBtn').classList.add('show'); $('qBanner').classList.toggle('show', !!$('qBanner').textContent); loop();
}
function setStatus(s) { $('status').textContent = s; }
const fmtSec = s => `${Math.floor(s / 60)}:${String(Math.max(0, Math.ceil(s) % 60)).padStart(2, '0')}`;
function speakPrompt() { return openEnded ? 'Speak now — take as long as you like. Press Finish when you’re done.' : `Speak now — you have ${Math.round(sessionMs / 1000)} seconds.`; }
function setRing(f) { // time left (or time so far, when open-ended): number, bar and the badge on the canvas
  if (openEnded) {
    const el = state === 'listening' ? (performance.now() - tStart) / 1000 : 0, m = Math.floor(el / 60), sec = Math.floor(el % 60);
    $('timeLabel').textContent = 'Time'; $('timeLeft').textContent = `${m}:${String(sec).padStart(2, '0')}`; $('timeFill').style.width = '100%';
    const cd = $('countdown'); cd.textContent = `${m}:${String(sec).padStart(2, '0')}`; cd.classList.toggle('show', state === 'listening'); cd.classList.remove('low');
    return;
  }
  $('timeLabel').textContent = 'Time left';
  const left = Math.max(0, sessionMs / 1000 * (1 - clamp(f, 0, 1))), secs = Math.ceil(left);
  $('timeLeft').textContent = `0:${String(secs).padStart(2, '0')}`;
  $('timeFill').style.width = (100 * (1 - clamp(f, 0, 1))) + '%';
  const cd = $('countdown'); cd.textContent = secs + 's';
  cd.classList.toggle('show', state === 'listening'); cd.classList.toggle('low', state === 'listening' && secs <= 3);
}
function showIdleTime() { sessionMs = sessionLength(); setRing(0); $('countdown').classList.remove('show'); }
function showLevel(r) { const l = $('lvl'); l.style.width = (clamp(r / .25, 0, 1) * 100) + '%'; l.className = r > gate ? 'over' : 'under'; $('gateMark').style.left = (clamp(gate / .25, 0, 1) * 100) + '%'; }
function loop() {
  if (state !== 'listening') return;
  const now = performance.now(), dt = now - lastT; lastT = now;
  analyser.getFloatTimeDomainData(buf);
  const r = rmsOf(buf); showLevel(r);
  if (r < gate) { floor = floor * .995 + r * .005; gate = gateFrom(floor); }
  const voiced = r > gate;
  lastLoud = lastLoud * .9 + loudOf(r) * .1;
  if (voiced) {
    const p = pitchOf(buf, audioCtx.sampleRate);
    if (p > 65 && p < 900) { pitchHist.push(p); if (pitchHist.length > 7) pitchHist.shift(); }
    const sorted = [...pitchHist].sort((a, b) => a - b); if (sorted.length) lastPitch = sorted[Math.floor(sorted.length / 2)];
    if (!runStart) { runStart = now; onsets.push(now); F.pause = clamp((now - quietSince) / 1500, 0, 1); }
    voicedMs = now - runStart; totalVoiced += dt;
    updateFeatures(r, true, now);
    if (P.mode === 'paint') { paintFrom(r, true, voicedMs, now, dt); setStatus('Painting…'); } else { spawnFrom(r, voicedMs, now); setStatus('Tearing paper…'); }
  } else {
    if (P.mode === 'paint') paintFrom(r, false, 0, now, dt);
    else if (runStart && voicedMs > 650) placeStrip(voicedMs);
    if (runStart) quietSince = now;
    runStart = 0; voicedMs = 0; updateFeatures(r, false, now); setStatus(now - tStart < 2500 ? speakPrompt() : openEnded ? 'Listening… take your time. Press Finish when you’re done.' : 'Listening… keep talking, or press Finish.');
  }
  const f = (now - tStart) / sessionMs; setRing(f);
  if (f >= 1) return finish();
  requestAnimationFrame(loop);
}
async function finish() {
  if (state !== 'listening') return;
  state = 'settling'; setStatus(openEnded ? 'Finishing — letting the paint settle…' : 'Time’s up — gluing everything down…'); if (!openEnded) setRing(1); $('countdown').classList.remove('show'); $('finishBtn').classList.remove('show'); $('qBanner').classList.remove('show');
  if (mediaEl) mediaEl.pause();
  const dgDone = dgStop(); // late words keep arriving while the transcript is written
  try { srcNode && srcNode.disconnect(); analyser && analyser.disconnect(); } catch (e) {}
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  await stopAudioRecording();
  await writeTranscript(dgDone); await dgDone;
  if (P.mode === 'paint') {
    if (strokeNow && !strokeNow.ended) endStroke();
    const t0 = performance.now(); while ((paintJobs.length || (strokeNow && strokeNow.drawn < strokeNow.pts.length)) && performance.now() - t0 < 5000) await new Promise(r => setTimeout(r, 60));
  } else if (!history.length) { const b = bounds(); pushPiece(makeScrap(260, 180, .7), b.cx, b.cy, rnd(-.1, .1)); }
  await new Promise(r => setTimeout(r, Math.max(700, lerp(1000, 250, P.settle))));
  for (const s of anims) commitPiece(s); anims = [];
  drawStampsAndStains(layers.decor.getContext('2d'));
  await drawCaption();
  await new Promise(r => setTimeout(r, 1300)); // hold the final frame in the video
  await stopVideoRecording();
  state = 'done'; document.body.classList.remove('im-live'); if (document.body.classList.contains('immersive')) document.body.classList.add('im-done');
  setStatus(P.mode === 'paint' ? 'Done. Drag on the canvas to smear the wet paint, listen back, or open it in 3D.' : 'Done. Drag any piece to move it (scroll to turn it), listen back, or open it in 3D.'); showLevel(0); if (!openEnded) setRing(1); $('countdown').classList.remove('show'); $('hud').classList.add('idle');
  await afterCollage();
}
let captionInfo = null, artistName = '';
async function drawCaption() {
  try { await document.fonts.load('22px "IBM Plex Mono"'); } catch (e) {}
  const secs = Math.round(totalVoiced / 1000), L = langNames();
  captionInfo = { no: collageNo, secs, langs: L, date: new Date(), after: remixFrom ? { no: remixFrom.no, name: remixFrom.name } : null };
  redrawCaption();
}
function captionLines() {
  const ci = captionInfo; if (!ci) return ['', ''];
  const by = artistName ? ` — ${artistName}` : '', after = ci.after ? `, after No. ${pad3(ci.after.no)}${ci.after.name ? ' by ' + ci.after.name : ''}` : '';
  const spoken = `${ci.langs.length ? 'Spoken in ' + ci.langs.join(', ') + ',' : 'Spoken'} ${Math.floor(ci.secs / 60)}:${String(ci.secs % 60).padStart(2, '0')}`;
  return [`No. ${pad3(ci.no)}${by}${after}`, `${spoken}.  San Francisco. ${ci.date.getFullYear()}.`];
}
function redrawCaption() {
  const ci = captionInfo; if (!ci) return;
  const [l1, l2] = captionLines(); const lab = $('pieceLabel'); if (lab) { lab.innerHTML = `<b></b><span></span>`; lab.querySelector('b').textContent = l1; lab.querySelector('span').textContent = l2; lab.style.display = ''; }
  const g = layers.caption.getContext('2d'); g.clearRect(0, 0, W, H);
  const by = artistName ? ` — ${artistName}` : '', after = ci.after ? `, after No. ${pad3(ci.after.no)}${ci.after.name ? ' by ' + ci.after.name : ''}` : '';
  const spoken = `${ci.langs.length ? 'Spoken in ' + ci.langs.join(', ') + ',' : 'Spoken'} ${Math.floor(ci.secs / 60)}:${String(ci.secs % 60).padStart(2, '0')}`;
  if (P.shape === 'polaroid') {
    captionText = `no. ${pad3(ci.no)}${artistName ? ' · ' + artistName.toLowerCase() : ''}${ci.after ? ' · after no. ' + pad3(ci.after.no) : ''} — ${ci.langs.length ? ci.langs.join(' & ').toLowerCase() : 'a voice'}, ${ci.date.getMonth() + 1}/${ci.date.getDate()}`;
    return;
  }
  const line1 = `No. ${pad3(ci.no)}${by}${after}`, line2 = `${spoken}.  San Francisco. ${ci.date.getFullYear()}.`;
  const dark = isDark(P.bg);
  g.save(); g.font = '22px "IBM Plex Mono", ui-monospace, monospace';
  const tw = Math.max(g.measureText(line1).width, g.measureText(line2).width), lw = Math.min(tw + 44, W - 40), lh = 86;
  let lx = W - lw - 56, ly = H - lh - 44;
  if (P.shape === 'circle' || P.shape === 'blob') { lx = (W - lw) / 2; ly = H * .78; }
  if (P.shape === 'filmstrip') { lx = (W - lw) / 2; ly = H - lh - 60; }
  g.translate(lx + lw / 2, ly + lh / 2); g.rotate(-.012);
  g.shadowColor = 'rgba(40,30,15,.25)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
  g.fillStyle = dark ? '#f4f1ea' : '#fbf9f3'; g.fillRect(-lw / 2, -lh / 2, lw, lh); g.shadowColor = 'transparent';
  g.fillStyle = '#141414'; g.textBaseline = 'middle';
  g.fillText(line1, -lw / 2 + 22, -16, lw - 44); g.fillStyle = '#4a4740'; g.fillText(line2, -lw / 2 + 22, 18, lw - 44);
  g.restore();
}
