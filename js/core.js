'use strict';
/* ============================================================
   VOCAB PERFECT — core.js
   State · storage · XP · achievements · themes · router · utils
   ============================================================ */

/* ---------- data globals (loaded from data/*.js) ---------- */
/* These start empty and are filled by refreshData() after async load */
let WORDS = window.VP_WORDS || [];
let PHRASES = window.VP_PHRASES || [];
let GRAMMAR = window.VP_GRAMMAR || [];
let PREPS = window.VP_PREPS || [];
let GAME_MODES = window.VP_GAMES || [];
let THEME_NAMES = window.VP_THEMES || [];
let WRITING = window.VP_WRITING || { ielts: [], daily: [] };
let ENRICH = window.VP_ENRICH || {};

function refreshData() {
  WORDS = window.VP_WORDS || [];
  PHRASES = window.VP_PHRASES || [];
  GRAMMAR = window.VP_GRAMMAR || [];
  PREPS = window.VP_PREPS || [];
  GAME_MODES = window.VP_GAMES || [];
  THEME_NAMES = window.VP_THEMES || [];
  WRITING = window.VP_WRITING || { ielts: [], daily: [] };
  ENRICH = window.VP_ENRICH || {};
  // keep window.VP in sync for other modules
  if (window.VP) {
    window.VP.WORDS = WORDS;
    window.VP.PHRASES = PHRASES;
    window.VP.GRAMMAR = GRAMMAR;
    window.VP.PREPS = PREPS;
    window.VP.GAME_MODES = GAME_MODES;
    window.VP.WRITING = WRITING;
    window.VP.ENRICH = ENRICH;
  }
}

/* ---------- theme palettes ---------- */
const THEME_COLORS = {
  default:   ['#c01010', '200, 30, 30'],
  emilia:    ['#8e6fc8', '142, 111, 200'],
  rem:       ['#4a90d9', '74, 144, 217'],
  ram:       ['#ff4f91', '255, 79, 145'],
  beatrice:  ['#d5a62a', '213, 166, 42'],
  roswaal:   ['#8a4fd8', '138, 79, 216'],
  echidna:   ['#9aa4b2', '154, 164, 178'],
  satella:   ['#7a3fb8', '122, 63, 184'],
  hacker:    ['#2ecc5f', '46, 204, 95'],
  naruto:    ['#ff8c1a', '255, 140, 26'],
  sasuke:    ['#4a5fc1', '74, 95, 193'],
  kakashi:   ['#7d8ea3', '125, 142, 163'],
  itachi:    ['#a3122f', '163, 18, 47'],
  akatsuki:  ['#c82828', '200, 40, 40'],
  pain:      ['#ff6b35', '255, 107, 53'],
  shikamaru: ['#8a6d3b', '138, 109, 59'],
  madara:    ['#8f1428', '143, 20, 40'],
  minato:    ['#e8b71a', '232, 183, 26'],
  hinata:    ['#b39ddb', '179, 157, 219'],
};

