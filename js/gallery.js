// ============================================================
// voice → collage · THE GALLERY
// Every piece in the archive hangs salon-style in a tall white hall.
// Each recording is a small figure standing in front of its own piece, looking.
// The newest one walks in from the entrance.
// ============================================================
let gal = null;
const G = { W: 18, L: 40, H: 10, EYE: 1.62 }; // hall width, length, height (metres) — the length grows with the archive

const PALETTE_TOP = ['#141414', '#1d1d1f', '#2b2b2d', '#3a3f4a', '#5b2a2a', '#2f3b55', '#c9c2b5', '#e9e5dc', '#3c4a3a', '#7a6a55'];
const PALETTE_LEGS = ['#8a8a86', '#9a968d', '#2a2a2a', '#4a4a55', '#c9c2b5', '#1e1e1e'];

function avgColour(img) {
  try { const c = mk(8, 8), g = c.getContext('2d'); g.drawImage(img, 0, 0, 8, 8); const d = g.getImageData(0, 0, 8, 8).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; return '#' + [r, gg, b].map(v => Math.round(v / n * .8).toString(16).padStart(2, '0')).join(''); } catch (e) { return '#2b2b2d'; }
}
const seeded = id => { let s = (id * 9301 + 49297) % 233280; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

// a little gallery visitor: hands behind the back, head slightly tilted up toward the work
function makeFigure(T, rand, top) {
  const g = new T.Group(), h = 1.62 + rand() * .26, s = h / 1.75;
  const mat = c => new T.MeshStandardMaterial({ color: c, roughness: .85 });
  const legs = mat(PALETTE_LEGS[Math.floor(rand() * PALETTE_LEGS.length)]), body = mat(top), skin = mat(['#e6c3a8', '#c99e7c', '#8d5b3e', '#f0d2bd', '#5e3b28'][Math.floor(rand() * 5)]), hair = mat(['#141210', '#2b1d14', '#5a3b22', '#a07a4a', '#d8d2c6'][Math.floor(rand() * 5)]), shoe = mat('#111');
  const add = (geo, m, x, y, z, rx = 0, rz = 0) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; o.rotation.z = rz; o.castShadow = true; g.add(o); return o; };
  const stance = rand() * .06;
  add(new T.CylinderGeometry(.075, .062, .86, 10), legs, -.095 - stance, .45, 0);
  add(new T.CylinderGeometry(.075, .062, .86, 10), legs, .095 + stance, .45, 0);
  add(new T.BoxGeometry(.12, .07, .26), shoe, -.095 - stance, .035, -.05);
  add(new T.BoxGeometry(.12, .07, .26), shoe, .095 + stance, .035, -.05);
  const coatLong = rand() < .5;
  add(new T.CapsuleGeometry(.2, coatLong ? .62 : .42, 6, 14), body, 0, coatLong ? 1.1 : 1.2, 0).scale.set(1, 1, .72);
  // arms folded behind the back
  add(new T.CylinderGeometry(.05, .045, .52, 8), body, -.2, 1.16, .07, .35, .16);
  add(new T.CylinderGeometry(.05, .045, .52, 8), body, .2, 1.16, .07, .35, -.16);
  add(new T.SphereGeometry(.05, 10, 8), skin, 0, .93, .17);
  add(new T.CylinderGeometry(.055, .065, .1, 10), skin, 0, 1.55, 0);
  const head = add(new T.SphereGeometry(.112, 18, 14), skin, 0, 1.69, 0); head.scale.set(.92, 1.05, 1);
  const cap = add(new T.SphereGeometry(.118, 18, 14, 0, Math.PI * 2, 0, Math.PI * (rand() < .5 ? .62 : .5)), hair, 0, 1.7, .01); cap.rotation.x = -.35;
  if (rand() < .35) add(new T.SphereGeometry(.07, 10, 8), hair, 0, 1.66, .1); // a bun
  g.scale.setScalar(s);
  g.userData.head = head;
  return g;
}

