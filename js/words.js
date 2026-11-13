'use strict';
/* ============================================================
   VOCAB PERFECT — words.js
   Words · Phrases · Grammar · Preps + detail modal
   ============================================================ */
const { esc, norm, shuffle, toast, speak, speakBtn, sfx, download, isSaved, isMastered, toggleSaved, toggleMastered, addHistory, hasNotebook, addNote, goScreen, openModal, closeModal, savedKey } = window.VP;

const CHUNK = 48;
const LEVEL_ORDER = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };

/* ============================================================
   WORDS
   ============================================================ */
const wordsState = { q: '', levels: new Set(), pos: '', status: 'all', sort: 'az', hideUz: !!store.settings.hideUz, view: 'grid', shown: CHUNK, list: [] };
let wordsSentinelReady = false;

function allLevels() { return [...new Set(WORDS.map(w => w.level).filter(Boolean))].sort((a, b) => (LEVEL_ORDER[a] ?? 9) - (LEVEL_ORDER[b] ?? 9)); }
function allPos() { return [...new Set(WORDS.map(w => w.pos).filter(Boolean))].sort(); }

function filteredWords() {
  const q = norm(wordsState.q);
  const hasQ = q.length > 0;
  const levels = wordsState.levels;
  const pos = wordsState.pos;
  let list = WORDS.filter(w => {
    if (levels.size && !levels.has(w.level)) return false;
    if (pos && w.pos !== pos) return false;
    if (wordsState.status === 'saved' && !isSaved(w.en)) return false;
    if (wordsState.status === 'unsaved' && isSaved(w.en)) return false;
    if (wordsState.status === 'mastered' && !isMastered(w.en)) return false;
    if (wordsState.status === 'learning' && (!isSaved(w.en) || isMastered(w.en))) return false;
    if (hasQ) {
      const hay = [w.en, w.uz, w.syn, w.ant, (w.meanings || []).join(' '), w.ex].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const histOrder = new Map(store.stats.history.map((h, i) => [savedKey(h.en), i]));
  if (wordsState.sort === 'za') list = [...list].sort((a, b) => b.en.toLowerCase().localeCompare(a.en.toLowerCase()));
  else if (wordsState.sort === 'level') list = [...list].sort((a, b) => ((LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9)) || a.en.toLowerCase().localeCompare(b.en.toLowerCase()));
  else if (wordsState.sort === 'random') list = shuffle(list);
  else if (wordsState.sort === 'recent') list = [...list].sort((a, b) => (histOrder.get(savedKey(a.en)) ?? 1e9) - (histOrder.get(savedKey(b.en)) ?? 1e9));
  else list = [...list].sort((a, b) => a.en.toLowerCase().localeCompare(b.en.toLowerCase()));
  return list;
}

function renderWords(reset = true) {
  wordsState.hideUz = !!store.settings.hideUz;
  if (reset) wordsState.shown = CHUNK;
  renderWordLevels();
  const posSel = $('#wordsPos');
  if (posSel.options.length === 0) {
    posSel.innerHTML = '<option value="">All parts of speech</option>' + allPos().map(p => `<option>${esc(p)}</option>`).join('');
  }
  const list = filteredWords();
  wordsState.list = list;
  const shown = list.slice(0, wordsState.shown);
  $('#wordsCount').textContent = `${list.length} word${list.length === 1 ? '' : 's'}` + (wordsState.shown < list.length ? ` · showing ${shown.length}` : '');
  const grid = $('#wordsGrid');
  grid.className = wordsState.view === 'grid' ? 'words-grid' : 'words-grid list-view';
  grid.innerHTML = '';
  if (!shown.length) {
    grid.innerHTML = `<div class="empty-box" style="grid-column:1/-1;"><i class="fa-solid fa-magnifying-glass"></i>No matches. Try different filters.</div>`;
  }
  shown.forEach(w => grid.appendChild(wordCard(w)));
  $('#wordsMore').classList.toggle('hidden', wordsState.shown >= list.length);
  if (!wordsSentinelReady) {
    wordsSentinelReady = true;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && wordsState.shown < filteredWords().length) {
        wordsState.shown += CHUNK;
        renderWords(false);
      }
    }, { rootMargin: '400px' });
    io.observe($('#wordsSentinel'));
  }
  $('#wordsHideUz').classList.toggle('on', wordsState.hideUz);
  $('#wordsView').classList.toggle('on', wordsState.view === 'list');
}

