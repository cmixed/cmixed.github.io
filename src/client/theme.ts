/* 主题初始化 / 切换。这个文件在 <head> 里同步执行：
   必须在首帧之前把 data-theme、data-daylight 定下来，否则会闪。
   源码用 TS 写（受 tsc 检查），构建时由 scripts/client-scripts.ts 编译成 dist/theme.js。 */
(() => {
  const h = document.documentElement;
  const stored = localStorage.getItem('theme');
  // 早期版本提供过「手动降级动效」开关，现已移除；清掉遗留的开关状态，
  // 避免旧访客的 localStorage 里留无用键。动效统一完整播放，
  // 仅当系统级 prefers-reduced-motion 生效时由 CSS 降级。
  try {
    localStorage.removeItem('a11y-reduced-motion');
  } catch {
    // 隐私模式等场景下 localStorage 不可用，忽略即可
  }
  if (stored) h.setAttribute('data-theme', stored);
  else if (!matchMedia('(prefers-color-scheme:dark)').matches)
    h.setAttribute('data-theme', 'light');
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change', (e: MediaQueryListEvent) => {
    h.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });

  // 时段柔光：按本地时间给背景加一层极淡的色相偏移（CSS 里按 html[data-daylight] 取色）。
  // 只在这里设一次，之后完全静态，没有任何每帧开销。本脚本在 <head> 同步执行，
  // 所以首帧之前就已生效，不会闪。
  const hour = new Date().getHours();
  const daylight =
    hour < 6 ? 'night' : hour < 9 ? 'dawn' : hour < 17 ? 'day' : hour < 20 ? 'dusk' : 'night';
  h.setAttribute('data-daylight', daylight);

  // 导航玻璃掠光：只在切主题时扫一次（CSS 里 nav::after 的 nav-sheen 动画）。
  // 先移除属性并强制回流，确保同名动画能重新播放。
  // 现在它只在「没有 View Transition」的浏览器里当回落（见下面的 toggleTheme）。
  let sheenTimer: ReturnType<typeof setTimeout> | null = null;
  function playSheen(): void {
    if (sheenTimer) clearTimeout(sheenTimer);
    h.removeAttribute('data-sheen');
    void h.offsetWidth;
    h.setAttribute('data-sheen', '');
    sheenTimer = setTimeout(() => {
      h.removeAttribute('data-sheen');
      sheenTimer = null;
    }, 1300);
  }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const canViewTransition = typeof document.startViewTransition === 'function';

  function applyTheme(t: string): void {
    h.setAttribute('data-theme', t);
    try {
      localStorage.setItem('theme', t);
    } catch {
      // 隐私模式等场景下 localStorage 不可用，忽略即可
    }
  }

  // 圆形揭示：新主题从「你按下的那个开关」处铺满整页，比一条掠光更直觉。
  // 圆心/半径由开关的位置算出来（半径取到最远的那个角，保证铺满）。
  // 揭示期间要临时挂 html.vt：View Transition 抓「新快照」是在下一帧，
  // 如果 body/nav 的 background 过渡正在跑，新快照抓到的是过渡起点（旧颜色），
  // 揭示出来就什么都没变 —— 这条是让整个效果成立的关键。
  function reveal(btn: Element | null, t: string): void {
    let x = innerWidth;
    let y = 0;
    if (btn) {
      const r = btn.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    h.style.setProperty('--vt-x', x + 'px');
    h.style.setProperty('--vt-y', y + 'px');
    h.style.setProperty('--vt-r', radius + 'px');
    h.classList.add('vt');
    const vt = document.startViewTransition(() => {
      applyTheme(t);
    });
    vt.finished
      .finally(() => {
        h.classList.remove('vt');
      })
      .catch(() => {
        // 过渡被跳过（快速连点 / 页面被切走）时会 reject，这里只需要保证 vt 类被摘掉
        h.classList.remove('vt');
      });
  }

  window.toggleTheme = (): string => {
    // 当前主题要看「实际生效」的那一个：跟随系统偏好为暗色时 data-theme 是没有值的
    // （CSS 的 :root 就是暗色），这时如果只读属性会把「暗 → 暗」当成一次切换，
    // 于是第一次点击看起来什么都没发生。
    const current =
      h.getAttribute('data-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const t = current === 'dark' ? 'light' : 'dark';
    if (canViewTransition && !reduceMotion.matches) {
      try {
        reveal(document.getElementById('themeToggle'), t);
      } catch {
        // 个别实现对 startViewTransition 的支持不完整（调用即抛），
        // 这时必须保证「主题切了」这件事仍然发生，再补上掠光回落。
        applyTheme(t);
        playSheen();
      }
    } else {
      applyTheme(t);
      // 系统级「降低动效」时不播掠光；没有 View Transition 的浏览器用它当回落
      if (!reduceMotion.matches) playSheen();
    }
    return t;
  };
})();

export {};
