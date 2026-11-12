# voice → collage

Speak in any language; your voice tears paper from Aimi's archive. Built for the Gumloop × Linear Design Gallery (Nov 19, 2026).
Live: https://aimiwamy03.github.io/voice-collage-gumloop/

- **Voice → paper:** volume, pitch, brightness, speed, breath and pauses drive size, height, colour and more (patch bay in the studio).
- **Words → cut-out letters** via Deepgram Nova-3 multilingual; paste your key in the page (stored only in that browser).
- **Language → archive:** each spoken language tears from its own part of the archive (editable in the studio).
- **Studio:** press `S` (or triple-tap “No.”). Every lever: canvas shape, paper, colours, text modes, image treatments, scrap shapes, edges, attachments, layouts, motion, effects, 3D, recording, MIDI knobs. `W` opens tonight's wall.
- **Outputs:** image, stop-motion video with the voice, listen mode (tap a scrap to hear its moment), 3D sculpture + turntable video.

## Files
- `index.html` — markup and styles
- `js/params.js` — defaults, presets, the studio schema
- `js/engine.js` — drawing: shapes, paper, scraps, words, layouts, attachments, effects
- `js/audio.js` — mic/file input, voice features, patch bay, Deepgram, recording, session flow
- `js/ui.js` — controls, studio, wall, 3D sculpture, listen mode, MIDI
- `js/vendor/three.module.min.js` — three.js r160 (MIT), bundled so 3D works offline
- `media/` — web-size copies of Aimi's work; `python3 dev/build.py` regenerates `js/sources.js`
