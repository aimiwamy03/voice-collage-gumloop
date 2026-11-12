// ============================================================
// voice → collage · v4 · parameters, presets and the studio schema
// ============================================================
const SOURCES = window.SOURCES || {};

const SERIES = {
  'soft-focus': 'Soft Focus', 'session': 'Session', 'hong-kong': 'Hong Kong', 'cambridge': 'Cambridge',
  'mouvement': 'Mouvement', 'metro': 'Metro posters', 'mixed-media': 'Mixed media', 'other': 'Heroes & strips',
};
const seriesOf = name => { const k = name.split('__')[0]; return SERIES[k] ? k : 'other'; };

// which part of the archive each spoken language tears from (prefixes of image names in /media)
const LANG_DEFAULT = {
  en: 'cambridge, soft-focus, session',
  fr: 'metro, mixed-media__contour, poem-foliage',
  zh: 'hong-kong, mixed-media__03-dingge, metro__02-dingzhe',
  ko: 'mixed-media__02-seoul, mixed-media__01-blue-skai',
  ja: 'hong-kong, mouvement__03-airport',
  es: 'mouvement, hero',
  other: 'mouvement, hero, pali, mixed-media__04-crew',
};

const FEATURES = ['volume', 'pitch', 'brightness', 'speed', 'breath', 'pause'];
const FEATURE_HINT = {
  volume: 'how loud', pitch: 'how high', brightness: 'sharp vs warm voice', speed: 'how fast you talk',
  breath: 'breathy / noisy', pause: 'how long you paused before',
};
const TARGETS = ['size', 'tilt', 'hue', 'scatter', 'depth', 'blur', 'fade', 'drift'];

const DEFAULTS = {
  mode: 'collage',
  // paint mode
  brushSize: .5, impasto: .6, scratchBias: .5, letterStyle: 'auto', storyColor: true, drips: .3,
  // canvas
  shape: 'portrait', bg: '#f4f1ea', texture: 'grain', vignette: .35, frame: 0,
  // words
  textMode: 'tiles', typeface: 'mixed', inkColor: '#141414', caseMode: 'as spoken', outline: false,
  scatter: .2, letterMix: .8, wordSize: .5, wave: 0, wordsVsImages: .5,
  // images
  treatment: 'photo', duoA: '#1f2e8c', duoB: '#f4c430', color: .85, contrast: .5, blur: 0, invert: false, mirror: false,
  zoom: .5, series: null, langArchive: true, langMap: { ...LANG_DEFAULT },
  // scraps
  scrapShape: 'rect', edgeStyle: 'torn', edge: .55, border: .5, tilt: .35, density: .5,
  // attachments
  tape: .12, pins: 0, staples: 0, stamps: .3, stains: .12,
  // layout & motion
  layoutMode: 'cluster', layout: .45, flyFrom: 'above', settle: .5,
  // effects
  grain: .25, leaks: 0, aberration: 0, streaks: 0, copyChain: false,
  // voice
  sensitivity: .5, pitchHeight: true, sessionSec: 15,
  patch: { 'volume>size': 0, 'brightness>hue': 0, 'speed>scatter': .5, 'breath>blur': .5, 'pause>drift': 0 },
  // 3d + output
  depth3d: .6, autoSculpture: false, recordVideo: true,
};

