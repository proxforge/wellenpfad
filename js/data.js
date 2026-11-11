'use strict';
/* Spieldaten: Waffentypen, Helden, Fähigkeiten, Flussmonster, Gegenstände, Karte. */
const TYPES = {
  schwert: { n: 'Schwert', i: '⚔️' }, klinge: { n: 'Klinge', i: '🗡️' }, faust: { n: 'Faust', i: '✊' },
  bogen: { n: 'Bogen', i: '🏹' }, schuss: { n: 'Schuss', i: '💥' }, feuer: { n: 'Feuer', i: '🔥' },
  eis: { n: 'Eis', i: '❄️' }, blitz: { n: 'Blitz', i: '⚡' }, licht: { n: 'Licht', i: '✨' }, wind: { n: 'Wind', i: '🌪️' }
};

/* Originale Heldenfiguren (Archetypen: Klingen-Kapitän, Feuerfaust-Pirat,
   Monsterjäger, Ronin, Dämonenjäger, Revolverklingen-Söldner, Elfenschütze) */
const HEROES = {
  ryn: {
    name: 'Ryn Valtor', title: 'Klingen-Kapitän', color: '#6e5034',
    bio: 'Kapitän der „Wellenpfad“. Kühl, präzise, besessen von Sauberkeit an Deck. Kämpft mit zwei kurzen Klingen und ist schneller als jeder Hecht.',
    base: { hp: 120, sp: 40, atk: 16, mag: 8, def: 10, spd: 16 }, grow: { hp: 13, sp: 3, atk: 2.4, mag: 0.8, def: 1.3, spd: 1.3 },
    weapons: ['klinge'],
    skills: [
      { id: 'wirbel', n: 'Wirbelklinge', lv: 1, sp: 8, type: 'wind', pow: 1.1, target: 'all', d: 'Wind-Wirbel gegen alle Gegner.' },
      { id: 'spirale', n: 'Spiralschnitt', lv: 4, sp: 12, type: 'klinge', pow: 0.75, hits: 3, target: 'one', d: 'Drei schnelle Klingenhiebe.' },
      { id: 'befehl', n: 'Kapitänsbefehl', lv: 9, sp: 14, kind: 'buff', stat: 'atk', target: 'party', d: 'Angriff der Gruppe +30 % (3 Runden).' }
    ]
  },
  elarion: {
    name: 'Elarion', title: 'Elfen-Bogenschütze', color: '#3f8a4a',
    bio: 'Ein Waldelf von den Quellen des Stroms. Liest Wind und Wasser wie ein Buch und heilt mit alten Liedern.',
    base: { hp: 100, sp: 60, atk: 13, mag: 15, def: 8, spd: 14 }, grow: { hp: 10, sp: 5, atk: 1.9, mag: 2.2, def: 1.0, spd: 1.1 },
    weapons: ['bogen'],
    skills: [
      { id: 'heillied', n: 'Heillied', lv: 1, sp: 7, kind: 'heal', pow: 1.6, target: 'ally', d: 'Heilt einen Verbündeten.' },
      { id: 'lichtpfeil', n: 'Lichtpfeil', lv: 1, sp: 7, type: 'licht', pow: 1.5, target: 'one', d: 'Licht-Pfeil gegen einen Gegner.' },
      { id: 'pfeilregen', n: 'Pfeilregen', lv: 5, sp: 14, type: 'bogen', pow: 0.8, hits: 2, target: 'all', d: 'Je 2 Pfeiltreffer auf alle Gegner.' },
      { id: 'segen', n: 'Segen des Stroms', lv: 8, sp: 18, kind: 'heal', pow: 1.1, target: 'party', d: 'Heilt die ganze Gruppe.' },
      { id: 'erwecken', n: 'Wiedererwecken', lv: 12, sp: 24, kind: 'revive', target: 'dead', d: 'Belebt einen Kampfunfähigen mit 50 % LP.' }
    ]
  },
  ignaz: {
    name: 'Ignaz Glut', title: 'Feuerfaust-Pirat', color: '#c8322b',
    bio: 'Lauter Lachender mit Fäusten aus Glut. Hat mehr Schiffe versenkt als er segeln kann – genau deshalb will er jetzt den Schein machen.',
    base: { hp: 135, sp: 35, atk: 17, mag: 12, def: 9, spd: 12 }, grow: { hp: 15, sp: 3, atk: 2.5, mag: 1.6, def: 1.1, spd: 0.9 },
    weapons: ['faust'],
    skills: [
      { id: 'glutfaust', n: 'Glutfaust', lv: 1, sp: 6, type: 'feuer', pow: 1.6, target: 'one', d: 'Feuer-Schlag gegen einen Gegner.' },
      { id: 'feuersaeule', n: 'Feuersäule', lv: 5, sp: 14, type: 'feuer', pow: 1.2, target: 'all', d: 'Feuer gegen alle Gegner.' },
      { id: 'flammenherz', n: 'Flammenherz', lv: 9, sp: 10, kind: 'bp', target: 'self', d: 'Erhält sofort +2 BP.' }
    ]
  },
  varg: {
    name: 'Varg Silberwolf', title: 'Monsterjäger', color: '#9aa0aa',
    bio: 'Wortkarger Jäger mit silbernem Haar. Kennt die Schwachstellen jedes Flussungeheuers – und die Gebühren jeder Schleuse.',
    base: { hp: 130, sp: 45, atk: 16, mag: 13, def: 12, spd: 12 }, grow: { hp: 14, sp: 3.5, atk: 2.3, mag: 1.7, def: 1.5, spd: 1.0 },
    weapons: ['schwert'],
    skills: [
      { id: 'zflamme', n: 'Zeichen: Flamme', lv: 1, sp: 6, type: 'feuer', pow: 1.4, target: 'one', d: 'Feuerzeichen gegen einen Gegner.' },
      { id: 'zfrost', n: 'Zeichen: Frost', lv: 3, sp: 6, type: 'eis', pow: 1.4, target: 'one', d: 'Eiszeichen gegen einen Gegner.' },
      { id: 'analyse', n: 'Jägerblick', lv: 1, sp: 4, kind: 'scan', target: 'one', d: 'Enthüllt alle Schwächen eines Gegners.' },
      { id: 'silber', n: 'Silberklinge', lv: 8, sp: 14, type: 'schwert', pow: 2.4, target: 'one', d: 'Wuchtiger Schwerthieb.' }
    ]
  },
  kael: {
    name: 'Kael Eisfeld', title: 'Revolverklinge', color: '#1d1c22',
    bio: 'Einzelgänger mit Narbe und einer Klinge, die beim Schlag zündet. Sagt selten mehr als „…Egal.“',
    base: { hp: 125, sp: 40, atk: 18, mag: 11, def: 10, spd: 13 }, grow: { hp: 13, sp: 3, atk: 2.6, mag: 1.4, def: 1.2, spd: 1.1 },
    weapons: ['schwert', 'schuss'],
    skills: [
      { id: 'frostlade', n: 'Frostladung', lv: 1, sp: 7, type: 'eis', pow: 1.6, target: 'one', d: 'Eis-Geschoss gegen einen Gegner.' },
      { id: 'revolverhieb', n: 'Zündhieb', lv: 3, sp: 10, type: 'schuss', pow: 0.9, hits: 2, target: 'one', d: 'Zweimal Schuss-Schaden.' },
      { id: 'loewenzorn', n: 'Löwenzorn', lv: 10, sp: 22, type: 'schwert', pow: 0.7, hits: 5, target: 'one', d: 'Fünf Schwerthiebe in Folge.' }
    ]
  },
  kurogane: {
    name: 'Kurogane', title: 'Wandernder Ronin', color: '#9b1f2a',
    bio: 'Ein Veteran mit dunkler Brille und schwerem Schwert. Er hat den Strom schon einmal befahren – vor zehn Jahren.',
    base: { hp: 150, sp: 35, atk: 20, mag: 9, def: 14, spd: 10 }, grow: { hp: 16, sp: 2.6, atk: 2.8, mag: 1.0, def: 1.6, spd: 0.8 },
    weapons: ['schwert'],
    skills: [
      { id: 'bann', n: 'Bannhieb', lv: 1, sp: 9, type: 'schwert', pow: 2.0, target: 'one', d: 'Schwerer Hieb, ignoriert Abwehr.', pierce: true },
      { id: 'wache', n: 'Wächterhaltung', lv: 1, sp: 10, kind: 'buff', stat: 'def', target: 'party', d: 'Abwehr der Gruppe +40 % (3 Runden).' },
      { id: 'zorn', n: 'Schicksalszorn', lv: 6, sp: 18, type: 'feuer', pow: 1.4, target: 'all', d: 'Flammende Klinge gegen alle.' }
    ]
  },
  dorian: {
    name: 'Dorian Vex', title: 'Dämonenjäger', color: '#c42532',
    bio: 'Großmaul im roten Mantel, Pistole und Großschwert. Bezahlt seine Rechnungen nie – aber Monster fürchten ihn.',
    base: { hp: 130, sp: 40, atk: 19, mag: 12, def: 10, spd: 15 }, grow: { hp: 14, sp: 3, atk: 2.7, mag: 1.4, def: 1.1, spd: 1.2 },
    weapons: ['schuss', 'schwert'],
    skills: [
      { id: 'kugelhagel', n: 'Kugelhagel', lv: 1, sp: 10, type: 'schuss', pow: 0.55, hits: 4, target: 'random', d: 'Vier Schüsse auf zufällige Gegner.' },
      { id: 'donner', n: 'Donnerklinge', lv: 1, sp: 8, type: 'blitz', pow: 1.6, target: 'one', d: 'Blitz-Hieb gegen einen Gegner.' },
      { id: 'sturm', n: 'Sturmtanz', lv: 7, sp: 16, type: 'blitz', pow: 1.15, target: 'all', d: 'Blitze gegen alle Gegner.' }
    ]
  }
};
const HERO_ORDER = ['ryn', 'elarion', 'ignaz', 'varg', 'kael', 'kurogane', 'dorian'];
for (const id of HERO_ORDER) HEROES[id].orig = HEROES[id].name;

