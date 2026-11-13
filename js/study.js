'use strict';
/* ============================================================
   VOCAB PERFECT — study.js
   Notebook · SRS Review · Match · Shatter
   ============================================================ */
const { esc, norm, shuffle, toast, speak, speakBtn, sfx, confettiBurst, spawnShards, download, uid, todayKey, dateKey, timeAgo, clamp, addNote, delNote, hasNotebook, isSaved, isMastered, toggleMastered, getSrs, rateSrs, isDue, markAnswer, awardXP, checkAchievements, updateHdr, goScreen, savedKey } = window.VP;

/* ============================================================
   NOTEBOOK
   ============================================================ */
const nbState = { q: '', filter: 'all', bulk: false, sel: new Set() };

function nbMatches(n) {
  const q = norm(nbState.q);
  if (q && !(n.w + ' ' + n.m + ' ' + n.ex + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q)) return false;
  if (nbState.filter === 'learning' && n.status === 'mastered') return false;
  if (nbState.filter === 'mastered' && n.status !== 'mastered') return false;
  if (nbState.filter === 'due' && !isDue(n.w)) return false;
  return true;
}
function nbList() { return store.notebook.filter(nbMatches); }

function renderNotebook() {
  const list = $('#nbList');
  const items = nbList();
  const dueNow = store.notebook.filter(n => isDue(n.w)).length;
  const masteredCount = store.notebook.filter(n => n.status === 'mastered').length;
  if (!store.notebook.length) {
    list.innerHTML = `<div class="empty-nb"><i class="fa-solid fa-book-open"></i>No words yet.<br>Add your first word above, or grab words from the Words tab.</div>`;
    $('#nbBulkBar').classList.add('hidden');
    return;
  }
  if (!items.length) {
    list.innerHTML = `<div class="empty-nb"><i class="fa-solid fa-magnifying-glass"></i>No matches.</div>`;
    return;
  }
  list.innerHTML = items.map(n => {
    const due = isDue(n.w) && n.status !== 'mastered';
    const tags = (n.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
    return `
    <div class="nb-card ${n.status === 'mastered' ? 'mastered' : ''} ${nbState.bulk && nbState.sel.has(n.id) ? 'sel' : ''}" data-id="${n.id}">
      <div class="w-row"><span class="w">${esc(n.w)}</span><button class="spk paper" data-speak="${esc(n.w)}" aria-label="Pronounce"><i class="fa-solid fa-volume-high"></i></button></div>
      <div class="m">${esc(n.m)}</div>
      ${n.ex ? `<div class="ex">"${esc(n.ex)}"</div>` : ''}
      <div class="meta">
        ${n.pos ? `<span class="tag">${esc(n.pos)}</span>` : ''}
        ${n.level ? `<span class="tag lvl">${esc(n.level)}</span>` : ''}
        ${due ? `<span class="tag due today">due today</span>` : `<span class="tag due">${n.due ? 'next ' + new Date(n.due).toLocaleDateString() : 'new'}</span>`}
        ${tags}
      </div>
      <div class="actions">
        <button class="mini-btn act-edit">Edit</button>
        <button class="mini-btn act-master">${n.status === 'mastered' ? 'Un-master' : '★ Master'}</button>
        <button class="mini-btn act-due" title="Practice now">Practice</button>
      </div>
      <button class="del" data-del="${n.id}">Delete</button>
    </div>`;
  }).join('');
  $$('.spk[data-speak]', list).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); speakBtn(b, b.dataset.speak); }));
  $$('.del[data-del]', list).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const n = store.notebook.find(x => x.id === b.dataset.del);
    if (n && confirm(`Delete "${n.w}" from the notebook?`)) { delNote(b.dataset.del); toast('Deleted'); updateHdr(); renderNotebook(); }
  }));
  $$('.act-edit', list).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    nbEdit(b.closest('.nb-card').dataset.id);
  }));
  $$('.act-master', list).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const id = b.closest('.nb-card').dataset.id;
    const n = store.notebook.find(x => x.id === id);
    if (!n) return;
    n.status = n.status === 'mastered' ? 'learning' : 'mastered';
    if (n.status === 'mastered') { store.mastered[savedKey(n.w)] = Date.now(); sfx('correct'); toast('Mastered! ★', true); }
    save(); updateHdr(); renderNotebook();
  }));
  $$('.act-due', list).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const id = b.closest('.nb-card').dataset.id;
    store.__practiceId = id;
    goScreen('review');
  }));
  list.querySelectorAll('.nb-card').forEach(card => card.addEventListener('click', e => {
    if (!nbState.bulk || e.target.closest('button')) return;
    const id = card.dataset.id;
    if (nbState.sel.has(id)) nbState.sel.delete(id); else nbState.sel.add(id);
    card.classList.toggle('sel', nbState.sel.has(id));
    $('#nbBulkCount').textContent = nbState.sel.size + ' selected';
  }));
  $('#nbBulkBar').classList.toggle('hidden', !nbState.bulk);
  if (nbState.bulk) $('#nbBulkCount').textContent = nbState.sel.size + ' selected';
}

