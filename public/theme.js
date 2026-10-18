(function () {
  var h = document.documentElement;
  var s = localStorage.getItem('theme');
  // 早期版本提供过「手动降级动效」开关，现已移除；清掉遗留的开关状态，
  // 避免旧访客的 localStorage 里留无用键。动效统一完整播放，
  // 仅当系统级 prefers-reduced-motion 生效时由 CSS 降级。
  try {
    localStorage.removeItem('a11y-reduced-motion');
  } catch {
    // 隐私模式等场景下 localStorage 不可用，忽略即可
  }
  if (s) h.setAttribute('data-theme', s);
  else if (!matchMedia('(prefers-color-scheme:dark)').matches)
    h.setAttribute('data-theme', 'light');
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change', function (e) {
    h.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });
  window.toggleTheme = function () {
    var t = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    h.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    return t;
  };
})();
