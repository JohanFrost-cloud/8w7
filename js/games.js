'use strict';
/* ============================================================
   VOCAB PERFECT — games.js
   Quiz engine + 17 game modes + hub
   ============================================================ */
const { esc, norm, shuffle, toast, speak, speakBtn, sfx, confettiBurst, markAnswer, awardXP, toggleSaved, isSaved, getSrs, rateSrs, isMastered, toggleMastered, goScreen, openModal, closeModal, checkAchievements } = window.VP;

const GAME_META = {
  meaning:    { icon: 'fa-language',           desc: 'Pick the Uzbek meaning of the English word.' },
  reverse:    { icon: 'fa-right-left',         desc: 'Pick the English word for the Uzbek meaning.' },
  spell:      { icon: 'fa-keyboard',           desc: 'Hear the word, then type its exact spelling.' },
  context:    { icon: 'fa-scene',              desc: 'Choose the word that fits the example sentence.' },
  synonym:    { icon: 'fa-circle-plus',        desc: 'Pick the synonym of the given word.' },
  antonym:    { icon: 'fa-circle-minus',       desc: 'Pick the opposite of the given word.' },
  truefalse:  { icon: 'fa-check-double',       desc: 'Is the translation correct? True or false.' },
  odd:        { icon: 'fa-egg',                desc: 'Three words share a part of speech — find the odd one.' },
  phrase:     { icon: 'fa-quote-right',        desc: 'Pick the meaning of the phrase.' },
  grammar:    { icon: 'fa-pen-ruler',          desc: 'Match the grammar description to its topic.' },
  prep:       { icon: 'fa-puzzle-piece',       desc: 'Fill the blank in the preposition pattern.' },
  listen:     { icon: 'fa-headphones',         desc: 'Hear the word — pick the written form.' },
  mixed:      { icon: 'fa-blender',            desc: 'A random mix of every question type.' },
  speed:      { icon: 'fa-stopwatch',          desc: '60 seconds. How many meanings can you hit?' },
  boss:       { icon: 'fa-dragon',             desc: '10 hard C1–C2 words. Three lives only.' },
  translation:{ icon: 'fa-arrow-right-arrow-left', desc: 'Type the English word for the Uzbek meaning.' },
  example:    { icon: 'fa-ellipsis',           desc: 'Complete the example sentence by typing the word.' },
};

const hasTTS = () => !!(window.speechSynthesis && window.SpeechSynthesisUtterance);

