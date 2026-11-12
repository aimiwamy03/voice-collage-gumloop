// ============================================================
// voice → collage · v4 · drawing engine
// canvas shape & paper · sources · scraps · words · layout · attachments · effects
// ============================================================
const cv = $('cv');
const ctx = cv.getContext('2d');
let W = 1200, H = 1500;
const SHAPES = {
  portrait: [1200, 1500], square: [1200, 1200], landscape: [1200, 900], scroll: [1200, 2100], postcard: [1200, 800],
  circle: [1200, 1200], arch: [1200, 1500], blob: [1200, 1200], filmstrip: [1200, 1600], polaroid: [1200, 1420],
};
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const layers = {};
let sctx, wctx, gctx;
let blobPts = [];
let leakSeed = [], streakSeed = [];

function makeGrain(w, h, amt) {
  const c = mk(w, h), g = c.getContext('2d'), id = g.createImageData(w, h);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (Math.random() - .5) * amt; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return c;
}
const grain = makeGrain(300, 300, 60);
const grainHeavy = makeGrain(256, 256, 140);

function applyShape() {
  const [w, h] = SHAPES[P.shape] || SHAPES.portrait;
  W = w; H = h; cv.width = W; cv.height = H;
  for (const k of ['paper', 'settled', 'words', 'ghost']) layers[k] = mk(W, H);
  sctx = layers.settled.getContext('2d'); wctx = layers.words.getContext('2d'); gctx = layers.ghost.getContext('2d');
  $('stage').style.aspectRatio = `${W} / ${H}`;
  seedShape(); paintPaper();
}
function seedShape() {
  const n = 14, r0 = Math.min(W, H) / 2 * .92; blobPts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = r0 * rnd(.8, 1); blobPts.push([W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r]); }
  leakSeed = [0, 1].map(() => ({ x: rnd() < .5 ? rnd(-.1, .2) * W : rnd(.8, 1.1) * W, y: rnd(0, 1) * H, r: rnd(.35, .7) * W, c: ['255,120,40', '255,60,60', '255,190,90'][Math.floor(rnd(3))] }));
  streakSeed = Array.from({ length: 9 }, () => ({ x: rnd(W), w: rnd(1, 4), a: rnd(.3, 1) }));
}
function shapePath(g) {
  g.beginPath();
  if (P.shape === 'circle') g.ellipse(W / 2, H / 2, W / 2 - 6, H / 2 - 6, 0, 0, Math.PI * 2);
  else if (P.shape === 'arch') { g.moveTo(6, H - 6); g.lineTo(6, W / 2); g.arc(W / 2, W / 2, W / 2 - 6, Math.PI, 0); g.lineTo(W - 6, H - 6); g.closePath(); }
  else if (P.shape === 'blob') {
    const p = blobPts, n = p.length; const mid = i => [(p[i][0] + p[(i + 1) % n][0]) / 2, (p[i][1] + p[(i + 1) % n][1]) / 2];
    let m = mid(n - 1); g.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) { const q = mid(i); g.quadraticCurveTo(p[i][0], p[i][1], q[0], q[1]); }
    g.closePath();
  } else g.rect(0, 0, W, H);
}
// where scraps may land
function bounds() {
  let x0 = 0, y0 = 0, x1 = W, y1 = H - 110;
  if (P.shape === 'filmstrip') { x0 = 150; x1 = W - 150; y0 = 40; y1 = H - 40; }
  else if (P.shape === 'polaroid') { x0 = 70; y0 = 70; x1 = W - 70; y1 = H - 270; }
  else if (P.shape === 'circle' || P.shape === 'blob') { const i = Math.min(W, H) * .17; x0 = i; y0 = i; x1 = W - i; y1 = H - i; }
  else if (P.shape === 'arch') { y0 = W * .22; }
  const m = P.frame * 110; x0 += m; y0 += m; x1 -= m; y1 -= m * (P.shape === 'polaroid' || P.shape === 'filmstrip' ? 1 : .3);
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

function paintPaper() {
  const g = layers.paper.getContext('2d'), bg = P.bg, dark = isDark(bg);
  g.clearRect(0, 0, W, H); g.save(); shapePath(g); g.clip();
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const line = dark ? 'rgba(255,255,255,' : 'rgba(30,40,60,';
  if (P.texture === 'grain' || P.texture === 'cardboard' || P.texture === 'tracing') {
    g.globalAlpha = P.texture === 'cardboard' ? .16 : (dark ? .05 : .07);
    g.globalCompositeOperation = dark ? 'screen' : 'multiply';
    for (let y = 0; y < H; y += 300) for (let x = 0; x < W; x += 300) g.drawImage(grain, x, y);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  if (P.texture === 'linen') { // canvas weave
    for (let y = 0; y < H; y += 3) { g.fillStyle = `rgba(${dark ? '255,255,255' : '60,45,25'},${rnd(.03, .09)})`; g.fillRect(0, y, W, 1); }
    for (let x = 0; x < W; x += 3) { g.fillStyle = `rgba(${dark ? '255,255,255' : '60,45,25'},${rnd(.02, .07)})`; g.fillRect(x, 0, 1, H); }
    g.globalAlpha = dark ? .06 : .1; g.globalCompositeOperation = dark ? 'screen' : 'multiply';
    for (let y = 0; y < H; y += 300) for (let x = 0; x < W; x += 300) g.drawImage(grain, x, y);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  if (P.texture === 'cardboard') {
    g.strokeStyle = 'rgba(90,60,30,.12)'; g.lineWidth = 1;
    for (let i = 0; i < 700; i++) { const x = rnd(W), y = rnd(H), a = rnd(Math.PI), l = rnd(4, 16); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  }
  if (P.texture === 'graph') {
    for (let x = 0; x < W; x += 40) { g.strokeStyle = line + (x % 200 === 0 ? '.28)' : '.12)'); g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, H); g.stroke(); }
    for (let y = 0; y < H; y += 40) { g.strokeStyle = line + (y % 200 === 0 ? '.28)' : '.12)'); g.beginPath(); g.moveTo(0, y + .5); g.lineTo(W, y + .5); g.stroke(); }
  }
  if (P.texture === 'lined') {
    g.strokeStyle = line + '.16)'; g.lineWidth = 2;
    for (let y = 150; y < H; y += 58) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = 'rgba(200,40,40,.25)'; g.beginPath(); g.moveTo(130, 0); g.lineTo(130, H); g.stroke();
  }
  if (P.texture === 'tracing') {
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, W, H);
    const fx = W * rnd(.35, .65); const grd = g.createLinearGradient(fx - 30, 0, fx + 30, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(.5, 'rgba(0,0,0,.07)'); grd.addColorStop(.52, 'rgba(255,255,255,.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(fx - 30, 0, 60, H);
  }
  if (P.vignette > 0) {
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .8);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(40,28,10,${P.vignette * .35})`);
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  g.restore();
}

// ---------- sources (Aimi's archive) ----------
const sources = [];
let currentLang = null;
async function loadSources() {
  await Promise.all(Object.entries(SOURCES).map(([name, url]) => new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const mw = 48, mh = Math.max(4, Math.round(48 * img.height / img.width));
      const c = mk(mw, mh), g = c.getContext('2d'); g.drawImage(img, 0, 0, mw, mh);
      const d = g.getImageData(0, 0, mw, mh).data, lum = new Float32Array(mw * mh); let satSum = 0;
      for (let i = 0; i < mw * mh; i++) {
        const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2];
        lum[i] = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
        const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); satSum += mx ? (mx - mn) / mx : 0;
      }
      sources.push({ name, img, lum, mw, mh, sat: satSum / (mw * mh), series: seriesOf(name), weight: 1 });
      res();
    };
    img.onerror = res; img.src = url;
  })));
}
function activeSources() {
  if (P.langArchive && currentLang) {
    const px = (P.langMap[currentLang] || P.langMap.other || '').split(',').map(s => s.trim()).filter(Boolean);
    const lp = sources.filter(s => px.some(p => s.name.startsWith(p)));
    if (lp.length) return lp;
  }
  const on = P.series && P.series.length ? sources.filter(s => P.series.includes(s.series)) : sources;
  return on.length ? on : sources;
}
function sourceWeight(s) {
  const bw = s.sat < .12 ? 1 : 0;
  return s.weight * (1 + (1 - P.color) * 4 * bw + P.color * 2.5 * Math.min(1, s.sat * 2.5));
}
function pickSource() {
  const pool = activeSources(); if (!pool.length) return null;
  const total = pool.reduce((a, x) => a + sourceWeight(x), 0); let r = Math.random() * total;
  for (const s of pool) { if ((r -= sourceWeight(s)) <= 0) return s; } return pool[0];
}
function cropLum(s, x, y, w, h) {
  const x0 = Math.floor(x / s.img.width * s.mw), y0 = Math.floor(y / s.img.height * s.mh);
  const x1 = Math.max(x0 + 1, Math.ceil((x + w) / s.img.width * s.mw)), y1 = Math.max(y0 + 1, Math.ceil((y + h) / s.img.height * s.mh));
  let sum = 0, n = 0;
  for (let j = y0; j < Math.min(y1, s.mh); j++) for (let i = x0; i < Math.min(x1, s.mw); i++) { sum += s.lum[j * s.mw + i]; n++; }
  return n ? sum / n : .5;
}
function pickCrop(aspect, targetLum) {
  let best = null, bestD = 1e9;
  const big = lerp(.75, .14, P.zoom), small = big * .35;
  for (let k = 0; k < 10; k++) {
    const s = pickSource(); if (!s) return null;
    const maxW = s.img.width, maxH = s.img.height;
    let cw = rnd(small, big) * maxW, ch = cw / aspect;
    if (ch > maxH * .95) { ch = maxH * rnd(.4, .95); cw = ch * aspect; }
    cw = Math.min(cw, maxW); ch = Math.min(ch, maxH);
    const cx = rnd(0, maxW - cw), cy = rnd(0, maxH - ch);
    const d = Math.abs(cropLum(s, cx, cy, cw, ch) - targetLum) + Math.random() * .08;
    if (d < bestD) { bestD = d; best = { s, cx, cy, cw, ch }; }
  }
  return best;
}

// ---------- outlines & edges ----------
function baseOutline(shape, w, h) {
  if (shape === 'triangle') return [[w * rnd(.25, .75), 0], [w, h], [0, h]];
  if (shape === 'circle' || shape === 'blob') {
    const n = 34, pts = []; let wob = 1;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      if (shape === 'blob') wob = clamp(wob * .65 + rnd(.62, 1.12) * .35, .7, 1.08);
      pts.push([w / 2 + Math.cos(a) * w / 2 * wob, h / 2 + Math.sin(a) * h / 2 * wob]);
    }
    return pts;
  }
  const j = (v, a) => v + rnd(-a, a);
  return [[j(0, w * .02), j(0, h * .02)], [j(w, w * .02), j(0, h * .02)], [j(w, w * .02), j(h, h * .02)], [j(0, w * .02), j(h, h * .02)]];
}
function edgeOutline(base) {
  const style = P.edgeStyle, curved = base.length > 4;
  const step = style === 'deckle' ? 3 : style === 'zigzag' ? 9 : 7;
  const amp = style === 'torn' ? lerp(2.5, 8, P.edge) : style === 'deckle' ? 2.2 : style === 'zigzag' ? 5 : .4;
  const allTorn = curved && Math.random() < P.edge;
  let pts = [], flip = 1;
  for (let i = 0; i < base.length; i++) {
    const a = base[i], b = base[(i + 1) % base.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, n = Math.max(1, Math.round(len / step));
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    const active = style !== 'torn' || (curved ? allTorn : Math.random() < P.edge);
    let walk = 0;
    for (let k = 0; k < n; k++) {
      const t = k / n; let off = rnd(-.4, .4);
      if (active) {
        if (style === 'torn') { walk = walk * .6 + rnd(-1, 1) * amp; off = walk + rnd(-amp * .3, amp * .3); }
        else if (style === 'deckle') off = rnd(-amp, amp);
        else if (style === 'zigzag') { off = amp * flip; flip = -flip; }
      }
      pts.push([lerp(a[0], b[0], t) + nx * off, lerp(a[1], b[1], t) + ny * off]);
    }
  }
  return pts;
}
function pathPoly(g, pts, dx = 0, dy = 0, sc = 1, cx = 0, cy = 0) {
  g.beginPath();
  pts.forEach(([x, y], i) => { const X = cx + (x - cx) * sc + dx, Y = cy + (y - cy) * sc + dy; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
  g.closePath();
}

// ---------- image treatments ----------
function getLum(id) { const d = id.data, L = new Float32Array(d.length / 4); for (let i = 0; i < L.length; i++) L[i] = (.299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2]) / 255; return L; }
function treat(t, w, h) {
  const g = t.getContext('2d'); if (P.treatment === 'photo') return;
  let id; try { id = g.getImageData(0, 0, w, h); } catch (e) { return; }
  const d = id.data, L = getLum(id), A = hexToRgb(P.duoA), Bc = hexToRgb(P.duoB);
  if (P.treatment === 'duotone') {
    for (let i = 0; i < L.length; i++) { const l = L[i]; d[i * 4] = A[0] + (Bc[0] - A[0]) * l; d[i * 4 + 1] = A[1] + (Bc[1] - A[1]) * l; d[i * 4 + 2] = A[2] + (Bc[2] - A[2]) * l; }
    g.putImageData(id, 0, 0);
  } else if (P.treatment === 'photocopy') {
    for (let i = 0; i < L.length; i++) {
      let v = L[i]; v = v < .45 ? v * .35 : .55 + (v - .45) * .8; v = clamp(v + (Math.random() < .004 ? -.8 : 0), 0, 1) * 255;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    }
    g.putImageData(id, 0, 0);
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k < 3; k++) g.fillRect(rnd(w), 0, rnd(1, 3), h);
  } else if (P.treatment === 'halftone') {
    const cell = Math.max(6, Math.round(w / 42));
    g.fillStyle = '#f6f2e8'; g.fillRect(0, 0, w, h); g.fillStyle = P.duoA;
    for (let y = 0; y < h; y += cell) for (let x = (y / cell) % 2 ? cell / 2 : 0; x < w; x += cell) {
      const l = L[Math.min(h - 1, Math.floor(y + cell / 2)) * w + Math.min(w - 1, Math.floor(x + cell / 2))];
      const r = cell * .5 * Math.sqrt(1 - l) * 1.15; if (r > .4) { g.beginPath(); g.arc(x + cell / 2, y + cell / 2, r, 0, Math.PI * 2); g.fill(); }
    }
  } else if (P.treatment === 'riso') {
    const la = mk(w, h), lb = mk(w, h), ga = la.getContext('2d'), gb = lb.getContext('2d');
    const ia = ga.createImageData(w, h), ib = gb.createImageData(w, h);
    for (let i = 0; i < L.length; i++) {
      const l = L[i], aA = Math.pow(1 - l, 1.25), aB = clamp(1.6 * (.8 - l) * (l + .2), 0, 1);
      ia.data.set([A[0], A[1], A[2], aA * 255], i * 4); ib.data.set([Bc[0], Bc[1], Bc[2], aB * 230], i * 4);
    }
    ga.putImageData(ia, 0, 0); gb.putImageData(ib, 0, 0);
    g.fillStyle = '#f6f1e7'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'multiply'; g.drawImage(lb, rnd(-3, 3), rnd(-3, 3)); g.drawImage(la, 0, 0);
    g.globalAlpha = .25; g.drawImage(grainHeavy, 0, 0, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
}
function filterString(mods = {}) {
  const sat = P.color < .5 ? P.color * 2 : 1;
  const parts = [];
  if (sat < .999) parts.push(`saturate(${sat.toFixed(2)})`);
  const c = lerp(.75, 1.6, P.contrast) * (sat < .5 ? 1.08 : 1); if (Math.abs(c - 1) > .02) parts.push(`contrast(${c.toFixed(2)})`);
  const b = P.blur * 5 + Math.max(0, mods.blur || 0) * 6; if (b > .2) parts.push(`blur(${b.toFixed(1)}px)`);
  if (mods.hue) parts.push(`hue-rotate(${Math.round(mods.hue * 180)}deg)`);
  if (P.invert) parts.push('invert(1)');
  return parts.join(' ') || 'none';
}
// a photo crop, filtered + treated, as its own canvas
function photoTile(w, h, targetLum, mods) {
  const t = mk(w, h), g = t.getContext('2d');
  g.fillStyle = '#efe9dd'; g.fillRect(0, 0, w, h);
  const crop = pickCrop(w / h, targetLum);
  if (crop) {
    g.save();
    if (P.mirror && Math.random() < .5) { g.translate(w, 0); g.scale(-1, 1); }
    if ('filter' in g) g.filter = filterString(mods);
    g.drawImage(crop.s.img, crop.cx, crop.cy, crop.cw, crop.ch, 0, 0, w, h);
    g.restore(); g.filter = 'none';
  }
  treat(t, w, h);
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = .18;
  g.drawImage(grain, rnd(0, 100), rnd(0, 100), 200, 200, 0, 0, w, h);
  if (P.treatment === 'photo') { g.globalAlpha = .06; g.fillStyle = '#c9a66b'; g.fillRect(0, 0, w, h); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  return { t, src: crop ? crop.s.name : '' };
}

// ---------- scraps ----------
function makeScrap(w, h, targetLum, mods = {}) {
  w = Math.max(20, Math.round(w)); h = Math.max(20, Math.round(h));
  const pad = Math.round(16 + P.border * 10), c = mk(w + pad * 2, h + pad * 2), g = c.getContext('2d'); g.translate(pad, pad);
  let shape = P.scrapShape === 'strip' ? 'rect' : P.scrapShape;
  if (shape === 'mixed') shape = ['rect', 'rect', 'triangle', 'circle', 'blob'][Math.floor(rnd(5))];
  const poly = edgeOutline(baseOutline(shape, w, h));
  if (P.border > .02) {
    const fib = lerp(.6, 3.4, P.edge) * (P.edgeStyle === 'torn' ? 1 : .4);
    g.fillStyle = '#fbf8f0';
    pathPoly(g, poly.map(([x, y]) => [x + rnd(-fib, fib), y + rnd(-fib, fib)]), 0, 0, 1 + P.border * .055, w / 2, h / 2); g.fill();
  }
  const { t, src } = photoTile(w, h, targetLum, mods);
  g.save(); pathPoly(g, poly, 0, 0, .985, w / 2, h / 2); g.clip(); g.drawImage(t, 0, 0); g.restore();
  return { canvas: c, pad, w, h, src };
}

// ---------- words ----------
const TYPEFACES = {
  serif: ['', '"Instrument Serif", "Songti SC", "Noto Serif", Georgia, serif'],
  mono: ['600 ', '"IBM Plex Mono", "PingFang SC", "Apple SD Gothic Neo", monospace'],
  grotesk: ['800 ', '"Helvetica Neue", Arial, "PingFang SC", "Apple SD Gothic Neo", sans-serif'],
  hand: ['', '"Bradley Hand", "Segoe Print", "Chalkboard SE", "Comic Sans MS", cursive'],
  display: ['900 ', '"Arial Black", Impact, "PingFang SC", "Apple SD Gothic Neo", sans-serif'],
};
const LETTER_STYLES = [
  { tf: 'serif', bg: '#fbf8f0', fg: '#141414' }, { tf: 'serif', italic: true, bg: '#efe3c8', fg: '#2a1d10' },
  { tf: 'mono', bg: '#141414', fg: '#f4f1ea' }, { tf: 'display', bg: '#f4f1ea', fg: '#1f2e8c' },
  { tf: 'grotesk', bg: '#d9d3c4', fg: '#141414' }, { tf: 'grotesk', bg: '#c0262d', fg: '#fbf8f0' },
  { tf: 'mono', bg: '#fbf8f0', fg: '#141414' },
];
const SHAPED = /[֐-ࣿऀ-෿฀-໿က-႟ក-៿]/;
function graphemes(t) { try { return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)].map(x => x.segment); } catch (e) { return Array.from(t); } }
function letterStyle() {
  let st;
  if (P.typeface === 'mixed') st = { ...(Math.random() < P.letterMix ? LETTER_STYLES[Math.floor(rnd(LETTER_STYLES.length))] : LETTER_STYLES[0]) };
  else st = { tf: P.typeface, bg: ['#fbf8f0', '#f1ead9', '#e9e4d8'][Math.floor(rnd(3))], fg: P.inkColor };
  if (P.textMode === 'ink') { st.bg = null; st.fg = P.inkColor; }
  else if (P.textMode === 'inverted') { st.bg = P.inkColor; st.fg = P.bg; }
  else if (P.textMode === 'palette') { st.bg = [P.duoA, P.duoB, P.inkColor, '#fbf8f0'][Math.floor(rnd(4))]; st.fg = isDark(st.bg) ? '#fbf8f0' : '#141414'; }
  else if (P.textMode === 'stencil') { st.bg = null; st.stencil = true; if (P.typeface === 'mixed') st.tf = 'display'; }
  return st;
}
function makeWord(text, size, mods = {}) {
  if (P.caseMode === 'UPPER') text = text.toUpperCase(); else if (P.caseMode === 'lower') text = text.toLowerCase();
  const units = SHAPED.test(text) ? [text] : graphemes(text);
  const tmp = mk(4, 4).getContext('2d');
  const sc = clamp(P.scatter + (mods.scatter || 0), 0, 1.4), rr = lerp(.03, .55, Math.min(1, sc)), phase = rnd(6);
  const tiles = units.map((u, i) => {
    const st = letterStyle(), fs = size * rnd(.82, 1.22) * (st.stencil ? 1.25 : 1);
    const [wgt, fam] = TYPEFACES[st.tf] || TYPEFACES.serif;
    const font = `${st.italic ? 'italic ' : ''}${st.stencil ? '900 ' : wgt}${Math.round(fs)}px ${fam}`;
    tmp.font = font; const tw = Math.max(tmp.measureText(u).width, fs * .35);
    const wave = Math.sin(i * .8 + phase) * fs * .55 * P.wave;
    return { u, st, fs, font, w: tw + fs * (st.bg ? .34 : .12), h: fs * 1.3, rot: rnd(-rr, rr), dy: rnd(-1, 1) * fs * lerp(.04, .9, Math.min(1, sc)) + wave, dx: rnd(0, 1) * fs * lerp(0, .9, Math.min(1, sc)) };
  });
  const gap = size * lerp(.03, .12, Math.min(1, sc));
  const W2 = tiles.reduce((a, t) => a + t.w + gap + t.dx, 0) + 30, H2 = Math.max(...tiles.map(t => t.h)) + size * lerp(.5, 2.2, Math.min(1, sc)) + size * P.wave + 30;
  const c = mk(W2, H2), g = c.getContext('2d');
  let x = 15;
  for (const t of tiles) {
    g.save(); g.translate(x + t.dx + t.w / 2, H2 / 2 + t.dy); g.rotate(t.rot);
    if (t.st.bg) {
      g.shadowColor = 'rgba(40,30,15,.22)'; g.shadowBlur = 3; g.shadowOffsetY = 1.5;
      const poly = edgeOutline(baseOutline('rect', t.w, t.h).map(([a, b]) => [a, b]));
      pathPoly(g, poly, -t.w / 2, -t.h / 2); g.fillStyle = t.st.bg; g.fill(); g.shadowColor = 'transparent';
      g.save(); pathPoly(g, poly, -t.w / 2, -t.h / 2); g.clip(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .12; g.drawImage(grain, -t.w / 2, -t.h / 2, t.w, t.h); g.restore();
    }
    g.font = t.font; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (t.st.stencil) {
      const tw = Math.ceil(t.w + 10), th = Math.ceil(t.h + 10);
      const { t: photo } = photoTile(tw, th, rnd(.25, .6), mods);
      const m = mk(tw, th), mg = m.getContext('2d'); mg.drawImage(photo, 0, 0);
      mg.globalCompositeOperation = 'destination-in'; mg.font = t.font; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillText(t.u, tw / 2, th / 2 + t.fs * .04);
      g.lineJoin = 'round'; g.strokeStyle = '#fbf8f0'; g.lineWidth = t.fs * .09; g.strokeText(t.u, 0, t.fs * .04);
      g.shadowColor = 'rgba(40,30,15,.25)'; g.shadowBlur = 4; g.drawImage(m, -tw / 2, -th / 2); g.shadowColor = 'transparent';
    } else if (P.outline) {
      g.strokeStyle = t.st.fg; g.lineWidth = Math.max(1.5, t.fs * .045); g.strokeText(t.u, 0, t.fs * .04);
    } else {
      g.fillStyle = t.st.fg;
      if (!t.st.bg) { g.shadowColor = isDark(t.st.fg) ? 'rgba(255,252,244,.85)' : 'rgba(10,10,10,.75)'; g.shadowBlur = t.fs * .18; }
      g.fillText(t.u, 0, t.fs * .04); g.shadowColor = 'transparent';
    }
    g.restore();
    x += t.w + gap + t.dx;
  }
  return { canvas: c, pad: 0, w: c.width, h: c.height };
}

// ---------- layout ----------
let cluster = { x: 600, y: 750 }, scrapIdx = 0, pileH = [], prevCenter = null;
function resetLayout() {
  const b = bounds(); cluster = { x: b.cx, y: b.cy }; scrapIdx = 0; pileH = new Array(24).fill(0); prevCenter = null;
}
function positionFor(w, h, pn, loud, tFrac) {
  const b = bounds(); let x, y; const i = scrapIdx++;
  const half = (v, s) => clamp(v, s.min, s.max);
  switch (P.layoutMode) {
    case 'grid': {
      const cols = Math.round(lerp(3, 7, P.density)), rows = Math.max(2, Math.round(cols * b.h / b.w)), n = cols * rows;
      const cell = i % n, col = cell % cols, row = Math.floor(cell / cols);
      x = b.x0 + (col + .5) * b.w / cols + rnd(-12, 12); y = b.y0 + (row + .5) * b.h / rows + rnd(-12, 12); break;
    }
    case 'spiral': {
      const maxN = lerp(40, 160, P.density), a = i * .62, r = Math.min(1, i / maxN) * Math.min(b.w, b.h) / 2 * .95;
      x = b.cx + Math.cos(a) * r; y = b.cy + Math.sin(a) * r; break;
    }
    case 'radial': { const a = rnd(Math.PI * 2), r = (.08 + loud * .9) * Math.min(b.w, b.h) / 2; x = b.cx + Math.cos(a) * r; y = b.cy + Math.sin(a) * r; break; }
    case 'cascade': x = b.x0 + rnd() * b.w; y = b.y0 + tFrac * b.h + rnd(-70, 70); break;
    case 'waveform': x = b.x0 + tFrac * b.w + rnd(-20, 20); y = lerp(b.y1, b.y0, pn) + rnd(-40, 40); break;
    case 'constellation': x = b.x0 + rnd() * b.w; y = b.y0 + rnd() * b.h; break;
    case 'pile': {
      cluster.x = clamp(cluster.x + rnd(-260, 260), b.x0 + w / 2, b.x1 - w / 2); x = cluster.x;
      const c0 = Math.floor(clamp((x - w / 2 - b.x0) / b.w, 0, .999) * 24), c1 = Math.floor(clamp((x + w / 2 - b.x0) / b.w, 0, .999) * 24);
      let top = 0; for (let c = c0; c <= c1; c++) top = Math.max(top, pileH[c]);
      y = b.y1 - top - h * .4; for (let c = c0; c <= c1; c++) pileH[c] = top + h * .55;
      if (y < b.y0 + h / 2) { pileH.fill(0); y = b.y1 - h * .4; }
      break;
    }
    default: { // cluster
      const targetY = lerp(b.y1 - b.h * .1, b.y0 + b.h * .1, pn);
      const drift = lerp(70, 360, P.layout), pull = lerp(.3, 0, P.layout);
      cluster.x = lerp(cluster.x, b.cx, pull) + rnd(-drift, drift);
      cluster.y = lerp(cluster.y, lerp(targetY, b.cy, pull), .5) + rnd(-drift * .55, drift * .55);
      cluster.x = clamp(cluster.x, b.x0 + 80, b.x1 - 80); cluster.y = clamp(cluster.y, b.y0 + 80, b.y1 - 80);
      x = cluster.x + rnd(-60, 60); y = cluster.y;
    }
  }
  const sx = Math.min(w * .42, b.w / 2), sy = Math.min(h * .42, b.h / 2);
  x = half(x, { min: b.x0 + sx, max: b.x1 - sx }); y = half(y, { min: b.y0 + sy, max: b.y1 - sy });
  return { x, y };
}

// ---------- attachments ----------
function makeAttachments(w, h) {
  const att = [];
  if (Math.random() < P.tape) att.push({ type: 'tape', cx: (Math.random() < .5 ? -1 : 1) * w * rnd(.25, .45), cy: -h / 2, rot: rnd(-.7, .7), len: rnd(70, 130) });
  if (Math.random() < P.tape * .5) att.push({ type: 'tape', cx: rnd(-w * .3, w * .3), cy: h / 2, rot: rnd(-.5, .5), len: rnd(60, 110) });
  if (Math.random() < P.pins) att.push({ type: 'pin', cx: rnd(-w * .15, w * .15), cy: -h / 2 + 16, color: ['#c0262d', '#1f2e8c', '#141414', '#e0b000'][Math.floor(rnd(4))] });
  if (Math.random() < P.staples) att.push({ type: 'staple', cx: (Math.random() < .5 ? -1 : 1) * (w / 2 - 18), cy: -h / 2 + 18, rot: rnd(-.8, .8) });
  return att;
}
function drawAttachments(g, s) {
  for (const a of s.att || []) {
    g.save(); g.translate(a.cx, a.cy);
    if (a.type === 'tape') {
      g.rotate(a.rot); g.fillStyle = 'rgba(236,226,190,.78)'; g.shadowColor = 'rgba(0,0,0,.12)'; g.shadowBlur = 2;
      g.beginPath(); g.moveTo(-a.len / 2, -15); for (let x = -a.len / 2; x <= a.len / 2; x += 6) g.lineTo(x, -15 + rnd(-1.2, 1.2));
      g.lineTo(a.len / 2, 15); for (let x = a.len / 2; x >= -a.len / 2; x -= 6) g.lineTo(x, 15 + rnd(-1.2, 1.2)); g.closePath(); g.fill();
    } else if (a.type === 'pin') {
      g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 6; g.shadowOffsetX = 4; g.shadowOffsetY = 5;
      g.fillStyle = a.color; g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.fill(); g.shadowColor = 'transparent';
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(-3.5, -3.5, 3.5, 0, Math.PI * 2); g.fill();
    } else if (a.type === 'staple') {
      g.rotate(a.rot); g.strokeStyle = '#6d6d6d'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-13, -1); g.lineTo(13, -1); g.stroke();
    }
    g.restore();
  }
}
function drawStampsAndStains(g) {
  const b = bounds(), dark = isDark(P.bg);
  if (Math.random() < P.stamps) {
    const x = rnd(b.x0 + 140, b.x1 - 220), y = rnd(b.y0 + 120, b.y1 - 120), ink = dark ? 'rgba(240,235,225,.55)' : 'rgba(30,40,110,.55)';
    g.save(); g.translate(x, y); g.rotate(rnd(-.4, .4)); g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 78, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 66, 0, Math.PI * 2); g.stroke();
    g.font = '600 15px "IBM Plex Mono", monospace'; g.textAlign = 'center';
    g.fillText('SAN FRANCISCO', 0, -16); const d = new Date();
    g.font = '600 22px "IBM Plex Mono", monospace'; g.fillText(`${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`, 0, 12);
    g.font = '500 12px "IBM Plex Mono", monospace'; g.fillText('JACKSON SQ.', 0, 34);
    g.lineWidth = 3; for (let k = 0; k < 5; k++) { g.beginPath(); for (let xx = 90; xx < 230; xx += 4) g.lineTo(xx, -32 + k * 16 + Math.sin(xx * .08) * 5); g.stroke(); }
    g.restore();
  }
  if (Math.random() < P.stains * 1.4) {
    const x = rnd(b.x0, b.x1), y = rnd(b.y0, b.y1), r = rnd(80, 140);
    g.save(); g.globalCompositeOperation = dark ? 'screen' : 'multiply';
    g.strokeStyle = 'rgba(120,80,40,.22)'; g.lineWidth = rnd(6, 13); g.beginPath(); g.arc(x, y, r, rnd(0, 1), rnd(4.5, 6.2)); g.stroke();
    g.lineWidth = 2; g.strokeStyle = 'rgba(120,80,40,.15)'; g.beginPath(); g.arc(x + 3, y + 2, r - 9, 0, Math.PI * 2); g.stroke();
    g.restore();
  }
  if (Math.random() < P.stains) {
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(230,200,120,.16)';
    g.beginPath(); g.ellipse(rnd(b.x0, b.x1), rnd(b.y0, b.y1), rnd(60, 160), rnd(40, 110), rnd(3), 0, Math.PI * 2); g.fill(); g.restore();
  }
}

// ---------- animation, history and render ----------
let anims = [];          // pieces still flying in
let history = [];        // every placed piece (for 3D + listen)
let highlight = null;    // listen-mode highlight
function flyOffsets(s) {
  switch (P.flyFrom) {
    case 'mic': return { dx: W / 2 - s.x, dy: H + 160 - s.y, sc: .25, lift: 0 };
    case 'sides': return { dx: (s.x < W / 2 ? -1 : 1) * W * .7, dy: rnd(-80, 80), sc: 1, lift: 0 };
    case 'drop': return { dx: rnd(-30, 30), dy: -(s.y + 220), sc: 1, lift: 0, bounce: true };
    case 'fade': return { dx: 0, dy: 0, sc: 1, lift: 0 };
    default: return { dx: 0, dy: 0, sc: 1.22, lift: -26 };
  }
}
function pushPiece(s, x, y, rot, opts = {}) {
  const rec = { ...s, x, y, rot, alpha: opts.alpha ?? 1, word: !!opts.word, z: opts.z || 0, t: opts.t || 0, a0: opts.a0 || 0, a1: opts.a1 || 0, text: opts.text || '', att: opts.word ? [] : makeAttachments(s.w, s.h), t0: performance.now(), dur: lerp(950, 170, P.settle) * (opts.word ? 1.15 : 1) };
  rec.fly = flyOffsets(rec);
  anims.push(rec); history.push(rec);
  return rec;
}
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeBounce = k => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + .75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + .9375; return n * (k -= 2.625 / d) * k + .984375; };
function drawPiece(g, s, k) {
  const f = s.fly || { dx: 0, dy: 0, sc: 1, lift: 0 }, e = f.bounce ? easeBounce(k) : easeOut(k);
  const scale = lerp(f.sc, 1, e), x = s.x + f.dx * (1 - e), y = s.y + f.dy * (1 - e) + lerp(f.lift, 0, e);
  g.save(); g.translate(x, y); g.rotate(s.rot); g.scale(scale, scale);
  const inked = s.word && P.textMode === 'ink';
  if (!inked) { g.shadowColor = `rgba(40,30,15,${lerp(.18, .32, e)})`; g.shadowBlur = lerp(34, 7, e); g.shadowOffsetX = lerp(10, 2.5, e); g.shadowOffsetY = lerp(22, 4, e); }
  g.globalAlpha = Math.min(1, k * 3) * s.alpha;
  g.drawImage(s.canvas, -s.w / 2 - s.pad, -s.h / 2 - s.pad);
  g.shadowColor = 'transparent'; g.globalAlpha = 1;
  drawAttachments(g, s);
  g.restore();
}
function commitPiece(s) {
  if (!s.word && P.layoutMode === 'constellation' && prevCenter) {
    const ink = isDark(P.bg) ? 'rgba(240,240,240,.4)' : 'rgba(20,20,20,.35)';
    sctx.save(); sctx.strokeStyle = ink; sctx.lineWidth = 1.5; sctx.setLineDash([2, 6]);
    sctx.beginPath(); sctx.moveTo(prevCenter.x, prevCenter.y); sctx.lineTo(s.x, s.y); sctx.stroke();
    sctx.setLineDash([]); sctx.fillStyle = ink; sctx.beginPath(); sctx.arc(s.x, s.y, 4, 0, Math.PI * 2); sctx.fill(); sctx.restore();
  }
  if (!s.word) prevCenter = { x: s.x, y: s.y };
  drawPiece(s.word ? wctx : sctx, s, 1);
}

let captionText = '';
function drawDeco(g) {
  if (P.frame > 0 && P.shape !== 'polaroid') {
    const m = P.frame * 110; g.save(); g.fillStyle = '#fbf9f3'; g.beginPath(); g.rect(0, 0, W, H); g.rect(m, m, W - 2 * m, H - 2 * m); g.fill('evenodd'); g.restore();
  }
  if (P.shape === 'polaroid') {
    const b = { x0: 70, y0: 70, x1: W - 70, y1: H - 270 };
    g.save(); g.fillStyle = '#fbfaf6'; g.beginPath(); g.rect(0, 0, W, H); g.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); g.fill('evenodd');
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = .05; for (let y = 0; y < H; y += 300) for (let x = 0; x < W; x += 300) g.drawImage(grain, x, y);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (captionText) { g.fillStyle = '#2a2a2a'; g.font = '42px "Bradley Hand", "Segoe Print", "Chalkboard SE", cursive'; g.textAlign = 'center'; g.fillText(captionText.replace(/\s+/g, ' '), W / 2, H - 130, W - 160); }
    g.restore();
  }
  if (P.shape === 'filmstrip') {
    g.save(); g.fillStyle = '#121110'; g.fillRect(0, 0, 130, H); g.fillRect(W - 130, 0, 130, H);
    g.globalCompositeOperation = 'destination-out';
    for (let y = 20; y < H; y += 74) { for (const x of [40, W - 90]) { g.beginPath(); g.roundRect ? g.roundRect(x, y, 50, 38, 7) : g.rect(x, y, 50, 38); g.fill(); } }
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#e8b04a'; g.font = '600 20px "IBM Plex Mono", monospace';
    g.save(); g.translate(115, H / 2); g.rotate(-Math.PI / 2); g.fillText('ILFORD HP5 PLUS  ▸  VOICE → COLLAGE  ▸  ' + pad3(collageNo), -300, 0); g.restore();
    g.restore();
  }
}
function drawFx(g, live) {
  if (P.grain > 0) {
    g.save(); g.globalAlpha = P.grain * .32; g.globalCompositeOperation = isDark(P.bg) ? 'screen' : 'multiply';
    const ox = live ? rnd(256) : 0, oy = live ? rnd(256) : 0;
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) g.drawImage(grainHeavy, x, y);
    g.restore();
  }
  if (P.leaks > 0) {
    g.save(); g.globalCompositeOperation = 'screen';
    for (const L of leakSeed) { const gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r); gr.addColorStop(0, `rgba(${L.c},${P.leaks * .75})`); gr.addColorStop(1, `rgba(${L.c},0)`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    g.restore();
  }
  if (P.streaks > 0) {
    g.save(); for (const s of streakSeed) { g.fillStyle = `rgba(${isDark(P.bg) ? '255,255,255' : '20,20,20'},${P.streaks * .12 * s.a})`; g.fillRect(s.x, 0, s.w, H); } g.restore();
  }
}
function composite(g, live) {
  g.clearRect(0, 0, W, H);
  g.save(); shapePath(g); g.clip();
  g.drawImage(layers.paper, 0, 0);
  if (P.copyChain) g.drawImage(layers.ghost, 0, 0);
  g.drawImage(layers.settled, 0, 0);
  const now = performance.now();
  for (const s of anims) if (!s.word) drawPiece(g, s, clamp((now - s.t0) / s.dur, 0, 1));
  g.drawImage(layers.words, 0, 0);
  for (const s of anims) if (s.word) drawPiece(g, s, clamp((now - s.t0) / s.dur, 0, 1));
  if (highlight && now < highlight.until) {
    const s = highlight.rec; g.save(); g.translate(s.x, s.y); g.rotate(s.rot);
    g.strokeStyle = isDark(P.bg) ? '#fff' : '#c0262d'; g.lineWidth = 6; g.setLineDash([14, 10]); g.strokeRect(-s.w / 2 - 8, -s.h / 2 - 8, s.w + 16, s.h + 16); g.restore();
  }
  drawFx(g, live);
  drawDeco(g);
  g.restore();
}
function render() {
  const now = performance.now();
  if (P.mode === 'paint' && typeof stepPaint === 'function') stepPaint();
  anims = anims.filter(s => { if (now - s.t0 >= s.dur) { commitPiece(s); return false; } return true; });
  composite(ctx, state === 'listening');
}
function applyAberration(c) {
  const g = c.getContext('2d'), id = g.getImageData(0, 0, c.width, c.height), d = id.data, src = new Uint8ClampedArray(d), w = c.width;
  const o = Math.round(2 + P.aberration * 8);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, ir = (y * w + Math.min(w - 1, x + o)) * 4, ib = (y * w + Math.max(0, x - o)) * 4;
    d[i] = src[ir]; d[i + 2] = src[ib + 2];
  }
  g.putImageData(id, 0, 0);
}
function exportCanvas() {
  const out = mk(W, H); composite(out.getContext('2d'), false);
  if (P.aberration > .02) applyAberration(out);
  return out;
}
function clearPieces() {
  sctx.clearRect(0, 0, W, H); wctx.clearRect(0, 0, W, H); gctx.clearRect(0, 0, W, H);
  anims = []; history = []; highlight = null; captionText = '';
  if (typeof resetPaint === 'function') resetPaint();
}
// faded photocopy of the previous guest's collage
let lastCollage = null;
function prepareGhost() {
  gctx.clearRect(0, 0, W, H);
  if (!P.copyChain || !lastCollage) return;
  gctx.save(); gctx.globalAlpha = .38; if ('filter' in gctx) gctx.filter = 'grayscale(1) contrast(1.9) blur(.7px)';
  gctx.drawImage(lastCollage, rnd(-8, 8), rnd(-8, 8), W, H); gctx.restore(); gctx.filter = 'none';
  gctx.globalCompositeOperation = 'multiply'; gctx.globalAlpha = .3; for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) gctx.drawImage(grainHeavy, x, y);
  gctx.globalAlpha = 1; gctx.globalCompositeOperation = 'source-over';
}
