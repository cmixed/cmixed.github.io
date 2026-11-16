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
 * 也就是「目录页指向父目录，内容页指向所在目录」。图标跟落点绑定：
 * 指向站点主页用房子，指回博客 / 小窝用对应栏目的标记。
 *
 * 图标用内联 SVG 而不是字符：系统字体缺字时会把 U+2302（⌂）画成方框，
 * 不同平台的 emoji / 符号字形也各不相同。三颗图标同一套 1.8px 描边，
 * 和主题色只靠 currentColor 联系，深浅色切换不用另写一套；导航里的
 * RSS / 主题 / 目录 / 缩进同样来自 src/lib/icons.ts。
 *
 * 源码用 TS 写（受 tsc 检查），构建时由 scripts/client-scripts.ts 和 cursor / scrollbar 一起编译成 dist/ui.js。
 */
(() => {
  const ICONS = {
    /* 全部走站内同一套线形图标：24×24、1.8px 描边、圆头、currentColor，
       与导航里的 RSS / 主题 / 搜索同源。blog / nook 与两处 favicon 同构 ——
       折角稿纸、等距收纳盒 —— 「点它就回那个栏目」由图形本身说明。 */
    /* 门洞跟着 tag 孔洞一起放大：3.6 宽、5.0 高的拱门在 20px 里才读得出「是扇门」 */
    home: '<path d="M4.4 11.3 12 5.1l7.6 6.2"/><path d="M6.7 9.9v9.2h10.6V9.9"/><path d="M10.2 19.1v-3.2a1.8 1.8 0 0 1 3.6 0v3.2"/>',
    blog: '<path d="M7.4 4.6h6.4l3.2 3.2v11.6H7.4Z"/><path d="M13.8 4.6v3.2h3.2"/><path d="M9.8 12.2h5.4M9.8 15.2h3.8"/>',
    nook: '<path d="M12 5 18.6 8.4v7.2L12 19l-6.6-3.4V8.4Z"/><path d="M5.4 8.4 12 11.8l6.6-3.4M12 11.8V19"/>',
    up: '<path d="M12 18.8V5.4"/><path d="m6.4 11 5.6-5.6 5.6 5.6"/>',
    down: '<path d="M12 5.2v13.4"/><path d="m17.6 12.8-5.6 5.6-5.6-5.6"/>',
  } as const;

  type IconName = keyof typeof ICONS;

  function svg(name: IconName): string {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`
    );
  }

  /* 与 src/lib/spring.ts 同一组参数（构建期由 scripts/build-spring.ts 生成）。
     esbuild 这里只做 transform 不做 bundle，没法 import，靠测试钉住两处一致：
     ζ 0.85 有约 0.6% 的一次过冲，肉眼是「到边界轻轻一顿」，不是振荡。 */
  const SPRING = { zeta: 0.85, omega: 18 } as const;

  let lastY = window.scrollY;
  let lastT = performance.now();
  /** 松手瞬间的速度（px/ms）—— spring 的初值，这一项只能在运行时拿到 */
  let velocity = 0;

  function trackVelocity(): void {
    const now = performance.now();
    const y = window.scrollY;
    const dt = now - lastT;
    if (dt > 0) velocity = (y - lastY) / dt;
    lastY = y;
    lastT = now;
  }
  window.addEventListener('scroll', trackVelocity, { passive: true });

  // 系统要求减少动效时，跳转改成瞬移，别逼着前庭敏感的人看一段长滚动
  function reducedMotion(): boolean {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * 弹簧滚动。
   *
   * scrollTop 不是合成属性，WAAPI 也动不了它，只能逐帧写 —— 但每帧只有一次
   * 解析式求值和一次 scrollTo，不读布局、不碰别的属性，主线程成本可以忽略。
   * u(t) 是归一化到 [0,1] 的位移；ζ<1 时中后段会略过 1，边界那一下回弹就是它。
   */
  function springScrollTo(target: number): void {
    if (reducedMotion()) {
      window.scrollTo(0, target);
      return;
    }
    const start = window.scrollY;
    const distance = target - start;
    // 点击那一刻的速度才是「松手速度」；动画跑起来之后 velocity 会被自己的滚动覆盖
    const startVelocity = velocity;
    if (Math.abs(distance) < 2) {
      bounceAtEdge(target);
      return;
    }
    // 初速度换算成「每秒走完几个行程」，夹一下：滚轮一格的爆冲不该让页面飞出去
    const v0 = Math.max(-1.4, Math.min(1.4, (startVelocity * 1000) / Math.abs(distance)));
    const t0 = performance.now();
    const { zeta, omega } = SPRING;
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    let raf = 0;
    let done = false;

    const stop = (): void => {
      done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
    };
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop);

    const step = (): void => {
      if (done) return;
      const t = (performance.now() - t0) / 1000;
      const e = Math.exp(-zeta * omega * t);
      const u = 1 - e * (Math.cos(wd * t) + ((zeta * omega - v0) / wd) * Math.sin(wd * t));
      window.scrollTo(0, start + u * distance);
      // 收敛就收手：等满 1.1s 会在目标位置空转，滚动事件也跟着多响几百帧
      if (Math.abs(1 - u) < 0.002 || t >= 0.9) {
        window.scrollTo(0, target);
        stop();
        bounceAtEdge(target);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  /**
   * 撞到顶 / 底时的一次轻回弹：整页压 10px 再弹回。
   *
   * html 上的 transform 会临时改变 fixed 的参照 —— 导航和浮动按钮跟着一起弹，
   * 这正是橡皮筋该有的样子。只在滚动收尾时触发一次，420ms 后撤类，静止无 transform。
   */
  function bounceAtEdge(target: number): void {
    // 落在边界就给一次回弹：这是「撞到墙」的确认，不该看用户当时滚得多快
    if (reducedMotion()) return;
    const root = document.documentElement;
    const max = root.scrollHeight - window.innerHeight;
    const atTop = target <= 0.5;
    const atBottom = target >= max - 1;
    if (!atTop && !atBottom) return;
    root.classList.remove('edge-top', 'edge-bottom');
    void root.offsetWidth;
    root.classList.add(atTop ? 'edge-top' : 'edge-bottom');
    window.setTimeout(() => root.classList.remove('edge-top', 'edge-bottom'), 420);
  }

  /**
   * 量一次「真实的」页面底部再滚。
   *
   * 主页（`#about` 除外）和文章页把 <section> 交给了 content-visibility: auto：没进过视口的区块
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
    springScrollTo(top);
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
        // 补的是一两屏以内的余量，再跑一遍 spring 反而像第二段动画，直接落位
        window.scrollTo(0, max);
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

  /**
   * 第一颗按钮「回哪、画什么」。
   *
   * 图标跟落点一一对应，不按页面随意挑：
   *   列表页 → 站点主页（房子图标）
   *   文章页 → 所属栏目（博客的尖括号 / 小窝的立方体）
   * 所以看到哪颗图标，就知道这一下会回到哪一层。
   */
  function upTarget(): { href: string; label: string; icon: IconName } | null {
    const path = location.pathname;
    const dir = new URL('.', location.href).pathname;
    // 根目录就是「主页」本身，再给一颗回主页的按钮只会自链接
    if (dir === '/') return null;

    // 目录页（/blog/、/nook/、/blog/index.html）→ 父目录；内容页（/blog/x.html）→ 所在目录
    const isDirPage = path.endsWith('/') || path.endsWith('/index.html');
    if (isDirPage) return { href: '../', label: '站点主页', icon: 'home' };
    if (dir === '/blog/') return { href: './', label: '博客主页', icon: 'blog' };
    if (dir === '/nook/') return { href: './', label: '资源小窝主页', icon: 'nook' };
    return { href: './', label: '上级页面', icon: 'home' };
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
    link.innerHTML = svg(up.icon);
    group.appendChild(link);
  }

  group.appendChild(
    actionButton('返回顶部', 'up', () => {
      springScrollTo(0);
    })
  );
  group.appendChild(
    actionButton('直达底部', 'down', () => {
      toBottom();
      settleAtBottom();
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
