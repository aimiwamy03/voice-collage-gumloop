// ============================================================
// voice → collage · PAINT mode
// The voice drags oil paint across raw canvas. Words are painted or scratched in.
// Pigment comes from the voice (pitch × brightness) and from the story (words that name or evoke a colour).
// Scratchiness builds up from loud, rough, breathy speech and gouges through the wet paint.
// ============================================================

// oil pigments laid out by voice: rows = brightness (dark→bright), cols = pitch (low→high)
const VOICE_PIGMENTS = [
  [['Burnt umber', '#4b2e1e'], ['Prussian blue', '#1d3557'], ['Alizarin crimson', '#7d1d2e']],
  [['Raw sienna', '#9c5b2e'], ['Viridian', '#2f6f5e'], ['Vermilion', '#d8432b']],
  [['Yellow ochre', '#c99a2e'], ['Cerulean', '#3a8fc2'], ['Cadmium yellow', '#f2b705']],
];
// words that hint at a colour, in several languages → [pigment name, hex]
const P_ = (n, h) => [n, h];
const PIG = {
  ultramarine: P_('Ultramarine', '#2b3fa0'), cerulean: P_('Cerulean', '#3a8fc2'), crimson: P_('Alizarin crimson', '#8e1b2a'),
  cadred: P_('Cadmium red', '#c8231e'), cadyellow: P_('Cadmium yellow', '#f2b705'), naples: P_('Naples yellow', '#f0d48a'),
  sap: P_('Sap green', '#4f6b2a'), viridian: P_('Viridian', '#2f6f5e'), umber: P_('Burnt umber', '#4b2e1e'), rawumber: P_('Raw umber', '#6b5233'),
  black: P_('Ivory black', '#1a1816'), white: P_('Titanium white', '#f4f1ea'), payne: P_('Payne’s grey', '#38404a'), indigo: P_('Indigo', '#26265a'),
  rose: P_('Rose madder', '#c9587a'), ochre: P_('Yellow ochre', '#c99a2e'), sepia: P_('Sepia', '#5e4630'), lavender: P_('Lavender', '#9c8fc4'),
  vermilion: P_('Vermilion', '#d8432b'), prussian: P_('Prussian blue', '#1d3557'), caput: P_('Caput mortuum', '#5a2a2e'), orange: P_('Cadmium orange', '#e8762b'),
  grey: P_('Davy’s grey', '#7b7a72'), gold: P_('Gold ochre', '#c88a1a'), purple: P_('Dioxazine violet', '#4b2a6b'), pink: P_('Quinacridone pink', '#e0679a'),
};
const STORY = [
  // colour names
  ['blue bleu azul 蓝 藍 파랑 파란 青', 'ultramarine'], ['red rouge rojo 红 紅 빨강 빨간 赤', 'cadred'], ['yellow jaune amarillo 黄 노랑 노란', 'cadyellow'],
  ['green vert verde 绿 綠 초록 녹색 緑', 'sap'], ['black noir negro 黑 검정 검은 黒', 'black'], ['white blanc blanco 白 하양 하얀', 'white'],
  ['grey gray gris 灰 회색', 'grey'], ['brown marron brun café coffee 咖啡 갈색 茶色', 'rawumber'], ['orange naranja 橙 주황', 'orange'],
  ['pink rose rosa 粉 분홍 ピンク', 'pink'], ['purple violet violeta 紫 보라', 'purple'], ['gold or oro 金 금', 'gold'],
  // things and feelings
  ['sea mer mar ocean océan 海 바다 water eau agua 水 물', 'ultramarine'], ['sky ciel cielo 天 하늘 空', 'cerulean'],
  ['fire feu fuego 火 불 burn', 'vermilion'], ['sun soleil sol 太阳 太陽 해 햇살 日', 'cadyellow'], ['light lumière luz 光 빛', 'naples'],
  ['love amour amor 爱 愛 사랑 heart cœur coeur corazón 心 마음', 'crimson'], ['blood sang sangre 血 피', 'crimson'], ['kiss bisou baiser beso 吻 키스', 'rose'],
  ['night nuit noche 夜 밤 dark sombre noir oscuro 暗 어둠', 'indigo'], ['moon lune luna 月 달', 'payne'], ['star étoile estrella 星 별', 'naples'],
  ['tree arbre árbol 树 樹 나무 forest forêt bosque 森 숲 leaf feuille hoja 叶 잎', 'viridian'], ['grass herbe hierba 草 풀 garden jardin 花园 정원', 'sap'],
  ['flower fleur flor 花 꽃 rose', 'rose'], ['earth terre tierra 土 흙 땅 ground sol', 'umber'], ['wine vin vino 酒 와인', 'caput'],
  ['snow neige nieve 雪 눈 cloud nuage nube 云 雲 구름', 'white'], ['rain pluie lluvia 雨 비 tears larmes lágrimas 泪 눈물', 'payne'],
  ['sad triste 伤心 悲 슬퍼 슬픔 lonely seul solo 孤独 외로', 'prussian'], ['happy heureux feliz joy joie alegría 快乐 幸福 행복 기쁨', 'naples'],
  ['angry colère enojo rage 生气 怒 화가 분노', 'vermilion'], ['dream rêve sueño 梦 夢 꿈', 'lavender'], ['sleep dormir 睡 잠', 'lavender'],
  ['memory souvenir recuerdo 记忆 記憶 기억 remember rappelle 回忆 추억', 'sepia'], ['home maison casa 家 집 house', 'ochre'],
  ['mother mère mamá maman mom 妈妈 媽媽 엄마 어머니', 'rose'], ['father père papá papa dad 爸爸 아빠', 'umber'],
  ['city ville ciudad 城市 도시 paris street rue calle 街 거리 metro', 'grey'], ['death mort muerte 死 죽음', 'black'], ['gold money argent dinero 钱 돈', 'gold'],
  ['hong kong 香港 홍콩', 'vermilion'], ['beijing 北京 seoul 서울 首尔', 'caput'], ['san francisco fog brouillard 雾 안개', 'payne'],
];
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, '');
const STORY_MAP = new Map();
for (const [words, key] of STORY) for (const w of words.split(' ')) STORY_MAP.set(norm(w), key);
function storyPigment(text) {
  const t = norm(text); if (!t) return null;
  if (STORY_MAP.has(t)) return PIG[STORY_MAP.get(t)];
  for (const [w, k] of STORY_MAP) if (w.length > 1 && /[^\x00-\x7f]/.test(w) && t.includes(w)) return PIG[k]; // CJK/Hangul inside longer words
  if (t.length > 4) for (const [w, k] of STORY_MAP) if (w.length > 3 && /^[a-z]+$/.test(w) && t.startsWith(w)) return PIG[k]; // plurals, verb forms
  return null;
}

