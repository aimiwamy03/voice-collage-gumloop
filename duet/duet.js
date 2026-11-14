// duet — two voices, one painting.
// Each voice paints in its own family of colour. Talking over each other scrapes through to a hidden photo;
// holding the floor covers what the other left; shared silence lets the paint settle.
'use strict';
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const W = 1600, H = 1200;

const QUESTIONS = [
  'Tell each other about a moment you were both there for — each from your own side.',
  'What is something you have never said to the person next to you?',
  'Describe the room you grew up in. Take turns adding one thing at a time.',
  'What are you each afraid the other has noticed about you?',
  'Argue gently: which is harder to forgive, forgetting or lying?',
  'Each of you: what did you want to be, before anyone asked?',
  'Describe the same colour to each other until you agree on it.',
  'What would you say to each other if this were the last time you met?',
  'Tell each other a dream you had — interrupt whenever it sounds like yours.',
  'Where were you both, ten years ago today? Guess for each other first.',
];

// palettes: A warm earths, B cool blues and greens
const PAL = {
  A: ['#b8432a', '#d0812f', '#8e2f21', '#e0a640', '#a3532f', '#6e2a1c', '#d76a4a'],
  B: ['#2f4f8f', '#1f6f6a', '#203a64', '#4f7fae', '#2d5a45', '#17304f', '#6a8fb8'],
};
const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgbStr = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// ---------- canvas layers ----------
const cv = $('cv'), out = cv.getContext('2d');
const under = mk(W, H), paint = mk(W, H), grain = mk(W, H);
const ug = under.getContext('2d'), pg = paint.getContext('2d', { willReadFrequently: true });
(function makeGrain() {
  const g = grain.getContext('2d'), d = g.createImageData(W, H);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 14; }
  g.putImageData(d, 0, 0);
  // linen weave
  g.globalAlpha = .05; g.strokeStyle = '#000';
  for (let y = 0; y < H; y += 3) { g.beginPath(); g.moveTo(0, y + rnd(-.4, .4)); g.lineTo(W, y + rnd(-.4, .4)); g.stroke(); }
  for (let x = 0; x < W; x += 3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
})();

const srcList = Object.values(window.SOURCES || {});
function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
async function prepareSurface() {
  // the hidden picture: one image from the archive, cover-fit, slightly darkened
  ug.fillStyle = '#2a2622'; ug.fillRect(0, 0, W, H);
  const img = srcList.length ? await loadImg('../' + srcList[Math.floor(Math.random() * srcList.length)]) : null;
  if (img) { const s = Math.max(W / img.width, H / img.height); ug.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s); }
  ug.fillStyle = 'rgba(30,22,16,.12)'; ug.fillRect(0, 0, W, H);
  // the ground conceals it completely
  pg.globalCompositeOperation = 'source-over';
  pg.fillStyle = '#ebe5d8'; pg.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { pg.fillStyle = `rgba(${rnd(200, 240)},${rnd(190, 228)},${rnd(170, 210)},.12)`; pg.fillRect(rnd(0, W), rnd(0, H), rnd(30, 180), rnd(4, 20)); }
}
function composite() {
  out.globalCompositeOperation = 'source-over';
  out.drawImage(under, 0, 0); out.drawImage(paint, 0, 0);
  out.globalCompositeOperation = 'multiply'; out.drawImage(grain, 0, 0); out.globalCompositeOperation = 'source-over';
}

