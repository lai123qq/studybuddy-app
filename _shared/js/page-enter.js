/* 通用初始化：CSS 淡入 + 清除导航标记 */
(function () {
  sessionStorage.removeItem('__sb_nav');
  document.write('<style>@keyframes _pe{from{opacity:0.3}to{opacity:1}}body{animation:_pe 0.18s ease both}</style>');
})();