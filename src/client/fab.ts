/**
 * 底部居中的导航坞：主页 / 博客 / 资源小窝 / 回到顶部 / 直达底部 / 首行缩进 / 目录 / 筛选 / 帮助。
 *
 * 它和顶部导航刻意错位：顶部管「本页锚点」（关于 / 项目 / 博客预览 / 联系），
 * 坞管「跨页入口 + 上下跳转 + 本页工具」。跨页三颗与上下两颗每页都一样（回顶 /
 * 回底成对），首行缩进与目录只出现在博客文章页，筛选只出现在博客 / 小窝列表页，
 * 当前所在页高亮。「回上级」不做 —— 层级概念和固定几颗冲突，面包屑已在导航里。
 * 深浅模式**不在坞内**：它留在导航栏最右端（见下方注释）。
 *
 * 承载页面：主页、博客（列表 + 文章）、资源小窝（列表 + 详情）。由页面统一
 * `<script defer src="…/ui.js">` 引入；markup 由脚本注入，页面里不再各存一份 div。
 * 坞内按钮用独立 class .fab-dock-btn，不复用 .fab-btn —— 后者还挂在列表页导航的
 * 「搜索 / 筛选」上，改它的尺寸会把导航一起改掉。
 * （缩进与目录原本也是 .fab-btn，搬进坞时摘掉换成 .fab-dock-btn，见下方注释。）
 *
 * 路径按当前目录推算，不写死站点根：GitHub Pages 用户站点挂在根，但同样的产物
 * 放到项目路径下也能用。dir 只有 '/'、'/blog/'、'/nook/' 三种取值。
 *
 * 常驻显示，不再随滚动淡入：显隐交给导航栏右上角那颗开关，状态存 localStorage，
 * 默认开。开关按钮插在主题钮之前 —— 各页模板不用各写一份。
 *
 * 首行缩进、目录、筛选是「借」不是「另建」：文章页导航里原本就有
 * #indentToggle / #tocToggle，列表页有 #filterToggle，内联脚本与 filter-panel.ts
 * 都按 id 找人（切 body.indent / body.toc-open / html.filters-open）、自己也切
 * .active。移到坞里，监听器跟着节点走，一处都不用改；再补 .fab-dock-btn，
 * 尺寸 / 分隔线 / 焦点环就和邻座完全一致。
 *
 * 借来的钮必须能还：坞一关，它们回填导航栏原位（导航在 ≤480px 本来就把缩进
 * 撤掉让位，回填后那条规则继续生效）。搬走前在原位插一条注释锚点，回填时插到
 * 它后面；锚点一直留着，反复开关也不会越积越多。回填同时把类名还原（补回
 * .fab-btn）并把坞内气泡标签收起。
 *
 * 深浅模式不进坞：它留在导航栏最右端，位置与样式一点没动 —— theme.js 的圆形
 * 揭示圆心、keys.js 的 aria-keyshortcuts、各页内联绑定全都不受影响。
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
    /* 直达底部：和 up 同一几何、方向相反，成对出现才读得出「这是一对跳转」 */
    down: '<path d="M12 5.2v13.4"/><path d="m6.4 13 5.6 5.6 5.6-5.6"/>',
    /* 帮助：圆圈 + 问号，和快捷键帮助面板（keys.js 的 F1 / ?）同一件事。
       坞里最后一颗，用「?」比文字更省宽度，标签气泡补全称。 */
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.4a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2-2.6 3.8"/><path d="M12 17.2h.01"/>',
    /* 导航栏上的坞开关：一块屏幕 + 底部一条胶囊，指向「这条坞」。
       开 / 关两态靠 aria-pressed 与按钮底色区分，不另画第二枚图标。 */
    dock: '<rect x="3.2" y="4.6" width="17.6" height="14.8" rx="2.4"/><rect x="7.4" y="14.6" width="9.2" height="2.6" rx="1.3"/>',
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
  /* 每一段程序化滚动递增一次序号；延迟校准用「自己那次」的序号判断是否还该继续。
     没有它，连点「直达底部」再点「回到顶部」时，前者 1s 后那次补滚会回来抢
     scrollTo，页面停在不该停的地方 —— 实测就是「点回顶没反应」。 */
  let navSeq = 0;
  /** 正在跑的动画的中止函数：新跳转必须先掐掉旧的，否则两段动画逐帧互相覆盖 */
  let runningStop: ((interrupted?: boolean) => void) | null = null;

  function springScrollTo(target: number): void {
    // 中止上一段（算「被新动作打断」，会让旧校准失效）
    if (runningStop) runningStop();
    navSeq += 1;

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

    /* interrupted 区分两种收尾：用户自己滚/按方向键打断（true，需让校准失效）
       和动画正常走到终点（false，不能误伤刚发起的校准）。 */
    const stop = (interrupted = true): void => {
      if (done) return;
      done = true;
      if (interrupted) navSeq += 1;
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', onInterrupt);
      window.removeEventListener('touchstart', onInterrupt);
      window.removeEventListener('keydown', onInterrupt);
      if (runningStop === stop) runningStop = null;
    };
    /* stop 带参数，不能直接当 EventListener（签名对不上），包一层零参的。
       事件触发即「用户自己动了手」，一律算打断。 */
    const onInterrupt = (): void => stop();
    runningStop = stop;
    window.addEventListener('wheel', onInterrupt, { passive: true });
    window.addEventListener('touchstart', onInterrupt, { passive: true });
    window.addEventListener('keydown', onInterrupt);

    const step = (): void => {
      if (done) return;
      const t = (performance.now() - t0) / 1000;
      const e = Math.exp(-zeta * omega * t);
      const u = 1 - e * (Math.cos(wd * t) + ((zeta * omega - v0) / wd) * Math.sin(wd * t));
      window.scrollTo(0, start + u * distance);
      // 收敛就收手：等满 1.1s 会在目标位置空转，滚动事件也跟着多响几百帧
      if (Math.abs(1 - u) < 0.002 || t >= 0.9) {
        window.scrollTo(0, target);
        stop(false);
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

  /**
   * 直达底部。
   *
   * 目标高度要现算：页面在滚动中可能继续变长（图片解码、预览卡 fetch 回来、
   * 小窝列表插入），点下去那一刻的 scrollHeight 未必是终点。所以滚到底之后
   * 再校准 —— 只补两次，且已经到位就不再动，避免长页面里反复重启动画。
   */
  function scrollToBottom(): void {
    const bottom = (): number => document.documentElement.scrollHeight - window.innerHeight;
    springScrollTo(bottom());
    // 自己这一代的序号：期间用户点了别的跳转（navSeq 变了）就放弃校准
    let seq = navSeq;
    let passes = 0;
    const settle = (): void => {
      if (seq !== navSeq || passes >= 2) return;
      passes += 1;
      const max = bottom();
      // 已经贴底就收手；弹簧本身会调 bounceAtEdge，不用再补一次回弹
      if (window.scrollY >= max - 2) return;
      springScrollTo(max);
      seq = navSeq;
      window.setTimeout(settle, 1000);
    };
    window.setTimeout(settle, 1000);
  }

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

  /* 回顶 / 回底成对：只有回顶的话，长文读到一半想直接看结尾就只能一路滑。 */
  group.appendChild(actionButton('直达底部', 'down', scrollToBottom));

  /* 深浅模式不再入坞：它留在导航栏、并且固定在最右。
     页面上散落的内联 click 绑定（列表 / 文章 / 404 页）、theme.js 的揭示圆心、
     keys.js 的 aria-keyshortcuts 都按 #themeToggle 找人 —— 保持原位就一行都不用改。
     这里只负责两件事：拿到它的父容器（坞开关要插在它前面），以及确保它在末尾。 */
  const themeToggle = document.getElementById('themeToggle');
  const navRight =
    themeToggle?.parentElement ??
    document.querySelector<HTMLElement>(
      '.nav-right, .blog-nav-right, .nook-nav-right, .nook-detail-nav-right'
    );

  /* 坞开关插在主题钮之前 —— 主体钮因此天然仍在最右。
     主题钮本来就在各页导航的最末，但别依赖模板的书写顺序：显式挪到末尾，
     模板将来在前面加了按钮也不会把它挤到中间。已经在末尾时不动（避免无谓的节点移动）。 */
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'dock-toggle';
  toggle.id = 'dockToggle';
  toggle.innerHTML = svg('dock');
  if (themeToggle) {
    navRight?.insertBefore(toggle, themeToggle);
    if (navRight && navRight.lastElementChild !== themeToggle) {
      navRight.appendChild(themeToggle);
    }
  } else {
    navRight?.appendChild(toggle);
  }

  /* 帮助放坞最右：复用 keys.js 的快捷键面板（? / F1），点一下就开。
     fab.ts 在 ui.js 里先于 keys.ts 跑，但回调要等到点击时才执行，那时
     window.siteKeys 已经挂上了。
     先建它再搬下面两颗：它是坞内的插入锚点（insertBefore(helpBtn)）。 */
  const helpBtn = actionButton('帮助', 'help', () => {
    window.siteKeys?.toggleHelp();
  });
  group.appendChild(helpBtn);

  /* ===== 借来的按钮：坞关掉时回填导航栏 =====
     首行缩进 / 目录本来就活在文章页导航里，坞只是借用。坞一关，它们回原位 ——
     导航栏在极窄屏（≤480px）本来就把缩进撤掉让位，回填后那条规则继续生效，
     而坞开着的期间极窄屏也能切缩进（坞是独立胶囊，不跟导航抢宽度）。
     做法：搬走之前先在原位插一条注释锚点，回填时插到锚点之后；锚点一直留着，
     反复开关不会越积越多（一条 el 只对应一条锚点）。 */
  interface Borrowed {
    el: HTMLElement;
    /** 导航栏里的原位标记（注释节点，不渲染、不改布局） */
    anchor: Comment;
    /** 坞内气泡标签，回填时收起 —— 它是绝对定位，留在导航钮里会飘在按钮上方 */
    label: HTMLElement;
    /** 回填时要补回的类（两者原本都是 .fab-btn） */
    restoreClass: string | null;
  }
  const borrowed: Borrowed[] = [];

  function borrow(el: HTMLElement, name: string, restoreClass: string | null): void {
    const parent = el.parentNode;
    if (!parent) return;
    const anchor = document.createComment('dock-home');
    parent.insertBefore(anchor, el);
    const label = document.createElement('span');
    label.className = 'fab-dock-label';
    label.textContent = name;
    el.appendChild(label);
    borrowed.push({ el, anchor, label, restoreClass });
  }

  /* 首行缩进与目录是文章页导航里的两颗内容开关，坞把它们借过来。
     内联脚本按 id 找人（#indentToggle 切 body.indent、#tocToggle 切 body.toc-open），
     DOM 移动不丢监听器；.active 也由内联脚本自己切，坞里补一条同色规则即可。
     只有博客文章页有这两个元素 —— 别的页坞里自然少两颗，顺序不受影响。
     顺序照抄导航里的书写顺序（缩进在前、目录在后），换到坞里认的还是同一套。 */
  const indentToggle = document.getElementById('indentToggle');
  if (indentToggle) {
    indentToggle.setAttribute('aria-label', '首行缩进');
    borrow(indentToggle, '首行缩进', 'fab-btn');
  }

  const tocToggle = document.getElementById('tocToggle');
  if (tocToggle) {
    tocToggle.setAttribute('aria-label', '目录');
    borrow(tocToggle, '目录', 'fab-btn');
  }

  /* 标签 / 分类筛选是列表页导航里的那颗 #filterToggle（博客叫「标签」、小窝叫
     「分类」，两页的 title 各自写着）。同样借进坞：filter-panel.ts 早于 ui.js
     执行并按 id 取到节点、绑好监听，之后移动 DOM 不影响；.active 与
     data-filtered 小圆点都由它自己维护，坞内样式已经覆盖。
     标签文案取按钮自己的 title，博客 / 小窝各自显示对的词。
     ≤1279px 时 CSS 仍把 #filterToggle 隐藏（标签区在列表上方常显，开关没意义），
     那条规则进了坞照样生效 —— 手机上不会多出一颗无用的按钮。 */
  const filterToggle = document.getElementById('filterToggle');
  if (filterToggle) {
    borrow(filterToggle, filterToggle.title || '筛选', 'fab-btn');
  }

  /** 搬进坞：按 borrowed 的顺序插在帮助之前（缩进 → 目录 → 筛选 → 帮助） */
  function moveToDock(): void {
    for (const item of borrowed) {
      item.el.classList.remove('fab-btn');
      item.el.classList.add('fab-dock-btn');
      item.label.hidden = false;
      group.insertBefore(item.el, helpBtn);
    }
  }

  /** 回填原位：还原类名与外观，标签收起 */
  function moveHome(): void {
    for (const item of borrowed) {
      item.el.classList.remove('fab-dock-btn');
      if (item.restoreClass) item.el.classList.add(item.restoreClass);
      item.label.hidden = true;
      // 坞初始就是关的：元素从没离开原位，锚点后面就是它自己，跳过即可
      if (item.el.previousSibling === item.anchor) continue;
      item.anchor.parentNode?.insertBefore(item.el, item.anchor.nextSibling);
    }
  }

  document.body.appendChild(group);

  /* 导航栏右上角的坞开关：正好占主题钮腾出来的位置，各页模板不用改。
     aria-pressed 表「坞当前显示」，状态存 localStorage，默认开 ——
     常驻显示是这次的要求，用户想收起来就自己收，刷新后仍记得。 */
  const DOCK_KEY = 'dock';

  function applyDock(on: boolean): void {
    // 借来的按钮跟着坞走：开就搬进来，关就回填导航栏
    if (on) moveToDock();
    else moveHome();
    group.classList.toggle('is-off', !on);
    group.toggleAttribute('inert', !on);
    toggle.setAttribute('aria-pressed', String(on));
    const label = on ? '隐藏导航坞' : '显示导航坞';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  }

  let dockOn = true;
  try {
    dockOn = localStorage.getItem(DOCK_KEY) !== 'off';
  } catch {
    // 隐私模式下 localStorage 不可用，按默认显示处理
  }
  applyDock(dockOn);
  toggle.addEventListener('click', () => {
    dockOn = !dockOn;
    applyDock(dockOn);
    try {
      localStorage.setItem(DOCK_KEY, dockOn ? 'on' : 'off');
    } catch {
      // 同上：写不进去不影响本次会话的开关
    }
  });
})();