// ---------- brushes ----------
// each bristle keeps its own offset and tint for a whole run, and is drawn opaque, so a stroke reads as one continuous drag
function newBrush() { const n = 16; return Array.from({ length: n }, (_, i) => ({ o: (i / (n - 1) - .5) + rnd(-.03, .03), j: rnd(-18, 18), w: rnd(2, 3.2), dry: Math.abs(i / (n - 1) - .5) > .3 ? rnd(0, 1) : 0 })); }
function bristles(ctx, x0, y0, x1, y1, width, rgb, brush, load) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const b of brush) {
    if (b.dry > load) continue; // as the brush runs out, outer bristles skip: dry-brush edges
    const o = b.o * width;
    ctx.strokeStyle = rgbStr([rgb[0] + b.j, rgb[1] + b.j, rgb[2] + b.j], 1);
    ctx.lineWidth = width / brush.length * b.w;
    ctx.beginPath(); ctx.moveTo(x0 + nx * o, y0 + ny * o); ctx.lineTo(x1 + nx * o, y1 + ny * o); ctx.stroke();
  }
}
function reveal(ctx, x0, y0, x1, y1, width) { // scrape through the paint and the ground to the hidden picture
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.lineCap = 'round';
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  for (let i = 0; i < 6; i++) {
    const o = rnd(-.5, .5) * width; ctx.lineWidth = rnd(.12, .4) * width; ctx.strokeStyle = `rgba(0,0,0,${rnd(.5, 1)})`;
    ctx.beginPath(); ctx.moveTo(x0 + nx * o, y0 + ny * o); ctx.lineTo(x1 + nx * o, y1 + ny * o); ctx.stroke();
  }
  ctx.restore();
}
function knife(ctx, x, y, ang, len, width) { // an interruption: one long scrape
  let px = x - Math.cos(ang) * len / 2, py = y - Math.sin(ang) * len / 2;
  const steps = 18;
  for (let i = 0; i < steps; i++) {
    const a = ang + rnd(-.08, .08), nx = px + Math.cos(a) * len / steps, ny = py + Math.sin(a) * len / steps;
    reveal(ctx, px, py, nx, ny, width * (1 - Math.abs(i / steps - .5)));
    px = nx; py = ny;
  }
}
function sample(x, y) { try { const d = pg.getImageData(clamp(x | 0, 0, W - 1), clamp(y | 0, 0, H - 1), 1, 1).data; return d[3] > 20 ? [d[0], d[1], d[2]] : null; } catch (e) { return null; } }

// ---------- voices ----------
function newVoice(id) {
  return {
    id, x: id === 'A' ? W * .3 : W * .7, y: H * rnd(.35, .65), ang: rnd(0, Math.PI * 2),
    active: false, runStart: 0, lastActive: -1e9, held: 0, rms: 0, pitch: 0, bright: .5,
    rgb: hexRgb(PAL[id][0]), pIdx: 0,
  };
}
let V = { A: newVoice('A'), B: newVoice('B') };
const other = id => (id === 'A' ? V.B : V.A);

// ---------- audio ----------
let mode = 'voice', lengthSec = 60;
try { mode = localStorage.getItem('duet_mode') || 'voice'; lengthSec = parseInt(localStorage.getItem('duet_len') || '60', 10); } catch (e) {}
let ctxA = null, stream = null, srcNode = null, anL = null, anR = null, anM = null, tap = null;
const bufL = new Float32Array(2048), bufR = new Float32Array(2048), spec = new Float32Array(1024);
let floorL = .006, floorR = .006;

function rmsOf(b) { let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; return Math.sqrt(s / b.length); }
function pitchOf(b, sr) { // autocorrelation, 70–420 Hz
  const minL = Math.floor(sr / 420), maxL = Math.floor(sr / 70), n = 1024; let best = 0, bl = 0;
  for (let l = minL; l < maxL; l++) { let c = 0; for (let i = 0; i < n; i++) c += b[i] * b[i + l]; if (c > best) { best = c; bl = l; } }
  let e = 0; for (let i = 0; i < n; i++) e += b[i] * b[i];
  return best / (e || 1) > .45 && bl ? sr / bl : 0;
}
function brightOf(an) {
  an.getFloatFrequencyData(spec); let num = 0, den = 0;
  for (let i = 2; i < spec.length; i++) { const m = Math.pow(10, spec[i] / 20); num += i * m; den += m; }
  return den ? clamp(num / den / 160, 0, 1) : .5;
}