// ---------- paint state ----------
let paintLastVoiced = 0, paintJobs = [], strokeNow = null, scratchLevel = 0, story = null, lastPigment = null, paintWords = [];
function resetPaint() { paintJobs = []; strokeNow = null; scratchLevel = 0; story = null; lastPigment = null; paintWords = []; showPigment(); }
function voicePigment() {
  const row = clamp(Math.floor(F.brightness * 3), 0, 2), col = clamp(Math.floor(F.pitch * 3), 0, 2);
  return VOICE_PIGMENTS[row][col];
}
function mixHex(a, b, t) { const A = hexToRgb(a), Bv = hexToRgb(b); return '#' + A.map((v, i) => Math.round(v + (Bv[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function currentPigment() {
  const [vn, vh] = voicePigment(), now = performance.now();
  if (P.storyColor && story && now - story.at < 6000) {
    const k = clamp(1 - (now - story.at - 3500) / 2500, 0, 1); // holds 3.5 s, then fades back to the voice
    return { name: story.p[0], hex: mixHex(vh, story.p[1], .85 * k + .15), why: `from “${story.word}”` };
  }
  return { name: vn, hex: vh, why: 'from your voice' };
}
function showPigment() {
  const el = $('pigment'); if (!el) return;
  if (P.mode !== 'paint') { el.innerHTML = ''; return; }
  const p = lastPigment || currentPigment();
  el.innerHTML = `<i style="background:${p.hex}"></i>${p.name} <span>${p.why}</span> · scratch ${Math.round(scratchLevel * 100)}%`;
}
const hsl = (hex, dl = 0) => { const [r, g, b] = hexToRgb(hex).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return `hsl(${Math.round(h * 360)},${Math.round(s * 100)}%,${Math.round(clamp(l + dl, 0, 1) * 100)}%)`; };

// ---------- brush strokes ----------
function newStroke(loud) {
  // free placement: anywhere on the canvas, even half off the edge; a short pause stays close, a long one jumps
  const prev = strokeNow ? strokeNow.pts[strokeNow.pts.length - 1] : [W / 2, H / 2];
  const far = F.pause > .35 || !strokeNow;
  let x = far ? rnd(-.05, 1.05) * W : prev[0] + rnd(-320, 320);
  let y = P.pitchHeight ? lerp(H * .95, H * .05, F.pitch) + rnd(-260, 260) : rnd(-.05, 1.05) * H;
  if (!far) y = prev[1] + rnd(-320, 320);
  const pig = currentPigment(); lastPigment = pig;
  // wet-in-wet: pick up a little of whatever paint is already under the brush
  let hex = pig.hex;
  try { const d = sctx.getImageData(clamp(Math.round(x), 0, W - 1), clamp(Math.round(y), 0, H - 1), 1, 1).data; if (d[3] > 60) hex = mixHex(hex, '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''), .22); } catch (e) {}
  const knife = loud > .72 && Math.random() < .55; // loud bursts become a palette-knife smear
  const T = lerp(40, 230, P.brushSize) * lerp(.65, 1.45, loud) * (knife ? 1.7 : 1);
  const n = Math.round(clamp(T / 5, 8, 40));
  const bristles = Array.from({ length: n }, (_, i) => ({ o: (i / (n - 1) - .5) * T * .95 + rnd(-3, 3), dl: rnd(-.16, .14), w: rnd(.8, 1.7) * T / n, a: rnd(.25, .65), skip: rnd() }));
  strokeNow = { pts: [[x, y, lerp(.5, 1.2, loud)]], ang: rnd(Math.PI * 2), turn: rnd(-.05, .05), T, bristles, hex, load: 1, drawn: 0, dry: F.breath * .7, knife };
  return strokeNow;
}
function extendStroke(loud, dtMs) {
  const s = strokeNow, last = s.pts[s.pts.length - 1];
  // big, loose gestures: momentum in the turning, occasional flicks, drift with pitch
  s.turn = s.turn * .96 + rnd(-1, 1) * lerp(.02, .11, F.speed) + (F.pitch - .5) * .01;
  if (Math.random() < .015 + F.speed * .03) s.turn += rnd(-.35, .35); // a flick of the wrist
  s.turn = clamp(s.turn, -.22, .22);
  s.ang += s.turn;
  const step = lerp(9, 30, F.speed) * (.55 + loud * 1.1) * dtMs / 16;
  let x = last[0] + Math.cos(s.ang) * step, y = last[1] + Math.sin(s.ang) * step;
  // the canvas edge is soft: strokes may run off it, but drift back if they wander too far
  const m = s.T * .6;
  if (x < -m || x > W + m) s.ang = Math.PI - s.ang + rnd(-.3, .3);
  if (y < -m || y > H + m) s.ang = -s.ang + rnd(-.3, .3);
  // pressure follows the voice, swelling and thinning
  const prevP = last[2] || 1; s.pts.push([x, y, prevP * .8 + lerp(.35, 1.6, loud) * .2]);
  s.load = Math.max(.05, s.load - step / lerp(2600, 6500, P.impasto) * (s.knife ? .6 : 1));
}
// paint the newest segments of a stroke onto the canvas, bristle by bristle
function drawStrokeSegments(g, s) {
  const pts = s.pts, start = Math.max(1, s.drawn);
  if (start >= pts.length) return;
  const from = start - 1, n = pts.length;
  // a normal at every point, so offsets follow the curve smoothly
  const nrm = i => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  const N = []; for (let i = from; i < n; i++) N[i] = nrm(i);
  const width = i => s.T * Math.min(1, (i + 1) / 9) * (pts[i][2] || 1);
  const line = (a, b, off, lw) => { g.lineWidth = lw; g.beginPath(); for (let i = a; i <= b; i++) { const o = off(i); const X = pts[i][0] + N[i][0] * o, Y = pts[i][1] + N[i][1] * o; i === a ? g.moveTo(X, Y) : g.lineTo(X, Y); } g.stroke(); };
  g.lineJoin = 'round';
  const step = 3;
  for (let a = from; a < n - 1; a += step) {
    const b = Math.min(n - 1, a + step), mid = (a + b) >> 1, Tw = width(mid), load = s.load, dryness = clamp((1 - load) * .85 + s.dry * .5, 0, .9);
    // body: fully opaque so overlapping chunks never band; the load shows as colour, not transparency
    if (Math.random() > dryness * .55) {
      g.lineCap = s.knife ? 'butt' : 'round'; g.globalAlpha = 1; g.strokeStyle = hsl(s.hex, lerp(.06, 0, load));
      line(a, b, () => 0, Tw * lerp(.7, 1, load));
    }
    // bristles: each hair is one continuous line through the chunk
    g.lineCap = 'butt';
    for (const br of s.bristles) {
      if (br.skip < dryness * rnd(.5, 1.1)) continue;
      g.strokeStyle = hsl(s.hex, br.dl * (.6 + br.a)); g.globalAlpha = dryness > .45 ? .9 : 1;
      line(a, b, i => br.o * Math.min(1, (i + 1) / 9) * (pts[i][2] || 1), br.w * (pts[mid][2] || 1));
    }
    if (P.impasto > .05) { // thick paint: lit ridges and a shadowed edge
      g.globalAlpha = 1;
      g.strokeStyle = hsl(s.hex, .2 * P.impasto * load + .02); line(a, b, i => width(i) / 2 * .72, 2.6);
      g.strokeStyle = hsl(s.hex, .1 * P.impasto * load); line(a, b, i => -width(i) / 2 * .15, 1.6);
      g.strokeStyle = hsl(s.hex, -.22 * P.impasto * load - .04); line(a, b, i => -width(i) / 2, 3);
    }
  }
  g.globalAlpha = 1; s.drawn = n;
}
function endStroke() {
  const s = strokeNow; if (!s) return;
  if (P.drips > .02 && s.load > .35 && Math.random() < P.drips) { // heavy paint runs
    const p = s.pts[Math.floor(rnd(s.pts.length))], len = rnd(60, 260) * P.drips, g = sctx;
    g.save(); g.strokeStyle = hsl(s.hex, -.05); g.lineCap = 'round';
    for (let k = 0; k < 2; k++) { const x = p[0] + rnd(-s.T / 3, s.T / 3); g.lineWidth = rnd(3, 7); g.globalAlpha = .8; g.beginPath(); g.moveTo(x, p[1]); g.lineTo(x + rnd(-3, 3), p[1] + len * rnd(.5, 1)); g.stroke(); g.beginPath(); g.arc(x, p[1] + len * rnd(.5, 1), 4, 0, Math.PI * 2); g.fillStyle = hsl(s.hex, -.05); g.fill(); }
    g.restore();
  }
  strokeNow.ended = true;
}

// ---------- sgraffito: scratching through the wet paint ----------
function scratchMarks(cx, cy, count, len, ang) {
  const g = sctx;
  for (let k = 0; k < count; k++) {
    const ox = cx + Math.cos(ang + Math.PI / 2) * (k - count / 2) * rnd(6, 14), oy = cy + Math.sin(ang + Math.PI / 2) * (k - count / 2) * rnd(6, 14);
    const pts = []; let x = ox - Math.cos(ang) * len / 2, y = oy - Math.sin(ang) * len / 2, a = ang;
    for (let i = 0; i < 24; i++) { pts.push([x, y]); a += rnd(-.12, .12); x += Math.cos(a) * len / 24; y += Math.sin(a) * len / 24; }
    paintJobs.push({ kind: 'scratch', pts, i: 1, w: rnd(1.5, 3.5) });
  }
}
function drawScratchStep(j, n = 3) {
  const g = sctx;
  for (let s = 0; s < n && j.i < j.pts.length; s++, j.i++) {
    const [x0, y0] = j.pts[j.i - 1], [x1, y1] = j.pts[j.i];
    g.save(); g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.lineWidth = j.w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
    g.save(); g.globalAlpha = .45; g.strokeStyle = 'rgba(20,14,8,.9)'; g.lineWidth = .9; g.beginPath(); g.moveTo(x0 + j.w * .6, y0 + j.w * .6); g.lineTo(x1 + j.w * .6, y1 + j.w * .6); g.stroke(); g.restore();
  }
  return j.i >= j.pts.length;
}

// ---------- painted or scratched words ----------
const PAINT_FACES = ['"Marker Felt", "Chalkboard SE", "Bradley Hand", "Segoe Print", cursive', '900 "Arial Black", Impact, "PingFang SC", "Apple SD Gothic Neo", sans-serif', '"Bradley Hand", "Segoe Print", "Chalkboard SE", cursive', '"Instrument Serif", "Songti SC", Georgia, serif'];
function faceFor() {
  if (P.typeface !== 'mixed') { const [w, f] = TYPEFACES[P.typeface] || TYPEFACES.hand; return w + '|' + f; }
  const f = PAINT_FACES[Math.floor(rnd(PAINT_FACES.length))]; return f.startsWith('900') ? '900 |' + f.slice(4) : '|' + f;
}
function paintWordJob(text, lang, a0, a1) {
  if (P.caseMode === 'UPPER') text = text.toUpperCase(); else if (P.caseMode === 'lower') text = text.toLowerCase();
  const sp = storyPigment(text);
  if (sp && P.storyColor) story = { p: sp, word: text, at: performance.now() };
  const pig = currentPigment(); lastPigment = pig;
  const scratched = P.letterStyle === 'scratched' || (P.letterStyle === 'auto' && scratchLevel > lerp(.75, .25, P.scratchBias));
  const b = bounds(), size = lerp(lerp(40, 80, P.wordSize), lerp(80, 190, P.wordSize), lastLoud);
  const [wgt, fam] = faceFor().split('|'), font = `${wgt}${Math.round(size)}px ${fam}`;
  const units = SHAPED.test(text) ? [text] : graphemes(text), tmp = mk(4, 4).getContext('2d'); tmp.font = font;
  const widths = units.map(u => tmp.measureText(u).width * (1 + P.scatter * .35) + size * .06), total = widths.reduce((a, c) => a + c, 0);
  // find a spot away from earlier words
  let best = null, bestO = Infinity;
  for (let k = 0; k < 14; k++) {
    const cx = clamp(rnd(b.x0 + total / 2 + 20, b.x1 - total / 2 - 20) || b.cx, b.x0 + 20, b.x1 - 20), cy = rnd(b.y0 + size, b.y1 - size * .6);
    let o = 0; for (const r of paintWords) { const ix = Math.max(0, Math.min(cx + total / 2, r.x + r.w / 2) - Math.max(cx - total / 2, r.x - r.w / 2)); const iy = Math.max(0, Math.min(cy + size / 2, r.y + r.h / 2) - Math.max(cy - size / 2, r.y - r.h / 2)); o += ix * iy; }
    if (o < bestO) { bestO = o; best = [cx, cy]; }
  }
  const [cx, cy] = best, rot = rnd(-1, 1) * lerp(.02, .3, Math.max(P.tilt, P.scatter * .7));
  paintWords.push({ x: cx, y: cy, w: total, h: size });
  const letters = []; let x = -total / 2;
  units.forEach((u, i) => { letters.push({ u, x: x + widths[i] / 2, dy: rnd(-1, 1) * size * P.scatter * .5 + Math.sin(i * .8) * size * .4 * P.wave, r: rnd(-1, 1) * P.scatter * .35 }); x += widths[i]; });
  const rec = { canvas: null, pad: 0, w: total, h: size * 1.2, x: cx, y: cy, rot, alpha: 1, word: true, z: 1, t: recTime(), a0, a1, text, att: [] };
  history.push(rec);
  if (scratched) { // a loaded swatch of paint for the letters to be carved through
    const sw = { pts: [], T: size * 1.5, bristles: [], hex: mixHex(pig.hex, '#1a1612', isDark(P.bg) ? .1 : .35), load: 1, drawn: 0, dry: 0 };
    const n = Math.round(clamp(sw.T / 4, 6, 26)); sw.bristles = Array.from({ length: n }, (_, i) => ({ o: (i / (n - 1) - .5) * sw.T * .9, dl: rnd(-.12, .1), w: sw.T / n * rnd(.8, 1.5), a: rnd(.25, .6), skip: rnd() }));
    const c = Math.cos(rot), s = Math.sin(rot), half = total / 2 + size * .3;
    for (let k = 0; k <= 24; k++) { const u = -half + 2 * half * k / 24; sw.pts.push([cx + c * u - s * rnd(-6, 6), cy + s * u + c * rnd(-6, 6), 1]); }
    paintJobs.push({ kind: 'swatch', s: sw, i: 1 });
  }
  const swatchJob = scratched ? paintJobs[paintJobs.length - 1] : null;
  paintJobs.push({ kind: 'word', swatch: swatchJob, letters, i: 0, next: 0, font, size, hex: pig.hex, scratched, cx, cy, rot, rec });
  showPigment();
}
function drawLetter(j, L) {
  const g = sctx; g.save(); g.translate(j.cx, j.cy); g.rotate(j.rot); g.translate(L.x, L.dy); g.rotate(L.r);
  g.font = j.font; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (j.scratched) {
    // gouged into the paint: several shaky passes that cut through to the canvas, with a dark lip
    for (let k = 0; k < 4; k++) {
      g.save(); g.translate(rnd(-1.6, 1.6), rnd(-1.6, 1.6)); g.globalCompositeOperation = 'destination-out'; g.lineWidth = Math.max(2, j.size * .045); g.lineJoin = 'round'; g.strokeText(L.u, 0, 0); g.restore();
    }
    g.globalAlpha = .5; g.strokeStyle = 'rgba(25,16,8,.9)'; g.lineWidth = 1; g.strokeText(L.u, j.size * .02, j.size * .02);
  } else {
    // oil letter: layered loaded-brush passes, a highlight ridge and a shadow
    const m = mk(j.size * 2.2, j.size * 1.8), mg = m.getContext('2d'); mg.font = j.font; mg.textAlign = 'center'; mg.textBaseline = 'middle';
    mg.translate(m.width / 2, m.height / 2); mg.lineJoin = 'round';
    for (let k = 0; k < 7; k++) { mg.strokeStyle = mg.fillStyle = hsl(j.hex, rnd(-.07, .07)); mg.globalAlpha = rnd(.35, .7); mg.lineWidth = j.size * rnd(.03, .07); const ox = rnd(-2.5, 2.5), oy = rnd(-2.5, 2.5); mg.fillText(L.u, ox, oy); mg.strokeText(L.u, ox, oy); }
    const st = mk(m.width, m.height), sg = st.getContext('2d'); // bristle streaks through the letter
    for (let y = 0; y < st.height; y += 2) { sg.fillStyle = `rgba(0,0,0,${rnd(.6, 1)})`; sg.fillRect(0, y, st.width, 2); }
    mg.setTransform(1, 0, 0, 1, 0, 0); mg.globalAlpha = 1; mg.globalCompositeOperation = 'destination-in'; mg.drawImage(st, 0, 0);
    mg.globalCompositeOperation = 'source-over';
    g.shadowColor = 'rgba(20,12,4,.35)'; g.shadowBlur = 2 + P.impasto * 4; g.shadowOffsetX = 1 + P.impasto * 2; g.shadowOffsetY = 1 + P.impasto * 2;
    g.drawImage(m, -m.width / 2, -m.height / 2); g.shadowColor = 'transparent';
    if (P.impasto > .05) { g.globalAlpha = .28 * P.impasto; g.strokeStyle = hsl(j.hex, .3); g.lineWidth = 1.2; g.strokeText(L.u, -1.5, -1.5); }
  }
  g.restore();
}
// called every frame from render(): advances strokes, scratches and words so you watch them happen
function stepPaint() {
  if (strokeNow) drawStrokeSegments(sctx, strokeNow);
  const now = performance.now(), speedMs = lerp(220, 50, P.settle);
  paintJobs = paintJobs.filter(j => {
    if (j.kind === 'scratch') return !drawScratchStep(j);
    if (j.kind === 'swatch') { j.s.pts.length; const all = j.s.pts; const part = { ...j.s, pts: all.slice(0, Math.min(all.length, j.i + 4)) }; part.drawn = j.s.drawn; drawStrokeSegments(sctx, part); j.s.drawn = part.drawn; j.i += 4; return j.i < all.length + 3; }
    if (j.kind === 'word') { if (now < j.next || paintJobs.some(o => o.kind === 'swatch' && o.s && j.rec && o.i < o.s.pts.length + 3 && o === j.swatch)) return true; drawLetter(j, j.letters[j.i++]); j.next = now + speedMs; return j.i < j.letters.length; }
    return false;
  });
}
// the voice, every frame, in paint mode
function paintFrom(r, voiced, held, now, dtMs) {
  const loud = loudOf(r);
  // scratchiness builds with loud, rough, breathy sound and slowly relaxes
  scratchLevel = clamp(scratchLevel + (voiced ? loud * (.25 + F.breath + F.brightness * .4) * lerp(.0004, .0016, P.scratchBias) * dtMs : -.00008 * dtMs), 0, 1);
  if (voiced) {
    paintLastVoiced = now;
    if (!strokeNow || strokeNow.ended) newStroke(loud);
    extendStroke(loud, dtMs);
    if (strokeNow.pts.length > 700 || strokeNow.load < .08) { endStroke(); newStroke(loud); }
    // a sharp burst (an onset while already scratchy) gouges the paint
    if (held < 60 && loud > .45 && Math.random() < scratchLevel * (.5 + P.scratchBias)) {
      const p = strokeNow.pts[strokeNow.pts.length - 1]; scratchMarks(p[0], p[1], Math.round(lerp(2, 9, scratchLevel)), lerp(80, 420, loud), rnd(Math.PI));
    }
  } else if (strokeNow && !strokeNow.ended && now - paintLastVoiced > 260) endStroke();
  if (Math.random() < .1) showPigment();
}