function nbEdit(id) {
  const n = store.notebook.find(x => x.id === id);
  if (!n) return;
  const { m, close } = detailBody(`
    <div class="modal-head">
      <div><div class="modal-word"><span>Edit “${esc(n.w)}”</span></div></div>
      <button class="modal-close" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <input type="text" id="edW" value="${esc(n.w)}" placeholder="Word">
      <input type="text" id="edM" value="${esc(n.m)}" placeholder="Meaning">
      <input type="text" id="edEx" value="${esc(n.ex)}" placeholder="Example (optional)">
      <div class="g-setup row" style="flex-direction:row;">
        <input type="text" id="edPos" value="${esc(n.pos || '')}" placeholder="pos" style="flex:1;">
        <input type="text" id="edLevel" value="${esc(n.level || '')}" placeholder="level" style="flex:1;">
        <input type="text" id="edTags" value="${esc((n.tags || []).join(', '))}" placeholder="tags" style="flex:2;">
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary sm" id="edSave">Save changes</button>
        <button class="btn btn-ghost sm" id="edCancel">Cancel</button>
      </div>
    </div>`);
  m.querySelector('#edCancel').addEventListener('click', close);
  m.querySelector('#edSave').addEventListener('click', () => {
    const w = $('#edW').value.trim(), mm = $('#edM').value.trim();
    if (!w || !mm) return toast('Word and meaning required');
    if (hasNotebook(w) && norm(w) !== norm(n.w)) return toast('Another note already has this word');
    n.w = w; n.m = mm;
    n.ex = $('#edEx').value.trim();
    n.pos = $('#edPos').value.trim();
    n.level = $('#edLevel').value.trim();
    n.tags = $('#edTags').value.split(',').map(t => t.trim()).filter(Boolean);
    save(); close(); renderNotebook(); updateHdr();
    toast('Saved', true);
  });
}

