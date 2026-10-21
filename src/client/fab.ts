/**
 * 右下角浮动操作：回上级 / 回到顶部 / 直达底部。
 *
 * 承载页面：主页、博客（列表 + 文章）、资源小窝（列表 + 详情）。因为三者行为完全一样，
 * 只有第一个按钮的落点随页面层级变化，所以收在同一个经典脚本里，由页面统一
 * `<script defer src="…/ui.js">` 引入 —— 各页各写一份内联脚本，迟早会漂成三种样式、
 * 三种显隐阈值。markup 也由脚本注入，页面里不再有重复的 <div class="fab-group">。
 *
 * 第一个按钮的落点是算出来的，不靠每页写 data 属性：
 *   /             → 站点主页本身没有「上一级」，这一颗省略（只剩 ↑ / ↓）
 *   /blog/        → 站点主页
 *   /blog/x.html  → /blog/（博客主页）
 *   /nook/        → 站点主页
 *   /nook/x.html  → /nook/（资源小窝主页）
 * 也就是「目录页指向父目录，内容页指向所在目录」。
 *
 * 图标用内联 SVG 而不是字符：部分系统缺字体时 U+2302（⌂）会变成方框
 * （导航 RSS 那个 &#9741; 就是前车之鉴）。三颗图标同一套 1.7px 描边，
 * 和主题色只靠 currentColor 联系，深浅色切换不用另写一套。
 *
 * 源码用 TS 写（受 tsc 检查），构建时由 scripts/client-scripts.ts 和 cursor / scrollbar 一起编译成 dist/ui.js。
 */
