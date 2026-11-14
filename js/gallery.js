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

async function openGallery(focusNewest) {
  $('gallery').classList.add('show'); document.body.classList.add('in3d');
  $('galNote').textContent = 'hanging the work…';
  try { three = three || await import(new URL('js/vendor/three.module.min.js', location.href).href); }
  catch (e) { try { three = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js'); } catch (e2) { $('galNote').textContent = 'Couldn’t load 3D.'; return; } }
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
  // polished concrete: faint seams
  const seams = new T.Group(); const seamMat = new T.MeshBasicMaterial({ color: '#a29d93' });
  for (let z = 4; z > -G.L; z -= 4) { const m = new T.Mesh(new T.PlaneGeometry(G.W, .012), seamMat); m.rotation.x = -Math.PI / 2; m.position.set(0, .002, z); seams.add(m); }
  scene.add(seams);
  const wall = (w, h, x, y, z, ry) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), wallMat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m; };
  wall(G.L + 10, G.H, -G.W / 2, G.H / 2, -G.L / 2 + 5, Math.PI / 2);
  wall(G.L + 10, G.H, G.W / 2, G.H / 2, -G.L / 2 + 5, -Math.PI / 2);
  wall(G.W, G.H, 0, G.H / 2, -G.L, 0);
  wall(G.W, G.H, 0, G.H / 2, 5, Math.PI);
  // baseboards
  const base = new T.MeshStandardMaterial({ color: '#e4e0d8', roughness: .9 });
  [[-G.W / 2 + .01, Math.PI / 2], [G.W / 2 - .01, -Math.PI / 2]].forEach(([x, ry]) => { const b = new T.Mesh(new T.PlaneGeometry(G.L + 10, .12), base); b.position.set(x, .06, -G.L / 2 + 5); b.rotation.y = ry; scene.add(b); });
  // ceiling with long skylights
  const ceil = new T.Mesh(new T.PlaneGeometry(G.W, G.L + 10), new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#e9e6df', emissiveIntensity: .6, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, G.H, -G.L / 2 + 5); scene.add(ceil);
  const sky = new T.MeshBasicMaterial({ color: '#ffffff' });
  for (let z = 0; z > -G.L + 2; z -= 6) for (const x of [-4.5, 0, 4.5]) { const s = new T.Mesh(new T.PlaneGeometry(3.4, 4.6), sky); s.rotation.x = Math.PI / 2; s.position.set(x, G.H - .01, z - 3); scene.add(s); }
  // light
  scene.add(new T.HemisphereLight(0xffffff, 0xe2ddd3, 2.1));
  const sun = new T.DirectionalLight(0xfff6ea, 1.6); sun.position.set(6, 30, 8); sun.target.position.set(0, 0, -G.L / 2);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -.0003;
  Object.assign(sun.shadow.camera, { left: -G.W, right: G.W, top: G.L / 1.3, bottom: -G.L / 1.3, near: 1, far: 90 }); sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun); scene.add(sun.target);

  // ---------- title wall by the entrance ----------
  const titleCanvas = mk(2400, 900), tg = titleCanvas.getContext('2d');
  tg.fillStyle = '#141414'; tg.font = '300 260px "Instrument Serif", Georgia, serif'; tg.fillText('voice → collage', 40, 300);
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
    m.castShadow = true; m.userData.work = w; scene.add(m); art.push(m); window.__gal = { art, cam };
    // the visitor who made it
    const normal = slot.wall === 'end' ? new T.Vector3(0, 0, 1) : new T.Vector3(slot.wall === 'left' ? 1 : -1, 0, 0);
    const d = 1.9 + rand() * 2.4, lateral = (rand() - .5) * 1.1;
    const side = new T.Vector3(normal.z, 0, -normal.x);
    const spot = m.position.clone().setY(0).addScaledVector(normal, d).addScaledVector(side, lateral);
    spot.x = clamp(spot.x, -G.W / 2 + .7, G.W / 2 - .7); spot.z = clamp(spot.z, -G.L + .7, 3);
    const top = rand() < .4 ? avgColour(img) : PALETTE_TOP[Math.floor(rand() * PALETTE_TOP.length)];
    const f = makeFigure(T, rand, top); f.position.copy(spot);
    f.lookAt(m.position.x, 0, m.position.z); f.rotateY(Math.PI); // stand facing the work, back to us
    f.userData = { ...f.userData, work: w, home: spot.clone(), phase: rand() * 6, art: m };
    f.traverse(o => { if (o.isMesh) o.userData.work = w; });
    scene.add(f); people.push(f);
  });
  // the newest visitor walks in from the door
  const newest = people.length ? people[people.length - 1] : null;
  if (newest && focusNewest) { newest.userData.walk = { from: new T.Vector3(rnd(-2, 2), 0, 2.5), t0: performance.now() + 900, dur: Math.max(4000, newest.userData.home.distanceTo(new T.Vector3(0, 0, 2.5)) * 650) }; newest.position.copy(newest.userData.walk.from); }

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
      if (u.walk) {
        const k = clamp((now - u.walk.t0) / u.walk.dur, 0, 1);
        if (k > 0) { f.position.lerpVectors(u.walk.from, u.home, easeOut(k)); f.position.y = Math.abs(Math.sin(k * u.walk.dur / 260)) * .035 * (1 - k); }
        const look = k < .85 ? u.home : u.art.position; f.lookAt(look.x, 0, look.z); f.rotateY(Math.PI);
        if (k >= 1) { delete u.walk; f.lookAt(u.art.position.x, 0, u.art.position.z); f.rotateY(Math.PI); }
      } else f.rotation.z = Math.sin(now / 1900 + u.phase) * .012;
    }
    cam.position.copy(pos); cam.rotation.set(0, 0, 0, 'YXZ'); cam.rotation.order = 'YXZ'; cam.rotation.y = yaw; cam.rotation.x = pitch;
    renderer.render(scene, cam); raf = requestAnimationFrame(tick);
  };
  tick();
  gal = { stop: () => { cancelAnimationFrame(raf); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('wheel', wheel); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('resize', onResize); renderer.dispose(); } };
  $('galCount').textContent = `${works.length} voice${works.length === 1 ? '' : 's'} · ${langs.size || 0} language${langs.size === 1 ? '' : 's'}`;
  $('galNote').textContent = works.length ? (focusNewest && newest ? 'the newest visitor is walking in · drag to look · scroll or arrow keys to walk · click a piece' : 'drag to look · scroll or arrow keys to walk · click a piece') : 'the hall is empty — the first piece will hang here';
}
function closeGallery(keepOpen) {
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
  $('galCard').classList.add('show');
}
$('galCardClose').onclick = () => $('galCard').classList.remove('show');
$('galClose').onclick = () => closeGallery();
$('galList').onclick = () => { closeGallery(); openArchive(); };