async function startAudio() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: { ideal: mode === 'stereo' ? 2 : 1 }, echoCancellation: false, noiseSuppression: mode !== 'stereo', autoGainControl: false } });
  ctxA = new (window.AudioContext || window.webkitAudioContext)(); await ctxA.resume();
  srcNode = ctxA.createMediaStreamSource(stream);
  const mkAn = () => { const a = ctxA.createAnalyser(); a.fftSize = 2048; a.smoothingTimeConstant = .3; return a; };
  if (mode === 'stereo') {
    const sp = ctxA.createChannelSplitter(2); srcNode.connect(sp); anL = mkAn(); anR = mkAn(); sp.connect(anL, 0); sp.connect(anR, 1);
  } else { anM = mkAn(); srcNode.connect(anM); }
  // quiet room first
  const t0 = performance.now(), sl = [], sr = [];
  while (performance.now() - t0 < 1100) {
    await new Promise(r => setTimeout(r, 40));
    if (mode === 'stereo') { anL.getFloatTimeDomainData(bufL); anR.getFloatTimeDomainData(bufR); sl.push(rmsOf(bufL)); sr.push(rmsOf(bufR)); }
    else { anM.getFloatTimeDomainData(bufL); sl.push(rmsOf(bufL)); }
  }
  const med = a => a.length ? a.sort((x, y) => x - y)[Math.floor(a.length * .6)] : .006;
  floorL = med(sl); floorR = mode === 'stereo' ? med(sr) : floorL;
}
const gateOf = f => Math.max(f * 3.2, .012);

// one-mic attribution: two pitch centroids, decided per voiced run (and re-decided if the voice clearly changes)
const VC = { A: null, B: null, run: null, samples: [], quiet: 0, label: null, since: 0 };
function voiceLabel(on, pitch, now) {
  // Speech pitch wanders a lot (a question rises almost an octave), so: decide at the start of each run,
  // and only switch voices mid-run when the difference holds for more than a second.
  if (!on) { if (now - (VC.lastOn || 0) > 350) { VC.label = null; VC.samples = []; VC.away = 0; } return null; }
  VC.lastOn = now;
  if (pitch) { VC.samples.push(Math.log2(pitch)); if (VC.samples.length > 40) VC.samples.shift(); }
  const a = VC.samples.slice(-24).sort((x, y) => x - y), m = a.length ? a[a.length >> 1] : null;
  const pick = p => {
    if (VC.A == null) return 'A';
    if (VC.B == null) return Math.abs(p - VC.A) > .4 && VC.nA > 40 ? 'B' : 'A';
    return Math.abs(p - VC.A) <= Math.abs(p - VC.B) ? 'A' : 'B';
  };
  if (!VC.label) { if (m == null || VC.samples.length < 14) return null; VC.label = pick(m); VC.since = now; VC.away = 0; }
  else if (m != null && VC.samples.length >= 18) {
    const n = pick(m), margin = VC.B == null ? Math.abs(m - VC.A) - .4 : Math.abs(Math.abs(m - VC.A) - Math.abs(m - VC.B));
    if (n !== VC.label && margin > .15) { VC.away = VC.away || now; if (now - VC.away > 1200) { VC.label = n; VC.since = now; VC.away = 0; VC.samples = VC.samples.slice(-10); } }
    else VC.away = 0;
  }
  if (m != null && !VC.away && now - VC.since > 250) { // learn each voice only from settled stretches
    if (VC.label === 'A') { VC.A = VC.A == null ? m : lerp(VC.A, m, .02); VC.nA = (VC.nA || 0) + 1; }
    else VC.B = VC.B == null ? m : lerp(VC.B, m, .02);
  }
  return VC.label;
}
let turn = 'A';

// label timeline for matching transcript words to voices
const timeline = []; // [t, 'A'|'B'|'AB'|'']
function labelAt(t) { let lo = 0, hi = timeline.length - 1, best = ''; while (lo <= hi) { const m = (lo + hi) >> 1; if (timeline[m][0] <= t) { best = timeline[m][1]; lo = m + 1; } else hi = m - 1; } return best; }

