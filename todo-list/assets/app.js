/**
 * TaskFlow · 待办清单工具 - 核心逻辑
 *
 * 功能：
 * 1. 当天待办添加、完成打勾、删除
 * 2. 清除已完成 / 清除全部
 * 3. 模板保存和套用
 * 4. localStorage 持久化
 * 5. 四象限分类（重要紧急矩阵）
 */

(function(global) {
    'use strict';

    // =====================
    // 常量
    // =====================
    var QUADRANT_NAMES = {
        q1: '重要且紧急',
        q2: '重要不紧急',
        q3: '紧急不重要',
        q4: '不紧急不重要'
    };
    var QUADRANT_TAGS = {
        q1: '重要且紧急',
        q2: '重要不紧急',
        q3: '紧急不重要',
        q4: '不重要不紧急'
    };

    // =====================
    // 工具函数
    // =====================

    function getTodayKey() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function generateId() {
        return 't_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    }

    // =====================
    // 状态管理
    // =====================

    var AppState = {
        todos: [],
        templates: [],
        todayKey: getTodayKey(),
        currentQuadrant: 'q1',
        currentView: 'list', // 'list' or 'matrix'

        init: function() {
            this.loadState();
            this.loadTemplates();
        },

        loadState: function() {
            var saved = SBUtils.storageGet('taskflow_' + this.todayKey, null);
            if (saved) {
                this.todos = saved;
                // 兼容旧数据：没有 quadrant 的默认为 q4
                for (var i = 0; i < this.todos.length; i++) {
                    if (!this.todos[i].quadrant) {
                        this.todos[i].quadrant = 'q4';
                    }
                }
                this.saveState();
            }
        },

        saveState: function() {
            SBUtils.storageSet('taskflow_' + this.todayKey, this.todos);
        },

        loadTemplates: function() {
            var saved = SBUtils.storageGet('taskflow_templates', null);
            if (saved) {
                this.templates = saved;
            }
        },

        saveTemplates: function() {
            SBUtils.storageSet('taskflow_templates', this.templates);
        },

        addTodo: function(text, quadrant) {
            var todo = {
                id: generateId(),
                text: text.trim(),
                quadrant: quadrant || this.currentQuadrant || 'q1',
                completed: false,
                createdAt: Date.now()
            };
            this.todos.push(todo);
            this.saveState();
            return todo;
        },

        toggleTodo: function(id) {
            for (var i = 0; i < this.todos.length; i++) {
                if (this.todos[i].id === id) {
                    this.todos[i].completed = !this.todos[i].completed;
                    this.saveState();
                    return true;
                }
            }
            return false;
        },

        deleteTodo: function(id) {
            for (var i = 0; i < this.todos.length; i++) {
                if (this.todos[i].id === id) {
                    this.todos.splice(i, 1);
                    this.saveState();
                    return true;
                }
            }
            return false;
        },

        clearCompleted: function() {
            var newTodos = [];
            for (var i = 0; i < this.todos.length; i++) {
                if (!this.todos[i].completed) {
                    newTodos.push(this.todos[i]);
                }
            }
            this.todos = newTodos;
            this.saveState();
        },

        clearAll: function() {
            this.todos = [];
            this.saveState();
        },

        saveAsTemplate: function(name) {
            var template = {
                id: generateId(),
                name: name.trim(),
                items: [],
                createdAt: Date.now()
            };
            for (var i = 0; i < this.todos.length; i++) {
                template.items.push({
                    text: this.todos[i].text,
                    quadrant: this.todos[i].quadrant || 'q1',
                    completed: false
                });
            }
            this.templates.push(template);
            this.saveTemplates();
            return template;
        },

        applyTemplate: function(templateId) {
            for (var i = 0; i < this.templates.length; i++) {
                if (this.templates[i].id === templateId) {
                    var template = this.templates[i];
                    for (var j = 0; j < template.items.length; j++) {
                        var exists = false;
                        for (var k = 0; k < this.todos.length; k++) {
                            if (this.todos[k].text === template.items[j].text) {
                                exists = true;
                                break;
                            }
                        }
                        if (!exists) {
                            this.todos.push({
                                id: generateId(),
                                text: template.items[j].text,
                                quadrant: template.items[j].quadrant || 'q1',
                                completed: false,
                                createdAt: Date.now()
                            });
                        }
                    }
                    this.saveState();
                    return true;
                }
            }
            return false;
        },

        deleteTemplate: function(id) {
            for (var i = 0; i < this.templates.length; i++) {
                if (this.templates[i].id === id) {
                    this.templates.splice(i, 1);
                    this.saveTemplates();
                    return true;
                }
            }
            return false;
        },

        getStats: function() {
            var total = this.todos.length;
            var completed = 0;
            for (var i = 0; i < this.todos.length; i++) {
                if (this.todos[i].completed) completed++;
            }
            return { total: total, completed: completed, remaining: total - completed };
        },

        getTodosByQuadrant: function(q) {
            var result = [];
            for (var i = 0; i < this.todos.length; i++) {
                if (this.todos[i].quadrant === q) {
                    result.push(this.todos[i]);
                }
            }
            return result;
        }
    };

    // =====================
    // UI 渲染
    // =====================

    var UI = {
        init: function() {
            AppState.init();
            this.updateDateDisplay();
            this.renderTodoList();
            this.renderMatrix();
            this.renderTemplates();
            this.updateProgress();
            this.bindEvents();
        },

        updateDateDisplay: function() {
            var el = document.getElementById('dateDisplay');
            if (!el) return;
            var d = new Date();
            var weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            var str = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + weekdays[d.getDay()];
            el.textContent = str;
        },

        updateProgress: function() {
            var stats = AppState.getStats();
            var fill = document.getElementById('progressFill');
            var text = document.getElementById('progressText');

            var percent = stats.total > 0 ? (stats.completed / stats.total * 100) : 0;
            if (fill) fill.style.width = percent + '%';
            if (text) text.textContent = stats.completed + ' / ' + stats.total + ' 完成';
        },

        renderTodoList: function() {
            var container = document.getElementById('todoList');
            if (!container) return;
            container.innerHTML = '';

            if (AppState.todos.length === 0) {
                container.innerHTML =
                    '<div class="empty-state">' +
                        '<div class="icon">📝</div>' +
                        '<p>今天还没有待办事项<br>添加一个开始吧</p>' +
                    '</div>';
                return;
            }

            // 按象限排序
            var order = { q1: 0, q2: 1, q3: 2, q4: 3 };
            var sortedTodos = AppState.todos.slice().sort(function(a, b) {
                var qa = order[a.quadrant] !== undefined ? order[a.quadrant] : 3;
                var qb = order[b.quadrant] !== undefined ? order[b.quadrant] : 3;
                if (qa !== qb) return qa - qb;
                return a.createdAt - b.createdAt;
            });

            for (var i = 0; i < sortedTodos.length; i++) {
                var todo = sortedTodos[i];
                var q = todo.quadrant || 'q1';
                var item = document.createElement('div');
                item.className = 'todo-item ' + q + (todo.completed ? ' completed' : '');
                item.dataset.id = todo.id;

                var checkIcon = todo.completed ? '✓' : '';
                var tagHtml = '<span class="q-tag ' + q + '">' + QUADRANT_TAGS[q] + '</span>';

                item.innerHTML =
                    '<div class="checkbox' + (todo.completed ? ' checked' : '') + '">' + checkIcon + '</div>' +
                    '<div class="todo-text">' +
                        tagHtml +
                        '<div class="text-main">' + this.escapeHtml(todo.text) + '</div>' +
                    '</div>' +
                    '<button class="todo-delete" data-action="delete">×</button>';

                container.appendChild(item);
            }
        },

        renderMatrix: function() {
            var quadrants = ['q1', 'q2', 'q3', 'q4'];
            for (var qi = 0; qi < quadrants.length; qi++) {
                var q = quadrants[qi];
                var itemsContainer = document.getElementById('mc' + q.charAt(0).toUpperCase() + q.charAt(1) + 'Items');
                var countEl = document.getElementById('mc' + q.charAt(0).toUpperCase() + q.charAt(1) + 'Count');
                if (!itemsContainer) continue;

                var todos = AppState.getTodosByQuadrant(q);
                if (countEl) countEl.textContent = '(' + todos.length + ')';

                itemsContainer.innerHTML = '';
                if (todos.length === 0) {
                    itemsContainer.innerHTML = '<div class="matrix-empty">暂无任务</div>';
                    continue;
                }

                // 按创建时间排序
                todos.sort(function(a, b) {
                    return a.createdAt - b.createdAt;
                });

                for (var i = 0; i < todos.length; i++) {
                    var todo = todos[i];
                    var mi = document.createElement('div');
                    mi.className = 'matrix-item' + (todo.completed ? ' completed' : '');
                    mi.dataset.id = todo.id;

                    var checkIcon = todo.completed ? '✓' : '';

                    mi.innerHTML =
                        '<div class="mi-check' + (todo.completed ? ' checked' : '') + '">' + checkIcon + '</div>' +
                        '<div class="mi-text">' + this.escapeHtml(todo.text) + '</div>' +
                        '<button class="mi-del" data-action="mi-delete">×</button>';

                    itemsContainer.appendChild(mi);
                }
            }
        },

        renderTemplates: function() {
            var container = document.getElementById('templateList');
            if (!container) return;
            container.innerHTML = '';

            if (AppState.templates.length === 0) {
                container.innerHTML = '<p style="color:#6f6f80;font-size:13px;text-align:center;">暂无模板，保存当前待办为模板</p>';
                return;
            }

            for (var i = 0; i < AppState.templates.length; i++) {
                var t = AppState.templates[i];
                var card = document.createElement('div');
                card.className = 'template-card';
                card.dataset.templateId = t.id;

                card.innerHTML =
                    '<div class="name">' + this.escapeHtml(t.name) + '</div>' +
                    '<div class="count">' + t.items.length + ' 项</div>' +
                    '<button class="del-template" data-action="del-template">×</button>';

                container.appendChild(card);
            }
        },

        escapeHtml: function(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        // =====================
        // 模态框
        // =====================

        showConfirm: function(title, body, onConfirm) {
            var modal = document.getElementById('confirmModal');
            var titleEl = document.getElementById('modalTitle');
            var bodyEl = document.getElementById('modalBody');
            var confirmBtn = document.getElementById('modalConfirm');
            var cancelBtn = document.getElementById('modalCancel');

            if (titleEl) titleEl.textContent = title;
            if (bodyEl) bodyEl.textContent = body;
            if (modal) modal.classList.add('show');

            var self = this;
            this._confirmHandler = function() {
                self.hideConfirm();
                if (onConfirm) onConfirm();
            };
            this._cancelHandler = function() {
                self.hideConfirm();
            };

            if (confirmBtn) confirmBtn.addEventListener('click', this._confirmHandler, { once: true });
            if (cancelBtn) cancelBtn.addEventListener('click', this._cancelHandler, { once: true });
        },

        hideConfirm: function() {
            var modal = document.getElementById('confirmModal');
            if (modal) modal.classList.remove('show');
        },

        // =====================
        // 事件绑定
        // =====================

        bindEvents: function() {
            var self = this;

            // 添加待办
            var addBtn = document.getElementById('addBtn');
            var todoInput = document.getElementById('todoInput');

            if (addBtn && todoInput) {
                addBtn.addEventListener('click', function() {
                    var text = todoInput.value.trim();
                    if (!text) return;
                    AppState.addTodo(text, AppState.currentQuadrant);
                    todoInput.value = '';
                    self.renderTodoList();
                    self.renderMatrix();
                    self.updateProgress();
                });

                todoInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        addBtn.click();
                    }
                });
            }

            // ===== 象限选择器 =====
            var quadrantSelector = document.getElementById('quadrantSelector');
            if (quadrantSelector) {
                quadrantSelector.addEventListener('click', function(e) {
                    var pill = e.target.closest('.q-pill');
                    if (!pill) return;

                    var pills = quadrantSelector.querySelectorAll('.q-pill');
                    for (var i = 0; i < pills.length; i++) {
                        pills[i].className = 'q-pill';
                    }
                    var q = pill.dataset.quadrant;
                    pill.classList.add('active-' + q);
                    AppState.currentQuadrant = q;
                });
            }

            // ===== 视图切换 =====
            var viewToggle = document.getElementById('viewToggle');
            if (viewToggle) {
                viewToggle.addEventListener('click', function(e) {
                    var btn = e.target.closest('.view-btn');
                    if (!btn) return;

                    var btns = viewToggle.querySelectorAll('.view-btn');
                    for (var i = 0; i < btns.length; i++) {
                        btns[i].classList.remove('active');
                    }
                    btn.classList.add('active');

                    var view = btn.dataset.view;
                    AppState.currentView = view;
                    var listView = document.getElementById('listView');
                    var matrixView = document.getElementById('matrixView');

                    if (view === 'list') {
                        if (listView) listView.classList.remove('hide');
                        if (matrixView) matrixView.classList.remove('show');
                    } else {
                        if (listView) listView.classList.add('hide');
                        if (matrixView) matrixView.classList.add('show');
                        self.renderMatrix();
                    }
                });
            }

            // 待办列表点击（打勾/删除）
            var todoList = document.getElementById('todoList');
            if (todoList) {
                todoList.addEventListener('click', function(e) {
                    var item = e.target.closest('.todo-item');
                    if (!item) return;

                    var id = item.dataset.id;

                    if (e.target.closest('.todo-delete')) {
                        AppState.deleteTodo(id);
                        self.renderTodoList();
                        self.renderMatrix();
                        self.updateProgress();
                        return;
                    }

                    if (e.target.closest('.checkbox') || e.target.closest('.todo-text')) {
                        AppState.toggleTodo(id);
                        self.renderTodoList();
                        self.renderMatrix();
                        self.updateProgress();
                    }
                });
            }

            // ===== 矩阵视图点击 =====
            var matrixGrid = document.getElementById('matrixGrid');
            if (matrixGrid) {
                matrixGrid.addEventListener('click', function(e) {
                    var mi = e.target.closest('.matrix-item');
                    if (!mi) return;

                    var id = mi.dataset.id;

                    if (e.target.closest('.mi-del')) {
                        AppState.deleteTodo(id);
                        self.renderTodoList();
                        self.renderMatrix();
                        self.updateProgress();
                        return;
                    }

                    // 点击复选框或文字切换完成状态
                    if (e.target.closest('.mi-check') || e.target.closest('.mi-text')) {
                        AppState.toggleTodo(id);
                        self.renderTodoList();
                        self.renderMatrix();
                        self.updateProgress();
                    }
                });
            }

            // 清除已完成
            var clearCompletedBtn = document.getElementById('clearCompletedBtn');
            if (clearCompletedBtn) {
                clearCompletedBtn.addEventListener('click', function() {
                    var stats = AppState.getStats();
                    if (stats.completed === 0) return;
                    self.showConfirm(
                        '清除已完成',
                        '确定要清除所有已完成的 ' + stats.completed + ' 项待办吗？',
                        function() {
                            AppState.clearCompleted();
                            self.renderTodoList();
                            self.renderMatrix();
                            self.updateProgress();
                        }
                    );
                });
            }

            // 清除全部
            var clearAllBtn = document.getElementById('clearAllBtn');
            if (clearAllBtn) {
                clearAllBtn.addEventListener('click', function() {
                    if (AppState.todos.length === 0) return;
                    self.showConfirm(
                        '清除全部',
                        '确定要清除全部 ' + AppState.todos.length + ' 项待办吗？此操作不可恢复。',
                        function() {
                            AppState.clearAll();
                            self.renderTodoList();
                            self.renderMatrix();
                            self.updateProgress();
                        }
                    );
                });
            }

            // 保存模板
            var saveTemplateBtn = document.getElementById('saveTemplateBtn');
            var templateInputArea = document.getElementById('templateInputArea');
            var templateNameInput = document.getElementById('templateNameInput');
            var confirmSaveTemplate = document.getElementById('confirmSaveTemplate');

            if (saveTemplateBtn && templateInputArea) {
                saveTemplateBtn.addEventListener('click', function() {
                    if (AppState.todos.length === 0) {
                        SBUtils.showToast('当前没有待办事项，无法保存模板', 'warn');
                        return;
                    }
                    templateInputArea.style.display = 'flex';
                    if (templateNameInput) templateNameInput.focus();
                });
            }

            if (confirmSaveTemplate && templateNameInput) {
                confirmSaveTemplate.addEventListener('click', function() {
                    var name = templateNameInput.value.trim();
                    if (!name) {
                        SBUtils.showToast('请输入模板名称', 'warn');
                        return;
                    }
                    AppState.saveAsTemplate(name);
                    templateNameInput.value = '';
                    templateInputArea.style.display = 'none';
                    self.renderTemplates();
                    SBUtils.showToast('模板已保存！', 'success');
                });

                templateNameInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        confirmSaveTemplate.click();
                    }
                });
            }

            // 模板列表点击（套用/删除）
            var templateList = document.getElementById('templateList');
            if (templateList) {
                templateList.addEventListener('click', function(e) {
                    var card = e.target.closest('.template-card');
                    if (!card) return;

                    var templateId = card.dataset.templateId;

                    if (e.target.closest('.del-template')) {
                        self.showConfirm(
                            '删除模板',
                            '确定要删除这个模板吗？',
                            function() {
                                AppState.deleteTemplate(templateId);
                                self.renderTemplates();
                            }
                        );
                        return;
                    }

                    AppState.applyTemplate(templateId);
                    self.renderTodoList();
                    self.renderMatrix();
                    self.updateProgress();
                });
            }

            // 使用指引展开/收起
            var guideBar = document.getElementById('guideBar');
            var guidePanel = document.getElementById('guidePanel');
            if (guideBar && guidePanel) {
                guideBar.addEventListener('click', function() {
                    var isShown = guidePanel.classList.contains('show');
                    if (isShown) {
                        guidePanel.classList.remove('show');
                        guideBar.querySelector('.text').textContent = '如何使用 TaskFlow？点击展开';
                    } else {
                        guidePanel.classList.add('show');
                        guideBar.querySelector('.text').textContent = '点击收起指引';
                    }
                });
            }
        }
    };

    // =====================
    // 初始化
    // =====================

    global.TaskFlowApp = {
        init: function() {
            UI.init();
        }
    };

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                TaskFlowApp.init();
            });
        } else {
            TaskFlowApp.init();
        }
    }

})(typeof window !== 'undefined' ? window : this);