$('#nbSave').addEventListener('click', () => {
  const w = $('#nbWord').value.trim(), mm = $('#nbMeaning').value.trim();
  if (!w || !mm) return toast('Word and meaning required');
  const ok = addNote({ w, m: mm, ex: $('#nbExample').value, pos: $('#nbPos').value, level: $('#nbLevel').value, tags: $('#nbTags').value });
  if (!ok) return toast('Already in notebook');
  toast('Saved', true); sfx('click');
  awardXP(3, 'note');
  $('#nbWord').value = $('#nbMeaning').value = $('#nbExample').value = $('#nbTags').value = '';
  $('#nbPos').value = $('#nbLevel').value = '';
  updateHdr(); renderNotebook();
});
$('#nbSpeak').addEventListener('click', () => { const v = $('#nbWord').value.trim(); if (v) speak(v); });
$('#nbSearch').addEventListener('input', e => { nbState.q = e.target.value; renderNotebook(); });
$('#nbFilter').addEventListener('change', e => { nbState.filter = e.target.value; renderNotebook(); });
$('#nbBulk').addEventListener('click', () => { nbState.bulk = !nbState.bulk; nbState.sel.clear(); renderNotebook(); });
$('#nbBulkDone').addEventListener('click', () => { nbState.bulk = false; nbState.sel.clear(); renderNotebook(); });
$('#nbBulkMaster').addEventListener('click', () => {
  store.notebook.forEach(n => { if (nbState.sel.has(n.id)) { n.status = 'mastered'; store.mastered[savedKey(n.w)] = Date.now(); } });
  save(); nbState.bulk = false; nbState.sel.clear(); toast('Marked as mastered', true); renderNotebook(); updateHdr();
});
$('#nbBulkDelete').addEventListener('click', () => {
  if (!confirm('Delete ' + nbState.sel.size + ' selected notes?')) return;
  store.notebook = store.notebook.filter(n => !nbState.sel.has(n.id));
  save(); nbState.sel.clear(); renderNotebook(); updateHdr();
});
$('#nbImportBtn').addEventListener('click', () => $('#nbImportArea').classList.toggle('show'));
$('#nbImportCancel').addEventListener('click', () => { $('#nbImportArea').classList.remove('show'); $('#nbImportText').value = ''; });
$('#nbImportGo').addEventListener('click', () => {
  const raw = $('#nbImportText').value.trim();
  if (!raw) return toast('Paste something first');
  let count = 0, parsed = null;
  try { const j = JSON.parse(raw); parsed = Array.isArray(j) ? j : (j.notebook || null); } catch (_) {}
  const lines = parsed || raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const parts = l.split(/[|;]/).map(s => s.trim());
    return { w: parts[0], m: parts[1], ex: parts[2] || '', pos: parts[3] || '', level: parts[4] || '', tags: parts[5] || '' };
  });
  for (const item of lines) {
    if (!item || !item.w || !item.m) continue;
    if (addNote(item)) count++;
  }
  save(); updateHdr(); renderNotebook();
  $('#nbImportArea').classList.remove('show');
  $('#nbImportText').value = '';
  toast(`Imported ${count} word${count === 1 ? '' : 's'}`, true);
});
$('#nbExportBtn').addEventListener('click', () => {
  if (!store.notebook.length) return toast('Notebook is empty');
  const csv = ['word|meaning|example|pos|level|tags', ...store.notebook.map(n => `${n.w}|${n.m}|${n.ex || ''}|${n.pos || ''}|${n.level || ''}|${(n.tags || []).join(',')}`)].join('\n');
  download('vocab-perfect-notebook.csv', '\ufeff' + csv, 'text/csv');
  toast(`Exported ${store.notebook.length} notes`, true);
});

/* ============================================================
   REVIEW (SRS flashcards)
   ============================================================ */
const rvState = { source: 'notebook', dir: 'en2uz', deck: [], idx: 0, flipped: false };
window.__flipCard = () => flipCard();
window.__rateCard = i => rateCard(i);

