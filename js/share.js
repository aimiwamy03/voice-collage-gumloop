// Take it home: each finished piece is uploaded to a public image bucket, and a QR code on screen opens it on the guest's phone.
// The key below is a *publishable* key (safe in a web page by design: the bucket only allows image uploads). Never put a secret key here.
const shareReady = () => !!(SHARE.url && SHARE.key);
let sharePath = null, shareTimer = null;

async function uploadPiece(blob) {
  if (!shareReady() || !blob) return null;
  const res = await fetch(`${SHARE.url}/storage/v1/object/${SHARE.bucket}/${sharePath}`, {
    method: 'POST', body: blob,
    headers: { apikey: SHARE.key, Authorization: 'Bearer ' + SHARE.key, 'Content-Type': 'image/jpeg', 'x-upsert': 'false', 'cache-control': '30' },
  });
  if (!res.ok) throw new Error('upload ' + res.status);
  return `${SHARE.url}/storage/v1/object/public/${SHARE.bucket}/${sharePath}`;
}
function takeLink() { // short link → a less dense QR that phones read instantly
  return new URL('take.html', location.href).href + '?p=' + encodeURIComponent(sharePath);
}
function drawQR(canvas, text) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), quiet = 2, s = Math.floor(canvas.width / (n + quiet * 2)), off = Math.floor((canvas.width - s * n) / 2), g = canvas.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); g.fillStyle = '#151412';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(off + c * s, off + r * s, s, s);
}
// called when a piece is finished (and again, debounced, whenever it changes afterwards)
async function shareFinished(blob, no, name, fresh) {
  const box = $('takeHome');
  if (!shareReady()) { box.classList.remove('show'); return; }
  if (fresh) { box.classList.remove('open'); sharePath = `qr-uploads/${String(no).padStart(3, '0')}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`; box.classList.remove('show'); $('takeNote').textContent = 'preparing…'; }
  try {
    const pub = await uploadPiece(blob); if (!pub) return;
    drawQR($('takeQR'), takeLink());
    $('takeNote').textContent = 'scan to take it home'; box.classList.add('show');
  } catch (e) { console.warn(e); if (!fresh) return; /* an update failed: keep the first, working link */ $('takeNote').textContent = 'offline — can’t make a link'; box.classList.add('show'); }
}
function shareChanged(blob, no, name) { clearTimeout(shareTimer); shareTimer = setTimeout(() => shareFinished(blob, no, name, false), 900); }
function shareHide() { $('takeHome').classList.remove('show', 'open'); sharePath = null; }
$('takeBtn').onclick = e => { e.stopPropagation(); $('takeHome').classList.toggle('open'); };
document.addEventListener('pointerdown', e => { if (!$('takeHome').contains(e.target)) $('takeHome').classList.remove('open'); });
