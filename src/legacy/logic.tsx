// Dashboard shell from the Claude Design prototype (v4): navigation, layout, boot sequence, sound, coach chat,
// voice. Page data comes from builders.tsx, which installs the view-model builders on Component.
// @ts-nocheck -- the prototype's logic, carried over verbatim; typed modules replace it piece by piece
import React from 'react'
import { activeCoach } from '../coachPersona'
import { View } from './View'

export const SETTINGS_DEFAULTS = {
  "startPage": "Overview",
  "defaultRange": "30D",
  "bodyStyle": "Vector",
  "overlayScale": 1,
  "overlayX": 0,
  "overlayY": 0,
  "bootSequence": "Once a day",
  "motion": "Full",
  "sound": "On",
  "volume": 0.5
}

export const LINE_C = 'oklch(1 0 0 / 0.07)';
export const A = 'oklch(0.82 0.13 210)', AD = 'oklch(0.82 0.13 210 / 0.28)', AGLOW = '0 0 16px oklch(0.82 0.13 210 / 0.45)';
export const T1 = 'oklch(0.96 0.005 250)', T2 = 'oklch(0.74 0.015 255)', T3 = 'oklch(0.58 0.015 255)';
export const G = 'oklch(0.78 0.15 160)', W = 'oklch(0.82 0.14 80)', R = 'oklch(0.7 0.18 25)';
// Body polygons: MIT, Plexa react-body-highlighter
export const FRONT_S = [{"m":"Chest","pts":"51.83 41.63 51.02 55.10 57.95 57.95 67.75 55.51 70.61 47.34 62.04 41.63"},{"m":"Chest","pts":"29.79 46.53 31.42 55.51 40.81 57.95 48.16 55.10 47.75 42.04 37.55 42.04"},{"m":"Obliques","pts":"68.57 63.26 67.34 57.14 58.77 59.59 60 64.08 60.40 83.26 65.71 78.77 66.53 69.79"},{"m":"Obliques","pts":"33.87 78.36 33.06 71.83 31.02 63.26 32.24 57.14 40.81 59.18 39.18 63.26 39.18 83.67"},{"m":"Abs","pts":"56.32 59.18 57.95 64.08 58.36 77.95 58.36 92.65 56.32 98.36 55.10 104.08 51.42 107.75 51.02 84.48 50.61 67.34 51.02 57.14"},{"m":"Abs","pts":"43.67 58.77 48.57 57.14 48.97 67.34 48.57 84.48 48.16 107.34 44.48 103.67 40.81 91.42 40.81 78.36 41.22 64.48"},{"m":"Biceps","pts":"16.73 68.16 17.95 71.42 22.85 66.12 28.97 53.87 27.75 49.38 20.40 55.91"},{"m":"Biceps","pts":"71.42 49.38 70.20 54.69 76.32 66.12 81.63 71.83 82.85 68.97 78.77 55.51"},{"m":"Triceps","pts":"69.38 55.51 69.38 61.63 75.91 72.65 77.55 70.20 75.51 67.34"},{"m":"Triceps","pts":"22.44 69.38 29.79 55.51 29.79 60.81 22.85 73.06"},{"m":null,"pts":"55.51 23.67 50.61 33.46 50.61 39.18 61.63 40 70.61 44.89 69.38 36.73 63.26 35.10 58.36 30.61"},{"m":null,"pts":"28.97 44.89 30.20 37.14 36.32 35.10 41.22 30.20 44.48 24.48 48.97 33.87 48.57 39.18 37.95 39.59"},{"m":"Front Shoulder","pts":"78.36 53.06 79.59 47.75 79.18 41.22 75.91 37.95 71.02 36.32 72.24 42.85 71.42 47.34"},{"m":"Front Shoulder","pts":"28.16 47.34 21.22 53.06 20 47.75 20.40 40.81 24.48 37.14 28.57 37.14 26.93 43.26"},{"m":null,"pts":"42.44 2.85 40 11.83 42.04 19.59 46.12 23.26 49.79 25.30 54.69 22.44 57.55 19.18 59.18 10.20 57.14 2.44 49.79 0"},{"m":"Inner Thigh","pts":"52.65 110.20 54.28 124.89 60 110.20 62.04 100 64.89 94.28 60 92.65 56.73 104.48"},{"m":"Inner Thigh","pts":"47.75 110.61 44.89 125.30 42.04 115.91 40.40 113.06 39.59 107.34 37.95 102.44 34.69 93.87 39.59 92.24 41.63 99.18 43.67 105.30"},{"m":"Quads","pts":"34.69 98.77 37.14 108.16 37.14 127.75 34.28 137.14 31.02 132.65 29.38 120 28.16 111.42 29.38 100.81 32.24 94.69"},{"m":"Quads","pts":"63.26 105.71 64.48 100 66.93 94.69 70.20 101.22 71.02 111.83 68.16 133.06 65.30 137.55 62.44 128.57 62.04 111.42"},{"m":"Quads","pts":"38.77 129.38 38.36 112.24 41.22 118.36 44.48 129.38 42.85 135.10 40 146.12 36.32 146.53 35.51 140"},{"m":"Quads","pts":"59.59 145.71 55.51 128.97 60.81 113.87 61.22 130.20 64.08 139.59 62.85 146.53"},{"m":"Quads","pts":"32.65 138.36 26.53 145.71 25.71 136.73 25.71 127.34 26.93 114.28 29.38 133.46"},{"m":"Quads","pts":"71.83 113.06 73.87 124.08 73.87 140.40 72.65 145.71 66.53 138.36 70.20 133.46"},{"m":null,"pts":"33.87 140 34.69 143.26 35.51 147.34 36.32 151.02 35.10 156.73 29.79 156.73 27.34 152.65 27.34 147.34 30.20 144.08"},{"m":null,"pts":"65.71 140 72.24 147.75 72.24 152.24 69.79 157.14 64.89 156.73 62.85 151.02"},{"m":"Calves","pts":"71.42 160.40 73.46 153.46 76.73 161.22 79.59 167.75 78.36 187.75 79.59 195.51 74.69 195.51"},{"m":"Calves","pts":"24.89 194.69 27.75 164.89 28.16 160.40 26.12 154.28 24.89 157.55 22.44 161.63 20.81 167.75 22.04 188.16 20.81 195.51"},{"m":"Calves","pts":"72.65 195.10 69.79 159.18 65.30 158.36 64.08 162.44 64.08 165.30 65.71 177.14"},{"m":"Calves","pts":"35.51 158.36 35.91 162.44 35.91 166.93 35.10 172.24 35.10 176.73 32.24 182.04 30.61 187.34 26.93 194.69 27.34 187.75 28.16 180.40 28.57 175.51 28.97 169.79 29.79 164.08 30.20 158.77"},{"m":null,"pts":"71.5 199.5 72.65 196.8 79.59 196.8 80.5 199.5 79.2 202.5 76.5 204.5 73.2 204.5 71.8 202.5"},{"m":null,"pts":"19 199.5 20.82 196.8 26.94 196.8 28.5 199.5 27.2 202.5 24 204.5 21.5 204.5 20 202.5"},{"m":"Forearms","pts":"6.12 88.57 10.20 75.10 14.69 70.20 16.32 74.28 19.18 73.46 4.48 97.55 0 100"},{"m":"Forearms","pts":"84.48 69.79 83.26 73.46 80 73.06 95.10 98.36 100 100.40 93.46 89.38 89.79 76.32"},{"m":"Forearms","pts":"77.55 72.24 77.55 77.55 80.40 84.08 85.30 89.79 92.24 101.22 94.69 99.59"},{"m":"Forearms","pts":"6.93 101.22 13.46 90.61 18.77 84.08 21.63 77.14 21.22 71.83 4.89 98.77"}];
export const BACK_S = [{"m":null,"pts":"50.63 0 45.95 0.85 40.85 5.53 40.42 12.76 45.10 20 55.74 20 59.14 13.61 59.57 4.68 55.74 1.27"},{"m":"Upper Back","pts":"44.68 21.70 47.65 21.70 47.23 38.29 47.65 64.68 38.29 53.19 35.31 40.85 31.06 36.59 39.14 33.19 43.82 27.23"},{"m":"Upper Back","pts":"52.34 21.70 55.74 21.70 56.59 27.23 60.85 32.76 68.93 36.59 64.68 40.42 61.70 53.19 52.34 64.68 53.19 38.29"},{"m":"Back Shoulder","pts":"29.36 37.02 22.97 39.14 17.44 44.25 18.29 53.61 24.25 49.36 27.23 46.38"},{"m":"Back Shoulder","pts":"71.06 37.02 78.29 39.57 82.55 44.68 81.70 53.61 74.89 48.93 72.34 45.10"},{"m":"Lats","pts":"31.06 38.72 28.08 48.93 28.51 55.31 34.04 75.31 47.23 71.06 47.23 66.38 36.59 54.04 33.61 41.27"},{"m":"Lats","pts":"68.93 38.72 71.91 49.36 71.48 56.17 65.95 75.31 52.76 71.06 52.76 66.38 63.40 54.46 66.38 41.70"},{"m":"Triceps","pts":"26.80 49.78 17.87 55.74 14.46 72.34 16.59 81.70 21.70 63.82 26.80 55.74"},{"m":"Triceps","pts":"73.61 50.21 82.12 55.74 85.95 73.19 83.40 82.12 77.87 62.97 73.19 55.74"},{"m":"Triceps","pts":"26.80 58.29 26.80 68.51 22.97 75.31 19.14 77.44 22.55 65.53"},{"m":"Triceps","pts":"72.76 58.29 77.02 64.68 80.42 77.44 76.59 75.31 72.76 68.93"},{"m":"Lower Back","pts":"47.65 72.76 34.46 77.02 35.31 83.40 49.36 102.12 46.80 82.97"},{"m":"Lower Back","pts":"52.34 72.76 65.53 77.02 64.68 83.40 50.63 102.12 53.19 83.82"},{"m":"Forearms","pts":"86.38 75.74 91.06 83.40 93.19 94.04 100 106.38 96.17 104.25 88.08 89.36 84.25 83.82"},{"m":"Forearms","pts":"13.61 75.74 8.93 83.82 6.80 93.61 0 106.38 3.82 104.25 12.34 88.51 15.74 82.97"},{"m":"Forearms","pts":"81.27 79.57 77.44 77.87 79.14 84.68 91.06 103.82 93.19 108.93 94.46 104.68"},{"m":"Forearms","pts":"18.72 79.57 22.12 77.87 20.85 84.25 9.36 102.97 6.80 108.51 5.10 104.68"},{"m":"Glutes","pts":"44.68 99.57 30.21 108.51 29.78 118.72 31.48 125.95 47.23 121.27 49.36 114.89"},{"m":"Glutes","pts":"55.31 99.14 51.06 114.46 52.34 120.85 68.08 125.95 69.78 119.14 69.36 108.51"},{"m":"Inner Thigh","pts":"48.08 122.97 44.68 122.97 41.27 125.53 45.10 144.25 48.51 135.74 48.93 129.36"},{"m":"Inner Thigh","pts":"51.91 122.55 55.74 123.40 59.14 125.95 54.89 144.25 51.91 136.17 51.06 129.36"},{"m":"Hamstrings","pts":"28.93 122.12 31.06 129.36 36.59 125.95 35.31 135.31 34.46 150.21 29.36 158.29 28.93 146.80 27.65 141.27 27.23 131.48"},{"m":"Hamstrings","pts":"71.48 121.70 69.36 128.93 63.82 125.95 65.53 136.59 66.38 150.21 71.06 158.29 71.48 147.65 72.76 142.12 73.61 131.91"},{"m":"Hamstrings","pts":"38.72 125.53 44.25 145.95 40.42 166.80 36.17 152.76 37.02 135.31"},{"m":"Hamstrings","pts":"61.70 125.53 63.40 136.17 64.25 153.19 60 166.80 56.17 146.38"},{"m":null,"pts":"34.46 153.19 31.06 159.14 33.61 166.38 37.44 162.55"},{"m":null,"pts":"66.38 153.61 62.97 162.97 66.80 166.38 69.36 159.14"},{"m":"Calves","pts":"29.36 160.42 28.51 167.23 24.68 179.57 23.82 192.76 25.53 197.02 28.51 193.19 29.78 180 31.91 171.06 31.91 166.80"},{"m":"Calves","pts":"37.44 165.10 35.31 167.65 33.19 171.91 31.06 180.42 30.21 191.91 34.04 200 38.72 190.63 39.14 168.93"},{"m":"Calves","pts":"62.97 165.10 61.27 168.51 61.70 190.63 66.38 199.57 70.63 191.91 68.93 179.57 66.80 170.21"},{"m":"Calves","pts":"70.63 160.42 72.34 168.51 75.74 179.14 76.59 192.76 74.46 196.59 72.34 193.61 70.63 179.57 68.08 168.08"},{"m":"Calves","pts":"28.51 195.74 30.21 195.74 33.61 201.70 30.63 220 28.51 213.61 26.80 198.29"},{"m":"Calves","pts":"69.78 195.74 71.91 195.74 73.61 198.29 71.91 213.19 70.21 219.57 67.23 202.12"}];
export const COMBO = {"Chest":["Upper Chest","Lower Chest"],"Abs":["Upper Abs","Lower Abs"],"Biceps":["Outer Bicep","Inner Bicep"],"Triceps":["Upper Tricep","Outer Tricep","Lower Tricep"],"Forearms":["Inner Forearm","Outer Forearm"]};

