/* 通用初始化：清除导航标记（不做 opacity 动画，避免 document.write 卡顿） */
(function () {
  sessionStorage.removeItem('__sb_nav');
})();