// ========================== 立即执行函数 ==========================
(function() {
'use strict';

/* ---------- 常量 ---------- */
const LS_CARDS = 'recalleum-cards-v2';
const LS_DECKS = 'recalleum-decks-v2';
const LS_DAILY_GOAL = 'recalleum-daily-goal';
const LS_STREAK = 'recalleum-streak';
const LS_GOAL_COMPLETION = 'recalleum-goal-completion';
const LS_ADDED_CARDS = 'recalleum-added-cards';

const DEFAULT_DECKS = ['雅思核心', '小学英语', '初中英语(新版)', '初中英语(旧版)', '自定义'];

/* ---------- 状态---------- */
let cards = [];
let decks = JSON.parse(localStorage.getItem(LS_DECKS)) || [...DEFAULT_DECKS];
let dailyGoal = parseInt(localStorage.getItem(LS_DAILY_GOAL)) || 20;
let streak = parseInt(localStorage.getItem(LS_STREAK)) || 0;
let goalCompletion = parseInt(localStorage.getItem(LS_GOAL_COMPLETION)) || 0;
let addedCardIds = new Set(JSON.parse(localStorage.getItem(LS_ADDED_CARDS) || '[]'));
let studyQueue = [];
let currentStudyIdx = -1;
let isFlipped = false;
let studySessionActive = false;
let todayDateStr = new Date().toDateString();

/* ---------- 存储函数 ---------- */
function saveCards() { localStorage.setItem(LS_CARDS, JSON.stringify(cards)); }
function saveDecks() { localStorage.setItem(LS_DECKS, JSON.stringify(decks)); }
function saveAddedIds() { localStorage.setItem(LS_ADDED_CARDS, JSON.stringify([...addedCardIds])); }
function saveGoalCompletion() { localStorage.setItem(LS_GOAL_COMPLETION, goalCompletion.toString()); }
function saveStreak() { localStorage.setItem(LS_STREAK, streak.toString()); }

/* ---------- ID生成 ---------- */
function genId() { return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8); }
function cardId(front, back) { return front + '|' + back; }

/* ---------- 日期工具 ---------- */
function isSameDay(ts) { return new Date(ts).toDateString() === todayDateStr; }

/* ---------- 提示 ---------- */
function showToast(msg, cls) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast' + (cls ? ' ' + cls : '');
  el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 2000);
}
function showErr(msg) {
  const el = document.getElementById('errToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 2500);
}



/* ==================== 卡组管理 ==================== */
function loadCards() {
  try {
    var raw = localStorage.getItem(LS_CARDS);
    cards = raw ? JSON.parse(raw) : [];
  } catch(e) { cards = []; }
  try {
    var ids = localStorage.getItem(LS_ADDED_CARDS);
    addedCardIds = new Set(ids ? JSON.parse(ids) : []);
  } catch(e) { addedCardIds = new Set(); }
}

function addCard(front, back, deck, source) {
  var id = cardId(front, back);
  var existing = cards.find(function(c) { return c.id === id; });
  if (existing) return existing;
  var c = {
    id: id, front: front, back: back, deck: deck || '自定义',
    createdAt: Date.now(), lastReview: 0,
    reviewedCount: 0, source: source || 'custom',
    mastered: false, learnCount: 0, wrongCount: 0
  };
  cards.push(c);
  addedCardIds.add(id);
  saveCards();
  saveAddedIds();
  return c;
}

function getCardsByDeck(deckName) { return cards.filter(function(c) { return c.deck === deckName; }); }


function getStats() {
  var total = cards.length;
  var mastered = cards.filter(function(c) { return c.mastered; }).length;
  var reviewedToday = cards.filter(function(c) { return c.lastReview && isSameDay(c.lastReview); }).length;
  var mastery = total > 0 ? Math.round(mastered / total * 100) : 0;
  return { total: total, mastered: mastered, mastery: mastery, reviewedToday: reviewedToday };
}

function getDecksWithCount() {
  var counts = {};
  cards.forEach(function(c) { counts[c.deck] = (counts[c.deck] || 0) + 1; });
  return decks.map(function(d) { return { name:d, count:counts[d] || 0 }; }).filter(function(d) { return d.count > 0; });
}

function resetDeckProgress(deckName) {
  cards.forEach(function(c) {
    if (c.deck === deckName) {
      c.mastered = false; c.learnCount = 0; c.wrongCount = 0;
      c.lastReview = 0; c.reviewedCount = 0;
    }
  });
  saveCards();
}

/* ==================== 工具函数 ==================== */
function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

/* ==================== 学习会话管理 ==================== */
function startStudySession(deckName) {
  var pool = deckName 
    ? cards.filter(function(c) { return c.deck === deckName && !c.mastered; })
    : cards.filter(function(c) { return !c.mastered; });
  studyQueue = shuffle(pool);
  currentStudyIdx = 0;
  isFlipped = false;
  studySessionActive = studyQueue.length > 0;
  renderStudy(); updateStats();
}

function showCard(index) {
  var wrap = document.getElementById('flashcard');
  if (!wrap) return;
  if (index < 0 || index >= studyQueue.length) {
    document.getElementById('cardFront').textContent = '今日复习完成！';
    document.getElementById('cardBack').textContent = '太棒了！所有到期卡片已复习完毕。';
    document.getElementById('cardDeckName').textContent = '—';
    wrap.classList.remove('flipped'); isFlipped = false;
    document.querySelector('.rating-row').classList.add('locked');
    studySessionActive = false;
    return;
  }
  var card = studyQueue[index];
  document.getElementById('cardFront').textContent = card.front;
  document.getElementById('cardBack').textContent = card.back;
  document.getElementById('cardDeckName').textContent = card.deck;
  wrap.classList.remove('flipped'); isFlipped = false;
  document.querySelector('.rating-row').classList.remove('locked');
}

function flipCard() {
  var wrap = document.getElementById('flashcard');
  if (!wrap) return;
  if (currentStudyIdx < 0 || currentStudyIdx >= studyQueue.length) return;
  isFlipped = !isFlipped;
  wrap.classList.toggle('flipped', isFlipped);
}

function rateCard(learned) {
  if (currentStudyIdx < 0 || currentStudyIdx >= studyQueue.length) return;
  if (!isFlipped) { showToast('请先点击卡片翻面查看答案', 'warn'); return; }
  var card = studyQueue[currentStudyIdx];
  card.lastReview = Date.now();
  card.reviewedCount = (card.reviewedCount || 0) + 1;

  if (learned) {
    // 学会了，进入测试
    card.learnCount = (card.learnCount || 0) + 1;
    startQuiz(card);
  } else {
    // 没学会，移到队列末尾
    card.wrongCount = (card.wrongCount || 0) + 1;
    studyQueue.push(card);
    studyQueue.splice(currentStudyIdx, 1);
    saveCards();
    if (currentStudyIdx >= studyQueue.length) { currentStudyIdx = studyQueue.length; showCard(-1); }
    else { showCard(currentStudyIdx); }
    refreshAll();
  }
}

/* ==================== 测试模式 ==================== */

// 全局测试状态
var quizCard = null;
var quizOptions = [];
var quizAnswered = false;
var spellAnswered = false;
var quizCorrect = false;
var spellCorrect = false;

function startQuiz(card) {
  quizCard = card;
  quizAnswered = false;
  spellAnswered = false;
  quizCorrect = false;
  spellCorrect = false;

  // 生成选择题：从同卡组其他卡片抽3个干扰项
  var others = cards.filter(function(c) {
    return c.deck === card.deck && c.id !== card.id;
  });
  var distractors = shuffle(others.slice()).slice(0, 3);
  quizOptions = shuffle([card].concat(distractors));

  // 显示测试面板，隐藏学习卡片
  document.getElementById('flashcardWrap').style.display = 'none';
  document.getElementById('quizPanel').style.display = 'block';
  document.getElementById('spellPanel').style.display = 'none';

  // 渲染选择题
  document.getElementById('quizQuestion').textContent = card.back;
  var optsHtml = '';
  quizOptions.forEach(function(opt, idx) {
    optsHtml += '<button class="quiz-opt" data-idx="' + idx + '" onclick="pickQuiz(' + idx + ')">' + escHtml(opt.front) + '</button>';
  });
  document.getElementById('quizOptions').innerHTML = optsHtml;
  document.getElementById('quizResult').textContent = '';
  document.getElementById('quizResult').className = '';

  // 重置拼写区
  var spellInput = document.getElementById('spellInput');
  if (spellInput) { spellInput.value = ''; spellInput.disabled = false; spellInput.style.borderColor = ''; }
  document.getElementById('spellResult').textContent = '';
  document.getElementById('spellHint').style.display = 'none';
}

function pickQuiz(idx) {
  if (quizAnswered) return;
  quizAnswered = true;
  var chosen = quizOptions[idx];
  var correct = chosen.id === quizCard.id;
  quizCorrect = correct;

  // 标记选项颜色
  var btns = document.querySelectorAll('.quiz-opt');
  btns.forEach(function(btn, i) {
    btn.disabled = true;
    if (quizOptions[i].id === quizCard.id) btn.classList.add('correct');
    else if (i === idx && !correct) btn.classList.add('wrong');
  });

  var resultEl = document.getElementById('quizResult');
  if (correct) {
    resultEl.textContent = '✅ 选择正确！接下来拼写这个单词。';
    resultEl.className = 'quiz-result ok';
    // 显示拼写面板
    document.getElementById('spellPanel').style.display = 'block';
    document.getElementById('spellPrompt').textContent = '请拼写：' + quizCard.back;
    setTimeout(function() { document.getElementById('spellInput').focus(); }, 100);
  } else {
    resultEl.textContent = '❌ 选择错误。正确答案是：' + quizCard.front;
    resultEl.className = 'quiz-result err';
    // 答错，显示继续按钮
    document.getElementById('quizNextBtn').style.display = 'inline-flex';
    document.getElementById('quizNextBtn').textContent = '继续学习';
  }
}

function checkSpell() {
  if (spellAnswered) return;
  var input = document.getElementById('spellInput');
  if (!input) return;
  var val = input.value.trim().toLowerCase();
  var correct = val === quizCard.front.toLowerCase();
  spellCorrect = correct;
  spellAnswered = true;
  input.disabled = true;

  var resultEl = document.getElementById('spellResult');
  if (correct) {
    input.style.borderColor = '#22c55e';
    resultEl.textContent = '✅ 拼写正确！';
    resultEl.className = 'quiz-result ok';
  } else {
    input.style.borderColor = '#ef4444';
    resultEl.textContent = '❌ 拼写错误。正确答案是：' + quizCard.front;
    resultEl.className = 'quiz-result err';
  }

  // 显示继续按钮
  document.getElementById('quizNextBtn').style.display = 'inline-flex';
  document.getElementById('quizNextBtn').textContent = correct ? '下一词' : '继续学习';
}

function showSpellHint() {
  var input = document.getElementById('spellInput');
  if (!input || spellAnswered) return;
  var val = input.value;
  var answer = quizCard.front;
  var hint = answer.slice(0, Math.min(val.length + 1, answer.length));
  input.value = hint;
  document.getElementById('spellHint').style.display = 'block';
}

function finishQuiz() {
  // 判断是否通过测试
  var passed = quizCorrect && spellCorrect;

  if (passed) {
    quizCard.mastered = true;
    quizCard.learnCount = (quizCard.learnCount || 0) + 1;
    goalCompletion = Math.min(goalCompletion + 1, dailyGoal);
    saveGoalCompletion();
    showToast('🎉 掌握 +' + quizCard.front);
  } else {
    quizCard.wrongCount = (quizCard.wrongCount || 0) + 1;
    quizCard.mastered = false;
    // 将卡片移到队列末尾
    if (studyQueue.indexOf(quizCard) === -1) {
      studyQueue.push(quizCard);
    }
    showToast('再试一次：' + quizCard.front, 'warn');
  }

  saveCards();

  // 恢复学习界面
  document.getElementById('quizPanel').style.display = 'none';
  document.getElementById('spellPanel').style.display = 'none';
  document.getElementById('flashcardWrap').style.display = 'flex';
  document.getElementById('quizNextBtn').style.display = 'none';

  // 继续下一个
  if (passed) currentStudyIdx++;
  if (currentStudyIdx >= studyQueue.length) {
    currentStudyIdx = studyQueue.length;
    showCard(-1);
  } else {
    showCard(currentStudyIdx);
  }
  refreshAll();
}

/* ==================== 渲染函数 ==================== */
function renderDecks() {
  var el = document.getElementById('decksList');
  if (!el) return;
  var deckCounts = getDecksWithCount();
  if (deckCounts.length === 0) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:16px;">还没有卡片，去词库中导入吧</div>';
    return;
  }
  var html = '';
  var activeDeck = document.querySelector('.deck-item.active');
  var activeName = activeDeck ? activeDeck.getAttribute('data-deck') : null;
  deckCounts.forEach(function(d) {
    var masteredCount = cards.filter(function(c) { return c.deck === d.name && c.mastered; }).length;
    var pct = d.count > 0 ? Math.round(masteredCount / d.count * 100) : 0;
    html += '<div class="deck-item' + (d.name === activeName ? ' active' : '') + '" data-deck="' + escHtml(d.name) + '">';
    html += '<div><span class="name">' + escHtml(d.name) + '</span>';
    html += '<div style="font-size:11px;color:var(--muted);margin-top:2px;">';
    html += '已掌握' + masteredCount + '/' + d.count + ' (' + pct + '%)</div></div>';
    html += '<div style="width:40px;height:40px;border-radius:50%;border:3px solid var(--rule);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;position:relative;">';
    html += '<span style="color:var(--accent);">' + pct + '%</span>';
    if (pct > 0) {
      var deg = pct * 3.6;
      html += '<svg style="position:absolute;top:-3px;left:-3px;width:40px;height:40px;transform:rotate(-90deg);" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="' + (pct * 1.07) + ' 107" stroke-linecap="round"/></svg>';
    }
    html += '</div></div>';
  });
  el.innerHTML = html;
  el.querySelectorAll('.deck-item').forEach(function(item) {
    item.addEventListener('click', function() {
      el.querySelectorAll('.deck-item').forEach(function(x) { x.classList.remove('active'); });
      item.classList.add('active');
      startStudySession(item.getAttribute('data-deck'));
    });
  });
}