function buildDeck() {
  const items = [];
  if (rvState.source === 'notebook') {
    items.push(...store.notebook.map(n => ({ key: 'n' + n.id, kind: 'note', w: n.w, m: n.m, ex: n.ex, pos: n.pos, due: n.due })));
  } else if (rvState.source === 'saved') {
    items.push(...store.saved.map(s => {
      const w = WORDS.find(x => norm(x.en) === norm(s.en));
      return { key: 's' + norm(s.en), kind: 'saved', w: s.en, m: s.uz || (w && w.uz) || '', ex: w && w.ex || '', pos: w && w.pos || '', due: getSrs(s.en).due };
    }));
  } else {
    const pool = shuffle(WORDS.filter(w => !isMastered(w.en) && w.uz && w.en.length > 1)).slice(0, 30);
    items.push(...pool.map(w => ({ key: 'd' + norm(w.en), kind: 'dict', w: w.en, m: w.uz, ex: w.ex || '', pos: w.pos || '', due: getSrs(w.en).due })));
  }
  // due first, then rest
  items.sort((a, b) => {
    const da = isDue(a.w) ? 0 : 1, db = isDue(b.w) ? 0 : 1;
    if (da !== db) return da - db;
    return (a.due || 0) - (b.due || 0);
  });
  return items;
}
function renderReview() {
  const deck = buildDeck();
  rvState.deck = deck; rvState.idx = Math.min(rvState.idx, Math.max(0, deck.length - 1));
  store.__rvDeck = deck;
  const total = deck.length;
  const due = deck.filter(d => isDue(d.w)).length;
  $('#rvCounter').textContent = total === 0 ? 'No cards for this source' : `Card ${rvState.idx + 1} / ${total}${due ? ` · ${due} due` : ''}`;
  if (!total) {
    $('#rvWord').textContent = '—';
    $('#rvMeaning').textContent = rvState.source === 'notebook' ? 'Add a word from Notebook first' : 'Nothing here yet — save some words first';
    $('#rvMeaning').classList.remove('hidden');
    $('#rvExample').style.display = 'none';
    $('#rvSpeak').style.visibility = 'hidden';
    return;
  }
  $('#rvSpeak').style.visibility = 'visible';
  drawCard();
  renderMatch();
}
function currentCard() { return rvState.deck[rvState.idx]; }
function drawCard() {
  const c = currentCard();
  if (!c) return;
  rvState.flipped = false;
  store.__rvFlipped = false;
  const dir = rvState.dir === 'mixed' ? (Math.random() < 0.5 ? 'en2uz' : 'uz2en') : rvState.dir;
  rvState.__dir = dir;
  $('#rvMeaning').classList.add('hidden');
  if (dir === 'uz2en') {
    $('#rvWord').textContent = c.m || c.w;
    $('#rvExample').style.display = 'none';
    $('#rvSpeak').style.visibility = 'hidden';
  } else if (dir === 'audio') {
    $('#rvWord').textContent = '🔊';
    $('#rvExample').style.display = 'none';
    $('#rvSpeak').style.visibility = 'hidden';
    if (store.settings.autoplay !== false) speak(c.w);
  } else {
    $('#rvWord').textContent = c.w;
    $('#rvExample').style.display = 'none';
    $('#rvSpeak').style.visibility = 'visible';
    if (store.settings.autoplay !== false) speak(c.w);
  }
}
function flipCard() {
  const c = currentCard();
  if (!c || rvState.flipped) return;
  rvState.flipped = true;
  store.__rvFlipped = true;
  sfx('flip');
  const dir = rvState.__dir || 'en2uz';
  $('#rvMeaning').textContent = dir === 'en2uz' ? c.m : c.w;
  $('#rvMeaning').classList.remove('hidden');
  if (c.ex) { $('#rvExample').textContent = `"${c.ex}"`; $('#rvExample').style.display = 'block'; }
  else $('#rvExample').style.display = 'none';
  speak(dir === 'en2uz' ? c.w : c.m || '');
}
function rateCard(i) {
  const c = currentCard();
  if (!c || !rvState.flipped) return;
  const rating = i; // 0 again, 1 hard, 2 good, 3 easy
  if (c.kind === 'note') {
    const n = store.notebook.find(x => 'n' + x.id === c.key);
    if (n) {
      n.reps = (n.reps || 0) + 1;
      if (rating === 0) n.box = Math.max(0, (n.box || 0) - 1);
      else n.box = Math.min(4, (n.box || 0) + (rating >= 3 ? 2 : 1));
      n.due = Date.now() + [1, 2, 4, 8][rating] * 86400000;
      if (n.box >= 4) { n.status = 'mastered'; store.mastered[savedKey(n.w)] = Date.now(); }
    }
  } else {
    rateSrs(c.w, rating);
  }
  save();
  markAnswer(rating >= 2);
  if (rating >= 2) sfx('correct'); else sfx('wrong');
  awardXP(rating >= 3 ? 3 : rating >= 2 ? 2 : 1, 'review');
  setTimeout(() => {
    rvState.idx = Math.min(rvState.idx + 1, rvState.deck.length - 1);
    if (rvState.idx === rvState.deck.length - 1 && rvState.deck.length) { /* wrap at end */ }
    drawCard();
    $('#rvCounter').textContent = `Card ${rvState.idx + 1} / ${rvState.deck.length}`;
  }, 160);
}
$('#rvCard').addEventListener('click', e => { if (e.target.closest('.spk') || !rvState.deck.length) return; flipCard(); });
$('#rvSpeak').addEventListener('click', e => { e.stopPropagation(); const c = currentCard(); if (c) { speakBtn(e.currentTarget, c.w); } });
$('#rvPrev').addEventListener('click', () => { if (!rvState.deck.length) return; rvState.idx = (rvState.idx - 1 + rvState.deck.length) % rvState.deck.length; drawCard(); $('#rvCounter').textContent = `Card ${rvState.idx + 1} / ${rvState.deck.length}`; });
$('#rvNext').addEventListener('click', () => { if (!rvState.deck.length) return; rvState.idx = (rvState.idx + 1) % rvState.deck.length; drawCard(); $('#rvCounter').textContent = `Card ${rvState.idx + 1} / ${rvState.deck.length}`; });
$('#rvRestart').addEventListener('click', () => { rvState.idx = 0; renderReview(); });
$$('.rate-btn').forEach(b => b.addEventListener('click', () => {
  const map = { again: 0, hard: 1, good: 2, easy: 3 };
  rateCard(map[b.dataset.rate]);
}));
$('#rvSources').addEventListener('click', e => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  rvState.source = btn.dataset.src;
  $$('#rvSources .chip').forEach(c => c.classList.toggle('on', c === btn));
  rvState.idx = 0;
  renderReview();
});
$('#rvDirections').addEventListener('click', e => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  rvState.dir = btn.dataset.dir;
  $$('#rvDirections .chip').forEach(c => c.classList.toggle('on', c === btn));
  drawCard();
});

