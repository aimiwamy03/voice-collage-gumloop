import base64, json, pathlib
here = pathlib.Path(__file__).parent
src = (here / 'index.src.html').read_text()
d = {}
for k in ['action', 'street', 'portrait', 'bike', 'yellow', 'green']:
    d[k] = 'data:image/jpeg;base64,' + base64.b64encode((here / 'src' / f'{k}.jpg').read_bytes()).decode()
(here.parent / 'index.html').write_text(src.replace('/*SOURCES*/', json.dumps(d)))
print('built index.html')