// a rigged, animated visitor (three.js example mannequin, Mixamo rig): proper anatomy, idle breathing, a real walk
let sculptCache = null;
async function loadSculpture(T) {
  if (sculptCache) return sculptCache;
  try {
    const base = new URL('js/vendor/', location.href).href;
    const [{ MarchingCubes }, { buildSculpture }] = await Promise.all([import(base + 'MarchingCubes.js'), import(new URL('js/sculpture.js', location.href).href)]);
    sculptCache = buildSculpture(T, MarchingCubes);
  } catch (e) { console.warn('sculpture failed', e); sculptCache = null; }
  return sculptCache;
}
let rig = null, galPaused = false, relief = null, galWorld = null;
async function loadRig() {
  if (rig !== null) return rig;
  try {
    const base = new URL('js/vendor/', location.href).href;
    const [{ GLTFLoader }, SU] = await Promise.all([import(base + 'GLTFLoader.js'), import(base + 'SkeletonUtils.js')]);
    const gltf = await new GLTFLoader().loadAsync(base + 'models/Xbot.glb');
    const clips = Object.fromEntries(gltf.animations.map(a => [a.name, a]));
    rig = { gltf, clips, clone: SU.clone };
  } catch (e) { console.warn('rig failed, using simple figures', e); rig = false; }
  return rig;
}
function makeRigFigure(T, rand, top, legsCol) {
  const f = rig.clone(rig.gltf.scene), h = 1.58 + rand() * .3;
  // one quiet tone per figure, like an architect's model: plaster white, or a muted take on their work's colour
  const c = new T.Color(rand() < .45 ? '#ecebe6' : top), hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(hsl.s, .28), clamp(hsl.l, .3, .86));
  const shade = c.clone().multiplyScalar(.82);
  f.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const joints = /Joints/i.test(o.material.name);
    o.material = new T.MeshStandardMaterial({ color: joints ? shade : c, roughness: .88, metalness: 0 });
  });
  f.scale.setScalar(h / 1.8);
  const mixer = new T.AnimationMixer(f), idle = mixer.clipAction(rig.clips.idle), walk = mixer.clipAction(rig.clips.walk);
  idle.play(); idle.time = rand() * rig.clips.idle.duration; idle.timeScale = .75 + rand() * .35;
  f.userData_baseScale = idle.timeScale;
  f.userData = { mixer, idle, walkAction: walk, rig: true, baseScale: f.userData_baseScale };
  return f;
}