/* ============================================================
   MATCH
   ============================================================ */
let mState = null;
function matchPool() {
  const pool = [];
  store.notebook.forEach(n => pool.push({ id: n.id, a: n.w, b: n.m }));
  store.saved.forEach(s => pool.push({ id: 's' + norm(s.en), a: s.en, b: s.uz }));
  return pool;
}
function renderMatch() {
  const grid = $('#matchGrid');
  if (matchPool().length < 2) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--ink-faint);font:500 .82rem/1.4 var(--mono);padding:20px;">Need at least 2 words (Notebook or Saved).</div>`;
    return;
  }
  if (!mState) newMatchRound();
  else drawMatch();
}
function newMatchRound() {
  const pool = shuffle(matchPool()).slice(0, 4);
  mState = {
    left: shuffle(pool.map(p => ({ id: p.id, text: p.a }))),
    right: shuffle(pool.map(p => ({ id: p.id, text: p.b }))),
    sl: null, sr: null, matched: new Set(), tries: 0,
  };
  drawMatch();
}
function drawMatch() {
  const grid = $('#matchGrid');
  grid.innerHTML = '';
  const { left, right, sl, sr, matched } = mState;
  left.forEach((it, i) => {
    const d = document.createElement('div');
    d.className = 'match-item' + (matched.has(it.id) ? ' matched' : '') + (sl === i ? ' sel' : '');
    d.textContent = it.text;
    d.addEventListener('click', () => pickMatch('left', i));
    grid.appendChild(d);
  });
  right.forEach((it, i) => {
    const d = document.createElement('div');
    d.className = 'match-item' + (matched.has(it.id) ? ' matched' : '') + (sr === i ? ' sel' : '');
    d.textContent = it.text;
    d.addEventListener('click', () => pickMatch('right', i));
    grid.appendChild(d);
  });
}
function pickMatch(side, i) {
  if (!mState) return;
  const it = mState[side][i];
  if (mState.matched.has(it.id)) return;
  sfx('click');
  if (side === 'left') mState.sl = mState.sl === i ? null : i; else mState.sr = mState.sr === i ? null : i;
  if (mState.sl !== null && mState.sr !== null) {
    const L = mState.left[mState.sl], R = mState.right[mState.sr];
    mState.tries++;
    if (L.id === R.id) {
      mState.matched.add(L.id);
      mState.sl = mState.sr = null;
      sfx('correct');
      if (mState.matched.size === mState.left.length) {
        toast('Round complete!', true);
        confettiBurst(50);
        markAnswer(true);
        awardXP(10, 'match');
        setTimeout(newMatchRound, 900);
      }
    } else {
      mState.sl = mState.sr = null;
      sfx('wrong');
    }
  }
  drawMatch();
}
$('#matchNew').addEventListener('click', newMatchRound);

/* ============================================================
   SHATTER — mode 1: cut the filler (original lessons)
   ============================================================ */