const PRESETS = {
  'Ransom note': { textMode: 'tiles', typeface: 'mixed', letterMix: 1, scatter: .3, wordSize: .6, wordsVsImages: .72, edge: .45, edgeStyle: 'torn', tilt: .3, density: .45, layoutMode: 'cluster', layout: .5, color: .9, treatment: 'photo', bg: '#f4f1ea', texture: 'grain', shape: 'portrait', scrapShape: 'rect', series: null, tape: .15, autoSculpture: false },
  'Ilford': { treatment: 'photo', color: 0, contrast: .65, edgeStyle: 'torn', edge: .95, density: .35, wordsVsImages: .25, letterMix: .15, typeface: 'mixed', textMode: 'tiles', scatter: .08, tilt: .22, layoutMode: 'cluster', layout: .38, bg: '#f4f1ea', texture: 'grain', grain: .5, shape: 'portrait', series: ['soft-focus', 'session', 'mouvement', 'hong-kong', 'other'], autoSculpture: false },
  'Metro': { color: 1, treatment: 'photo', series: ['metro', 'mixed-media', 'cambridge', 'hong-kong'], density: .92, tilt: .85, edge: .6, layoutMode: 'cluster', layout: .95, wordsVsImages: .5, letterMix: .85, typeface: 'mixed', textMode: 'tiles', scatter: .6, bg: '#dedbd3', texture: 'cardboard', tape: .4, staples: .3, shape: 'portrait', autoSculpture: false },
  'Lettre': { scatter: 0, typeface: 'serif', textMode: 'ink', inkColor: '#2a1d10', wave: .3, wordSize: .95, wordsVsImages: .88, edge: .3, tilt: .08, density: .22, layout: .28, layoutMode: 'cluster', color: .55, shape: 'postcard', stamps: .95, bg: '#efe6d2', texture: 'lined', autoSculpture: false },
  'Riso': { treatment: 'riso', duoA: '#ff4f8b', duoB: '#1b6dd6', bg: '#f6f1e7', texture: 'grain', textMode: 'palette', typeface: 'display', layoutMode: 'grid', shape: 'square', grain: .5, scrapShape: 'rect', edgeStyle: 'cut', tilt: .12, autoSculpture: false },
  'Polaroid': { shape: 'polaroid', treatment: 'photo', color: .8, leaks: .55, grain: .35, layoutMode: 'cluster', tape: .3, textMode: 'tiles', typeface: 'mixed', bg: '#1b1a18', texture: 'smooth', autoSculpture: false },
  'Sculpture': { autoSculpture: true, depth3d: .95, shape: 'square', scrapShape: 'blob', layoutMode: 'radial', color: .9, treatment: 'photo', bg: '#f4f1ea', texture: 'smooth' },
  'Film strip': { shape: 'filmstrip', layoutMode: 'cascade', color: 0, contrast: .7, treatment: 'photo', bg: '#1a1917', texture: 'smooth', textMode: 'ink', inkColor: '#f4f1ea', typeface: 'mono', grain: .6, leaks: .4, scrapShape: 'rect', edgeStyle: 'cut', tilt: .05, autoSculpture: false },
  'Blueprint': { bg: '#1d3557', texture: 'graph', treatment: 'duotone', duoA: '#0f2440', duoB: '#e8f1ff', textMode: 'inverted', inkColor: '#e8f1ff', typeface: 'mono', layoutMode: 'constellation', scrapShape: 'mixed', edgeStyle: 'cut', pins: .45, shape: 'landscape', autoSculpture: false },
  'Pile': { layoutMode: 'pile', flyFrom: 'drop', scrapShape: 'mixed', tape: .2, density: .7, tilt: .6, shape: 'portrait', autoSculpture: false },
  'Halftone': { treatment: 'halftone', duoA: '#141414', bg: '#f2ede2', textMode: 'inverted', typeface: 'grotesk', layoutMode: 'spiral', scrapShape: 'circle', edgeStyle: 'zigzag', shape: 'circle', autoSculpture: false },
  'Photocopy': { treatment: 'photocopy', copyChain: true, streaks: .5, grain: .55, textMode: 'tiles', typeface: 'display', letterMix: .4, bg: '#ecebe6', texture: 'smooth', shape: 'portrait', autoSculpture: false },
};
const PAINT_PRESETS = {
  'Oil sketch': { mode: 'paint', bg: '#e6d8bd', texture: 'linen', brushSize: .55, impasto: .6, scratchBias: .35, letterStyle: 'auto', drips: .25, typeface: 'mixed', shape: 'portrait', storyColor: true, autoSculpture: false, grain: .2, leaks: 0 },
  'Sgraffito': { mode: 'paint', bg: '#efe6d4', texture: 'linen', brushSize: .85, impasto: .8, scratchBias: 1, letterStyle: 'scratched', drips: .1, typeface: 'mixed', shape: 'portrait', storyColor: true, autoSculpture: false, grain: .15, leaks: 0 },
  'Night oil': { mode: 'paint', bg: '#151412', texture: 'linen', brushSize: .6, impasto: .75, scratchBias: .5, letterStyle: 'painted', drips: .45, typeface: 'mixed', shape: 'portrait', storyColor: true, autoSculpture: false, grain: .2, leaks: .25 },
  'Story painting': { mode: 'paint', bg: '#f1ead9', texture: 'linen', brushSize: .4, impasto: .5, scratchBias: .3, letterStyle: 'painted', drips: .2, typeface: 'hand', wordSize: .8, wordsVsImages: .8, shape: 'landscape', storyColor: true, autoSculpture: false, grain: .15, leaks: 0 },
  'Paint in 3D': { mode: 'paint', bg: '#e6d8bd', texture: 'linen', brushSize: .7, impasto: .9, scratchBias: .6, letterStyle: 'auto', drips: .3, shape: 'square', storyColor: true, autoSculpture: true, depth3d: .9 },
};
for (const k in PRESETS) PRESETS[k].mode = 'collage';
Object.assign(PRESETS, PAINT_PRESETS);
const GUEST_PAINT = ['Oil sketch', 'Sgraffito', 'Night oil', 'Story painting', 'Paint in 3D'];
const GUEST_PRESETS = ['Ransom note', 'Ilford', 'Metro', 'Lettre', 'Riso', 'Polaroid', 'Sculpture'];
const PRESET_BLURB = {
  'Ransom note': 'mixed type, tidy words', 'Ilford': 'black & white, torn, airy', 'Metro': 'posters, packed, wild',
  'Lettre': 'a postcard in serif', 'Riso': 'two inks on a grid', 'Polaroid': 'light leaks, instant', 'Sculpture': 'ends in 3D',
  'Film strip': 'cascading frames', 'Blueprint': 'pinned constellation', 'Pile': 'scraps fall and stack',
  'Halftone': 'dots in a circle', 'Photocopy': 'copy of the last guest',
  'Oil sketch': 'loose strokes on linen', 'Sgraffito': 'scratched through the paint', 'Night oil': 'colour on black canvas',
  'Story painting': 'your words choose the colours', 'Paint in 3D': 'ends as a relief',
};

