import base64, json, pathlib
src = pathlib.Path(__file__).with_name('index.src.html').read_text()
d = {}
for k in ['action','street','portrait','bike','yellow','green']:
    d[k] = 'data:image/jpeg;base64,' + base64.b64encode(pathlib.Path(__file__).with_name('src')/f'{k}.jpg'.read_bytes()).decode()
out = src.replace('/*SOURCES*/', json.dumps(d))
pathlib.Path(__file__).parent.parent/'index.html'.write_text(out)
print(len(out))
