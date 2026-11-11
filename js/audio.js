'use strict';
/* Chiptune-Musik & Soundeffekte mit WebAudio (alles synthetisch, keine Dateien). */
const AUDIO = (() => {
  let ac = null, master, musicGain, sfxGain, noiseBuf;
  let musicOn = true, sfxOn = true;
  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  const f = n => 440 * Math.pow(2, (n - 69) / 12);
  function tone(n, t, dur, type, gain, dest, slide) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f(n), t);
    if (slide) o.frequency.exponentialRampToValueAtTime(f(n + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, gain, hp, dest) {
    const s = ac.createBufferSource(), g = ac.createGain(), fl = ac.createBiquadFilter();
    s.buffer = noiseBuf; fl.type = 'highpass'; fl.frequency.value = hp || 1000;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(t); s.stop(t + dur);
  }

  /* ---------- Musikstücke (eigene Kompositionen) ---------- */
  const TRACKS = {
    sail: { bpm: 96, mel: [[74, 4], [72, 2], [69, 2], [65, 4], [67, 2], [69, 2], [67, 4], [64, 2], [67, 2], [72, 6], [0, 2], [70, 4], [69, 2], [67, 2], [65, 4], [62, 2], [65, 2], [64, 4], [67, 2], [69, 2], [69, 8]],
      bass: [38, 36, 34, 33], bassPat: [1, 0, 0, 0, 5, 0, 0, 0, 1, 0, 0, 0, 5, 0, 8, 0], arp: true, wave: 'triangle' },
    harbor: { bpm: 84, mel: [[69, 2], [72, 2], [76, 4], [74, 2], [72, 2], [74, 4], [72, 2], [71, 2], [67, 4], [0, 4], [69, 2], [72, 2], [76, 4], [79, 4], [77, 2], [76, 2], [74, 4], [72, 2], [74, 2], [76, 8]],
      bass: [45, 41, 43, 40], bassPat: [1, 0, 0, 5, 0, 0, 8, 0, 1, 0, 0, 5, 0, 0, 8, 0], arp: true, wave: 'triangle' },
    battle: { bpm: 150, mel: [[76, 2], [76, 2], [74, 2], [76, 2], [72, 4], [69, 4], [72, 2], [74, 2], [76, 2], [77, 2], [76, 4], [72, 4], [74, 2], [74, 2], [71, 2], [74, 2], [79, 4], [74, 4], [76, 6], [75, 2], [71, 4], [68, 4]],
      bass: [33, 29, 31, 28], bassPat: [1, 0, 12, 0, 1, 0, 12, 0, 1, 0, 12, 0, 1, 0, 12, 0], drums: true, wave: 'square' },
    boss: { bpm: 140, mel: [[62, 2], [65, 2], [69, 2], [74, 2], [73, 4], [69, 4], [70, 2], [69, 2], [65, 2], [62, 2], [70, 8], [67, 2], [70, 2], [74, 2], [79, 2], [77, 4], [74, 4], [73, 4], [76, 4], [79, 4], [73, 4]],
      bass: [26, 34, 31, 33], bassPat: [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 13, 0, 12, 0], drums: true, wave: 'sawtooth' },
    title: { bpm: 72, mel: [[62, 4], [69, 4], [67, 2], [65, 2], [64, 4], [65, 4], [69, 4], [72, 4], [74, 4], [72, 4], [70, 4], [69, 8], [67, 4], [65, 4], [64, 4], [62, 12]],
      bass: [38, 34, 36, 33], bassPat: [1, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0], arp: true, wave: 'triangle' }
  };
  let cur = null, step = 0, nextT = 0, timer = null, melIdx = 0, melLeft = 0;
  function schedule() {
    if (!cur || !ac) return;
    const T = TRACKS[cur], st = 60 / T.bpm / 4;
    if (nextT < ac.currentTime - 0.25) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.15) {
      const bar = Math.floor(step / 16) % 4, s = step % 16;
      const root = T.bass[bar];
      const bp = T.bassPat[s];
      if (bp) tone(root + (bp === 1 ? 0 : bp - 1), nextT, st * 1.8, 'triangle', 0.5, musicGain);
      if (T.arp && s % 2 === 0) { const ch = [0, 3, 7, 12][(s / 2) % 4] + (bar === 3 ? 1 : 0); tone(root + 24 + ch, nextT, st * 1.2, 'square', 0.05, musicGain); }
      if (T.drums) {
        if (s % 8 === 0) tone(36, nextT, 0.12, 'sine', 0.6, musicGain, -12);
        if (s % 8 === 4) noise(nextT, 0.1, 0.25, 1800, musicGain);
        if (s % 2 === 1) noise(nextT, 0.03, 0.06, 7000, musicGain);
      }
      if (melLeft <= 0) {
        const [n, len] = T.mel[melIdx % T.mel.length]; melIdx++; melLeft = len;
        if (n) { tone(n, nextT, st * len * 0.95, T.wave, T.wave === 'sawtooth' ? 0.08 : 0.13, musicGain); tone(n + 12, nextT, st * len * 0.6, 'sine', 0.03, musicGain); }
      }
      melLeft--;
      step++; nextT += st;
    }
  }
  let wanted = null;
  /* Startet ein Stück nur, wenn es nicht schon läuft – ein laufendes Stück wird nie neu begonnen */
  function music(name) {
    wanted = name;
    if (!ensure()) return;
    const target = musicOn ? name : null;
    if (cur === target) return;
    cur = target;
    step = 0; melIdx = 0; melLeft = 0; nextT = ac.currentTime + 0.05;
    clearInterval(timer);
    if (cur) timer = setInterval(schedule, 40);
  }
  /* Nur echte Änderungen (an ↔ aus) wirken sich aus */
  function setMusic(on) {
    if (musicOn === on) return;
    musicOn = on;
    if (!on) { clearInterval(timer); cur = null; }
    else if (wanted) music(wanted);
  }
  function setSfx(on) { sfxOn = on; }

  function sfx(name) {
    if (!sfxOn || !ensure()) return;
    const t = ac.currentTime, d = sfxGain;
    switch (name) {
      case 'select': tone(84, t, 0.05, 'square', 0.12, d); break;
      case 'back': tone(72, t, 0.06, 'square', 0.1, d); break;
      case 'hit': noise(t, 0.12, 0.5, 600, d); tone(50, t, 0.12, 'square', 0.25, d, -10); break;
      case 'weak': noise(t, 0.18, 0.6, 400, d); tone(62, t, 0.15, 'sawtooth', 0.25, d, -14); tone(74, t + 0.04, 0.1, 'square', 0.15, d); break;
      case 'break': for (let i = 0; i < 6; i++) tone(90 - i * 4, t + i * 0.035, 0.12, 'square', 0.15, d); noise(t, 0.5, 0.5, 3000, d); break;
      case 'correct': tone(76, t, 0.09, 'square', 0.18, d); tone(83, t + 0.08, 0.16, 'square', 0.18, d); break;
      case 'wrong': tone(52, t, 0.25, 'sawtooth', 0.22, d, -5); tone(47, t + 0.12, 0.3, 'sawtooth', 0.2, d, -5); break;
      case 'coin': tone(88, t, 0.06, 'square', 0.12, d); tone(93, t + 0.06, 0.2, 'square', 0.12, d); break;
      case 'heal': [72, 76, 79, 84].forEach((n, i) => tone(n, t + i * 0.06, 0.25, 'sine', 0.2, d)); break;
      case 'magic': tone(60, t, 0.4, 'sawtooth', 0.12, d, 24); noise(t, 0.3, 0.2, 2000, d); break;
      case 'boost': tone(67, t, 0.12, 'square', 0.15, d, 12); break;
      case 'miss': tone(70, t, 0.18, 'triangle', 0.18, d, -12); break;
      case 'enemy': noise(t, 0.2, 0.45, 300, d); tone(40, t, 0.2, 'sawtooth', 0.25, d, -6); break;
      case 'level': [72, 76, 79, 84, 88].forEach((n, i) => tone(n, t + i * 0.08, 0.2, 'square', 0.14, d)); break;
      case 'win': [67, 72, 76, 74, 77, 79, 84].forEach((n, i) => tone(n, t + [0, .1, .2, .4, .5, .6, .8][i], i === 6 ? 0.7 : 0.14, 'square', 0.14, d)); break;
      case 'splash': noise(t, 0.4, 0.35, 500, d); break;
    }
  }
  return { ensure, music, sfx, setMusic, setSfx, get playing() { return { track: cur, step }; } };
})();