/* ---------- achievements ---------- */
const ACHIEVEMENTS = [
  { id: 'first_save',   icon: 'fa-bookmark',  name: 'First Blood',        desc: 'Save your first word.', check: () => store.saved.length + store.notebook.length >= 1 },
  { id: 'nb10',         icon: 'fa-book',      name: 'Note Taker',         desc: 'Add 10 words to the notebook.', check: () => store.notebook.length >= 10 },
  { id: 'nb50',         icon: 'fa-book-open', name: 'Lexicographer',      desc: 'Add 50 words to the notebook.', check: () => store.notebook.length >= 50 },
  { id: 'nb100',        icon: 'fa-books',     name: 'Archive Keeper',     desc: 'Add 100 words to the notebook.', check: () => store.notebook.length >= 100 },
  { id: 'master10',     icon: 'fa-star',      name: 'Early Bloomer',      desc: 'Master 10 words.', check: () => Object.keys(store.mastered).length >= 10 },
  { id: 'master50',     icon: 'fa-star-half-stroke', name: 'Word Smith',  desc: 'Master 50 words.', check: () => Object.keys(store.mastered).length >= 50 },
  { id: 'master100',    icon: 'fa-crown',     name: 'Vocabulary King',    desc: 'Master 100 words.', check: () => Object.keys(store.mastered).length >= 100 },
  { id: 'master250',    icon: 'fa-gem',       name: 'Polyglot Path',      desc: 'Master 250 words.', check: () => Object.keys(store.mastered).length >= 250 },
  { id: 'streak3',      icon: 'fa-fire',      name: 'Warming Up',         desc: 'Reach a 3-day streak.', check: () => streakDays() >= 3 },
  { id: 'streak7',      icon: 'fa-fire-flame-curved', name: 'On Fire',    desc: 'Reach a 7-day streak.', check: () => streakDays() >= 7 },
  { id: 'streak14',     icon: 'fa-fire-flame-simple', name: 'Fortnight', desc: 'Reach a 14-day streak.', check: () => streakDays() >= 14 },
  { id: 'streak30',     icon: 'fa-dragon',    name: 'Unstoppable',        desc: 'Reach a 30-day streak.', check: () => streakDays() >= 30 },
  { id: 'streak100',    icon: 'fa-meteor',    name: 'Centurion',          desc: 'Reach a 100-day streak.', check: () => streakDays() >= 100 },
  { id: 'perfect',      icon: 'fa-bullseye',  name: 'Flawless',           desc: 'Finish a quiz round with 100% accuracy.', check: () => store.stats.perfectRounds >= 1 },
  { id: 'perfect10',    icon: 'fa-medal',     name: 'Perfectionist',      desc: 'Score 10 perfect rounds.', check: () => store.stats.perfectRounds >= 10 },
  { id: 'perfect50',    icon: 'fa-trophy',    name: 'Flawless Fifty',     desc: 'Score 50 perfect rounds.', check: () => store.stats.perfectRounds >= 50 },
  { id: 'xp500',        icon: 'fa-bolt',      name: 'Spark',              desc: 'Earn 500 XP.', check: () => store.stats.xp >= 500 },
  { id: 'xp1000',       icon: 'fa-bolt',      name: 'Grinder',            desc: 'Earn 1,000 XP.', check: () => store.stats.xp >= 1000 },
  { id: 'xp5000',       icon: 'fa-wand-magic-sparkles', name: 'Legend',   desc: 'Earn 5,000 XP.', check: () => store.stats.xp >= 5000 },
  { id: 'xp15000',      icon: 'fa-infinity',  name: 'Transcendent',       desc: 'Earn 15,000 XP.', check: () => store.stats.xp >= 15000 },
  { id: 'quest_done',   icon: 'fa-mountain',  name: 'Summit Reached',     desc: 'Finish all 5 quest stages.', check: () => !!store.stats.quest && store.stats.quest.done },
  { id: 'games5',       icon: 'fa-gamepad',   name: 'Player One',         desc: 'Play 5 game rounds.', check: () => store.stats.gamesPlayed >= 5 },
  { id: 'games25',      icon: 'fa-dice-d6',   name: 'Game Master',        desc: 'Play 25 game rounds.', check: () => store.stats.gamesPlayed >= 25 },
  { id: 'games100',     icon: 'fa-chess',     name: 'Arcade Legend',      desc: 'Play 100 game rounds.', check: () => store.stats.gamesPlayed >= 100 },
  { id: 'speed20',      icon: 'fa-stopwatch', name: 'Speed Demon',        desc: 'Score 20+ in a Speed Round.', check: () => (store.stats.best['speed'] || 0) >= 20 },
  { id: 'speed40',      icon: 'fa-gauge-high', name: 'Lightning',         desc: 'Score 40+ in a Speed Round.', check: () => (store.stats.best['speed'] || 0) >= 40 },
  { id: 'sh_perfect',   icon: 'fa-scissors',  name: 'Surgeon',            desc: 'Complete a Shatter lesson perfectly.', check: () => store.stats.best['shatter'] >= 5 },
  { id: 'match20',      icon: 'fa-link',      name: 'Connector',          desc: 'Score 20+ in Match.', check: () => (store.stats.best['match'] || 0) >= 20 },
  { id: 'phrase10',     icon: 'fa-quote-right', name: 'Phrase Collector', desc: 'Save 10 phrases.', check: () => store.phrasesSaved.length >= 10 },
  { id: 'phrase50',     icon: 'fa-quote-left', name: 'Idiom Hunter',     desc: 'Save 50 phrases.', check: () => store.phrasesSaved.length >= 50 },
  { id: 'answers100',   icon: 'fa-bars-progress', name: 'Warm-up',       desc: 'Answer 100 questions in total.', check: () => store.stats.totalAnswers >= 100 },
  { id: 'answers500',   icon: 'fa-bars-progress', name: 'Half Marathon',  desc: 'Answer 500 questions in total.', check: () => store.stats.totalAnswers >= 500 },
  { id: 'answers2000',  icon: 'fa-flag-checkered', name: 'Marathon',     desc: 'Answer 2,000 questions in total.', check: () => store.stats.totalAnswers >= 2000 },
  { id: 'goal7',        icon: 'fa-bullseye',  name: 'Consistent',         desc: 'Hit daily goal 7 different days.', check: () => Object.values(store.stats.daily || {}).filter(v => v >= (store.settings.goal || 10)).length >= 7 },
  { id: 'all_modes',    icon: 'fa-layer-group', name: 'Mode Explorer',  desc: 'Play at least 10 different game modes.', check: () => Object.keys(store.stats.best || {}).length >= 10 },
  { id: 'night_owl',    icon: 'fa-moon',      name: 'Night Owl',          desc: 'Practice after 22:00 local time.', check: () => !!store.stats.nightOwl },
  { id: 'early_bird',   icon: 'fa-sun',       name: 'Early Bird',         desc: 'Practice before 07:00 local time.', check: () => !!store.stats.earlyBird },
];

