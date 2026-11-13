'use strict';
/* ============================================================
   VOCAB PERFECT — quest.js
   5-stage map journey (upgraded from Lexiverse)
   ============================================================ */
const { esc, shuffle, toast, speak, sfx, confettiBurst, markAnswer, awardXP, checkAchievements, savedKey, clamp } = window.VP;

const Q_STAGES = 5, Q_WORDS_PER_STAGE = 5, Q_TOTAL = Q_STAGES * Q_WORDS_PER_STAGE;
const Q_NODE_SIZE = 90, Q_NODE_CENTER = Q_NODE_SIZE / 2, Q_NODE_SPACING_Y = 240, Q_NODE_OFFSET_X = 100, Q_CHAR_SIZE = 200;

const questState = { stage: 0, wordInStage: 0, learned: 0, streak: 5, mistakes: 0, busy: true, mode: 'intro', bank: [] };
let qMapContent, qMapScroller, qModal, qModalWord, qModalType, qOptionsBox, qStageLabel, qWordCountLbl, qStreakLbl, qProgressFill, qSolveBtn, qAnnouncer, qCharacterElem = null, questBooted = false;

function questBankWords() {
  const map = new Map();
  WORDS.forEach(w => map.set(savedKey(w.en), { w: w.en, t: w.pos || 'word', d: w.uz }));
  store.notebook.forEach(n => { if (!map.has(savedKey(n.w))) map.set(savedKey(n.w), { w: n.w, t: n.pos || 'word', d: n.m }); });
  store.saved.forEach(s => { if (!map.has(savedKey(s.en))) map.set(savedKey(s.en), { w: s.en, t: s.pos || 'word', d: s.uz }); });
  return [...map.values()].filter(x => x.w && x.d);
}
function questBuildBank() {
  const all = shuffle(questBankWords());
  const bank = all.slice(0, Q_TOTAL);
  const stages = [];
  for (let i = 0; i < Q_STAGES; i++) stages.push(bank.slice(i * Q_WORDS_PER_STAGE, (i + 1) * Q_WORDS_PER_STAGE));
  questState.bank = stages;
  if (stages[0].length < Q_WORDS_PER_STAGE) {
    // pad with repeated dictionary words if user bank is tiny
    const dict = shuffle(WORDS);
    for (let i = 0; i < Q_STAGES; i++) {
      while (stages[i].length < Q_WORDS_PER_STAGE && dict.length) {
        const w = dict.pop();
        stages[i].push({ w: w.en, t: w.pos || 'word', d: w.uz });
      }
    }
  }
}
function questSave() {
  store.stats.quest = { stage: questState.stage, wordInStage: questState.wordInStage, streak: questState.streak, done: questState.mode === 'complete' };
  save();
}
function questLoad() {
  const q = store.stats.quest;
  if (q) {
    questState.stage = clamp(parseInt(q.stage) || 0, 0, Q_STAGES - 1);
    questState.wordInStage = clamp(parseInt(q.wordInStage) || 0, 0, Q_WORDS_PER_STAGE);
    questState.learned = questState.stage * Q_WORDS_PER_STAGE + questState.wordInStage;
    questState.streak = parseInt(q.streak) || 5;
    if (q.done) questState.mode = 'complete';
  }
}

