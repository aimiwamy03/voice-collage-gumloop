# voice → collage

Speak in any language; your voice tears paper. Built for the Gumloop × Linear Design Gallery (Nov 19, 2026).

- Volume → size of each scrap · pitch → height and lightness · a held sound → a long strip · words → cut-out letters · silence → glue
- Live words use Deepgram Nova-3 (multilingual). Paste your key in the page ("Words: off · add Deepgram key"); it's stored only in that browser.
- `index.html` is the built page. Edit `dev/index.src.html`, then run `python3 dev/build.py`; it lists every image in `media/` as source paper.
- `media/` holds web-size copies (≤1000px) of Aimi's work from rienespecial.com. Images on white backgrounds are split into separate pieces (`__partN`).
