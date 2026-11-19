// The centrepiece: glossy, drooping forms that melt into each other (metaballs), with a cluster of red beads at the join.
// buildSculpture(T, MarchingCubes) → THREE.Group about 3 m tall, standing on its own plinth, origin at floor level.
export function buildSculpture(T, MarchingCubes) {
  const glaze = new T.MeshPhysicalMaterial({ color: '#a9d6c8', roughness: .18, metalness: 0, clearcoat: 1, clearcoatRoughness: .08, sheen: .3, sheenColor: new T.Color('#e8fff8') });
  const mc = new MarchingCubes(110, glaze, false, false, 160000);
  mc.isolation = 80; mc.reset();
  const sub = 12, k = .42; // spaced balls add up, so each one is weaker than its target radius
  const stroke = (pts, radius, step = .006) => {
    const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)), false, 'centripetal');
    const L = c.getLength(), n = Math.ceil(L / step);
    for (let i = 0; i <= n; i++) { const t = i / n, p = c.getPointAt(t), r = radius(t); mc.addBall(p.x, p.y, p.z, r * r * (mc.isolation + sub) * k, sub); }
  };
  const drop = (t, tip, base, swell, at = 1) => { // a teardrop: thin, then swelling toward `at`
    const d = Math.abs(t - at); return base + (swell - base) * Math.pow(Math.max(0, 1 - d / tip), 2.2);
  };
  // the big arc: a heavy bulb at the bottom left, a neck that climbs and curls over, ending in a hanging drop
  stroke([[.36, .17, .5], [.35, .3, .5], [.37, .5, .48], [.45, .7, .5], [.6, .77, .52], [.72, .7, .5], [.74, .56, .5], [.68, .45, .5]],
    t => Math.max(drop(t, .3, .028, .15, 0), drop(t, .28, .028, .105, 1)));
  // the crossing limb: a pointed drop up top left, sweeping down through the middle to a doubled foot on the right
  stroke([[.5, .66, .46], [.42, .58, .47], [.4, .45, .5], [.5, .35, .52], [.64, .24, .53], [.76, .14, .52]],
    t => Math.max(drop(t, .32, .016, .055, 0), drop(t, .3, .016, .07, 1)));
  stroke([[.62, .26, .55], [.7, .18, .58], [.8, .12, .6]], t => drop(t, .5, .014, .055, 1));
  // a thin tendon from the bulb's shoulder out to the left and down
  stroke([[.33, .34, .5], [.24, .3, .46], [.2, .2, .44], [.24, .11, .45]], t => Math.max(.02, drop(t, .35, .02, .05, 1)));
  mc.update();
  const form = new T.Mesh(mc.geometry.clone(), glaze); form.castShadow = form.receiveShadow = true;
  // beads: a dense, glossy cluster where the arc meets the limb
  const bead = new T.MeshPhysicalMaterial({ color: '#9b2a20', roughness: .22, clearcoat: 1, clearcoatRoughness: .1 });
  const beads = new T.Group(); const sg = new T.SphereGeometry(1, 28, 20);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, h = rnd() * 2 - 1, rr = Math.sqrt(1 - h * h), s = .55 + rnd() * .2;
    const b = new T.Mesh(sg, bead), r = .016 + rnd() * .018;
    b.scale.setScalar(r); b.position.set(.385 + Math.cos(a) * rr * .055 * s, .47 + h * .085, .49 + Math.sin(a) * rr * .055 * s);
    b.castShadow = true; beads.add(b);
  }
  const sculpt = new T.Group(), inner = new T.Group();
  inner.add(form, beads); // marching cubes space is [-1,1]; beads were placed in [0,1] → map them
  beads.position.set(-1, -1, -1); beads.scale.setScalar(2);
  const S = 1.9; inner.scale.setScalar(S);
  const ph = .45, plinth = new T.Mesh(new T.CylinderGeometry(1.05, 1.05, ph, 72), new T.MeshStandardMaterial({ color: '#cfc9bf', roughness: .85 }));
  plinth.position.y = ph / 2; plinth.castShadow = plinth.receiveShadow = true;
  // sit the lowest point of the form on the plinth, centred over it
  inner.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(form), c = bb.getCenter(new T.Vector3());
  inner.position.set(-c.x, ph - bb.min.y + .01, -c.z);
  sculpt.add(plinth, inner);
  return sculpt;
}