// Boot sequence rows, set from the data before each render (builders.tsx).
let BOOT_STEPS: [string, string][] = [];
export const setBootSteps = (steps: [string, string][]) => { BOOT_STEPS = steps; };
export const PAGES = [
  { id: 'command', label: 'Overview' }, { id: 'week', label: 'Week' }, { id: 'roadmap', label: 'Roadmap' }, { id: 'training', label: 'Training' }, { id: 'body', label: 'Body' },
  { id: 'recovery', label: 'Recovery' }, { id: 'fuel', label: 'Nutrition' }, { id: 'blood', label: 'Tests' }, { id: 'journal', label: 'Journal' }, { id: 'settings', label: 'Settings' },
];
export const CHAT_SUGG = {
  command: ['Why is today\'s call what it is?', 'How did I sleep compared to my baseline?', 'What\'s the most important thing this week?', 'What should I eat today?'],
  roadmap: ['Am I on track for my next race?', 'What should I focus on this month?', 'Help me build a roadmap', 'What\'s my biggest gap?'],
  week: ['Am I on track this week?', 'How does this week compare to my usual?', 'What should I do with the rest of the week?'],
  training: ['Are my easy runs actually easy?', 'How has my run volume trended?', 'What\'s missing from my training?', 'How is my consistency?'],
  body: ['Which muscles am I neglecting?', 'How do my DEXA scans compare?', 'How are my key lifts progressing?'],
  recovery: ['Why is my HRV where it is?', 'Am I overreaching?', 'What does my respiratory rate tell me?', 'How consistent is my sleep?'],
  fuel: ['How am I doing on my nutrition protocol?', 'What should I eat today to hit my targets?', 'Which diet allowances do I have left?', 'How is my weight trending?'],
  blood: ['What should I ask my doctor about?', 'Which markers changed the most?', 'What does my VO₂ max mean for training zones?'],
  journal: ['What did my doctor recommend?', 'Am I following my doctor\'s plan?', 'What should I ask at my follow-up?'],
  settings: ['Which sources are out of date?', 'What data would improve the coaching most?'],
};
export function BodyScan(props) {
  const h = React.createElement, [p, setP] = React.useState(0), D = 1700;
  React.useEffect(() => { const t0 = performance.now(); let raf; const tick = now => { const x = Math.min(1, (now - t0) / D); setP(x); if (x < 1) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, []);
  const done = p >= 1, label = done ? 'Scan complete' : (props.side === 'front' ? 'Scanning anterior' : 'Scanning posterior');
  return h('div', { style: { position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', animation: 'imFade 2.3s ease-out forwards' } },
    h('div', { style: { position: 'absolute', inset: '-4% -6%', background: 'linear-gradient(oklch(0.82 0.13 210 / 0.07) 1px, transparent 1px) 0 0 / 100% 5px', maskImage: 'linear-gradient(to top, black ' + (p * 100) + '%, transparent ' + (p * 100 + 6) + '%)', WebkitMaskImage: 'linear-gradient(to top, black ' + (p * 100) + '%, transparent ' + (p * 100 + 6) + '%)' } }),
    h('div', { style: { position: 'absolute', left: '-14%', right: '-14%', height: 0, animation: 'imBeamUp ' + D + 'ms cubic-bezier(.45,.1,.4,1) forwards' } },
      h('div', { style: { position: 'absolute', left: 0, right: 0, top: 0, height: 70, background: 'linear-gradient(oklch(0.82 0.13 210 / 0.22), transparent)' } }),
      h('div', { style: { position: 'absolute', left: 0, right: 0, top: -1, height: 2, background: 'linear-gradient(90deg, transparent, oklch(0.92 0.1 210), transparent)', boxShadow: '0 0 14px oklch(0.82 0.13 210), 0 0 30px oklch(0.82 0.13 210 / 0.6)' } }),
      h('span', { style: { position: 'absolute', right: 0, top: -20, fontSize: 11, color: A, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textShadow: '0 0 8px oklch(0.82 0.13 210 / 0.8)' } }, Math.round(p * 100) + '%')),
    h('div', { style: { position: 'absolute', left: '50%', bottom: -22, width: '62%', height: 30, borderRadius: '50%', border: '1.5px solid ' + A, boxShadow: '0 0 16px ' + A, animation: 'imRing 1.1s ease-out 2 both' } }),
    h('div', { style: { position: 'absolute', left: '50%', top: -26, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: done ? G : T2, whiteSpace: 'nowrap' } },
      h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: done ? G : A, boxShadow: '0 0 6px ' + (done ? G : A), animation: done ? 'none' : 'imPulse .6s ease-in-out infinite' } }), label));
}
export function BootFx(props) {
  const h = React.createElement, [p, setP] = React.useState(0), [out, setOut] = React.useState(false), [phase, setPhase] = React.useState('load');
  const [gate, setGate] = React.useState(false), [audio, setAudio] = React.useState(false);
  React.useEffect(() => {
    let t0 = 0, raf, done = false, started = false, gated = false; const D = SFX.on && SFX.bootEl ? SFX.BOOT_LEN * 1000 : 2600;
    const finish = () => { if (done) return; done = true; setP(1); SFX.play('bootDone'); setPhase('complete'); if (SFX.welcomeEl) SFX.welcome(); else SFX.play('scanDone');
      setTimeout(() => { setPhase('wipe'); setOut(true); props.onReveal && props.onReveal(); }, 650);
      setTimeout(props.onDone, 650 + 1000); };
    const tick = now => { const x = Math.min(1, (now - t0) / D); setP(x); if (x < 1) raf = requestAnimationFrame(tick); else finish(); };
    const start = () => { if (started) return; started = true; gated = false; setGate(false); t0 = performance.now(); raf = requestAnimationFrame(tick); };
    if (!SFX.on || !SFX.bootEl) start();
    else { SFX.bootStart(0).then(ok => { if (ok) { setAudio(true); start(); } else if (!started) { gated = true; setGate(true); } });
      setTimeout(() => { if (!started && !gated) { gated = true; setGate(true); } }, 1500); }
    const engage = () => { SFX.init(); SFX.prime(); try { SFX.bootEl.pause(); } catch (e) {} SFX.bootStart(0).then(ok => { setAudio(!!ok); start(); }); };
    const skip = () => { if (done) return; if (!started) { engage(); return; } SFX.init(); SFX.prime(); cancelAnimationFrame(raf); finish(); };
    window.addEventListener('keydown', skip); window.addEventListener('pointerdown', skip);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', skip); window.removeEventListener('pointerdown', skip); };
  }, []);
  const ease = 1 - Math.pow(1 - p, 2.2), pct = Math.round(ease * 100), C2 = 2 * Math.PI * 56;
  const okN = BOOT_STEPS.filter((s, i) => ease * 7.2 - i > 1).length;
  React.useEffect(() => { if (okN > 0) SFX.play('bootStep', okN - 1); }, [okN]);
  const ring = (r, w, dash, op, anim, glow) => h('circle', { cx: 120, cy: 120, r: r, fill: 'none', stroke: A, strokeWidth: w, strokeDasharray: dash, opacity: op, style: { transformOrigin: '120px 120px', animation: anim, filter: glow ? 'drop-shadow(0 0 6px oklch(0.82 0.13 210 / 0.8))' : 'none' } });
  const rows = BOOT_STEPS.map((s, i) => { const st = ease * 7.2 - i, vis = st > 0, ok = st > 1;
    return h('div', { key: s[0], style: { display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 12, alignItems: 'center', opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: 'opacity .35s, transform .35s' } },
      h('span', { style: { width: 10, height: 10, borderRadius: '50%', border: ok ? '0' : '1.5px solid ' + A, background: ok ? G : 'transparent', boxShadow: ok ? '0 0 8px ' + G : 'none', animation: ok ? 'none' : 'imPulse .8s ease-in-out infinite', transition: 'background .25s' } }),
      h('span', { style: { fontSize: 13, color: T1 } }, s[0]),
      h('span', { style: { fontSize: 12, color: ok ? T2 : T3, fontVariantNumeric: 'tabular-nums' } }, ok ? s[1] : 'Linking…'));
  });
  const final = ease > 0.92, comp = phase !== 'load';
  const beam = phase === 'wipe' ? h('div', { key: 'beam', style: { position: 'fixed', left: 0, right: 0, top: 0, height: 0, zIndex: 101, pointerEvents: 'none', animation: 'imBeamDown .95s cubic-bezier(.65,0,.35,1) forwards' } },
    h('div', { style: { position: 'absolute', left: 0, right: 0, top: -90, height: 90, background: 'linear-gradient(transparent, oklch(0.82 0.13 210 / 0.18))' } }),
    h('div', { style: { position: 'absolute', left: 0, right: 0, top: -1.5, height: 3, background: 'linear-gradient(90deg, transparent, oklch(0.95 0.08 210) 15%, #fff 50%, oklch(0.95 0.08 210) 85%, transparent)', boxShadow: '0 0 18px oklch(0.82 0.13 210), 0 0 50px oklch(0.82 0.13 210 / 0.7)' } }),
    h('div', { style: { position: 'absolute', left: 0, right: 0, top: 0, height: 40, background: 'linear-gradient(oklch(0.82 0.13 210 / 0.25), transparent)' } })) : null;
  return h(React.Fragment, null, beam, h('div', { key: 'ov', onClick: e => e.stopPropagation(), style: { position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'default',
      background: 'radial-gradient(600px 420px at 50% 42%, oklch(0.82 0.13 210 / 0.12), transparent 70%), linear-gradient(oklch(1 0 0 / 0.025) 1px, transparent 1px) 0 0 / 48px 48px, linear-gradient(90deg, oklch(1 0 0 / 0.025) 1px, transparent 1px) 0 0 / 48px 48px, oklch(0.13 0.016 262)',
      animation: out ? 'imWipe .95s cubic-bezier(.65,0,.35,1) forwards' : 'none' } },
    comp ? h('div', { key: 'flash', style: { position: 'absolute', inset: 0, background: 'radial-gradient(500px 360px at 50% 42%, oklch(0.78 0.15 160 / 0.22), transparent 70%)', animation: 'imFlash .7s ease-out forwards', pointerEvents: 'none' } }) : null,
    comp ? h('div', { key: 'burst', style: { position: 'absolute', left: '50%', top: '50%', width: 240, height: 240, margin: '-260px 0 0 -120px', borderRadius: '50%', border: '2px solid ' + G, boxShadow: '0 0 30px ' + G + ', inset 0 0 30px oklch(0.78 0.15 160 / 0.4)', animation: 'imBurst .8s cubic-bezier(.2,.7,.2,1) forwards', pointerEvents: 'none' } }) : null,
    h('div', { style: { position: 'absolute', left: 0, right: 0, top: 0, height: '22vh', background: 'linear-gradient(transparent, oklch(0.82 0.13 210 / 0.06) 85%, oklch(0.82 0.13 210 / 0.35) 99%, transparent)', animation: 'imSweep 2.4s linear infinite', pointerEvents: 'none' } }),
    h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: 'min(420px, 88vw)', position: 'relative' } },
      h('div', { style: { position: 'relative', width: 240, height: 240 } },
        h('svg', { viewBox: '0 0 240 240', width: 240, height: 240, style: { position: 'absolute', inset: 0, overflow: 'visible' } },
          ring(112, 1, '1 7', 0.45, 'imSpin 18s linear infinite'),
          ring(100, 1.5, '60 24 8 24', 0.5, 'imSpinR 9s linear infinite'),
          ring(86, 2, '120 420', 0.95, 'imSpin 1.6s cubic-bezier(.5,.1,.5,.9) infinite', true),
          ring(72, 1, '3 5', 0.3, 'imSpinR 30s linear infinite'),
          h('circle', { cx: 120, cy: 120, r: 56, fill: 'none', stroke: 'oklch(1 0 0 / 0.07)', strokeWidth: 3 }),
          h('circle', { cx: 120, cy: 120, r: 56, fill: 'none', stroke: final ? G : A, strokeWidth: 3, strokeLinecap: 'round', strokeDasharray: C2, strokeDashoffset: C2 * (1 - ease), transform: 'rotate(-90 120 120)', style: { filter: 'drop-shadow(0 0 8px ' + (final ? G : A) + ')', transition: 'stroke .3s' } })),
        h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 } },
          h('span', { style: { fontSize: 40, fontWeight: 400, fontFamily: "'Space Grotesk',system-ui,sans-serif", letterSpacing: '-0.04em', color: T1, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 24px oklch(0.82 0.13 210 / 0.6)' } }, pct),
          h('span', { style: { fontSize: 11, color: T3 } }, 'percent'))),
      h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animation: 'imIn .6s ease-out both' } },
        h('span', { style: { fontSize: 15, fontWeight: 500, fontFamily: "'Space Grotesk',system-ui,sans-serif", letterSpacing: '0.32em', color: T1, paddingLeft: '0.32em' } }, 'HALO LABS'),
        h('span', { style: { fontSize: 12.5, color: comp ? G : T2, letterSpacing: comp ? '0.18em' : 0, transition: 'color .2s' } }, comp ? 'SCAN COMPLETE · ALL SYSTEMS ONLINE' : final ? 'Computing today\'s call…' : 'Bringing your systems online')),
      h('div', { style: { width: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', borderRadius: 14, border: '1px solid oklch(1 0 0 / 0.07)', background: 'oklch(0.185 0.018 262 / 0.7)' } }, rows),
      h('div', { style: { width: '100%', display: 'flex', flexDirection: 'column', gap: 8 } },
        h('div', { style: { height: 2, borderRadius: 1, background: 'oklch(1 0 0 / 0.07)', overflow: 'hidden' } }, h('div', { style: { height: '100%', width: pct + '%', background: A, boxShadow: '0 0 10px ' + A } })),
        h('span', { style: { fontSize: gate ? 13 : 11.5, letterSpacing: gate ? '0.16em' : 0, color: gate ? A : T3, textAlign: 'center', textShadow: gate ? '0 0 12px ' + A : 'none', animation: gate ? 'imGate 1.6s ease-in-out infinite' : 'none' } }, gate ? 'CLICK OR PRESS ANY KEY TO INITIALIZE' : 'Press any key or click to skip')))));
}
export function ChatOrb(props) {
  const h = React.createElement, s = props.size;
  return h('span', { style: { position: 'relative', width: s, height: s, flex: 'none', display: 'inline-block' } },
    h('span', { style: { position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid transparent', borderTopColor: A, borderRightColor: 'oklch(0.82 0.13 210 / 0.35)', animation: 'imSpin ' + (props.busy ? '0.7s' : '3s') + ' linear infinite' } }),
    h('span', { style: { position: 'absolute', inset: s * 0.14, borderRadius: '50%', border: '1px dashed oklch(0.82 0.13 210 / 0.45)', animation: 'imSpinR 8s linear infinite' } }),
    h('span', { style: { position: 'absolute', inset: s * 0.3, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, oklch(0.95 0.06 210), ' + A + ' 55%, oklch(0.5 0.12 230))', boxShadow: '0 0 ' + (s * 0.4) + 'px ' + A, animation: 'imPulse ' + (props.busy ? '0.6s' : '2.4s') + ' ease-in-out infinite' } }));
}
export const SFX = {
  ctx: null, on: true, vol: 0.5, last: {},
  init() { try { if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; const c = new C(); const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; this.master = c.createGain(); this.master.gain.value = this.vol; this.master.connect(comp); comp.connect(c.destination);
        const dl = c.createDelay(1), fb = c.createGain(), wet = c.createGain(), dlf = c.createBiquadFilter(); dl.delayTime.value = 0.29; fb.gain.value = 0.42; wet.gain.value = 0.28; dlf.type = 'lowpass'; dlf.frequency.value = 2600;
        this.fx = c.createGain(); this.fx.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(wet); wet.connect(this.master); this.ctx = c; } if (this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) { return null; } return this.ctx; },
  setVol(x) { this.vol = x; if (this.master) this.master.gain.value = x; },
  tone(f, d, o) { o = o || {}; const c = this.ctx, t = c.currentTime + (o.at || 0), os = c.createOscillator(), g = c.createGain();
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t); if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + d);
    const pk = o.g || 0.1; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + (o.atk || 0.006)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let node = os; if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; os.connect(fl); node = fl; }
    node.connect(g); g.connect(this.master); if (o.fx) g.connect(this.fx); os.start(t); os.stop(t + d + 0.05); },
  noise(d, o) { o = o || {}; const c = this.ctx, t = c.currentTime + (o.at || 0), n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = o.q || 2; f.frequency.setValueAtTime(o.f1 || 1000, t); if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + d);
    const g = c.createGain(), pk = o.g || 0.05; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + (o.atk || d * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(this.master); if (o.fx) g.connect(this.fx); s.start(t); s.stop(t + d + 0.05); },
  shaper(k) { const c = this.ctx; if (this._sh && this._sh[k]) return this._sh[k]; const n = 1024, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; cv[i] = (1 + k) * x / (1 + k * Math.abs(x)); } this._sh = this._sh || {}; this._sh[k] = cv; return cv; },
  dist(k) { const w = this.ctx.createWaveShaper(); w.curve = this.shaper(k); w.oversample = '4x'; return w; },
  env(g, t, a, pk, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); },
  spaceBoot(d) { const c = this.ctx, t = c.currentTime, M = this.master, FX = this.fx;
    // bulkhead clank: ring-mod metal
    const m1 = c.createOscillator(), m2 = c.createOscillator(), rm = c.createGain(), mg = c.createGain(); m1.type = 'square'; m1.frequency.value = 187; m2.frequency.value = 317; rm.gain.value = 0; m2.connect(rm.gain); m1.connect(rm); this.env(mg, t, 0.003, 0.09, 0.45); rm.connect(mg); mg.connect(M); mg.connect(FX); m1.start(t); m2.start(t); m1.stop(t + 0.5); m2.stop(t + 0.5);
    this.tone(48, 0.5, { f2: 26, g: 0.16, atk: 0.003 });
    // distorted reactor drone
    const df = c.createBiquadFilter(), dg = c.createGain(), ds = this.dist(18); df.type = 'lowpass'; df.Q.value = 12; df.frequency.setValueAtTime(90, t); df.frequency.exponentialRampToValueAtTime(2600, t + d);
    [-14, 0, 13].forEach(dt => { const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = dt; o.frequency.setValueAtTime(34, t); o.frequency.exponentialRampToValueAtTime(68, t + d); o.connect(ds); o.start(t); o.stop(t + d + 0.3); });
    const th = c.createOscillator(), thg = c.createGain(), am = c.createGain(); th.type = 'square'; th.frequency.setValueAtTime(4, t); th.frequency.exponentialRampToValueAtTime(28, t + d); thg.gain.value = 0.45; am.gain.value = 0.55; th.connect(thg); thg.connect(am.gain); th.start(t); th.stop(t + d + 0.3);
    ds.connect(df); df.connect(am); am.connect(dg); dg.gain.setValueAtTime(0.0001, t); dg.gain.exponentialRampToValueAtTime(0.05, t + d * 0.85); dg.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.15); dg.connect(M);
    // turbine spool-up whine with vibrato
    const tb = c.createOscillator(), tg = c.createGain(), vb = c.createOscillator(), vg = c.createGain(); tb.frequency.setValueAtTime(140, t + 0.2); tb.frequency.exponentialRampToValueAtTime(3600, t + d); vb.frequency.value = 7; vg.gain.value = 18; vb.connect(vg); vg.connect(tb.frequency);
    tg.gain.setValueAtTime(0.0001, t); tg.gain.exponentialRampToValueAtTime(0.022, t + d * 0.9); tg.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.1); tb.connect(tg); tg.connect(M); tg.connect(FX); tb.start(t); vb.start(t); tb.stop(t + d + 0.2); vb.stop(t + d + 0.2);
    this.noise(d, { f1: 120, f2: 5200, g: 0.03, q: 7, atk: d * 0.85 });
    // pre-impact reverse suck
    this.noise(0.45, { at: d - 0.45, f1: 800, f2: 9000, g: 0.05, q: 0.7, atk: 0.43 });
    // comms chatter: ring-mod glitches
    for (let i = 0; i < 16; i++) { const at = 0.3 + Math.random() * (d - 0.6); this.tone(600 + Math.random() * 3400, 0.012 + Math.random() * 0.03, { at: at, type: Math.random() < 0.5 ? 'square' : 'sawtooth', g: 0.01, lp: 6000, fx: Math.random() < 0.5 }); }
  },
  spaceStep(i) { const base = [220, 247, 262, 294, 330, 392][Math.min(5, i)];
    this.tone(base * 4, 0.035, { type: 'square', g: 0.03, lp: 5000 }); this.tone(base * 4, 0.035, { at: 0.07, type: 'square', g: 0.025, lp: 5000 });
    this.tone(base * 2, 0.22, { f2: base, type: 'sawtooth', g: 0.02, lp: 1800, fx: 1 }); this.noise(0.05, { f1: 4000, g: 0.02, q: 3, atk: 0.003 }); },
  spaceDone() { const c = this.ctx, t = c.currentTime;
    this.tone(58, 0.9, { f2: 40, g: 0.07, atk: 0.02 });
    this.noise(1.1, { f1: 2400, f2: 500, g: 0.022, q: 0.7, atk: 0.04 });
    this.tone(2400, 0.6, { f2: 900, g: 0.006, atk: 0.01, fx: 1 });
  },
  charge(d, o) { const c = this.ctx, t = c.currentTime + (o.at || 0), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.Q.value = o.q || 9; f.frequency.setValueAtTime(o.c1, t); f.frequency.exponentialRampToValueAtTime(o.c2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.g, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d + (o.rel || 0.25));
    [-9, 0, 9].forEach(dt => { const os = c.createOscillator(); os.type = 'sawtooth'; os.detune.value = dt; os.frequency.setValueAtTime(o.f1, t); os.frequency.exponentialRampToValueAtTime(o.f2, t + d); os.connect(f); os.start(t); os.stop(t + d + 0.4); });
    const lfo = c.createOscillator(), lg = c.createGain(), am = c.createGain(); lfo.frequency.setValueAtTime(5, t); lfo.frequency.exponentialRampToValueAtTime(22, t + d); lg.gain.value = 0.35; am.gain.value = 0.65; lfo.connect(lg); lg.connect(am.gain); lfo.start(t); lfo.stop(t + d + 0.4);
    f.connect(am); am.connect(g); g.connect(this.master); g.connect(this.fx); },
  mkAudio(name) { try { const a = new Audio('./sounds/' + name + '.mp3'); a.preload = 'auto';
    a.addEventListener('error', () => { if (!a._fb) { a._fb = 1; a.src = './uploads/' + name + '.mp3'; a.load(); } }); a.load(); return a; } catch (e) { return null; } },
  bootEl: null,
  BOOT_LEN: 7.0,
  welcomeEl: null,
  welcome() { const a = this.welcomeEl; if (!a || !this.on) return; this._primed = true; a.muted = false; a.volume = Math.min(1, this.vol * 1.4); try { a.currentTime = 0; } catch (e) {} a.play().then(() => { this._wPending = false; }).catch(() => { this._wPending = true; }); },
  prime() { const list = [this.bootEl, this.welcomeEl].filter(Boolean);
    if (this._wPending && this.welcomeEl) { this._wPending = false; this.welcome(); return; }
    if (this._primed) return; this._primed = true;
    const w = this.welcomeEl; if (w && w.paused) { w.muted = true; w.play().then(() => { if (w.muted) { w.pause(); try { w.currentTime = 0; } catch (e) {} } w.muted = false; }).catch(() => { w.muted = false; this._primed = false; }); } },
  bootStart(offset) { const a = this.bootEl; if (!a || !this.on) return Promise.resolve(false); clearInterval(this._fade); a.volume = Math.min(1, this.vol * 1.3); try { a.currentTime = Math.max(0, offset || 0); } catch (e) {} this._bootOk = false; const p = a.play(); return (p ? p : Promise.resolve()).then(() => { this._bootOk = true; return true; }).catch(() => false); },
  bootLive() { const a = this.bootEl; return !!(a && this._bootOk && !a.paused && a.currentTime > 0.05); },
  bootStop() { const a = this.bootEl; if (!a || a.paused || (a.duration && a.duration - a.currentTime < 0.4)) return; clearInterval(this._fade); this._fade = setInterval(() => { const nv = a.volume - 0.08; if (nv <= 0.01) { a.pause(); clearInterval(this._fade); } else a.volume = nv; }, 30); },
  play(name, arg) {
    if (name === 'boot') { this.bootStart(this.BOOT_LEN - (arg || this.BOOT_LEN)); return; }
    if (name === 'bootDone') { this.bootStop(); return; }
    if (name === 'bootStep') return;
    if (!this.on) return; const c = this.init(); if (!c || c.state !== 'running') return;
    const now = performance.now(), gap = { tick: 45, click: 40, bootStep: 60 }[name] || 0; if (gap && now - (this.last[name] || 0) < gap) return; this.last[name] = now;
    const T = this.tone.bind(this), N = this.noise.bind(this);
    switch (name) {
      case 'click': T(2600, 0.025, { type: 'square', g: 0.018, lp: 5000 }); T(1300, 0.04, { g: 0.04 }); break;
      case 'nav': T(620, 0.11, { f2: 1240, g: 0.06 }); T(1860, 0.14, { at: 0.06, g: 0.035 }); N(0.22, { f1: 900, f2: 5200, g: 0.025, q: 1.4 }); break;
      case 'boot': this.spaceBoot(arg || 2.6); break;
      case 'bootStep': this.spaceStep(arg || 0); break;
      case 'bootDone': this.spaceDone(); break;
      case 'scanDone': {
        const c2 = this.ctx, t = c2.currentTime;
        T(52, 0.6, { f2: 38, g: 0.06, atk: 0.01 });
        const n = Math.floor(c2.sampleRate * 1.6), bf = c2.createBuffer(1, n, c2.sampleRate), ch = bf.getChannelData(0); for (let k = 0; k < n; k++) ch[k] = Math.random() * 2 - 1;
        const ns = c2.createBufferSource(), bp = c2.createBiquadFilter(), ng = c2.createGain(), gate = c2.createGain(), lfo = c2.createOscillator(), lg = c2.createGain();
        ns.buffer = bf; bp.type = 'bandpass'; bp.Q.value = 10; bp.frequency.setValueAtTime(500, t + 0.65); bp.frequency.exponentialRampToValueAtTime(8000, t + 1.6);
        lfo.type = 'square'; lfo.frequency.setValueAtTime(18, t + 0.65); lfo.frequency.exponentialRampToValueAtTime(42, t + 1.6); lg.gain.value = 0.5; gate.gain.value = 0.5; lfo.connect(lg); lg.connect(gate.gain);
        ng.gain.setValueAtTime(0.0001, t); ng.gain.setValueAtTime(0.0001, t + 0.65); ng.gain.exponentialRampToValueAtTime(0.05, t + 1.3); ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.62);
        ns.connect(bp); bp.connect(gate); gate.connect(ng); ng.connect(this.master); ng.connect(this.fx); ns.start(t); lfo.start(t); ns.stop(t + 1.7); lfo.stop(t + 1.7);
        T(320, 0.95, { at: 0.65, f2: 2600, g: 0.022, atk: 0.6, fx: 1 });
        T(1975.5, 0.05, { type: 'square', g: 0.014, lp: 5000 }); T(1975.5, 0.05, { at: 0.08, type: 'square', g: 0.014, lp: 5000 }); T(2637, 0.09, { at: 0.16, type: 'square', g: 0.016, lp: 5000, fx: 1 });
        T(2637, 0.9, { at: 1.62, g: 0.03, atk: 0.004, fx: 1 }); T(1318.5, 0.5, { at: 1.62, g: 0.012, atk: 0.004 });
        break; }
      case 'scan': N(1.7, { f1: 300, f2: 6000, g: 0.03, q: 4, atk: 1.2 }); T(180, 1.7, { f2: 720, g: 0.025, atk: 0.5 }); T(1400, 0.4, { at: 1.65, g: 0.035 }); break;
      case 'send': T(880, 0.12, { f2: 1760, g: 0.05 }); N(0.12, { f1: 2000, f2: 6000, g: 0.015 }); break;
      case 'reply': T(1046.5, 0.12, { g: 0.045 }); T(1568, 0.22, { at: 0.08, g: 0.04 }); break;
      case 'tick': T(3000 + Math.random() * 900, 0.012, { type: 'square', g: 0.006, lp: 6000 }); break;
      case 'open': N(0.28, { f1: 700, f2: 3600, g: 0.03, q: 1.2 }); T(440, 0.22, { f2: 880, g: 0.04 }); break;
      case 'close': N(0.22, { f1: 3600, f2: 700, g: 0.025, q: 1.2 }); T(880, 0.18, { f2: 440, g: 0.035 }); break;
      case 'micOn': T(600, 0.1, { f2: 1200, g: 0.05 }); break;
      case 'micOff': T(1200, 0.1, { f2: 600, g: 0.05 }); break;
      case 'toggle': T(1500, 0.05, { g: 0.04 }); T(2000, 0.07, { at: 0.05, g: 0.035 }); break;
    }
  }
};
SFX.bootEl = SFX.mkAudio('loading'); SFX.welcomeEl = SFX.mkAudio('welcome'); window.__SFX = SFX;
export const ICONS = { command: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8', week: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', roadmap: 'M5 21V4M5 4h11l-2 4l2 4H5', training: 'M3 12h4l3-8l4 16l3-8h4', body: 'M12 3a2 2 0 1 0 0 4a2 2 0 1 0 0-4M6 9.5h12M12 9.5V15M12 15l-3 6M12 15l3 6', recovery: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z', fuel: 'M4 3v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3M7 3v18M20 15V3a4.5 4.5 0 0 0-4.5 4.5V13a2 2 0 0 0 2 2H20zm0 0v6', blood: 'M9 3h6M10 3v6l-5 10a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L14 9V3', journal: 'M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6zM6 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2M9 8h6M9 12h6M9 16h3', settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4', more: 'M5 12h.01M12 12h.01M19 12h.01', soundOn: 'M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12', soundOff: 'M4 9v6h4l5 4V5L8 9H4zM17 9l5 6M22 9l-5 6' };
export class Component extends React.Component<any, any> {
  state = { muted: false, vw: typeof window !== 'undefined' ? window.innerWidth : 1280, moreOpen: false, typeIdx: -1, typeN: 0, brief: null, briefBusy: false, ask: null, chatFocus: null, voiceOut: false, listening: false, heard: '', speaking: null, chatOpen: false, chatMsgs: [], chatIn: '', chatBusy: false, boot: 'pending', fxN: 0, inj: [], injF: { area: 'Knee', side: 'Left', sev: 'Mild', date: '', note: '' }, pchk: {}, wchk: {}, diet: null, al: {}, prepT: '5k', up: 0, split: null, vOv: null, rMet: 'rec', fMet: 'w', tMet: 'endH', sport: 'run', page: null, range: null, hover: null, filledFront: false, filledBack: false, bDate: undefined, bCmp: undefined, bFilter: 'flagged', sDate: undefined, sCmp: undefined };
  _baseMount() {
    const sync = () => {
      const f = !!document.querySelector('#body-front[data-filled]'), b = !!document.querySelector('#body-back[data-filled]');
      if (f !== this.state.filledFront || b !== this.state.filledBack) this.setState({ filledFront: f, filledBack: b });
    };
    this._rs = () => { if (this._rsT) return; this._rsT = requestAnimationFrame(() => { this._rsT = null; if (window.innerWidth !== this.state.vw) this.setState({ vw: window.innerWidth }); }); };
    window.addEventListener('resize', this._rs); this._touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
    try { const m = localStorage.getItem('im4-sound') === 'off'; SFX.on = !m && (this.props.sound ?? 'On') !== 'Off'; SFX.setVol(this.props.volume ?? 0.5); this.setState({ muted: m }); } catch (e) {}
    this._unlock = () => { SFX.init(); SFX.prime(); };
    window.addEventListener('pointerdown', this._unlock, { capture: true }); window.addEventListener('keydown', this._unlock, { capture: true });
    this._clk = e => { const b = e.target.closest && e.target.closest('button'); if (b && !b.dataset.sfx) SFX.play('click'); };
    document.addEventListener('click', this._clk, true);
    this.initBoot();
    this._bootVis = () => { if (document.visibilityState === 'visible' && this.state.boot === 'done' && (this.props.bootSequence ?? 'Once a day') === 'Once a day' && this.motion() !== 'Off' && this.bootDue()) this.setState({ boot: 'on' }); };
    document.addEventListener('visibilitychange', this._bootVis);
    try { this.setState({ voiceOut: localStorage.getItem('im4-voice') === '1' }); } catch (e) {}
    this._ov = e => { if (e.target.closest && e.target.closest('#im-ask-btn')) return; const sec = e.target.closest ? e.target.closest('main [data-screen-label] section') : null;
      if (sec && sec.closest('[data-screen-label="coach-chat"]')) return;
      clearTimeout(this._hideT);
      if (sec === this._sec) return;
      if (!sec) { this._hideT = setTimeout(() => { this._sec = null; this.setState({ ask: null }); }, 250); return; }
      if (this._touch) return; this._sec = sec; this.placeAsk(); };
    this._sc = () => { if (this._sec) this.placeAsk(); };
    document.addEventListener('mouseover', this._ov); window.addEventListener('scroll', this._sc, { passive: true });
    try { const cm = JSON.parse(localStorage.getItem('im4-chat') || 'null'); if (cm && cm.length) this.setState({ chatMsgs: cm }); } catch (e) {}
    this._mo = new MutationObserver(sync);
    this._mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-filled'], childList: true });
    sync();
  }
  componentWillUnmount() { this._mo && this._mo.disconnect(); document.removeEventListener('mouseover', this._ov); document.removeEventListener('visibilitychange', this._bootVis); window.removeEventListener('scroll', this._sc); try { speechSynthesis.cancel(); } catch (e) {} }
  placeAsk() { const s = this._sec; if (!s || !document.body.contains(s)) { this.setState({ ask: null }); return; } const b = s.getBoundingClientRect();
    if (b.bottom < 40 || b.top > innerHeight - 20 || (b.top + 10 > innerHeight - 110 && b.right > innerWidth - 260)) { this.setState({ ask: null }); return; }
    this.setState({ ask: { top: Math.max(14, b.top) + 'px', left: (b.right - 8) + 'px' } }); }
  cardInfo(s) { const NAMES = { verdict: 'Today\'s call', brief: 'Morning brief', injuries: 'Injury log' }; let t = NAMES[s.dataset.screenLabel] || '';
    if (!t) { const c = Array.from(s.querySelectorAll('[style*="Space Grotesk"]')).find(el => { const fs = parseFloat(getComputedStyle(el).fontSize); const tx = el.textContent.trim(); return fs >= 13.5 && fs <= 16 && tx && tx !== tx.toUpperCase() && !/^\d/.test(tx); }); if (c) t = c.textContent.trim(); }
    if (!t || t.length > 60) t = (s.innerText || '').split('\n').map(x => x.trim()).filter(Boolean)[0] || 'this card';
    return { title: t.slice(0, 60), text: (s.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 3500) }; }
  askCard() { const s = this._sec; if (!s) return; const ci = this.cardInfo(s);
    this.setState({ chatOpen: true, chatFocus: ci, ask: null }, () => this.chatSend('What should I take from my "' + ci.title + '" card?'));
    this._sec = null; }
  speak(text, id) { try { const ss = window.speechSynthesis; if (!ss) return; ss.cancel(); if (this.state.speaking === id) { this.setState({ speaking: null }); return; }
      const u = new SpeechSynthesisUtterance(text.replace(/•/g, '').replace(/\s+/g, ' ')); u.rate = 1.04; u.pitch = 0.95;
      const vs = ss.getVoices(), pick = vs.find(x => /en-GB/.test(x.lang) && /Daniel|Male|Arthur|George/i.test(x.name)) || vs.find(x => /en-GB/.test(x.lang)) || vs.find(x => /^en/.test(x.lang)); if (pick) u.voice = pick;
      u.onend = u.onerror = () => this.setState(s => s.speaking === id ? { speaking: null } : null); this.setState({ speaking: id }); ss.speak(u); } catch (e) {} }
  motion() { const m = this.props.motion ?? 'Full'; try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'Off'; } catch (e) {} return m; }
  // The loading sequence (with its sounds) plays once per calendar day per device: the first open after midnight
  // (local time). bootDone records when it last played. Also checked when the app comes back from the background, since
  // a home-screen app can resume the next morning without reloading.
  bootDue() {
    let last = 0; try { last = Number(localStorage.getItem('im4-boot-at')) || 0; } catch (e) {}
    return new Date(last).toDateString() !== new Date().toDateString();
  }
  initBoot() {
    const mode = this.props.bootSequence ?? 'Once a day';
    let seen = false; try { seen = sessionStorage.getItem('im4-booted') === '1'; } catch (e) {}
    const due = this.bootDue();
    const play = this.motion() !== 'Off' && (mode === 'Every load' || (mode === 'Once per session' && !seen) || (mode === 'Once a day' && due));
    this.setState({ boot: play ? 'on' : 'done' }, () => { if (!play) this.after(() => this.enter()); });
  }
  bootDone() { try { sessionStorage.setItem('im4-booted', '1'); localStorage.setItem('im4-boot-at', String(Date.now())); } catch (e) {} const rv = this._revealed; this._revealed = false; this.setState({ boot: 'done' }, () => { if (!rv) this.after(() => this.enter(true)); }); }

  typeOut(idx, len) {
    cancelAnimationFrame(this._tw); if (this.motion() === 'Off') { this.setState({ typeIdx: -1 }); return; }
    let n = 0, last = 0;
    const step = t => { if (this.state.typeIdx !== idx) return;
      if (t - last > 22) { last = t; const ch = this.state.chatMsgs[idx].content[n] || ''; n = Math.min(len, n + (/[.!?\n]/.test(ch) ? 1 : 3)); this.setState({ typeN: n }); SFX.play('tick');
        const el = document.getElementById('im-chat-scroll'); if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight; }
      if (n < len) this._tw = requestAnimationFrame(step); else this.setState({ typeIdx: -1 }); };
    this._tw = requestAnimationFrame(step);
  }
  chatScroll() { requestAnimationFrame(() => { const el = document.getElementById('im-chat-scroll'); if (el) el.scrollTop = el.scrollHeight; }); }
  layout(page, go, badges) {
    const w = this.state.vw, mob = w < 760, tab = !mob && w < 1100;
    const TABS = ['command', 'week', 'training', 'recovery'], MORE = ['roadmap', 'body', 'fuel', 'blood', 'journal', 'settings'];
    const lbl = id => (PAGES.find(p => p.id === id) || {}).label || 'Settings';
    const inMore = MORE.includes(page);
    const tabs = TABS.map(id => ({ id: id, label: lbl(id), go: go[id], icon: ICONS[id], badge: (badges[id] || [''])[0] })).concat([{ id: 'more', label: 'More', go: () => this.setState(s => ({ moreOpen: !s.moreOpen })), icon: ICONS.more, badge: MORE.some(id => badges[id] && badges[id][1] === R) ? '•' : '' }])
      .map(t => { const on = t.id === page || (t.id === 'more' && (inMore || this.state.moreOpen)); return Object.assign(t, { fg: on ? A : T2, bar: on ? A : 'transparent', glow: on ? '0 0 10px ' + A : 'none', f: on ? 'drop-shadow(0 0 6px oklch(0.82 0.13 210 / 0.7))' : 'none', bd: t.badge ? 'block' : 'none', bbg: t.id === 'more' ? R : (badges[t.id] || ['', A])[1] }); });
    return {
      L: { mob: mob, more: mob && this.state.moreOpen, closeMore: () => this.setState({ moreOpen: false }),
        railDisp: mob ? 'none' : 'flex', railW: tab ? '76px' : '232px', railPad: tab ? '10px' : '16px', brandPad: tab ? '0' : '8px', jc: tab ? 'center' : 'flex-start',
        txtDisp: tab ? 'none' : 'flex', setPad: tab ? '12px 0' : '12px 14px', badgeDisp: tab ? 'none' : 'inline', badgePos: 'static', cardDisp: tab ? 'none' : 'flex',
        mainMax: this.state.vw >= 2200 ? '1840px' : this.state.vw >= 1700 ? '1600px' : '1400px', mainPad: mob ? 'calc(78px + env(safe-area-inset-top)) 14px calc(104px + env(safe-area-inset-bottom))' : tab ? '24px 24px 56px' : '28px clamp(16px,3vw,48px) 56px',
        fabR: mob ? '16px' : '24px', fabB: mob ? 'calc(78px + env(safe-area-inset-bottom))' : '24px', fabPad: mob ? '6px' : '8px 18px 8px 8px', fabLbl: mob ? 'none' : 'flex',
        chatT: mob ? '0px' : '12px', chatTop: mob ? 'var(--vvt, 0px)' : '12px', chatBot: mob ? 'auto' : '12px', chatH: mob ? 'var(--vvh, 100dvh)' : 'auto', chatW: mob ? '100vw' : 'min(440px, calc(100vw - 24px))', chatR: mob ? '0px' : '22px', safeT: mob ? 'env(safe-area-inset-top)' : '0px', safeB: mob ? 'var(--vvsb, env(safe-area-inset-bottom))' : '0px', chatAnim: mob ? 'imSheet .34s cubic-bezier(.2,.8,.2,1)' : 'imIn .28s ease-out' },
      tabs: tabs,
      moreItems: MORE.map(id => { const on = id === page; const b = badges[id] || ['', T3]; return { label: lbl(id), go: go[id], icon: ICONS[id], badge: b[0], bcol: b[1], fg: on ? A : T1, bc: on ? 'oklch(0.82 0.13 210 / 0.5)' : LINE_C, bg: on ? 'oklch(0.82 0.13 210 / 0.1)' : 'oklch(1 0 0 / 0.03)' }; }),
      setIcon: ICONS.settings,
      snd: { icon: this.state.muted ? ICONS.soundOff : ICONS.soundOn, t: this.state.muted ? 'Sound off' : 'Sound on', fg: this.state.muted ? T3 : A,
        toggle: () => { const m = !this.state.muted; try { localStorage.setItem('im4-sound', m ? 'off' : 'on'); } catch (e) {} SFX.on = !m && (this.props.sound ?? 'On') !== 'Off'; this.setState({ muted: m }); if (!m) setTimeout(() => SFX.play('toggle'), 30); } }
    };
  }
  briefData() {
    const b = this.state.brief, busy = this.state.briefBusy, h = React.createElement;
    const line = (w, d) => h('div', { key: w + d, style: { height: 12, width: w, borderRadius: 6, background: 'linear-gradient(90deg, oklch(1 0 0 / 0.05) 0, oklch(0.82 0.13 210 / 0.18) 120px, oklch(1 0 0 / 0.05) 240px) 0 0 / 600px 100%', animation: 'imShimmer 1.4s linear ' + d + 's infinite' } });
    const ask = this.state.ask;
    return {
      briefOrb: h(ChatOrb, { key: 'bo', size: 38, busy: busy }),
      askOrb: h(ChatOrb, { key: 'ao', size: 18, busy: false }),
      briefSkel: h('div', { key: 'sk', style: { display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' } }, line('92%', 0), line('78%', 0.1), line('64%', 0.2), h('span', { style: { fontSize: 12, color: T3 } }, 'Reading last night\'s data…')),
      brief: {
        loading: !b || busy, ready: !!b && !busy,
        meta: busy ? activeCoach().name + ' is writing…' : b ? (b.err ? 'Offline summary · tap Regenerate' : 'Written by ' + activeCoach().name + (b.at ? ' at ' + b.at : '') + ' · from Whoop, Strava, MacroFactor and your plan') : 'Preparing…',
        rows: b ? [{ k: 'Overnight', v: b.changed, c: T2 }, { k: 'Today', v: b.today, c: T2 }, { k: 'Focus', v: b.focus, c: A }] : [],
        regen: () => this.genBrief(true),
        listen: () => b && this.speak('Overnight. ' + b.changed + ' Today. ' + b.today + ' Focus. ' + b.focus, 'brief'),
        listenT: this.state.speaking === 'brief' ? 'Stop' : 'Listen',
        ask: () => this.setState({ chatOpen: true, chatFocus: b ? { title: 'Morning brief', text: 'Overnight: ' + b.changed + '\nToday: ' + b.today + '\nFocus: ' + b.focus } : null }, () => this.chatScroll())
      },
      askBtn: { show: !!ask && !this.state.chatOpen && this.state.boot === 'done', top: ask ? ask.top : '0px', left: ask ? ask.left : '0px', go: () => this.askCard(), on: () => this.setState({ askHov: true }), off: () => this.setState({ askHov: false }), lw: this.state.askHov ? '120px' : '0px', lo: this.state.askHov ? 1 : 0 }
    };
  }
  chatData(P) {
    const page = this.state.page ?? 'command', open = this.state.chatOpen, msgs = this.state.chatMsgs, busy = this.state.chatBusy;
    const lbl = P.label === 'Tests' ? 'Tests' : P.label, S = CHAT_SUGG[page] || CHAT_SUGG.command;
    const asked = new Set(msgs.filter(m => m.role === 'user').map(m => m.content));
    const hello = { command: 'Want to talk through today\'s call?', week: 'Let\'s look at your week.', training: 'Let\'s dig into your training.', body: 'Let\'s look at your body data.', recovery: 'Let\'s look at your recovery.', fuel: 'Let\'s talk nutrition.', blood: 'Let\'s go through your test results.', journal: 'Let\'s go through your journal.', settings: 'Questions about your data sources?' }[page] || 'What would you like to know?';
    return {
      chatOrb: React.createElement(ChatOrb, { key: 'orb', size: 40, busy: false }),
      chatOrbSm: React.createElement(ChatOrb, { key: 'orbs', size: 34, busy: busy }),
      chatTyping: busy && msgs.at(-1)?.role === 'user' ? React.createElement('div', { key: 'typing', style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: T3 } },
        React.createElement('div', { style: { display: 'flex', gap: 4, padding: '12px 14px', borderRadius: '4px 14px 14px 14px', background: 'oklch(1 0 0 / 0.04)', border: '1px solid ' + LINE_C } },
          [0, 1, 2].map(i => React.createElement('span', { key: i, style: { width: 6, height: 6, borderRadius: '50%', background: A, animation: 'imDot 1.1s ease-in-out ' + (i * 0.15) + 's infinite' } }))),
        'Reading your ' + lbl + ' data…') : null,
      caretEl: React.createElement('span', { key: 'caret', style: { display: 'inline-block', width: 8, height: '1.05em', marginLeft: 2, verticalAlign: '-0.15em', background: A, boxShadow: '0 0 8px ' + A, animation: 'imCaret .9s steps(1) infinite' } }),
      chatListen: this.state.listening ? React.createElement('div', { key: 'listen', style: { alignSelf: 'flex-end', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, maxWidth: '92%' } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 3, height: 26, padding: '0 14px', borderRadius: 999, border: '1px solid oklch(0.82 0.13 210 / 0.5)', background: 'oklch(0.82 0.13 210 / 0.1)' } },
          Array.from({ length: 14 }, (_, i) => React.createElement('span', { key: i, style: { width: 3, height: 18, borderRadius: 2, background: A, boxShadow: '0 0 6px ' + A, animation: 'imWave ' + (0.6 + (i % 4) * 0.12) + 's ease-in-out ' + (i * 0.05) + 's infinite' } }))),
        React.createElement('span', { style: { fontSize: 13.5, color: T1, textAlign: 'right', lineHeight: 1.5 } }, this.state.heard || 'Listening…')) : null,
      micIcon: React.createElement('svg', { key: 'mic', width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }, React.createElement('rect', { x: 9, y: 3, width: 6, height: 11, rx: 3 }), React.createElement('path', { d: 'M5 11a7 7 0 0 0 14 0M12 18v3' })),
      chat: {
        hasFocus: !!this.state.chatFocus, focus: this.state.chatFocus ? 'Card: ' + this.state.chatFocus.title : '', clearFocus: () => this.setState({ chatFocus: null }),
        toggleVoice: () => this.setState(s => { try { localStorage.setItem('im4-voice', s.voiceOut ? '0' : '1'); if (s.voiceOut) speechSynthesis.cancel(); } catch (e) {} return { voiceOut: !s.voiceOut }; }),
        voiceT: this.state.voiceOut ? 'Voice on' : 'Voice off', voiceBc: this.state.voiceOut ? 'oklch(0.82 0.13 210 / 0.5)' : LINE_C, voiceBg: this.state.voiceOut ? 'oklch(0.82 0.13 210 / 0.14)' : 'transparent', voiceFg: this.state.voiceOut ? A : T2,
        micDown: e => { e.preventDefault(); this.micStart(); }, micUp: () => this.micStop(),
        micTitle: 'Hold to talk', micBc: this.state.listening ? 'oklch(0.82 0.13 210 / 0.8)' : LINE_C, micBg: this.state.listening ? 'oklch(0.82 0.13 210 / 0.2)' : 'transparent', micFg: this.state.listening ? A : T2,
        foot: this.state.micErr || (this.state.listening ? 'Release to send' : 'Hold the mic to talk · ' + activeCoach().name + ' can be wrong. Not medical advice.'),
        open: open, closed: !open, pageLabel: lbl, empty: msgs.length === 0, hello: hello,
        ctxNote: msgs.length ? msgs.length + ' messages' : 'answers adapt as you switch pages',
        toggle: () => this.setState(s => { SFX.play(s.chatOpen ? 'close' : 'open'); return { chatOpen: !s.chatOpen }; }, () => { this.chatScroll(); const el = document.getElementById('im-chat-in'); el && !matchMedia('(pointer: coarse)').matches && el.focus(); }), // no keyboard pop-up on phones
        reset: () => { try { localStorage.removeItem('im4-chat'); } catch (e) {} cancelAnimationFrame(this._tw); this.setState({ chatMsgs: [], chatIn: '', chatFocus: null, typeIdx: -1 }); try { speechSynthesis.cancel(); } catch (e) {} },
        sugg: S.map(t => ({ t: t, ask: () => this.chatSend(t) })),
        sugg2: S.filter(t => !asked.has(t)).slice(0, 2).map(t => ({ t: t, ask: () => this.chatSend(t) })),
        showFollow: msgs.length > 0 && !busy,
        msgs: msgs.map((m, i) => { const u = m.role === 'user', prevPage = i > 0 ? msgs[i - 1].page : null;
          const ty = i === this.state.typeIdx;
          return { typing: ty, text: ty ? m.content.slice(0, this.state.typeN) : m.content, align: u ? 'flex-end' : 'flex-start', meta: u ? (m.page !== prevPage ? 'You · on ' + m.page : '') : (m.coach || (m.err ? activeCoach().name : 'Coach Eric')) + ' · ' + m.page, // replies keep the coach who wrote them; older ones were Coach Eric's
            bg: u ? 'oklch(0.82 0.13 210 / 0.16)' : 'oklch(1 0 0 / 0.035)', bd: u ? '1px solid oklch(0.82 0.13 210 / 0.35)' : '1px solid ' + (m.err ? 'oklch(0.7 0.18 25 / 0.4)' : LINE_C),
            fg: T1, pad: '10px 14px', rad: u ? '14px 14px 4px 14px' : '4px 14px 14px 14px' }; }),
        input: this.state.chatIn, ph: 'Ask about ' + lbl.toLowerCase() + '…',
        onInput: e => this.setState({ chatIn: e.target.value }),
        onKey: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.chatSend(); } },
        send: () => this.chatSend(), sendBg: this.state.chatIn.trim() && !busy ? A : 'oklch(1 0 0 / 0.12)'
      }
    };
  }
  revealBody(base) { setTimeout(() => SFX.play('scan'), base || 0);
    document.querySelectorAll('[data-screen-label="body"] [style*="aspect-ratio"] svg').forEach(svg => {
      const vb = svg.viewBox.baseVal, H = vb.height, Y0 = vb.y;
      svg.querySelectorAll('polygon').forEach(el => { let yb = H; try { const b = el.getBBox(); yb = b.y + b.height - Y0; } catch (e) {}
        const d = base + Math.max(0, 1 - yb / H) * 1500;
        el.animate([{ opacity: 0 }, { opacity: 0, offset: 0.001 }, { opacity: 1, filter: 'brightness(2.4) drop-shadow(0 0 3px oklch(0.82 0.13 210))', offset: 0.45 }, { opacity: 1, filter: 'none' }], { duration: 700, delay: d, easing: 'ease-out', fill: 'backwards' }); });
    });
  }
  enter(fromBoot) {
    if ((this.state.page ?? 'command') === 'command') setTimeout(() => this.genBrief(), fromBoot ? 700 : 300);
    const mo = this.motion(); if (mo === 'Off') return;
    const page = this.state.page ?? 'command';
    const root = document.querySelector('[data-screen-label="' + page + '"]'); if (!root || !root.animate) return;
    const ez = 'cubic-bezier(.2,.7,.2,1)', items = [];
    const hd = document.querySelector('main > header'); if (hd) items.push(hd);
    Array.from(root.children).forEach(c => { const cs = getComputedStyle(c); if (c.tagName === 'DIV' && cs.display === 'grid' && c.children.length > 1 && c.children.length < 9) items.push.apply(items, Array.from(c.children)); else items.push(c); });
    items.slice(0, 18).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(16px)', filter: 'blur(5px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: mo === 'Full' ? 560 : 360, delay: (fromBoot ? 80 : 0) + i * (mo === 'Full' ? 65 : 35), easing: ez, fill: 'backwards' }));
    if (mo !== 'Full') return;
    const base = fromBoot ? 260 : 180;
    root.querySelectorAll('[style*="height 0.4s"]').forEach((el, i) => { el.style.transformOrigin = 'bottom'; el.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 620, delay: base + Math.min(i, 40) * 18, easing: ez, fill: 'backwards' }); });
    root.querySelectorAll('[style*="height: 100%; width:"]').forEach((el, i) => { el.style.transformOrigin = 'left'; el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 800, delay: base + 120 + Math.min(i, 30) * 30, easing: ez, fill: 'backwards' }); });
    if (page === 'body') { this.setState(s => ({ scanN: (s.scanN || 0) + 1 })); this.revealBody(base); }
    root.querySelectorAll('svg path, svg polygon').forEach((el, i) => { if (page === 'body' && el.closest('[style*="aspect-ratio"]')) return; if (i > 80) return; el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: base + i * 8, easing: 'ease-out', fill: 'backwards' }); });
    const nums = Array.from(root.querySelectorAll('span')).filter(s => s.childNodes.length === 1 && s.firstChild.nodeType === 3 && /\d/.test(s.textContent) && s.textContent.length < 12 && parseFloat(getComputedStyle(s).fontSize) >= 22).slice(0, 30);
    const glyphs = '0123456789';
    nums.forEach((s, k) => {
      const node = s.firstChild, target = node.nodeValue, t0 = performance.now() + base + k * 40, D = 650;
      const step = now => { if (node.parentNode !== s) return; const x = (now - t0) / D;
        if (x >= 1) { node.nodeValue = s.dataset.imT || target; delete s.dataset.imT; return; }
        if (x > 0) { const fixed = Math.floor(target.length * Math.max(0, x)); node.nodeValue = target.split('').map((ch, j) => j < fixed || !/\d/.test(ch) ? ch : glyphs[(Math.random() * 10) | 0]).join(''); }
        requestAnimationFrame(step); };
      s.dataset.imT = target; requestAnimationFrame(step);
    });
  }
  go(id) { if (id !== (this.state.page ?? 'command')) SFX.play('nav'); try { localStorage.setItem('im3-page', id); } catch (e) {} if (this.state.moreOpen) this.setState({ moreOpen: false });
    const anim = this.state.boot === 'done' && this.motion() === 'Full';
    // Jump to the top instantly, before and after the new page renders: iOS drops a smooth scroll when the page height
    // changes under it or a fling is still coasting, which left some pages opening mid-way down.
    const top = () => { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; };
    top();
    this.setState(s => ({ page: id, hover: null, fxN: anim ? s.fxN + 1 : s.fxN }), () => { this.after(top); if (this.state.boot === 'done') this.after(() => this.enter()); }); }
  after(fn) { requestAnimationFrame(() => requestAnimationFrame(fn)); }
  setRange(id) { this.setState({ range: id }, () => { if (this.motion() === 'Full') { this.setState(s => ({ scanN: (s.scanN || 0) + 1 })); this.after(() => this.revealBody(0)); } }); }
  heat(t) { return 'oklch(' + (0.3 + 0.54 * t).toFixed(3) + ' ' + (0.025 + 0.12 * t).toFixed(3) + ' ' + (240 - 30 * t).toFixed(0) + ')'; }
  seg(opts, cur, fn) { return opts.map(o => ({ label: o[1], pick: () => fn(o[0]), bg: o[0] === cur ? 'oklch(0.82 0.13 210 / 0.16)' : 'transparent', fg: o[0] === cur ? A : T2 })); }
  nodes(dates, sel, cmp, fn) {
    return dates.map(d => {
      const s = d[0] === sel, c = d[0] === cmp;
      return { label: d[1], sub: s ? 'Viewing' : c ? 'Comparing' : d[2], sc: s ? A : T3, pick: () => fn(d[0]),
        border: s ? '1.5px solid ' + A : c ? '1.5px dashed ' + T2 : '1px solid oklch(1 0 0 / 0.25)', fill: s ? A : c ? T2 : 'transparent',
        glow: s ? '0 0 14px oklch(0.82 0.13 210 / 0.7)' : 'none', fg: s ? T1 : T2 };
    });
  }
  bars(vals, labels, activeIdx, fmt, lo, hi) {
    return vals.map((v, i) => ({ v: fmt(v), l: labels[i], h: Math.round(12 + (v - lo) / (hi - lo) * 88) + '%', c: i === activeIdx ? A : AD, glow: i === activeIdx ? AGLOW : 'none' }));
  }
  saveLS(k, val) { try { localStorage.setItem(k, typeof val === 'string' ? val : JSON.stringify(val)); } catch (e) {} }
}

export function Dashboard(props) {
  return React.createElement(Host, { ...SETTINGS_DEFAULTS, ...props })
}

class Host extends Component {
  render() { return React.createElement(View, { v: { ...this.props, ...this.renderVals() } }) }
}