/* ---------- store ---------- */
const DB_KEY = 'vocabperfect_v2';
function defaultStore() {
  return {
    version: 2,
    notebook: [],
    saved: [],
    srs: {},
    mastered: {},
    phrasesSaved: [],
    settings: { theme: 'default', voice: '', rate: 0.9, autoplay: true, sfx: true, goal: 10, rounds: 10, strict: false, hideUz: false },
    stats: {
      xp: 0, daily: {}, best: {}, ach: {}, quest: null, lastGame: null, lastTab: 'home',
      history: [], totalAnswers: 0, totalCorrect: 0, perfectRounds: 0, gamesPlayed: 0, shatter: { mode: 'cut', i: 0, set: 'ielts', idx: 0 },
    },
  };
}
let store = loadStore();
function loadStore() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return defaultStore();
    const p = JSON.parse(raw);
    const d = defaultStore();
    const merged = { ...d, ...p };
    merged.settings = { ...d.settings, ...(p.settings || {}) };
    merged.stats = { ...d.stats, ...(p.stats || {}) };
    merged.stats.shatter = { ...d.stats.shatter, ...((p.stats && p.stats.shatter) || {}) };
    merged.notebook = Array.isArray(p.notebook) ? p.notebook : [];
    merged.saved = Array.isArray(p.saved) ? p.saved : [];
    merged.phrasesSaved = Array.isArray(p.phrasesSaved) ? p.phrasesSaved : [];
    merged.mastered = p.mastered || {};
    merged.srs = p.srs || {};
    return merged;
  } catch { return defaultStore(); }
}
function save() { try { localStorage.setItem(DB_KEY, JSON.stringify(store)); } catch (e) { console.warn('save failed', e); } }

/* ---------- utils ---------- */
window.$ = (s, el) => (el || document).querySelector(s);
window.$$ = (s, el) => [...(el || document).querySelectorAll(s)];
const $ = window.$;
const $$ = window.$$;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const uid = () => 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DAY_MS = 86400000;
function download(name, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
function fmtDate(ts) { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }

/* ---------- toast ---------- */
let toastTimer;
function toast(msg, good) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show' + (good ? ' good' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- speech ---------- */
let voiceList = [];
let chosenVoice = null;
function refreshVoices() {
  if (!window.speechSynthesis) return;
  voiceList = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  chosenVoice = voiceList.find(v => v.name === store.settings.voice) || voiceList.find(v => v.lang === 'en-US') || voiceList[0] || null;
}
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = refreshVoices;
  refreshVoices();
}
function speak(text, cb) {
  if (!window.speechSynthesis || !text) { if (cb) cb(false); return false; }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'en-US';
    u.rate = clamp(parseFloat(store.settings.rate) || 0.9, 0.4, 1.5);
    if (chosenVoice) u.voice = chosenVoice;
    if (cb) { u.onend = () => cb(true); u.onerror = () => cb(false); }
    speechSynthesis.speak(u);
    return true;
  } catch (_) { if (cb) cb(false); return false; }
}
function speakBtn(btn, text) {
  if (!text) return;
  btn.classList.add('playing');
  speak(text, () => setTimeout(() => btn.classList.remove('playing'), 300));
  setTimeout(() => btn.classList.remove('playing'), 1800);
}