async function openGallery(focusNewest) {
  $('gallery').classList.add('show'); document.body.classList.add('in3d');
  $('galNote').textContent = 'hanging the work…';
  try { three = three || await import(new URL('js/vendor/three.module.min.js', location.href).href); }
  catch (e) { try { three = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js'); rig = false; } catch (e2) { $('galNote').textContent = 'Couldn’t load 3D.'; return; } }
  await loadRig();
  const T = three; closeGallery(true);
  let works = []; try { works = (await allWorks(false)).sort((a, b) => a.at - b.at); } catch (e) {}
  const langs = new Set(); works.forEach(w => (w.langs || []).forEach(l => langs.add(l)));

  G.L = clamp(16 + works.length * .55, 26, 110);
  const host = $('galCanvas'), vw = window.innerWidth, vh = window.innerHeight;
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(vw, vh);
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.NeutralToneMapping || T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  host.innerHTML = ''; host.appendChild(renderer.domElement);
  const scene = new T.Scene(); scene.background = new T.Color('#f7f6f2'); scene.fog = new T.Fog('#f7f6f2', 60, 160);
  const cam = new T.PerspectiveCamera(58, vw / vh, .05, 300);

  // ---------- the hall ----------
  const wallMat = new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#efece6', emissiveIntensity: .45, roughness: .95 });
  const floorMat = new T.MeshStandardMaterial({ color: '#d4cfc6', roughness: .28, metalness: .04 });
  const floor = new T.Mesh(new T.PlaneGeometry(G.W, G.L + 10), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.z = -G.L / 2 + 5; floor.receiveShadow = true; scene.add(floor);
  // polished concrete: mottled, flecked, no seams
  {
    const fc = mk(1024, 1024), fg = fc.getContext('2d');
    fg.fillStyle = '#dcd7cf'; fg.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 90; i++) { // soft clouds of darker / lighter trowelling
      const x = Math.random() * 1024, y = Math.random() * 1024, r = 60 + Math.random() * 220, dark = Math.random() < .55;
      const gr = fg.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, dark ? 'rgba(120,112,100,.045)' : 'rgba(255,252,246,.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      fg.fillStyle = gr; for (const dx of [-1024, 0, 1024]) for (const dy of [-1024, 0, 1024]) { fg.save(); fg.translate(dx, dy); fg.fillRect(x - r, y - r, r * 2, r * 2); fg.restore(); }
    }
    for (let i = 0; i < 9000; i++) { // aggregate flecks
      const v = Math.random() < .5 ? 90 + Math.random() * 60 : 230 + Math.random() * 25;
      fg.fillStyle = `rgba(${v},${v - 4},${v - 10},${.25 + Math.random() * .35})`; const r = Math.random() * 1.6 + .3;
      fg.fillRect(Math.random() * 1024, Math.random() * 1024, r, r);
    }
    const ftex = new T.CanvasTexture(fc); ftex.colorSpace = T.SRGBColorSpace; ftex.wrapS = ftex.wrapT = T.RepeatWrapping; ftex.repeat.set(G.W / 6, (G.L + 10) / 6); ftex.anisotropy = 8;
    const rtex = new T.CanvasTexture(fc); rtex.wrapS = rtex.wrapT = T.RepeatWrapping; rtex.repeat.copy(ftex.repeat);
    floorMat.map = ftex; floorMat.roughnessMap = rtex; floorMat.color.set('#ffffff'); floorMat.roughness = .55; floorMat.needsUpdate = true;
  }

  // ---------- the centrepiece: glossy drooping forms with a cluster of red beads, mid-hall ----------
  loadSculpture(T).then(sc => { if (!sc || !scene) return; const o = sc.clone(); o.position.set(0, 0, -Math.min(G.L * .42, 18)); o.rotation.y = .5; scene.add(o); });
  const wall = (w, h, x, y, z, ry) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), wallMat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m; };
  wall(G.L + 10, G.H, -G.W / 2, G.H / 2, -G.L / 2 + 5, Math.PI / 2);
  wall(G.L + 10, G.H, G.W / 2, G.H / 2, -G.L / 2 + 5, -Math.PI / 2);
  wall(G.W, G.H, 0, G.H / 2, -G.L, 0);
  wall(G.W, G.H, 0, G.H / 2, 5, Math.PI);
  // baseboards
  const base = new T.MeshStandardMaterial({ color: '#e4e0d8', roughness: .9 });
  [[-G.W / 2 + .01, Math.PI / 2], [G.W / 2 - .01, -Math.PI / 2]].forEach(([x, ry]) => { const b = new T.Mesh(new T.PlaneGeometry(G.L + 10, .12), base); b.position.set(x, .06, -G.L / 2 + 5); b.rotation.y = ry; scene.add(b); });
  // ceiling with long skylights
  const ceilMat = new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#e9e6df', emissiveIntensity: .6, roughness: 1 });
  const ceil = new T.Mesh(new T.PlaneGeometry(G.W, G.L + 10), ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, G.H, -G.L / 2 + 5); scene.add(ceil);
  const sky = new T.MeshBasicMaterial({ color: '#ffffff' });
  for (let z = 0; z > -G.L + 2; z -= 6) for (const x of [-4.5, 0, 4.5]) { const s = new T.Mesh(new T.PlaneGeometry(3.4, 4.6), sky); s.rotation.x = Math.PI / 2; s.position.set(x, G.H - .01, z - 3); scene.add(s); }
  // light
  const hemi = new T.HemisphereLight(0xffffff, 0xe2ddd3, 2.1); scene.add(hemi);
  const sun = new T.DirectionalLight(0xfff6ea, 1.6); sun.position.set(6, 30, 8); sun.target.position.set(0, 0, -G.L / 2);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -.0003;
  Object.assign(sun.shadow.camera, { left: -G.W, right: G.W, top: G.L / 1.3, bottom: -G.L / 1.3, near: 1, far: 90 }); sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun); scene.add(sun.target);

  // ---------- lighting moods: day · dusk · party · disco ----------
  const party = new T.Group(); scene.add(party); party.visible = false;
  const PARTY_COLS = [0xff2d95, 0x22d3ee, 0xffd23f, 0x8b5cf6, 0x34d399];
  const partyLights = PARTY_COLS.map((c, i) => { const l = new T.PointLight(c, 0, 26, 1.3); l.userData.phase = i * 1.3; party.add(l); return l; });
  const ball = new T.Mesh(new T.IcosahedronGeometry(.55, 2), new T.MeshPhongMaterial({ color: '#d9dde3', specular: '#ffffff', shininess: 140, flatShading: true }));
  const string = new T.Mesh(new T.CylinderGeometry(.008, .008, 1.4), new T.MeshBasicMaterial({ color: '#222' }));
  const dots = mk(512, 512), dg = dots.getContext('2d'); dg.fillStyle = '#000'; dg.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 420; i++) { dg.fillStyle = `hsl(${Math.random() * 360},90%,${70 + Math.random() * 25}%)`; dg.beginPath(); dg.arc(Math.random() * 512, Math.random() * 512, 1.5 + Math.random() * 3, 0, Math.PI * 2); dg.fill(); }
  const dotTex = new T.CanvasTexture(dots); dotTex.colorSpace = T.SRGBColorSpace;
  const discoSpots = [0, 1, 2].map(i => { const sp = new T.SpotLight(0xffffff, 0, 60, 1.25, .2, 1); sp.map = dotTex; sp.castShadow = true; sp.shadow.mapSize.set(512, 512); party.add(sp); party.add(sp.target); return sp; });
  const disco = new T.Group(); disco.add(ball); string.position.y = 1.25; disco.add(string); party.add(disco);
  let mood = 'day';
  const MOODS = {
    day:   { hemi: [0xffffff, 0xe2ddd3, 2.1], sun: [0xfff6ea, 1.6, [6, 30, 8]], bg: '#f7f6f2', exp: 1.25, wall: .45, ceil: .6, sky: '#ffffff', dark: false },
    dusk:  { hemi: [0xffd9b0, 0x3a2e28, .7], sun: [0xff8a4a, 2.2, [-24, 7, 6]], bg: '#2c2622', exp: 1.05, wall: .02, ceil: .02, sky: '#4a4060', dark: true },
    party: { hemi: [0x8a7cff, 0x1a1020, .22], sun: [0xffffff, 0, [6, 30, 8]], bg: '#100c18', exp: 1.2, wall: 0, ceil: 0, sky: '#1a1430', dark: true },
    disco: { hemi: [0x6a5cff, 0x08060c, .12], sun: [0xffffff, 0, [6, 30, 8]], bg: '#07060a', exp: 1.25, wall: 0, ceil: 0, sky: '#0c0a14', dark: true },
  };
  const setMood = m => {
    mood = m; const M = MOODS[m];
    hemi.color.set(M.hemi[0]); hemi.groundColor.set(M.hemi[1]); hemi.intensity = M.hemi[2];
    sun.color.set(M.sun[0]); sun.intensity = M.sun[1]; sun.position.set(...M.sun[2]);
    scene.background.set(M.bg); scene.fog.color.set(M.bg); renderer.toneMappingExposure = M.exp;
    wallMat.emissiveIntensity = M.wall; ceilMat.emissiveIntensity = M.ceil; sky.color.set(M.sky);
    party.visible = m === 'party' || m === 'disco'; disco.visible = m === 'disco';
    partyLights.forEach(l => l.intensity = m === 'party' ? 16 : m === 'disco' ? 8 : 0);
    discoSpots.forEach(sp => sp.intensity = m === 'disco' ? 900 : 0);
    $('gallery').classList.toggle('dark', M.dark);
    document.querySelectorAll('#galMood button').forEach(b => b.classList.toggle('on', b.dataset.l === m));
  };
  document.querySelectorAll('#galMood button').forEach(b => b.onclick = () => setMood(b.dataset.l));
  $('galReset').onclick = () => { const to = new T.Vector3(0, G.EYE, 3.6); glide = { from: pos.clone(), to, yawFrom: yaw, yawTo: 0, pitchTo: .02, t0: performance.now(), dur: 1400 }; }; // back to standing at the door, eyes level
  const stepMood = now => { // lights move with you through the hall
    if (!party.visible) return;
    const cz = pos.z - 9, t = now / 1000, fast = mood === 'disco' ? 1.8 : 1;
    partyLights.forEach((l, i) => { const a = t * .9 * fast + l.userData.phase; l.position.set(Math.cos(a) * (G.W / 2 - 2), 2.2 + Math.sin(a * 1.7) * 1.5, cz + Math.sin(a * .8) * 7); });
    disco.position.set(0, G.H - 2.2, cz); ball.rotation.y = t * .9;
    discoSpots.forEach((sp, i) => { sp.position.copy(disco.position); const a = t * .5 + i * 2.1; sp.target.position.set(Math.cos(a) * G.W, G.H * .35, cz + Math.sin(a) * 14); sp.color.setHSL(((t * .05) + i / 3) % 1, .7, .7); });
  };

  // ---------- title wall by the entrance ----------
  const titleCanvas = mk(2400, 900), tg = titleCanvas.getContext('2d');
  tg.fillStyle = '#141414'; tg.font = '300 260px "Instrument Serif", Georgia, serif'; tg.fillText('affective painting', 40, 300);
  tg.font = 'italic 110px "Instrument Serif", Georgia, serif'; tg.fillText('a collective archive', 46, 470);
  tg.font = '500 52px "IBM Plex Mono", monospace'; tg.fillStyle = '#4a4740';
  tg.fillText(`${works.length} voice${works.length === 1 ? '' : 's'} · ${langs.size || 1} language${langs.size === 1 ? '' : 's'} · Gumloop × Linear Design Gallery, San Francisco`, 50, 640);
  tg.fillText('Every visitor leaves behind a piece. Together they make this wall.', 50, 730);
  const tt = new T.CanvasTexture(titleCanvas); tt.colorSpace = T.SRGBColorSpace;
  const title = new T.Mesh(new T.PlaneGeometry(9, 9 * 900 / 2400), new T.MeshBasicMaterial({ map: tt, transparent: true }));
  title.position.set(-G.W / 2 + .02, 3.4, -4.5); title.rotation.y = Math.PI / 2; scene.add(title);

  // ---------- salon hanging: dense clusters packed row by row, end wall first, then the long walls ----------
  const imgsEarly = null;
  const art = [], people = [], loader = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  const imgs = await Promise.all(works.map(w => loader(w.thumb)));
  // walls as strips to pack: [name, length, start offset]
  // each wall packs its own salon cluster; works are dealt round-robin so every wall fills as the archive grows
  const strips = [{ wall: 'end', len: G.W - 3, rows: 6 }, { wall: 'left', len: G.L - 9, rows: 3 }, { wall: 'right', len: G.L - 9, rows: 3 }]
    .map(st => ({ ...st, cursor: 0, row: 0, full: false }));
  const ROW_Y = [1.15, 2.4, 3.65, 4.9, 6.15, 7.4], GAP = .16;
  let deal = 0;
  const place = (pw) => {
    for (let k = 0; k < 3; k++) {
      const st = strips[(deal + k) % 3]; if (st.full) continue;
      if (st.cursor + pw > st.len) { st.cursor = 0; st.row++; if (st.row >= st.rows) { st.full = true; continue; } }
      deal = (deal + k + 1) % 3;
      const at = st.cursor + pw / 2; st.cursor += pw + GAP;
      // side walls pack from the far end toward the door; the end wall from its centre outward
      const along = st.wall === 'end' ? at - st.len / 2 : st.len / 2 - at;
      return { wall: st.wall, along, row: st.row };
    }
    return { wall: 'end', along: rnd(-5, 5), row: 5 };
  };
  works.forEach((w, i) => {
    const rand = seeded(w.id || i), img = imgs[i]; if (!img) return;
    const big = rand() < .16 ? 1.55 : 1, longest = (.8 + rand() * .4) * big, ar = img.width / img.height;
    const pw = ar >= 1 ? longest : longest * ar, ph = ar >= 1 ? longest / ar : longest;
    const sp = place(pw), yc = ROW_Y[sp.row] + (rand() - .5) * .22 + (big > 1 ? .25 : 0);
    const slot = sp.wall === 'end' ? { wall: 'end', x: sp.along, y: yc, z: -G.L + .05 } : { wall: sp.wall, x: (sp.wall === 'left' ? -1 : 1) * (G.W / 2 - .05), y: yc, z: -G.L + 4.5 + (sp.along + (G.L - 9) / 2) };
    const tex = new T.CanvasTexture((() => { const c = mk(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0); return c; })()); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    const m = new T.Mesh(new T.BoxGeometry(pw, ph, .025), [base, base, base, base, new T.MeshStandardMaterial({ map: tex, roughness: .8 }), base]);
    const jx = (rand() - .5) * .08, jy = 0;
    if (slot.wall === 'end') m.position.set(slot.x + jx, slot.y + jy, slot.z + .02);
    else { m.position.set(slot.x - Math.sign(slot.x) * .02, slot.y + jy, slot.z + jx); m.rotation.y = slot.wall === 'left' ? Math.PI / 2 : -Math.PI / 2; }
    m.castShadow = false; m.userData.work = w; scene.add(m); art.push(m); window.__gal = { art, cam }; galWorld = { scene, art, people }; // flush to the wall: no cast shadow
    // the visitor who made it
    const normal = slot.wall === 'end' ? new T.Vector3(0, 0, 1) : new T.Vector3(slot.wall === 'left' ? 1 : -1, 0, 0);
    const d = 1.9 + rand() * 2.4, lateral0 = (rand() - .5) * 1.1;
    for (let k = 0; k < (w.mode === 'duet' ? 2 : 1); k++) { // a duet sends two visitors, side by side
    const lateral = lateral0 + (w.mode === 'duet' ? (k ? .32 : -.32) : 0);
    const side = new T.Vector3(normal.z, 0, -normal.x);
    const spot = m.position.clone().setY(0).addScaledVector(normal, d).addScaledVector(side, lateral);
    spot.x = clamp(spot.x, -G.W / 2 + .7, G.W / 2 - .7); spot.z = clamp(spot.z, -G.L + .7, 3);
    const top = rand() < .4 ? avgColour(img) : PALETTE_TOP[Math.floor(rand() * PALETTE_TOP.length)];
    const f = rig ? makeRigFigure(T, rand, top, PALETTE_LEGS[Math.floor(rand() * PALETTE_LEGS.length)]) : makeFigure(T, rand, top); f.position.copy(spot);
    const face = (o, x, z) => { o.lookAt(x, 0, z); if (!o.userData.rig) o.rotateY(Math.PI); };
    f.userData.face = face; face(f, m.position.x, m.position.z); // stand facing the work, back to us
    f.userData = { ...f.userData, work: w, home: spot.clone(), phase: rand() * 6, art: m };
    f.traverse(o => { if (o.isMesh) o.userData.work = w; });
    scene.add(f); people.push(f);
    }
  });
  // the newest visitor walks in from the door
  const newest = people.length ? people[people.length - 1] : null;
  if (newest && focusNewest) { newest.userData.walk = { from: new T.Vector3(rnd(-2, 2), 0, 2.5), t0: performance.now() + 900, dur: Math.max(4000, newest.userData.home.distanceTo(new T.Vector3(0, 0, 2.5)) * (newest.userData.rig ? 820 : 650)) }; if (newest.userData.rig) { newest.userData.idle.stop(); newest.userData.walkAction.play(); newest.userData.walking = true; } newest.position.copy(newest.userData.walk.from); }

  // ---------- walking & looking ----------
  let yaw = 0, pitch = .02, pos = new T.Vector3(0, G.EYE, 3.6), glide = null;
  if (newest && focusNewest) { const p = newest.userData.home; const to = new T.Vector3(p.x * .25, G.EYE, clamp(p.z + 7.5, -G.L + 8, 3.6)); glide = { to, yawTo: Math.atan2(-(p.x - to.x), -(p.z - to.z)), t0: performance.now() + 1800, dur: 6500, from: pos.clone(), yawFrom: yaw }; }
  const keys = new Set(); let dragging = false, moved = 0, lx = 0, ly = 0;
  const el = renderer.domElement;
  const down = e => { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; el.setPointerCapture && el.setPointerCapture(e.pointerId); };
  const move = e => {
    if (dragging) { const dx = e.clientX - lx, dy = e.clientY - ly; moved += Math.abs(dx) + Math.abs(dy); yaw -= dx * .0042; pitch = clamp(pitch - dy * .0032, -.9, .9); lx = e.clientX; ly = e.clientY; glide = null; }
    hover(e);
  };
  const up = e => { dragging = false; if (moved < 6) click(e); };
  const wheel = e => { e.preventDefault(); step(-e.deltaY * .012); glide = null; };
  const kd = e => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key) && $('gallery').classList.contains('show')) { keys.add(e.key.toLowerCase()); e.preventDefault(); glide = null; } };
  const ku = e => keys.delete(e.key.toLowerCase());
  const onResize = () => { renderer.setSize(window.innerWidth, window.innerHeight); cam.aspect = window.innerWidth / window.innerHeight; cam.updateProjectionMatrix(); };
  function step(d, strafe = 0) {
    const f = new T.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), r = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    pos.addScaledVector(f, d).addScaledVector(r, strafe);
    pos.x = clamp(pos.x, -G.W / 2 + .8, G.W / 2 - .8); pos.z = clamp(pos.z, -G.L + .8, 4.2);
  }
  // hover & click
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  const pick = e => { const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); const hit = ray.intersectObjects([...art, ...people], true)[0]; return hit && hit.object.userData.work ? hit : null; };
  function hover(e) {
    const hit = pick(e), tip = $('galTip');
    if (!hit) { tip.style.display = 'none'; el.style.cursor = dragging ? 'grabbing' : 'grab'; return; }
    const w = hit.object.userData.work; el.style.cursor = 'pointer';
    tip.innerHTML = `<b>No. ${pad3(w.no)}${w.name ? ' — ' + escapeHtml(w.name) : ''}</b>${w.question ? `<span>“${escapeHtml(w.question)}”</span>` : ''}<span>${w.mode === 'paint' ? 'paint' : 'collage'} · ${new Date(w.at).toLocaleDateString()}</span>`;
    tip.style.display = 'flex'; tip.style.left = (e.clientX + 16) + 'px'; tip.style.top = (e.clientY + 12) + 'px';
  }
  function click(e) {
    const hit = pick(e); if (!hit) return;
    const w = hit.object.userData.work, a = art.find(m => m.userData.work === w);
    if (a) { // walk up to the piece
      const n = new T.Vector3(0, 0, 1).applyQuaternion(a.quaternion).setY(0).normalize(), to = a.position.clone().addScaledVector(n, 2.6).setY(G.EYE);
      glide = { from: pos.clone(), to, yawFrom: yaw, yawTo: Math.atan2(-n.x, -n.z) + Math.PI, t0: performance.now(), dur: 1400, pitchTo: clamp(Math.atan2(a.position.y - G.EYE, 2.6), -.5, .6) };
    }
    showGalCard(w);
  }
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  el.addEventListener('wheel', wheel, { passive: false }); window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('resize', onResize);
  // on-screen walking for phones
  const hold = (id, fn) => { const b = $(id); let iv; b.onpointerdown = e => { e.preventDefault(); glide = null; iv = setInterval(fn, 16); }; b.onpointerup = b.onpointerleave = () => clearInterval(iv); };
  hold('galFwd', () => step(.09)); hold('galBack', () => step(-.09)); hold('galLeft', () => { yaw += .025; }); hold('galRight', () => { yaw -= .025; });

  let raf, last = performance.now();
  const tick = () => {
    const now = performance.now(), dt = Math.min(50, now - last); last = now;
    const sp = .0055 * dt;
    if (keys.has('arrowup') || keys.has('w')) step(sp); if (keys.has('arrowdown') || keys.has('s')) step(-sp);
    if (keys.has('a')) step(0, -sp); if (keys.has('d')) step(0, sp);
    if (keys.has('arrowleft')) yaw += .0022 * dt; if (keys.has('arrowright')) yaw -= .0022 * dt;
    if (glide && now > glide.t0) {
      const k = easeOut(clamp((now - glide.t0) / glide.dur, 0, 1));
      pos.lerpVectors(glide.from, glide.to, k);
      let dy = glide.yawTo - glide.yawFrom; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw = glide.yawFrom + dy * k;
      if (glide.pitchTo != null) pitch = lerp(pitch, glide.pitchTo, .08);
      if (k >= 1) glide = null;
    }
    // visitors breathe and shift their weight; the newest walks in
    for (const f of people) {
      const u = f.userData;
      if (u.mixer) u.mixer.update(dt / 1000);
      if (u.walk && typeof u.walk.t0 === 'number' && u.walk.from) {
        const k = clamp((now - u.walk.t0) / u.walk.dur, 0, 1), ease = u.rig ? k : easeOut(k);
        if (u.rig && k > 0 && !u.walking) { u.walking = true; u.walkAction.reset().play(); }
        if (k > 0) { f.position.lerpVectors(u.walk.from, u.home, ease); if (!u.rig) f.position.y = Math.abs(Math.sin(k * u.walk.dur / 260)) * .035 * (1 - k); }
        const look = k < .9 ? u.home : u.art.position; u.face(f, look.x, look.z);
        if (k >= 1) {
          delete u.walk; u.face(f, u.art.position.x, u.art.position.z);
          if (u.rig) { u.idle.reset().play(); u.walkAction.crossFadeTo(u.idle, .5, false); }
        }
      } else if (!u.rig) f.rotation.z = Math.sin(now / 1900 + u.phase) * .012;
    }
    cam.position.copy(pos); cam.rotation.set(0, 0, 0, 'YXZ'); cam.rotation.order = 'YXZ'; cam.rotation.y = yaw; cam.rotation.x = pitch;
    stepMood(now); if (!galPaused) renderer.render(scene, cam); raf = requestAnimationFrame(tick);
  };
  tick();
  gal = { stop: () => { cancelAnimationFrame(raf); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('wheel', wheel); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('resize', onResize); renderer.dispose(); } };
  $('galCount').textContent = `${works.length} voice${works.length === 1 ? '' : 's'} · ${langs.size || 0} language${langs.size === 1 ? '' : 's'}`;
  $('galNote').textContent = works.length ? (focusNewest && newest ? 'the newest visitor is walking in · drag to look · scroll or arrow keys to walk · click a piece' : 'drag to look · scroll or arrow keys to walk · click a piece') : 'the hall is empty — the first piece will hang here';
}
function closeGallery(keepOpen) {
  closeRelief();
  if (gal) { gal.stop(); gal = null; }
  if (!keepOpen) { $('gallery').classList.remove('show'); document.body.classList.remove('in3d'); $('galCard').classList.remove('show'); $('galTip').style.display = 'none'; }
}
async function showGalCard(w) {
  const full = await getWork(w.id); if (!full) return;
  const u = URL.createObjectURL(full.img); $('galImg').src = u;
  $('galTitle').textContent = `No. ${pad3(full.no)}${full.name ? ' — ' + full.name : ''}`;
  $('galMeta').textContent = [full.question ? `Asked: ${full.question}` : '', full.parentNo ? `after No. ${pad3(full.parentNo)}${full.parentName ? ' by ' + full.parentName : ''}` : '', full.words && full.words.length ? `Said: “${full.words.join(' ')}”` : ''].filter(Boolean).join('\n');
  $('galDownload').onclick = () => shareOrDownload(full.img, fileBase(full) + '.jpg');
  $('galVideo').style.display = full.video ? '' : 'none';
  $('galVideo').onclick = () => full.video && shareOrDownload(full.video, fileBase(full) + (full.video.type.includes('mp4') ? '.mp4' : '.webm'));
  $('galRemix').onclick = () => { closeGallery(); startRemix(full); };
  $('gal3d').onclick = () => openRelief(full);
  const del = $('galDelete'); del.textContent = 'Delete'; del.classList.remove('confirm');
  del.onclick = async () => {
    if (!del.classList.contains('confirm')) { del.classList.add('confirm'); del.textContent = 'Really delete?'; return; }
    await deleteWork(full.id); $('galCard').classList.remove('show');
    if (galWorld) { // take the piece off the wall and send its visitor(s) home
      for (const list of [galWorld.art, galWorld.people]) for (let i = list.length - 1; i >= 0; i--) if (list[i].userData.work && list[i].userData.work.id === full.id) { galWorld.scene.remove(list[i]); list.splice(i, 1); }
    }
    if (galWorld) $('galCount').textContent = `${galWorld.art.length} voice${galWorld.art.length === 1 ? '' : 's'}`;
  };
  $('galCard').classList.add('show');
}
$('galCardClose').onclick = () => $('galCard').classList.remove('show');
$('galClose').onclick = () => closeGallery();
$('galList').onclick = () => { closeGallery(); openArchive(); };

