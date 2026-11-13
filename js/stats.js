'use strict';
/* ============================================================
   VOCAB PERFECT — stats.js
   Home dashboard · Stats · Settings · boot
   ============================================================ */
const { esc, norm, shuffle, toast, speak, speakBtn, sfx, confettiBurst, download, clamp, todayKey, dateKey, fmtDate, timeAgo, streakDays, todayCount, levelInfo, markAnswer, awardXP, checkAchievements, updateHdr, goScreen, isSaved, isMastered, toggleSaved, toggleMastered, wordOfDay, applyTheme, openModal, closeModal, ACHIEVEMENTS, GAME_MODES, WORDS, PHRASES, GRAMMAR, PREPS, WRITING, ENRICH, THEME_COLORS, openWordDetail } = window.VP;

/* ---------- feature inventory (honest count shown in About) ---------- */
const FEATURES = [
  ['Core systems (XP, SRS, streaks, levels, storage)', 42],
  ['Achievements system', 38],
  ['Home dashboard & Word of the Day', 14],
  ['Words dictionary (search, filters, views, modal)', 36],
  ['Phrases library', 12],
  ['Grammar topics', 10],
  ['Preposition patterns', 8],
  ['Quiz engine (17 modes × difficulty × lives)', 48],
  ['Notebook (CRUD, bulk, status, tags)', 18],
  ['Spaced-repetition Review (SM-2 style boxes)', 16],
  ['Match pairs game', 8],
  ['Shatter (error hunter, 2 modes)', 12],
  ['Quest map (5 stages, XP, restart)', 14],
  ['Stats (heatmap, accuracy, records, activity)', 16],
  ['Settings (themes, voice, SFX, backup)', 18],
  ['UI polish (themes, confetti, SFX, particles, TTS)', 22],
  ['Keyboard shortcuts & command palette', 12],
  ['Export / Import / CSV / offline', 10],
];
const FEATURE_COUNT = FEATURES.reduce((s, f) => s + f[1], 0);

/* ============================================================
   HOME
   ============================================================ */
function renderHome() {
  const h = new Date().getHours();
  const greet = h < 5 ? 'Burning the midnight oil' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  $('#homeGreet').innerHTML = `${greet}, <em>student</em>.`;
  $('#homeDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const li = levelInfo();
  const t = todayCount();
  const acc = store.stats.totalAnswers ? Math.round(store.stats.totalCorrect / store.stats.totalAnswers * 100) : 0;
  const chips = [
    { v: `🔥 ${streakDays()}`, k: 'day streak' },
    { v: `L${li.level}`, k: `level · ${store.stats.xp} XP` },
    { v: Object.keys(store.mastered).length, k: 'mastered' },
    { v: acc + '%', k: 'accuracy' },
    { v: store.notebook.length, k: 'notebook' },
    { v: store.phrasesSaved.length, k: 'phrases saved' },
  ];
  $('#homeChips').innerHTML = chips.map(c => `<div class="stat-chip"><div class="v">${esc(c.v)}</div><div class="k">${esc(c.k)}</div></div>`).join('');
  // goal ring
  const goal = parseInt(store.settings.goal) || 10;
  const done = Math.min(t.practiced, goal);
  const C = 251.3;
  $('#goalRingFill').style.strokeDashoffset = C * (1 - done / goal);
  $('#goalRingNum').textContent = t.practiced;
  $('#goalRingTxt').textContent = done;
  $('#goalRingGoal').textContent = goal;
  $('#goalRingMsg').textContent = done >= goal ? 'Goal complete — superb! 🎉' : `Practice ${goal - done} more word${goal - done === 1 ? '' : 's'} today.`;
  // word of the day
  const wod = wordOfDay();
  $('#wodWord').textContent = wod.en;
  $('#wodUz').textContent = wod.uz;
  $('#wodEx').textContent = wod.ex ? `“${wod.ex}”` : '';
  // continue
  const lastGame = store.stats.lastGame;
  const gName = lastGame ? (GAME_MODES.find(x => x.id === lastGame) || {}).name || 'Game' : 'Quick quiz';
  $('#contGame').textContent = lastGame ? `Continue: ${gName}` : 'No session yet — try a quick quiz';
  // 7-day bars
  const bars = $('#dayBars');
  bars.innerHTML = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const rec = store.stats.daily[dateKey(d)] || { practiced: 0 };
    const max = Math.max(1, ...Object.values(store.stats.daily).map(x => x.practiced));
    const col = document.createElement('div');
    col.className = 'bar-col';
    const h = rec.practiced ? Math.max(8, Math.round(rec.practiced / max * 100)) : 3;
    col.innerHTML = `<div class="bar ${rec.practiced ? '' : 'zero'}" style="height:${h}px;" title="${dateKey(d)}: ${rec.practiced} words"></div><span>${d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}</span>`;
    bars.appendChild(col);
  }
  // recent
  const recent = $('#recentList');
  if (!store.stats.history.length) {
    recent.innerHTML = `<div class="empty-box"><i class="fa-solid fa-clock-rotate-left"></i>Words you open will appear here.</div>`;
  } else {
    recent.innerHTML = store.stats.history.slice(0, 6).map((h, i) => `
      <div class="recent-item" data-i="${i}">
        <span class="w">${esc(h.en)}</span>
        <span class="m">${esc(h.uz || '')}</span>
        <span class="t">${esc(timeAgo(h.ts))}</span>
      </div>`).join('');
    $$('.recent-item', recent).forEach(el => el.addEventListener('click', () => {
      const h = store.stats.history[parseInt(el.dataset.i)];
      if (!h) return;
      const w = WORDS.find(x => norm(x.en) === norm(h.en)) || { en: h.en, uz: h.uz };
      openWordDetail(w);
    }));
  }
  $('#wodSave').textContent = isSaved(wod.en) ? '✓ Saved' : '+ Save';
}