function updateStats(s) {
  if (!s) s = getStats();
  document.getElementById('stat-total').textContent = s.total;
  document.getElementById('stat-streak').textContent = streak;
  document.getElementById('stat-mastery').textContent = s.mastery + '%';
  var masteredEl = document.getElementById('stat-mastered');
  if (masteredEl) masteredEl.textContent = s.mastered;
}


function updateGoalRing() {
  var pct = Math.min(goalCompletion / dailyGoal * 100, 100);
  var circum = 151;
  var offset = circum - circum * pct / 100;
  var ring = document.getElementById('goalRing');
  if (ring) ring.setAttribute('stroke-dashoffset', offset);
  document.getElementById('goalDone').textContent = goalCompletion;
  document.getElementById('goalTarget').textContent = dailyGoal;
}

function renderStudy() {
  var total = studyQueue.length;
  var done = currentStudyIdx;
  var progress = total > 0 ? Math.round(done / total * 100) : 0;
  var fill = document.getElementById('studyProgressFill');
  if (fill) fill.style.width = Math.min(progress, 100) + '%';
  document.getElementById('studyProgressLabel').textContent = done + ' / ' + total;
  showCard(currentStudyIdx);
}

function escHtml(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ==================== ECharts 掌握度曲线==================== */
var chartInstance = null;
function initChart() {
  var dom = document.getElementById('chart-mastery');
  if (!dom || typeof echarts === 'undefined') return;
  try { chartInstance = echarts.init(dom); updateChart(); }
  catch(e) { console.warn('ECharts init failed:', e); }
}

function updateChart() {
  if (!chartInstance) return;
  var days = 30;
  var labels = [], masteredData = [], dueData = [], totalData = [];
  var hasAnyReview = cards.some(function(c) { return c.lastReview > 0; });
  if (!hasAnyReview || cards.length === 0) {
    chartInstance.setOption({
      title: { text: '暂无学习数据', left: 'center', top: 'center', textStyle: { color: '#999', fontSize: 14, fontWeight: 'normal' } },
      xAxis: { show: false }, yAxis: { show: false }, series: []
    }, true);
    chartInstance.resize();
    return;
  }
  for (var i = days - 1; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    d.setHours(23, 59, 59, 999);
    var dayEnd = d.getTime();
    var dayStart = dayEnd - 86400000 + 1;
    labels.push((d.getMonth()+1) + '/' + d.getDate());
    var mCount = 0, dCount = 0, tCount = 0;
    cards.forEach(function(c) {
      if (c.createdAt <= dayEnd) tCount++;
      if (c.mastered && c.lastReview <= dayEnd) mCount++;
      if (!c.mastered) dCount++;
    });
    masteredData.push(tCount > 0 ? Math.round(mCount / tCount * 100) : 0);
    dueData.push(dCount);
    totalData.push(tCount);
  }
  var option = {
    tooltip: { trigger: 'axis' },
    legend: { data:['掌握度(%)','待复习','总卡片'], bottom:0 },
    grid: { left:40, right:20, bottom:48, top:20 },
    xAxis: { type:'category', data:labels, axisLabel:{ fontSize:11 } },
    yAxis: [
      { type:'value', name:'掌握度', max:100, axisLabel:{ fontSize:11 } },
      { type:'value', name:'数量', axisLabel:{ fontSize:11 } }
    ],
    series: [
      { name:'掌握度(%)', type:'line', smooth:true, data:masteredData,
        lineStyle:{ color:'#18b08c', width:2 }, itemStyle:{ color:'#18b08c' },
        areaStyle:{ color:'rgba(24,176,140,0.1)' } },
      { name:'待复习', type:'bar', data:dueData, yAxisIndex:1,
        itemStyle:{ color:'#ff7e6b', borderRadius:[4,4,0,0] }, barMaxWidth:12 },
      { name:'总卡片', type:'line', smooth:true, data:totalData, yAxisIndex:1,
        lineStyle:{ color:'#5b4bff', width:2, type:'dashed' }, itemStyle:{ color:'#5b4bff' }, symbol:'none' }
    ]
  };
  chartInstance.setOption(option, true);
  chartInstance.resize();
}

/* ==================== 通用词库管理器工具==================== */
function createVocabManager(config) {
  // config: {
  //   vocabData, pickId, unitPickId, searchId, listId, summaryId,
  //   importAllId, importCustomId, deckName, source, checkClass,
  //   addBtnClass, scopeName, btnPrefix, wrapInGrid
  // }
  var self = {};

  self.render = function() {
    var listEl = document.getElementById(config.listId);
    if (!listEl) return;
    var pick = document.getElementById(config.pickId).value;
    var unit = document.getElementById(config.unitPickId).value;
    var search = document.getElementById(config.searchId).value.toLowerCase().trim();
    var data = [];
    var gd = config.vocabData[pick];
    if (gd) {
      Object.keys(gd).forEach(function(u) {
        if (unit && u !== unit) return;
        (gd[u] || []).forEach(function(w) {
          if (search && w[0].toLowerCase().indexOf(search) === -1 && w[1].indexOf(search) === -1) return;
          data.push({ word: w[0], meaning: w[1], unit: u });
        });
      });
    }
    var summary = document.getElementById(config.summaryId);
    if (summary) summary.innerHTML = pick + ' 共<b>' + data.length + '</b> 个' + (config.source === 'grade' ? '单词' : '词汇');
    if (data.length === 0) { listEl.innerHTML = '<div class="vocab-empty">没有匹配的' + (config.source === 'grade' ? '单词' : '词汇') + '</div>'; return; }
    var html = config.wrapInGrid ? '<div class="vocab-grid">' : '';
    data.forEach(function(v, i) {
      var isAdded = addedCardIds.has(cardId(v.word, v.meaning));
      html += '<div class="vocab-card' + (isAdded ? ' added' : '') + '">';
      html += '<div class="top"><span class="word">' + escHtml(v.word) + '</span><span class="idx">' + escHtml(v.unit) + '</span></div>';
      html += '<div class="meaning">' + escHtml(v.meaning) + '</div>';
      html += '<div class="bottom"><label><input type="checkbox" class="' + config.checkClass + '" data-word="' + escHtml(v.word) + '" data-meaning="' + escHtml(v.meaning) + '"' + (isAdded ? ' checked disabled' : '') + '> 选中</label>';
      html += '<button class="' + config.addBtnClass + (isAdded ? ' added' : '') + '" data-word="' + escHtml(v.word) + '" data-meaning="' + escHtml(v.meaning) + '">' + (isAdded ? '已加入' : '加入') + '</button></div></div>';
    });
    if (config.wrapInGrid) html += '</div>';
    listEl.innerHTML = html;
  };

  self.importAll = function() {
    var pick = document.getElementById(config.pickId).value;
    var unit = document.getElementById(config.unitPickId).value;
    var gd = config.vocabData[pick];
    if (!gd) { showErr('未找到该' + config.scopeName + '词库'); return; }
    var imported = 0;
    Object.keys(gd).forEach(function(u) {
      if (unit && u !== unit) return;
      (gd[u] || []).forEach(function(w) {
        if (!addedCardIds.has(cardId(w[0], w[1]))) { addCard(w[0], w[1], config.deckName, config.source); imported++; }
      });
    });
    self.render(); renderDecks(); updateStats();
    showToast('成功导入 ' + imported + ' 个' + (config.source === 'grade' ? '单词' : '词汇'), 'success');
  };

  self.importSelected = function() {
    var checked = document.querySelectorAll('.' + config.checkClass + ':checked:not(:disabled)');
    var imported = 0;
    checked.forEach(function(chk) {
      var word = chk.getAttribute('data-word');
      var meaning = chk.getAttribute('data-meaning');
      if (!addedCardIds.has(cardId(word, meaning))) { addCard(word, meaning, config.deckName, config.source); imported++; }
    });
    self.render(); renderDecks(); updateStats();
    showToast('成功导入 ' + imported + ' 个' + (config.source === 'grade' ? '单词' : '词汇'), 'success');
  };

  self.populateUnits = function() {
    var pick = document.getElementById(config.pickId).value;
    var sel = document.getElementById(config.unitPickId);
    if (!sel) return;
    var gd = config.vocabData[pick];
    sel.innerHTML = '<option value="">全部单元</option>';
    if (gd) Object.keys(gd).forEach(function(u) { sel.innerHTML += '<option value="' + escHtml(u) + '">' + escHtml(u) + '</option>'; });
    self.updateBtnText();
  };

  self.updateBtnText = function() {
    var btn = document.getElementById(config.importAllId);
    if (!btn) return;
    var unitSel = document.getElementById(config.unitPickId);
    if (!unitSel) return;
    var unit = unitSel.value;
    var prefix = config.btnPrefix || '';
    if (unit) { btn.textContent = prefix + '当前单元全部加入'; }
    else { btn.textContent = prefix + '当前' + config.scopeName + '全部加入'; }
  };

  return self;
}

/* ==================== 创建词库管理器实例==================== */
var gradeManager = createVocabManager({
  vocabData: GRADE_VOCAB,
  pickId: 'gradePick',
  unitPickId: 'unitPick',
  searchId: 'gradeSearch',
  listId: 'gradeList',
  summaryId: 'gradeSummary',
  importAllId: 'gradeImportAll',
  importCustomId: 'gradeImportCustom',
  deckName: '小学英语',
  source: 'grade',
  checkClass: 'grade-check',
  addBtnClass: 'grade-add-btn',
  scopeName: '年级',
  btnPrefix: '✦',
  wrapInGrid: true
});

var middleManager = createVocabManager({
  vocabData: MIDDLE_VOCAB,
  pickId: 'middlePick',
  unitPickId: 'middleUnitPick',
  searchId: 'middleSearch',
  listId: 'middleGrid',
  summaryId: 'middleSummary',
  importAllId: 'middleImportAll',
  importCustomId: 'middleImportCustom',
  deckName: '初中英语(新版)',
  source: 'middle',
  checkClass: 'middle-check',
  addBtnClass: 'middle-add-btn',
  scopeName: '册',
  btnPrefix: '',
  wrapInGrid: false
});

var oldMiddleManager = createVocabManager({
  vocabData: OLD_MIDDLE_VOCAB,
  pickId: 'oldMiddlePick',
  unitPickId: 'oldMiddleUnitPick',
  searchId: 'oldMiddleSearch',
  listId: 'oldMiddleGrid',
  summaryId: 'oldMiddleSummary',
  importAllId: 'oldMiddleImportAll',
  importCustomId: 'oldMiddleImportCustom',
  deckName: '初中英语(旧版)',
  source: 'oldmiddle',
  checkClass: 'oldmiddle-check',
  addBtnClass: 'oldmiddle-add-btn',
  scopeName: '册',
  btnPrefix: '',
  wrapInGrid: false
});

/* ==================== IELTS 词库渲染（特殊逻辑，保留独立实现） ==================== */
function renderIELTS() {
  var listEl = document.getElementById('ieltsList');
  if (!listEl) return;
  var tag = document.getElementById('ieltsTag').value;
  var filter = document.getElementById('ieltsFilter').value;
  var search = document.getElementById('ieltsSearch').value.toLowerCase().trim();
  var deck = '雅思核心';
  var data = IELTS_VOCAB || [];
  if (tag) data = data.filter(function(v) { return v.tags.indexOf(tag) !== -1; });
  if (search) data = data.filter(function(v) { return v.word.toLowerCase().indexOf(search) !== -1 || v.meaning.indexOf(search) !== -1; });
  if (filter === 'added') data = data.filter(function(v) { return addedCardIds.has(cardId(v.word, v.meaning)); });
  if (filter === 'new') data = data.filter(function(v) { return !addedCardIds.has(cardId(v.word, v.meaning)); });
  var summary = document.getElementById('ieltsSummary');
  if (summary) summary.innerHTML = '共<b>' + data.length + '</b> 个词汇，已加入<b>' + data.filter(function(v) { return addedCardIds.has(cardId(v.word, v.meaning)); }).length + '</b> 个';
  if (data.length === 0) { listEl.innerHTML = '<div class="vocab-empty">没有匹配的词汇</div>'; return; }
  var html = '<div class="vocab-grid">';
  data.forEach(function(v, i) {
    var isAdded = addedCardIds.has(cardId(v.word, v.meaning));
    var tags = v.tags.map(function(t) { return '<span class="vocab-tag tag-' + t + '">' + t + '</span>'; }).join('');
    html += '<div class="vocab-card' + (isAdded ? ' added' : '') + '"><div class="top"><span class="word">' + escHtml(v.word) + '</span><span class="idx">#' + (i+1) + '</span></div>';
    html += '<div class="meaning">' + escHtml(v.meaning) + '</div>';
    html += '<div class="bottom">' + tags + '<button class="ielts-add-btn' + (isAdded?' added':'') + '" data-word="' + escHtml(v.word) + '" data-meaning="' + escHtml(v.meaning) + '">' + (isAdded ? '已加入' : '加入卡组') + '</button></div></div>';
  });
  html += '</div>';
  listEl.innerHTML = html;
}

function importIELTS(words, count) {
  var deckName = '雅思核心';
  var data = IELTS_VOCAB || [];
  var available = data.filter(function(v) { return !addedCardIds.has(cardId(v.word, v.meaning)); });
  if (count && available.length > count) {
    var shuffled = shuffle(available.slice());
    available = shuffled.slice(0, count);
  }
  var toImport = words || available;
  var imported = 0;
  toImport.forEach(function(v) {
    if (!addedCardIds.has(cardId(v.word, v.meaning))) { addCard(v.word, v.meaning, deckName, 'ielts'); imported++; }
  });
  renderIELTS(); renderDecks(); updateStats();
  showToast('成功导入 ' + imported + ' 个词汇', 'success');
}

/* ==================== 卡片编辑面板函数 ==================== */
function populateDeckSelects() {
  var ids = ['bulkDeck','singleDeck'];
  ids.forEach(function(id) {
    var el = document.getElementById(id); if (!el) return;
    var cur = el.value;
    el.innerHTML = decks.map(function(d) { return '<option value="' + escHtml(d) + '">' + escHtml(d) + '</option>'; }).join('');
    if (cur) el.value = cur;
  });
}

function updatePreview(s) {
  var el = document.getElementById('preview'); if (!el) return;
  if (!s) s = getStats();
  el.textContent = '当前共' + s.total + ' 张卡片，今天已复习' + s.reviewedToday + ' 张，已掌握' + s.mastered + ' 张';
}

/* ==================== 刷新UI ==================== */
function refreshAll() {
  var s = getStats();
  updateStats(s);
  updateGoalRing();
  updatePreview(s);
  renderDecks();
}

/* ==================== 事件绑定（含事件委托）==================== */
function bindEvents() {
  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var t = tab.getAttribute('data-tab');
      document.querySelectorAll('[id^="panel-"]').forEach(function(p) { p.style.display = 'none'; });
      var panel = document.getElementById('panel-' + t);
      if (panel) panel.style.display = 'block';
      if (t === 'ielts') renderIELTS();
      if (t === 'grade') gradeManager.render();
      if (t === 'middle') middleManager.render();
      if (t === 'oldmiddle') oldMiddleManager.render();
    });
  });
  var flashcard = document.getElementById('flashcard');
  if (flashcard) flashcard.addEventListener('click', function() { flipCard(); });
  var resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', function() {
    var active = document.querySelector('.deck-item.active');
    if (!active) { showToast('请先选择一个卡组', 'warn'); return; }
    var dn = active.getAttribute('data-deck');
    if (confirm('确定重置卡组"' + dn + '"的所有学习进度吗？')) { resetDeckProgress(dn); startStudySession(dn); updateStats(); showToast('卡组"' + dn + '"进度已重置', 'success'); }
  });
  var clearDeckBtn = document.getElementById('clearDeckBtn');
  var clearConfirm = document.getElementById('clearDeckConfirm');
  var clearTimer = null;
  if (clearDeckBtn) clearDeckBtn.addEventListener('click', function() {
    var active = document.querySelector('.deck-item.active');
    if (!active) { showToast('请先在右侧选择一个卡组', 'warn'); return; }
    var dn = active.getAttribute('data-deck');
    if (clearDeckBtn.dataset.confirming === 'true') {
      if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
      var deckCards = cards.filter(function(c) { return c.deck === dn; });
      deckCards.forEach(function(c) { addedCardIds.delete(cardId(c.front, c.back)); });
      cards = cards.filter(function(c) { return c.deck !== dn; });
      saveCards(); saveAddedIds(); renderDecks(); updateStats(); updatePreview();
      document.getElementById('cardFront').textContent = '点击下方卡组开始';
      document.getElementById('cardBack').textContent = '—';
      document.getElementById('studyProgressLabel').textContent = '0 / 0';
      document.getElementById('studyProgressFill').style.width = '0%';
      document.getElementById('goalDone').textContent = '0';
      clearDeckBtn.dataset.confirming = 'false';
      if (clearConfirm) clearConfirm.style.display = 'none';
      showToast('卡组"' + dn + '"已清空', 'success');
    } else {
      clearDeckBtn.dataset.confirming = 'true';
      if (clearConfirm) clearConfirm.style.display = 'block';
      clearTimer = setTimeout(function() {
        clearDeckBtn.dataset.confirming = 'false';
        if (clearConfirm) clearConfirm.style.display = 'none';
        clearTimer = null;
      }, 3000);
    }
  });
  var bulkAddBtn = document.getElementById('bulkAddBtn');
  if (bulkAddBtn) bulkAddBtn.addEventListener('click', function() {
    var input = document.getElementById('bulkInput');
    var deck = document.getElementById('bulkDeck').value;
    if (!input || !input.value.trim()) { showToast('请输入卡片内容', 'warn'); return; }
    var imported = 0;
    input.value.trim().split('\n').forEach(function(line) {
      var parts = line.split('|');
      if (parts.length >= 2) { var f = parts[0].trim(); var b = parts.slice(1).join('|').trim(); if (f && b) { addCard(f, b, deck, 'bulk'); imported++; } }
    });
    input.value = ''; renderDecks(); updateStats(); updatePreview();
    showToast('成功导入 ' + imported + ' 张卡片', 'success');
  });
  var singleAddBtn = document.getElementById('singleAddBtn');
  if (singleAddBtn) singleAddBtn.addEventListener('click', function() {
    var front = document.getElementById('singleFront'); var back = document.getElementById('singleBack');
    var deck = document.getElementById('singleDeck').value;
    if (!front || !front.value.trim()) { showToast('请输入问题(正面)', 'warn'); return; }
    if (!back || !back.value.trim()) { showToast('请输入答案(背面)', 'warn'); return; }
    addCard(front.value.trim(), back.value.trim(), deck, 'single');
    front.value = ''; back.value = ''; renderDecks(); updateStats(); updatePreview();
    showToast('卡片已添加', 'success');
  });

  /* ==================== IELTS 专属事件 ==================== */
  var ieltsSearch = document.getElementById('ieltsSearch');
  if (ieltsSearch) ieltsSearch.addEventListener('input', function() { renderIELTS(); });
  var ieltsTag = document.getElementById('ieltsTag');
  if (ieltsTag) ieltsTag.addEventListener('change', function() { renderIELTS(); });
  var ieltsFilter = document.getElementById('ieltsFilter');
  if (ieltsFilter) ieltsFilter.addEventListener('change', function() { renderIELTS(); });
  var ieltsImportAll = document.getElementById('ieltsImportAll');
  if (ieltsImportAll) ieltsImportAll.addEventListener('click', function() { importIELTS(null, null); });
  var ieltsImport20 = document.getElementById('ieltsImport20');
  if (ieltsImport20) ieltsImport20.addEventListener('click', function() {
    var data = IELTS_VOCAB || []; var avail = data.filter(function(v) { return !addedCardIds.has(cardId(v.word, v.meaning)); });
    shuffle(avail);
    importIELTS(avail.slice(0, 20), null);
  });
  var ieltsDaily = document.getElementById('ieltsDaily');
  if (ieltsDaily) ieltsDaily.addEventListener('click', function() {
    var data = IELTS_VOCAB || []; var avail = data.filter(function(v) { return !addedCardIds.has(cardId(v.word, v.meaning)); });
    shuffle(avail);
    importIELTS(avail.slice(0, 20), null);
  });

  /* ==================== Grade 事件 ==================== */
  document.getElementById('gradePick').addEventListener('change', function() { gradeManager.populateUnits(); gradeManager.render(); });
  document.getElementById('unitPick').addEventListener('change', function() { gradeManager.updateBtnText(); gradeManager.render(); });
  document.getElementById('gradeSearch').addEventListener('input', function() { gradeManager.render(); });
  document.getElementById('gradeImportAll').addEventListener('click', function() { gradeManager.importAll(); });
  document.getElementById('gradeImportCustom').addEventListener('click', function() { gradeManager.importSelected(); });

  /* ==================== Middle 事件 ==================== */
  document.getElementById('middlePick').addEventListener('change', function() { middleManager.populateUnits(); middleManager.render(); });
  document.getElementById('middleUnitPick').addEventListener('change', function() { middleManager.updateBtnText(); middleManager.render(); });
  document.getElementById('middleSearch').addEventListener('input', function() { middleManager.render(); });
  document.getElementById('middleImportAll').addEventListener('click', function() { middleManager.importAll(); });
  document.getElementById('middleImportCustom').addEventListener('click', function() { middleManager.importSelected(); });

  /* ==================== OldMiddle 事件 ==================== */
  document.getElementById('oldMiddlePick').addEventListener('change', function() { oldMiddleManager.populateUnits(); oldMiddleManager.render(); });
  document.getElementById('oldMiddleUnitPick').addEventListener('change', function() { oldMiddleManager.updateBtnText(); oldMiddleManager.render(); });
  document.getElementById('oldMiddleSearch').addEventListener('input', function() { oldMiddleManager.render(); });
  document.getElementById('oldMiddleImportAll').addEventListener('click', function() { oldMiddleManager.importAll(); });
  document.getElementById('oldMiddleImportCustom').addEventListener('click', function() { oldMiddleManager.importSelected(); });

  /* ==================== 事件委托: decksList ==================== */
  var decksList = document.getElementById('decksList');
  if (decksList) {
    decksList.addEventListener('click', function(e) {
      var item = e.target.closest('.deck-item');
      if (!item) return;
      decksList.querySelectorAll('.deck-item').forEach(function(x) { x.classList.remove('active'); });
      item.classList.add('active');
      startStudySession(item.getAttribute('data-deck'));
    });
  }

  /* ==================== 事件委托: ieltsList ==================== */
  var ieltsListEl = document.getElementById('ieltsList');
  if (ieltsListEl) {
    ieltsListEl.addEventListener('click', function(e) {
      var btn = e.target.closest('.ielts-add-btn');
      if (!btn || btn.classList.contains('added')) return;
      var word = btn.getAttribute('data-word');
      var meaning = btn.getAttribute('data-meaning');
      var deckName = '雅思核心';
      addCard(word, meaning, deckName, 'ielts');
      renderIELTS(); renderDecks(); updateStats();
      showToast('已加入卡组"' + deckName + '"', 'success');
    });
  }

  /* ==================== 事件委托: gradeList ==================== */
  var gradeListEl = document.getElementById('gradeList');
  if (gradeListEl) {
    gradeListEl.addEventListener('click', function(e) {
      var btn = e.target.closest('.grade-add-btn');
      if (!btn || btn.classList.contains('added')) return;
      var word = btn.getAttribute('data-word');
      var meaning = btn.getAttribute('data-meaning');
      var deckName = '小学英语';
      addCard(word, meaning, deckName, 'grade');
      gradeManager.render(); renderDecks(); updateStats();
      showToast('已加入"' + deckName + '"', 'success');
    });
  }

  /* ==================== 事件委托: middleGrid ==================== */
  var middleGridEl = document.getElementById('middleGrid');
  if (middleGridEl) {
    middleGridEl.addEventListener('click', function(e) {
      var btn = e.target.closest('.middle-add-btn');
      if (!btn || btn.classList.contains('added')) return;
      var word = btn.getAttribute('data-word');
      var meaning = btn.getAttribute('data-meaning');
      var deckName = '初中英语(新版)';
      addCard(word, meaning, deckName, 'middle');
      middleManager.render(); renderDecks(); updateStats();
      showToast('已加入"' + deckName + '"', 'success');
    });
  }

  /* ==================== 事件委托: oldMiddleGrid ==================== */
  var oldMiddleGridEl = document.getElementById('oldMiddleGrid');
  if (oldMiddleGridEl) {
    oldMiddleGridEl.addEventListener('click', function(e) {
      var btn = e.target.closest('.oldmiddle-add-btn');
      if (!btn || btn.classList.contains('added')) return;
      var word = btn.getAttribute('data-word');
      var meaning = btn.getAttribute('data-meaning');
      var deckName = '初中英语(旧版)';
      addCard(word, meaning, deckName, 'oldmiddle');
      oldMiddleManager.render(); renderDecks(); updateStats();
      showToast('已加入"' + deckName + '"', 'success');
    });
  }

  /* ==================== 收起/展开单词列表 ==================== */
  document.querySelectorAll('.toggle-vocab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var targetId = btn.getAttribute('data-target');
      var target = document.getElementById(targetId);
      if (!target) return;
      var isCollapsed = target.classList.contains('collapsed');
      if (isCollapsed) {
        target.classList.remove('collapsed');
        btn.textContent = '▼收起单词列表';
      } else {
        target.classList.add('collapsed');
        btn.textContent = '▼展开单词列表';
      }
    });
  });

  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); flipCard(); }
    if (e.key === '1') rateCard(false); if (e.key === '2') rateCard(false); if (e.key === '3') rateCard(true);
  });
  window.addEventListener('resize', function() { if (chartInstance) chartInstance.resize(); });
}