// ---------- Deepgram (optional: words) ----------
let dgKey = ''; try { dgKey = localStorage.getItem('vc_dg') || ''; } catch (e) {}
let ws = null, wsOpen = false, pending = [], dgStart = 0, dgDone = null, dgResolve = null;
const dgMapVotes = {}; // diarized speaker → votes for A/B
async function startDeepgram() {
  if (!dgKey) return;
  const ch = mode === 'stereo' ? 2 : 1;
  const q = `model=nova-3&language=multi&punctuate=true&smart_format=true&endpointing=300&encoding=linear16&sample_rate=16000&channels=${ch}` + (ch === 2 ? '&multichannel=true' : '') + (mode === 'voice' ? '&diarize=true' : '');
  try { ws = new WebSocket('wss://api.deepgram.com/v1/listen?' + q, ['token', dgKey]); } catch (e) { return; }
  ws.binaryType = 'arraybuffer';
  ws.onopen = () => { wsOpen = true; for (const p of pending) ws.send(p); pending = []; };
  ws.onmessage = e => { try { onResult(JSON.parse(e.data)); } catch (x) {} };
  ws.onclose = () => { wsOpen = false; if (dgResolve) dgResolve(); };
  ws.onerror = () => {};
  dgDone = new Promise(r => { dgResolve = r; });
  const code = "class T extends AudioWorkletProcessor{process(i){const a=i[0];if(a&&a[0])this.port.postMessage([a[0].slice(0),(a[1]||a[0]).slice(0)]);return true}}registerProcessor('duet-tap',T)";
  const ratio = ctxA.sampleRate / 16000; let carry = [[], []];
  const onChunk = e => {
    if (!dgStart) dgStart = performance.now();
    const chans = e.data.slice(0, ch).map((d, k) => { const a = carry[k].concat(Array.from(d)), n = Math.floor(a.length / ratio), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = a[Math.floor(i * ratio)]; carry[k] = a.slice(Math.floor(n * ratio)); return o; });
    const n = chans[0].length, pcm = new Int16Array(n * ch);
    for (let i = 0; i < n; i++) for (let k = 0; k < ch; k++) pcm[i * ch + k] = clamp(chans[k][i] || 0, -1, 1) * 32767;
    if (wsOpen) ws.send(pcm.buffer); else if (ws && ws.readyState === 0) pending.push(pcm.buffer);
  };
  const interp = mode === 'stereo' ? 'discrete' : 'speakers';
  try {
    await Promise.race([ctxA.audioWorklet.addModule(URL.createObjectURL(new Blob([code], { type: 'application/javascript' }))), new Promise((_, rej) => setTimeout(() => rej(new Error('worklet timeout')), 2000))]);
    tap = new AudioWorkletNode(ctxA, 'duet-tap', { channelCount: 2, channelCountMode: 'explicit', channelInterpretation: interp });
    tap.port.onmessage = onChunk;
  } catch (e) { // older engines: a script processor does the same job
    tap = ctxA.createScriptProcessor(4096, 2, 2); tap.channelCountMode = 'explicit'; tap.channelInterpretation = interp;
    tap.onaudioprocess = ev => onChunk({ data: [ev.inputBuffer.getChannelData(0).slice(0), ev.inputBuffer.getChannelData(ev.inputBuffer.numberOfChannels > 1 ? 1 : 0).slice(0)] });
  }
  const mute = ctxA.createGain(); mute.gain.value = 0;
  srcNode.connect(tap); tap.connect(mute); mute.connect(ctxA.destination);
}
function stopDeepgram() {
  if (tap) { try { srcNode.disconnect(tap); } catch (e) {} tap = null; }
  if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify({ type: 'CloseStream' })); } catch (e) {} }
  return Promise.race([dgDone || Promise.resolve(), new Promise(r => setTimeout(r, 3500))]);
}
const heard = []; const langs = new Set();
function onResult(m) {
  if (m.type !== 'Results' || !m.is_final) return;
  const alt = m.channel && m.channel.alternatives && m.channel.alternatives[0]; if (!alt || !alt.words) return;
  for (const w of alt.words) {
    const t = dgStart + (w.start || 0) * 1000; let who;
    if (mode === 'stereo' && m.channel_index) who = m.channel_index[0] === 0 ? 'A' : 'B';
    else {
      const l = labelAt(t); const live = l === 'AB' ? null : l || null;
      if (mode === 'voice' && w.speaker != null) {
        const v = dgMapVotes[w.speaker] || (dgMapVotes[w.speaker] = { A: 0, B: 0 }); if (live) v[live]++;
        who = v.A === v.B ? (live || (w.speaker % 2 ? 'B' : 'A')) : (v.A > v.B ? 'A' : 'B');
      } else who = live || turn;
    }
    if (w.language) langs.add(w.language);
    heard.push({ who, word: w.punctuated_word || w.word });
    paintWord(who, w.punctuated_word || w.word);
  }
}