const SHATTER_LESSONS = [
  { prompt: 'Cut the redundant intensifiers. Tap the words that should go.', tokens: 'The main reason I completely totally agree is that education is very essential.'.split(' ').map(t => ({ t, cut: ['completely', 'totally', 'very'].includes(t) })), rewrite: 'The main reason I agree is that education is essential.', lesson: "Strong writers don't stack intensifiers. 'Completely totally' or 'very essential' weakens the sentence." },
  { prompt: 'Cut the empty filler phrases. Tap the words that should go.', tokens: 'In my personal opinion, it is my belief that at this point in time, governments should invest more in renewable energy.'.split(' ').map(t => ({ t, cut: ['personal', 'opinion,', 'it', 'is', 'my', 'belief', 'that', 'at', 'this', 'point', 'in', 'time,'].includes(t) })), rewrite: 'I believe governments should invest more in renewable energy.', lesson: "'In my personal opinion' and 'at this point in time' are classic padding. Cut them for a higher band." },
  { prompt: 'Cut the weak hedges. One hedge per claim is enough; zero is often better.', tokens: 'It could possibly be argued that remote work reduces commuting stress.'.split(' ').map(t => ({ t, cut: ['It', 'could', 'possibly', 'be', 'argued', 'that'].includes(t) })), rewrite: 'Remote work reduces commuting stress.', lesson: "'It could possibly be argued that' is triple hedging. Make the claim directly." },
  { prompt: 'Cut the time-related filler.', tokens: 'Nowadays in today’s modern world, most students own a smartphone.'.split(' ').map(t => ({ t, cut: ['Nowadays', 'in', 'today’s', 'modern', 'world,'].includes(t) })), rewrite: 'Most students own a smartphone.', lesson: "'Nowadays in today's modern world' is three time-markers saying the same thing. Pick one or none." },
  { prompt: 'Cut the wordy phrases.', tokens: 'Due to the fact that the company cut staff, morale dropped.'.split(' ').map(t => ({ t, cut: ['Due', 'to', 'the', 'fact', 'that'].includes(t) })), rewrite: 'Because the company cut staff, morale dropped.', lesson: "'Due to the fact that' (5 words) means 'because' (1 word). Every word must earn its place." },
];

const shState = { mode: 'cut', set: 'ielts', lessonI: 0, round: [], roundI: 0, removed: new Map(), checked: false, badTokens: [] };
function shatterEnter() {
  $('#shModeCut').classList.toggle('on', shState.mode === 'cut');
  $('#shModeHunt').classList.toggle('on', shState.mode === 'hunt');
  $('#shSets').style.display = shState.mode === 'hunt' ? '' : 'none';
  if (shState.mode === 'hunt' && !$('#shSets').__built) {
    $('#shSets').__built = true;
    $('#shSets').innerHTML = `<button class="chip on" data-set="ielts">IELTS (549)</button><button class="chip" data-set="daily">Daily (482)</button>`;
    $('#shSets').addEventListener('click', e => {
      const b = e.target.closest('.chip');
      if (!b) return;
      shState.set = b.dataset.set;
      $$('#shSets .chip').forEach(c => c.classList.toggle('on', c === b));
      buildHuntRound();
      loadHuntItem(0);
    });
  }
  if (shState.mode === 'cut') loadCutLesson(shState.lessonI);
  else { buildHuntRound(); loadHuntItem(0); }
}
$('#shModeCut').addEventListener('click', () => { shState.mode = 'cut'; shatterEnter(); });
$('#shModeHunt').addEventListener('click', () => { shState.mode = 'hunt'; shatterEnter(); });

function loadCutLesson(i) {
  shState.lessonI = i; shState.removed = new Map(); shState.checked = false;
  const data = SHATTER_LESSONS[i];
  $('#shBadge').textContent = 'IELTS · Diff Engine';
  $('#shProgress').textContent = `${i + 1} / ${SHATTER_LESSONS.length}`;
  $('#shPrompt').textContent = data.prompt;
  const wrap = $('#shatterWords');
  wrap.innerHTML = '';
  data.tokens.forEach((tok, idx) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = tok.t;
    span.dataset.idx = idx;
    span.tabIndex = 0;
    span.setAttribute('role', 'button');
    const tap = () => {
      if (shState.checked || shState.removed.has(idx)) return;
      spawnShards(span.getBoundingClientRect(), false);
      span.classList.add('gone');
      shState.removed.set(idx, 'pending');
      renderPile();
    };
    span.addEventListener('click', tap);
    span.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
    wrap.appendChild(span);
  });
  $('#shPile').innerHTML = '';
  $('#shResult').style.display = 'none';
  $('#shCheck').disabled = false;
  $('#shCheck').textContent = '✓ Check';
}