const MONSTERS = {
  aal:      { n: 'Schlickaal', draw: 'aal', hp: 70, atk: 11, def: 4, spd: 10, sh: 2, weak: ['klinge', 'feuer', 'bogen'], xp: 14, gold: 12 },
  hecht:    { n: 'Hechtmaul', draw: 'hecht', hp: 60, atk: 13, def: 3, spd: 15, sh: 2, weak: ['schuss', 'blitz', 'faust'], xp: 14, gold: 14 },
  krebs:    { n: 'Panzerkrebs', draw: 'krebs', hp: 90, atk: 10, def: 9, spd: 7, sh: 3, weak: ['faust', 'blitz', 'eis'], xp: 16, gold: 16 },
  nixe:     { n: 'Irrlichtnixe', draw: 'nixe', hp: 95, atk: 15, def: 6, spd: 14, sh: 3, weak: ['licht', 'schwert', 'wind'], xp: 26, gold: 22, magic: true },
  krake:    { n: 'Schlammkrake', draw: 'krake', hp: 140, atk: 16, def: 8, spd: 9, sh: 4, weak: ['feuer', 'klinge', 'schuss'], xp: 30, gold: 26 },
  golem:    { n: 'Treibholz-Golem', draw: 'golem', hp: 170, atk: 18, def: 14, spd: 6, sh: 5, weak: ['feuer', 'faust', 'schwert'], xp: 34, gold: 30 },
  rochen:   { n: 'Sturmrochen', draw: 'rochen', hp: 180, atk: 22, def: 10, spd: 17, sh: 4, weak: ['bogen', 'eis', 'schuss'], xp: 44, gold: 38 },
  qualle:   { n: 'Nesselschwarm', draw: 'qualle', hp: 160, atk: 20, def: 8, spd: 12, sh: 5, weak: ['wind', 'feuer', 'licht'], xp: 42, gold: 36, magic: true },
  welskoenig: { n: 'Welskönig Grundbart', draw: 'welskoenig', hp: 700, atk: 20, def: 12, spd: 9, sh: 7, weak: ['blitz', 'klinge', 'bogen', 'faust'], xp: 160, gold: 200, boss: true },
  hydra:    { n: 'Moorhydra', draw: 'hydra', hp: 1300, atk: 27, def: 15, spd: 11, sh: 9, weak: ['feuer', 'schwert', 'licht', 'eis'], xp: 320, gold: 400, boss: true },
  leviathan:{ n: 'Leviathan der Mündung', draw: 'leviathan', hp: 2600, atk: 36, def: 18, spd: 14, sh: 12, weak: ['blitz', 'licht', 'bogen', 'schwert', 'wind'], xp: 900, gold: 1200, boss: true }
};

