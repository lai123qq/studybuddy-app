/**
 * ClassMate · 课程表工具 - 核心逻辑
 *
 * 功能：
 * 1. 周课程表展示（周一到周日，每天8节课）
 * 2. 添加/编辑/删除课程
 * 3. 自定义上课时间
 * 4. localStorage 持久化
 */

(function(global) {
    'use strict';

    // =====================
    // 工具函数
    // =====================

    function generateId() {
        return 'c_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    }

    // =====================
    // 状态管理
    // =====================

    var DEFAULT_SLOTS = [
        { start: '08:00', end: '08:45' },
        { start: '08:55', end: '09:40' },
        { start: '10:00', end: '10:45' },
        { start: '10:55', end: '11:40' },
        { start: '14:00', end: '14:45' },
        { start: '14:55', end: '15:40' },
        { start: '16:00', end: '16:45' },
        { start: '16:55', end: '17:40' }
    ];

    var AppState = {
        courses: [],
        timeSlots: DEFAULT_SLOTS.slice(),
        colors: [
            '#ff7a59', '#fbbf24', '#34d399', '#38bdf8',
            '#a78bfa', '#f472b6', '#94a3b8', '#eab308'
        ],
        editingId: null,
        selectedColor: 0,
        currentDay: (function() { var d = new Date().getDay(); return d === 0 ? 7 : d; })(),
        periodCount: 8,
        visibleDays: [1, 2, 3, 4, 5, 6, 7],

        init: function() {
            this.loadState();
        },

        loadState: function() {
            try {
                var saved = localStorage.getItem('classmate_courses');
                if (saved) this.courses = JSON.parse(saved);
                var savedTime = localStorage.getItem('classmate_times');
                if (savedTime) this.timeSlots = JSON.parse(savedTime);
                var savedCount = localStorage.getItem('classmate_periodCount');
                if (savedCount) this.periodCount = parseInt(savedCount) || 8;
                var savedDays = localStorage.getItem('classmate_visibleDays');
                if (savedDays) { try { this.visibleDays = JSON.parse(savedDays); } catch (e) {} }
                this.ensureTimeSlots();
            } catch (e) {
                console.error('加载失败：', e);
            }
        },

        saveState: function() {
            try {
                localStorage.setItem('classmate_courses', JSON.stringify(this.courses));
                localStorage.setItem('classmate_times', JSON.stringify(this.timeSlots));
                localStorage.setItem('classmate_periodCount', String(this.periodCount));
                localStorage.setItem('classmate_visibleDays', JSON.stringify(this.visibleDays));
            } catch (e) {
                console.error('保存失败：', e);
            }
        },

        ensureTimeSlots: function() {
            while (this.timeSlots.length < this.periodCount) {
                this.timeSlots.push({ start: '', end: '' });
            }
            if (this.timeSlots.length > this.periodCount) {
                this.timeSlots = this.timeSlots.slice(0, this.periodCount);
            }
        },

        setPeriodCount: function(n) {
            n = Math.max(4, Math.min(14, parseInt(n) || 8));
            this.periodCount = n;
            this.ensureTimeSlots();
            this.saveState();
        },

        setVisibleDays: function(days) {
            if (!Array.isArray(days) || days.length === 0) days = [1,2,3,4,5,6,7];
            this.visibleDays = days.slice().sort(function(a,b){return a-b;});
            this.saveState();
        },

        addCourse: function(data) {
            var course = {
                id: generateId(),
                name: data.name,
                day: parseInt(data.day),
                period: parseInt(data.period),
                room: data.room || '',
                color: data.color || 0
            };
            // 检查冲突
            for (var i = 0; i < this.courses.length; i++) {
                if (this.courses[i].day === course.day && this.courses[i].period === course.period) {
                    return { success: false, error: '该时间段已有课程' };
                }
            }
            this.courses.push(course);
            this.saveState();
            return { success: true, course: course };
        },

        updateCourse: function(id, data) {
            for (var i = 0; i < this.courses.length; i++) {
                if (this.courses[i].id === id) {
                    // 检查冲突
                    for (var j = 0; j < this.courses.length; j++) {
                        if (j !== i && this.courses[j].day === parseInt(data.day) && this.courses[j].period === parseInt(data.period)) {
                            return { success: false, error: '该时间段已有课程' };
                        }
                    }
                    this.courses[i].name = data.name;
                    this.courses[i].day = parseInt(data.day);
                    this.courses[i].period = parseInt(data.period);
                    this.courses[i].room = data.room || '';
                    this.courses[i].color = data.color || 0;
                    this.saveState();
                    return { success: true };
                }
            }
            return { success: false, error: '课程不存在' };
        },

        deleteCourse: function(id) {
            for (var i = 0; i < this.courses.length; i++) {
                if (this.courses[i].id === id) {
                    this.courses.splice(i, 1);
                    this.saveState();
                    return true;
                }
            }
            return false;
        },

        getCourse: function(day, period) {
            for (var i = 0; i < this.courses.length; i++) {
                if (this.courses[i].day === day && this.courses[i].period === period) {
                    return this.courses[i];
                }
            }
            return null;
        },

        clearAll: function() {
            this.courses = [];
            this.saveState();
        },

        updateTimeSlots: function(slots) {
            this.timeSlots = slots;
            this.saveState();
        }
    };

    // =====================
    // UI 渲染
    // =====================

    var UI = {
        init: function() {
            AppState.init();
            this.renderSchedule();
            this.renderColorPicker();
            this.updateWeekInfo();
            this.bindEvents();
        },

        updateWeekInfo: function() {
            var el = document.getElementById('weekInfo');
            if (!el) return;
            var d = new Date();
            var weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            el.textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + weekdays[d.getDay()];
        },

        renderSchedule: function() {
            var grid = document.getElementById('scheduleGrid');
            if (!grid) return;

            var weekdays = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            var visible = AppState.visibleDays || [1,2,3,4,5,6,7];
            var html = '';

            // 空状态提示（在表格上方）
            if (AppState.courses.length === 0) {
                html += '<div style="text-align:center;padding:24px 20px;color:#94a3b8;">' +
                    '<div style="font-size:28px;margin-bottom:8px;">📚</div>' +
                    '<div style="font-size:14px;color:#1e293b;font-weight:600;margin-bottom:6px;">暂无课程，点击表格添加</div>' +
                    '<div style="font-size:12px;">点击下方空白格子即可添加课程</div>' +
                '</div>';
            }

            html += '<table class="schedule-table weekly"><thead><tr><th class="th-period">节次</th>';
            for (var vi = 0; vi < visible.length; vi++) {
                html += '<th>' + weekdays[visible[vi]] + '</th>';
            }
            html += '</tr></thead><tbody>';

            for (var period = 1; period <= AppState.periodCount; period++) {
                var timeSlot = AppState.timeSlots[period - 1] || { start: '', end: '' };
                var timeLabel = timeSlot.start && timeSlot.end ? (timeSlot.start + '-' + timeSlot.end) : (timeSlot.start || '');
                html += '<tr>';
                html += '<td class="td-period"><b>' + period + '</b><small>' + this.escapeHtml(timeLabel) + '</small></td>';
                for (var vi = 0; vi < visible.length; vi++) {
                    var d = visible[vi];
                    var course = AppState.getCourse(d, period);
                    if (course) {
                        html += '<td class="cell course-color-' + course.color + '" data-day="' + d + '" data-period="' + period + '" data-id="' + course.id + '">' +
                            '<div class="w-name">' + this.escapeHtml(course.name) + '</div>' +
                            (course.room ? '<div class="w-room">' + this.escapeHtml(course.room) + '</div>' : '') +
                            '</td>';
                    } else {
                        html += '<td class="cell empty" data-day="' + d + '" data-period="' + period + '"><span class="w-empty">—</span></td>';
                    }
                }
                html += '</tr>';
            }
            html += '</tbody></table>';

            grid.innerHTML = html;
        },

        renderDayTabs: function() {
            var tabs = document.getElementById('dayTabs');
            if (!tabs) return;

            var weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            var today = new Date().getDay();
            if (today === 0) today = 7;
            var visible = AppState.visibleDays || [1,2,3,4,5,6,7];

            var html = '';
            for (var vi = 0; vi < visible.length; vi++) {
                var i = visible[vi];
                var isToday = i === today;
                var isActive = i === AppState.currentDay;
                html += '<div class="day-tab' + (isActive ? ' active' : '') + (isToday ? ' today' : '') + '" data-day="' + i + '">' + weekdays[i-1] + '</div>';
            }
            tabs.innerHTML = html;
        },

        renderColorPicker: function() {
            var container = document.getElementById('colorPicker');
            if (!container) return;
            var html = '';
            for (var i = 0; i < AppState.colors.length; i++) {
                html += '<div class="color-option' + (i === AppState.selectedColor ? ' selected' : '') + '" data-color="' + i + '" style="background:' + AppState.colors[i] + '"></div>';
            }
            container.innerHTML = html;
        },

        renderTimeSettings: function() {
            var container = document.getElementById('timeSettingsList');
            if (!container) return;
            var html = '';
            for (var i = 0; i < AppState.periodCount; i++) {
                var slot = AppState.timeSlots[i] || { start: '', end: '' };
                html += '<div class="time-slot-row">' +
                    '<span>第' + (i + 1) + '节</span>' +
                    '<input type="time" class="time-start" data-index="' + i + '" value="' + slot.start + '">' +
                    '<span>-</span>' +
                    '<input type="time" class="time-end" data-index="' + i + '" value="' + slot.end + '">' +
                    '</div>';
            }
            container.innerHTML = html;
        },

        escapeHtml: function(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // =====================
        // 模态框
        // =====================

        showCourseModal: function(course, day, period) {
            var modal = document.getElementById('courseModal');
            var title = document.getElementById('modalTitle');
            var nameInput = document.getElementById('courseName');
            var dayInput = document.getElementById('courseDay');
            var periodInput = document.getElementById('coursePeriod');
            var roomInput = document.getElementById('courseRoom');
            var deleteBtn = document.getElementById('modalDelete');

            // 动态生成节次选项
            if (periodInput) {
                var opts = '';
                for (var i = 1; i <= AppState.periodCount; i++) {
                    opts += '<option value="' + i + '">第 ' + i + ' 节</option>';
                }
                periodInput.innerHTML = opts;
            }

            if (course) {
                title.textContent = '编辑课程';
                nameInput.value = course.name;
                if (dayInput) dayInput.value = course.day;
                if (periodInput) periodInput.value = course.period;
                if (roomInput) roomInput.value = course.room;
                AppState.selectedColor = course.color;
                AppState.editingId = course.id;
                if (deleteBtn) deleteBtn.style.display = 'block';
            } else {
                title.textContent = '添加课程';
                nameInput.value = '';
                if (dayInput) dayInput.value = day || '1';
                if (periodInput) periodInput.value = period || '1';
                if (roomInput) roomInput.value = '';
                AppState.selectedColor = 0;
                AppState.editingId = null;
                if (deleteBtn) deleteBtn.style.display = 'none';
            }

            this.renderColorPicker();
            if (modal) modal.classList.add('show');
        },

        hideCourseModal: function() {
            var modal = document.getElementById('courseModal');
            if (modal) modal.classList.remove('show');
        },

        showTimeModal: function() {
            var modal = document.getElementById('timeModal');
            this.renderTimeSettings();
            if (modal) modal.classList.add('show');
        },

        hideTimeModal: function() {
            var modal = document.getElementById('timeModal');
            if (modal) modal.classList.remove('show');
        },

        // =====================
        // 事件绑定
        // =====================

        bindEvents: function() {
            var self = this;

            // 添加课程按钮
            var addBtn = document.getElementById('addCourseBtn');
            if (addBtn) {
                addBtn.addEventListener('click', function() {
                    self.showCourseModal(null);
                });
            }

            // 星期切换
            var dayTabs = document.getElementById('dayTabs');
            if (dayTabs) {
                dayTabs.addEventListener('click', function(e) {
                    var tab = e.target.closest('.day-tab');
                    if (!tab) return;
                    var day = parseInt(tab.dataset.day);
                    if (day && day !== AppState.currentDay) {
                        AppState.currentDay = day;
                        self.renderSchedule();
                    }
                });
            }

            // 点击单元格
            var grid = document.getElementById('scheduleGrid');
            if (grid) {
                grid.addEventListener('click', function(e) {
                    var cell = e.target.closest('.cell');
                    if (!cell) return;
                    var id = cell.dataset.id;
                    if (id) {
                        // 编辑已有课程
                        for (var i = 0; i < AppState.courses.length; i++) {
                            if (AppState.courses[i].id === id) {
                                self.showCourseModal(AppState.courses[i]);
                                return;
                            }
                        }
                    } else {
                        // 添加新课程
                        var day = parseInt(cell.dataset.day);
                        var period = parseInt(cell.dataset.period);
                        self.showCourseModal(null, day, period);
                    }
                });
            }

            // 颜色选择
            var colorPicker = document.getElementById('colorPicker');
            if (colorPicker) {
                colorPicker.addEventListener('click', function(e) {
                    var option = e.target.closest('.color-option');
                    if (!option) return;
                    AppState.selectedColor = parseInt(option.dataset.color);
                    self.renderColorPicker();
                });
            }

            // 模态框按钮
            var confirmBtn = document.getElementById('modalConfirm');
            var cancelBtn = document.getElementById('modalCancel');
            var deleteBtn = document.getElementById('modalDelete');

            if (confirmBtn) {
                confirmBtn.addEventListener('click', function() {
                    var name = document.getElementById('courseName').value.trim();
                    var day = document.getElementById('courseDay').value;
                    var period = document.getElementById('coursePeriod').value;
                    var roomInput = document.getElementById('courseRoom');
                    var room = roomInput ? roomInput.value.trim() : '';

                    if (!name) {
                        var err = document.getElementById('courseNameError');
                        if (err) err.style.display = 'block';
                        document.getElementById('courseName').focus();
                        return;
                    } else {
                        var err = document.getElementById('courseNameError');
                        if (err) err.style.display = 'none';
                    }

                    var data = {
                        name: name,
                        day: day,
                        period: period,
                        room: room,
                        color: AppState.selectedColor
                    };

                    var result;
                    if (AppState.editingId) {
                        result = AppState.updateCourse(AppState.editingId, data);
                    } else {
                        result = AppState.addCourse(data);
                    }

                    if (result.success) {
                        self.hideCourseModal();
                        self.renderSchedule();
                    } else {
                        alert(result.error);
                    }
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                    self.hideCourseModal();
                });
            }

            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    if (AppState.editingId && confirm('确定要删除这门课程吗？')) {
                        AppState.deleteCourse(AppState.editingId);
                        self.hideCourseModal();
                        self.renderSchedule();
                    }
                });
            }

            // 设置时间
            var editTimeBtn = document.getElementById('editTimeBtn');
            var timeConfirm = document.getElementById('timeConfirm');
            var timeCancel = document.getElementById('timeCancel');

            if (editTimeBtn) {
                editTimeBtn.addEventListener('click', function() {
                    self.showTimeModal();
                });
            }

            if (timeConfirm) {
                timeConfirm.addEventListener('click', function() {
                    var slots = [];
                    var startInputs = document.querySelectorAll('.time-start');
                    var endInputs = document.querySelectorAll('.time-end');
                    for (var i = 0; i < AppState.periodCount; i++) {
                        slots.push({
                            start: startInputs[i] ? startInputs[i].value : '',
                            end: endInputs[i] ? endInputs[i].value : ''
                        });
                    }
                    AppState.updateTimeSlots(slots);
                    self.hideTimeModal();
                    self.renderSchedule();
                });
            }

            if (timeCancel) {
                timeCancel.addEventListener('click', function() {
                    self.hideTimeModal();
                });
            }

            // 设置节数
            var editPeriodBtn = document.getElementById('editPeriodBtn');
            var periodRange = document.getElementById('periodRange');
            var periodValue = document.getElementById('periodValue');
            var periodConfirm = document.getElementById('periodConfirm');
            var periodCancel = document.getElementById('periodCancel');
            var periodModal = document.getElementById('periodModal');

            if (editPeriodBtn) {
                editPeriodBtn.addEventListener('click', function() {
                    if (periodRange) periodRange.value = AppState.periodCount;
                    if (periodValue) periodValue.textContent = AppState.periodCount + ' 节';
                    if (periodModal) periodModal.classList.add('show');
                });
            }
            if (periodRange) {
                periodRange.addEventListener('input', function() {
                    if (periodValue) periodValue.textContent = this.value + ' 节';
                });
            }
            if (periodConfirm) {
                periodConfirm.addEventListener('click', function() {
                    var newCount = periodRange ? parseInt(periodRange.value) : 8;
                    AppState.setPeriodCount(newCount);
                    if (periodModal) periodModal.classList.remove('show');
                    self.renderSchedule();
                });
            }
            if (periodCancel) {
                periodCancel.addEventListener('click', function() {
                    if (periodModal) periodModal.classList.remove('show');
                });
            }

            // 设置星期
            var editDaysBtn = document.getElementById('editDaysBtn');
            var daysModal = document.getElementById('daysModal');
            var daysConfirm = document.getElementById('daysConfirm');
            var daysCancel = document.getElementById('daysCancel');
            if (editDaysBtn && daysModal) {
                editDaysBtn.addEventListener('click', function() {
                    var checkboxes = daysModal.querySelectorAll('input[type="checkbox"]');
                    var visible = AppState.visibleDays || [1,2,3,4,5,6,7];
                    checkboxes.forEach(function(cb) {
                        cb.checked = visible.indexOf(parseInt(cb.value)) !== -1;
                    });
                    daysModal.classList.add('show');
                });
            }
            if (daysConfirm && daysModal) {
                daysConfirm.addEventListener('click', function() {
                    var checkboxes = daysModal.querySelectorAll('input[type="checkbox"]');
                    var selected = [];
                    checkboxes.forEach(function(cb) {
                        if (cb.checked) selected.push(parseInt(cb.value));
                    });
                    if (selected.length === 0) { alert('至少选择一天'); return; }
                    AppState.setVisibleDays(selected);
                    daysModal.classList.remove('show');
                    self.renderSchedule();
                    self.renderDayTabs();
                });
            }
            if (daysCancel && daysModal) {
                daysCancel.addEventListener('click', function() {
                    daysModal.classList.remove('show');
                });
            }

            // 清空
            var clearBtn = document.getElementById('clearAllBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', function() {
                    if (AppState.courses.length === 0) return;
                    if (confirm('确定要清空所有课程吗？')) {
                        AppState.clearAll();
                        self.renderSchedule();
                    }
                });
            }
        }
    };

    // =====================
    // 初始化
    // =====================

    global.ClassMateApp = {
        init: function() {
            UI.init();
        }
    };

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                ClassMateApp.init();
            });
        } else {
            ClassMateApp.init();
        }
    }

})(typeof window !== 'undefined' ? window : this);
