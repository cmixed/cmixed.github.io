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

  // 时段柔光：按本地时间给背景加一层极淡的色相偏移（CSS 里按 html[data-daylight] 取色）。
  // 只在这里设一次，之后完全静态，没有任何每帧开销。本脚本在 <head> 同步执行，
  // 所以首帧之前就已生效，不会闪。
  var hour = new Date().getHours();
  var daylight =
    hour < 6 ? 'night' : hour < 9 ? 'dawn' : hour < 17 ? 'day' : hour < 20 ? 'dusk' : 'night';
  h.setAttribute('data-daylight', daylight);

  // 导航玻璃掠光：只在切主题时扫一次（CSS 里 nav::after 的 nav-sheen 动画）。
  // 先移除属性并强制回流，确保同名动画能重新播放。
  var sheenTimer = null;
  function playSheen() {
    if (sheenTimer) clearTimeout(sheenTimer);
    h.removeAttribute('data-sheen');
    void h.offsetWidth;
    h.setAttribute('data-sheen', '');
    sheenTimer = setTimeout(function () {
      h.removeAttribute('data-sheen');
      sheenTimer = null;
    }, 1300);
  }

  window.toggleTheme = function () {
    var t = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    h.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    playSheen();
    return t;
  };
})();