// ---------- a single piece in 3D: the flat image lifted into a relief you can turn in raking light ----------
async function openRelief(full) {
  const T = three; if (!T || !full || !full.img) return;
  closeRelief(); galPaused = true; $('relief').classList.add('show'); $('galCard').classList.remove('show'); $('galTip').style.display = 'none';
  const bmp = await createImageBitmap(full.img), s = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s), c = mk(w, h), g = c.getContext('2d'); g.drawImage(bmp, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  // height = how far a pixel is from the ground colour (sampled in the corners), softened, plus a little texture
  const corner = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]].map(([x, y]) => { const i = (y * w + x) * 4; return [px[i], px[i + 1], px[i + 2]]; });
  const bg = [0, 1, 2].map(k => corner.map(c2 => c2[k]).sort((a, b) => a - b)[1]);
  const hc = mk(w, h), hg = hc.getContext('2d'), hd = hg.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2], dist = Math.hypot(r - bg[0], gg - bg[1], b - bg[2]) / 1.6, lum = (r * .3 + gg * .59 + b * .11);
    const v = clamp(dist * .85 + (255 - lum) * .12, 0, 255); hd.data[i * 4] = hd.data[i * 4 + 1] = hd.data[i * 4 + 2] = v; hd.data[i * 4 + 3] = 255;
  }
  hg.putImageData(hd, 0, 0);
  const soft = mk(w, h), sg = soft.getContext('2d'); sg.filter = 'blur(1.6px)'; sg.drawImage(hc, 0, 0); const H = sg.getImageData(0, 0, w, h).data;
  const host = $('reliefCanvas'), vw = window.innerWidth, vh = window.innerHeight;
  const renderer = new T.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(vw, vh);
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; host.innerHTML = ''; host.appendChild(renderer.domElement);
  const scene = new T.Scene(); scene.background = new T.Color('#1b1917');
  const cam = new T.PerspectiveCamera(34, vw / vh, .01, 50);
  const PW = 2, PH = PW * h / w, SX = Math.min(320, w), SY = Math.round(SX * h / w);
  const geo = new T.PlaneGeometry(PW, PH, SX, SY), pa = geo.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const u = (pa.getX(i) / PW + .5), v = 1 - (pa.getY(i) / PH + .5), x = clamp(Math.round(u * (w - 1)), 0, w - 1), y = clamp(Math.round(v * (h - 1)), 0, h - 1);
    pa.setZ(i, H[(y * w + x) * 4] / 255 * .11);
  }
  geo.computeVertexNormals();
  const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const piece = new T.Mesh(geo, new T.MeshStandardMaterial({ map, roughness: .78, metalness: 0 })); piece.castShadow = piece.receiveShadow = true;
  const slab = new T.Mesh(new T.BoxGeometry(PW, PH, .04), new T.MeshStandardMaterial({ color: '#2a2724', roughness: .9 })); slab.position.z = -.021; slab.receiveShadow = true;
  const group = new T.Group(); group.add(piece, slab); scene.add(group);
  const wallBack = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshStandardMaterial({ color: '#232120', roughness: 1 })); wallBack.position.z = -.6; wallBack.receiveShadow = true; scene.add(wallBack);
  scene.add(new T.HemisphereLight(0xfff4e6, 0x202024, .55));
  const key = new T.DirectionalLight(0xfff1dd, 3); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0005; key.shadow.normalBias = .01;
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: .1, far: 10 }); key.shadow.camera.updateProjectionMatrix(); scene.add(key);
  let yaw = -.35, pitch = .12, dist = Math.max(PW, PH) * 1.55, touched = false, drag = null, raf = 0;
  const el = renderer.domElement;
  el.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; touched = true; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; };
  el.onpointermove = e => { if (!drag) return; yaw = clamp(drag.yaw + (e.clientX - drag.x) * .006, -1.3, 1.3); pitch = clamp(drag.pitch + (e.clientY - drag.y) * .004, -.9, .9); };
  el.onpointerup = () => { drag = null; el.style.cursor = ''; };
  el.onwheel = e => { e.preventDefault(); touched = true; dist = clamp(dist * (1 + e.deltaY * .001), .6, 8); };
  const t0 = performance.now();
  const loop = () => {
    const t = (performance.now() - t0) / 1000;
    if (!touched) yaw = -.35 + Math.sin(t * .35) * .35;
    group.rotation.set(pitch, yaw, 0);
    const la = t * .45; key.position.set(Math.cos(la) * 3, 1.6 + Math.sin(la * .7) * .8, 1.4); // the light rakes slowly across
    cam.position.set(0, 0, dist); cam.lookAt(0, 0, 0);
    renderer.render(scene, cam); raf = requestAnimationFrame(loop);
  };
  loop();
  const onResize = () => { renderer.setSize(window.innerWidth, window.innerHeight); cam.aspect = window.innerWidth / window.innerHeight; cam.updateProjectionMatrix(); };
  window.addEventListener('resize', onResize);
  relief = { stop: () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); renderer.dispose(); geo.dispose(); map.dispose(); host.innerHTML = ''; } };
}
function closeRelief() { if (relief) { relief.stop(); relief = null; } galPaused = false; $('relief').classList.remove('show'); }
$('reliefBack').onclick = () => closeRelief();