/* ---------- sound effects (WebAudio) ---------- */
let audioCtx = null;
function sfx(kind) {
  if (!store.settings.sfx) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const seq = { correct: [[660, 0], [880, .09]], wrong: [[180, 0], [150, .12]], click: [[440, 0]], flip: [[520, 0]], win: [[523, 0], [659, .12], [784, .24], [1046, .36]] }[kind] || [[440, 0]];
    seq.forEach(([f, dt]) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(.12, t + dt + .02);
      g.gain.exponentialRampToValueAtTime(.0001, t + dt + .14);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t + dt); o.stop(t + dt + .16);
    });
  } catch (_) {}
}

/* ---------- confetti ---------- */
const confCanvas = () => $('#confettiCanvas');
function confettiBurst(n = 90, colors) {
  const cv = confCanvas(); if (!cv) return;
  const ctx = cv.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cs = getComputedStyle(document.documentElement);
  const acc = (cs.getPropertyValue('--acc') || '#c01010').trim();
  const palette = colors || [acc, '#ffd700', '#ffffff', '#7fa88a', '#ff8c42'];
  const parts = [];
  for (let i = 0; i < n; i++) {
    parts.push({
      x: innerWidth / 2 + (Math.random() - .5) * 260, y: innerHeight * .35,
      vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 4,
      g: .32 + Math.random() * .12, w: 5 + Math.random() * 6, h: 8 + Math.random() * 8,
      r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
      c: palette[Math.floor(Math.random() * palette.length)], life: 120 + Math.random() * 60,
    });
  }
  let raf;
  function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = false;
    for (const p of parts) {
      if (p.life <= 0) continue;
      alive = true; p.life--;
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = clamp(p.life / 40, 0, 1);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive) raf = requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, innerWidth, innerHeight); cancelAnimationFrame(raf); }
  }
  cancelAnimationFrame(window.__cfRaf);
  window.__cfRaf = requestAnimationFrame(frame);
}

/* ---------- shatter particles ---------- */
const shards = [];
let shardLoop = null;
function spawnShards(rect, wrong) {
  const layer = $('#particleLayer'); if (!layer) return;
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const n = Math.min(18, Math.max(8, Math.round(rect.width / 8)));
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div'); s.className = 'shard';
    const size = 3 + Math.random() * 6;
    s.style.width = size + 'px'; s.style.height = size + 'px';
    if (wrong) s.style.background = 'linear-gradient(135deg, rgba(255,255,255,.9), rgba(255,95,122,.6), rgba(0,0,0,.2))';
    const x0 = cx + (Math.random() - .5) * rect.width, y0 = cy + (Math.random() - .5) * rect.height;
    s.style.left = x0 + 'px'; s.style.top = y0 + 'px';
    layer.appendChild(s);
    const ang = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
    shards.push({ node: s, x: x0, y: y0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 3, rot: Math.random() * 360, rotV: (Math.random() - .5) * 25, born: performance.now() });
  }
  if (!shardLoop) runShards();
}
function runShards() {
  function tick(now) {
    for (let i = shards.length - 1; i >= 0; i--) {
      const p = shards[i]; const age = now - p.born;
      if (age > 700) { p.node.remove(); shards.splice(i, 1); continue; }
      p.vy += 0.5; p.vx *= 0.98; p.vy *= 0.98; p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
      p.node.style.transform = `translate(${p.x - parseFloat(p.node.style.left)}px, ${p.y - parseFloat(p.node.style.top)}px) rotate(${p.rot}deg)`;
      p.node.style.opacity = Math.max(0, 1 - age / 700);
    }
    shardLoop = shards.length > 0 ? requestAnimationFrame(tick) : null;
  }
  shardLoop = requestAnimationFrame(tick);
}