function questEnter() {
  if (!questBooted) { questBoot(); questBooted = true; }
  else { questBuildMap(); questScrollToStage(false); questUpdateUI(); }
}
function questBoot() {
  qMapContent = $('#map-content'); qMapScroller = $('#map-scroller');
  qModal = $('#quiz-modal'); qModalWord = $('#modal-word'); qModalType = $('#modal-type'); qOptionsBox = $('#options-container');
  qStageLabel = $('#stage-label'); qWordCountLbl = $('#word-count'); qStreakLbl = $('#streak-display'); qProgressFill = $('#progress-fill'); qSolveBtn = $('#solve-btn'); qAnnouncer = $('#announcer');
  questLoad();
  questBuildBank();
  qSolveBtn.addEventListener('click', () => {
    if (questState.busy || questState.mode === 'complete') return;
    if (questState.wordInStage >= Q_WORDS_PER_STAGE) questAdvanceStage();
    else questStartQuiz();
  });
  $('#nextStageBtn').addEventListener('click', questAdvanceStage);
  $('#questRestart').addEventListener('click', () => {
    if (!confirm('Restart the whole journey? Your progress will reset.')) return;
    questState.stage = 0; questState.wordInStage = 0; questState.learned = 0;
    questState.streak = 0; questState.mistakes = 0; questState.mode = 'play'; questState.busy = false;
    questBuildBank(); questSave();
    questBuildMap(); questUpdateUI(); questScrollToStage(true);
    questAnnounce('Journey restarted. Good luck!');
  });
  $('#questMenuBtn').addEventListener('click', () => {
    if (questState.wordInStage < Q_WORDS_PER_STAGE && questState.mode !== 'complete') questStartQuiz();
    else questAdvanceStage();
  });
  questBuildMap(); questUpdateUI(); questUpdateNodeStates(); questPlayIntro();
}

