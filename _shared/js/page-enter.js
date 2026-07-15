/* 通用初始化：CSS 淡入 + 清除导航标记 */
(function () {
  sessionStorage.removeItem('__sb_nav');
  document.write('<style>@keyframes _pe{from{opacity:0;transform:scale(0.98)}to{opacity:1;transform:scale(1)}}body{animation:_pe 0.2s cubic-bezier(.2,.9,.3,1.05) both}</style>');
})();