/* ==================== 初始化==================== */
function init() {
  var lastDate = localStorage.getItem('recalleum-last-date');
  var today = new Date().toDateString();
  if (lastDate !== today) {
    goalCompletion = 0; saveGoalCompletion();
    localStorage.setItem('recalleum-last-date', today);
  }
  loadCards();
  if (!decks || decks.length === 0) { decks = [...DEFAULT_DECKS]; saveDecks(); }
  populateDeckSelects();
  gradeManager.populateUnits();
  middleManager.populateUnits();
  oldMiddleManager.populateUnits();
  refreshAll();
  var decksWithUnmastered = [];
  cards.forEach(function(c) { if (!c.mastered && decksWithUnmastered.indexOf(c.deck) === -1) decksWithUnmastered.push(c.deck); });
  if (decksWithUnmastered.length > 0) {
    document.querySelectorAll('.deck-item').forEach(function(item) {
      if (item.getAttribute('data-deck') === decksWithUnmastered[0]) { item.classList.add('active'); startStudySession(decksWithUnmastered[0]); }
    });
  } else {
    var items = document.querySelectorAll('.deck-item');
    if (items.length > 0) { items[0].classList.add('active'); startStudySession(items[0].getAttribute('data-deck')); }
  }
  bindEvents(); initChart();
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

})();