// ---------- marks ----------
function paintWord(who, text) {
  const v = V[who], size = clamp(30 + v.rms * 420, 30, 64);
  const x = clamp(v.x + rnd(-80, 80), 40, W - 260), y = clamp(v.y + rnd(-70, 70), 60, H - 40), rot = rnd(-.12, .12);
  const base = hexRgb(PAL[who][who === 'A' ? 5 : 4]);
  pg.save(); pg.translate(x, y); pg.rotate(rot); pg.font = `italic ${size | 0}px Georgia, 'Times New Roman', serif`;
  for (let k = 0; k < 4; k++) { pg.fillStyle = rgbStr(base, .5); pg.fillText(text, rnd(-1.5, 1.5), rnd(-1.5, 1.5)); }
  // drag the wet letters a little: streaks of the ground through them
  const w = pg.measureText(text).width; pg.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 5; k++) { pg.fillStyle = `rgba(0,0,0,${rnd(.15, .4)})`; pg.fillRect(rnd(0, w * .6), -size * rnd(.1, .8), rnd(w * .2, w * .7), rnd(1, 2.5)); }
  pg.restore(); lastV[who] = performance.now();
}
const lastV = { A: 0, B: 0 };
let evTimer = null;
function event(text) { const e = $('event'); e.textContent = text; e.classList.add('show'); clearTimeout(evTimer); evTimer = setTimeout(() => e.classList.remove('show'), 1800); }