const ITEMS = {
  trank:   { n: 'Heiltrank', i: '🧪', price: 30, d: 'Stellt 80 LP wieder her.', use: 'heal', val: 80, target: 'ally' },
  grosstrank: { n: 'Großer Heiltrank', i: '⚗️', price: 90, d: 'Stellt 250 LP wieder her.', use: 'heal', val: 250, target: 'ally' },
  aether:  { n: 'Seeäther', i: '💧', price: 60, d: 'Stellt 30 FP wieder her.', use: 'sp', val: 30, target: 'ally' },
  ring:    { n: 'Rettungsring', i: '🛟', price: 120, d: 'Belebt einen Kampfunfähigen mit 50 % LP.', use: 'revive', target: 'dead' },
  fackel:  { n: 'Seenotfackel', i: '🎆', price: 80, d: 'Feuerschaden (90) gegen alle Gegner.', use: 'dmgall', val: 90, type: 'feuer', target: 'none' },
  netz:    { n: 'Fischernetz', i: '🕸️', price: 70, d: 'Senkt den Schild eines Gegners um 2.', use: 'shield', val: 2, target: 'enemy' },
  kompass: { n: 'Lotsenkompass', i: '🧭', price: 40, d: 'Joker: Entfernt in einer Frage zwei falsche Antworten.', use: 'joker', target: 'quiz' },
  proviant:{ n: 'Kombüsen-Eintopf', i: '🍲', price: 150, d: 'Heilt die ganze Gruppe um 120 LP.', use: 'healall', val: 120, target: 'none' }
};

