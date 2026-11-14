# voice → collage

Speak in any language; your voice tears paper from Aimi's archive. Built for the Gumloop × Linear Design Gallery (Nov 19, 2026).
Live: https://aimiwamy03.github.io/voice-collage-gumloop/

- **Voice → paper:** volume, pitch, brightness, speed, breath and pauses drive size, height, colour and more (patch bay in the studio).
- **Words → cut-out letters** via Deepgram Nova-3 multilingual; paste your key in the page (stored only in that browser).
- **Language → archive:** each spoken language tears from its own part of the archive (editable in the studio).
- **Studio:** press `S` (or triple-tap “No.”). Every lever: canvas shape, paper, colours, text modes, image treatments, scrap shapes, edges, attachments, layouts, motion, effects, 3D, recording, MIDI knobs. `W` opens tonight's wall.
- **Outputs:** image, stop-motion video with the voice, listen mode (tap a scrap to hear its moment), 3D sculpture + turntable video.

## Archive, signing and remix
Every finished piece is saved on the device (IndexedDB) at full size with its video, words, languages and exact settings. Guests can sign with a name before or after (it goes into the caption), open **Archive** to download any piece or its video, and **Remix** it: the piece loads with its settings and the next voice goes on top, credited “after No. 004 by Maya”. In the studio (`S`), the archive also offers *Download everything (.zip)* and delete.

## Paint mode
Choose **Paint** on the start screen. The voice drags oil paint across linen: pitch × brightness picks the pigment (umber, Prussian blue, vermilion…), and words that name or evoke a colour in English, French, Spanish, Chinese, Korean or Japanese (sea/mer/海/바다, love/amour/爱/사랑, night/nuit/夜/밤…) switch the paint for a few seconds. Loud, rough, breathy sound builds a scratch level that gouges through the wet paint; past a threshold, words are carved (sgraffito) instead of painted. Studio → *Mode & paint* has brush, impasto, scratchiness, letters, story colour and drips.

## Files
- `index.html` — markup and styles
- `js/params.js` — defaults, presets, the studio schema
- `js/paint.js` — paint mode: brush strokes, pigments, story colour lexicon, scratching, painted/carved letters
- `js/engine.js` — drawing: shapes, paper, scraps, words, layouts, attachments, effects
- `js/audio.js` — mic/file input, voice features, patch bay, Deepgram, recording, session flow
- `js/ui.js` — controls, studio, wall, 3D sculpture, listen mode, MIDI
- `js/vendor/three.module.min.js` — three.js r160 (MIT), bundled so 3D works offline
- `js/vendor/jszip.min.js` — JSZip 3.10 (MIT), for the archive export
- `media/` — web-size copies of Aimi's work; `python3 dev/build.py` regenerates `js/sources.js`

## Duet (experimental track) — `/duet/`
Two people, one painting. Each voice paints in its own family of colour (warm earths / cool blues).
- **Talking over each other** scrapes through the paint to a hidden photo from the archive; an **interruption** cuts one long scrape.
- **Holding the floor** (6 s+) widens the brush so it covers what the other left.
- **Shared silence** (3 s+) lets the paint settle under a thin veil.
- Telling voices apart: **two mics** (a stereo receiver, e.g. DJI Mic Mini with one transmitter each → left/right; most reliable, real overlaps), **one mic** (pitch-based guess per stretch of speech, words labelled by Deepgram diarization), or **take turns** (space / tap passes the turn).
- Words (optional) use the same Deepgram key as the main piece. Finished duets join the shared archive; in the 3D gallery a duet gets two visitors.