function renderWordLevels() {
  const box = $('#wordsLevels');
  if (!box || box.__built) return;
  box.__built = true;
  const lv = allLevels();
  box.innerHTML = `<button class="chip on" data-lv="*">All</button>` + lv.map(l => `<button class="chip" data-lv="${esc(l)}">${esc(l)}</button>`).join('');
  box.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    const lv = btn.dataset.lv;
    if (lv === '*') { wordsState.levels.clear(); $$('.chip', box).forEach(c => c.classList.toggle('on', c === btn)); }
    else {
      if (wordsState.levels.has(lv)) wordsState.levels.delete(lv); else wordsState.levels.add(lv);
      btn.classList.toggle('on');
      const all = box.querySelector('[data-lv="*"]');
      all.classList.toggle('on', wordsState.levels.size === 0);
      if (wordsState.levels.size === 0) all.classList.add('on');
    }
    renderWords(true);
  });
}

function wordCard(w) {
  const saved = isSaved(w.en), mastered = isMastered(w.en);
  const syns = (w.syn || '').split(',').map(s => s.trim()).filter(s => s && s !== '—').slice(0, 3).join(', ');
  if (wordsState.view === 'list') {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <span class="en">${esc(w.en)}</span>
      <button class="spk" title="Pronounce" aria-label="Pronounce ${esc(w.en)}"><i class="fa-solid fa-volume-high"></i></button>
      <span class="uz ${wordsState.hideUz ? 'uz-hide' : ''}">${esc(w.uz)}</span>
      <span class="meta">${w.level ? `<span class="lvl">${esc(w.level)}</span>` : ''}<span class="pos">${esc(w.pos || '')}</span></span>`;
    row.addEventListener('click', () => openWordDetail(w));
    row.querySelector('.spk').addEventListener('click', e => { e.stopPropagation(); speakBtn(e.currentTarget, w.en); });
    return row;
  }
  const card = document.createElement('div');
  card.className = 'vocab-card' + (saved ? ' saved' : '') + (mastered ? ' mastered' : '');
  card.innerHTML = `
    <div class="top"><div>
      <div class="en-row"><span class="en">${esc(w.en)}</span><button class="spk" title="Pronounce" aria-label="Pronounce ${esc(w.en)}"><i class="fa-solid fa-volume-high"></i></button></div>
      <div class="uz ${wordsState.hideUz ? 'uz-hide' : ''}">${esc(w.uz)}</div>
    </div>${w.level ? `<span class="lvl">${esc(w.level)}</span>` : ''}</div>
    ${w.pos ? `<div class="pos">${esc(w.pos)}</div>` : ''}
    ${syns ? `<div class="syn-line"><b>syn:</b> ${esc(syns)}</div>` : ''}
    <div class="card-actions">
      <button class="btn btn-ghost sm act-details">Details</button>
      <button class="btn btn-ghost sm act-save" title="Save">${saved ? '✓' : '+'}</button>
      <button class="btn btn-ghost sm act-master" title="Mastered" style="color:${mastered ? 'var(--good)' : ''}">★</button>
    </div>`;
  card.querySelector('.spk').addEventListener('click', e => { e.stopPropagation(); speakBtn(e.currentTarget, w.en); });
  card.querySelector('.act-details').addEventListener('click', () => openWordDetail(w));
  card.querySelector('.act-save').addEventListener('click', () => { const s = toggleSaved(w.en, w.uz, w.pos); card.classList.toggle('saved', s); card.querySelector('.act-save').textContent = s ? '✓' : '+'; });
  card.querySelector('.act-master').addEventListener('click', () => { const m = toggleMastered(w.en); card.classList.toggle('mastered', m); card.querySelector('.act-master').style.color = m ? 'var(--good)' : ''; });
  card.querySelector('.en').addEventListener('click', () => openWordDetail(w));
  return card;
}

/* ============================================================
   DETAIL MODALS
   ============================================================ */
let detailNav = [];
function detailBody(popup) {
  const overlay = $('#detailOverlay');
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal('detailOverlay'); });
  const m = $('#detailModal');
  m.innerHTML = popup;
  openModal('detailOverlay');
  const close = () => closeModal('detailOverlay');
  const x = m.querySelector('.modal-close'); if (x) x.addEventListener('click', close);
  m.querySelectorAll('[data-speak]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); speakBtn(b, b.dataset.speak); }));
  return { m, close };
}

function wordPopupHTML(w, idx, total) {
  const enr = ENRICH[norm(w.en)] || null;
  const saved = isSaved(w.en), mastered = isMastered(w.en);
  const meanings = (w.meanings && w.meanings.length) ? `<ul>${w.meanings.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const forms = w.forms ? Object.entries(w.forms).filter(([k, v]) => v && !String(v).startsWith('No ')).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('') : '';
  const syns = (w.syn || '').split(',').map(s => s.trim()).filter(s => s && s !== '—');
  const ants = (w.ant || '').split(',').map(s => s.trim()).filter(s => s && s !== '—');
  return `
    <div class="modal-head">
      <div>
        <div class="modal-word"><span>${esc(w.en)}</span>${w.level ? `<span class="lvl">${esc(w.level)}</span>` : ''}
          <button class="spk lg" data-speak="${esc(w.en)}" aria-label="Pronounce"><i class="fa-solid fa-volume-high"></i></button></div>
        <div class="modal-sub">${esc(w.uz)}${w.pos ? ` · ${esc(w.pos)}` : ''}</div>
      </div>
      <button class="modal-close" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-actions">
        <button class="btn btn-primary sm act-save">${saved ? '✓ Saved' : '+ Save word'}</button>
        <button class="btn btn-green sm act-master">${mastered ? '★ Mastered' : '☆ Mark mastered'}</button>
        <button class="btn btn-ghost sm act-copy"><i class="fa-solid fa-copy"></i> Copy</button>
        <button class="btn btn-ghost sm act-share"><i class="fa-solid fa-share-nodes"></i> Share</button>
        <a class="btn btn-ghost sm" href="https://translate.google.com/?sl=en&tl=uz&text=${encodeURIComponent(w.en)}" target="_blank" rel="noopener"><i class="fa-solid fa-language"></i></a>
        <a class="btn btn-ghost sm" href="https://en.wiktionary.org/wiki/${encodeURIComponent(w.en)}" target="_blank" rel="noopener"><i class="fa-solid fa-globe"></i></a>
      </div>
      ${meanings ? `<div class="m-section"><h4><i class="fa-solid fa-list"></i> Meanings</h4>${meanings}</div>` : ''}
      ${forms ? `<div class="m-section"><h4><i class="fa-solid fa-table-cells"></i> Word forms</h4><table class="forms-table">${forms}</table></div>` : ''}
      ${syns.length ? `<div class="m-section"><h4><i class="fa-solid fa-circle-plus"></i> Synonyms</h4><div class="syn-chips">${syns.map(s => `<button class="syn-chip" data-syn="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>` : ''}
      ${ants.length ? `<div class="m-section"><h4><i class="fa-solid fa-circle-minus"></i> Antonyms</h4><div class="syn-chips">${ants.map(s => `<button class="ant-chip" data-syn="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>` : ''}
      ${w.ex ? `<div class="m-section"><h4><i class="fa-solid fa-quote-left"></i> Example</h4>
        <div class="m-row-flex"><p class="ex-en">“${esc(w.ex)}”</p><button class="spk lg" data-speak="${esc(w.ex)}" aria-label="Pronounce example"><i class="fa-solid fa-volume-high"></i></button></div>
        ${w.exUz ? `<p class="ex-uz">${esc(w.exUz)}</p>` : ''}</div>` : ''}
      ${w.contextEn ? `<div class="m-section"><h4><i class="fa-solid fa-scene"></i> In context</h4><p>${esc(w.contextEn)}</p>${w.contextUz ? `<p class="ex-uz">${esc(w.contextUz)}</p>` : ''}</div>` : ''}
      ${w.usageEn ? `<div class="m-section"><h4><i class="fa-solid fa-lightbulb"></i> Usage note</h4><p>${esc(w.usageEn)}</p>${w.usageUz ? `<p class="ex-uz">${esc(w.usageUz)}</p>` : ''}</div>` : ''}
      ${enr ? `<div class="m-section"><h4><i class="fa-solid fa-link"></i> Collocations</h4><p>${esc(enr.collocations || '')}</p>${enr.explanation ? `<p class="ex-uz" style="margin-top:8px;">${esc(enr.explanation)}</p>` : ''}${enr.izoh ? `<p class="ex-uz">${esc(enr.izoh)}</p>` : ''}</div>` : ''}
    </div>
    <div class="modal-nav">
      <button class="btn btn-ghost sm act-prev" ${idx <= 0 ? 'disabled' : ''}>← Prev</button>
      <span class="muted-note" style="margin:0;">${idx + 1} / ${total}</span>
      <button class="btn btn-ghost sm act-next" ${idx >= total - 1 ? 'disabled' : ''}>Next →</button>
    </div>`;
}

function openWordDetail(w, fromPalette = false) {
  addHistory(w.en, w.uz);
  detailNav = wordsState.list.length && wordsState.list.some(x => x.en === w.en) ? wordsState.list : WORDS;
  let idx = detailNav.findIndex(x => x.en === w.en);
  if (idx < 0) idx = 0;
  const draw = () => {
    const cur = detailNav[idx];
    const { m, close } = detailBody(wordPopupHTML(cur, idx, detailNav.length));
    m.querySelector('.act-save').addEventListener('click', () => { toggleSaved(cur.en, cur.uz, cur.pos); draw(); });
    m.querySelector('.act-master').addEventListener('click', () => { toggleMastered(cur.en); draw(); });
    m.querySelector('.act-copy').addEventListener('click', () => {
      const text = `${cur.en} — ${cur.uz}${cur.pos ? ' (' + cur.pos + ')' : ''}${cur.level ? ' [' + cur.level + ']' : ''}${cur.ex ? '\nExample: ' + cur.ex : ''}${cur.syn && cur.syn !== '—' ? '\nSynonyms: ' + cur.syn : ''}${cur.ant && cur.ant !== '—' ? '\nAntonyms: ' + cur.ant : ''}`;
      navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard', true)).catch(() => toast('Copy failed'));
    });
    m.querySelector('.act-share').addEventListener('click', () => {
      const text = `${cur.en} — ${cur.uz} · Vocab Perfect`;
      if (navigator.share) navigator.share({ text }).catch(() => {});
      else navigator.clipboard.writeText(text).then(() => toast('Copied — paste anywhere', true)).catch(() => {});
    });
    m.querySelectorAll('[data-syn]').forEach(b => b.addEventListener('click', () => {
      const s = b.dataset.syn;
      close();
      goScreen('words');
      $('#wordsSearch').value = s;
      wordsState.q = s;
      renderWords(true);
    }));
    const p = m.querySelector('.act-prev'), nx = m.querySelector('.act-next');
    if (p) p.addEventListener('click', () => { if (idx > 0) { idx--; draw(); } });
    if (nx) nx.addEventListener('click', () => { if (idx < detailNav.length - 1) { idx++; draw(); } });
  };
  draw();
  if (!fromPalette) speak(w.en);
}

function phrasePopupHTML(p, idx, total) {
  const saved = store.phrasesSaved.includes(p.phrase);
  const meanings = (p.meanings && p.meanings.length) ? `<ul>${p.meanings.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  return `
    <div class="modal-head">
      <div>
        <div class="modal-word"><span>${esc(p.phrase)}</span>
          <button class="spk lg" data-speak="${esc(p.phrase)}" aria-label="Pronounce"><i class="fa-solid fa-volume-high"></i></button></div>
        <div class="modal-sub">${esc(p.uz)}${p.group ? ` · ${esc(p.group)}` : ''}</div>
      </div>
      <button class="modal-close" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-actions">
        <button class="btn btn-primary sm act-save">${saved ? '✓ Saved' : '+ Save phrase'}</button>
        <button class="btn btn-ghost sm act-copy"><i class="fa-solid fa-copy"></i> Copy</button>
      </div>
      ${meanings ? `<div class="m-section"><h4><i class="fa-solid fa-list"></i> Meanings</h4>${meanings}</div>` : ''}
      ${p.when ? `<div class="m-section"><h4><i class="fa-solid fa-clock"></i> When to use</h4><p>${esc(p.when)}</p></div>` : ''}
      ${p.ex ? `<div class="m-section"><h4><i class="fa-solid fa-quote-left"></i> Example</h4>
        <div class="m-row-flex"><p class="ex-en">“${esc(p.ex)}”</p><button class="spk lg" data-speak="${esc(p.ex)}" aria-label="Pronounce example"><i class="fa-solid fa-volume-high"></i></button></div>
        ${p.exUz ? `<p class="ex-uz">${esc(p.exUz)}</p>` : ''}</div>` : ''}
      ${p.contextEn ? `<div class="m-section"><h4><i class="fa-solid fa-scene"></i> In context</h4><p>${esc(p.contextEn)}</p>${p.contextUz ? `<p class="ex-uz">${esc(p.contextUz)}</p>` : ''}</div>` : ''}
      ${p.usageEn ? `<div class="m-section"><h4><i class="fa-solid fa-lightbulb"></i> Usage note</h4><p>${esc(p.usageEn)}</p></div>` : ''}
    </div>
    <div class="modal-nav">
      <button class="btn btn-ghost sm act-prev" ${idx <= 0 ? 'disabled' : ''}>← Prev</button>
      <span class="muted-note" style="margin:0;">${idx + 1} / ${total}</span>
      <button class="btn btn-ghost sm act-next" ${idx >= total - 1 ? 'disabled' : ''}>Next →</button>
    </div>`;
}

function openPhraseDetail(p) {
  detailNav = PHRASES;
  let idx = Math.max(0, detailNav.findIndex(x => x.phrase === p.phrase));
  const draw = () => {
    const cur = detailNav[idx];
    const { m } = detailBody(phrasePopupHTML(cur, idx, detailNav.length));
    m.querySelector('.act-save').addEventListener('click', () => {
      const i = store.phrasesSaved.indexOf(cur.phrase);
      if (i >= 0) { store.phrasesSaved.splice(i, 1); toast('Phrase removed'); }
      else { store.phrasesSaved.unshift(cur.phrase); toast('Phrase saved', true); sfx('click'); }
      save(); draw();
    });
    m.querySelector('.act-copy').addEventListener('click', () => {
      const text = `${cur.phrase} — ${cur.uz}${cur.ex ? '\nExample: ' + cur.ex : ''}`;
      navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard', true)).catch(() => {});
    });
    const p2 = m.querySelector('.act-prev'), nx = m.querySelector('.act-next');
    if (p2) p2.addEventListener('click', () => { if (idx > 0) { idx--; draw(); } });
    if (nx) nx.addEventListener('click', () => { if (idx < detailNav.length - 1) { idx++; draw(); } });
  };
  draw();
}

function openGrammarDetail(g) {
  const { m, close } = detailBody(`
    <div class="modal-head">
      <div><div class="modal-word"><span>${esc(g[0])}</span></div><div class="modal-sub">Grammar topic</div></div>
      <button class="modal-close" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <div class="m-section"><h4><i class="fa-solid fa-circle-info"></i> Use</h4><p>${esc(g[1])}</p></div>
      <div class="m-section"><h4><i class="fa-solid fa-quote-left"></i> Examples</h4>
        <div class="m-row-flex"><p class="ex-en">“${esc(g[2])}”</p><button class="spk lg" data-speak="${esc(g[2])}" aria-label="Pronounce example"><i class="fa-solid fa-volume-high"></i></button></div></div>
      <div class="m-section"><h4><i class="fa-solid fa-lightbulb"></i> Tip</h4><p>${esc(g[3])}</p></div>
      <div class="modal-actions"><button class="btn btn-gold sm act-quiz"><i class="fa-solid fa-circle-play"></i> Practice this topic</button></div>
    </div>`);
  m.querySelector('.act-quiz').addEventListener('click', () => { close(); startGame('grammar'); });
}

function openPrepDetail(p) {
  detailBody(`
    <div class="modal-head">
      <div><div class="modal-word"><span>${esc(p[0])}</span></div><div class="modal-sub">Preposition pattern</div></div>
      <button class="modal-close" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <div class="m-section"><h4><i class="fa-solid fa-puzzle-piece"></i> Patterns</h4><p>${esc(p[1])}</p></div>
      <div class="m-section"><h4><i class="fa-solid fa-circle-info"></i> Note</h4><p>${esc(p[2])}</p></div>
      <div class="modal-actions"><button class="btn btn-gold sm act-quiz"><i class="fa-solid fa-circle-play"></i> Practice prepositions</button></div>
    </div>`).m.querySelector('.act-quiz').addEventListener('click', () => { closeModal('detailOverlay'); startGame('prep'); });
}

/* ============================================================
   PHRASES TAB
   ============================================================ */
const phState = { q: '', group: '', shown: CHUNK, list: [] };
let phSentinelReady = false;

function phGroups() { return [...new Set(PHRASES.map(p => p.group).filter(Boolean))]; }
function filteredPhrases() {
  const q = norm(phState.q);
  return PHRASES.filter(p => {
    if (phState.group === '__saved') return store.phrasesSaved.includes(p.phrase);
    if (phState.group && p.group !== phState.group) return false;
    if (q && !(p.phrase + ' ' + p.uz + ' ' + (p.meanings || []).join(' ')).toLowerCase().includes(q)) return false;
    return true;
  });
}
function renderPhrases(reset = true) {
  if (reset) phState.shown = CHUNK;
  const box = $('#phGroups');
  if (!box.__built) {
    box.__built = true;
    box.innerHTML = `<button class="chip on" data-g="*">All</button>`
      + `<button class="chip" data-g="__saved" title="Phrases you saved">❤ Saved</button>`
      + phGroups().map(g => `<button class="chip" data-g="${esc(g)}">${esc(g)}</button>`).join('');
    box.addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      const grp = btn.dataset.g;
      phState.group = grp === '*' ? '' : grp;
      $$('.chip', box).forEach(c => c.classList.toggle('on', c === btn));
      renderPhrases(true);
    });
  }
  const list = filteredPhrases();
  phState.list = list;
  const shown = list.slice(0, phState.shown);
  $('#phCount').textContent = `${list.length} phrase${list.length === 1 ? '' : 's'}`;
  const grid = $('#phGrid');
  grid.innerHTML = '';
  if (!shown.length) grid.innerHTML = `<div class="empty-box" style="grid-column:1/-1;"><i class="fa-solid fa-quote-right"></i>No phrases match.</div>`;
  shown.forEach(p => {
    const card = document.createElement('div');
    card.className = 'ph-card';
    card.innerHTML = `
      <div class="en-row"><span class="ph">${esc(p.phrase)}</span><button class="spk" aria-label="Pronounce"><i class="fa-solid fa-volume-high"></i></button></div>
      <div class="uz">${esc(p.uz)}</div>
      ${p.group ? `<span class="grp">${esc(p.group)}</span>` : ''}
      ${p.ex ? `<div class="ex">“${esc(p.ex)}”</div>` : ''}`;
    card.querySelector('.spk').addEventListener('click', e => { e.stopPropagation(); speakBtn(e.currentTarget, p.phrase); });
    card.addEventListener('click', () => openPhraseDetail(p));
    grid.appendChild(card);
  });
  if (!phSentinelReady) {
    phSentinelReady = true;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && phState.shown < filteredPhrases().length) {
        phState.shown += CHUNK;
        renderPhrases(false);
      }
    }, { rootMargin: '400px' });
    io.observe($('#phSentinel'));
  }
}