const UPGRADES = {
  blade: { n: 'Waffen schleifen', i: '⚒️', d: 'Angriff der ganzen Gruppe +8 %.', cost: l => 150 + l * 220, max: 6 },
  hull:  { n: 'Rumpf panzern', i: '🛡️', d: 'Erlittener Schaden −7 %.', cost: l => 140 + l * 200, max: 6 },
  sail:  { n: 'Neue Segel', i: '⛵', d: 'Tempo +6 %, bessere Flucht, +1 Start-BP ab Stufe 3.', cost: l => 120 + l * 180, max: 4 },
  chart: { n: 'Seekarten-Studium', i: '📜', d: 'Mehr Gold & EP aus Kämpfen (+10 %).', cost: l => 200 + l * 260, max: 5 }
};

/* Weltkarte: Flusslauf bis zur Mündung. x/y in Karten-Pixeln (256x160). */
const NODES = [
  { id: 'anker', n: 'Ankerstadt', kind: 'harbor', x: 22, y: 26, env: { time: 'day', shore: 'harbor' }, d: 'Heimathafen der Wellenpfad. Händler, Werft und das Prüfungsamt warten.' },
  { id: 'schilf', n: 'Schilfgürtel', kind: 'water', x: 58, y: 40, env: { time: 'day', shore: 'reeds', water: 'river' }, lv: [1, 3], mons: ['aal', 'hecht', 'krebs'], need: 3, d: 'Seichte Flussauen voller Schilf. Schlickaale lauern im Kraut.' },
  { id: 'schleuse', n: 'Grauwasser-Schleuse', kind: 'boss', x: 92, y: 30, env: { time: 'dusk', shore: 'forest', water: 'river' }, boss: 'welskoenig', lv: 6, d: 'Der Welskönig blockiert die Schleusenkammer.' },
  { id: 'muehle', n: 'Mühlenfurt', kind: 'harbor', x: 120, y: 52, env: { time: 'dusk', shore: 'mill' }, d: 'Müllerstädtchen an der Furt. Hier warten neue Gefährten.' },
  { id: 'nebel', n: 'Nebelauen', kind: 'water', x: 104, y: 86, env: { time: 'fog', shore: 'forest', water: 'river' }, lv: [6, 10], mons: ['nixe', 'krake', 'golem', 'aal'], need: 4, d: 'Dichter Nebel über dem Altarm. Irrlichter locken Schiffer vom Fahrwasser.' },
  { id: 'moor', n: 'Moorkehle', kind: 'boss', x: 140, y: 108, env: { time: 'night', shore: 'reeds', water: 'river' }, boss: 'hydra', lv: 13, d: 'Die Moorhydra hat sich in der Flussbiegung eingenistet.' },
  { id: 'muendung', n: 'Mündungshafen', kind: 'harbor', x: 180, y: 96, env: { time: 'night', shore: 'harbor' }, d: 'Lebhafter Seehafen an der Mündung. Laternen, Seeleute, Legenden.' },
  { id: 'watt', n: 'Wattenmeer', kind: 'water', x: 208, y: 124, env: { time: 'dawn', shore: 'sea', water: 'sea' }, lv: [13, 18], mons: ['rochen', 'qualle', 'hecht', 'krake'], need: 4, d: 'Priele, Tonnen und Gezeitenströme. Rochen jagen im Morgenlicht.' },
  { id: 'leuchtturm', n: 'Leuchtturmklippe', kind: 'boss', x: 236, y: 92, env: { time: 'storm', shore: 'lighthouse', water: 'sea' }, boss: 'leviathan', lv: 22, needExam: true, d: 'Im Sturm erhebt sich der Leviathan. Nur wer die Prüfung bestanden hat, darf hinaus.' }
];