function buildQuickGrid() {
  const items = [
    { i: 'fa-bolt', t: 'Quick quiz', d: 'Meaning MCQ', fn: () => startGame('meaning') },
    { i: 'fa-layer-group', t: 'Flashcards', d: 'Spaced review', fn: () => goScreen('review') },
    { i: 'fa-keyboard', t: 'Spelling', d: 'Type it right', fn: () => startGame('spell') },
    { i: 'fa-scissors', t: 'Error hunter', d: 'Cut the filler', fn: () => goScreen('shatter') },
    { i: 'fa-mountain', t: 'Quest', d: '5-stage journey', fn: () => goScreen('quest') },
    { i: 'fa-pen-ruler', t: 'Grammar quiz', d: 'Recall topics', fn: () => startGame('grammar') },
    { i: 'fa-stopwatch', t: 'Speed round', d: '60 seconds', fn: () => { startGame('speed'); if (window.VP.startSpeedTimer) window.VP.startSpeedTimer(); } },
    { i: 'fa-dragon', t: 'Boss round', d: 'C1–C2 words', fn: () => startGame('boss') },
  ];
  $('#quickGrid').innerHTML = items.map((a, i) => `
    <button class="quick-card" data-i="${i}"><i class="fa-solid ${a.i}"></i><span class="t">${esc(a.t)}</span><span class="d">${esc(a.d)}</span></button>`).join('');
  $$('.quick-card', $('#quickGrid')).forEach(b => b.addEventListener('click', () => items[parseInt(b.dataset.i)].fn()));
}
$('#homeQuizBtn').addEventListener('click', () => startGame('meaning'));
$('#wodDetails').addEventListener('click', () => { const w = wordOfDay(); openWordDetail(w); });
$('#wodSave').addEventListener('click', () => {
  const w = wordOfDay();
  toggleSaved(w.en, w.uz, w.pos);
  $('#wodSave').textContent = isSaved(w.en) ? '✓ Saved' : '+ Save';
  updateHdr();
});
$('#wodSpeak').addEventListener('click', e => speakBtn(e.currentTarget, wordOfDay().en));
$('#contBtn').addEventListener('click', () => {
  if (store.stats.lastGame) {
    if (store.stats.lastGame === 'speed') { startGame('speed'); if (window.VP.startSpeedTimer) window.VP.startSpeedTimer(); }
    else startGame(store.stats.lastGame);
  } else startGame('meaning');
});

/* ============================================================
   STATS
   ============================================================ */
