/* Pinpoint - Exam Countdown Assistant
 * v3 - 清除全部虚拟数据,首次进入为空白状态,
 *      全部由用户输入驱动(localStorage 持久化)
 */
(function () {
  'use strict';

  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  function showToast(text, type) {
    SBUtils.showToast(text, type);
  }

  /* ---------- State ---------- */
  var KEY = 'pinpoint_v3';
  var state = loadState();
  if (!state.exams) state.exams = [];
  if (!state.topics) state.topics = [];
  if (!state.wrongs) state.wrongs = [];
  if (!state.plans) state.plans = [];
  if (!state.mocks) state.mocks = [];   // {id, exam, score, date}
  saveState();

  function loadState() { return SBUtils.storageGet(KEY, {}); }
  function saveState() { SBUtils.storageSet(KEY, state); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function nid() { return 'w' + Math.random().toString(36).slice(2, 8); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }

  var activeExam = state.exams.find(function (e) { return e.id === state.activeExamId; }) || state.exams[0];

  /* ---------- 0. Hero (顶部大倒计时) ---------- */
  var urgencyBar = document.getElementById('urgencyBar');
  var countdownEl = document.getElementById('countdown');
  var heroSub = document.getElementById('heroSub');
  var heroAddBtn = document.getElementById('heroAddBtn');
  var heroMasteryBtn = document.getElementById('heroMasteryBtn');

  function renderUrgencyBar() {
    if (!activeExam) { urgencyBar.innerHTML = ''; return; }
    var diffDays = Math.max(0, Math.ceil((activeExam.date - Date.now()) / 86400000));
    var total = 30;
    var segs = '';
    for (var i = 0; i < total; i++) {
      var cls = '';
      if (i >= total - diffDays) cls = 'filled';
      if (i === total - diffDays) cls = 'current';
      segs += '<div class="seg ' + cls + '"></div>';
    }
    urgencyBar.innerHTML = segs;
  }
  function renderHero() {
    if (!activeExam) {
      heroSub.textContent = '添加你的第一场考试,开始一段踏实的冲刺。';
      document.getElementById('d-days').textContent = '--';
      document.getElementById('d-hours').textContent = '--';
      document.getElementById('d-mins').textContent = '--';
      document.getElementById('d-secs').textContent = '--';
      countdownEl.classList.remove('urgency-urgent', 'urgency-warn');
      urgencyBar.innerHTML = '';
      heroAddBtn.textContent = '+ 添加第一场考试';
      heroMasteryBtn.style.display = 'none';
      return;
    }
    var dt = new Date(activeExam.date);
    var weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    var timeLabel = pad(dt.getHours()) + ':' + pad(dt.getMinutes());
    var period = dt.getHours() < 12 ? '上午' : (dt.getHours() < 18 ? '下午' : '晚上');
    heroSub.innerHTML = '<b>' + esc(activeExam.name) + '</b> · ' +
      (dt.getMonth() + 1) + ' 月 ' + dt.getDate() + ' 日(周' + weekDays[dt.getDay()] + ') · ' +
      period + ' ' + timeLabel + ' · ' + esc(activeExam.location);
    heroAddBtn.textContent = '＋ 添加一场考试';
    heroMasteryBtn.style.display = '';
  }
  function updateCountdown() {
    if (!activeExam) { return; }
    var now = Date.now();
    var diff = Math.max(0, activeExam.date - now);
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);
    document.getElementById('d-days').textContent = pad(days);
    document.getElementById('d-hours').textContent = pad(hours);
    document.getElementById('d-mins').textContent = pad(mins);
    document.getElementById('d-secs').textContent = pad(secs);
    countdownEl.classList.remove('urgency-urgent', 'urgency-warn');
    if (days <= 3) countdownEl.classList.add('urgency-urgent');
    else if (days <= 7) countdownEl.classList.add('urgency-warn');
  }

  renderHero();
  renderUrgencyBar();
  updateCountdown();
  setInterval(function () { updateCountdown(); renderUrgencyBar(); }, 1000);

  /* ---------- 1. Exam list ---------- */
  function renderExams() {
    var grid = document.getElementById('examGrid');
    grid.innerHTML = '';
    if (!state.exams.length) {
      grid.innerHTML =
        '<div class="empty-state">' +
          '<div class="icon">📅</div>' +
          '<h4>暂无考试，点击添加考试</h4>' +
          '<p>点下方按钮,把第一场考试加进来,我们就帮你开始倒计时。</p>' +
          '<button class="btn btn-primary" id="emptyAddExamBtn">+ 添加考试</button>' +
        '</div>';
      document.getElementById('emptyAddExamBtn').addEventListener('click', addExamPrompt);
      return;
    }
    state.exams.forEach(function (e) {
      var diff = Math.max(0, e.date - Date.now());
      var days = Math.floor(diff / 86400000);
      var card = document.createElement('div');
      card.className = 'exam-card' + (e.id === state.activeExamId ? ' active' : '');
      var dt = new Date(e.date);
      var dateLabel = (dt.getMonth() + 1) + '月' + dt.getDate() + '日';
      card.innerHTML =
        '<h4>' + esc(e.name) + '</h4>' +
        '<div class="meta">' + dateLabel + ' · ' + esc(e.location) + '</div>' +
        '<div class="countdown-mini">' + days + ' <span class="small">天后</span></div>' +
        '<div class="progress-bar"><div class="fill" style="width:' + e.ready + '%;"></div></div>' +
        '<div class="ready-stat">掌握度 ' + e.ready + '% · 建议 ' + Math.max(1, Math.round((100 - e.ready) / 12)) + ' 小时/天</div>' +
        '<div style="display:flex; gap:6px; margin-top:10px;">' +
          '<button class="btn btn-ghost" data-bump-ready="' + e.id + '" style="padding:6px 10px; font-size:11px;">＋ 掌握度</button>' +
          '<button class="btn btn-ghost" data-del-exam="' + e.id + '" style="padding:6px 10px; font-size:11px;">删除</button>' +
        '</div>';
      card.addEventListener('click', function (ev) {
        if (ev.target.tagName === 'BUTTON') return;
        state.activeExamId = e.id;
        activeExam = e;
        saveState();
        renderExams();
        renderHero();
        updateCountdown();
        renderUrgencyBar();
      });
      grid.appendChild(card);
    });
    var addCard = document.createElement('div');
    addCard.className = 'exam-card exam-add';
    addCard.textContent = '+ 添加一场考试';
    addCard.addEventListener('click', addExamPrompt);
    grid.appendChild(addCard);

    grid.querySelectorAll('[data-bump-ready]').forEach(function (b) {
      b.addEventListener('click', function () {
        var ex = state.exams.find(function (x) { return x.id === b.dataset.bumpReady; });
        if (!ex) return;
        ex.ready = Math.min(100, (ex.ready || 0) + 5);
        saveState(); renderExams();
        showToast('✓ 掌握度 +5%');
      });
    });
    grid.querySelectorAll('[data-del-exam]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var id = b.dataset.delExam;
        var ex = state.exams.find(function (x) { return x.id === id; });
        if (!ex) return;
        var ok = await RBModal.confirmAsync({
          title: '确定要删除「' + ex.name + '」这场考试吗?',
          desc: '考试日期、知识点、模考成绩等所有关联数据都会一并删除,且无法恢复。',
          confirmText: '删除',
          danger: true
        });
        if (!ok) return;
        state.exams = state.exams.filter(function (x) { return x.id !== id; });
        if (state.activeExamId === id) state.activeExamId = state.exams[0] ? state.exams[0].id : null;
        activeExam = state.exams.find(function (e) { return e.id === state.activeExamId; }) || state.exams[0];
        saveState(); renderExams(); renderHero(); updateCountdown(); renderUrgencyBar();
        showToast('✓ 考试已删除');
      });
    });
  }

  async function addExamPrompt() {
    var defaultDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    var r = await RBModal.input({
      title: '添加一场考试',
      desc: '考试日期最早可以是今天,留空则视为取消。',
      fields: [
        { key: 'name', label: '考试名称', type: 'text', placeholder: '如:期末数学' },
        { key: 'date', label: '考试日期', type: 'date', value: defaultDate, placeholder: defaultDate },
        { key: 'loc',  label: '考试地点', type: 'text', value: '待定', placeholder: '待定' }
      ]
    });
    if (!r || !r.name) return;
    var d = new Date(r.date + 'T09:00:00');
    if (isNaN(d.getTime())) { showToast('✗ 日期格式不正确'); return; }
    var newExam = { id: 'e' + Date.now(), name: r.name, date: d.getTime(), location: r.loc || '待定', ready: 30 };
    state.exams.push(newExam);
    state.activeExamId = newExam.id;
    activeExam = newExam;
    saveState();
    renderExams(); renderHero(); updateCountdown(); renderUrgencyBar();
    showToast('✓ 考试已添加');
  }

  renderExams();

  /* ---------- 2. Mastery matrix ---------- */
  function colorForLevel(lv) {
    if (lv <= 1) return accent;
    if (lv === 2) return '#d97706';
    if (lv === 3) return accent2;
    return accent3;
  }
  function renderMastery() {
    var grid = document.getElementById('masteryGrid');
    var meta = document.getElementById('matrixMeta');
    grid.innerHTML = '';
    if (!state.topics.length) {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1; padding:40px 20px;">' +
          '<div class="icon">🧠</div>' +
          '<h4>还没有添加知识点</h4>' +
          '<p>把要考的章节 / 知识点加进来,用 1-5 颗星自评掌握度。</p>' +
        '</div>';
      meta.textContent = '还没有添加任何知识点';
      return;
    }
    meta.textContent = '共 ' + state.topics.length + ' 个知识点 · 最近更新 ' + new Date().toLocaleDateString();
    state.topics.forEach(function (t) {
      var pct = t.level * 20;
      var row = document.createElement('div');
      row.className = 'matrix-row';
      var lvClass = 'l' + Math.min(4, t.level);
      var lvLabel = ['', '薄弱', '一般', '还行', '掌握', '精通'][t.level] || '';
      row.innerHTML =
        '<div><div class="topic-name">' + esc(t.name) +
          '<span class="level-pill ' + lvClass + '">' + lvLabel + '</span>' +
        '</div><div class="topic-sub">权重 ★' + t.weight + '</div></div>' +
        '<div><div class="bar"><div class="fill" style="width:' + pct + '%; background:' + colorForLevel(t.level) + ';"></div></div></div>' +
        '<div><div class="pct" style="color:' + colorForLevel(t.level) + ';">' + pct + '%</div></div>' +
        '<div style="grid-column:1/-1; display:flex; gap:6px; margin-top:6px;">' +
          '<button class="btn btn-ghost" data-lvup="' + t.id + '" style="padding:4px 10px; font-size:11px;">↑ 提升一级</button>' +
          '<button class="btn btn-ghost" data-lvdn="' + t.id + '" style="padding:4px 10px; font-size:11px;">↓ 降低一级</button>' +
          '<button class="btn btn-ghost" data-del-topic="' + t.id + '" style="padding:4px 10px; font-size:11px;">删除</button>' +
        '</div>';
      grid.appendChild(row);
    });
    grid.querySelectorAll('[data-lvup]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = state.topics.find(function (x) { return x.id === b.dataset.lvup; });
        if (t) { t.level = Math.min(5, (t.level || 1) + 1); saveState(); renderMastery(); }
      });
    });
    grid.querySelectorAll('[data-lvdn]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = state.topics.find(function (x) { return x.id === b.dataset.lvdn; });
        if (t) { t.level = Math.max(1, (t.level || 1) - 1); saveState(); renderMastery(); }
      });
    });
    grid.querySelectorAll('[data-del-topic]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.topics = state.topics.filter(function (x) { return x.id !== b.dataset.delTopic; });
        saveState(); renderMastery();
      });
    });
  }
  renderMastery();
  document.getElementById('addTopicBtn').addEventListener('click', async function () {
    var r = await RBModal.input({
      title: '添加新知识点',
      desc: '掌握度 1=完全不会,5=完全掌握;权重 1=可放后,5=必须先看。',
      fields: [
        { key: 'name', label: '知识点名称', type: 'text', placeholder: '如:定积分换元法' },
        { key: 'lv',   label: '掌握度 (1-5)',  type: 'select', value: '3', options: [{ value: '1', label: '1 · 完全不会' }, { value: '2', label: '2 · 模糊' }, { value: '3', label: '3 · 一般' }, { value: '4', label: '4 · 熟练' }, { value: '5', label: '5 · 完全掌握' }] },
        { key: 'wt',   label: '权重 (1-5)',  type: 'select', value: '3', options: [{ value: '1', label: '1 · 可放后' }, { value: '2', label: '2 · 一般' }, { value: '3', label: '3 · 中等' }, { value: '4', label: '4 · 重要' }, { value: '5', label: '5 · 核心' }] }
      ]
    });
    if (!r || !r.name) return;
    var lv = parseInt(r.lv || '3', 10);
    var wt = parseInt(r.wt || '3', 10);
    state.topics.push({ id: 't' + Date.now(), name: r.name, level: Math.min(5, Math.max(1, lv)), weight: Math.min(5, Math.max(1, wt)) });
    saveState(); renderMastery();
    showToast('✓ 知识点已添加');
  });

  /* ---------- 3. Daily plan ---------- */
  function renderPlans() {
    var grid = document.getElementById('planGrid');
    grid.innerHTML = '';
    if (!state.plans.length) {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1;">' +
          '<div class="icon">🗓️</div>' +
          '<h4>还没有生成冲刺计划</h4>' +
          '<p>先在"掌握度"里添加几个知识点,再点下面的按钮生成每日计划。</p>' +
          '<button class="btn btn-primary" id="emptyGenBtn">⚡ 生成冲刺计划</button>' +
        '</div>';
      var btn = document.getElementById('emptyGenBtn');
      if (btn) btn.addEventListener('click', generatePlans);
      return;
    }
    var weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    state.plans.forEach(function (p, idx) {
      var dt = new Date(p.date);
      var doneCount = p.tasks.filter(function (t) { return t.done; }).length;
      var card = document.createElement('div');
      card.className = 'day-card' + (p.isToday ? ' today' : '');
      card.innerHTML =
        '<span class="day-num">Day ' + (idx + 1) + ' · ' + doneCount + '/' + p.tasks.length + ' 完成</span>' +
        '<h4>' + (p.isToday ? '今天' : weekDays[dt.getDay()]) + '</h4>' +
        '<div class="date">' + (dt.getMonth() + 1) + '月' + dt.getDate() + '日</div>' +
        '<div class="day-tasks" data-plan="' + idx + '"></div>' +
        '<div style="margin-top:10px; display:flex; gap:6px;">' +
          '<button class="btn btn-ghost" data-add-plan-task="' + idx + '" style="padding:6px 12px; font-size:11px;">+ 添加任务</button>' +
          '<button class="btn btn-ghost" data-del-plan="' + idx + '" style="padding:6px 12px; font-size:11px;">删除这一天</button>' +
        '</div>';
      grid.appendChild(card);
      var tasksEl = card.querySelector('.day-tasks');
      p.tasks.forEach(function (t, ti) {
        var row = document.createElement('div');
        row.className = 'day-task';
        row.innerHTML =
          '<span class="check' + (t.done ? ' done' : '') + '" data-pi="' + idx + '" data-ti="' + ti + '"></span>' +
          '<span class="time">' + esc(t.time) + '</span>' +
          '<span style="flex:1;' + (t.done ? ' text-decoration:line-through; opacity:0.6;' : '') + '">' + esc(t.title) + '</span>';
        tasksEl.appendChild(row);
      });
    });
    grid.querySelectorAll('.check').forEach(function (c) {
      c.addEventListener('click', function () {
        var pi = +c.dataset.pi; var ti = +c.dataset.ti;
        state.plans[pi].tasks[ti].done = !state.plans[pi].tasks[ti].done;
        saveState(); renderPlans();
      });
    });
    grid.querySelectorAll('[data-del-plan]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var idx = +b.dataset.delPlan;
        var ok = await RBModal.confirmAsync({
          title: '删除 Day ' + (idx + 1) + ' 这一天?',
          desc: '这一天的所有复习任务都会被移除,无法恢复。',
          confirmText: '删除',
          danger: true
        });
        if (!ok) return;
        state.plans.splice(idx, 1);
        saveState(); renderPlans();
      });
    });
    grid.querySelectorAll('[data-add-plan-task]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var idx = +b.dataset.addPlanTask;
        var r = await RBModal.input({
          title: 'Day ' + (idx + 1) + ' · 添加任务',
          fields: [
            { key: 'title', label: '任务名称', type: 'text', placeholder: '如:刷导数真题' },
            { key: 'time',  label: '时段',       type: 'text', value: '20:00-20:50', placeholder: '20:00-20:50' }
          ]
        });
        if (!r || !r.title) return;
        state.plans[idx].tasks.push({ title: r.title, time: r.time || '', done: false });
        saveState(); renderPlans();
        showToast('✓ 已加入任务');
      });
    });
  }

  function generatePlans() {
    if (!state.topics.length) {
      showToast('✗ 请先添加知识点');
      return;
    }
    if (!activeExam) {
      showToast('✗ 请先添加一场考试');
      return;
    }
    var weak = state.topics.slice().sort(function (a, b) { return a.level - b.level || b.weight - a.weight; }).slice(0, 3);
    var labels = weak.map(function (t) { return t.name; });
    var today = new Date();
    state.plans = [];
    for (var i = 0; i < 6; i++) {
      var d = new Date(today); d.setDate(today.getDate() + i);
      var isToday = i === 0;
      var focus = labels[i % labels.length] || '综合复习';
      state.plans.push({
        date: d.toISOString().slice(0, 10),
        isToday: isToday,
        tasks: isToday ? [
          { title: '回顾: ' + focus + ' 基础概念', time: '19:00-19:50', done: false },
          { title: focus + ' · 5 道专项练习', time: '20:00-20:50', done: false },
          { title: '错题 + 公式背诵', time: '21:00-21:30', done: false }
        ] : [
          { title: '专攻: ' + focus, time: '14:00-15:30', done: false },
          { title: focus + ' · 配套 8 道题', time: '16:00-17:00', done: false },
          { title: '错题整理 + 复盘', time: '20:00-20:30', done: false }
        ]
      });
    }
    saveState(); renderPlans();
    showToast('✓ 计划已基于薄弱环节生成');
  }

  renderPlans();
  document.getElementById('genPlanBtn').addEventListener('click', generatePlans);

  /* ---------- 4. Mock history chart ---------- */
  var mockChart = null;
  var mockBig = document.getElementById('mockBig');
  var mockBigSub = document.getElementById('mockBigSub');
  var mockDesc = document.getElementById('mockDesc');
  var mockTitle = document.getElementById('mockTitle');

  function initChart() {
    mockChart = echarts.init(document.getElementById('chart-mock'), null, { renderer: 'svg' });
  }

  function renderMock() {
    if (!mockChart) {
      if (!window.echarts) {
        var s = document.createElement('script');
        s.src = '_shared/js/echarts.min.js';
        s.onload = function() { initChart(); renderMock(); };
        document.head.appendChild(s);
        return;
      }
      initChart();
    }
    if (!state.mocks.length) {
      mockTitle.textContent = activeExam ? activeExam.name + ' · 我的模考记录' : '我的模考记录';
      mockDesc.textContent = '还没记录过模考,点击下方"录入模考分数"即可生成走势曲线。';
      mockBig.style.display = 'none';
      mockChart.clear();
      mockChart.setOption({
        animation: false,
        graphic: [{
          type: 'group',
          left: 'center', top: 'middle',
          children: [
            { type: 'text', left: 'center', top: 30, style: { text: '📝', fontSize: 40, fill: 'rgba(255,255,255,0.5)' } },
            { type: 'text', left: 'center', top: 80, style: { text: '暂无模考记录', fontSize: 14, fill: 'rgba(255,255,255,0.7)' } },
            { type: 'text', left: 'center', top: 100, style: { text: '完成模考后录入分数,系统会自动绘制走势', fontSize: 11, fill: 'rgba(255,255,255,0.4)' } }
          ]
        }]
      });
      return;
    }
    var sorted = state.mocks.slice().sort(function (a, b) { return a.date - b.date; });
    var latest = sorted[sorted.length - 1];
    var first = sorted[0];
    var delta = latest.score - first.score;
    var deltaTxt = (delta >= 0 ? '↑ +' : '↓ ') + delta + ' (vs 首次)';
    mockTitle.textContent = (latest.exam || '模考') + ' · 共 ' + sorted.length + ' 次';
    mockDesc.textContent = '首次 ' + first.score + ' → 最近 ' + latest.score + ' · ' + (delta >= 0 ? '稳步提升' : '需要加把劲');
    mockBig.style.display = '';
    mockBig.innerHTML = latest.score + '<small>' + deltaTxt + '</small>';

    var cats = sorted.map(function (m) { return m.date.slice(5).replace('-', '/'); });
    var vals = sorted.map(function (m) { return m.score; });
    mockChart.clear();
    mockChart.setOption({
      animation: true,
      grid: { top: 20, right: 12, bottom: 30, left: 40 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1a1a1a', borderWidth: 0, textStyle: { color: '#fff', fontSize: 12 },
        appendToBody: true,
        formatter: function (p) { return p[0].name + '<br/>得分 ' + p[0].value; }
      },
      xAxis: {
        type: 'category',
        data: cats,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }, axisTick: { show: false },
        axisLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'JetMono' }
      },
      yAxis: {
        type: 'value', min: Math.max(0, Math.min.apply(null, vals) - 10), max: Math.min(100, Math.max.apply(null, vals) + 10),
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 }
      },
      series: [{
        name: '模考得分', type: 'line', smooth: true,
        data: vals,
        symbol: 'circle', symbolSize: 8,
        lineStyle: { color: accent, width: 3 },
        itemStyle: { color: accent, borderColor: '#1a1a1a', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: accent + '66' }, { offset: 1, color: accent + '00' }]
          }
        },
        label: { show: true, position: 'top', color: '#fff', fontSize: 11, fontFamily: 'JetMono' }
      }]
    });
  }
  // renderMock 首次不调用，等录入模考时再按需加载 echarts
  // renderMock();
  window.addEventListener('resize', function () { if (mockChart) mockChart.resize(); });

  document.getElementById('logMockBtn').addEventListener('click', async function () {
    var examName = activeExam ? activeExam.name : (state.exams[0] ? state.exams[0].name : '');
    var r = await RBModal.input({
      title: '记录一次模考成绩',
      fields: [
        { key: 'exam',  label: '考试名称', type: 'text', value: examName, placeholder: examName || '模考' },
        { key: 'score', label: '得分 (0-100)', type: 'number', value: '80', placeholder: '80' }
      ]
    });
    if (!r || !r.score) return;
    var exam = r.exam || examName || '模考';
    var score = parseInt(r.score, 10);
    if (isNaN(score) || score < 0 || score > 100) { showToast('✗ 分数需要在 0-100 之间'); return; }
    state.mocks.push({
      id: nid(),
      exam: exam,
      score: score,
      date: new Date().toISOString().slice(0, 10)
    });
    saveState(); renderMock();
    showToast('✓ 模考分数已记录');
  });
  document.getElementById('startMockBtn').addEventListener('click', function () {
    showToast('开始模考 · 答完后回到这里点击"录入模考分数"');
  });

  /* ---------- 5. Wrong book ---------- */
  function renderWrongs() {
    var list = document.getElementById('wrongList');
    list.innerHTML = '';
    var unresolved = state.wrongs.filter(function (w) { return !w.resolved; });
    document.getElementById('wrongbookCount').textContent = unresolved.length + ' 题未解决';
    if (!state.wrongs.length) {
      list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px 0;">错题本是空的,做完模考后把错题加进来。</div>';
      return;
    }
    state.wrongs.forEach(function (w) {
      var row = document.createElement('div');
      row.className = 'wrong-item';
      if (w.resolved) row.style.opacity = '0.5';
      row.innerHTML =
        '<div class="wi-ic">!</div>' +
        '<div class="wi-body">' +
          '<div class="q">' + esc(w.q) + '</div>' +
          '<div class="a">' + esc(w.a) + '</div>' +
          '<div class="meta">' + esc(w.exam) + ' · 加入于 ' + w.added + '</div>' +
        '</div>' +
        '<div class="actions">' +
          (w.resolved
            ? '<span style="font-size:11px;color:var(--accent3);">✓ 已掌握</span>'
            : '<button class="resolve" data-resolve="' + w.id + '">已掌握</button>') +
          '<button data-del-w="' + w.id + '">删除</button>' +
        '</div>';
      list.appendChild(row);
    });
    list.querySelectorAll('[data-resolve]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.resolve;
        var w = state.wrongs.find(function (x) { return x.id === id; });
        if (w) { w.resolved = true; saveState(); renderWrongs(); showToast('✓ 标记为已掌握'); }
      });
    });
    list.querySelectorAll('[data-del-w]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.delW;
        state.wrongs = state.wrongs.filter(function (x) { return x.id !== id; });
        saveState(); renderWrongs();
      });
    });
  }
  renderWrongs();
  document.getElementById('addWrongBtn').addEventListener('click', async function () {
    var r = await RBModal.input({
      title: '加入一道错题',
      desc: '把题目和正确答案/解析记下来,以后反复看。',
      fields: [
        { key: 'q', label: '题目', type: 'textarea', placeholder: '如:求 $\\int_0^1 x^2 dx$ 的值' },
        { key: 'a', label: '正确答案 / 解析', type: 'textarea', placeholder: '可选,留空也行' }
      ]
    });
    if (!r || !r.q) return;
    state.wrongs.unshift({ id: nid(), q: r.q, a: r.a || '', exam: activeExam ? activeExam.name : '未指定', added: new Date().toISOString().slice(5, 10), resolved: false });
    saveState(); renderWrongs();
    showToast('✓ 错题已加入');
  });

  /* ---------- 今日重点 ---------- */
  function renderTodayFocus() {
    var box = document.getElementById('todayFocus');
    if (!box) return;
    box.innerHTML = '';
    if (!activeExam) {
      box.innerHTML = '<div class="focus-card"><div class="ic">🎯</div><div><h4>添加第一场考试,开始你的冲刺</h4><p>系统会根据你的知识点掌握度,每天推荐 1-3 个最需要巩固的章节。</p></div></div>';
      return;
    }
    var days = Math.max(0, Math.ceil((activeExam.date - Date.now()) / 86400000));
    if (days > 60) {
      box.innerHTML = '<div class="focus-card"><div class="ic">⏰</div><div><h4>距离「' + esc(activeExam.name) + '」还有 ' + days + ' 天</h4><p>现在就开始添加知识点,先广撒网,临考 30 天再重点突击。</p></div></div>';
      return;
    }
    if (!state.topics.length) {
      box.innerHTML = '<div class="focus-card"><div class="ic">🧠</div><div><h4>距离「' + esc(activeExam.name) + '」还有 ' + days + ' 天</h4><p>在"掌握度"区域添加几个知识点,我会每天告诉你最该复习什么。</p></div></div>';
      return;
    }
    var weak = state.topics.slice().sort(function (a, b) { return a.level - b.level || b.weight - a.weight; })[0];
    box.innerHTML = '<div class="focus-card">' +
      '<div class="ic">📍</div>' +
      '<div style="flex:1;">' +
        '<h4><span class="tag">今日重点</span>最该先攻:「' + esc(weak.name) + '」</h4>' +
        '<p>掌握度仅 ' + (weak.level * 20) + '%,权重 ★' + weak.weight + '。在掌握度里直接给 TA 一段专注时间,或者点"+ 加入今日计划"自动排到今天的 6 个任务里。</p>' +
      '</div>' +
      '<button class="addbtn" id="addWeakToPlan">+ 加入今日计划</button>' +
    '</div>';
    document.getElementById('addWeakToPlan').addEventListener('click', function () {
      if (!state.plans.length) { generatePlans(); }
      else {
        var today = state.plans.find(function (p) { return p.isToday; });
        if (today) today.tasks.unshift({ title: '主攻: ' + weak.name, time: '19:00-19:50', done: false });
        saveState();
      }
      renderPlans();
      showToast('✓ 已加入今日计划');
    });
  }
  renderTodayFocus();

  /* 全局错误兜底 */
  var errToast = document.getElementById('errToast');
  function showError(msg) {
    if (!errToast) return;
    errToast.textContent = '⚠ ' + msg;
    errToast.classList.add('show');
    setTimeout(function () { errToast.classList.remove('show'); }, 4500);
  }
  window.addEventListener('error', function (e) {
    console.error('Pinpoint:', e.error || e.message);
    showError('遇到了一点问题,请刷新页面重试');
  });
  window.addEventListener('unhandledrejection', function (e) {
    console.error('Pinpoint promise:', e.reason);
    showError('后台操作失败');
  });
})();
