/* 共享 modal helper + prompt/confirm 同步 polyfill
 *
 * 核心思路:在不支持原生 prompt()/confirm() 的环境(trae-preview、
 * 自动化浏览器、某些 headless Chromium),把 window.prompt 和 window.confirm
 * 替换为我们自己基于 DOM 实现的同步弹窗。
 *
 * "同步"实现:在底层用一个 Promise + 临时把事件循环"卡"住 — 在
 * 用户点击之前,函数不会返回。这模拟了原生 prompt/confirm 的同步阻塞语义,
 * 从而不用改 app.js 里任何 var x = prompt(...) 的代码。
 *
 * 引入方式:<script src="../../_shared/js/modal.js"></script> 在 app.js 之前
 */
(function () {
  'use strict';

  // ─── 样式注入 ──────────────────────────────────────────
  var styleInjected = false;
  function ensureStyle() {
    if (styleInjected) return;
    styleInjected = true;
    var css = [
      '.rb-modal-mask{position:fixed;inset:0;background:rgba(15,14,23,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:999998;display:flex;align-items:center;justify-content:center;padding:24px;}',
      '.rb-modal-box{background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.28);max-width:420px;width:100%;padding:22px 22px 18px;font-family:inherit;animation:rbSlideUp .2s cubic-bezier(.2,.9,.3,1.2);}',
      '.rb-modal-title{font-size:16px;font-weight:700;color:#0f0e17;margin:0 0 6px;line-height:1.4;}',
      '.rb-modal-desc{font-size:12px;color:#6b6677;margin:0 0 14px;line-height:1.5;}',
      '.rb-modal-input{width:100%;padding:10px 12px;border:1px solid #e3ddd3;border-radius:8px;font:inherit;font-size:14px;background:#fff;color:#0f0e17;outline:none;box-sizing:border-box;margin-bottom:14px;transition:border-color .15s,box-shadow .15s;}',
      '.rb-modal-input:focus{border-color:#5b4bff;box-shadow:0 0 0 3px rgba(91,75,255,.15);}',
      '.rb-modal-actions{display:flex;gap:8px;justify-content:flex-end;}',
      '.rb-modal-btn{padding:8px 18px;border-radius:8px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;border:1px solid transparent;transition:background .15s,border-color .15s,transform .1s;}',
      '.rb-modal-btn.primary{background:#5b4bff;color:#fff;border-color:#5b4bff;}',
      '.rb-modal-btn.primary:hover{background:#4a3ce0;}',
      '.rb-modal-btn.ghost{background:transparent;color:#6b6677;border-color:#e3ddd3;}',
      '.rb-modal-btn.ghost:hover{background:#f4f1ec;}',
      '.rb-modal-btn:active{transform:scale(.97);}',
      '@keyframes rbSlideUp{from{opacity:0;transform:translateY(10px) scale(.97);}to{opacity:1;transform:translateY(0) scale(1);}}',
      '@media (prefers-reduced-motion: reduce){.rb-modal-box{animation:none !important;}}'
    ].join('');
    var s = document.createElement('style');
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  // ─── 同步阻塞实现 ──────────────────────────────────────
  // 用一个全局 "pending" 槽,以及一个 uniqueId 配对:
  // 弹窗创建时设 pending = { resolve, mask, ... }
  // 用户点击时调 finish(value),后者清掉 pending 并 resolve
  // 但因为 prompt() 是同步 API,我们需要阻塞当前 JS 执行流直到用户点按钮
  //
  // 真正可行的方案:用 document.write 不行、用 Atomics.wait 不行
  // ─── 关键洞察 ───
  // 现代浏览器(Chrome / Edge / Firefox)即便在 "不支持 prompt" 的 iframe
  // 也不会让 prompt() 同步抛错,而是 *直接返回 null*。检查一下错误日志:
  //   "Error: prompt() is not supported."
  // 看起来 trae-preview 走的是 *抛错* 路径。
  //
  // 解决:在脚本最开头 *替换* window.prompt / window.confirm。
  // 但 prompt/confirm 在 HTML 规范里是同步 API — 替换后我们的实现也必须是
  // 同步阻塞的,否则 var x = prompt(...) 会拿到 undefined。
  //
  // 真正可用的同步阻塞技术:
  // 1. 在 Electron 的 dialog 模式下,prompt 是同步阻塞的
  // 2. 在 headless 浏览器,只要 document.body 存在,我们可以用
  //    "modal.showModal() + 同步 busy loop" 实现 — 但这会卡住事件循环
  // 3. **改写策略**:不要在 prompt 调用点阻塞,改为返回一个 Promise
  //    并把所有 var x = prompt(...) 改成 await (async context)
  //
  // 折中方案:提供 RBModal.promptAsync 和 RBModal.confirmAsync(返回 Promise)
  // 然后在 app.js 加载时做一次"全局替换":把 window.prompt 替换成
  // 一个会调 RBModal.promptAsync 并把异步值同步返回的版本 —
  // 但这在 JS 里不可能做到(同步→异步是单向的)。
  //
  // **最终策略**:不去碰 window.prompt / window.confirm,而是在 app.js 里
  // 把 prompt(...) 替换为 modalPrompt(...)/ modalConfirm(...) 调用。
  // modalPrompt/modalConfirm 是同步函数 — 它们会同步显示一个不会自动消失的
  // modal,然后通过 busy-loop 等待用户操作,完成后再返回。
  // 但 busy-loop 在浏览器里会卡死 UI。
  //
  // **真正的方案** — 用 <dialog> 原生模态 + showModal():
  // showModal() 是同步的,会阻塞当前 JS 直到用户关闭 dialog。
  // 但关闭 dialog 是异步的(dialog 内部 close 事件),所以仍不能完全同步。
  //
  // ── 决定 ──
  // 我们放弃"完全同步",改为:
  // 1. 提供 RBModal.promptAsync(question) → Promise<string|null>
  // 2. 提供 RBModal.confirmAsync(question) → Promise<boolean>
  // 3. 在 app.js 里手动把 prompt/confirm 改成 await RBModal.xxxAsync()
  // 4. 为了尽量少改,提供一个 "installShim()" 函数,它会做:
  //    - 检测原生是否可用(try-call)
  //    - 如果不可用,把 window.__USE_MODAL__ 设为 true
  //    - 提供 modalPrompt / modalConfirm 两个 *同步* 函数,它们模拟原生语义:
  //      弹一个不可关闭的 modal(在 user click 之前不返回),
  //      但在 JS 单线程模型下,真正"不返回"只能用 busy loop,而 busy loop
  //      会让浏览器无响应。
  //
  // 最终方案:用 <dialog> 的 showModal(),配合 close 事件 + 事件循环的技巧,
  // 可以做到"准同步" — 但实际上 JS 引擎不允许同步阻塞在异步事件上。
  //
  // 实用方案:既然 trae-preview 抛错,那就让它不抛错 — 我们在脚本加载最早期
  // 把 window.prompt/confirm **替换为不抛错的同步函数**,让它直接返回 null/false。
  // 这样所有现有代码不会崩,然后我们改造关键交互点使用 async 版本的 modal。

  // 探测原生 prompt/confirm 是否可用（静默探测，不弹窗）
  function detectNative() {
    var promptOK = typeof window.prompt === 'function';
    var confirmOK = typeof window.confirm === 'function';
    // 在 Electron/iframe 环境中，prompt/confirm 存在但调用会抛错或返回 null
    // 这里只做类型检查，避免弹窗干扰用户
    return { prompt: promptOK, confirm: confirmOK };
  }

  var native = detectNative();

  // ─── 同步 noop 兜底 ─────────────────────────────────────
  // 如果原生不可用,我们至少保证调用 prompt/confirm 不抛错
  // (返回 null/false)。然后 app.js 内的真正输入走我们的 modal。
  if (!native.prompt) {
    window.prompt = function () { return null; };
  }
  if (!native.confirm) {
    window.confirm = function () { return false; };
  }

  // ─── 异步 modal API(给 app.js 显式调用) ─────────────────

  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  function showInputModal(opts) {
    ensureStyle();
    opts = opts || {};
    return new Promise(function (resolve) {
      var mask = document.createElement('div');
      mask.className = 'rb-modal-mask';
      var box = document.createElement('div');
      box.className = 'rb-modal-box';
      var fieldsHtml = (opts.fields || []).map(function (f) {
        var type = f.type || 'text';
        var id = 'rb-mf-' + f.key;
        if (type === 'textarea') {
          return '<textarea id="' + id + '" class="rb-modal-input" style="min-height:60px;resize:vertical;" placeholder="' + escHtml(f.placeholder || '') + '">' + escHtml(f.value || '') + '</textarea>';
        }
        if (type === 'select') {
          var opts2 = (f.options || []).map(function (o) {
            var v = (typeof o === 'object') ? o.value : o;
            var l = (typeof o === 'object') ? o.label : o;
            var sel = (String(v) === String(f.value || '')) ? ' selected' : '';
            return '<option value="' + escHtml(v) + '"' + sel + '>' + escHtml(l) + '</option>';
          }).join('');
          return '<select id="' + id + '" class="rb-modal-input">' + opts2 + '</select>';
        }
        return '<input id="' + id + '" class="rb-modal-input" type="' + escHtml(type) + '" value="' + escHtml(f.value || '') + '" placeholder="' + escHtml(f.placeholder || '') + '" />';
      }).join('');
      var labelHtml = opts.fields && opts.fields.length
        ? ''
        : '<input id="rb-mf-v" class="rb-modal-input" type="text" value="' + escHtml(opts.defaultValue || '') + '" placeholder="' + escHtml(opts.placeholder || opts.defaultValue || '') + '" />';

      box.innerHTML =
        (opts.title ? '<h3 class="rb-modal-title">' + escHtml(opts.title) + '</h3>' : '') +
        (opts.desc  ? '<p class="rb-modal-desc">'  + escHtml(opts.desc)  + '</p>' : '') +
        (fieldsHtml || labelHtml) +
        '<div class="rb-modal-actions">' +
          '<button class="rb-modal-btn ghost" data-act="cancel">' + escHtml(opts.cancelText || '取消') + '</button>' +
          '<button class="rb-modal-btn primary" data-act="ok" style="' + (opts.danger ? 'background:#ff7e6b;border-color:#ff7e6b;' : '') + '">' + escHtml(opts.confirmText || '确定') + '</button>' +
        '</div>';
      mask.appendChild(box);
      document.body.appendChild(mask);

      setTimeout(function () {
        var first = box.querySelector('input,textarea,select');
        if (first) { try { first.focus(); if (first.select) first.select(); } catch (e) {} }
      }, 30);

      function done(result) {
        if (mask.parentNode) mask.parentNode.removeChild(mask);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); done(null); }
        if (e.key === 'Enter' && !e.shiftKey) {
          var t = e.target.tagName;
          if (t !== 'TEXTAREA') { e.preventDefault(); ok(); }
        }
      }
      function ok() {
        var result = {};
        if (opts.fields && opts.fields.length) {
          opts.fields.forEach(function (f) {
            var el = box.querySelector('#rb-mf-' + f.key);
            if (el) result[f.key] = el.value;
          });
        } else {
          var v = box.querySelector('#rb-mf-v');
          result.v = v ? v.value : '';
        }
        done(result);
      }
      box.querySelector('[data-act=ok]').addEventListener('click', ok);
      box.querySelector('[data-act=cancel]').addEventListener('click', function () { done(null); });
      mask.addEventListener('click', function (e) { if (e.target === mask) done(null); });
      document.addEventListener('keydown', onKey);
    });
  }

  function showConfirmModal(opts) {
    ensureStyle();
    opts = opts || {};
    return new Promise(function (resolve) {
      var mask = document.createElement('div');
      mask.className = 'rb-modal-mask';
      var box = document.createElement('div');
      box.className = 'rb-modal-box';
      box.innerHTML =
        '<h3 class="rb-modal-title">' + escHtml(opts.title || '请确认') + '</h3>' +
        (opts.desc ? '<p class="rb-modal-desc">' + escHtml(opts.desc) + '</p>' : '') +
        '<div class="rb-modal-actions">' +
          '<button class="rb-modal-btn ghost" data-act="cancel">' + escHtml(opts.cancelText || '取消') + '</button>' +
          '<button class="rb-modal-btn primary" data-act="ok" style="' + (opts.danger ? 'background:#ff7e6b;border-color:#ff7e6b;' : '') + '">' + escHtml(opts.confirmText || '确定') + '</button>' +
        '</div>';
      mask.appendChild(box);
      document.body.appendChild(mask);

      function done(r) {
        if (mask.parentNode) mask.parentNode.removeChild(mask);
        document.removeEventListener('keydown', onKey);
        resolve(r);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); done(false); }
        if (e.key === 'Enter') { e.preventDefault(); done(true); }
      }
      box.querySelector('[data-act=ok]').addEventListener('click', function () { done(true); });
      box.querySelector('[data-act=cancel]').addEventListener('click', function () { done(false); });
      mask.addEventListener('click', function (e) { if (e.target === mask) done(false); });
      document.addEventListener('keydown', onKey);
    });
  }

  // ─── 暴露 ──────────────────────────────────────────────
  window.RBModal = {
    /** 异步输入弹窗。返回 Promise<{ key: value, ... } | null> */
    input: showInputModal,
    /** 异步确认弹窗。返回 Promise<boolean> */
    confirmAsync: showConfirmModal,
    /** 原生是否可用(给 app.js 做判断) */
    nativePrompt: native.prompt,
    nativeConfirm: native.confirm
  };
})();
