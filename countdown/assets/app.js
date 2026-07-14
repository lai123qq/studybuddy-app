(function () {
  'use strict';

  // ==================== Storage ====================
  var STORAGE_KEY = 'studybuddy_countdown_events';

  function loadEvents() {
    return SBUtils.storageGet(STORAGE_KEY, []);
  }

  function saveEvents(events) {
    SBUtils.storageSet(STORAGE_KEY, events);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ==================== DOM refs ====================
  var addBtn = document.getElementById('addBtn');
  var eventList = document.getElementById('eventList');
  var emptyState = document.getElementById('emptyState');
  var modal = document.getElementById('modal');
  var modalTitle = document.getElementById('modalTitle');
  var eventName = document.getElementById('eventName');
  var eventDate = document.getElementById('eventDate');
  var yearPick = document.getElementById('yearPick');
  var monthPick = document.getElementById('monthPick');
  var dayPick = document.getElementById('dayPick');
  var eventCategory = document.getElementById('eventCategory');
  var cancelBtn = document.getElementById('cancelBtn');
  var deleteBtn = document.getElementById('deleteBtn');
  var saveBtn = document.getElementById('saveBtn');
  var colorBtns = document.querySelectorAll('.color-btn');
  var selectedColor = 'purple';

  // ==================== State ====================
  var events = loadEvents();
  var editingId = null;

  // ==================== Helpers ====================
  function getToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function parseDateLocal(str) {
    // str = "YYYY-MM-DD"
    var parts = str.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function formatDateLocal(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function computeDays(targetStr) {
    var target = parseDateLocal(targetStr);
    var today = getToday();
    var diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  var categoryLabels = {
    study: '学习',
    life: '生活',
    holiday: '节日',
    other: '其他'
  };

  var categoryOrder = { study: 0, life: 1, holiday: 2, other: 3 };

  var colorMap = {
    purple: '#7c6bff',
    blue: '#4a9eff',
    green: '#6bcb77',
    orange: '#ffb74d',
    pink: '#ff7eb3',
    red: '#ff6b6b'
  };

  // ==================== Render ====================
  function render() {
    // Sort: future events first (closest date first), then past events (most recent past first)
    events.sort(function (a, b) {
      var da = computeDays(a.date);
      var db = computeDays(b.date);
      if (da >= 0 && db >= 0) return da - db;
      if (da < 0 && db < 0) return db - da; // both past: more recent (larger db) first
      return db >= 0 ? 1 : -1; // future before past
    });

    eventList.innerHTML = '';

    if (events.length === 0) {
      eventList.appendChild(emptyState);
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    events.forEach(function (ev) {
      var days = computeDays(ev.date);
      var isPast = days < 0;
      var absDays = Math.abs(days);

      var card = document.createElement('div');
      card.className = 'event-card' + (isPast ? ' past' : '');
      card.setAttribute('data-id', ev.id);

      var tagClass = 'tag-' + (ev.category || 'other');
      var tagText = categoryLabels[ev.category] || '其他';
      var cardColor = ev.color ? colorMap[ev.color] : colorMap.purple;

      var daysHtml = isPast
        ? '<div class="days-wrap"><span class="days-number">' + absDays + '</span><span class="days-label">天前</span></div>'
        : '<div class="days-wrap"><span class="days-number">' + days + '</span><span class="days-label">天后</span></div>';

      card.style.borderLeft = '4px solid ' + cardColor;
      card.innerHTML =
        '<span class="category-tag ' + tagClass + '">' + tagText + '</span>' +
        '<div class="event-name">' + escapeHtml(ev.name) + '</div>' +
        daysHtml +
        '<div class="event-date">目标日期：' + ev.date + '</div>';

      card.addEventListener('click', function () {
        openEdit(ev.id);
      });

      eventList.appendChild(card);
    });
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== Modal ====================
  function openModal() {
    modal.classList.add('active');
    eventName.focus();
  }

  function closeModal() {
    modal.classList.remove('active');
    editingId = null;
    clearForm();
  }

  function clearForm() {
    eventName.value = '';
    eventDate.value = '';
    var now = new Date();
    yearPick.value = String(now.getFullYear());
    monthPick.value = String(now.getMonth() + 1).padStart(2, '0');
    updateDayOptions();
    dayPick.value = String(now.getDate()).padStart(2, '0');
    updateHiddenDate();
    eventCategory.value = 'study';
    deleteBtn.style.display = 'none';
    modalTitle.textContent = '添加倒数日';
    selectedColor = 'purple';
    colorBtns.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.color === 'purple');
    });
  }

  function openEdit(id) {
    var ev = events.find(function (e) { return e.id === id; });
    if (!ev) return;
    editingId = id;
    eventName.value = ev.name;
    eventDate.value = ev.date;
    // Parse date into year/month/day selects
    var parts = ev.date.split('-');
    if (parts.length === 3) {
      yearPick.value = parts[0];
      monthPick.value = parts[1];
      updateDayOptions();
      dayPick.value = parts[2];
    }
    eventCategory.value = ev.category || 'other';
    selectedColor = ev.color || 'purple';
    colorBtns.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.color === selectedColor);
    });
    deleteBtn.style.display = 'inline-block';
    modalTitle.textContent = '编辑倒数日';
    openModal();
  }

  // ==================== Date picker helpers ====================
  function initDatePicker() {
    var currentYear = new Date().getFullYear();
    var yearHtml = '<option value="">年</option>';
    for (var y = 2060; y >= 1900; y--) {
      yearHtml += '<option value="' + y + '">' + y + '年</option>';
    }
    yearPick.innerHTML = yearHtml;

    var monthHtml = '<option value="">月</option>';
    for (var m = 1; m <= 12; m++) {
      var ms = String(m).padStart(2, '0');
      monthHtml += '<option value="' + ms + '">' + m + '月</option>';
    }
    monthPick.innerHTML = monthHtml;
  }

  function getDaysInMonth(year, month) {
    return new Date(Number(year), Number(month), 0).getDate();
  }

  function updateDayOptions() {
    var y = yearPick.value;
    var m = monthPick.value;
    if (!y || !m) {
      dayPick.innerHTML = '<option value="">日</option>';
      return;
    }
    var days = getDaysInMonth(y, m);
    var selectedDay = dayPick.value;
    var html = '<option value="">日</option>';
    for (var d = 1; d <= days; d++) {
      var ds = String(d).padStart(2, '0');
      html += '<option value="' + ds + '">' + d + '日</option>';
    }
    dayPick.innerHTML = html;
    if (selectedDay && Number(selectedDay) <= days) {
      dayPick.value = selectedDay;
    }
  }

  function updateHiddenDate() {
    var y = yearPick.value;
    var m = monthPick.value;
    var d = dayPick.value;
    if (y && m && d) {
      eventDate.value = y + '-' + m + '-' + d;
    } else {
      eventDate.value = '';
    }
  }

  // ==================== CRUD ====================
  function handleSave() {
    var name = eventName.value.trim();
    updateHiddenDate();
    var date = eventDate.value;
    var category = eventCategory.value;

    if (!name) {
      SBUtils.showToast('请输入事件名称', 'warn');
      return;
    }
    if (!date) {
      SBUtils.showToast('请选择目标日期', 'warn');
      return;
    }

    if (editingId) {
      var idx = events.findIndex(function (e) { return e.id === editingId; });
      if (idx !== -1) {
        events[idx] = {
          id: editingId,
          name: name,
          date: date,
          category: category,
          color: selectedColor,
          updatedAt: Date.now()
        };
      }
    } else {
      events.push({
        id: generateId(),
        name: name,
        date: date,
        category: category,
        color: selectedColor,
        createdAt: Date.now()
      });
    }

    saveEvents(events);
    render();
    closeModal();
  }

  function handleDelete() {
    if (!editingId) return;
    if (!confirm('确定要删除这个倒数日吗？')) return;
    var ev = events.find(function (e) { return e.id === editingId; });
    if (ev && ev.name === '春节') {
      SBUtils.storageSet('studybuddy_countdown_spring_dismissed', '1');
    }
    events = events.filter(function (e) { return e.id !== editingId; });
    saveEvents(events);
    render();
    closeModal();
  }

  // ==================== Events ====================
  addBtn.addEventListener('click', function () {
    editingId = null;
    clearForm();
    modalTitle.textContent = '添加倒数日';
    openModal();
  });

  cancelBtn.addEventListener('click', closeModal);
  saveBtn.addEventListener('click', handleSave);
  deleteBtn.addEventListener('click', handleDelete);

  yearPick.addEventListener('change', function () {
    updateDayOptions();
    updateHiddenDate();
  });
  monthPick.addEventListener('change', function () {
    updateDayOptions();
    updateHiddenDate();
  });
  dayPick.addEventListener('change', updateHiddenDate);

  colorBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedColor = btn.dataset.color;
      colorBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // ==================== Init ====================
  initDatePicker();

  // 首次使用时自动添加春节倒数日（用户删除后不再出现）
  var PREF_KEY = 'studybuddy_countdown_spring_dismissed';
  if (events.length === 0 && !SBUtils.storageGet(PREF_KEY)) {
    var now = new Date();
    var nextYear = now.getFullYear() + 1;
    var springFestivalDate = nextYear + '-02-06';
    events.push({
      id: generateId(),
      name: '春节',
      date: springFestivalDate,
      category: 'holiday',
      color: 'red',
      createdAt: Date.now()
    });
    events.push({
      id: generateId(),
      name: '谷歌成立',
      date: '1998-09-04',
      category: 'other',
      color: 'blue',
      createdAt: Date.now()
    });
    var nowInit = new Date();
    var newYearDate = (nowInit.getFullYear() + 1) + '-01-01';
    events.push({
      id: generateId(),
      name: 'New Year',
      date: newYearDate,
      category: 'holiday',
      color: 'green',
      createdAt: Date.now()
    });
    saveEvents(events);
  }

  render();
})();
