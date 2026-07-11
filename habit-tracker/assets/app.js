/**
 * 习惯打卡工具 - 核心逻辑
 * Habit Tracker App Logic
 * 兼容 ES5，不使用箭头函数/let/const
 */

(function() {
  'use strict';

  // ============================================================
  // 全局变量
  // ============================================================
  var habits = [];
  var currentDetailHabit = null;
  var detailCurrentYear = 0;
  var detailCurrentMonth = 0;
  var confettiCanvas = null;
  var confettiCtx = null;
  var confettiParticles = [];
  var confettiTimer = null;
  var touchStartX = 0;
  var touchEndX = 0;

  // ============================================================
  // 励志语句库（20+条）
  // ============================================================
  var MOTIVATIONAL_QUOTES = [
    '自律给我自由。',
    '每天进步一点点，坚持带来大改变。',
    '习惯决定性格，性格决定命运。',
    '今天的努力，是明天的实力。',
    '不积跬步，无以至千里。',
    '坚持就是胜利，放弃就是失败。',
    '优秀是一种习惯。',
    '你的坚持，终将美好。',
    '越努力，越幸运。',
    '行动是治愈恐惧的良药。',
    '每一个不曾起舞的日子，都是对生命的辜负。',
    '成功的路上并不拥挤，因为坚持的人不多。',
    '相信自己，你比想象中更强大。',
    '最好的投资，就是投资自己。',
    '星光不问赶路人，时光不负有心人。',
    '路虽远，行则将至；事虽难，做则必成。',
    '不要等待机会，而要创造机会。',
    '种一棵树最好的时间是十年前，其次是现在。',
    '流水不争先，争的是滔滔不绝。',
    '所有的伟大，都源于一个勇敢的开始。',
    '你只管努力，剩下的交给时间。',
    '乾坤未定，你我皆是黑马。',
    '将来的你，一定会感谢现在奋斗的自己。'
  ];

  var COMPLETION_QUOTES = [
    '恭喜！你完成了一个周期的打卡，太棒了！',
    '周期完成！你的自律令人敬佩，继续加油！',
    '完美收官！这是你坚持的证明，为你骄傲！',
    '一周期满！你的努力没有白费，继续下一个征程！',
    '太厉害了！一个周期坚持下来，你就是自己的英雄！'
  ];

  // ============================================================
  // 工具函数
  // ============================================================

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  function formatDate(date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
  }

  /**
   * 获取今天的日期字符串
   */
  function getToday() {
    return formatDate(new Date());
  }

  /**
   * 获取某月的天数
   */
  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * 获取某天是星期几（0=周日，1=周一...）
   */
  function getDayOfWeek(year, month, day) {
    return new Date(year, month, day).getDay();
  }

  /**
   * 获取随机励志语句
   */
  function getRandomQuote() {
    var idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[idx];
  }

  /**
   * 获取周期完成庆祝语句
   */
  function getCompletionQuote() {
    var idx = Math.floor(Math.random() * COMPLETION_QUOTES.length);
    return COMPLETION_QUOTES[idx];
  }

  /**
   * 更新励志语句显示
   */
  function updateQuote(isCompletion) {
    var quoteEl = document.getElementById('motivational-quote');
    if (!quoteEl) return;
    var quote = isCompletion ? getCompletionQuote() : getRandomQuote();
    quoteEl.textContent = quote;
  }

  // ============================================================
  // localStorage 数据持久化
  // ============================================================

  /**
   * 从 localStorage 加载习惯数据
   */
  function loadHabits() {
    try {
      var data = localStorage.getItem('habit_tracker_data');
      if (data) {
        habits = JSON.parse(data);
      } else {
        habits = [];
      }
    } catch (e) {
      habits = [];
    }
  }

  /**
   * 保存习惯数据到 localStorage
   */
  function saveHabits() {
    try {
      localStorage.setItem('habit_tracker_data', JSON.stringify(habits));
    } catch (e) {
      // localStorage 可能已满
      console.warn('保存习惯数据失败', e);
    }
  }

  // ============================================================
  // 核心业务逻辑
  // ============================================================

  /**
   * 创建新打卡习惯
   */
  function createHabit(name, period, customDays, color) {
    var habit = {
      id: 'h' + Date.now(),
      name: name || '新习惯',
      period: period || 'week',
      customDays: customDays || 21,
      startDate: getToday(),
      color: color || '#a78bfa',
      checkins: [],
      createdAt: Date.now()
    };
    habits.push(habit);
    saveHabits();
    renderHabits();
    return habit;
  }

  /**
   * 删除打卡习惯
   */
  function deleteHabit(id) {
    var idx = -1;
    for (var i = 0; i < habits.length; i++) {
      if (habits[i].id === id) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      habits.splice(idx, 1);
      saveHabits();
      renderHabits();
    }
  }

  /**
   * 检查某天是否已打卡
   */
  function isCheckedIn(habit, date) {
    if (!habit || !habit.checkins) return false;
    for (var i = 0; i < habit.checkins.length; i++) {
      if (habit.checkins[i] === date) {
        return true;
      }
    }
    return false;
  }

  /**
   * 获取习惯的目标天数
   */
  function getTargetDays(habit) {
    if (habit.period === 'year') return 365;
    if (habit.period === 'month') return 30;
    if (habit.period === 'week') return 7;
    return habit.customDays || 21;
  }

  /**
   * 获取习惯的统计信息
   */
  function getStats(habit) {
    var checkins = habit.checkins || [];
    var totalDays = getTargetDays(habit);
    var checkedCount = checkins.length;
    var completionRate = totalDays > 0 ? Math.round((checkedCount / totalDays) * 100) : 0;

    // 计算连续打卡天数
    var streak = 0;
    var today = getToday();
    var sorted = checkins.slice().sort();

    // 从昨天开始往前数连续天数
    var checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - 1);

    // 如果今天已打卡，连续天数从今天开始算
    var startFromToday = isCheckedIn(habit, today);
    if (startFromToday) {
      streak = 1;
    }

    while (true) {
      var dStr = formatDate(checkDate);
      if (isCheckedIn(habit, dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // 最长连续记录
    var maxStreak = 0;
    var currentStreak = 0;
    var allDates = sorted.slice();
    for (var i = 0; i < allDates.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        var prev = new Date(allDates[i - 1]);
        var curr = new Date(allDates[i]);
        var diff = (curr - prev) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    }

    return {
      totalDays: totalDays,
      checkedCount: checkedCount,
      completionRate: completionRate,
      streak: streak,
      maxStreak: maxStreak
    };
  }

  /**
   * 今日打卡
   */
  function checkinToday(habitId) {
    var habit = null;
    for (var i = 0; i < habits.length; i++) {
      if (habits[i].id === habitId) {
        habit = habits[i];
        break;
      }
    }
    if (!habit) return false;

    var today = getToday();
    if (isCheckedIn(habit, today)) {
      return false; // 今天已经打卡了
    }

    habit.checkins.push(today);
    saveHabits();

    var stats = getStats(habit);
    var isCompleted = stats.checkedCount >= stats.totalDays;

    // 触发彩带效果
    triggerConfetti();

    // 更新励志语句
    updateQuote(isCompleted);

    renderHabits();
    return true;
  }

  // ============================================================
  // 彩带庆祝效果（Canvas 粒子系统）
  // ============================================================

  /**
   * 初始化彩带 Canvas
   */
  function initConfetti() {
    if (confettiCanvas) return;
    confettiCanvas = document.getElementById('confetti-canvas');
    if (!confettiCanvas) {
      confettiCanvas = document.createElement('canvas');
      confettiCanvas.id = 'confetti-canvas';
      confettiCanvas.style.position = 'fixed';
      confettiCanvas.style.top = '0';
      confettiCanvas.style.left = '0';
      confettiCanvas.style.width = '100%';
      confettiCanvas.style.height = '100%';
      confettiCanvas.style.pointerEvents = 'none';
      confettiCanvas.style.zIndex = '9999';
      document.body.appendChild(confettiCanvas);
    }
    confettiCtx = confettiCanvas.getContext('2d');
    resizeConfettiCanvas();
    window.addEventListener('resize', resizeConfettiCanvas);
  }

  /**
   * 调整 Canvas 尺寸
   */
  function resizeConfettiCanvas() {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }

  /**
   * 创建彩带粒子
   */
  function createConfettiParticles() {
    var colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#1dd1a1', '#ff9f43', '#ee5a24'];
    var count = 120;
    for (var i = 0; i < count; i++) {
      confettiParticles.push({
        x: Math.random() * confettiCanvas.width,
        y: -10 - Math.random() * 50,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: Math.random() * 3 + 2,
        speedX: (Math.random() - 0.5) * 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }
  }

  /**
   * 渲染彩带动画帧
   */
  function renderConfettiFrame() {
    if (!confettiCtx || !confettiCanvas) return;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    var active = false;
    for (var i = 0; i < confettiParticles.length; i++) {
      var p = confettiParticles[i];
      if (p.opacity <= 0) continue;
      active = true;

      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.003;

      if (p.opacity < 0) p.opacity = 0;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.globalAlpha = p.opacity;
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      confettiCtx.restore();
    }

    if (active) {
      requestAnimationFrame(renderConfettiFrame);
    } else {
      confettiParticles = [];
      if (confettiCanvas) {
        confettiCanvas.style.display = 'none';
      }
    }
  }

  /**
   * 触发彩带庆祝
   */
  function triggerConfetti() {
    initConfetti();
    if (confettiCanvas) {
      confettiCanvas.style.display = 'block';
    }
    confettiParticles = [];
    createConfettiParticles();
    renderConfettiFrame();

    // 5秒后自动停止
    if (confettiTimer) {
      clearTimeout(confettiTimer);
    }
    confettiTimer = setTimeout(function() {
      // 让粒子自然淡出
      for (var i = 0; i < confettiParticles.length; i++) {
        confettiParticles[i].opacity = Math.min(confettiParticles[i].opacity, 0.5);
      }
    }, 5000);
  }

  // ============================================================
  // 渲染主界面
  // ============================================================

  /**
   * 渲染所有习惯卡片
   */
  function renderHabits() {
    var container = document.getElementById('habits-container');
    if (!container) return;

    if (habits.length === 0) {
      container.innerHTML = '<div class="empty-state">还没有习惯，点击右上角添加第一个打卡吧！</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < habits.length; i++) {
      html += renderHabitCard(habits[i]);
    }
    container.innerHTML = html;

    // 绑定打卡按钮事件
    for (var j = 0; j < habits.length; j++) {
      bindCheckinEvent(habits[j]);
    }
  }

  /**
   * 渲染单个习惯卡片
   */
  function renderHabitCard(habit) {
    var stats = getStats(habit);
    var today = getToday();
    var isTodayChecked = isCheckedIn(habit, today);
    var periodText = habit.period === 'year' ? '年' : (habit.period === 'month' ? '月' : (habit.period === 'week' ? '周' : '自定义'));

    var progressHtml = '';
    if (habit.period === 'week') {
      progressHtml = renderWeekProgress(habit);
    }

    return '<div class="habit-card" style="border-left-color:' + habit.color + '" data-id="' + habit.id + '">' +
      '<div class="habit-header">' +
        '<h3 class="habit-name">' + escapeHtml(habit.name) + '</h3>' +
        '<span class="habit-period">' + periodText + '</span>' +
      '</div>' +
      '<div class="habit-stats">' +
        '<div class="stat-item">' +
          '<span class="stat-value">' + stats.checkedCount + '/' + stats.totalDays + '</span>' +
          '<span class="stat-label">完成</span>' +
        '</div>' +
        '<div class="stat-item">' +
          '<span class="stat-value">' + stats.streak + '</span>' +
          '<span class="stat-label">连续</span>' +
        '</div>' +
        '<div class="stat-item">' +
          '<span class="stat-value">' + stats.completionRate + '%</span>' +
          '<span class="stat-label">进度</span>' +
        '</div>' +
      '</div>' +
      '<div class="habit-progress-bar">' +
        '<div class="habit-progress-fill" style="width:' + stats.completionRate + '%;background:' + habit.color + '"></div>' +
      '</div>' +
      progressHtml +
      '<div class="habit-actions">' +
        '<button class="btn-checkin ' + (isTodayChecked ? 'checked' : '') + '" data-id="' + habit.id + '">' +
          (isTodayChecked ? '已打卡' : '今日打卡') +
        '</button>' +
        '<button class="btn-detail" data-id="' + habit.id + '">详情</button>' +
        '<button class="btn-delete" data-id="' + habit.id + '">删除</button>' +
      '</div>' +
    '</div>';
  }

  /**
   * 渲染周进度（7个小圆点）
   */
  function renderWeekProgress(habit) {
    var today = new Date();
    var weekStart = new Date(today);
    var dayOfWeek = today.getDay();
    var diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    weekStart.setDate(diff);

    var dots = '';
    for (var i = 0; i < 7; i++) {
      var d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      var dStr = formatDate(d);
      var checked = isCheckedIn(habit, dStr);
      var isToday = dStr === getToday();
      dots += '<span class="week-dot ' + (checked ? 'checked' : '') + (isToday ? ' today' : '') + '" title="' + dStr + '"></span>';
    }
    return '<div class="week-progress">' + dots + '</div>';
  }

  /**
   * 绑定打卡按钮事件
   */
  function bindCheckinEvent(habit) {
    var btn = document.querySelector('.btn-checkin[data-id="' + habit.id + '"]');
    if (btn) {
      btn.onclick = function() {
        checkinToday(habit.id);
      };
    }
    var detailBtn = document.querySelector('.btn-detail[data-id="' + habit.id + '"]');
    if (detailBtn) {
      detailBtn.onclick = function() {
        showDetail(habit.id);
      };
    }
    var deleteBtn = document.querySelector('.btn-delete[data-id="' + habit.id + '"]');
    if (deleteBtn) {
      deleteBtn.onclick = function() {
        if (confirm('确定要删除习惯"' + habit.name + '"吗？')) {
          deleteHabit(habit.id);
        }
      };
    }
  }

  /**
   * HTML 转义，防止 XSS
   */
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================
  // 详情弹窗功能
  // ============================================================

  /**
   * 打开详情弹窗
   */
  function showDetail(habitId) {
    var habit = null;
    for (var i = 0; i < habits.length; i++) {
      if (habits[i].id === habitId) {
        habit = habits[i];
        break;
      }
    }
    if (!habit) return;

    currentDetailHabit = habit;
    var now = new Date();
    detailCurrentYear = now.getFullYear();
    detailCurrentMonth = now.getMonth();

    var modal = document.getElementById('detail-modal');
    var title = document.getElementById('detail-title');
    if (title) title.textContent = habit.name;

    renderDetailContent();

    if (modal) {
      modal.style.display = 'block';
    }

    // 绑定触摸滑动事件
    bindSwipeEvents();
  }

  /**
   * 渲染详情内容
   */
  function renderDetailContent() {
    if (!currentDetailHabit) return;

    var stats = getStats(currentDetailHabit);
    var statsEl = document.getElementById('detail-stats');
    if (statsEl) {
      statsEl.innerHTML =
        '<div class="detail-stat">总天数：<strong>' + stats.totalDays + '</strong></div>' +
        '<div class="detail-stat">已打卡：<strong>' + stats.checkedCount + '</strong></div>' +
        '<div class="detail-stat">完成率：<strong>' + stats.completionRate + '%</strong></div>' +
        '<div class="detail-stat">当前连续：<strong>' + stats.streak + '</strong></div>' +
        '<div class="detail-stat">最长连续：<strong>' + stats.maxStreak + '</strong></div>';
    }

    // 渲染图表
    renderChart();

    // 渲染月视图
    renderMonthView(currentDetailHabit, detailCurrentYear, detailCurrentMonth);

    // 渲染年视图
    renderYearView(currentDetailHabit, detailCurrentYear);

    // 更新月份显示
    var monthLabel = document.getElementById('month-label');
    if (monthLabel) {
      monthLabel.textContent = detailCurrentYear + '年' + (detailCurrentMonth + 1) + '月';
    }
  }

  /**
   * 渲染打卡趋势图表（使用 echarts）
   */
  function renderChart() {
    var chartEl = document.getElementById('detail-chart');
    if (!chartEl || typeof echarts === 'undefined') return;

    var checkins = currentDetailHabit.checkins || [];
    var last30Days = [];
    var counts = [];
    var today = new Date();

    for (var i = 29; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var dStr = formatDate(d);
      last30Days.push(dStr.substring(5));
      counts.push(isCheckedIn(currentDetailHabit, dStr) ? 1 : 0);
    }

    var chart = echarts.init(chartEl);
    chart.setOption({
      grid: { top: 10, right: 10, bottom: 20, left: 30 },
      xAxis: {
        type: 'category',
        data: last30Days,
        axisLabel: { fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        max: 1,
        axisLabel: { show: false }
      },
      series: [{
        type: 'bar',
        data: counts,
        itemStyle: { color: currentDetailHabit.color },
        barWidth: '60%'
      }]
    });
  }

  /**
   * 渲染月视图日历
   */
  function renderMonthView(habit, year, month) {
    var container = document.getElementById('month-view');
    if (!container) return;

    var daysInMonth = getDaysInMonth(year, month);
    var firstDay = getDayOfWeek(year, month, 1);
    var html = '<table class="calendar-table"><thead><tr>';
    var weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    for (var i = 0; i < weekDays.length; i++) {
      html += '<th>' + weekDays[i] + '</th>';
    }
    html += '</tr></thead><tbody><tr>';

    // 空白填充
    for (var j = 0; j < firstDay; j++) {
      html += '<td></td>';
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = year + '-' + (month + 1 < 10 ? '0' + (month + 1) : (month + 1)) + '-' + (day < 10 ? '0' + day : day);
      var checked = isCheckedIn(habit, dateStr);
      var isToday = dateStr === getToday();
      var cellClass = '';
      if (checked) cellClass += ' checked';
      if (isToday) cellClass += ' today';

      html += '<td class="' + cellClass + '" style="' + (checked ? 'background:' + habit.color + ';color:#fff;' : '') + '">' + day + '</td>';

      if ((firstDay + day) % 7 === 0 && day < daysInMonth) {
        html += '</tr><tr>';
      }
    }

    // 末尾空白
    var remaining = (7 - ((firstDay + daysInMonth) % 7)) % 7;
    for (var k = 0; k < remaining; k++) {
      html += '<td></td>';
    }

    html += '</tr></tbody></table>';
    container.innerHTML = html;
  }

  /**
   * 渲染年视图
   */
  function renderYearView(habit, year) {
    var container = document.getElementById('year-view');
    if (!container) return;

    var html = '<div class="year-grid">';
    for (var month = 0; month < 12; month++) {
      var daysInMonth = getDaysInMonth(year, month);
      var monthHtml = '<div class="year-month">' +
        '<div class="year-month-title">' + (month + 1) + '月</div>' +
        '<div class="year-month-days">';

      for (var day = 1; day <= daysInMonth; day++) {
        var dateStr = year + '-' + (month + 1 < 10 ? '0' + (month + 1) : (month + 1)) + '-' + (day < 10 ? '0' + day : day);
        var checked = isCheckedIn(habit, dateStr);
        monthHtml += '<span class="year-day ' + (checked ? 'checked' : '') + '" style="' + (checked ? 'background:' + habit.color + ';' : '') + '"></span>';
      }

      monthHtml += '</div></div>';
      html += monthHtml;
    }
    html += '</div>';
    container.innerHTML = html;

    // 更新年份显示
    var yearLabel = document.getElementById('year-label');
    if (yearLabel) {
      yearLabel.textContent = year + '年';
    }
  }

  /**
   * 绑定触摸滑动事件（月份切换）
   */
  function bindSwipeEvents() {
    var monthView = document.getElementById('month-view');
    if (!monthView) return;

    monthView.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, false);

    monthView.addEventListener('touchend', function(e) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, false);
  }

  /**
   * 处理滑动手势
   */
  function handleSwipe() {
    var threshold = 50;
    var diff = touchStartX - touchEndX;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // 向左滑，下个月
        detailCurrentMonth++;
        if (detailCurrentMonth > 11) {
          detailCurrentMonth = 0;
          detailCurrentYear++;
        }
      } else {
        // 向右滑，上个月
        detailCurrentMonth--;
        if (detailCurrentMonth < 0) {
          detailCurrentMonth = 11;
          detailCurrentYear--;
        }
      }
      renderMonthView(currentDetailHabit, detailCurrentYear, detailCurrentMonth);
      var monthLabel = document.getElementById('month-label');
      if (monthLabel) {
        monthLabel.textContent = detailCurrentYear + '年' + (detailCurrentMonth + 1) + '月';
      }
    }
  }

  // ============================================================
  // 添加习惯弹窗
  // ============================================================

  /**
   * 打开添加习惯弹窗
   */
  function openAddModal() {
    var modal = document.getElementById('add-modal');
    if (modal) {
      modal.style.display = 'block';
      // 重置表单
      var nameInput = document.getElementById('habit-name');
      var periodSelect = document.getElementById('habit-period');
      var customInput = document.getElementById('habit-custom-days');
      var colorInput = document.getElementById('habit-color');
      if (nameInput) nameInput.value = '';
      if (periodSelect) periodSelect.value = 'week';
      if (customInput) customInput.value = '21';
      if (colorInput) colorInput.value = '#a78bfa';
      toggleCustomDays();
    }
  }

  /**
   * 关闭添加习惯弹窗
   */
  function closeAddModal() {
    var modal = document.getElementById('add-modal');
    if (modal) modal.style.display = 'none';
  }

  /**
   * 关闭详情弹窗
   */
  function closeDetailModal() {
    var modal = document.getElementById('detail-modal');
    if (modal) modal.style.display = 'none';
    currentDetailHabit = null;
  }

  /**
   * 切换自定义天数输入框显示
   */
  function toggleCustomDays() {
    var periodSelect = document.getElementById('habit-period');
    var customGroup = document.getElementById('custom-days-group');
    if (periodSelect && customGroup) {
      customGroup.style.display = periodSelect.value === 'custom' ? 'block' : 'none';
    }
  }

  /**
   * 提交添加习惯表单
   */
  function submitAddHabit() {
    var nameInput = document.getElementById('habit-name');
    var periodSelect = document.getElementById('habit-period');
    var customInput = document.getElementById('habit-custom-days');
    var colorInput = document.getElementById('habit-color');

    var name = nameInput ? nameInput.value.trim() : '';
    var period = periodSelect ? periodSelect.value : 'week';
    var customDays = customInput ? parseInt(customInput.value, 10) : 21;
    var color = colorInput ? colorInput.value : '#a78bfa';

    if (!name) {
      alert('请输入习惯名称');
      return;
    }

    createHabit(name, period, customDays, color);
    closeAddModal();
  }

  // ============================================================
  // 年份选择器（滚轮式）
  // ============================================================

  /**
   * 打开年份选择器
   */
  function openYearPicker() {
    var picker = document.getElementById('year-picker');
    if (!picker) return;

    var list = document.getElementById('year-list');
    if (!list) return;

    var currentYear = new Date().getFullYear();
    var html = '';
    for (var y = currentYear - 10; y <= currentYear + 10; y++) {
      html += '<div class="year-option ' + (y === detailCurrentYear ? 'selected' : '') + '" data-year="' + y + '">' + y + '年</div>';
    }
    list.innerHTML = html;

    // 滚动到选中位置
    var selected = list.querySelector('.year-option.selected');
    if (selected) {
      list.scrollTop = selected.offsetTop - list.clientHeight / 2 + selected.clientHeight / 2;
    }

    // 绑定点击事件
    var options = list.querySelectorAll('.year-option');
    for (var i = 0; i < options.length; i++) {
      options[i].onclick = function() {
        var y = parseInt(this.getAttribute('data-year'), 10);
        detailCurrentYear = y;
        renderDetailContent();
        closeYearPicker();
      };
    }

    picker.style.display = 'block';
  }

  /**
   * 关闭年份选择器
   */
  function closeYearPicker() {
    var picker = document.getElementById('year-picker');
    if (picker) picker.style.display = 'none';
  }

  // ============================================================
  // 初始化与事件绑定
  // ============================================================

  /**
   * 初始化应用
   */
  function init() {
    loadHabits();
    renderHabits();
    updateQuote(false);

    // 绑定添加按钮
    var addBtn = document.getElementById('btn-add-habit');
    if (addBtn) addBtn.onclick = openAddModal;

    // 绑定关闭弹窗按钮
    var closeAddBtn = document.getElementById('btn-close-add');
    if (closeAddBtn) closeAddBtn.onclick = closeAddModal;

    var closeDetailBtn = document.getElementById('btn-close-detail');
    if (closeDetailBtn) closeDetailBtn.onclick = closeDetailModal;

    // 绑定提交按钮
    var submitBtn = document.getElementById('btn-submit-habit');
    if (submitBtn) submitBtn.onclick = submitAddHabit;

    // 绑定周期选择变化
    var periodSelect = document.getElementById('habit-period');
    if (periodSelect) periodSelect.onchange = toggleCustomDays;

    // 绑定月份切换按钮
    var prevMonthBtn = document.getElementById('btn-prev-month');
    var nextMonthBtn = document.getElementById('btn-next-month');
    if (prevMonthBtn) {
      prevMonthBtn.onclick = function() {
        detailCurrentMonth--;
        if (detailCurrentMonth < 0) {
          detailCurrentMonth = 11;
          detailCurrentYear--;
        }
        renderMonthView(currentDetailHabit, detailCurrentYear, detailCurrentMonth);
        var monthLabel = document.getElementById('month-label');
        if (monthLabel) {
          monthLabel.textContent = detailCurrentYear + '年' + (detailCurrentMonth + 1) + '月';
        }
      };
    }
    if (nextMonthBtn) {
      nextMonthBtn.onclick = function() {
        detailCurrentMonth++;
        if (detailCurrentMonth > 11) {
          detailCurrentMonth = 0;
          detailCurrentYear++;
        }
        renderMonthView(currentDetailHabit, detailCurrentYear, detailCurrentMonth);
        var monthLabel = document.getElementById('month-label');
        if (monthLabel) {
          monthLabel.textContent = detailCurrentYear + '年' + (detailCurrentMonth + 1) + '月';
        }
      };
    }

    // 绑定年份选择器
    var yearLabel = document.getElementById('year-label');
    if (yearLabel) yearLabel.onclick = openYearPicker;

    var closeYearBtn = document.getElementById('btn-close-year-picker');
    if (closeYearBtn) closeYearBtn.onclick = closeYearPicker;

    // 点击弹窗外部关闭
    window.onclick = function(event) {
      var addModal = document.getElementById('add-modal');
      var detailModal = document.getElementById('detail-modal');
      var yearPicker = document.getElementById('year-picker');
      if (event.target === addModal) closeAddModal();
      if (event.target === detailModal) closeDetailModal();
      if (event.target === yearPicker) closeYearPicker();
    };

    // 初始化彩带 Canvas
    initConfetti();
  }

  // ============================================================
  // 暴露全局接口（供 HTML 内联事件调用）
  // ============================================================
  window.HabitTracker = {
    init: init,
    loadHabits: loadHabits,
    saveHabits: saveHabits,
    renderHabits: renderHabits,
    checkinToday: checkinToday,
    createHabit: createHabit,
    deleteHabit: deleteHabit,
    getStats: getStats,
    isCheckedIn: isCheckedIn,
    showDetail: showDetail,
    renderMonthView: renderMonthView,
    renderYearView: renderYearView,
    formatDate: formatDate,
    getToday: getToday,
    getDaysInMonth: getDaysInMonth,
    getDayOfWeek: getDayOfWeek,
    triggerConfetti: triggerConfetti,
    openAddModal: openAddModal,
    closeAddModal: closeAddModal,
    closeDetailModal: closeDetailModal,
    submitAddHabit: submitAddHabit,
    openYearPicker: openYearPicker,
    closeYearPicker: closeYearPicker,
    toggleCustomDays: toggleCustomDays
  };

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