function questBuildMap() {
  const totalHeight = Q_STAGES * Q_NODE_SPACING_Y + 340;
  qMapContent.style.height = totalHeight + 'px';
  qMapContent.innerHTML = '';
  const containerWidth = qMapScroller.clientWidth || Math.min(window.innerWidth, 720);
  const centerX = containerWidth / 2;
  const positions = [];
  for (let i = 0; i < Q_STAGES; i++) {
    const reverseIndex = Q_STAGES - 1 - i;
    const yPos = 160 + reverseIndex * Q_NODE_SPACING_Y;
    const wave = Math.sin(i * 0.9) * Q_NODE_OFFSET_X;
    const xPos = Math.max(40, Math.min(centerX + wave - Q_NODE_CENTER, containerWidth - Q_NODE_SIZE - 40));
    positions.push({ x: xPos, y: yPos });
  }
  for (let i = 1; i < Q_STAGES; i++) {
    const a = positions[i - 1], b = positions[i];
    questDrawLine(a.x + Q_NODE_CENTER, a.y + Q_NODE_CENTER, b.x + Q_NODE_CENTER, b.y + Q_NODE_CENTER, i);
  }
  for (let i = 0; i < Q_STAGES; i++) {
    const { x, y } = positions[i];
    const node = document.createElement('div');
    node.className = 'q-node'; node.id = 'node-' + i;
    node.style.left = x + 'px'; node.style.top = y + 'px';
    node.textContent = i + 1;
    qMapContent.appendChild(node);
    if (i % 2 === 0) {
      const dec = document.createElement('div');
      dec.className = 'q-decor';
      dec.textContent = i % 4 === 0 ? '🌲' : '⛰️';
      dec.style.left = (x < centerX ? '80%' : '8%');
      dec.style.top = (y - 50) + 'px';
      qMapContent.appendChild(dec);
    }
  }
  qCharacterElem = document.createElement('div');
  qCharacterElem.className = 'q-character';
  qCharacterElem.id = 'character';
  const sprite = document.createElement('img');
  sprite.className = 'q-character-sprite';
  sprite.src = 'https://res.cloudinary.com/twrzshwl/image/upload/v1794045751/Gemini_Generated_Image_vws2h5vws2h5vws2-removebg-preview.png';
  sprite.alt = '';
  sprite.onerror = () => { const fb = document.createElement('div'); fb.className = 'q-character-sprite'; fb.textContent = '🧙‍♂️'; sprite.replaceWith(fb); };
  qCharacterElem.appendChild(sprite);
  qMapContent.appendChild(qCharacterElem);
  questUpdateNodeStates();
  questPositionCharacter(questState.stage, false);
}
function questDrawLine(x1, y1, x2, y2, index) {
  const dx = x2 - x1, dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const line = document.createElement('div');
  line.className = 'q-path-line'; line.id = 'line-' + index;
  line.style.width = length + 'px'; line.style.left = x1 + 'px'; line.style.top = y1 + 'px';
  line.style.transform = `rotate(${angle}deg)`;
  qMapContent.appendChild(line);
}
function questUpdateNodeStates() {
  for (let i = 0; i < Q_STAGES; i++) {
    const node = document.getElementById('node-' + i);
    if (!node) continue;
    node.className = 'q-node';
    if (i < questState.stage) { node.classList.add('completed'); node.textContent = '✓'; }
    else if (i === questState.stage) { node.classList.add('active'); node.textContent = questState.wordInStage >= Q_WORDS_PER_STAGE ? '✓' : (i + 1); }
    else { node.classList.add('locked'); node.textContent = '🔒'; }
    if (i > 0) {
      const line = document.getElementById('line-' + i);
      if (!line) continue;
      if (i < questState.stage || (i === questState.stage && questState.wordInStage >= Q_WORDS_PER_STAGE)) line.classList.add('completed');
      else line.classList.remove('completed');
    }
  }
}
function questPositionCharacter(stageIndex, animated) {
  if (!qCharacterElem) return;
  const node = document.getElementById('node-' + stageIndex);
  if (!node) return;
  const nodeLeft = parseFloat(node.style.left), nodeTop = parseFloat(node.style.top);
  qCharacterElem.style.left = (nodeLeft + Q_NODE_CENTER - Q_CHAR_SIZE / 2) + 'px';
  qCharacterElem.style.top = (nodeTop + Q_NODE_SIZE - Q_CHAR_SIZE + 10) + 'px';
  if (animated) { qCharacterElem.classList.add('jumping'); setTimeout(() => qCharacterElem.classList.remove('jumping'), 800); }
}
function questScrollToStage(smooth = true) {
  const node = document.getElementById('node-' + questState.stage);
  if (!node) return;
  qMapScroller.scrollTo({ top: node.offsetTop - qMapScroller.clientHeight / 2 + 80, behavior: smooth ? 'smooth' : 'auto' });
}
function questUpdateUI() {
  qStageLabel.textContent = `Stage ${questState.stage + 1} / ${Q_STAGES}`;
  qWordCountLbl.textContent = `${questState.learned} / ${Q_TOTAL} Words`;
  qStreakLbl.textContent = `🔥 ${questState.streak}`;
  qProgressFill.style.width = (questState.learned / Q_TOTAL * 100) + '%';
  if (questState.mode === 'complete') { qSolveBtn.textContent = 'All Done ✓'; qSolveBtn.disabled = true; }
  else if (questState.busy) { qSolveBtn.textContent = 'Loading…'; qSolveBtn.disabled = true; }
  else if (questState.wordInStage >= Q_WORDS_PER_STAGE) { qSolveBtn.textContent = questState.stage < Q_STAGES - 1 ? 'Next Stage ➔' : 'Finish'; qSolveBtn.disabled = false; }
  else { qSolveBtn.textContent = 'Learn Word'; qSolveBtn.disabled = false; }
}
function questAnnounce(msg) { qAnnouncer.textContent = ''; setTimeout(() => { qAnnouncer.textContent = msg; }, 30); }
function questPlayIntro() {
  questState.busy = true; questState.mode = 'intro'; questUpdateUI();
  setTimeout(() => {
    qMapScroller.scrollTop = qMapScroller.scrollHeight;
    setTimeout(() => {
      questScrollToStage(true);
      setTimeout(() => {
        questState.busy = false;
        if (questState.mode !== 'complete') questState.mode = 'play';
        questUpdateUI();
      }, 1200);
    }, 300);
  }, 100);
}
function questCurrentWord() { return questState.bank[questState.stage]?.[questState.wordInStage] || null; }
function questStartQuiz() {
  const word = questCurrentWord();
  if (!word) { toast('Not enough words'); return; }
  questState.mode = 'quiz';
  qModalWord.textContent = word.w;
  qModalType.textContent = word.t;
  qOptionsBox.innerHTML = '';
  if (store.settings.autoplay !== false) speak(word.w);
  const allDefs = [];
  questState.bank.forEach(stage => stage.forEach(x => { if (x.d !== word.d) allDefs.push(x.d); }));
  const wrongPool = [...new Set(allDefs)];
  questShuffle(wrongPool);
  const options = shuffle([word.d, ...wrongPool.slice(0, 3)]);
  options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'q-option-btn';
    btn.type = 'button';
    btn.dataset.def = opt;
    btn.innerHTML = `<span class="q-opt-num">${idx + 1}</span><span>${esc(opt)}</span>`;
    btn.addEventListener('click', () => questHandleAnswer(opt, word.d, btn), { once: true });
    qOptionsBox.appendChild(btn);
  });
  qModal.classList.add('show');
  setTimeout(() => qOptionsBox.querySelector('button')?.focus(), 50);
}
function questHandleAnswer(selected, correct, btnEl) {
  Array.from(qOptionsBox.children).forEach(b => { b.disabled = true; b.style.pointerEvents = 'none'; });
  const isCorrect = selected === correct;
  markAnswer(isCorrect);
  if (isCorrect) {
    btnEl.classList.add('correct');
    questState.streak++;
    sfx('correct');
    awardXP(3, 'quest word');
    questAnnounce('Correct!');
    questUpdateUI();
    setTimeout(() => { qModal.classList.remove('show'); questAdvanceWord(); }, 800);
  } else {
    btnEl.classList.add('wrong');
    questState.mistakes++;
    questState.streak = Math.max(0, questState.streak - 1);
    sfx('wrong');
    questUpdateUI();
    questAnnounce('Not quite. Correct answer highlighted.');
    Array.from(qOptionsBox.children).forEach(b => { if (b.dataset.def === correct) b.classList.add('correct'); });
    setTimeout(() => { qModal.classList.remove('show'); }, 1700);
  }
}
function questAdvanceWord() {
  questState.wordInStage++;
  if (questState.wordInStage >= Q_WORDS_PER_STAGE) questShowLevelComplete();
  else { questState.learned++; questSave(); questUpdateUI(); }
}
function questShowLevelComplete() {
  questState.learned++; questSave(); questUpdateNodeStates(); questUpdateUI();
  const overlay = $('#levelComplete');
  const star1 = $('#star1'), star2 = $('#star2'), star3 = $('#star3');
  [star1, star2, star3].forEach(s => s.classList.remove('active'));
  if (questState.mistakes === 0) { star1.classList.add('active'); star2.classList.add('active'); star3.classList.add('active'); }
  else if (questState.mistakes <= 2) { star1.classList.add('active'); star2.classList.add('active'); }
  else star1.classList.add('active');
  if (questState.mistakes === 0) { confettiBurst(90); sfx('win'); awardXP(25, 'quest perfect stage'); }
  else awardXP(10, 'quest stage');
  $('#levelCompleteTitle').textContent = questState.stage >= Q_STAGES - 1 ? 'JOURNEY COMPLETE' : 'STAGE COMPLETE';
  overlay.classList.add('show');
  questAnnounce(`Stage ${questState.stage + 1} complete!`);
}
function questAdvanceStage() {
  $('#levelComplete').classList.remove('show');
  if (questState.stage >= Q_STAGES - 1) {
    questState.mode = 'complete';
    questState.busy = false;
    questSave(); questUpdateUI();
    awardXP(50, 'quest complete');
    confettiBurst(160);
    questAnnounce('Congratulations! You finished all 5 stages.');
    toast('Quest complete — +50 XP', true);
    checkAchievements();
    return;
  }
  questState.busy = true; questState.mode = 'advancing'; qSolveBtn.disabled = true;
  questState.stage++; questState.wordInStage = 0; questState.mistakes = 0; questSave();
  questPositionCharacter(questState.stage, true); questUpdateNodeStates(); questScrollToStage(true);
  setTimeout(() => {
    questState.busy = false; questState.mode = 'play'; questUpdateUI();
    questAnnounce(`Stage ${questState.stage + 1} started.`);
  }, 1000);
}
function questShuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

let qResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(qResizeTimer);
  qResizeTimer = setTimeout(() => {
    if (!questBooted) return;
    const screen = $('#screen-quest');
    if (!screen || !screen.classList.contains('on')) return;
    const prev = qMapScroller.scrollTop;
    questBuildMap();
    qMapScroller.scrollTop = prev;
    questScrollToStage(false);
  }, 150);
});

window.VP.questEnter = questEnter;