/* ---------- XP & level ---------- */
function levelInfo() {
  const xp = store.stats.xp;
  const level = Math.floor(Math.sqrt(xp / 60)) + 1;
  const base = Math.pow(level - 1, 2) * 60, next = Math.pow(level, 2) * 60;
  return { level, xp, into: xp - base, need: next - base, next };
}
function awardXP(n, why) {
  if (!n) return;
  const before = levelInfo().level;
  store.stats.xp += n;
  save();
  if (store.stats.xp - n < before * 0 && levelInfo().level > before) { /* handled below */ }
  if (levelInfo().level > before) {
    sfx('win');
    confettiBurst(120);
    toast('LEVEL UP — ' + levelInfo().level, true);
  }
  updateHdr();
}
function unlockAch(id) {
  if (store.stats.ach[id]) return;
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a) return;
  store.stats.ach[id] = Date.now();
  awardXP(40, 'achievement ' + id);
  toast(`Achievement: ${a.name}`, true);
  sfx('win');
  save();
}
function checkAchievements() {
  for (const a of ACHIEVEMENTS) { if (a.check()) unlockAch(a.id); }
}
function markAnswer(correct) {
  const k = todayKey();
  const d = store.stats.daily[k] = store.stats.daily[k] || { practiced: 0, correct: 0, sec: 0 };
  d.practiced++; if (correct) d.correct++;
  store.stats.totalAnswers++; if (correct) store.stats.totalCorrect++;
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 5) store.stats.nightOwl = true;
  if (hour >= 5 && hour < 7) store.stats.earlyBird = true;
  save();
  checkAchievements();
  updateHdr();
  const goal = parseInt(store.settings.goal) || 10;
  if (d.practiced === goal) { toast('Daily goal reached!', true); sfx('win'); confettiBurst(80); }
  if (document.getElementById('screen-home').classList.contains('on')) renderHome();
}
function addStudySec() {
  const k = todayKey();
  const d = store.stats.daily[k] = store.stats.daily[k] || { practiced: 0, correct: 0, sec: 0 };
  d.sec += 15;
}
setInterval(() => {
  if (!store.__lastActive) return;
  if (Date.now() - store.__lastActive < 90000) addStudySec();
}, 15000);
window.addEventListener('beforeunload', save);