/* ---------- pools & helpers ---------- */
const isBad = s => !s || s === '—';
function wordUz(w) { return (w.uz || '').trim(); }
function synTokens(w, field) {
  return String(w[field] || '').split(',').map(s => s.trim().toLowerCase()).filter(s => s && s !== '—');
}
function pickDistractors(pool, correctVal, n, keyFn) {
  const seen = new Set([norm(correctVal)]);
  const out = [];
  const arr = shuffle(pool);
  for (const p of arr) {
    const v = keyFn(p);
    const k = norm(v);
    if (!v || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= n) break;
  }
  return out;
}
function wordPool(level) {
  let pool = WORDS;
  if (level === 'hard') pool = WORDS.filter(w => w.level === 'C1' || w.level === 'C2');
  else if (level === 'easy') pool = WORDS.filter(w => w.level === 'B1');
  else if (level === 'med') pool = WORDS.filter(w => w.level === 'B2');
  return pool.length ? pool : WORDS;
}
function blankExample(w) {
  const ex = w.ex || '';
  const re = new RegExp('\\b' + w.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
  const out = ex.replace(re, '___');
  return out === ex ? ex.replace(new RegExp(w.en, 'i'), '___') : out;
}
function typeHint(w) {
  const en = String(w.en);
  const letters = en.split('').map(c => c === ' ' ? ' ' : '·').join(' ');
  return `Starts with “${esc(en.slice(0, 2))}” · ${en.length} letters: ${esc(letters)}`;
}
function acceptList(w) {
  const out = new Set([norm(w.en)]);
  synTokens(w, 'syn').forEach(s => out.add(norm(s)));
  return out;
}
function matchTyped(input, w) {
  const typed = norm(input).replace(/[.,!?;:'"’‘“”]/g, '');
  const acc = acceptList(w);
  if (acc.has(typed)) return true;
  if (!store.settings.strict) {
    for (const a of acc) {
      if (typed && (a === typed || (a.length > 4 && Math.abs(a.length - typed.length) <= 1 && a.slice(0, 3) === typed.slice(0, 3)))) return true;
    }
  }
  return false;
}

/* ---------- question builders ---------- */
function buildQuestions(mode, n, poolLevel) {
  const qs = [];
  const pool = wordPool(poolLevel);
  for (let i = 0; i < n; i++) {
    const q = buildOne(mode, pool);
    if (!q) continue;
    qs.push(q);
  }
  return qs;
}

function buildOne(mode, pool) {
  const M = 'meaning', R = 'reverse', TF = 'truefalse', CTX = 'context', PH = 'phrase';
  let m = mode;
  if (m === 'mixed') m = shuffle([M, R, TF, CTX, PH])[0];
  if (m === 'speed') m = M;
  if (m === M) {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (!wordUz(w)) return null;
    const opts = shuffle([{ t: wordUz(w), correct: true }, ...pickDistractors(pool, wordUz(w), 3, wordUz).map(t => ({ t, correct: false }))]);
    return { kind: 'mcq', mode: 'meaning', word: w, display: w.en, prompt: 'What does this word mean?', speak: w.en, options: opts, explain: `${w.en} — ${w.uz}${w.pos ? ' (' + w.pos + ')' : ''}` };
  }
  if (m === R) {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (!wordUz(w)) return null;
    const opts = shuffle([{ t: w.en, correct: true }, ...pickDistractors(pool, w.en, 3, x => x.en).map(t => ({ t, correct: false }))]);
    return { kind: 'mcq', mode: 'reverse', word: w, display: wordUz(w), prompt: 'Which English word matches?', options: opts, explain: `${wordUz(w)} — ${w.en}` };
  }
  if (m === TF) {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (!wordUz(w)) return null;
    const lie = Math.random() < 0.5;
    const shown = lie ? pickDistractors(pool, wordUz(w), 1, wordUz)[0] : wordUz(w);
    if (lie && !shown) return null;
    return { kind: 'mcq', mode: 'truefalse', word: w, display: w.en, prompt: `“${shown}” — correct meaning?`, options: [{ t: 'True', correct: !lie }, { t: 'False', correct: lie }], explain: `${w.en} really means “${wordUz(w)}”` };
  }
  if (m === CTX) {
    const withEx = pool.filter(w => w.ex && w.ex.length > 8);
    const w = withEx[Math.floor(Math.random() * withEx.length)];
    if (!w) return null;
    const opts = shuffle([{ t: w.en, correct: true }, ...pickDistractors(pool, w.en, 3, x => x.en).map(t => ({ t, correct: false }))]);
    return { kind: 'mcq', mode: 'context', word: w, display: blankExample(w), prompt: `Complete the sentence. (UZ: ${w.exUz || wordUz(w)})`, options: opts, explain: `${w.en} — ${wordUz(w)}` };
  }
  if (m === 'synonym' || m === 'antonym') {
    const field = m === 'synonym' ? 'syn' : 'ant';
    const candidates = pool.filter(w => synTokens(w, field).length);
    const w = candidates[Math.floor(Math.random() * candidates.length)];
    if (!w) return null;
    const target = synTokens(w, field)[0];
    const matches = pool.filter(x => norm(x.en) !== norm(w.en) && (norm(x.en) === target || synTokens(x, 'syn').includes(target)));
    if (!matches.length) return null;
    const right = matches[Math.floor(Math.random() * matches.length)];
    const opts = shuffle([{ t: right.en, correct: true }, ...pickDistractors(pool, right.en, 3, x => x.en).map(t => ({ t, correct: false }))]);
    return { kind: 'mcq', mode: m, word: w, display: w.en, prompt: m === 'synonym' ? 'Which word is a synonym?' : 'Which word is the opposite?', options: opts, explain: `${w.en} ↔ ${right.en}` };
  }
  if (m === 'odd') {
    const byPos = {};
    pool.forEach(w => { if (w.pos && !w.pos.includes('/')) { (byPos[w.pos] = byPos[w.pos] || []).push(w); } });
    const poses = Object.keys(byPos).filter(p => byPos[p].length >= 3);
    if (!poses.length) return null;
    const main = byPos[poses[Math.floor(Math.random() * poses.length)]];
    const trio = shuffle(main).slice(0, 3);
    const others = pool.filter(w => w.pos && !w.pos.includes('/') && w.pos !== trio[0].pos);
    const oddW = others[Math.floor(Math.random() * others.length)];
    if (!oddW) return null;
    const words = shuffle([...trio, oddW]);
    return { kind: 'mcq', mode: 'odd', word: oddW, display: 'Which word is the odd one out?', prompt: 'Three words share the same part of speech.', options: words.map(w => ({ t: w.en, correct: w === oddW })), explain: `“${oddW.en}” is ${oddW.pos}; the others are ${trio[0].pos}.` };
  }
  if (m === PH) {
    const p = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    const opts = shuffle([{ t: p.uz, correct: true }, ...pickDistractors(PHRASES, p.uz, 3, x => x.uz).map(t => ({ t, correct: false }))]);
    return { kind: 'mcq', mode: 'phrase', word: { en: p.phrase, uz: p.uz, pos: p.group }, display: p.phrase, prompt: 'What does this phrase mean?', speak: p.phrase, options: opts, explain: `${p.phrase} — ${p.uz}` };
  }
  if (m === 'grammar') {
    const g = GRAMMAR[Math.floor(Math.random() * GRAMMAR.length)];
    const opts = shuffle([{ t: g[0], correct: true }, ...shuffle(GRAMMAR).filter(x => x[0] !== g[0]).slice(0, 3).map(x => ({ t: x[0], correct: false }))]);
    return { kind: 'mcq', mode: 'grammar', word: { en: g[0], uz: g[1] }, display: g[1], prompt: 'Which grammar topic is this?', options: opts, explain: `${g[0]}: ${g[2]}` };
  }
  if (m === 'prep') {
    const single = PREPS.filter(p => /^[A-Z]+$/.test(p[0].trim()));
    const p = single[Math.floor(Math.random() * single.length)];
    if (!p) return null;
    const token = p[0].trim().toLowerCase();
    const segs = p[1].split(';').map(s => s.trim()).filter(s => s.toLowerCase().includes(token));
    const seg = segs[Math.floor(Math.random() * segs.length)] || p[1].split(';')[0].trim();
    const display = seg.replace(new RegExp('\\b' + token + '\\b', 'gi'), '___');
    const opts = shuffle([{ t: p[0], correct: true }, ...shuffle(single).filter(x => x[0] !== p[0]).slice(0, 3).map(x => ({ t: x[0], correct: false }))]);
    return { kind: 'mcq', mode: 'prep', word: { en: p[0], uz: p[2] }, display, prompt: 'Which preposition completes the pattern?', options: opts, explain: `${p[0]} — ${p[2]}` };
  }
  if (m === 'listen') {
    const w = pool[Math.floor(Math.random() * pool.length)];
    const opts = shuffle([{ t: w.en, correct: true }, ...pickDistractors(pool, w.en, 3, x => x.en).map(t => ({ t, correct: false }))]);
    return { kind: 'listen', mode: 'listen', word: w, display: w.en, prompt: 'Tap the word you hear.', speak: w.en, options: opts, explain: `${w.en} — ${wordUz(w)}` };
  }
  if (m === 'translation') {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (!wordUz(w)) return null;
    return { kind: 'type', mode: 'translation', word: w, display: wordUz(w), prompt: 'Type the English word.', accept: acceptList(w), hint: typeHint(w), explain: `${wordUz(w)} — ${w.en}` };
  }
  if (m === 'spell') {
    const w = pool[Math.floor(Math.random() * pool.length)];
    return { kind: 'type', mode: 'spell', word: w, display: '🔊 Listen carefully…', prompt: 'Type the word you hear.', accept: acceptList(w), hint: typeHint(w), speak: w.en, explain: `${w.en} — ${wordUz(w)}` };
  }
  if (m === 'example') {
    const withEx = pool.filter(w => w.ex && w.ex.length > 8);
    const w = withEx[Math.floor(Math.random() * withEx.length)];
    if (!w) return null;
    return { kind: 'type', mode: 'example', word: w, display: blankExample(w), prompt: `Type the missing word. (UZ: ${w.exUz || wordUz(w)})`, accept: acceptList(w), hint: typeHint(w), explain: `${w.en} — ${wordUz(w)}` };
  }
  if (m === 'boss') {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (!wordUz(w)) return null;
    const opts = shuffle([{ t: wordUz(w), correct: true }, ...pickDistractors(pool, wordUz(w), 3, wordUz).map(t => ({ t, correct: false }))]);
    return { kind: 'mcq', mode: 'boss', word: w, display: w.en, prompt: `Boss round! What does this ${w.level || 'hard'} word mean?`, options: opts, explain: `${w.en} — ${wordUz(w)}` };
  }
  return null;
}

/* ---------- engine ---------- */
const g = {
  mode: null, title: '', qs: [], idx: 0, score: 0, lives: 3, streak: 0, bestStreak: 0,
  answered: 0, mistakes: [], timerLeft: 0, timerInt: null, finished: false, typing: false, diff: 'all',
};
window.__game = g;

function gameTitle(mode) {
  const name = (GAME_MODES.find(x => x.id === mode) || {}).name || mode;
  return name;
}

function startGame(mode, opts = {}) {
  g.mode = mode;
  g.title = gameTitle(mode);
  g.idx = 0; g.score = 0; g.streak = 0; g.bestStreak = 0; g.answered = 0;
  g.mistakes = []; g.finished = false; g.typing = false;
  const poolLevel = mode === 'boss' ? 'hard' : (g.diff || 'all');
  if (mode === 'speed') {
    g.lives = Infinity;
    g.qs = [];
    g.timerLeft = 60;
  } else if (mode === 'boss') {
    g.lives = 3;
    g.qs = buildQuestions('boss', 10, poolLevel);
    if (g.qs.length < 5) { g.qs = buildQuestions('meaning', 10, 'all'); }
  } else {
    g.lives = Infinity;
    const n = parseInt(store.settings.rounds) || 10;
    g.qs = buildQuestions(mode, n, poolLevel);
    if (!g.qs.length) { toast('Not enough data for this mode'); return; }
  }
  store.stats.lastGame = mode; save();
  openModal('gameOverlay');
  renderGameShell();
  nextQuestion();
}

function renderGameShell() {
  const m = $('#gameModal');
  m.innerHTML = `
    <div class="g-top">
      <span class="g-title"><i class="fa-solid ${GAME_META[g.mode]?.icon || 'fa-gamepad'}"></i> ${esc(g.title)}</span>
      <span class="g-progress-txt" id="gProgressTxt"></span>
      <button class="modal-close" id="gQuit" aria-label="Quit" style="position:static;width:30px;height:30px;">✕</button>
    </div>
    <div class="g-body" id="gBody"></div>`;
  $('#gQuit').addEventListener('click', () => quitGame());
}
function quitGame() {
  if (g.timerInt) { clearInterval(g.timerInt); g.timerInt = null; }
  closeModal('gameOverlay');
  if (g.answered > 0) { g.finished = true; finishGame(true); }
}
function updateProgress() {
  const el = $('#gProgressTxt');
  if (!el) return;
  if (g.mode === 'speed') {
    el.innerHTML = `<span class="g-timer ${g.timerLeft <= 10 ? 'low' : ''}">⏱ ${g.timerLeft}s</span>`;
  } else if (g.mode === 'boss') {
    el.innerHTML = `<span class="g-lives">${'❤️'.repeat(Math.max(0, g.lives))}${'🖤'.repeat(Math.max(0, 3 - g.lives))}</span>`;
  } else {
    el.innerHTML = `<span class="g-timer">${g.idx + 1} / ${g.qs.length}</span>`;
  }
}
function nextQuestion() {
  if (g.finished) return;
  let q;
  if (g.mode === 'speed') {
    const pool = wordPool(g.diff || 'all');
    q = buildOne('speed', pool);
    if (!q) q = buildOne('meaning', wordPool('all'));
    g.qs.push(q);
    g.idx = g.qs.length - 1;
  } else {
    q = g.qs[g.idx];
  }
  if (!q) { finishGame(); return; }
  g.typing = q.kind === 'type';
  drawQuestion(q);
  updateProgress();
  if (q.speak && store.settings.autoplay !== false && hasTTS()) speak(q.speak);
}

function drawQuestion(q) {
  const body = $('#gBody');
  if (!body) return;
  const pct = g.mode === 'speed' ? 0 : (g.idx / Math.max(1, g.qs.length)) * 100;
  body.innerHTML = `
    <div class="g-progress"><i style="width:${pct}%"></i></div>
    <div class="g-streak" id="gStreak">${g.streak >= 2 ? `🔥 streak ×${g.streak}` : ''}</div>
    ${q.kind === 'listen' ? `
      <div class="center-flex" style="margin:10px 0;">
        <button class="btn btn-gold" id="gHear"><i class="fa-solid fa-volume-high"></i> Hear word</button>
      </div>` : ''}
    <div class="g-q-word">${esc(q.kind === 'listen' && !hasTTS() ? q.word.en : q.display)}</div>
    <div class="g-q-prompt">${esc(q.prompt)}</div>
    ${q.kind === 'type' ? `
      <div class="g-type-input">
        <input type="text" id="gTypeInput" placeholder="Type your answer…" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button class="btn btn-primary" id="gTypeCheck">Check</button>
      </div>
      <div class="g-hint" id="gHint">${q.hint ? esc(q.hint) : ''}</div>
      ${q.speak && hasTTS() ? `<div class="center-flex" style="margin-top:10px;"><button class="btn btn-ghost sm" id="gHear"><i class="fa-solid fa-volume-high"></i> Hear again</button></div>` : ''}` : `
      <div class="g-options">
        ${q.options.map((o, i) => `<button class="g-option" data-i="${i}"><span class="num">${i + 1}</span><span>${esc(o.t)}</span></button>`).join('')}
      </div>`}
    <div class="g-feedback" id="gFeedback"></div>`;
  if (q.kind === 'type') {
    const inp = $('#gTypeInput');
    const go = () => submitTyped(q, inp.value);
    $('#gTypeCheck').addEventListener('click', go);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    setTimeout(() => inp.focus(), 60);
  } else {
    $$('.g-option', body).forEach(b => b.addEventListener('click', () => submitMcq(q, parseInt(b.dataset.i))));
  }
  const hear = $('#gHear');
  if (hear) hear.addEventListener('click', () => speak(q.speak || q.word.en));
  const fbx = $('#gFeedback');
  if (fbx && q.explain && g.mode === 'speed') { /* no pre-hint */ }
}

function lockOptions() {
  $$('.g-option').forEach(b => { b.disabled = true; });
  const inp = $('#gTypeInput'); if (inp) inp.disabled = true;
  const btn = $('#gTypeCheck'); if (btn) btn.disabled = true;
}
function showFeedback(q, ok, detail) {
  const fbx = $('#gFeedback');
  if (fbx) { fbx.textContent = ok ? (g.streak >= 2 ? `Correct! 🔥×${g.streak}` : 'Correct!') : (q.explain ? `Not quite — ${detail || ''}` : 'Not quite'); fbx.className = 'g-feedback ' + (ok ? 'ok' : 'no'); }
  if (ok) sfx('correct'); else sfx('wrong');
}

function recordAnswer(q, ok, given) {
  g.answered++;
  markAnswer(ok);
  if (ok) {
    g.score++; g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
    rateSrs(q.word.en, 2);
  } else {
    g.streak = 0;
    g.mistakes.push({ en: q.word.en, uz: q.word.uz || '', given, explain: q.explain || '' });
    rateSrs(q.word.en, 0);
  }
}
function afterAnswer(ok) {
  if (g.mode === 'boss' && !ok) {
    g.lives--;
    updateProgress();
    if (g.lives <= 0) { setTimeout(() => finishGame(), 1200); return; }
  }
  g.idx++;
  const isLast = g.mode !== 'speed' && g.idx >= g.qs.length;
  if (isLast) setTimeout(finishGame, 1100);
  else setTimeout(nextQuestion, 950);
}
function submitMcq(q, i) {
  if (g.finished || g.__locked) return;
  g.__locked = true;
  const opt = q.options[i];
  const ok = !!opt.correct;
  lockOptions();
  $$('.g-option').forEach(b => {
    const o = q.options[parseInt(b.dataset.i)];
    if (o.correct) b.classList.add('correct');
    else if (parseInt(b.dataset.i) === i) b.classList.add('wrong');
  });
  showFeedback(q, ok, q.explain);
  recordAnswer(q, ok, opt.t);
  setTimeout(() => { g.__locked = false; afterAnswer(ok); }, 700);
}
function submitTyped(q, val) {
  if (g.finished || g.__locked) return;
  const ok = matchTyped(val, q.word);
  if (!ok && store.settings.strict === false && !val.trim()) { toast('Type something first'); return; }
  g.__locked = true;
  lockOptions();
  showFeedback(q, ok, q.explain);
  recordAnswer(q, ok, (val || '').trim());
  setTimeout(() => { g.__locked = false; afterAnswer(ok); }, 900);
}

function finishGame(aborted) {
  if (g.finished && !aborted) return;
  g.finished = true;
  if (g.timerInt) { clearInterval(g.timerInt); g.timerInt = null; }
  store.stats.gamesPlayed++;
  const best = Math.max(store.stats.best[g.mode] || 0, g.score);
  store.stats.best[g.mode] = best;
  const acc = g.answered ? Math.round(g.score / g.answered * 100) : 0;
  let xp = g.score * 5 + (g.bestStreak >= 5 ? 15 : 0);
  if (!aborted && g.mode !== 'speed' && acc === 100) { store.stats.perfectRounds++; xp += 25; }
  save();
  awardXP(xp, 'game ' + g.mode);
  checkAchievements();
  drawResult(acc, xp, aborted);
}

function drawResult(acc, xp, aborted) {
  const body = $('#gBody');
  if (!body) return;
  const total = g.mode === 'speed' ? g.answered : g.qs.length;
  const stars = acc >= 90 ? 3 : acc >= 60 ? 2 : acc >= 30 ? 1 : 0;
  if (stars >= 2) confettiBurst(stars === 3 ? 140 : 70);
  if (acc === 100 && !aborted) sfx('win');
  const unique = [...new Map(g.mistakes.map(m => [norm(m.en), m])).values()];
  body.innerHTML = `
    <div class="g-result">
      <div class="score">${g.score}<small> / ${total}</small></div>
      <div class="lbl">${aborted ? 'Session ended early' : (g.mode === 'speed' ? 'words in 60 seconds' : 'correct answers')}</div>
      <div class="acc">${acc}% accuracy${g.bestStreak >= 2 ? ' · best streak 🔥×' + g.bestStreak : ''}</div>
      <div class="g-stars">${[0, 1, 2].map(i => `<span class="star ${i < stars ? 'on' : ''}">★</span>`).join('')}</div>
      <div class="g-xp">+${xp} XP</div>
      ${unique.length ? `
        <div class="section-head" style="text-align:left;">Words to review</div>
        <div class="g-mistakes">${unique.map(m => `
          <div class="g-mistake-row">
            <span class="w">${esc(m.en)}</span><span class="m">${esc(m.uz || m.explain)}</span>
            <button class="spk save" data-en="${esc(m.en)}" title="Save to notebook"><i class="fa-solid fa-plus"></i></button>
          </div>`).join('')}</div>` : `<div class="muted-note">Flawless — nothing to review.</div>`}
      <div class="g-actions">
        <button class="btn btn-primary" id="gAgain"><i class="fa-solid fa-rotate-right"></i> Play again</button>
        <button class="btn btn-ghost" id="gClose">Close</button>
      </div>
    </div>`;
  $('#gAgain').addEventListener('click', () => startGame(g.mode));
  $('#gClose').addEventListener('click', () => closeModal('gameOverlay'));
  $$('.g-mistake-row .save', body).forEach(b => b.addEventListener('click', () => {
    const en = b.dataset.en;
    const w = WORDS.find(x => x.en === en);
    if (!w) return;
    if (toggleSaved(en, w.uz, w.pos)) { b.style.color = 'var(--good)'; }
  }));
}

/* speed timer */
function startSpeedTimer() {
  if (g.timerInt) clearInterval(g.timerInt);
  g.timerInt = setInterval(() => {
    g.timerLeft--;
    updateProgress();
    if (g.timerLeft <= 0) finishGame();
  }, 1000);
}

/* ---------- hub ---------- */
function renderHub() {
  const diffBox = $('#hubDiff');
  if (diffBox && !diffBox.__built) {
    diffBox.__built = true;
    diffBox.innerHTML = `
      <button class="chip on" data-diff="all">All levels</button>
      <button class="chip" data-diff="easy">Easy · B1</button>
      <button class="chip" data-diff="med">Medium · B2</button>
      <button class="chip" data-diff="hard">Hard · C1–C2</button>`;
    diffBox.addEventListener('click', e => {
      const b = e.target.closest('.chip');
      if (!b) return;
      g.diff = b.dataset.diff;
      $$('.chip', diffBox).forEach(c => c.classList.toggle('on', c === b));
      toast('Level set: ' + b.textContent.trim());
    });
  }
  const grid = $('#hubGrid');
  grid.innerHTML = '';
  GAME_MODES.forEach(mode => {
    const meta = GAME_META[mode.id] || { icon: 'fa-gamepad', desc: '' };
    const best = store.stats.best[mode.id];
    const card = document.createElement('button');
    card.className = 'hub-card';
    card.innerHTML = `
      <span class="ic"><i class="fa-solid ${meta.icon}"></i></span>
      <span class="t">${esc(mode.name)}</span>
      <span class="d">${esc(meta.desc)}</span>
      ${best ? `<span class="best">🏆 Best: ${best}</span>` : '<span class="best" style="color:var(--ink-faint);">Never played</span>'}`;
    card.addEventListener('click', () => {
      store.__lastActive = Date.now();
      if (mode.id === 'speed') { startGame('speed'); startSpeedTimer(); }
      else startGame(mode.id);
    });
    grid.appendChild(card);
  });
}

/* expose */
window.VP.startGame = startGame;
window.VP.startSpeedTimer = startSpeedTimer;
window.VP.quitGame = quitGame;
window.startGame = startGame;