/* hunt mode */
function buildHuntRound() {
  const set = WRITING[shState.set] || [];
  shState.round = shuffle(set).slice(0, 5).map(([mistake, fix], i) => {
    const mTokens = mistake.split(/\s+/);
    const cCount = {};
    fix.split(/\s+/).forEach(t => { const k = norm(t).replace(/[.,!?;:]/g, ''); cCount[k] = (cCount[k] || 0) + 1; });
    const badIdx = [];
    mTokens.forEach((t, i) => {
      const k = norm(t).replace(/[.,!?;:]/g, '');
      if (cCount[k] > 0) cCount[k]--;
      else badIdx.push(i);
    });
    return { mistake, fix, tokens: mTokens, badIdx, i };
  });
}
function loadHuntItem(i) {
  shState.roundI = i; shState.removed = new Map(); shState.checked = false;
  const item = shState.round[i];
  if (!item) { buildHuntRound(); shState.roundI = 0; return loadHuntItem(0); }
  $('#shBadge').textContent = `Error Hunter · ${shState.set.toUpperCase()}`;
  $('#shProgress').textContent = `${i + 1} / ${shState.round.length}`;
  $('#shPrompt').textContent = 'This sentence has extra filler words. Tap every word that should be deleted to make it clean.';
  const wrap = $('#shatterWords');
  wrap.innerHTML = '';
  item.tokens.forEach((tok, idx) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = tok;
    span.dataset.idx = idx;
    span.tabIndex = 0;
    span.setAttribute('role', 'button');
    const tap = () => {
      if (shState.checked || shState.removed.has(idx)) return;
      spawnShards(span.getBoundingClientRect(), false);
      span.classList.add('gone');
      shState.removed.set(idx, 'pending');
      renderPile();
    };
    span.addEventListener('click', tap);
    span.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
    wrap.appendChild(span);
  });
  $('#shPile').innerHTML = '';
  $('#shResult').style.display = 'none';
  $('#shCheck').disabled = false;
  $('#shCheck').textContent = '✓ Check';
}
function renderPile() {
  const tokens = shState.mode === 'cut' ? SHATTER_LESSONS[shState.lessonI].tokens.map(x => x.t) : shState.round[shState.roundI].tokens;
  if (shState.removed.size === 0) { $('#shPile').innerHTML = ''; return; }
  $('#shPile').innerHTML = [...shState.removed.keys()].sort((a, b) => a - b).map(i => {
    const rec = shState.removed.get(i);
    let cls = 'pile-word';
    if (shState.checked && rec === 'good') cls += ' good';
    if (shState.checked && rec === 'bad') cls += ' bad';
    return `<span class="${cls}">${esc(String(tokens[i]).replace(/[,.]$/, ''))}</span>`;
  }).join('');
}
function evaluateShatter() {
  if (shState.checked) return;
  shState.checked = true;
  $('#shCheck').disabled = true;
  $('#shCheck').textContent = '✓ Checked';
  if (shState.mode === 'cut') evaluateCut();
  else evaluateHunt();
}
function evaluateCut() {
  const data = SHATTER_LESSONS[shState.lessonI];
  let mistakes = 0;
  const list = [];
  data.tokens.forEach((tok, i) => {
    const span = $(`.word[data-idx="${i}"]`, $('#shatterWords'));
    if (span) span.classList.add('locked');
    const removed = shState.removed.has(i);
    if (tok.cut && removed) shState.removed.set(i, 'good');
    else if (tok.cut && !removed) { if (span) span.classList.add('missed'); mistakes++; list.push({ k: 'missed', tok }); }
    else if (!tok.cut && removed) { shState.removed.set(i, 'bad'); mistakes++; list.push({ k: 'wrong', tok }); }
    else if (span) span.classList.add('kept-ok');
  });
  if (mistakes > 0) { const s = $('#shSentence'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); }
  renderPile();
  if (mistakes === 0) { awardXP(15, 'shatter perfect'); store.stats.best['shatter'] = Math.max(store.stats.best['shatter'] || 0, 5); sfx('win'); }
  let html = mistakes === 0 ? `<div class="verdict perfect">Perfect</div>` : mistakes === 1 ? `<div class="verdict good">1 Slip</div>` : `<div class="verdict rough">${mistakes} Mistakes</div>`;
  if (list.length) {
    html += `<div class="section-head">What went wrong</div>`;
    list.forEach(m => {
      const cls = m.k === 'missed' ? 'missed' : 'wrong';
      const why = m.k === 'missed' ? 'This word should go.' : 'You cut a word the sentence needs.';
      html += `<div class="mistake-card ${cls}"><span class="m-tag">${esc(m.tok.t.replace(/[,.]$/, ''))}</span><div class="m-text">${esc(why)}</div></div>`;
    });
  }
  html += `<div class="section-head">The clean version</div><div class="rewrite-box"><span>${esc(data.rewrite)}</span><button class="spk" data-speak="${esc(data.rewrite)}" aria-label="Pronounce"><i class="fa-solid fa-volume-high"></i></button></div>`;
  html += `<div class="section-head">Why this matters</div><div class="why-box">${esc(data.lesson)}</div>`;
  const last = shState.lessonI >= SHATTER_LESSONS.length - 1;
  html += `<div class="review-actions" style="margin-top:18px;"><button class="btn btn-primary" id="shNext">${last ? '↺ Start Over' : 'Next Sentence →'}</button></div>`;
  const box = $('#shResult');
  box.innerHTML = html;
  box.style.display = 'block';
  box.querySelector('.spk[data-speak]').addEventListener('click', e => speakBtn(e.currentTarget, data.rewrite));
  $('#shNext').addEventListener('click', () => { loadCutLesson(last ? 0 : shState.lessonI + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); });
}
function evaluateHunt() {
  const item = shState.round[shState.roundI];
  const correctSet = new Set(item.badIdx);
  let mistakes = 0;
  const list = [];
  item.tokens.forEach((tok, i) => {
    const span = $(`.word[data-idx="${i}"]`, $('#shatterWords'));
    if (span) span.classList.add('locked');
    const removed = shState.removed.has(i);
    const shouldCut = correctSet.has(i);
    if (shouldCut && removed) shState.removed.set(i, 'good');
    else if (shouldCut && !removed) { if (span) span.classList.add('missed'); mistakes++; list.push({ k: 'missed', tok }); }
    else if (!shouldCut && removed) { shState.removed.set(i, 'bad'); mistakes++; list.push({ k: 'wrong', tok }); }
    else if (span) span.classList.add('kept-ok');
  });
  if (mistakes > 0) { const s = $('#shSentence'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); }
  renderPile();
  if (mistakes === 0) { awardXP(15, 'hunt perfect'); store.stats.best['shatter'] = Math.max(store.stats.best['shatter'] || 0, 5); sfx('win'); }
  markAnswer(mistakes === 0);
  let html = mistakes === 0 ? `<div class="verdict perfect">Perfect</div>` : mistakes === 1 ? `<div class="verdict good">1 Slip</div>` : `<div class="verdict rough">${mistakes} Mistakes</div>`;
  if (list.length) {
    html += `<div class="section-head">What went wrong</div>`;
    list.forEach(m => {
      const cls = m.k === 'missed' ? 'missed' : 'wrong';
      const why = m.k === 'missed' ? 'This word should go.' : 'You cut a word the sentence needs.';
      html += `<div class="mistake-card ${cls}"><span class="m-tag">${esc(String(m.tok).replace(/[,.]$/, ''))}</span><div class="m-text">${esc(why)}</div></div>`;
    });
  }
  html += `<div class="section-head">The clean version</div><div class="rewrite-box"><span>${esc(item.fix)}</span><button class="spk" data-speak="${esc(item.fix)}" aria-label="Pronounce"><i class="fa-solid fa-volume-high"></i></button></div>`;
  html += `<div class="section-head">Why this matters</div><div class="why-box">Every extra word is noise. In IELTS writing, precision beats padding — cut the fillers and the sentence gets stronger instantly.</div>`;
  html += `<div class="review-actions" style="margin-top:18px;"><button class="btn btn-primary" id="shNext">Next Sentence →</button></div>`;
  const box = $('#shResult');
  box.innerHTML = html;
  box.style.display = 'block';
  box.querySelector('.spk[data-speak]').addEventListener('click', e => speakBtn(e.currentTarget, item.fix));
  $('#shNext').addEventListener('click', () => {
    if (shState.roundI + 1 >= shState.round.length) { buildHuntRound(); toast('New round!', true); }
    loadHuntItem((shState.roundI + 1) % shState.round.length);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
$('#shCheck').addEventListener('click', evaluateShatter);
$('#shReset').addEventListener('click', () => { shState.mode === 'cut' ? loadCutLesson(shState.lessonI) : loadHuntItem(shState.roundI); });
$('#shSpeak').addEventListener('click', e => {
  e.stopPropagation();
  const txt = shState.mode === 'cut'
    ? SHATTER_LESSONS[shState.lessonI].tokens.map(t => t.t).join(' ').replace(/\s+([.,!?])/g, '$1')
    : shState.round[shState.roundI].mistake;
  speakBtn(e.currentTarget, txt);
});

/* expose */
window.VP.renderMatch = renderMatch;
window.VP.shatterEnter = shatterEnter;
