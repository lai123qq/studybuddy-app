/* FocusFlow v5 · 在 v4 基础上 12 项精修
 *  A 计时器上移首屏 (HTML 已重排)
 *  B 任务完成与番茄数强绑定 + UI 提示
 *  C 移动端布局 (HTML 已加 @media)
 *  D 音景音量持久化 + scene-info active/idle 动效 + 6 场景完整跑马灯
 *  E 4 番茄一循环修复 + 切模式进度环复位
 *  F AI 洞察完全数据驱动 (历史/对比/时段/连胜/单次最长等)
 *  G 快捷键在 input/textarea/contenteditable 内全部屏蔽
 *  H 空状态插画 + 快捷键提示
 *  I 同步弹窗: tab + textarea + 4 按钮 + 危险区 完整分块
 *  J 动效: 计时器数字色变 + pulse, 任务勾选 taskPop, 进度环 transition, modal scale-in
 *  + B 增强: 任务勾选 toast + 自动归档到底部 (而不是消失)
 *  + 完成番茄时给当前任务打勾(若达到 N 个)
 */
(function () {
  'use strict';

  // ES6 Polyfills for old WebView
  if (!Array.prototype.fill) { Array.prototype.fill = function(v) { for (var i=0;i<this.length;i++) this[i]=v; return this; }; }
  if (!Object.assign) { Object.assign = function(t) { for (var i=1;i<arguments.length;i++) { var s=arguments[i]; for (var k in s) if (s.hasOwnProperty(k)) t[k]=s[k]; } return t; }; }
  if (!Array.prototype.find) { Array.prototype.find = function(fn) { for (var i=0;i<this.length;i++) if (fn(this[i],i,this)) return this[i]; }; }
  if (!String.prototype.padStart) { String.prototype.padStart = function(n,c) { c=c||' '; var s=this; while (s.length<n) s=c+s; return s; }; }

  // null-safe click binder: only binds when element exists in DOM
  function bindClick(id, handler) { var el = document.getElementById(id); if (el) el.addEventListener('click', handler); }

  /* ========== Theme ========== */
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim() || '#e85a3a';
  var accent2 = style.getPropertyValue('--accent2').trim() || '#4a8f5e';
  var accent3 = style.getPropertyValue('--accent3').trim() || '#2f6f9f';
  var ink = style.getPropertyValue('--ink').trim() || '#1f1b16';
  var muted = style.getPropertyValue('--muted').trim() || '#7a6e63';

  /* ========== Util ========== */
  function $(s, root) { return (root || document).querySelector(s); }
  function $$(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function ymd(d) { var dt = new Date(d); return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); }
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function daysBetween(a, b) { return Math.floor((startOfDay(b) - startOfDay(a)) / 86400000); }
  function notify(title, body) {
    try {
      if (settings.notify && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: body, silent: true });
      }
    } catch (e) {}
  }
  function requestNotifyPermission() {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch (e) {}
  }

  /* ========== State ========== */
  var KEY = 'focusflow_v5';
  var state = loadState();
  function loadState() { return SBUtils.storageGet(KEY, {}); }
  function saveState() { SBUtils.storageSet(KEY, state); }
  // 旧版数据兼容
  if (!state.tasks) {
    try {
      var old = SBUtils.storageGet('focusflow_v4', {});
      if (old && old.tasks) state = old;
    } catch (e) {}
  }
  if (!state.tasks) state.tasks = [];
  if (!state.weekly) state.weekly = {};
  if (!state.sessionLog) state.sessionLog = [];
  if (!state.settings) state.settings = {};
  if (typeof state.sessionCount !== 'number') state.sessionCount = 0;
  if (typeof state.totalFocusMinutes !== 'number') state.totalFocusMinutes = 0;
  if (typeof state.audioVolume !== 'number') state.audioVolume = 0.4;
  if (!Array.isArray(state.userTemplates)) state.userTemplates = [];
  saveState();

  var settings = Object.assign({ focus: 25, short: 5, long: 15, sound: true, auto: false, notify: false }, state.settings);
  state.settings = settings;
  saveState();

  /* ========== Toast / Confetti / Beep ========== */
  function showToast(text) {
    SBUtils.showToast(text);
  }
  var confettiEl = document.getElementById('confetti');
  function confetti() {
    var colors = [accent, accent2, accent3, '#fcd34d', '#a78bfa'];
    for (var i = 0; i < 48; i++) {
      var p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.4) + 's';
      p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      confettiEl.appendChild(p);
      setTimeout(function (node) { return function () { node.remove(); }; }(p), 2800);
    }
  }
  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      [659, 784, 988].forEach(function (f, i) {
        var o = ctx.createOscillator(); var g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = f;
        g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        o.start(ctx.currentTime + i * 0.15);
        o.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch (e) {}
  }

  /* ============================================================
   * 1) Pomodoro Timer
   * ============================================================ */
  var MODES = { focus: settings.focus * 60, short: settings.short * 60, long: settings.long * 60 };
  var timer = null;
  var currentMode = 'focus';
  var remaining = MODES[currentMode];
  var isRunning = false;
  var timerStartAt = null;
  var timerTotalRemaining = 0;
  var sessionCount = state.sessionCount || 0;
  var totalFocusMinutes = state.totalFocusMinutes || 0;

  // 页面恢复：从 state.timerState 恢复计时状态（和任务数据同源，更可靠）
  var __restored = false;
  if (state.timerState) {
    try {
      var ts = state.timerState;
      if (ts.currentMode) currentMode = ts.currentMode;
      if (typeof ts.remaining === 'number') remaining = ts.remaining;
      if (typeof ts.sessionCount === 'number') sessionCount = ts.sessionCount;
      if (typeof ts.totalFocusMinutes === 'number') totalFocusMinutes = ts.totalFocusMinutes;
      if (ts.isRunning && ts.timerStartAt && ts.timerTotalRemaining) {
        var elapsed = Math.floor((Date.now() - ts.timerStartAt) / 1000);
        remaining = Math.max(0, ts.timerTotalRemaining - elapsed);
        if (remaining > 0) {
          isRunning = true;
          timerStartAt = Date.now();
          timerTotalRemaining = remaining;
          __restored = true;
        } else {
          remaining = 0;
          isRunning = false;
        }
      }
    } catch (e) { console.error('restore timer', e); }
  }

  var timeDisplay = document.getElementById('timeDisplay');
  var progressRing = document.getElementById('progressRing');
  var sessionNumEl = document.getElementById('sessionNum');
  var btnPlay = document.getElementById('btnPlay');
  var btnReset = document.getElementById('btnReset');
  var btnSkip = document.getElementById('btnSkip');
  var iconPlay = document.getElementById('iconPlay');
  var iconPause = document.getElementById('iconPause');
  var modePill = document.getElementById('modePill');
  var modeLabel = document.getElementById('modeLabel');
  var timerCard = document.getElementById('timerCard');
  var insightBanner = document.getElementById('insightBanner');
  var ringCircumference = 2 * Math.PI * 118;
  var RING_R = 118;

  function modeColor(m) { return m === 'focus' ? accent : (m === 'short' ? accent2 : accent3); }
  function modeLabelText(m) { return m === 'focus' ? '保持专注' : (m === 'short' ? '短休一下' : '长休一下'); }

  // 计时状态持久化：直接写入 state 对象并保存
  function persistTimerState() {
    state.timerState = {
      currentMode: currentMode, remaining: remaining,
      isRunning: isRunning, timerStartAt: timerStartAt,
      timerTotalRemaining: timerTotalRemaining,
      sessionCount: sessionCount, totalFocusMinutes: totalFocusMinutes
    };
    saveState();
  }

  function renderTime() {
    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    timeDisplay.textContent = pad(m) + ':' + pad(s);
    var total = MODES[currentMode] || 1;
    var progress = Math.max(0, Math.min(1, 1 - remaining / total));
    progressRing.setAttribute('stroke-dasharray', ringCircumference);
    progressRing.setAttribute('stroke-dashoffset', ringCircumference * (1 - progress));
    progressRing.setAttribute('stroke', modeColor(currentMode));
    sessionNumEl.textContent = (sessionCount % 4) + 1;
  }

  function tick() {
    if (timerStartAt) {
      var elapsed = Math.floor((Date.now() - timerStartAt) / 1000);
      remaining = Math.max(0, timerTotalRemaining - elapsed);
    }
    if (remaining > 0) {
      renderTime();
      // 每秒都保存状态，确保退出不丢失
      if (isRunning) persistTimerState();
      if (isRunning) {
        var m = Math.floor(remaining / 60), s = remaining % 60;
        document.title = pad(m) + ':' + pad(s) + ' · ' + (currentMode === 'focus' ? '专注中' : '休息中');
      }
    } else {
      finishPomodoro();
    }
  }

  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    timerStartAt = Date.now();
    timerTotalRemaining = remaining;
    iconPlay.style.display = 'none';
    iconPause.style.display = 'block';
    timerCard.classList.add('running');
    timerCard.classList.add('pulse');
    setTimeout(function () { timerCard.classList.remove('pulse'); }, 200);
    timer = setInterval(tick, 1000);
    persistTimerState();
  }
  function pauseTimer() {
    isRunning = false;
    iconPlay.style.display = 'block';
    iconPause.style.display = 'none';
    timerCard.classList.remove('running');
    clearInterval(timer);
    timerStartAt = null;
    document.title = 'FocusFlow · 智能番茄钟';
    persistTimerState();
  }
  function resetTimer() {
    pauseTimer();
    remaining = MODES[currentMode];
    renderTime();
  }
  function skipMode() { finishPomodoro(); }

  /* E: 完成番茄时统一处理 4 一循环 + 自动归位 + 同步状态 */
  function finishPomodoro() {
    pauseTimer();
    var completedMode = currentMode;
    var mins = Math.floor((MODES[completedMode] || 0) / 60);
    if (settings.sound) beep();

    // 记录
    var taskName = (document.getElementById('currentTask').value || '').trim();
    var subjectGuess = state.tasks.length ? (state.tasks[0].subject || '其他') : '其他';
    if (state.tasks.length) {
      var matched = state.tasks.find(function (t) { return t.name === taskName && !t.done; });
      if (matched) subjectGuess = matched.subject;
    }
    state.sessionLog.push({
      date: todayKey(),
      mode: completedMode,
      mins: mins,
      subject: subjectGuess,
      task: taskName,
      ts: Date.now()
    });

    if (completedMode === 'focus') {
      sessionCount++;
      totalFocusMinutes += mins;
      state.sessionCount = sessionCount;
      state.totalFocusMinutes = totalFocusMinutes;
      state.weekly[todayKey()] = (state.weekly[todayKey()] || 0) + mins;
      var justDoneTask = attachPomoToTask();  // B: 返回刚被自动勾掉的任务
      confetti();
      showToast('🍅 已完成第 ' + sessionCount + ' 个番茄!' + (justDoneTask ? '「' + justDoneTask + '」已完成' : ''));
      notify('FocusFlow', '🎉 已完成一个番茄,休息一下吧!');
      if (sessionCount % 4 === 0) {
        currentMode = 'long';
        modeLabel.textContent = '长休一下';
        showToast('🎉 完成 4 个番茄,享受 15 分钟长休吧!');
        notify('FocusFlow', '完成 4 个番茄,建议长休 15 分钟');
      } else {
        currentMode = 'short';
        modeLabel.textContent = '短休一下';
      }
    } else {
      currentMode = 'focus';
      modeLabel.textContent = '保持专注';
    }
    remaining = MODES[currentMode];
    updateModePill();
    renderTime();
    saveState();
    updateInsight();
    renderTasks();
    renderChart();
    if (settings.auto) setTimeout(startTimer, 1500);
  }

  function updateModePill() {
    $$('button', modePill).forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === currentMode);
    });
  }
  $$('button', modePill).forEach(function (btn) {
    btn.addEventListener('click', function () {
      pauseTimer();
      currentMode = btn.dataset.mode;
      remaining = MODES[currentMode];
      modeLabel.textContent = modeLabelText(currentMode);
      // E: 切模式时进度环平滑重置 (CSS transition 0.95s)
      updateModePill();
      renderTime();
    });
  });
  btnPlay.addEventListener('click', function () { if (isRunning) pauseTimer(); else startTimer(); });
  btnReset.addEventListener('click', resetTimer);
  btnSkip.addEventListener('click', skipMode);

  /* ============================================================
   * 2) Settings popover
   * ============================================================ */
  var settingsBtn = document.getElementById('settingsBtn');
  var popover = document.getElementById('settingsPopover');
  settingsBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    popover.classList.toggle('open');
  });
  document.addEventListener('click', function (e) {
    if (!popover.contains(e.target) && e.target !== settingsBtn && !settingsBtn.contains(e.target)) {
      popover.classList.remove('open');
    }
  });
  document.getElementById('setFocus').value = settings.focus;
  document.getElementById('setShort').value = settings.short;
  document.getElementById('setLong').value = settings.long;
  var tSound = document.getElementById('setSound');
  var tAuto = document.getElementById('setAuto');
  var tNotify = document.getElementById('setNotify');
  if (settings.sound) tSound.classList.add('on'); else tSound.classList.remove('on');
  if (settings.auto) tAuto.classList.add('on'); else tAuto.classList.remove('on');
  if (settings.notify) tNotify.classList.add('on'); else tNotify.classList.remove('on');
  tSound.addEventListener('click', function () { tSound.classList.toggle('on'); });
  tAuto.addEventListener('click', function () { tAuto.classList.toggle('on'); });
  tNotify.addEventListener('click', function () {
    tNotify.classList.toggle('on');
    if (tNotify.classList.contains('on')) requestNotifyPermission();
  });
  bindClick('applySettings', function () {
    var f = Math.max(5, +document.getElementById('setFocus').value || 25);
    var s = Math.max(1, +document.getElementById('setShort').value || 5);
    var l = Math.max(5, +document.getElementById('setLong').value || 15);
    settings.focus = f; settings.short = s; settings.long = l;
    settings.sound = tSound.classList.contains('on');
    settings.auto = tAuto.classList.contains('on');
    settings.notify = tNotify.classList.contains('on');
    if (settings.notify) requestNotifyPermission();
    state.settings = settings;
    MODES.focus = f * 60; MODES.short = s * 60; MODES.long = l * 60;
    saveState();
    pauseTimer();
    currentMode = 'focus';
    modeLabel.textContent = modeLabelText(currentMode);
    updateModePill();
    remaining = MODES[currentMode];
    renderTime();
    popover.classList.remove('open');
    showToast('✓ 设置已应用');
  });

  /* ============================================================
   * 3) Insight banner · v5 F: 完全数据驱动
   * ============================================================ */
  function getTodayLog() {
    return state.sessionLog.filter(function (s) { return s.mode === 'focus' && s.date === todayKey(); });
  }
  function getStreak() {
    // 连续学习天数 (今天或昨天有记录算)
    var streak = 0;
    var d = new Date();
    for (var i = 0; i < 60; i++) {
      var k = ymd(d);
      if (state.weekly[k] && state.weekly[k] > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        if (i === 0) { d.setDate(d.getDate() - 1); continue; }  // 容忍今天还没学
        break;
      }
    }
    return streak;
  }
  function bestDay() {
    var best = { k: null, v: 0 };
    Object.keys(state.weekly || {}).forEach(function (k) {
      if (state.weekly[k] > best.v) { best.v = state.weekly[k]; best.k = k; }
    });
    return best;
  }
  function focusByHour() {
    var arr = new Array(24).fill(0);
    state.sessionLog.forEach(function (s) {
      if (s.mode !== 'focus') return;
      var d = new Date(s.ts || s.date + 'T12:00:00');
      arr[d.getHours()] += s.mins || 0;
    });
    return arr;
  }
  function peakHour() {
    var arr = focusByHour();
    var mx = 0, hi = -1;
    for (var i = 0; i < 24; i++) if (arr[i] > mx) { mx = arr[i]; hi = i; }
    return hi;
  }
  function updateInsight() {
    var now = new Date();
    var h = now.getHours();
    var todayMin = (state.weekly && state.weekly[todayKey()]) || 0;
    var todayPomos = getTodayLog().length;
    var streak = getStreak();
    var peak = peakHour();
    var best = bestDay();

    var msg = '';
    // 按优先级从高到低判断，只显示最重要的消息
    if (state.tasks.length && state.tasks.every(function (t) { return t.done; })) {
      msg = '🌟 今日任务全部完成!再做一个番茄巩固一下,或者给自己放个假。';
    } else if (streak >= 3 && todayPomos > 0) {
      msg = '🔥 已连续 ' + streak + ' 天学习,保持节奏!';
    } else if (sessionCount > 0 && sessionCount % 4 === 0) {
      msg = '🎊 已完成 4 个番茄,给自己 15 分钟真正离开屏幕!';
    } else if (todayMin >= 100) {
      msg = '🔥 今日已超 100 分钟,保持之余注意眼睛和颈椎。';
    } else if (todayPomos === 0) {
      msg = '⏰ 今天还没开始,先做 1 个 25 分钟,后面就容易进入状态。';
    } else if (peak >= 0 && todayPomos === 0 && (h >= peak - 1 && h <= peak + 1) && state.sessionLog.length > 5) {
      msg = '⏰ 这是你的黄金专注时段(历史峰值 ' + peak + ':00),抓住它!';
    } else if (best.k && best.v > 0 && todayMin < best.v && h >= 20) {
      msg = '🏆 你历史最佳是 ' + best.k + ' 的 ' + best.v + ' 分钟,今天再加把劲。';
    } else {
      // 时段基础兜底
      if (h < 6) msg = '🌌 凌晨时段,该休息啦。';
      else if (h < 9) msg = '🌅 早晨黄金期,建议先做高难度任务。';
      else if (h < 12) msg = '☕ 上午效率高峰,继续保持!';
      else if (h < 14) msg = '🍱 午后容易困,低难度任务更合适。';
      else if (h < 18) msg = '🧠 下午开始恢复,可以做需要思考的作业。';
      else if (h < 22) msg = '🌙 夜间记忆巩固期,适合做闪卡与复习。';
      else msg = '🌌 夜深了,该休息啦,别让学习透支健康。';
    }

    insightBanner.querySelector('.body').textContent = msg;
  }

  /* ============================================================
   * 4) Tasks · v5 B: 完成 N 番茄自动勾掉 + J: 勾选动效
   * ============================================================ */
  function attachPomoToTask() {
    var name = document.getElementById('currentTask').value.trim();
    if (!name) return null;
    var justDone = null;
    var exist = state.tasks.find(function (t) { return t.name === name && !t.done; });
    if (exist) {
      exist.completedPomos = (exist.completedPomos || 0) + 1;
      if (exist.completedPomos >= exist.pomos) {
        exist.done = true;
        exist.completedAt = Date.now();
        justDone = exist.name;
      }
    } else {
      var nextId = (state.tasks.reduce(function (m, t) { return Math.max(m, t.id); }, 0)) + 1;
      state.tasks.unshift({ id: nextId, name: name, subject: '其他', pomos: 2, completedPomos: 1, done: false });
    }
    saveState();
    return justDone;
  }

  var taskList = document.getElementById('taskList');
  var taskMeta = document.getElementById('taskMeta');
  function updateTaskMeta() {
    var total = state.tasks.length;
    var done = state.tasks.filter(function (t) { return t.done; }).length;
    if (taskMeta) taskMeta.textContent = total + ' 项 · ' + done + ' 已完成';
  }
  function renderTasks() {
    taskList.innerHTML = '';
    updateTaskMeta();
    if (!state.tasks.length) {
      // v5 H: 空状态插画
      var empty = document.createElement('div');
      empty.className = 'task-empty';
      empty.innerHTML =
        '<div class="illust">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M9 11l3 3L22 4"></path>' +
            '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>' +
          '</svg>' +
        '</div>' +
        '<div class="title">还没有任务</div>' +
        '<div class="hint">在上方输入,或按 <kbd>A</kbd> 聚焦添加<br>也能选右边的预设模板一键开工</div>';
      taskList.appendChild(empty);
      return;
    }
    // 已完成排到下面
    var sorted = state.tasks.slice().sort(function (a, b) {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      return (b.id || 0) - (a.id || 0);
    });
    sorted.forEach(function (t) {
      var pct = t.pomos ? Math.min(100, Math.round(((t.completedPomos || 0) / t.pomos) * 100)) : 0;
      var el = document.createElement('div');
      el.className = 'task-item' + (t.done ? ' done' : '');
      el.dataset.id = t.id;
      el.innerHTML =
        '<div class="task-check ' + (t.done ? 'checked' : '') + '" data-id="' + t.id + '">' +
        (t.done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '') +
        '</div>' +
        '<div class="task-body">' +
          '<div class="task-title">' + esc(t.name) + '</div>' +
          '<div class="task-meta">' +
            '<span class="pill">' + esc(t.subject) + '</span>' +
            '<span>· 进度 ' + (t.completedPomos || 0) + ' / ' + t.pomos + ' 番茄</span>' +
          '</div>' +
          '<div class="task-progress"><div style="width:' + pct + '%;"></div></div>' +
        '</div>' +
        '<div class="task-pomos">🍅 ×' + t.pomos + '</div>' +
        '<button class="task-del" data-del="' + t.id + '" title="删除">×</button>';
      taskList.appendChild(el);
    });
    $$('.task-check', taskList).forEach(function (c) {
      c.addEventListener('click', function () {
        var id = +c.dataset.id;
        var wasDone = state.tasks.find(function (t) { return t.id === id; }).done;
        state.tasks = state.tasks.map(function (t) { return t.id === id ? Object.assign({}, t, { done: !t.done, completedAt: !t.done ? Date.now() : null }) : t; });
        saveState();
        // v5 J: 勾选动画
        if (!wasDone) {
          var el = c.closest('.task-item');
          if (el) {
            el.classList.add('just-done');
            setTimeout(function () { el.classList.remove('just-done'); }, 500);
          }
        }
        renderTasks();
        updateInsight();
      });
    });
    $$('.task-del', taskList).forEach(function (b) {
      b.addEventListener('click', function () {
        state.tasks = state.tasks.filter(function (t) { return t.id !== +b.dataset.del; });
        saveState();
        renderTasks();
        updateInsight();
      });
    });
  }
  renderTasks();
  bindClick('addTaskBtn', function () {
    var name = document.getElementById('taskName').value.trim();
    if (!name) { document.getElementById('taskName').focus(); return; }
    var subject = document.getElementById('taskSubject').value;
    var pomos = Math.max(1, +document.getElementById('taskPomos').value || 1);
    var nextId = (state.tasks.reduce(function (m, t) { return Math.max(m, t.id); }, 0)) + 1;
    state.tasks.unshift({ id: nextId, name: name, subject: subject, pomos: pomos, completedPomos: 0, done: false });
    saveState();
    document.getElementById('taskName').value = '';
    renderTasks();
    showToast('✓ 任务已添加');
  });

  /* ============================================================
   * 5) Task Templates
   * ============================================================ */
  var TEMPLATES = {
    cet4: [
      { name: '真题听力 1 篇', subject: '英语', pomos: 2 },
      { name: '阅读 4 篇 + 校对', subject: '英语', pomos: 3 },
      { name: '写作模板背诵', subject: '英语', pomos: 1 },
      { name: '高频词汇 100 词', subject: '英语', pomos: 2 },
      { name: '翻译专项练习', subject: '英语', pomos: 2 },
      { name: '错题回顾', subject: '英语', pomos: 2 }
    ],
    final: [
      { name: '梳理本学期知识点', subject: '专业课', pomos: 2 },
      { name: '薄弱章节强化', subject: '专业课', pomos: 2 },
      { name: '历年真题一套', subject: '专业课', pomos: 2 },
      { name: '错题本回顾', subject: '专业课', pomos: 1 },
      { name: '公式 / 概念背诵', subject: '专业课', pomos: 2 },
      { name: '考前模拟一次', subject: '专业课', pomos: 1 }
    ],
    code: [
      { name: 'LeetCode 简单 3 题', subject: '编程', pomos: 2 },
      { name: 'LeetCode 中等 2 题', subject: '编程', pomos: 2 },
      { name: '项目功能开发', subject: '编程', pomos: 2 },
      { name: '阅读开源项目代码', subject: '编程', pomos: 1 },
      { name: '整理笔记 / 文档', subject: '编程', pomos: 1 }
    ],
    ielts: [
      { name: '雅思真题听力 1 套', subject: '英语', pomos: 2 },
      { name: '阅读 3 篇 + 精读', subject: '英语', pomos: 3 },
      { name: '小作文 / 大作文 1 篇', subject: '英语', pomos: 2 },
      { name: '口语话题 5 个', subject: '英语', pomos: 1 },
      { name: '全真模拟一次', subject: '英语', pomos: 2 }
    ],
    math: [
      { name: '例题精讲 5 道', subject: '高数', pomos: 2 },
      { name: '课后习题 10 道', subject: '高数', pomos: 2 },
      { name: '错题订正', subject: '高数', pomos: 1 },
      { name: '公式推导复习', subject: '高数', pomos: 2 },
      { name: '综合测试 1 张', subject: '高数', pomos: 1 }
    ],
    writing: [
      { name: '选题 + 资料收集', subject: '其他', pomos: 1 },
      { name: '撰写提纲', subject: '其他', pomos: 1 },
      { name: '初稿第一段', subject: '其他', pomos: 2 },
      { name: '初稿主体', subject: '其他', pomos: 2 },
      { name: '二稿润色', subject: '其他', pomos: 2 },
      { name: '终稿 + 参考文献', subject: '其他', pomos: 1 }
    ]
  };
  $$('.template').forEach(function (el) {
    el.addEventListener('click', function () {
      var tplKey = el.dataset.tpl;
      var tpl = TEMPLATES[tplKey];
      if (!tpl) return;
      var tplNames = { cet4: '四级备考', final: '期末复习', code: '编程练习', ielts: '雅思备考', math: '数学刷题', writing: '论文写作' };
      var prev = document.getElementById('tplPreview');
      if (prev) prev.remove();
      prev = document.createElement('div');
      prev.className = 'tpl-preview';
      prev.id = 'tplPreview';
      prev.innerHTML =
        '<h5>📋 预览 · ' + esc(tplNames[tplKey] || tplKey) + ' · 将添加 ' + tpl.length + ' 项任务</h5>' +
        '<ul>' + tpl.map(function (t) { return '<li>' + esc(t.name) + ' <span style="color:var(--accent);">· ' + t.pomos + ' 番茄</span></li>'; }).join('') + '</ul>' +
        '<div class="actions">' +
          '<button class="btn btn-primary" id="tplConfirm">✓ 确认添加</button>' +
          '<button class="btn btn-ghost" id="tplCancel">取消</button>' +
        '</div>';
      el.parentNode.insertBefore(prev, el.nextSibling);
      document.getElementById('tplCancel').addEventListener('click', function () { prev.remove(); });
      document.getElementById('tplConfirm').addEventListener('click', function () {
        var nextId = (state.tasks.reduce(function (m, t) { return Math.max(m, t.id); }, 0)) + 1;
        tpl.forEach(function (t, i) {
          state.tasks.unshift({ id: nextId + i, name: t.name, subject: t.subject, pomos: t.pomos, completedPomos: 0, done: false });
        });
        saveState(); renderTasks();
        prev.remove();
        showToast('✓ 已添加 ' + tpl.length + ' 项任务');
        document.getElementById('tasks').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  });

  /* ============================================================
   * 5b) User-defined Templates (v5 自定义)
   * 数据结构: state.userTemplates = [{ id, name, tasks: [{name, subject, pomos}] }]
   * ============================================================ */
  var userTplGrid = document.getElementById('userTplGrid');
  var addUserTplBtn = document.getElementById('addUserTplBtn');
  var userTplModal = document.getElementById('userTplModal');
  var userTplModalTitle = document.getElementById('userTplModalTitle');
  var utplNameInput = document.getElementById('utplName');
  var utplTaskList = document.getElementById('utplTaskList');
  var utplAddRowBtn = document.getElementById('utplAddRow');
  var utplDeleteBtn = document.getElementById('utplDelete');
  var utplCancelBtn = document.getElementById('utplCancel');
  var utplSaveBtn = document.getElementById('utplSave');
  var SUBJECTS = ['英语', '数学', '高数', '专业课', '编程', '语文', '物理', '化学', '生物', '政治', '历史', '地理', '其他'];

  function newUserTplId() {
    return 'ut_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }

  function renderUserTemplates() {
    if (!userTplGrid) return;
    var list = state.userTemplates || [];
    if (list.length === 0) {
      userTplGrid.innerHTML = '<div class="user-tpl-empty">还没有自定义模板 · 点右上角「+ 新建」开始</div>';
      return;
    }
    userTplGrid.innerHTML = list.map(function (tpl) {
      var totalPomos = tpl.tasks.reduce(function (s, t) { return s + (t.pomos || 0); }, 0);
      return (
        '<div class="user-tpl" data-utpl-id="' + esc(tpl.id) + '">' +
          '<div class="ic">📋</div>' +
          '<div>' +
            '<div class="t">' + esc(tpl.name || '未命名') + '</div>' +
            '<div class="d">' + tpl.tasks.length + ' 项 · ' + totalPomos + ' 番茄</div>' +
          '</div>' +
          '<div class="actions">' +
            '<button data-act="edit">编辑</button>' +
            '<button data-act="del" class="del">删除</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    // 绑定事件
    $$('.user-tpl', userTplGrid).forEach(function (el) {
      var id = el.dataset.utplId;
      var tpl = (state.userTemplates || []).find(function (t) { return t.id === id; });
      if (!tpl) return;
      // 点击卡片主体 -> 应用
      el.addEventListener('click', function (e) {
        var actBtn = e.target.closest('button[data-act]');
        if (actBtn) {
          e.stopPropagation();
          var act = actBtn.dataset.act;
          if (act === 'edit') openUserTplEditor(tpl);
          else if (act === 'del') confirmDeleteUserTpl(tpl);
          return;
        }
        applyUserTpl(tpl);
      });
    });
  }

  function applyUserTpl(tpl) {
    if (!tpl || !tpl.tasks || tpl.tasks.length === 0) {
      showToast('该模板没有任务');
      return;
    }
    var nextId = (state.tasks.reduce(function (m, t) { return Math.max(m, t.id); }, 0)) + 1;
    tpl.tasks.forEach(function (t, i) {
      state.tasks.unshift({
        id: nextId + i,
        name: t.name || '未命名任务',
        subject: t.subject || '其他',
        pomos: Math.max(1, +t.pomos || 1),
        completedPomos: 0,
        done: false
      });
    });
    saveState();
    renderTasks();
    showToast('✓ 已添加 ' + tpl.tasks.length + ' 项任务');
    document.getElementById('tasks').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function confirmDeleteUserTpl(tpl) {
    var ok = window.confirm('删除模板「' + (tpl.name || '未命名') + '」？\n（不会影响已经添加的任务）');
    if (!ok) return;
    state.userTemplates = (state.userTemplates || []).filter(function (t) { return t.id !== tpl.id; });
    saveState();
    renderUserTemplates();
    showToast('✓ 模板已删除');
  }

  // 编辑器状态
  var editingTpl = null; // null = 新建; {id, name, tasks} = 编辑

  function openUserTplEditor(tpl) {
    editingTpl = tpl
      ? { id: tpl.id, name: tpl.name, tasks: (tpl.tasks || []).map(function (t) { return { name: t.name, subject: t.subject, pomos: t.pomos }; }) }
      : { id: null, name: '', tasks: [{ name: '', subject: '其他', pomos: 1 }] };

    userTplModalTitle.textContent = tpl ? '✏️ 编辑模板' : '➕ 新建模板';
    utplDeleteBtn.style.display = tpl ? 'inline-block' : 'none';
    utplNameInput.value = editingTpl.name;
    renderEditorRows();
    userTplModal.classList.add('open');
    setTimeout(function () { utplNameInput.focus(); }, 50);
  }

  function closeUserTplEditor() {
    userTplModal.classList.remove('open');
    editingTpl = null;
  }

  function renderEditorRows() {
    if (!editingTpl) return;
    utplTaskList.innerHTML = editingTpl.tasks.map(function (t, i) {
      var opts = SUBJECTS.map(function (s) {
        return '<option value="' + esc(s) + '"' + (s === t.subject ? ' selected' : '') + '>' + esc(s) + '</option>';
      }).join('');
      return (
        '<div class="utpl-task-row" data-row="' + i + '">' +
          '<input type="text" class="r-name" placeholder="任务名（如 复习笔记）" value="' + esc(t.name) + '" maxlength="30">' +
          '<select class="r-subj">' + opts + '</select>' +
          '<input type="number" class="r-pomos" min="1" max="20" value="' + (t.pomos || 1) + '">' +
          '<button type="button" class="row-del" title="删除该行">×</button>' +
        '</div>'
      );
    }).join('');

    $$('.utpl-task-row', utplTaskList).forEach(function (row) {
      var i = +row.dataset.row;
      row.querySelector('.r-name').addEventListener('input', function (e) { editingTpl.tasks[i].name = e.target.value; });
      row.querySelector('.r-subj').addEventListener('change', function (e) { editingTpl.tasks[i].subject = e.target.value; });
      row.querySelector('.r-pomos').addEventListener('input', function (e) {
        var v = Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1));
        editingTpl.tasks[i].pomos = v;
      });
      row.querySelector('.row-del').addEventListener('click', function () {
        if (editingTpl.tasks.length <= 1) {
          showToast('至少保留一项任务');
          return;
        }
        editingTpl.tasks.splice(i, 1);
        renderEditorRows();
      });
    });
  }

  function utplAddRow() {
    if (!editingTpl) return;
    editingTpl.tasks.push({ name: '', subject: '其他', pomos: 1 });
    renderEditorRows();
    // 聚焦新行
    var rows = utplTaskList.querySelectorAll('.utpl-task-row');
    if (rows.length) {
      var last = rows[rows.length - 1];
      var inp = last.querySelector('.r-name');
      if (inp) inp.focus();
    }
  }

  function utplSave() {
    if (!editingTpl) return;
    var name = (utplNameInput.value || '').trim();
    if (!name) { showToast('请填写模板名'); utplNameInput.focus(); return; }
    if (name.length > 20) { showToast('模板名最多 20 字'); return; }

    // 收集并校验任务
    var tasks = [];
    editingTpl.tasks.forEach(function (t) {
      var n = (t.name || '').trim();
      if (!n) return; // 空任务自动忽略
      tasks.push({ name: n, subject: t.subject || '其他', pomos: Math.max(1, +t.pomos || 1) });
    });
    if (tasks.length === 0) { showToast('至少需要 1 项有效任务'); return; }

    if (editingTpl.id) {
      // 编辑现有
      var idx = state.userTemplates.findIndex(function (t) { return t.id === editingTpl.id; });
      if (idx >= 0) {
        state.userTemplates[idx] = { id: editingTpl.id, name: name, tasks: tasks };
      } else {
        state.userTemplates.push({ id: editingTpl.id, name: name, tasks: tasks });
      }
    } else {
      state.userTemplates.push({ id: newUserTplId(), name: name, tasks: tasks });
    }
    saveState();
    renderUserTemplates();
    closeUserTplEditor();
    showToast('✓ 模板已保存');
  }

  function utplDelete() {
    if (!editingTpl || !editingTpl.id) return;
    var ok = window.confirm('确定删除这个模板？\n（已经用此模板加的任务不受影响）');
    if (!ok) return;
    state.userTemplates = (state.userTemplates || []).filter(function (t) { return t.id !== editingTpl.id; });
    saveState();
    renderUserTemplates();
    closeUserTplEditor();
    showToast('✓ 模板已删除');
  }

  // 绑定事件
  if (addUserTplBtn) addUserTplBtn.addEventListener('click', function () { openUserTplEditor(null); });
  if (utplAddRowBtn) utplAddRowBtn.addEventListener('click', utplAddRow);
  if (utplCancelBtn) utplCancelBtn.addEventListener('click', closeUserTplEditor);
  if (utplSaveBtn) utplSaveBtn.addEventListener('click', utplSave);
  if (utplDeleteBtn) utplDeleteBtn.addEventListener('click', utplDelete);
  if (userTplModal) {
    userTplModal.querySelector('.modal-close').addEventListener('click', closeUserTplEditor);
    userTplModal.addEventListener('click', function (e) {
      if (e.target === userTplModal) closeUserTplEditor();
    });
  }
  // ESC 关闭
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && userTplModal && userTplModal.classList.contains('open')) {
      closeUserTplEditor();
    }
  });

  renderUserTemplates();

  /* ============================================================
   * 6) Weekly chart
   * ============================================================ */
  function hasEcharts() {
    return typeof window.echarts !== 'undefined' && window.echarts && typeof window.echarts.init === 'function';
  }
  function setChartFallback(el, text) {
    if (!el) return;
    el.innerHTML = '<div style="height:100%;min-height:120px;display:flex;align-items:center;justify-content:center;text-align:center;color:#7a6e63;font-size:12px;background:rgba(31,27,22,0.04);border-radius:12px;padding:12px;">' + text + '</div>';
  }
  var chartEl = document.getElementById('chart-week');
  var chart = hasEcharts() && chartEl ? window.echarts.init(chartEl, null, { renderer: 'svg' }) : null;
  function buildWeekData() {
    var days = [];
    var vals = [];
    var labels = ['日', '一', '二', '三', '四', '五', '六'];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var key = ymd(d);
      days.push(labels[d.getDay()]);
      vals.push((state.weekly && state.weekly[key]) || 0);
    }
    return { days: days, vals: vals };
  }
  function renderChart() {
    var data = buildWeekData();
    var totalWeek = data.vals.reduce(function (a, b) { return a + b; }, 0);
    var today = todayKey();
    var todayMin = (state.weekly && state.weekly[today]) || 0;
    $('#dash-today').innerHTML = todayMin + '<span class="unit">分</span>';
    $('#dash-week').innerHTML = totalWeek + '<span class="unit">分</span>';
    $('#dash-total').innerHTML = (state.sessionCount || 0) + '<span class="unit">个</span>';
    if (!chart) {
      setChartFallback(chartEl, '图表库未加载，核心计时、任务和白噪音功能仍可正常使用');
      return;
    }
    chart.setOption({
      animation: false,
      grid: { top: 10, right: 10, bottom: 30, left: 40 },
      tooltip: {
        trigger: 'axis', backgroundColor: '#1f1b16', borderWidth: 0,
        textStyle: { color: '#fff', fontSize: 12 }, appendToBody: true,
        formatter: function (p) { return p[0].name + ' · ' + p[0].value + ' 分钟'; }
      },
      xAxis: {
        type: 'category', data: data.days,
        axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
        axisTick: { show: false },
        axisLabel: { color: 'rgba(31,27,22,0.5)', fontSize: 12, fontFamily: 'JetMono' }
      },
      yAxis: {
        type: 'value', axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } },
        axisLabel: { color: 'rgba(31,27,22,0.4)', fontSize: 11, fontFamily: 'JetMono' }
      },
      series: [{
        type: 'bar', data: data.vals, barWidth: 22,
        itemStyle: { color: accent, borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top', color: '#1f1b16', fontSize: 11, fontFamily: 'JetMono', formatter: function (p) { return p.value || ''; } }
      }]
    });
  }
  window.addEventListener('resize', function () { if (chart) chart.resize(); });

  /* ============================================================
   * 7) White-noise Sound Capsule · v5 D: 6 场景 + 音量持久化 + info 动效
   * ============================================================ */
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var audio = {
    ctx: null,
    masterGain: null,
    nodes: [],
    intervals: [],
    current: 'off',
    volume: state.audioVolume,
    available: !!AudioCtx
  };
  function ensureAudio() {
    if (!AudioCtx) {
      audio.available = false;
      return null;
    }
    try {
      if (!audio.ctx) {
        audio.ctx = new AudioCtx();
        audio.masterGain = audio.ctx.createGain();
        audio.masterGain.gain.value = audio.volume;
        audio.masterGain.connect(audio.ctx.destination);
      }
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      audio.available = true;
      return audio.ctx;
    } catch (e) {
      audio.available = false;
      console.warn('音景初始化失败:', e);
      return null;
    }
  }
  function stopAllScene() {
    audio.nodes.forEach(function (n) { try { n.stop && n.stop(); } catch (e) {} try { n.disconnect && n.disconnect(); } catch (e) {} });
    audio.nodes = [];
    audio.intervals.forEach(function (id) { clearInterval(id); });
    audio.intervals = [];
  }
  function makeNoiseBuffer(ctx, seconds, type) {
    var buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    var ch = buf.getChannelData(0);
    var lastOut = 0;
    for (var i = 0; i < ch.length; i++) {
      var white = Math.random() * 2 - 1;
      if (type === 'pink') { lastOut = 0.5 * (lastOut + white * 0.02); ch[i] = lastOut * 6; }
      else if (type === 'brown') { lastOut = (lastOut + (0.02 * white)) / 1.02; ch[i] = lastOut * 3.5; }
      else ch[i] = white * 0.4;
    }
    return buf;
  }
  function makeNoiseLoop(ctx, type) {
    var src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, 2, type);
    src.loop = true;
    return src;
  }
  function makeFilter(ctx, type, freq, q) {
    var f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    return f;
  }
  function setSceneInfo(text, isActive) {
    var el = document.getElementById('sceneInfo');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('active', !!isActive);
    el.classList.toggle('idle', !isActive);
    var head = document.getElementById('sceneInfoHead');
    if (head) head.textContent = isActive ? '已启用' : '未启用';
  }

  /* 场景元数据(中文名 + 副标题) */
  var SCENE_META = {
    off:     { title: '点击播放 · 开启沉浸模式', hint: '选个场景开始吧,或按 ⌘M 循环切换' },
    rain:    { title: '🌧 雨声',                hint: '持续白噪声 + 低频雷鸣,适合长时间专注' },
    cafe:    { title: '☕ 咖啡馆',              hint: '中频人声嗡嗡 + 偶尔杯碟声,像在咖啡店角落' },
    forest:  { title: '🌲 森林',                hint: '粉噪风声 + 鸟鸣,适合松弛型阅读' },
    fire:    { title: '🔥 篝火',                hint: '棕色噪声 + 偶尔木柴爆裂,适合深夜赶稿' },
    library: { title: '📚 图书馆',              hint: '极轻粉噪 + 翻书沙沙,适合深度阅读' },
    ocean:   { title: '🌊 海浪',                hint: '慢节律粉噪调制,适合放松式专注' }
  };
  function updateScenePlayer() {
    var btn = document.getElementById('scenePlayBtn');
    var ic = document.getElementById('scenePlayIcon');
    var tt = document.getElementById('sceneTitle');
    var ht = document.getElementById('sceneHint');
    if (!btn || !ic || !tt || !ht) return;
    var cur = audio.current;
    var meta = SCENE_META[cur] || SCENE_META.off;
    tt.textContent = meta.title;
    ht.textContent = meta.hint;
    if (cur && cur !== 'off') {
      btn.classList.add('playing');
      ic.textContent = '⏸';
      btn.setAttribute('aria-label', '暂停');
    } else {
      btn.classList.remove('playing');
      ic.textContent = '▶';
      btn.setAttribute('aria-label', '播放');
    }
  }
  function setActivePill(name) {
    $$('#sceneRow .scene-pill').forEach(function (b) { b.classList.toggle('on', b.dataset.scene === name); });
  }
  function playScene(name) {
    stopAllScene();
    if (name === 'off') {
      audio.current = 'off';
      setSceneInfo('未启用 · 点上方任一场景开启沉浸模式', false);
      setActivePill('off');
      updateScenePlayer();
      return;
    }
    var ctx = ensureAudio();
    if (!ctx) {
      audio.current = 'off';
      setSceneInfo('当前环境不支持音景播放,计时和任务功能不受影响', false);
      setActivePill('off');
      updateScenePlayer();
      showToast('当前环境不支持白噪音播放');
      return;
    }
    audio.current = name;
    var noise = makeNoiseLoop(ctx, 'white');
    var pink = makeNoiseLoop(ctx, 'pink');
    var brown = makeNoiseLoop(ctx, 'brown');
    var gain = ctx.createGain();
    gain.gain.value = 1;
    gain.connect(audio.masterGain);
    audio.nodes.push(noise, pink, brown, gain);
    if (name === 'rain') {
      var lp = makeFilter(ctx, 'lowpass', 1400, 0.8);
      var hp = makeFilter(ctx, 'highpass', 600, 0.5);
      noise.connect(hp); hp.connect(lp); lp.connect(gain);
      noise.start();
      var lp2 = makeFilter(ctx, 'lowpass', 200, 0.5);
      brown.connect(lp2); lp2.connect(gain); brown.start();
      setSceneInfo('🌧 雨声 · 持续白噪声 + 低频雷鸣', true);
    } else if (name === 'cafe') {
      var bp = makeFilter(ctx, 'bandpass', 800, 0.7);
      pink.connect(bp); bp.connect(gain); pink.start();
      var clinkGain = ctx.createGain(); clinkGain.gain.value = 0.04;
      clinkGain.connect(audio.masterGain);
      var id = setInterval(function () {
        if (audio.current !== 'cafe') return;
        var t = ctx.currentTime;
        var o = ctx.createOscillator(); var g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = 1800 + Math.random() * 1500;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.connect(g); g.connect(clinkGain);
        o.start(t); o.stop(t + 0.2);
      }, 4500);
      audio.intervals.push(id);
      setSceneInfo('☕ 咖啡馆 · 中频人声嗡嗡 + 偶尔杯碟声', true);
    } else if (name === 'forest') {
      pink.connect(gain); pink.start();
      var id2 = setInterval(function () {
        if (audio.current !== 'forest') return;
        var t = ctx.currentTime;
        var o = ctx.createOscillator(); var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(2200 + Math.random() * 1800, t);
        o.frequency.exponentialRampToValueAtTime(1200 + Math.random() * 800, t + 0.15);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g); g.connect(audio.masterGain);
        o.start(t); o.stop(t + 0.25);
      }, 3500);
      audio.intervals.push(id2);
      setSceneInfo('🌲 森林 · 微风 + 不定时鸟鸣', true);
    } else if (name === 'fire') {
      var lp = makeFilter(ctx, 'lowpass', 400, 0.4);
      brown.connect(lp); lp.connect(gain); brown.start();
      var id3 = setInterval(function () {
        if (audio.current !== 'fire') return;
        var t = ctx.currentTime;
        var n = ctx.createBufferSource();
        n.buffer = makeNoiseBuffer(ctx, 0.06, 'white');
        var ng = ctx.createGain();
        ng.gain.setValueAtTime(0.08, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        var nf = makeFilter(ctx, 'highpass', 1500, 1);
        n.connect(nf); nf.connect(ng); ng.connect(audio.masterGain);
        n.start(t); n.stop(t + 0.1);
      }, 1200);
      audio.intervals.push(id3);
      setSceneInfo('🔥 篝火 · 低频火焰底噪 + 偶尔噼啪声', true);
    } else if (name === 'library') {
      var pg = ctx.createGain(); pg.gain.value = 0.35;
      pg.connect(gain);
      pink.connect(pg); pink.start();
      var id4 = setInterval(function () {
        if (audio.current !== 'library') return;
        var t = ctx.currentTime;
        var o = ctx.createOscillator(); var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(200, t);
        o.frequency.exponentialRampToValueAtTime(80, t + 0.25);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.025, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g); g.connect(audio.masterGain);
        o.start(t); o.stop(t + 0.35);
      }, 9000);
      audio.intervals.push(id4);
      setSceneInfo('📚 图书馆 · 极轻底噪 + 偶尔翻书声', true);
    } else if (name === 'ocean') {
      // v5: 第 6 场景 —— 海浪
      pink.connect(gain); pink.start();
      var lfo = ctx.createOscillator();
      var lfoGain = ctx.createGain();
      lfo.frequency.value = 0.12; lfoGain.gain.value = 0.5;
      lfo.connect(lfoGain); lfoGain.connect(gain.gain);
      lfo.start();
      audio.nodes.push(lfo, lfoGain);
      setSceneInfo('🌊 海浪 · 慢节律粉噪调制', true);
    } else {
      audio.current = 'off';
      setSceneInfo('未知音景,已自动关闭', false);
      setActivePill('off');
      updateScenePlayer();
      return;
    }
    setActivePill(name);
    updateScenePlayer();
  }
  function unlockAudio() {
    ensureAudio();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
  }
  document.addEventListener('click', unlockAudio);
  document.addEventListener('keydown', unlockAudio);
  $$('#sceneRow .scene-pill').forEach(function (b) {
    b.addEventListener('click', function () { playScene(b.dataset.scene); });
  });

  /* v5+: 实体大按钮 · 播放/暂停 */
  var scenePlayBtn = document.getElementById('scenePlayBtn');
  if (scenePlayBtn) {
    scenePlayBtn.addEventListener('click', function (e) {
      e.stopPropagation();  // 不触发全局 unlock 重复
      // 当前 off → 切到默认场景(雨声);其它 → 切回 off
      if (!audio.current || audio.current === 'off') playScene('rain');
      else playScene('off');
    });
  }
  // 初始化一次按钮状态
  updateScenePlayer();
  // v5 D: 音量持久化
  var sceneVolume = document.getElementById('sceneVolume');
  var volLabel = document.getElementById('volLabel');
  sceneVolume.value = Math.round(audio.volume * 100);
  volLabel.textContent = sceneVolume.value + '%';
  sceneVolume.addEventListener('input', function () {
    audio.volume = (+sceneVolume.value) / 100;
    volLabel.textContent = sceneVolume.value + '%';
    if (audio.masterGain) audio.masterGain.gain.value = audio.volume;
    state.audioVolume = audio.volume;
    saveState();
  });

  /* ============================================================
   * 8) Auto Learning Report · v5 F: AI 洞察完全数据驱动
   * ============================================================ */
  var reportModal = document.getElementById('reportModal');
  var reportGrid = document.getElementById('reportGrid');
  var aiInsightList = document.getElementById('aiInsightList');
  var reportChartTrend = null;
  var reportChartSubject = null;
  var currentRange = 'day';

  function rangeBounds(range) {
    var now = new Date();
    var from = new Date(now); from.setHours(0, 0, 0, 0);
    if (range === 'day') return { from: from, to: new Date(from.getTime() + 86400000), label: '今日' };
    if (range === 'week') { from.setDate(from.getDate() - 6); return { from: from, to: new Date(now.getTime() + 1), label: '本周(近 7 天)' }; }
    if (range === 'month') { from.setDate(from.getDate() - 29); return { from: from, to: new Date(now.getTime() + 1), label: '本月(近 30 天)' }; }
    var earliest = null;
    Object.keys(state.weekly || {}).forEach(function (k) { if (!earliest || k < earliest) earliest = k; });
    if (!earliest) { from = new Date(now); from.setDate(from.getDate() - 1); }
    else { from = new Date(earliest + 'T00:00:00'); }
    return { from: from, to: new Date(now.getTime() + 1), label: '累计' };
  }
  function aggregate(bounds) {
    var log = state.sessionLog.filter(function (s) {
      if (s.mode !== 'focus') return false;
      var ts = new Date(s.ts || s.date + 'T12:00:00').getTime();
      return ts >= bounds.from.getTime() && ts <= bounds.to.getTime();
    });
    var focusMin = log.reduce(function (a, b) { return a + (b.mins || 0); }, 0);
    var pomos = log.length;
    var taskMap = {};
    log.forEach(function (s) { var k = s.task || '(未命名)'; taskMap[k] = (taskMap[k] || 0) + (s.mins || 0); });
    var taskArr = Object.keys(taskMap).map(function (k) { return { name: k, mins: taskMap[k] }; });
    taskArr.sort(function (a, b) { return b.mins - a.mins; });
    var subjectMap = {};
    log.forEach(function (s) { var k = s.subject || '其他'; subjectMap[k] = (subjectMap[k] || 0) + (s.mins || 0); });
    var subjectArr = Object.keys(subjectMap).map(function (k) { return { name: k, value: subjectMap[k] }; });
    return { focusMin: focusMin, pomos: pomos, topTask: taskArr[0] || null, tasks: taskArr, subjects: subjectArr };
  }
  function buildTrendData(range) {
    var days = []; var vals = []; var labels = ['日', '一', '二', '三', '四', '五', '六'];
    var n = (range === 'day') ? 24 : (range === 'week' ? 7 : (range === 'month' ? 30 : 14));
    if (range === 'day') {
      var byHour = new Array(24).fill(0);
      state.sessionLog.forEach(function (s) {
        if (s.mode !== 'focus') return;
        var d = new Date(s.ts || s.date + 'T12:00:00');
        if (d.toDateString() !== new Date().toDateString()) return;
        byHour[d.getHours()] += s.mins;
      });
      for (var h = 0; h < 24; h++) { days.push(h + ':00'); vals.push(byHour[h]); }
    } else {
      for (var i = n - 1; i >= 0; i--) {
        var d = new Date(); d.setDate(d.getDate() - i);
        var key = ymd(d);
        days.push(range === 'month' || range === 'all' ? (d.getMonth() + 1) + '/' + d.getDate() : labels[d.getDay()]);
        vals.push((state.weekly && state.weekly[key]) || 0);
      }
    }
    return { cats: days, vals: vals };
  }
  function renderReport() {
    var canRenderCharts = hasEcharts();
    if (canRenderCharts && !reportChartTrend) reportChartTrend = window.echarts.init(document.getElementById('reportChartTrend'), null, { renderer: 'svg' });
    if (canRenderCharts && !reportChartSubject) reportChartSubject = window.echarts.init(document.getElementById('reportChartSubject'), null, { renderer: 'svg' });
    var bounds = rangeBounds(currentRange);
    var agg = aggregate(bounds);

    var todayMin = (state.weekly && state.weekly[todayKey()]) || 0;
    var doneTasks = state.tasks.filter(function (t) { return t.done; }).length;
    var taskRate = state.tasks.length ? Math.round(doneTasks / state.tasks.length * 100) : 0;
    reportGrid.innerHTML =
      '<div class="report-card"><div class="label">总专注(分钟)</div><div class="num">' + agg.focusMin + '</div><div class="delta">' + agg.pomos + ' 个番茄 · ' + bounds.label + '</div></div>' +
      '<div class="report-card"><div class="label">今日分钟</div><div class="num">' + todayMin + '</div><div class="delta">' + (todayMin >= 50 ? '✓ 今日已达标' : '目标 50 分钟') + '</div></div>' +
      '<div class="report-card"><div class="label">完成任务</div><div class="num">' + doneTasks + '</div><div class="delta">总任务 ' + state.tasks.length + ' 个</div></div>' +
      '<div class="report-card"><div class="label">完成率</div><div class="num">' + taskRate + '%</div><div class="delta">' + (taskRate >= 70 ? '保持很棒' : '还有空间') + '</div></div>';

    var trend = buildTrendData(currentRange);
    if (!canRenderCharts || !reportChartTrend || !reportChartSubject) {
      setChartFallback(document.getElementById('reportChartTrend'), '图表库未加载，报告统计数据已保留');
      setChartFallback(document.getElementById('reportChartSubject'), '暂无可视化图表，不影响报告导出');
      aiInsightList.innerHTML = '<li>图表库暂不可用，但专注统计、任务记录和报告导出仍可继续使用。</li>';
      return;
    }
    reportChartTrend.clear();
    reportChartTrend.setOption({
      animation: false,
      grid: { top: 20, right: 14, bottom: 28, left: 40 },
      tooltip: { trigger: 'axis', backgroundColor: '#1f1b16', borderWidth: 0, textStyle: { color: '#fff', fontSize: 12 } },
      xAxis: { type: 'category', data: trend.cats, axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } }, axisTick: { show: false }, axisLabel: { color: '#7a6e63', fontSize: 10 } },
      yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }, axisLabel: { color: '#aaa', fontSize: 10 } },
      series: [{
        type: 'line', smooth: true, data: trend.vals, symbol: 'circle', symbolSize: 6,
        lineStyle: { color: accent, width: 3 },
        itemStyle: { color: accent, borderColor: '#fff', borderWidth: 2 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent + '40' }, { offset: 1, color: accent + '00' }] } }
      }]
    });

    if (agg.subjects.length) {
      reportChartSubject.clear();
      reportChartSubject.setOption({
        animation: false,
        tooltip: { trigger: 'item', backgroundColor: '#1f1b16', borderWidth: 0, textStyle: { color: '#fff', fontSize: 12 } },
        series: [{
          type: 'pie', radius: ['45%', '70%'], avoidLabelOverlap: true,
          label: { color: '#1f1b16', fontSize: 11, formatter: '{b}\n{d}%' },
          data: agg.subjects.map(function (s) { return { name: s.name, value: s.value }; })
        }]
      });
    } else {
      reportChartSubject.clear();
      reportChartSubject.setOption({
        animation: false,
        graphic: [{
          type: 'group', left: 'center', top: 'middle',
          children: [
            { type: 'text', left: 'center', top: 20, style: { text: '暂无学科数据', fontSize: 13, fill: '#7a6e63' } },
            { type: 'text', left: 'center', top: 40, style: { text: '完成几个番茄后自动生成', fontSize: 11, fill: '#bbb' } }
          ]
        }]
      });
    }

    // v5 F: AI 洞察完全数据驱动
    var insights = [];
    if (agg.pomos === 0) {
      insights.push('📌 还没有专注记录,先去完成一个番茄吧。');
    } else {
      // 1) 与昨日对比
      if (currentRange === 'day' || currentRange === 'week') {
        var yesterdayKey = ymd(new Date(Date.now() - 86400000));
        var ym = (state.weekly && state.weekly[yesterdayKey]) || 0;
        if (currentRange === 'day' && ym > 0) {
          var diff = todayMin - ym;
          if (diff > 0) insights.push('📈 比昨天多 ' + diff + ' 分钟,势头不错!');
          else if (diff < 0) insights.push('📉 比昨天少 ' + (-diff) + ' 分钟,加油追回来。');
          else insights.push('➖ 和昨天持平,继续稳定输出。');
        }
      }
      // 2) 平均
      if (agg.pomos > 0) insights.push('🧮 平均每个番茄 ' + Math.round(agg.focusMin / agg.pomos) + ' 分钟,节奏 ' + (agg.focusMin / agg.pomos >= 25 ? '稳定' : '偏短,试试拉长专注') + '。');
      // 3) 黄金时段
      var peak = peakHour();
      if (peak >= 0 && state.sessionLog.length > 5) insights.push('⏰ 你的黄金专注时段是 ' + peak + ':00,可以把最难任务排到这会儿。');
      // 4) 单次最长
      var longest = state.sessionLog.filter(function (s) { return s.mode === 'focus'; }).reduce(function (m, s) { return Math.max(m, s.mins || 0); }, 0);
      if (longest > 0) insights.push('🏋️ 最长一次专注 ' + longest + ' 分钟,在「' + (state.sessionLog.filter(function (s) { return s.mode === 'focus' && s.mins === longest; })[0] || {}).task + '」。');
      // 5) 学科
      if (agg.subjects.length >= 3) insights.push('📚 学科分布较均衡,记得把精力多投向权重更高的弱项。');
      if (agg.subjects.length === 1) insights.push('🎯 这段时间主要在「' + agg.subjects[0].name + '」,可以适当加入其他学科避免偏科。');
      if (agg.topTask) insights.push('⏱ 最长的一次专注花在了「' + agg.topTask.name + '」,共 ' + agg.topTask.mins + ' 分钟。');
      // 6) 番茄数
      if (agg.pomos >= 8) insights.push('🏆 你的专注节奏很饱满,已完成 ' + agg.pomos + ' 个番茄,继续保持!');
      if (agg.pomos >= 1 && agg.pomos < 4) insights.push('🌱 已经开了个好头,建议把每天的番茄数定到 4 个以上形成节奏。');
      // 7) 今日
      if (todayMin === 0 && currentRange === 'day') insights.push('⏰ 今天还没开始专注,先做 1 个 25 分钟。');
      if (todayMin >= 100) insights.push('🔥 今日已超 100 分钟,保持之余注意眼睛和颈椎。');
      // 8) 连胜
      var streak = getStreak();
      if (streak >= 3) insights.push('🔥 连续 ' + streak + ' 天学习,势头很稳!');
    }
    aiInsightList.innerHTML = insights.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('');

    $('#reportSubtitle').textContent = bounds.label + ' · 实时汇总 ' + new Date().toLocaleString('zh-CN');
  }

  function openReport(range) {
    if (range) {
      currentRange = range;
      $$('#reportTabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.range === range); });
    }
    openModal(reportModal);
    setTimeout(renderReport, 50);
  }
  $$('#reportTabs button').forEach(function (b) {
    b.addEventListener('click', function () { currentRange = b.dataset.range; $$('#reportTabs button').forEach(function (x) { x.classList.toggle('active', x === b); }); renderReport(); });
  });
  (function (el) { if (el) el.addEventListener('click', function () { openReport('day'); }); })(document.getElementById('ctaReport'));
  (function (el) { if (el) el.addEventListener('click', function () { openReport('week'); }); })(document.getElementById('navReport'));
  (function (el) { if (el) el.addEventListener('click', function () { openReport('week'); }); })(document.getElementById('dashReportBtn'));
  (function (el) { if (el) el.addEventListener('click', function () { openReport('week'); }); })(document.getElementById('feat-report'));

  bindClick('reportCopy', function () {
    var bounds = rangeBounds(currentRange);
    var agg = aggregate(bounds);
    var text = 'FocusFlow 学习报告 · ' + bounds.label + '\n' +
      '— 专注总时长: ' + agg.focusMin + ' 分钟 (' + agg.pomos + ' 个番茄)\n' +
      '— 今日专注: ' + ((state.weekly && state.weekly[todayKey()]) || 0) + ' 分钟\n' +
      '— 完成任务: ' + state.tasks.filter(function (t) { return t.done; }).length + ' / ' + state.tasks.length + '\n';
    if (agg.topTask) text += '— 最长专注: 「' + agg.topTask.name + '」 ' + agg.topTask.mins + ' 分钟\n';
    copyText(text, '✓ 报告已复制到剪贴板');
  });
  bindClick('reportDownload', function () {
    var bounds = rangeBounds(currentRange);
    var agg = aggregate(bounds);
    var md = '# FocusFlow 学习报告\n\n**时段:** ' + bounds.label + '\n\n' +
      '| 指标 | 数值 |\n| --- | --- |\n' +
      '| 总专注分钟 | ' + agg.focusMin + ' |\n' +
      '| 完成番茄 | ' + agg.pomos + ' |\n' +
      '| 今日专注 | ' + ((state.weekly && state.weekly[todayKey()]) || 0) + ' 分钟 |\n' +
      '| 完成任务 | ' + state.tasks.filter(function (t) { return t.done; }).length + ' / ' + state.tasks.length + ' |\n\n' +
      '## 学科分布\n\n';
    if (agg.subjects.length) {
      md += '| 学科 | 分钟 |\n| --- | --- |\n';
      agg.subjects.forEach(function (s) { md += '| ' + s.name + ' | ' + s.value + ' |\n'; });
    } else { md += '_暂无数据_\n'; }
    downloadText(md, 'FocusFlow-报告-' + todayKey() + '.md', 'text/markdown');
  });

  /* ============================================================
   * 9) Sync / Backup · v5 I: tab + textarea + 4 按钮 + 危险区
   * ============================================================ */
  var syncModal = document.getElementById('syncModal');
  var syncArea = document.getElementById('syncArea');
  var syncMode = 'export';
  $$('.sync-tab').forEach(function (t) {
    t.addEventListener('click', function () {
      syncMode = t.dataset.mode;
      $$('.sync-tab').forEach(function (x) { x.classList.toggle('active', x === t); });
      if (syncMode === 'export') {
        syncArea.value = ''; syncArea.readOnly = true;
        document.getElementById('syncDo').textContent = '导出';
      } else {
        syncArea.value = ''; syncArea.readOnly = false; syncArea.placeholder = '粘贴从其他设备导出的 JSON ...';
        document.getElementById('syncDo').textContent = '从剪贴板粘贴';
      }
    });
  });
  function exportJSON() {
    var payload = { _v: 5, _app: 'FocusFlow', _ts: new Date().toISOString(), state: state };
    return JSON.stringify(payload, null, 2);
  }
  bindClick('syncDo', function () {
    if (syncMode === 'export') {
      syncArea.value = exportJSON();
      showToast('✓ 已生成备份码');
    } else {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (t) { syncArea.value = t; showToast('✓ 已从剪贴板读取'); })
          .catch(function () { syncArea.focus(); showToast('请按 Ctrl/Cmd + V 粘贴'); });
      } else { syncArea.focus(); showToast('请按 Ctrl/Cmd + V 粘贴'); }
    }
  });
  bindClick('syncCopy', function () {
    if (!syncArea.value) { showToast('✗ 还没有内容可复制'); return; }
    copyText(syncArea.value, '✓ 已复制到剪贴板');
  });
  bindClick('syncFile', function () {
    if (!syncArea.value) syncArea.value = exportJSON();
    downloadText(syncArea.value, 'focusflow-backup-' + todayKey() + '.json', 'application/json');
  });
  bindClick('syncApply', async function () {
    var raw = syncArea.value.trim();
    if (!raw) { showToast('✗ 内容为空'); return; }
    try {
      var obj = JSON.parse(raw);
      if (!obj._app || obj._app !== 'FocusFlow') throw new Error('不是 FocusFlow 的备份');
      if (!obj.state) throw new Error('缺少 state 字段');
      var ok = await RBModal.confirmAsync({
        title: '用备份覆盖本地数据?',
        desc: '当前共有 ' + state.tasks.length + ' 项任务 / ' + state.sessionLog.length + ' 条番茄记录,恢复后会被这份备份完全替换。',
        confirmText: '覆盖', danger: true
      });
      if (!ok) return;
      state = Object.assign({}, obj.state);
      settings = Object.assign({ focus: 25, short: 5, long: 15, sound: true, auto: false, notify: false }, state.settings || {});
      if (!state.tasks) state.tasks = [];
      if (!state.weekly) state.weekly = {};
      if (!state.sessionLog) state.sessionLog = [];
      MODES.focus = settings.focus * 60; MODES.short = settings.short * 60; MODES.long = settings.long * 60;
      sessionCount = state.sessionCount || 0;
      totalFocusMinutes = state.totalFocusMinutes || 0;
      document.getElementById('setFocus').value = settings.focus;
      document.getElementById('setShort').value = settings.short;
      document.getElementById('setLong').value = settings.long;
      tSound.classList.toggle('on', settings.sound);
      tAuto.classList.toggle('on', settings.auto);
      tNotify.classList.toggle('on', settings.notify);
      saveState();
      currentMode = 'focus';
      modeLabel.textContent = modeLabelText(currentMode);
      updateModePill();
      remaining = MODES[currentMode];
      renderTasks(); renderChart(); renderTime(); updateInsight();
      closeModal(syncModal);
      showToast('✓ 数据已从备份恢复');
    } catch (e) {
      showToast('✗ 解析失败:' + e.message);
    }
  });
  bindClick('syncReset', async function () {
    var ok1 = await RBModal.confirmAsync({
      title: '确定要清空所有本地数据吗?',
      desc: '此操作不可撤销,建议先导出备份!', confirmText: '继续', danger: true
    });
    if (!ok1) return;
    var ok2 = await RBModal.confirmAsync({
      title: '再次确认:真的要全部清空吗?',
      desc: '这会删除全部任务 / 番茄记录 / 音景偏好,本机所有数据将无法恢复。',
      confirmText: '全部清空', danger: true
    });
    if (!ok2) return;
    SBUtils.storageRemove(KEY);
    location.reload();
  });
  bindClick('feat-sync', function () {
    syncMode = 'export';
    $$('.sync-tab').forEach(function (x) { x.classList.toggle('active', x.dataset.mode === 'export'); });
    syncArea.value = ''; syncArea.readOnly = true;
    document.getElementById('syncDo').textContent = '导出';
    openModal(syncModal);
  });
  bindClick('dashSyncBtn', function (e) {
    e.preventDefault();
    document.getElementById('feat-sync').click();
  });

  /* ============================================================
   * 10) Shortcuts modal & feature cards
   * ============================================================ */
  var shortcutsModal = document.getElementById('shortcutsModal');
  bindClick('feat-keys', function () { openModal(shortcutsModal); });
  bindClick('feat-pomo', function () {
    document.getElementById('timer').scrollIntoView({ behavior: 'smooth' });
  });
  bindClick('feat-task', function () {
    document.getElementById('tasks').scrollIntoView({ behavior: 'smooth' });
    setTimeout(function () { document.getElementById('taskName').focus(); }, 600);
  });
  bindClick('feat-sound', function () {
    document.getElementById('timer').scrollIntoView({ behavior: 'smooth' });
    setTimeout(function () {
      var order = ['rain', 'cafe', 'forest', 'fire', 'library', 'ocean'];
      var idx = order.indexOf(audio.current);
      var next = order[(idx + 1) % order.length];
      playScene(next);
    }, 500);
  });

  /* ============================================================
   * 11) Modal helpers
   * ============================================================ */
  function openModal(mask) {
    mask.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(mask) {
    mask.classList.remove('open');
    document.body.style.overflow = '';
  }
  $$('.modal-mask').forEach(function (mask) {
    mask.addEventListener('click', function (e) {
      if (e.target === mask) closeModal(mask);
    });
    $$('.modal-close', mask).forEach(function (b) { b.addEventListener('click', function () { closeModal(mask); }); });
  });

  /* ============================================================
   * 12) Global keyboard shortcuts · v5 G: 完整 input 守护
   * ============================================================ */
  var sceneOrder = ['off', 'rain', 'cafe', 'forest', 'fire', 'library', 'ocean'];
  function focusTaskInput() {
    document.getElementById('tasks').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { document.getElementById('taskName').focus(); }, 400);
  }
  function focusCurrentTask() {
    document.getElementById('timer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { document.getElementById('currentTask').focus(); }, 400);
  }
  function anyModalOpen() {
    return $$('.modal-mask.open').length > 0;
  }
  function toggleSettings() { popover.classList.toggle('open'); }
  function cycleScene() {
    var idx = sceneOrder.indexOf(audio.current);
    var next = sceneOrder[(idx + 1) % sceneOrder.length];
    playScene(next);
    showToast('🎧 音景 → ' + (next === 'off' ? '关闭' : ({
      rain: '雨声', cafe: '咖啡馆', forest: '森林', fire: '篝火', library: '图书馆', ocean: '海浪'
    })[next] || next));
  }
  function isInEditable(t) {
    if (!t) return false;
    if (t.isContentEditable) return true;
    var tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return false;
  }
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    var inField = isInEditable(t);
    // Esc 永远工作
    if (e.key === 'Escape') {
      $$('.modal-mask.open').forEach(closeModal);
      popover.classList.remove('open');
      return;
    }
    // v5 G: input/textarea/select/contenteditable 内全部不触发 (除 Space 与下面特例外)
    if (inField) {
      // 允许在 textarea 内 Cmd/Ctrl+Enter 不触发 (因为本来也没快捷键占这个)
      return;
    }
    if (anyModalOpen()) return;
    if (e.key === '?') { e.preventDefault(); openModal(shortcutsModal); return; }
    if (e.code === 'Space') { e.preventDefault(); btnPlay.click(); return; }
    var k = e.key.toLowerCase();
    if (k === 'r') { e.preventDefault(); resetTimer(); return; }
    if (k === 's') { e.preventDefault(); finishPomodoro(); return; }
    if (e.key === '1') { $$('button', modePill)[0].click(); return; }
    if (e.key === '2') { $$('button', modePill)[1].click(); return; }
    if (e.key === '3') { $$('button', modePill)[2].click(); return; }
    if (k === ',') { e.preventDefault(); toggleSettings(); return; }
    if (k === 'm') { e.preventDefault(); cycleScene(); return; }
    if (k === 'g') { e.preventDefault(); openReport('week'); return; }
    if (k === 'n') { e.preventDefault(); focusCurrentTask(); return; }
    if (k === 'a') { e.preventDefault(); focusTaskInput(); return; }
  });

  /* ============================================================
   * 13) Util: copy / download
   * ============================================================ */
  function copyText(text, toastMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast(toastMsg); }).catch(function () { fallbackCopy(text, toastMsg); });
    } else { fallbackCopy(text, toastMsg); }
  }
  function fallbackCopy(text, toastMsg) {
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast(toastMsg); } catch (e) { showToast('✗ 复制失败'); }
    ta.remove();
  }
  function downloadText(text, name, type) {
    var blob = new Blob([text], { type: type || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 200);
    showToast('✓ 已下载 ' + name);
  }

  /* ============================================================
   * 14) Init
   * ============================================================ */
  renderTime();
  // 如果恢复后正在运行，启动计时器
  if (isRunning && remaining > 0) {
    iconPlay.style.display = 'none';
    iconPause.style.display = 'block';
    timerCard.classList.add('running');
    timer = setInterval(tick, 1000);
    persistTimerState();
  }
  renderTasks();
  renderChart();
  updateInsight();
  setInterval(updateInsight, 60000);
  window.addEventListener('resize', function () {
    if (reportChartTrend) reportChartTrend.resize();
    if (reportChartSubject) reportChartSubject.resize();
  });

  /* 错误兜底 */
  function showError(msg) {
    SBUtils.showToast('⚠ ' + msg, 'error', 4500);
  }
  window.addEventListener('error', function (e) {
    console.error('FocusFlow:', e.error || e.message);
    showError('遇到了一点问题,请刷新页面重试');
  });
  window.addEventListener('unhandledrejection', function (e) {
    console.error('FocusFlow promise:', e.reason);
    showError('后台操作失败');
  });

  /* 顶栏"上次专注距今"小提示 */
  (function injectLastPomo() {
    var log = state.sessionLog || [];
    var lastFocus = null;
    for (var i = log.length - 1; i >= 0; i--) {
      if (log[i].mode === 'focus') { lastFocus = log[i]; break; }
    }
    var nav = document.querySelector('.nav .brand');
    if (!nav) return;
    var tag = document.createElement('span');
    tag.className = 'last-tag';
    if (!lastFocus) { tag.textContent = '· 还没有专注过'; }
    else {
      var ts = lastFocus.ts || Date.now();
      var diff = Date.now() - ts;
      var mins = Math.floor(diff / 60000);
      var txt = mins < 1 ? '刚刚' : (mins < 60 ? mins + ' 分钟前' : (mins < 1440 ? Math.floor(mins / 60) + ' 小时前' : Math.floor(mins / 1440) + ' 天前'));
      tag.textContent = '· 上次专注 ' + txt;
    }
    nav.appendChild(tag);
  })();

  // 页面退出时保存（兜底）
  window.addEventListener('beforeunload', persistTimerState);
  window.addEventListener('pagehide', persistTimerState);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') persistTimerState();
  });
})();
