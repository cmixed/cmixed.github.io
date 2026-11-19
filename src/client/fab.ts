/**
 * 底部居中的导航坞：主页 / 博客 / 资源小窝 / 回到顶部。
 *
 * 它和顶部导航刻意错位：顶部管「本页锚点」（关于 / 项目 / 博客预览 / 联系），
 * 坞管「跨页入口 + 回顶」，四颗在每页都一样，当前所在页高亮。
 * 原先的「回上级 / 直达底部」已撤 —— 前者是层级概念、和固定四颗冲突，
 * 后者的虚拟化精确量高机制随按钮一起删掉（见下方历史注释的移除说明）。
 *
 * 承载页面：主页、博客（列表 + 文章）、资源小窝（列表 + 详情）。由页面统一
 * `<script defer src="…/ui.js">` 引入；markup 由脚本注入，页面里不再各存一份 div。
 * 坞内按钮用独立 class .fab-dock-btn，不复用 .fab-btn —— 后者还挂在文章 / 列表页
 * 导航的「缩进 / 目录 / 搜索 / 筛选」上，改它的尺寸会把导航一起改掉。
 *
 * 路径按当前目录推算，不写死站点根：GitHub Pages 用户站点挂在根，但同样的产物
 * 放到项目路径下也能用。dir 只有 '/'、'/blog/'、'/nook/' 三种取值。
 *
 * 首屏不亮：坞若常驻，1440×900 下它落在 y≈815–868，正好盖住刚调好的
 * 简介第二段（841–867）与事实区横线（896）。所以仍保留滚动淡入 ——
 * 这同时也是「工具坞浮现」而非「常驻应用坞」的交互语言。
 *
 * 图标用内联 SVG 而不是字符：系统字体缺字时会把 U+2302（⌂）画成方框，
 * 和主题色只靠 currentColor 联系，深浅色切换不用另写一套。
 * 源码用 TS 写（受 tsc 检查），构建时由 scripts/client-scripts.ts 编译成 dist/ui.js。
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
   * 到底时的一次轻回弹：内容层上移 6px 再弹回。
   *
   * 不给 html 加 transform —— 那会把整页连同 fixed 的导航、浮动按钮一起位移，
   * 视口边缘露出画布底色，「黑一块」就是这么来的。只动 main / footer，
   * 露出来的仍是 body 的页面底色。顶部不做：内容下移会在导航下方拉出一条空条，
   * 观感收益远不如底部。
   */
  function bounceAtEdge(target: number): void {
    if (reducedMotion()) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (target < max - 1) return;
    playEdge();
  }

  let edgeAt = 0;

  /** 内容层 6px 回弹；520ms 内只播一次，别连发。 */
  function playEdge(): void {
    const now = performance.now();
    if (now - edgeAt < 520) return;
    edgeAt = now;
    const layers = Array.from(document.querySelectorAll<HTMLElement>('main, footer'));
    for (const el of layers) el.classList.remove('edge-bounce');
    void document.body.offsetWidth;
    for (const el of layers) el.classList.add('edge-bounce');
    window.setTimeout(() => {
      for (const el of layers) el.classList.remove('edge-bounce');
    }, 320);
  }

  /**
   * 手势滚到边界后还继续滚：也压一下再回弹。
   *
   * 之前只有点浮动按钮才有阻尼，用户自己滑到顶 / 底什么都没有 —— 那才是最常用的路径。
   * 用方向的「反向」判断，而不是看滚动了多少：到边界后 scrollY 已经不动了，
   * 只能从 wheel / touch 的方向知道用户还在往外推。
   */
  function edgeOnGesture(delta: number): void {
    if (reducedMotion() || delta === 0) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    // 只有底部：顶部继续往外推时什么都不做（见 bounceAtEdge 的说明）
    if (window.scrollY >= max - 1 && delta > 0) playEdge();
  }

  window.addEventListener('wheel', (event) => edgeOnGesture(event.deltaY), { passive: true });

  let touchY = 0;
  window.addEventListener(
    'touchstart',
    (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? 0;
    },
    { passive: true }
  );
  window.addEventListener(
    'touchmove',
    (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? touchY;
      // 手指往上滑 = 内容向上滚 = delta 为正，与 wheel 的 deltaY 同向
      edgeOnGesture(touchY - y);
      touchY = y;
    },
    { passive: true }
  );

  function actionButton(label: string, name: IconName, onClick: () => void): HTMLButtonElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'fab-dock-btn';
    el.title = label;
    el.setAttribute('aria-label', label);
    // 标签同时写进 DOM：桌面 hover 时用 CSS 弹出气泡，键盘聚焦可读，
    // 屏幕阅读器也靠 aria-label 得到同样的名字。
    el.innerHTML = svg(name) + `<span class="fab-dock-label">${label}</span>`;
    el.addEventListener('click', onClick);
    return el;
  }

  /** 当前页所在栏目：'home' | 'blog' | 'nook'。dir 只有三种取值，见文件头注释。 */
  const dir = new URL('.', location.href).pathname;
  const section: 'home' | 'blog' | 'nook' =
    dir === '/blog/' ? 'blog' : dir === '/nook/' ? 'nook' : 'home';

  /* 三颗跨页入口的 href 按当前目录算，不用绝对路径：
     主页用 'blog/' / 'nook/'，子页用 '../' 或 './'，产物挂到任意路径都能用。 */
  const pages: Array<{ key: typeof section; label: string; icon: IconName; href: string }> = [
    { key: 'home', label: '主页', icon: 'home', href: section === 'home' ? './' : '../' },
    {
      key: 'blog',
      label: '博客',
      icon: 'blog',
      href: section === 'home' ? 'blog/' : section === 'blog' ? './' : '../blog/',
    },
    {
      key: 'nook',
      label: '资源小窝',
      icon: 'nook',
      href: section === 'home' ? 'nook/' : section === 'nook' ? './' : '../nook/',
    },
  ];

  const group = document.createElement('div');
  group.className = 'fab-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', '站点导航');

  for (const page of pages) {
    const link = document.createElement('a');
    link.className = 'fab-dock-btn';
    link.href = page.href;
    link.title = page.label;
    link.setAttribute('aria-label', page.label);
    if (page.key === section) {
      link.classList.add('is-current');
      // 当前页的链接可点（刷新用），但语义上标出来给辅助技术
      link.setAttribute('aria-current', 'page');
    }
    link.innerHTML = svg(page.icon) + `<span class="fab-dock-label">${page.label}</span>`;
    group.appendChild(link);
  }

  group.appendChild(
    actionButton('回到顶部', 'up', () => {
      springScrollTo(0);
    })
  );

  document.body.appendChild(group);

  // 首屏不亮：坞若常驻会盖住简介与横线（见文件头），滚一段再淡入。
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