function streakDays() {
  let streak = 0;
  const d = new Date();
  if (!store.stats.daily[dateKey(d)]) d.setDate(d.getDate() - 1); // today not started yet is not a break
  while (store.stats.daily[dateKey(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
    if (streak > 3650) break;
  }
  return streak;
}
function todayCount() { return store.stats.daily[todayKey()] || { practiced: 0, correct: 0, sec: 0 }; }

/* ---------- saved / mastered ---------- */
const savedKey = en => norm(en);
function isSaved(en) { return store.saved.some(s => savedKey(s.en) === savedKey(en)); }
function isMastered(en) { return !!store.mastered[savedKey(en)]; }
function toggleSaved(en, uz, pos) {
  const k = savedKey(en);
  if (isSaved(en)) {
    store.saved = store.saved.filter(s => savedKey(s.en) !== k);
    toast('Removed from saved');
  } else {
    store.saved.unshift({ en: String(en), uz: uz || '', pos: pos || '', ts: Date.now() });
    toast('Word saved', true);
    sfx('click');
    awardXP(5, 'save word');
    checkAchievements();
  }
  save(); updateHdr();
  return isSaved(en);
}
function toggleMastered(en) {
  const k = savedKey(en);
  if (isMastered(en)) { delete store.mastered[k]; toast('Un-marked mastered'); }
  else { store.mastered[k] = Date.now(); toast('Mastered! ★', true); sfx('correct'); awardXP(15, 'master word'); }
  save(); checkAchievements();
  return isMastered(en);
}
function getSrs(en) {
  const k = savedKey(en);
  return store.srs[k] || (store.srs[k] = { box: 0, due: 0, reps: 0 });
}
function rateSrs(en, rating) { // again/hard/good/easy -> 0/1/2/3
  const rec = getSrs(en);
  const iv = [1, 2, 4, 8][rating];
  rec.reps++;
  if (rating === 0) { rec.box = Math.max(0, rec.box - 1); }
  else { rec.box = Math.min(4, rec.box + (rating >= 3 ? 2 : 1)); }
  rec.due = Date.now() + iv * DAY_MS;
  if (rec.box >= 4 && !isMastered(en)) { store.mastered[savedKey(en)] = Date.now(); }
  save();
}
function isDue(en) {
  const k = savedKey(en);
  const note = store.notebook.find(n => savedKey(n.w) === k);
  if (note) return !note.due || note.due <= Date.now();
  const rec = getSrs(en);
  return !rec.due || rec.due <= Date.now();
}

/* ---------- history ---------- */
function addHistory(en, uz) {
  const k = savedKey(en);
  store.stats.history = store.stats.history.filter(h => savedKey(h.en) !== k);
  store.stats.history.unshift({ en: String(en), uz: uz || '', ts: Date.now() });
  if (store.stats.history.length > 40) store.stats.history.length = 40;
  save();
}

/* ---------- notebook ---------- */
function hasNotebook(en) { return store.notebook.some(n => norm(n.w) === savedKey(en)); }
function addNote({ w, m, ex = '', pos = '', level = '', tags = [] }) {
  if (!w || !m || hasNotebook(w)) return false;
  store.notebook.unshift({
    id: uid(), w: w.trim(), m: m.trim(), ex: (ex || '').trim(), pos: (pos || '').trim(),
    level: (level || '').trim(), tags: (Array.isArray(tags) ? tags : String(tags || '').split(',').map(t => t.trim()).filter(Boolean)),
    status: 'learning', createdAt: Date.now(), box: 0, due: 0, reps: 0,
  });
  save(); checkAchievements();
  return true;
}
function delNote(id) { store.notebook = store.notebook.filter(n => n.id !== id); save(); }

/* ---------- theme ---------- */
function applyTheme(id) {
  const t = THEME_COLORS[id] ? id : 'default';
  store.settings.theme = t;
  document.documentElement.dataset.theme = t;
  save();
}

/* ---------- router ---------- */
const TAB_ORDER = ['home', 'words', 'phrases', 'grammar', 'preps', 'games', 'notebook', 'review', 'shatter', 'quest', 'stats', 'settings'];
const RENDER_HOOKS = {
  home: () => renderHome(),
  words: () => renderWords(true),
  phrases: () => renderPhrases(true),
  grammar: () => renderGrammar(),
  preps: () => renderPreps(),
  games: () => renderHub(),
  notebook: () => renderNotebook(),
  review: () => renderReview(),
  shatter: () => shatterEnter(),
  quest: () => questEnter(),
  stats: () => renderStats(),
  settings: () => renderSettings(),
};
function goScreen(name) {
  if (!TAB_ORDER.includes(name)) name = 'home';
  $$('.screen').forEach(s => s.classList.toggle('on', s.id === 'screen-' + name));
  $$('.nav-btn').forEach(b => b.classList.toggle('on', b.dataset.screen === name));
  store.stats.lastTab = name; save();
  store.__lastActive = Date.now();
  const hook = RENDER_HOOKS[name];
  if (hook) hook();
  const nav = $('#nav');
  const active = nav.querySelector('.nav-btn.on');
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
  window.scrollTo({ top: 0 });
}
function openModal(overlayId) { const o = $('#' + overlayId); if (o) { o.classList.add('show'); document.body.style.overflow = 'hidden'; } }
function closeModal(overlayId) { const o = $('#' + overlayId); if (o) { o.classList.remove('show'); document.body.style.overflow = ''; } }

/* ---------- header ---------- */
function updateHdr() {
  const goal = parseInt(store.settings.goal) || 10;
  const done = Math.min(todayCount().practiced, goal);
  const g = $('#hdrGoal'), gt = $('#hdrGoalTxt');
  if (gt) gt.textContent = done + '/' + goal;
  if (g) g.classList.toggle('ring-full', done >= goal);
  const hs = $('#hdrStreak'); if (hs) hs.textContent = streakDays();
  const li = levelInfo(); const hl = $('#hdrLvl'); if (hl) hl.textContent = 'L' + li.level;
  const hc = $('#hdrCount'); if (hc) hc.textContent = store.notebook.length + store.saved.length;
}

/* ---------- word of the day ---------- */
function wordOfDay() {
  const d = new Date();
  const seed = (d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate());
  return WORDS[seed % WORDS.length];
}

/* ---------- search palette (Ctrl+K) ---------- */
let paletteIdx = 0, paletteResults = [];
function openPalette() {
  $('#palette').classList.add('show');
  const inp = $('#paletteInput');
  inp.value = '';
  paletteRun('');
  setTimeout(() => inp.focus(), 30);
}
function closePalette() { $('#palette').classList.remove('show'); }
function paletteRun(q) {
  const box = $('#paletteResults');
  q = norm(q);
  paletteResults = [];
  if (!q) {
    box.innerHTML = `<div class="palette-empty">Type to search ${WORDS.length} words, ${PHRASES.length} phrases and ${GRAMMAR.length} grammar topics…</div>`;
    return;
  }
  const items = [];
  for (const w of WORDS) {
    if (w.en.toLowerCase().startsWith(q) && items.length < 8) items.push({ t: 'word', en: w.en, uz: w.uz, obj: w });
  }
  if (items.length < 8) for (const w of WORDS) {
    const hay = (w.en + ' ' + w.uz + ' ' + (w.syn || '')).toLowerCase();
    if (hay.includes(q) && !items.find(i => i.en === w.en)) items.push({ t: 'word', en: w.en, uz: w.uz, obj: w });
    if (items.length >= 8) break;
  }
  for (const p of PHRASES) {
    const hay = (p.phrase + ' ' + p.uz).toLowerCase();
    if (hay.includes(q) && !items.find(i => i.t === 'phrase' && i.en === p.phrase)) items.push({ t: 'phrase', en: p.phrase, uz: p.uz, obj: p });
    if (items.length >= 12) break;
  }
  for (const g of GRAMMAR) {
    const hay = (g[0] + ' ' + g[1]).toLowerCase();
    if (hay.includes(q)) items.push({ t: 'grammar', en: g[0], uz: g[1], obj: g });
    if (items.length >= 14) break;
  }
  paletteResults = items.slice(0, 14);
  paletteIdx = 0;
  drawPalette();
}
function drawPalette() {
  const box = $('#paletteResults');
  if (!paletteResults.length) { box.innerHTML = `<div class="palette-empty">No matches for this search.</div>`; return; }
  box.innerHTML = paletteResults.map((it, i) => `
    <div class="palette-item ${i === paletteIdx ? 'sel' : ''}" data-i="${i}">
      <span class="ic"><i class="fa-solid ${it.t === 'word' ? 'fa-graduation-cap' : it.t === 'phrase' ? 'fa-quote-right' : 'fa-pen-ruler'}"></i></span>
      <span class="w">${esc(it.en)}</span>
      <span class="m">${esc(it.uz)}</span>
      <span class="k">${it.t}</span>
    </div>`).join('');
  $$('.palette-item', box).forEach(el => el.addEventListener('click', () => palettePick(parseInt(el.dataset.i))));
}
function palettePick(i) {
  const it = paletteResults[i];
  if (!it) return;
  closePalette();
  if (it.t === 'word') openWordDetail(it.obj, true);
  else if (it.t === 'phrase') openPhraseDetail(it.obj);
  else if (it.t === 'grammar') openGrammarDetail(it.obj);
}

/* ---------- splash ---------- */
function bootSplash() {
  const st = $('#splashStatus');
  if (st) st.textContent = 'Starting…';
  $('#enterBtn').addEventListener('click', enterApp);
  // Disable the button until data is ready
  const btn = $('#enterBtn');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.55';
    btn.style.pointerEvents = 'none';
    const label = btn.querySelector('span:first-child');
    if (label) {
      btn.dataset.origLabel = label.textContent;
      label.textContent = 'Loading…';
    }
  }
  $('#watchBtn').addEventListener('click', () => { openModal('videoOverlay'); const v = $('#authorVideo'); v.currentTime = 0; v.play().catch(() => {}); });
  $('#videoClose').addEventListener('click', () => { closeModal('videoOverlay'); $('#authorVideo').pause(); });
  $('#videoOverlay').addEventListener('click', e => { if (e.target.id === 'videoOverlay') { closeModal('videoOverlay'); $('#authorVideo').pause(); } });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal('videoOverlay'); closeModal('detailOverlay'); closeModal('gameOverlay'); closePalette();
      $('#authorVideo').pause();
    }
  });
  if (store.settings.theme !== 'default') applyTheme(store.settings.theme);
}