// ---------- studio schema: every lever, generated into the panel ----------
const R = (k, label, l, r) => ({ k, type: 'range', label, ends: [l, r] });
const S = (k, label, options) => ({ k, type: 'select', label, options });
const Cc = (k, label) => ({ k, type: 'color', label });
const B = (k, label) => ({ k, type: 'check', label });
const SCHEMA = [
  { sec: 'Mode & paint', items: [
    S('mode', 'Mode', ['collage', 'paint']),
    R('brushSize', 'Brush', 'fine', 'fat'),
    R('impasto', 'Impasto', 'thin wash', 'thick ridges'),
    R('scratchBias', 'Scratchiness', 'gentle', 'violent'),
    S('letterStyle', 'Letters', ['auto', 'painted', 'scratched']),
    B('storyColor', 'Words choose the pigment'),
    R('drips', 'Drips', 'none', 'running'),
  ]},
  { sec: 'Canvas', items: [
    S('shape', 'Shape', ['portrait', 'square', 'landscape', 'scroll', 'postcard', 'circle', 'arch', 'blob', 'filmstrip', 'polaroid']),
    Cc('bg', 'Background'),
    S('texture', 'Paper', ['grain', 'smooth', 'linen', 'cardboard', 'graph', 'lined', 'tracing']),
    R('vignette', 'Vignette', 'none', 'heavy'),
    R('frame', 'Mat border', 'none', 'wide'),
  ]},
  { sec: 'Words', items: [
    S('textMode', 'Letters as', ['tiles', 'ink', 'inverted', 'palette', 'stencil']),
    S('typeface', 'Typeface', ['mixed', 'serif', 'mono', 'grotesk', 'hand', 'display']),
    Cc('inkColor', 'Ink colour'),
    S('caseMode', 'Case', ['as spoken', 'UPPER', 'lower']),
    B('outline', 'Outline letters'),
    R('scatter', 'Scatter', 'tidy line', 'letters flying'),
    R('letterMix', 'Letter mix', 'one style', 'every letter different'),
    R('wordSize', 'Word size', 'whisper-small', 'poster-big'),
    R('wave', 'Baseline wave', 'straight', 'wavy'),
    R('wordsVsImages', 'Mix', 'all paper', 'all words'),
  ]},
  { sec: 'Images', items: [
    S('treatment', 'Treatment', ['photo', 'duotone', 'halftone', 'riso', 'photocopy']),
    Cc('duoA', 'Ink A (dark)'), Cc('duoB', 'Ink B (light)'),
    R('color', 'Colour', 'black & white', 'full colour'),
    R('contrast', 'Contrast', 'soft', 'hard'),
    R('blur', 'Blur', 'sharp', 'dreamy'),
    R('zoom', 'Crop', 'whole photos', 'tight details'),
    B('invert', 'Invert'), B('mirror', 'Mirror some pieces'),
    B('langArchive', 'Language chooses the archive'),
  ]},
  { sec: 'Scraps', items: [
    S('scrapShape', 'Shape', ['rect', 'strip', 'circle', 'triangle', 'blob', 'mixed']),
    S('edgeStyle', 'Edge', ['torn', 'cut', 'deckle', 'zigzag']),
    R('edge', 'Torn sides', 'few', 'all'),
    R('border', 'White border', 'none', 'thick'),
    R('tilt', 'Tilt', 'straight', 'wild'),
    R('density', 'Density', 'airy', 'packed'),
  ]},
  { sec: 'Attachments', items: [
    R('tape', 'Masking tape', 'none', 'lots'), R('pins', 'Pins', 'none', 'lots'), R('staples', 'Staples', 'none', 'lots'),
    R('stamps', 'Postmark stamp', 'never', 'always'), R('stains', 'Coffee & glue stains', 'clean', 'messy'),
  ]},
  { sec: 'Layout & motion', items: [
    S('layoutMode', 'Layout', ['cluster', 'grid', 'spiral', 'radial', 'cascade', 'waveform', 'pile', 'constellation']),
    R('layout', 'Spread', 'centred', 'edge to edge'),
    S('flyFrom', 'Pieces arrive', ['above', 'mic', 'sides', 'drop', 'fade']),
    R('settle', 'Settle speed', 'slow float', 'snap'),
  ]},
  { sec: 'Effects', items: [
    R('grain', 'Film grain', 'clean', 'heavy'), R('leaks', 'Light leaks', 'none', 'burnt'),
    R('aberration', 'Colour fringing', 'none', 'strong'), R('streaks', 'Scanner streaks', 'none', 'lots'),
    B('copyChain', 'Copy of a copy (start on the last guest’s collage)'),
  ]},
  { sec: 'Voice', items: [
    R('sensitivity', 'Hearing', 'needs a shout', 'hears a whisper'),
    B('pitchHeight', 'Pitch → height'),
    S('sessionSec', 'Session length (s)', [10, 15, 30]),
  ]},
  { sec: '3D & output', items: [
    R('depth3d', 'Sculpture depth', 'flat', 'deep'),
    B('autoSculpture', 'Open as 3D sculpture when done'),
    B('recordVideo', 'Record a stop-motion video'),
  ]},
];
const ALL_ITEMS = SCHEMA.flatMap(s => s.items);
const RANGE_KEYS = ALL_ITEMS.filter(i => i.type === 'range').map(i => i.k);
const LABEL_OF = Object.fromEntries(ALL_ITEMS.map(i => [i.k, i.label]));

function loadParams() {
  let p = JSON.parse(JSON.stringify(DEFAULTS));
  try {
    const saved = JSON.parse(localStorage.getItem('vc4_defaults') || 'null');
    if (saved) p = { ...p, ...saved, langMap: { ...LANG_DEFAULT, ...(saved.langMap || {}) }, patch: { ...(saved.patch || p.patch) } };
  } catch (e) {}
  return p;
}
let P = loadParams();
let savedDefaults = JSON.parse(JSON.stringify(P));

// ---------- small helpers shared by every file ----------
const $ = id => document.getElementById(id);
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const pad3 = n => String(n).padStart(3, '0');
function hexToRgb(h) { h = (h || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function isDark(h) { const [r, g, b] = hexToRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) < 128; }