/* Rekrutierung in Häfen */
const RECRUITS = {
  anker: [{ id: 'ignaz', after: null }],
  muehle: [{ id: 'varg', after: 'schleuse' }, { id: 'kael', after: 'schleuse' }],
  muendung: [{ id: 'kurogane', after: 'moor' }, { id: 'dorian', after: 'moor' }]
};

const STORY = {
  intro: [
    ['Erzähler', 'Seit der „Schwarze Pegel“ steigt, sind die Flussmonster erwacht. Schiffer verschwinden, Schleusen bleiben verschlossen.'],
    ['Erzähler', 'Die Wasserbehörde von Ankerstadt sucht Kapitäne, die das amtliche Wissen der Wasserstraßen beherrschen.'],
    ['Ryn Valtor', 'Lichter, Schallsignale, Vorfahrtsregeln … Wer die Regeln des Wassers kennt, dem gehorcht der Strom. So einfach ist das.'],
    ['Elarion', 'Dann lass uns lernen, Kapitän. Jede richtige Antwort lenkt unsere Klingen – jede falsche lässt sie ins Leere gehen.'],
    ['Erzähler', 'Ziel: Erreiche die Leuchtturmklippe, besteh die Prüfungssimulation im Prüfungsamt und bezwinge den Leviathan der Mündung!']
  ],
  ignaz: [['Ignaz Glut', 'Hahaha! Ihr fahrt flussabwärts? Nehmt mich mit! Ich will endlich wissen, was „zwei lange Töne“ bedeuten!']],
  varg: [['Varg Silberwolf', 'Der Welskönig ist tot? … Nicht schlecht. Ich jage, was im Nebel lauert. Ihr zahlt den Proviant.']],
  kael: [['Kael Eisfeld', '…Ich hab nichts Besseres vor. Egal. Ich komme mit.']],
  kurogane: [['Kurogane', 'Die Hydra … gefallen. Zehn Jahre habe ich gewartet. Der Leviathan schuldet mir noch etwas.']],
  dorian: [['Dorian Vex', 'Ein Seeungeheuer, ein Sturm und ein Leuchtturm? Jackpot. Ich bin dabei – solange jemand anderes die Prüfungsgebühr zahlt.']],
  welskoenig: [['Welskönig Grundbart', 'BLUBB! Wer stört meine Schleuse? Niemand passiert ohne Kenntnis der Schleusenregeln!']],
  hydra: [['Moorhydra', 'Drei Köpfe … drei Fragen … und keine Gnade für Unwissende!']],
  leviathan: [['Leviathan der Mündung', 'Ihr habt die Prüfung bestanden, Sterbliche? Dann beweist es im Sturm!']],
  ending: [
    ['Erzähler', 'Der Leviathan versinkt in der Tiefe. Der Sturm reißt auf und das Leuchtfeuer strahlt wieder über die Mündung.'],
    ['Ryn Valtor', 'Gute Arbeit, Crew. Und jetzt: ab zur echten Prüfung. Wir sind bereit.'],
    ['Erzähler', 'ENDE – Freie Fahrt ist freigeschaltet. Trainiere weiter, bis alle Fragen in Fach 5 liegen!']
  ]
};

