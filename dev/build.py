"""Build step: list every image in /media into js/sources.js and stamp script URLs so browsers fetch fresh copies."""
import json, pathlib, re, hashlib
root = pathlib.Path(__file__).parent.parent
media = sorted(p.name for p in (root / 'media').glob('*.jpg'))
sources = {p.rsplit('.', 1)[0]: f'media/{p}' for p in media}
(root / 'js' / 'sources.js').write_text('window.SOURCES = ' + json.dumps(sources, indent=0) + ';\n')
h = hashlib.sha1(b''.join((root / 'js' / f).read_bytes() for f in sorted(p.name for p in (root / 'js').glob('*.js')))).hexdigest()[:8]
idx = root / 'index.html'
idx.write_text(re.sub(r'src="js/([a-z]+)\.js(\?v=[0-9a-f]+)?"', lambda m: f'src="js/{m.group(1)}.js?v={h}"', idx.read_text()))
print(f'{len(sources)} images · scripts v={h}')
