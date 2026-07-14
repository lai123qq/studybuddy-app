/**
 * Classica · 古诗文学习工具 - 核心逻辑
 */

(function(global) {
    'use strict';

    // =====================
    // 状态管理
    // =====================
    var AppState = {
        currentCategory: '小学',
        currentGrade: null,
        currentPoem: null,
        searchQuery: '',
        learnedPoems: [],
        recitedPoems: [],
        reciteMode: false,

        init: function() {
            this.loadState();
        },

        loadState: function() {
            var state = SBUtils.storageGet('classical_chinese_state', null);
            if (state) {
                this.learnedPoems = state.learnedPoems || [];
                this.recitedPoems = state.recitedPoems || [];
            }
        },

        saveState: function() {
            var state = {
                learnedPoems: this.learnedPoems,
                recitedPoems: this.recitedPoems
            };
            SBUtils.storageSet('classical_chinese_state', state);
        },

        markLearned: function(poemId) {
            if (this.learnedPoems.indexOf(poemId) === -1) {
                this.learnedPoems.push(poemId);
                this.saveState();
            }
        },

        markRecited: function(poemId) {
            if (this.recitedPoems.indexOf(poemId) === -1) {
                this.recitedPoems.push(poemId);
                this.saveState();
            }
        },

        isLearned: function(poemId) {
            return this.learnedPoems.indexOf(poemId) !== -1;
        },

        isRecited: function(poemId) {
            return this.recitedPoems.indexOf(poemId) !== -1;
        }
    };

    // =====================
    // 数据访问
    // =====================
    var DataAccess = {
        getCategories: function() {
            return Object.keys(CLASSICAL_DATA);
        },

        getGrades: function(category) {
            var cat = CLASSICAL_DATA[category];
            return cat ? Object.keys(cat) : [];
        },

        getPoems: function(category, grade) {
            var cat = CLASSICAL_DATA[category];
            if (!cat) return [];
            var poems = cat[grade] || [];
            return poems.map(function(poem, index) {
                poem.id = category + '_' + grade + '_' + index;
                return poem;
            });
        },

        getAllPoems: function(category) {
            var cat = CLASSICAL_DATA[category];
            if (!cat) return [];
            var all = [];
            var grades = Object.keys(cat);
            for (var i = 0; i < grades.length; i++) {
                var poems = cat[grades[i]];
                for (var j = 0; j < poems.length; j++) {
                    var poem = poems[j];
                    poem.id = category + '_' + grades[i] + '_' + j;
                    poem.grade = grades[i];
                    all.push(poem);
                }
            }
            return all;
        },

        searchPoems: function(category, query) {
            var all = this.getAllPoems(category);
            if (!query) return all;
            query = query.toLowerCase();
            return all.filter(function(poem) {
                return poem.title.indexOf(query) !== -1 ||
                       poem.author.indexOf(query) !== -1 ||
                       poem.content.some(function(line) {
                           return line.indexOf(query) !== -1;
                       });
            });
        }
    };

    // =====================
    // UI 渲染
    // =====================
    var UI = {
        init: function() {
            AppState.init();
            this.renderGradeTabs();
            this.renderPoemList();
            this.updateStats();
            this.bindEvents();
        },

        renderGradeTabs: function() {
            var container = document.getElementById('gradeTabs');
            if (!container) return;
            container.innerHTML = '';

            var grades = DataAccess.getGrades(AppState.currentCategory);
            for (var i = 0; i < grades.length; i++) {
                var btn = document.createElement('button');
                btn.className = 'grade-tab' + (i === 0 ? ' active' : '');
                btn.textContent = grades[i];
                btn.dataset.grade = grades[i];
                container.appendChild(btn);
            }

            AppState.currentGrade = grades[0];
        },

        renderPoemList: function() {
            var container = document.getElementById('poemList');
            if (!container) return;
            container.innerHTML = '';

            var poems;
            if (AppState.searchQuery) {
                poems = DataAccess.searchPoems(AppState.currentCategory, AppState.searchQuery);
            } else if (AppState.currentGrade) {
                poems = DataAccess.getPoems(AppState.currentCategory, AppState.currentGrade);
            } else {
                poems = DataAccess.getAllPoems(AppState.currentCategory);
            }

            if (poems.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="icon">\u{1F4D6}</div><p>暂无内容</p></div>';
                return;
            }

            for (var i = 0; i < poems.length; i++) {
                var poem = poems[i];
                var card = document.createElement('div');
                card.className = 'poem-card';
                card.dataset.poemId = poem.id;

                var preview = poem.content.slice(0, 2).join('');
                if (preview.length > 30) preview = preview.substring(0, 30) + '...';

                var learnedMark = AppState.isLearned(poem.id) ? '<span style="color:#34d399;margin-left:8px;">\u2713</span>' : '';
                var recitedMark = AppState.isRecited(poem.id) ? '<span style="color:#a855f7;margin-left:4px;">\u2605</span>' : '';

                card.innerHTML =
                    '<div class="title">' + poem.title + learnedMark + recitedMark + '</div>' +
                    '<div class="meta">' +
                        '<span class="dynasty">[' + poem.dynasty + ']</span> ' + poem.author +
                        '<span class="type-tag">' + poem.type + '</span>' +
                        (poem.grade ? '<span class="type-tag" style="background:rgba(168,85,247,0.1);color:#a855f7;">' + poem.grade + '</span>' : '') +
                    '</div>' +
                    '<div class="preview">' + preview + '</div>';

                container.appendChild(card);
            }
        },

        updateStats: function() {
            var total = 0;
            var cats = DataAccess.getCategories();
            for (var i = 0; i < cats.length; i++) {
                total += DataAccess.getAllPoems(cats[i]).length;
            }

            var elTotal = document.getElementById('statTotal');
            var elLearned = document.getElementById('statLearned');
            var elRecited = document.getElementById('statRecited');

            if (elTotal) elTotal.textContent = total;
            if (elLearned) elLearned.textContent = AppState.learnedPoems.length;
            if (elRecited) elRecited.textContent = AppState.recitedPoems.length;
        },

        showDetail: function(poem) {
            AppState.currentPoem = poem;
            AppState.markLearned(poem.id);
            this.updateStats();

            var modal = document.getElementById('detailModal');
            var body = document.getElementById('modalBody');
            if (!modal || !body) return;

            var contentHtml = poem.content.map(function(line) {
                return '<span class="line">' + line + '</span>';
            }).join('');

            var notesHtml = poem.notes.map(function(note) {
                return '<div class="note-item"><span class="word">' + note.word + '</span>：' +
                       '<span class="meaning">' + note.meaning + '</span></div>';
            }).join('');

            var recitedClass = AppState.isRecited(poem.id) ? ' active' : '';

            body.innerHTML =
                '<div class="detail-title">' + poem.title + '</div>' +
                '<div class="detail-meta">' +
                    '<span class="dynasty">[' + poem.dynasty + ']</span> ' + poem.author +
                    ' <span class="type-tag">' + poem.type + '</span>' +
                '</div>' +

                '<div class="recite-toggle' + recitedClass + '" id="reciteToggle">' +
                    '<div class="switch"></div>' +
                    '<span class="label">背诵模式（点击诗句显示/隐藏）</span>' +
                '</div>' +

                '<div class="section">' +
                    '<div class="section-title">原文</div>' +
                    '<div class="content-lines" id="contentLines">' + contentHtml + '</div>' +
                '</div>' +

                '<div class="section">' +
                    '<div class="section-title">注释</div>' +
                    '<div class="notes-list">' + notesHtml + '</div>' +
                '</div>' +

                '<div class="section">' +
                    '<div class="section-title">译文</div>' +
                    '<div class="translation-text">' + poem.translation + '</div>' +
                '</div>' +

                '<div class="section">' +
                    '<div class="section-title">赏析</div>' +
                    '<div class="analysis-text">' + poem.analysis + '</div>' +
                '</div>';

            modal.classList.add('show');
            AppState.reciteMode = false;

            // 绑定背诵模式切换
            var toggle = document.getElementById('reciteToggle');
            if (toggle) {
                toggle.addEventListener('click', function() {
                    AppState.reciteMode = !AppState.reciteMode;
                    toggle.classList.toggle('active');
                    UI.toggleReciteMode();
                });
            }
        },

        toggleReciteMode: function() {
            var lines = document.querySelectorAll('#contentLines .line');
            var container = document.getElementById('contentLines');

            if (AppState.reciteMode) {
                container.classList.add('recite-mask');
                for (var i = 0; i < lines.length; i++) {
                    lines[i].classList.remove('revealed');
                    lines[i].addEventListener('click', function() {
                        this.classList.toggle('revealed');
                        // 检查是否全部显示
                        var allRevealed = true;
                        for (var j = 0; j < lines.length; j++) {
                            if (!lines[j].classList.contains('revealed')) {
                                allRevealed = false;
                                break;
                            }
                        }
                        if (allRevealed && AppState.currentPoem) {
                            AppState.markRecited(AppState.currentPoem.id);
                            UI.updateStats();
                        }
                    });
                }
            } else {
                container.classList.remove('recite-mask');
                for (var i = 0; i < lines.length; i++) {
                    lines[i].classList.add('revealed');
                }
            }
        },

        hideDetail: function() {
            var modal = document.getElementById('detailModal');
            if (modal) modal.classList.remove('show');
            AppState.currentPoem = null;
            AppState.reciteMode = false;
        },

        bindEvents: function() {
            var self = this;

            // 分类选项卡
            var catTabs = document.getElementById('catTabs');
            if (catTabs) {
                catTabs.addEventListener('click', function(e) {
                    var btn = e.target.closest('.cat-tab');
                    if (!btn) return;

                    var tabs = catTabs.querySelectorAll('.cat-tab');
                    for (var i = 0; i < tabs.length; i++) {
                        tabs[i].classList.remove('active');
                    }
                    btn.classList.add('active');

                    AppState.currentCategory = btn.dataset.cat;
                    AppState.searchQuery = '';
                    document.getElementById('searchBox').value = '';
                    self.renderGradeTabs();
                    self.renderPoemList();
                });
            }

            // 年级选项卡
            var gradeTabs = document.getElementById('gradeTabs');
            if (gradeTabs) {
                gradeTabs.addEventListener('click', function(e) {
                    var btn = e.target.closest('.grade-tab');
                    if (!btn) return;

                    var tabs = gradeTabs.querySelectorAll('.grade-tab');
                    for (var i = 0; i < tabs.length; i++) {
                        tabs[i].classList.remove('active');
                    }
                    btn.classList.add('active');

                    AppState.currentGrade = btn.dataset.grade;
                    AppState.searchQuery = '';
                    document.getElementById('searchBox').value = '';
                    self.renderPoemList();
                });
            }

            // 搜索
            var searchBox = document.getElementById('searchBox');
            if (searchBox) {
                searchBox.addEventListener('input', function() {
                    AppState.searchQuery = this.value.trim();
                    self.renderPoemList();
                });
            }

            // 诗文卡片点击
            var poemList = document.getElementById('poemList');
            if (poemList) {
                poemList.addEventListener('click', function(e) {
                    var card = e.target.closest('.poem-card');
                    if (!card) return;

                    var poemId = card.dataset.poemId;
                    var allPoems = DataAccess.getAllPoems(AppState.currentCategory);
                    var poem = null;
                    for (var i = 0; i < allPoems.length; i++) {
                        if (allPoems[i].id === poemId) {
                            poem = allPoems[i];
                            break;
                        }
                    }

                    if (poem) {
                        self.showDetail(poem);
                    }
                });
            }

            // 关闭模态框
            var modalClose = document.getElementById('modalClose');
            if (modalClose) {
                modalClose.addEventListener('click', function() {
                    self.hideDetail();
                });
            }

            var modal = document.getElementById('detailModal');
            if (modal) {
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        self.hideDetail();
                    }
                });
            }

            // ESC键关闭
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    self.hideDetail();
                }
            });
        }
    };

    // =====================
    // 初始化
    // =====================
    global.ClassicaApp = {
        init: function() {
            if (typeof CLASSICAL_DATA === 'undefined') {
                console.error('数据未加载');
                return;
            }
            UI.init();
        }
    };

    // DOM就绪后初始化
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                ClassicaApp.init();
            });
        } else {
            ClassicaApp.init();
        }
    }

})(typeof window !== 'undefined' ? window : this);