/* Crew-Reaktionen auf Antworten: Ryn (strenger Kapitän) schimpft bei Fehlern,
   alle anderen feuern bei richtigen Antworten an. */
const REACTIONS = {
  scold: [
    'Falsch. Mit dem Wissen landest du auf der ersten Sandbank.',
    'Das steht klar im Katalog. Lies die richtige Antwort – zweimal.',
    'Schlampig. Auf dem Wasser kostet so ein Fehler mehr als Gold.',
    'Ein Kapitän rät nicht. Konzentrier dich.',
    'Noch so ein Patzer, und du schrubbst das Deck bis zur Mündung.',
    'Glaubst du, die Prüfer lassen dir das durchgehen? Ich nicht.',
    'Falscher Kurs. Korrigieren. Sofort.',
    'So steuerst du nicht mal das Beiboot.',
    'Unaufmerksam. Merk dir das endlich.',
    'Ich habe Besseres von meiner Crew erwartet.'
  ],
  scoldStreak: 'Eben noch {n} richtige in Folge – und jetzt das? Reiß dich zusammen.',
  comfort: {
    elarion: ['Kein Fluss fließt ohne Biegung. Nächstes Mal sitzt es.', 'Atme durch. Die richtige Antwort steht unten.'],
    ignaz: ['Halb so wild! Ich lag auch schon zehnmal daneben!', 'Ach was, beim nächsten Mal knallt es richtig!'],
    varg: ['Hm. Präg dir die Lösung ein.', 'Fehler macht man einmal.'],
    kael: ['…Passiert.', '…Nächstes Mal.'],
    kurogane: ['Aus Fehlern wird Erfahrung. Wenn man aus ihnen lernt.'],
    dorian: ['Autsch. Das zählen wir nicht, okay?']
  },
  praise: {
    elarion: ['Klar wie Quellwasser – gut gemacht!', 'Die Strömung ist mit dir.', 'Wunderbar, genau so steht es geschrieben.'],
    ignaz: ['HAHA! Volltreffer! Mehr davon!', 'Das brennt! Richtig gut!', 'Genau so! Ich hätte das nie gewusst!'],
    varg: ['Hm. Sauber gelöst.', 'Wissen ist die beste Klinge. Gut.', 'Treffsicher. Weiter so.'],
    kael: ['…Nicht schlecht.', '…Richtig. Weiter.', 'Das sitzt.'],
    kurogane: ['So wird ein Kapitän geschmiedet.', 'Ein guter Steuermann zweifelt nicht. Richtig.', 'Weise Antwort.'],
    dorian: ['Jackpot! Genau so!', 'Stilvoll gelöst!', 'Zu leicht für dich, was?']
  },
  praiseStreak: '{n} richtige in Folge! Weiter so!'
};