/* ============================================================
   GRAMMAR + PREPS TABS
   ============================================================ */
function renderGrammar() {
  const q = norm($('#grSearch').value);
  const list = GRAMMAR.filter(g => !q || (g[0] + ' ' + g[1] + ' ' + g[3]).toLowerCase().includes(q));
  $('#grCount').textContent = `${list.length} topic${list.length === 1 ? '' : 's'}`;
  const grid = $('#grGrid');
  grid.innerHTML = '';
  if (!list.length) grid.innerHTML = `<div class="empty-box" style="grid-column:1/-1;"><i class="fa-solid fa-pen-ruler"></i>No topics match.</div>`;
  list.forEach(g => {
    const card = document.createElement('div');
    card.className = 'gr-card';
    card.innerHTML = `<h3>${esc(g[0])}</h3><div class="use">${esc(g[1])}</div><div class="ex">“${esc(g[2])}”</div><div class="tip">💡 ${esc(g[3])}</div>`;
    card.addEventListener('click', () => openGrammarDetail(g));
    grid.appendChild(card);
  });
}
function renderPreps() {
  const q = norm($('#prSearch').value);
  const list = PREPS.filter(p => !q || (p[0] + ' ' + p[1] + ' ' + p[2]).toLowerCase().includes(q));
  $('#prCount').textContent = `${list.length} pattern${list.length === 1 ? '' : 's'}`;
  const grid = $('#prGrid');
  grid.innerHTML = '';
  if (!list.length) grid.innerHTML = `<div class="empty-box" style="grid-column:1/-1;"><i class="fa-solid fa-puzzle-piece"></i>No patterns match.</div>`;
  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'prep-card';
    card.innerHTML = `<div class="title">${esc(p[0])}</div><div class="pats">${esc(p[1])}</div><div class="note">${esc(p[2])}</div>`;
    card.addEventListener('click', () => openPrepDetail(p));
    grid.appendChild(card);
  });
}