function fmtSec(sec) {
  sec = sec || 0;
  const m = Math.floor(sec / 60);
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
}
function renderStats() {
  $('#statsDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const li = levelInfo();
  const totalP = Object.values(store.stats.daily).reduce((s, d) => s + (d.practiced || 0), 0);
  const totalSec = Object.values(store.stats.daily).reduce((s, d) => s + (d.sec || 0), 0);
  const acc = store.stats.totalAnswers ? Math.round(store.stats.totalCorrect / store.stats.totalAnswers * 100) : 0;
  const cells = [
    { v: store.stats.xp, k: 'total XP' },
    { v: li.level, k: 'level' },
    { v: streakDays(), k: 'day streak' },
    { v: totalP, k: 'words practiced' },
    { v: store.stats.totalAnswers, k: 'answers' },
    { v: acc + '%', k: 'accuracy' },
    { v: fmtSec(totalSec), k: 'time studied' },
    { v: Object.keys(store.mastered).length, k: 'mastered' },
    { v: store.notebook.length, k: 'notebook' },
    { v: store.saved.length, k: 'saved words' },
    { v: store.phrasesSaved.length, k: 'phrases' },
    { v: store.stats.perfectRounds, k: 'perfect rounds' },
  ];
  $('#statsGrid').innerHTML = cells.map(c => `<div class="stat-chip"><div class="v">${esc(c.v)}</div><div class="k">${esc(c.k)}</div></div>`).join('');
  $('#xpBar').style.width = (li.into / li.need * 100) + '%';
  $('#xpText').textContent = `${li.into} / ${li.need} XP to level ${li.level + 1} (total ${store.stats.xp} XP)`;
  // heatmap
  const hm = $('#heatmap');
  hm.style.gridTemplateColumns = 'repeat(13, 11px)';
  hm.innerHTML = '';
  const days = [];
  for (let i = 90; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d);
  }
  days.forEach(d => {
    const rec = store.stats.daily[dateKey(d)];
    const n = rec ? rec.practiced : 0;
    const lvl = n === 0 ? '' : n < 5 ? 'l1' : n < 10 ? 'l2' : n < 20 ? 'l3' : 'l4';
    const cell = document.createElement('div');
    cell.className = 'heat-cell ' + lvl;
    cell.title = `${dateKey(d)} — ${n} words practiced`;
    hm.appendChild(cell);
  });
  // mastered by level
  const byLevel = {};
  WORDS.forEach(w => { if (isMastered(w.en)) byLevel[w.level] = (byLevel[w.level] || 0) + 1; });
  const maxL = Math.max(1, ...Object.values(byLevel));
  const lvOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  $('#levelDist').innerHTML = lvOrder.filter(l => byLevel[l]).map(l => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <span style="font:800 .7rem/1 var(--mono);color:var(--ink-dim);width:26px;">${l}</span>
      <div style="flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;"><div style="height:100%;width:${byLevel[l] / maxL * 100}%;background:linear-gradient(90deg,var(--acc),var(--acc-bright));border-radius:99px;"></div></div>
      <span style="font:700 .7rem/1 var(--mono);color:#fff;width:40px;text-align:right;">${byLevel[l]}</span>
    </div>`).join('') || `<div class="muted-note">Master words to see your level distribution.</div>`;
  // achievements
  $('#achGrid').innerHTML = ACHIEVEMENTS.map(a => {
    const done = !!store.stats.ach[a.id];
    return `<div class="ach-card ${done ? '' : 'locked'}">
      <span class="ic"><i class="fa-solid ${a.icon}"></i></span>
      <div><div class="t">${esc(a.name)}</div><div class="d">${esc(a.desc)}</div></div>
      ${done ? `<span class="date">${esc(fmtDate(store.stats.ach[a.id]))}</span>` : ''}
    </div>`;
  }).join('');
  // game bests
  $('#gameBestList').innerHTML = GAME_MODES.map(gm => {
    const best = store.stats.best[gm.id];
    return `<div class="game-best-row"><span>${esc(gm.name)}</span><b>${best ? best : '—'}</b></div>`;
  }).join('');
}
$('#statsExport').addEventListener('click', () => {
  download('vocab-perfect-stats.json', JSON.stringify({ exported: new Date().toISOString(), stats: store.stats }, null, 2), 'application/json');
  toast('Stats exported', true);
});

/* ============================================================
   SETTINGS
   ============================================================ */
function renderSettings() {
  // theme grid
  const tg = $('#themeGrid');
  const ids = ['default', ...THEME_NAMES.map(t => t[0]).filter(id => id !== 'default')];
  tg.innerHTML = ids.map(id => {
    const c = THEME_COLORS[id] ? THEME_COLORS[id][0] : '#c01010';
    const name = id === 'default' ? 'Crimson' : (THEME_NAMES.find(t => t[0] === id) || [id, id])[1];
    return `<button class="theme-swatch ${store.settings.theme === id ? 'on' : ''}" data-id="${id}" title="${esc(name)}">
      <span class="dot" style="background:${c};"></span><span>${esc(name)}</span></button>`;
  }).join('');
  $$('.theme-swatch', tg).forEach(b => b.addEventListener('click', () => {
    applyTheme(b.dataset.id);
    $$('.theme-swatch', tg).forEach(x => x.classList.toggle('on', x === b));
    toast('Theme applied', true);
    sfx('click');
  }));
  // voice
  const vs = $('#setVoice');
  if (window.speechSynthesis) {
    speechSynthesis.getVoices();
  }
  const voices = (window.speechSynthesis ? speechSynthesis.getVoices() : []).filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  vs.innerHTML = '<option value="">Default</option>' + voices.map(v => `<option value="${esc(v.name)}">${esc(v.name)} (${esc(v.lang)})</option>`).join('');
  vs.value = store.settings.voice;
  if (!vs.value && store.settings.voice) { vs.value = ''; }
  // rate
  $('#setRate').value = store.settings.rate;
  $('#setRateTxt').textContent = store.settings.rate;
  // toggles
  $('#setAutoplay').checked = !!store.settings.autoplay;
  $('#setSfx').checked = !!store.settings.sfx;
  $('#setStrict').checked = !!store.settings.strict;
  $('#setGoal').value = String(store.settings.goal);
  $('#setRounds').value = String(store.settings.rounds);
  // about
  const dataCounts = [
    ['Words', WORDS.length], ['Phrases', PHRASES.length], ['Grammar topics', GRAMMAR.length],
    ['Preposition patterns', PREPS.length], ['Writing pairs (IELTS)', WRITING.ielts.length], ['Writing pairs (Daily)', WRITING.daily.length],
    ['Enriched entries', Object.keys(ENRICH).length], ['Themes', ids.length], ['Game modes', GAME_MODES.length], ['Achievements', ACHIEVEMENTS.length],
  ];
  $('#aboutList').innerHTML = `
    <div class="about-row"><span>Total features</span><b>${FEATURE_COUNT}</b></div>
    ${FEATURES.map(f => `<div class="about-row"><span>${esc(f[0])}</span><b>${f[1]}</b></div>`).join('')}
    <div class="about-row"><span>Storage</span><b>localStorage</b></div>
    ${dataCounts.map(d => `<div class="about-row"><span>${esc(d[0])}</span><b>${d[1]}</b></div>`).join('')}
    <div class="muted-note">Shortcuts: <kbd>1</kbd>–<kbd>9</kbd>,<kbd>0</kbd>,<kbd>-</kbd>,<kbd>=</kbd> tabs · <kbd>Ctrl</kbd>+<kbd>K</kbd> search · <kbd>Space</kbd> flip · <kbd>1</kbd>–<kbd>4</kbd> rate · <kbd>Esc</kbd> close</div>`;
}
$('#setVoice').addEventListener('change', e => {
  store.settings.voice = e.target.value;
  save();
  toast('Voice saved', true);
});
$('#setVoiceTest').addEventListener('click', () => {
  const v = $('#setVoice').value;
  if (v) { store.settings.voice = v; save(); }
  if (window.speechSynthesis) speechSynthesis.getVoices();
  speak('Hello! This is Vocab Perfect.');
});
$('#setRate').addEventListener('input', e => {
  store.settings.rate = parseFloat(e.target.value);
  $('#setRateTxt').textContent = store.settings.rate;
  save();
  speak('perfect');
});
$('#setAutoplay').addEventListener('change', e => { store.settings.autoplay = e.target.checked; save(); });
$('#setSfx').addEventListener('change', e => { store.settings.sfx = e.target.checked; save(); sfx('click'); });
$('#setStrict').addEventListener('change', e => { store.settings.strict = e.target.checked; save(); toast(e.target.checked ? 'Strict typing on' : 'Lenient typing on'); });
$('#setGoal').addEventListener('change', e => { store.settings.goal = parseInt(e.target.value); save(); updateHdr(); renderHome(); });
$('#setRounds').addEventListener('change', e => { store.settings.rounds = parseInt(e.target.value); save(); });
$('#setBackup').addEventListener('click', () => {
  download('vocab-perfect-backup.json', JSON.stringify(store, null, 2), 'application/json');
  toast('Backup downloaded', true);
});
$('#setRestore').addEventListener('click', () => $('#setRestoreFile').click());
$('#setRestoreFile').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || typeof parsed !== 'object') throw new Error('bad');
      if (!parsed.notebook && !parsed.stats && !parsed.saved) throw new Error('not a backup');
      const d = defaultStore();
      store = {
        ...d, ...parsed,
        settings: { ...d.settings, ...(parsed.settings || {}) },
        stats: { ...d.stats, ...(parsed.stats || {}) },
        notebook: parsed.notebook || [], saved: parsed.saved || [], srs: parsed.srs || {},
        mastered: parsed.mastered || {}, phrasesSaved: parsed.phrasesSaved || [],
      };
      save();
      toast('Backup restored', true);
      setTimeout(() => location.reload(), 600);
    } catch (_) { toast('Invalid backup file'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});
$('#setExportDict').addEventListener('click', () => {
  const csv = ['word,uzbek,pos,level,synonyms,antonyms,example', ...WORDS.map(w => `"${String(w.en).replace(/"/g, '""')}","${String(w.uz).replace(/"/g, '""')}","${w.pos || ''}","${w.level || ''}","${(w.syn || '').replace(/"/g, '""')}","${(w.ant || '').replace(/"/g, '""')}","${String(w.ex || '').replace(/"/g, '""')}"`)].join('\n');
  download('vocab-perfect-dictionary.csv', '\ufeff' + csv, 'text/csv');
  toast(`Exported ${WORDS.length} words`, true);
});
$('#setResetStats').addEventListener('click', () => {
  if (!confirm('Reset all XP, stats and achievements? Your notebook stays.')) return;
  store.stats = defaultStore().stats;
  save(); updateHdr(); renderStats(); renderHome();
  toast('Progress reset');
});
$('#setWipe').addEventListener('click', () => {
  if (!confirm('Delete ALL local data? This cannot be undone.')) return;
  if (!confirm('Really sure? Notebook, saved words, XP — everything will be gone.')) return;
  localStorage.removeItem(DB_KEY);
  location.reload();
});