function moveVoice(v, dt, now, overlapping) {
  const o = other(v.id), held = v.active ? (now - v.runStart) / 1000 : 0;
  v.ang += rnd(-.22, .22) + (v.pitch ? (Math.log2(v.pitch) - 7.5) * .02 : 0);
  // drift home to your half, but toward each other when you overlap
  const hx = overlapping ? o.x : (v.id === 'A' ? W * .33 : W * .67), hy = overlapping ? o.y : H * .5;
  const want = Math.atan2(hy - v.y, hx - v.x); let d = want - v.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); v.ang += d * (overlapping ? .12 : .025);
  const speed = (1.2 + v.rms * 90) * dt / 16;
  v.x += Math.cos(v.ang) * speed; v.y += Math.sin(v.ang) * speed;
  if (v.x < 40 || v.x > W - 40) { v.ang = Math.PI - v.ang; v.x = clamp(v.x, 40, W - 40); }
  if (v.y < 40 || v.y > H - 40) { v.ang = -v.ang; v.y = clamp(v.y, 40, H - 40); }
  return held;
}
let lastSettle = 0, silentSince = 0;
function paintFrame(now, dt) {
  const overlapping = V.A.active && V.B.active;
  for (const id of ['A', 'B']) {
    const v = V[id]; if (!v.active) continue;
    const x0 = v.x, y0 = v.y, held = moveVoice(v, dt, now, overlapping);
    // colour from the voice: brightness picks the pigment, pitch shades it
    const pal = PAL[id], idx = clamp(Math.floor(v.bright * pal.length), 0, pal.length - 1);
    const target = hexRgb(pal[idx]); const shade = v.pitch ? clamp((Math.log2(v.pitch) - 7.4) * 30, -40, 40) : 0;
    v.rgb = v.rgb.map((c, k) => lerp(c, target[k] + shade, .08));
    let rgb = v.rgb, width = 26 + v.rms * 520;
    if (held > 6) { width *= Math.min(2.4, 1 + (held - 6) * .12); } // holding the floor: the brush widens and covers
    if (overlapping) { // wet into wet: pick up what's under the brush
      const s = sample(v.x, v.y); if (s) rgb = rgb.map((c, k) => lerp(c, s[k], .45));
    }
    if (!v.brush) v.brush = newBrush();
    v.load = Math.max(.35, (v.load == null ? 1 : v.load) - dt / 9000); // paint runs out over a long stroke…
    bristles(pg, x0, y0, v.x, v.y, width, rgb, v.brush, held > 6 ? 1 : v.load);
    if (overlapping) reveal(pg, x0, y0, v.x, v.y, width * .5); // talking over each other scrapes through
  }
  // shared silence: the paint settles — a thin veil of ground colour, the marks sink back a little
  const anyone = V.A.active || V.B.active;
  if (anyone) silentSince = now;
  else if (now - silentSince > 3000 && now - lastSettle > 120 && running) {
    lastSettle = now; pg.fillStyle = 'rgba(235,229,216,.018)'; pg.fillRect(0, 0, W, H);
    if (now - silentSince < 3200) event('a shared silence — the paint settles');
  }
}

function setActive(id, on, now, feats) {
  const v = V[id]; Object.assign(v, feats);
  if (on && !v.active && now - v.lastActive > 300) { // a new run (short breaths don't count)
    v.runStart = now; v.floorSaid = false; v.brush = newBrush(); v.load = 1; const o = other(v.id); // …and each new breath reloads it
    if ((o.active || now - o.lastActive < 400) && now - o.runStart > 700) { // an interruption
      knife(pg, (v.x + o.x) / 2, (v.y + o.y) / 2, rnd(0, Math.PI), rnd(380, 700), rnd(40, 80));
      event((names[id] || (id === 'A' ? 'the first voice' : 'the second voice')) + ' interrupts — something shows through');
    }
  }
  if (on) { v.lastActive = now; if (!v.floorSaid && now - v.runStart > 6000) { v.floorSaid = true; event((names[id] || (id === 'A' ? 'the first voice' : 'the second voice')) + ' holds the floor — covering'); } }
  v.active = on;
}

// ---------- session ----------
let holdL = -1e9, holdR = -1e9, running = false, done = false, tStart = 0, raf = 0, lastT = 0, names = { A: '', B: '' }, question = '';
function analyse(now) {
  const sr = ctxA.sampleRate;
  if (mode === 'stereo') {
    anL.getFloatTimeDomainData(bufL); anR.getFloatTimeDomainData(bufR);
    const l = rmsOf(bufL), r = rmsOf(bufR), gl = gateOf(floorL), gr = gateOf(floorR);
    if (l > gl && l > r * .55) holdL = now; if (r > gr && r > l * .55) holdR = now;
    const onA = now - holdL < 260, onB = now - holdR < 260;
    setActive('A', onA, now, { rms: l, pitch: onA ? pitchOf(bufL, sr) : 0, bright: onA ? brightOf(anL) : V.A.bright });
    setActive('B', onB, now, { rms: r, pitch: onB ? pitchOf(bufR, sr) : 0, bright: onB ? brightOf(anR) : V.B.bright });
    return onA && onB ? 'AB' : onA ? 'A' : onB ? 'B' : '';
  }
  anM.getFloatTimeDomainData(bufL);
  const m = rmsOf(bufL), on = m > gateOf(floorL), p = on ? pitchOf(bufL, sr) : 0, b = on ? brightOf(anM) : .5;
  const who = mode === 'turns' ? (on ? turn : null) : voiceLabel(on, p, now);
  for (const id of ['A', 'B']) setActive(id, who === id, now, who === id ? { rms: m, pitch: p, bright: b } : { rms: 0 });
  return who || '';
}
function tick() {
  const now = performance.now(), dt = Math.min(50, now - lastT); lastT = now;
  if (running) {
    const lab = analyse(now);
    if (!timeline.length || timeline[timeline.length - 1][1] !== lab) timeline.push([now, lab]);
    paintFrame(now, dt);
    $('whoA').classList.toggle('active', V.A.active); $('whoB').classList.toggle('active', V.B.active);
    const el = (now - tStart) / 1000, left = lengthSec ? Math.max(0, lengthSec - el) : el;
    $('clock').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    if ((lengthSec && el >= lengthSec) || el > 600) finish();
  }
  composite();
  raf = requestAnimationFrame(tick);
}

