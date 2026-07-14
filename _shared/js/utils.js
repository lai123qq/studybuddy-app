/* ============================================================
 * StudyBuddy 公共工具函数库
 * 包含：主题管理、使用统计、Toast 提示、Storage 封装、通用工具
 * 使用：<script src="../_shared/js/utils.js"></script>
 * ============================================================ */
(function () {
  'use strict';

  // ============================================================
  // 1. 主题管理
  // ============================================================
  var THEME_KEY = 'studybuddy_theme';

  function applyTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY) || 'light';
      var body = document.body;
      body.classList.remove('theme-dark', 'theme-chinese', 'theme-colorful');
      if (t === 'dark') body.classList.add('theme-dark');
      else if (t === 'chinese') body.classList.add('theme-chinese');
      else if (t === 'colorful') body.classList.add('theme-colorful');
    } catch (e) { /* ignore */ }
  }

  function setTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
      applyTheme();
    } catch (e) { /* ignore */ }
  }

  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'light'; }
    catch (e) { return 'light'; }
  }

  // ============================================================
  // 2. 使用统计
  // ============================================================
  var USAGE_KEY = 'studybuddy_usage';

  function trackUsage() {
    try {
      var u = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
      var today = new Date().toISOString().slice(0, 10);
      if (!u.firstDay) u.firstDay = today;
      if (!u.days) u.days = {};
      u.days[today] = true;
      u.totalDays = Object.keys(u.days).length;
      localStorage.setItem(USAGE_KEY, JSON.stringify(u));
    } catch (e) { /* ignore */ }
  }

  // ============================================================
  // 3. Toast 提示
  // ============================================================
  var toastEl = null;
  var toastTimer = null;

  function ensureToastEl() {
    if (toastEl) return toastEl;
    toastEl = document.createElement('div');
    toastEl.className = 'sb-toast';
    toastEl.innerHTML = '<style>' +
      '.sb-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);' +
      'background:#1e293b;color:#fff;padding:12px 22px;border-radius:999px;' +
      'font-size:13px;font-weight:600;z-index:9999;max-width:80%;' +
      'box-shadow:0 8px 24px -8px rgba(30,41,59,0.3);' +
      'transition:transform .4s cubic-bezier(.4,.2,.2,1),opacity .3s;' +
      'opacity:0;pointer-events:none;font-family:inherit;}' +
      '.sb-toast.show{transform:translateX(-50%) translateY(0);opacity:1;pointer-events:auto;}' +
      '.sb-toast.success{background:#10b981;}' +
      '.sb-toast.warn{background:#f59e0b;}' +
      '.sb-toast.error{background:#ef4444;}' +
      '</style>';
    document.body.appendChild(toastEl);
    return toastEl;
  }

  function showToast(msg, type, duration) {
    var el = ensureToastEl();
    el.textContent = msg;
    el.className = 'sb-toast show' + (type ? ' ' + type : '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
    }, duration || 2000);
  }

  // ============================================================
  // 4. Storage 封装
  // ============================================================
  function storageGet(key, defaultValue) {
    try {
      var v = localStorage.getItem(key);
      if (v == null) return defaultValue;
      return JSON.parse(v);
    } catch (e) { return defaultValue; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { /* ignore */ }
  }

  function storageRemove(key) {
    try { localStorage.removeItem(key); }
    catch (e) { /* ignore */ }
  }

  // ============================================================
  // 5. 通用工具函数
  // ============================================================

  /** 洗牌算法 */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /** 防抖 */
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var ctx = this, args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  /** 节流 */
  function throttle(fn, wait) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, arguments);
      }
    };
  }

  /** DOM 元素安全获取 */
  function $(id) { return document.getElementById(id); }

  /** DOM 元素创建 */
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') e.className = attrs[k];
        else if (k === 'style') e.style.cssText = attrs[k];
        else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else e.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      if (typeof children === 'string') e.textContent = children;
      else if (Array.isArray(children)) {
        children.forEach(function (c) { if (c) e.appendChild(c); });
      }
    }
    return e;
  }

  /** HTML 转义 */
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  /** 日期格式化 YYYY-MM-DD */
  function dateKey(d) {
    d = d || new Date();
    return d.toISOString().slice(0, 10);
  }

  /** 数字补零 */
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  // ============================================================
  // 6. 页面入场动画（从 modal.js 移来，保持兼容）
  // ============================================================
  function pageEnterAnimation() {
    var key = '__sb_nav';
    try {
      var val = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      if (!val) return;
      var s = document.createElement('style');
      s.textContent = '@keyframes __sbPageIn{0%{opacity:0;transform:translateY(12px) scale(.97)}100%{opacity:1;transform:translateY(0) scale(1)}}body{animation:__sbPageIn .32s cubic-bezier(.22,1,.36,1) both}';
      document.head.appendChild(s);
    } catch (e) { /* ignore */ }
  }

  // ============================================================
  // 暴露到全局
  // ============================================================
  window.SBUtils = {
    // 主题
    applyTheme: applyTheme,
    setTheme: setTheme,
    getTheme: getTheme,
    // 使用统计
    trackUsage: trackUsage,
    // Toast
    showToast: showToast,
    // Storage
    storageGet: storageGet,
    storageSet: storageSet,
    storageRemove: storageRemove,
    // 工具函数
    shuffle: shuffle,
    debounce: debounce,
    throttle: throttle,
    $: $,
    el: el,
    escHtml: escHtml,
    dateKey: dateKey,
    pad2: pad2,
    // 动画
    pageEnterAnimation: pageEnterAnimation
  };

  // 自动执行：应用主题 + 统计使用 + 入场动画
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      applyTheme();
      trackUsage();
      pageEnterAnimation();
    });
  } else {
    applyTheme();
    trackUsage();
    pageEnterAnimation();
  }

})();
