// The centrepiece. buildSculpture(T, MarchingCubes, variant) → THREE.Group standing on its own plinth, origin at floor level.
// Forms are metaballs (shapes that melt into each other), glazed and glossy.
export const VARIANTS = ['arch', 'arch-limb', 'bubbles', 'ring', 'knot'];

export function buildSculpture(T, MarchingCubes, variant = 'arch') {
  const celadon = new T.MeshPhysicalMaterial({ color: '#a9d6c8', roughness: .18, metalness: 0, clearcoat: 1, clearcoatRoughness: .08 });
  const blush = new T.MeshPhysicalMaterial({ color: '#e8a8b2', roughness: .16, metalness: 0, clearcoat: 1, clearcoatRoughness: .06 });
  const bead = new T.MeshPhysicalMaterial({ color: '#9b2a20', roughness: .22, clearcoat: 1, clearcoatRoughness: .1 });
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const glaze = variant === 'bubbles' ? blush : celadon;
  const mc = new MarchingCubes(110, glaze, false, false, 200000); mc.isolation = 80; mc.reset();
  const sub = 12, k = .42;
  const ball = (x, y, z, r, kk = 1) => mc.addBall(x, y, z, r * r * (mc.isolation + sub) * kk, sub);
  const stroke = (pts, radius, closed = false, step = .006) => {
    const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)), closed, 'centripetal');
    const n = Math.ceil(c.getLength() / step);
    for (let i = 0; i <= n; i++) { const t = i / n, p = c.getPointAt(t); ball(p.x, p.y, p.z, radius(t, p), k); }
  };
  const drop = (t, tip, base, swell, at = 1) => base + (swell - base) * Math.pow(Math.max(0, 1 - Math.abs(t - at) / tip), 2.2);
  const beads = new T.Group(), sg = new T.SphereGeometry(1, 28, 20);
  const beadCluster = (cx, cy, cz, rx, ry, n, rmin = .016, rmax = .034) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, h = rnd() * 2 - 1, rr = Math.sqrt(1 - h * h), s = .8 + rnd() * .25, b = new T.Mesh(sg, bead), r = rmin + rnd() * (rmax - rmin);
      b.scale.setScalar(r); b.position.set(cx + Math.cos(a) * rr * rx * s, cy + h * ry, cz + Math.sin(a) * rr * rx * s); b.castShadow = true; beads.add(b);
    }
  };
  const arch = () => stroke([[.36, .17, .5], [.35, .3, .5], [.37, .5, .48], [.45, .7, .5], [.6, .77, .52], [.72, .7, .5], [.74, .56, .5], [.68, .45, .5]],
    t => Math.max(drop(t, .3, .028, .15, 0), drop(t, .28, .028, .105, 1)));

  if (variant === 'arch') { // the bulb, the climbing neck, the hanging drop; beads at the neck
    arch();
    stroke([[.33, .34, .5], [.25, .31, .47], [.2, .24, .45]], t => drop(t, .5, .018, .045, 1));
    beadCluster(.385, .47, .49, .05, .085, 70);
  } else if (variant === 'arch-limb') { // as above, plus a pointed limb crossing in from the top left and melting into the bulb
    arch();
    stroke([[.52, .67, .46], [.44, .58, .47], [.4, .45, .5], [.4, .32, .5]], t => Math.max(drop(t, .35, .016, .055, 0), .016));
    beadCluster(.385, .47, .49, .05, .085, 70);
  } else if (variant === 'bubbles') { // a stack of glossy blush spheres that have grown into each other
    const S = [[.5, .22, .5, .17], [.36, .3, .47, .12], [.62, .34, .55, .13], [.47, .44, .5, .15], [.36, .55, .46, .1], [.58, .58, .52, .11],
      [.47, .66, .5, .085], [.28, .2, .52, .07], [.7, .2, .44, .07], [.66, .47, .38, .06], [.41, .74, .52, .05], [.26, .42, .56, .05], [.57, .72, .47, .045]];
    // distinct glossy spheres pressed into each other (not melted), like inflated balloons
    ball(.5, .4, .5, .01); // keeps the metaball mesh valid but invisible inside
    const bg2 = new T.SphereGeometry(1, 64, 48);
    for (const [x, y, z, r] of S) { const m = new T.Mesh(bg2, blush); m.scale.setScalar(r * .96); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; beads.add(m); }
  } else if (variant === 'ring') { // a C of glaze: a smooth heavy curve on the right, a wavering thin curve on the left, a band of beads in between
    const pts = [];
    for (let i = 0; i <= 60; i++) { const a = -Math.PI / 2 + i / 60 * Math.PI * 2; pts.push([.5 + Math.cos(a) * .23, .47 + Math.sin(a) * .3, .5]); }
    stroke(pts, (t, p) => {
      const a = t * Math.PI * 2, right = Math.cos(a - Math.PI / 2 + Math.PI / 2) ; // >0 on the right half
      const side = (p.x - .5) / .23; // -1 left … 1 right
      if (side > 0) return .03 + .05 * side; // heavy right
      return .022 + .02 * Math.max(0, Math.sin(t * Math.PI * 2 * 7)); // wavering left
    }, true);
    // cut a gap for the beads on the right: carve with negative balls
    for (let y = .4; y <= .56; y += .01) mc.addBall(.73, y, .5, -.9, sub);
    beadCluster(.73, .48, .5, .075, .075, 90, .014, .03);
  } else if (variant === 'knot') { // two teardrops looped through each other, one pointing up, one resting on the plinth
    stroke([[.4, .16, .5], [.36, .32, .48], [.42, .55, .5], [.58, .72, .54], [.7, .62, .5], [.62, .44, .46], [.48, .4, .52], [.36, .52, .56], [.34, .7, .5]],
      t => Math.max(drop(t, .25, .02, .13, 0), drop(t, .2, .02, .06, 1)));
    stroke([[.66, .16, .52], [.68, .3, .5], [.6, .5, .5], [.46, .6, .44], [.32, .5, .44]], t => Math.max(drop(t, .3, .018, .09, 0), drop(t, .25, .016, .045, 1)));
  }
  mc.update();
  const form = new T.Mesh(mc.geometry.clone(), glaze); form.castShadow = form.receiveShadow = true;
  const inner = new T.Group(); inner.add(form, beads);
  beads.position.set(-1, -1, -1); beads.scale.setScalar(2); // marching-cubes space is [-1,1]; beads were placed in [0,1]
  inner.scale.setScalar(1.9);
  const ph = .45, plinth = new T.Mesh(new T.CylinderGeometry(1.05, 1.05, ph, 72), new T.MeshStandardMaterial({ color: '#cfc9bf', roughness: .85 }));
  plinth.position.y = ph / 2; plinth.castShadow = plinth.receiveShadow = true;
  inner.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(variant === 'bubbles' ? beads : form), c = bb.getCenter(new T.Vector3());
  inner.position.set(-c.x, ph - bb.min.y + .01, -c.z);
  const sculpt = new T.Group(); sculpt.add(plinth, inner);
  return sculpt;
}