/* ============================================================
   EVENTS
   ============================================================ */
$('#wordsSearch').addEventListener('input', e => { wordsState.q = e.target.value; renderWords(true); });
$('#wordsClear').addEventListener('click', () => { $('#wordsSearch').value = ''; wordsState.q = ''; renderWords(true); });
$('#wordsPos').addEventListener('change', e => { wordsState.pos = e.target.value; renderWords(true); });
$('#wordsStatus').addEventListener('change', e => { wordsState.status = e.target.value; renderWords(true); });
$('#wordsSort').addEventListener('change', e => { wordsState.sort = e.target.value; renderWords(true); });
$('#wordsHideUz').addEventListener('click', () => { store.settings.hideUz = !store.settings.hideUz; save(); renderWords(true); });
$('#wordsView').addEventListener('click', () => { wordsState.view = wordsState.view === 'grid' ? 'list' : 'grid'; renderWords(false); });
$('#wordsMore').addEventListener('click', () => { wordsState.shown += CHUNK; renderWords(false); });
$('#wordsRandom').addEventListener('click', () => {
  const list = filteredWords();
  if (!list.length) return toast('No words in this filter');
  openWordDetail(list[Math.floor(Math.random() * list.length)]);
});
$('#wordsExport').addEventListener('click', () => {
  const list = filteredWords();
  if (!list.length) return toast('Nothing to export');
  const csv = ['word,uzbek,pos,level,synonyms,antonyms,example', ...list.map(w => `"${String(w.en).replace(/"/g, '""')}","${String(w.uz).replace(/"/g, '""')}","${w.pos || ''}","${w.level || ''}","${(w.syn || '').replace(/"/g, '""')}","${(w.ant || '').replace(/"/g, '""')}","${String(w.ex || '').replace(/"/g, '""')}"`)].join('\n');
  download('vocab-perfect-words.csv', '\ufeff' + csv, 'text/csv');
  toast(`Exported ${list.length} words`, true);
});
$('#phSearch').addEventListener('input', e => { phState.q = e.target.value; renderPhrases(true); });
$('#phRandom').addEventListener('click', () => openPhraseDetail(PHRASES[Math.floor(Math.random() * PHRASES.length)]));
$('#grSearch').addEventListener('input', renderGrammar);
$('#prSearch').addEventListener('input', renderPreps);
$('#grQuizBtn').addEventListener('click', () => startGame('grammar'));
$('#prQuizBtn').addEventListener('click', () => startGame('prep'));

/* expose */
window.VP.openWordDetail = openWordDetail;
window.VP.openPhraseDetail = openPhraseDetail;
window.VP.openGrammarDetail = openGrammarDetail;