let starting = false;
async function begin() {
  if (running || starting) return; starting = true; document.activeElement && document.activeElement.blur();
  try { await beginInner(); } finally { starting = false; }
}
async function beginInner() {
  names = { A: $('nameA').value.trim(), B: $('nameB').value.trim() };
  $('labA').textContent = names.A || 'first voice'; $('labB').textContent = names.B || 'second voice';
  $('qLive').textContent = question;
  await prepareSurface();
  V = { A: newVoice('A'), B: newVoice('B') }; Object.assign(VC, { A: null, B: null, nA: 0, samples: [], label: null, lastOn: 0 }); timeline.length = 0; heard.length = 0; langs.clear(); turn = 'A';
  $('start').classList.add('gone'); document.body.classList.toggle('turns', mode === 'turns');
  event('stay quiet for a moment — listening to the room');
  try { await startAudio(); } catch (e) { $('start').classList.remove('gone'); $('modeHint').textContent = 'The microphone isn’t available: ' + e.message; return; }
  await startDeepgram();
  if (mode === 'stereo') checkStereo();
  running = true; done = false; tStart = performance.now(); silentSince = tStart; document.body.classList.add('running'); document.body.classList.remove('done');
  event(mode === 'turns' ? 'begin — press space to pass the turn' : 'begin');
}
function checkStereo() { // if both channels are identical, it's really one mic
  let same = 0, n = 0; const t = setInterval(() => {
    if (!running) return clearInterval(t);
    anL.getFloatTimeDomainData(bufL); anR.getFloatTimeDomainData(bufR); const l = rmsOf(bufL), r = rmsOf(bufR);
    if (l > gateOf(floorL) || r > gateOf(floorR)) { n++; let d = 0; for (let i = 0; i < 512; i++) d += Math.abs(bufL[i] - bufR[i]); if (d / 512 < l * .02 || r < 1e-5 || l < 1e-5) same++; }
    if (n >= 25) { clearInterval(t); if (same / n > .8) event('only one mic detected — choose “one mic” next time'); }
  }, 120);
}
async function finish() {
  if (!running) return; running = false; document.body.classList.remove('running');
  event('finishing the words…');
  await stopDeepgram();
  if (stream) stream.getTracks().forEach(t => t.stop()); try { await ctxA.close(); } catch (e) {}
  done = true; document.body.classList.add('done'); V.A.active = V.B.active = false; $('whoA').classList.remove('active'); $('whoB').classList.remove('active');
  composite(); await saveToArchive();
}
// pieces join the main archive (and the 3D gallery, where a duet gets two visitors)
function idb() { return new Promise((res, rej) => { const r = indexedDB.open('voice-collage', 2); r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('wall')) db.createObjectStore('wall', { keyPath: 'id', autoIncrement: true }); if (!db.objectStoreNames.contains('works')) db.createObjectStore('works', { keyPath: 'id', autoIncrement: true }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function saveToArchive() {
  try {
    let no = 1; try { no = parseInt(localStorage.getItem('vc_no') || '1', 10) || 1; localStorage.setItem('vc_no', String(no + 1)); } catch (e) {}
    const t = mk(480, 360); t.getContext('2d').drawImage(cv, 0, 0, 480, 360);
    const img = await new Promise(r => cv.toBlob(r, 'image/jpeg', .9));
    const nm = [names.A, names.B].filter(Boolean).join(' & ');
    const db = await idb(); const tx = db.transaction('works', 'readwrite');
    tx.objectStore('works').add({ no, name: nm, names: [names.A, names.B], at: Date.now(), mode: 'duet', shape: 'landscape', question, img, thumb: t.toDataURL('image/jpeg', .82), video: null, words: heard.map(h => h.word), voices: heard, langs: [...langs], params: { duetMode: mode } });
    await new Promise(r => { tx.oncomplete = r; tx.onerror = r; });
    event(`No. ${String(no).padStart(3, '0')} — saved to the archive`);
  } catch (e) { console.warn(e); }
}

// ---------- start card ----------
let qi = Math.floor(Math.random() * QUESTIONS.length);
function showQ() { question = QUESTIONS[qi % QUESTIONS.length]; $('q').textContent = question; }
$('nextQ').onclick = () => { qi++; showQ(); };
const HINT = {
  stereo: 'Most reliable. One clip-on mic each, on a receiver set to stereo (e.g. DJI Mic Mini: one transmitter per person → left / right). Overlaps are detected for real.',
  voice: 'One shared mic. The piece tells you apart by the pitch of your voices, and Deepgram labels the words by speaker. Works best with different-sounding voices; talking at the same time reads as an interruption.',
  turns: 'One shared mic, no guessing: press space (or tap the painting) to pass the turn. Good for a test, or for voices that sound alike.',
};
function syncSeg() {
  document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
  document.querySelectorAll('#lenSeg button').forEach(b => b.classList.toggle('on', Number(b.dataset.s) === lengthSec));
  $('modeHint').textContent = HINT[mode];
  $('keyBtn').textContent = dgKey ? 'words: on' : 'words: off — add key';
}
document.querySelectorAll('#modeSeg button').forEach(b => b.onclick = () => { mode = b.dataset.m; try { localStorage.setItem('duet_mode', mode); } catch (e) {} syncSeg(); });
document.querySelectorAll('#lenSeg button').forEach(b => b.onclick = () => { lengthSec = Number(b.dataset.s); try { localStorage.setItem('duet_len', String(lengthSec)); } catch (e) {} syncSeg(); });
$('keyBtn').onclick = () => $('keyRow').classList.toggle('show');
$('keySave').onclick = () => { dgKey = $('keyIn').value.trim(); try { localStorage.setItem('vc_dg', dgKey); } catch (e) {} $('keyIn').value = ''; $('keyRow').classList.remove('show'); syncSeg(); };
$('go').onclick = () => begin();
$('finish').onclick = () => finish();
const passTurn = () => { if (running && mode === 'turns') { turn = turn === 'A' ? 'B' : 'A'; event('over to ' + (names[turn] || (turn === 'A' ? 'the first voice' : 'the second voice'))); } };
cv.addEventListener('pointerdown', passTurn);
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); passTurn(); }
  if (e.key === 'Enter' && running) { e.preventDefault(); finish(); }
});
$('save').onclick = () => cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `duet-${Date.now()}.png`; a.click(); }, 'image/png');
$('again').onclick = () => { document.body.classList.remove('done'); qi++; showQ(); $('start').classList.remove('gone'); };

showQ(); syncSeg();
prepareSurface().then(() => { lastT = performance.now(); tick(); });
window.__duet = { VC, get V() { return V; }, get mode() { return mode; }, timeline, heard, get running() { return running; } };