function setDataReady() {
  refreshData();
  const st = $('#splashStatus');
  if (st) st.textContent = `${WORDS.length} words · ${PHRASES.length} phrases · ${GRAMMAR.length} grammar · ${GAME_MODES.length} games · ready`;
  const btn = $('#enterBtn');
  if (btn) {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.pointerEvents = '';
    const label = btn.querySelector('span:first-child');
    if (label && btn.dataset.origLabel) label.textContent = btn.dataset.origLabel;
  }
}

function enterApp() {
  if (!WORDS.length) {
    toast('Still loading data… please wait a moment');
    return;
  }
  $('#author').classList.add('hide');
  $('#app').classList.add('show');
  sfx('click');
  updateHdr();
  goScreen(store.stats.lastTab || 'home');
  setTimeout(() => confettiBurst(60), 200);
}

/* ---------- keyboard shortcuts ---------- */
const KEY_TABS = { '1': 'home', '2': 'words', '3': 'phrases', '4': 'grammar', '5': 'preps', '6': 'games', '7': 'notebook', '8': 'review', '9': 'shatter', '0': 'quest', '-': 'stats', '=': 'settings' };
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); if ($('#app').classList.contains('show')) openPalette(); return; }
  if ($('#palette').classList.contains('show')) {
    if (e.key === 'ArrowDown') { e.preventDefault(); paletteIdx = Math.min(paletteResults.length - 1, paletteIdx + 1); drawPalette(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); paletteIdx = Math.max(0, paletteIdx - 1); drawPalette(); }
    else if (e.key === 'Enter') { e.preventDefault(); palettePick(paletteIdx); }
    return;
  }
  if (!$('#app').classList.contains('show')) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
  if (e.key === 'Escape') {
    if ($('#gameOverlay').classList.contains('show')) { if (window.VP.quitGame) window.VP.quitGame(); else closeModal('gameOverlay'); }
    else if ($('#detailOverlay').classList.contains('show')) closeModal('detailOverlay');
    return;
  }
  // rate-card shortcuts take priority while reviewing (keys 1-4)
  if (['1', '2', '3', '4'].includes(e.key)) {
    const scr = $('.screen.on');
    if (scr && scr.id === 'screen-review' && store.__rvFlipped && window.__rateCard) {
      window.__rateCard({ '1': 0, '2': 1, '3': 2, '4': 3 }[e.key]);
      return;
    }
  }
  if (KEY_TABS[e.key]) { goScreen(KEY_TABS[e.key]); }
  else if (e.key === ' ') {
    const scr = $('.screen.on');
    if (scr && scr.id === 'screen-review' && store.__rvDeck && store.__rvDeck.length && window.__flipCard) { e.preventDefault(); window.__flipCard(); }
  }
});

/* expose for other files */
window.VP = { $, $$, esc, norm, shuffle, toast, speak, speakBtn, sfx, confettiBurst, spawnShards, download, clamp, uid, todayKey, dateKey, timeAgo, fmtDate, awardXP, unlockAch, checkAchievements, markAnswer, streakDays, todayCount, levelInfo, isSaved, isMastered, toggleSaved, toggleMastered, getSrs, rateSrs, isDue, addHistory, hasNotebook, addNote, delNote, applyTheme, goScreen, openModal, closeModal, updateHdr, wordOfDay, savedKey, THEME_COLORS, ACHIEVEMENTS, TAB_ORDER, GAME_MODES, WORDS, PHRASES, GRAMMAR, PREPS, WRITING, ENRICH, refreshData };
