"""Build index.html from dev/index.src.html.
Images are served as separate files from /media (listed here), not inlined."""
import json, pathlib
here = pathlib.Path(__file__).parent
root = here.parent
media = sorted(p.name for p in (root / 'media').glob('*.jpg'))
sources = {p.rsplit('.', 1)[0]: f'media/{p}' for p in media}
src = (here / 'index.src.html').read_text()
(root / 'index.html').write_text(src.replace('/*SOURCES*/', json.dumps(sources, indent=0)))
print(f'built index.html with {len(sources)} images')