(() => {
  const ICONS = {
    home: '<path d="M3 11.2 12 4l9 7.2"/><path d="M5.6 9.8v9.4h12.8V9.8"/>',
    up: '<path d="M12 19V5.2"/><path d="m5.8 11.4 6.2-6.2 6.2 6.2"/>',
    down: '<path d="M12 5v13.8"/><path d="m18.2 12.6-6.2 6.2-6.2-6.2"/>',
  } as const;

  type IconName = keyof typeof ICONS;

  function svg(name: IconName): string {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`
    );
  }

  // 系统要求减少动效时，跳转改成瞬移，别逼着前庭敏感的人看一段长滚动
  function behavior(): ScrollBehavior {
    return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  /**
   * 量一次「真实的」页面底部再滚。
   *
   * 主页和文章页把 <section> 交给了 content-visibility: auto：没进过视口的区块
   * 只按 contain-intrinsic-size 的占位高度计高（主页 500px、文章 800px），
   * 所以 document.scrollHeight 在长文里会远小于真实高度（实测 46,065 vs 172,218）。
   * 直接滚到 scrollHeight 等于滚到「估算出来的底部」，滚动途中区块逐节展开，
   * 页面越来越长，于是停在半路 —— 用户看到的就是「卡在第 3 章，再点一次才到底」。
   *
   * 先加类把所有 section 临时展开，读 scrollHeight 顺带强制一次布局（长文实测 3.8ms），
   * 再滚。类要留到下一帧：同一个任务里立刻撤掉的话，还没渲染过的区块会退回占位高度，
   * scrollTo 的目标会跟着被夹小（实测目标 172,264 会被夹回 45,165）。
   * 等一帧之后，contain-intrinsic-size 的 auto 已经记住了真实高度，撤掉类页面不会缩回去。
   */
  function toBottom(): void {
    const root = document.documentElement;
    root.classList.add('fab-measuring');
    const top = root.scrollHeight;
    window.scrollTo({ top, behavior: behavior() });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.remove('fab-measuring'));
    });
  }

  /**
   * 平滑滚动落地后补一脚。
   *
   * 目标高度是点击那一刻量的；如果途中还有别的东西把页面撑长（图片、字体、
   * 另一个还没展开的虚拟化区块），落点仍会差一点。等滚动停下来再量一次，
   * 还差就再滚一次（只补一次，不循环）。用户中途自己滚 / 按键就放手，
   * 不跟用户抢滚动条。scrollend 没有的浏览器用超时兜底。
   */
  function settleAtBottom(): void {
    const root = document.documentElement;
    let done = false;
    let timer = 0;

    const cleanup = (): void => {
      done = true;
      clearTimeout(timer);
      window.removeEventListener('scrollend', settle);
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchstart', cancel);
      window.removeEventListener('keydown', cancel);
    };
    const cancel = (): void => cleanup();
    const settle = (): void => {
      if (done) return;
      cleanup();
      const max = root.scrollHeight - window.innerHeight;
      if (window.scrollY < max - 2) {
        window.scrollTo({ top: max, behavior: 'smooth' });
      }
    };

    window.addEventListener('scrollend', settle, { once: true });
    window.addEventListener('wheel', cancel, { once: true, passive: true });
    window.addEventListener('touchstart', cancel, { once: true, passive: true });
    window.addEventListener('keydown', cancel, { once: true });
    // 19 万像素的平滑滚动实测约 1.5s；给一个比它长的兜底
    timer = window.setTimeout(settle, 2200);
  }

  function actionButton(label: string, name: IconName, onClick: () => void): HTMLButtonElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'fab-btn';
    el.title = label;
    el.setAttribute('aria-label', label);
    el.innerHTML = svg(name);
    el.addEventListener('click', onClick);
    return el;
  }

  function upTarget(): { href: string; label: string } | null {
    const path = location.pathname;
    const dir = new URL('.', location.href).pathname;
    // 根目录就是「主页」本身，再给一颗回主页的按钮只会自链接
    if (dir === '/') return null;

    // 目录页（/blog/、/nook/、/blog/index.html）→ 父目录；内容页（/blog/x.html）→ 所在目录
    const isDirPage = path.endsWith('/') || path.endsWith('/index.html');
    if (isDirPage) return { href: '../', label: '站点主页' };
    if (dir === '/blog/') return { href: './', label: '博客主页' };
    if (dir === '/nook/') return { href: './', label: '资源小窝主页' };
    return { href: './', label: '上级页面' };
  }

  const group = document.createElement('div');
  group.className = 'fab-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', '页面快捷操作');

  const up = upTarget();
  if (up) {
    const link = document.createElement('a');
    link.className = 'fab-btn';
    link.href = up.href;
    link.title = up.label;
    link.setAttribute('aria-label', up.label);
    link.innerHTML = svg('home');
    group.appendChild(link);
  }

  group.appendChild(
    actionButton('返回顶部', 'up', () => {
      window.scrollTo({ top: 0, behavior: behavior() });
    })
  );
  group.appendChild(
    actionButton('直达底部', 'down', () => {
      toBottom();
      if (behavior() === 'smooth') settleAtBottom();
    })
  );

  document.body.appendChild(group);

  // 首屏不亮：右下角凭空冒出三个方块太吵，滚一段再淡入。
  // 阈值跟着页面长度走：长文 400px 后才出现；列表页本身只能滚三四百像素，
  // 固定的 400 会让按钮永远不亮，所以取「可滚距离的 15%，夹在 120～400px 之间」。
  // 只切一次 class，动画交给 CSS 过渡，滚动事件里不写样式。
  let showAfter = 400;
  function measure(): void {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    showAfter = Math.min(400, Math.max(120, scrollable * 0.15));
  }

  let visible = false;
  function sync(): void {
    const next = window.scrollY > showAfter;
    if (next === visible) return;
    visible = next;
    group.classList.toggle('visible', next);
  }

  measure();
  sync();
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    sync();
  });
  // 图片 / 字体进来后页面会变长，阈值跟着重算（重算后要再比对一次，
  // 否则页面变短时按钮会停在亮着的状态）
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      measure();
      sync();
    }).observe(document.body);
  }
})();