/* ============================================================
   BOOT
   ============================================================ */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false; // preserve order
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

async function loadHeavyData() {
  const st = $('#splashStatus');
  const files = [
    { name: 'words',   src: 'data/words.js' },
    { name: 'phrases', src: 'data/phrases.js' },
    { name: 'writing', src: 'data/writing.js' },
    { name: 'enrich',  src: 'data/enrich.js' },
  ];
  try {
    if (st) st.textContent = 'Loading database…';
    // Load all heavy files in parallel for maximum speed
    await Promise.all(files.map(f => loadScript(f.src)));
    setDataReady();
  } catch (err) {
    console.error(err);
    if (st) st.textContent = 'Error loading data — check console (F12)';
    toast('Failed to load some data files', false);
  }
}

function boot() {
  // Show splash + wire buttons immediately (before heavy data)
  bootSplash();
  buildQuickGrid();
  $$('.nav-btn').forEach(b => b.addEventListener('click', () => goScreen(b.dataset.screen)));
  $('#brandBtn').addEventListener('click', () => goScreen('home'));
  $('#paletteInput').addEventListener('input', e => paletteRun(e.target.value));
  $('#palette').addEventListener('click', e => { if (e.target.id === 'palette') closePalette(); });
  updateHdr();
  store.__lastActive = Date.now();

  // Load the big data files in the background
  loadHeavyData();
}
boot();
