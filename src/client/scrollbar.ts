/**
 * 整页浮动滚动条。
 *
 * 原生整页滚动条是「经典条」：按定义要占 10px 布局宽度、还会画出自己的轨道，
 * sticky 导航和 hero 就铺不到窗口右缘（右侧永远缺一条缝）。
 * 而 `overflow: overlay` 已从 Chrome 114 移除、`::-webkit-scrollbar { width: 0 }`
 * 又等于没有，所以这条只能自己画：一根 fixed 轨道 + 一枚拇指（样式在
 * style.css「整页浮层滚动条」），几何是 scrollTop 到轨道剩余长度的线性映射。
 * 它不占布局、没有轨道底色，外观与弹窗里那枚拇指同一套 token。
 *
 * 行为：滚动时浮现、停 1.2s 淡出、指针靠近右缘 18px 再浮现；拇指可拖。
 * 触屏不创建（系统自带的浮层条够用，自己这根反而拖不动、还挡点击）；
 * 无 JS 时整页没有滚动条，但滚动本身不受影响。
 *
 * 源码用 TS 写（受 tsc 检查），构建时由 scripts/client-scripts.ts 编译成 dist/scrollbar.js。
 */
(() => {
  // 只在触屏优先的设备上退出。不写成「必须 hover:hover」：触屏笔记本接鼠标时
  // 主指针仍可能报 coarse，那种机器反而更需要这根条；headless / 特殊环境同理。
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

  const HIDE_DELAY = 1200;
  const EDGE = 18;
  const MIN_THUMB = 32;

  const rail = document.createElement('div');
  rail.className = 'page-scrollbar';
  rail.setAttribute('aria-hidden', 'true');
  rail.hidden = true;

  const thumb = document.createElement('div');
  thumb.className = 'page-scrollbar-thumb';
  rail.appendChild(thumb);
  document.body.appendChild(rail);

  let hideTimer = 0;
  let dragging = false;
  let dragStartY = 0;
  let dragStartScroll = 0;

  function viewport(): number {
    return document.documentElement.clientHeight;
  }

  function maxScroll(): number {
    return Math.max(0, document.documentElement.scrollHeight - viewport());
  }

  /** 视口 / 可滚距离 / 拇指高度 / 拇指可走距离 —— 渲染和拖拽共用同一份算法。 */
  function geometry(): { max: number; height: number; travel: number } {
    const vh = viewport();
    const max = maxScroll();
    const height = Math.max(MIN_THUMB, Math.round((vh * vh) / (vh + max)));
    return { max, height, travel: vh - height };
  }

  function render(): void {
    const { max, height, travel } = geometry();
    // 页面没溢出就不该有滚动条（短页面 / 404）
    if (max <= 0) {
      rail.hidden = true;
      rail.classList.remove('is-visible');
      return;
    }
    rail.hidden = false;
    thumb.style.height = `${height}px`;
    thumb.style.transform = `translate3d(0, ${(window.scrollY / max) * travel}px, 0)`;
  }

  function scheduleHide(): void {
    window.clearTimeout(hideTimer);
    if (dragging) return;
    hideTimer = window.setTimeout(() => rail.classList.remove('is-visible'), HIDE_DELAY);
  }

  function reveal(): void {
    if (maxScroll() <= 0) return;
    rail.classList.add('is-visible');
    scheduleHide();
  }

  window.addEventListener(
    'scroll',
    () => {
      render();
      reveal();
    },
    { passive: true }
  );

  window.addEventListener('resize', () => {
    render();
    if (maxScroll() > 0) reveal();
  });

  // 首页的博客 / 资源预览、正文图片都是 load 之后才撑高的，高度变了要重算拇指
  if ('ResizeObserver' in window) {
    new ResizeObserver(render).observe(document.body);
  }

  // 指针靠近右缘时把滚动条叫出来：不用滚也能看到自己在哪儿
  document.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      if (window.innerWidth - event.clientX <= EDGE) reveal();
    },
    { passive: true }
  );

  thumb.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    event.preventDefault();
    const { travel } = geometry();
    if (travel <= 0) return;
    dragging = true;
    dragStartY = event.clientY;
    dragStartScroll = window.scrollY;
    thumb.setPointerCapture(event.pointerId);
    rail.classList.add('is-dragging');
    window.clearTimeout(hideTimer);
  });

  thumb.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const { max, travel } = geometry();
    if (travel <= 0) return;
    // 拖多少像素 → 滚多少内容：拇指走完 travel 正好到底
    const next = dragStartScroll + ((event.clientY - dragStartY) / travel) * max;
    window.scrollTo(0, Math.max(0, Math.min(max, next)));
  });

  function endDrag(event: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    rail.classList.remove('is-dragging');
    if (thumb.hasPointerCapture(event.pointerId)) thumb.releasePointerCapture(event.pointerId);
    scheduleHide();
  }

  thumb.addEventListener('pointerup', endDrag);
  thumb.addEventListener('pointercancel', endDrag);
  // 指针被系统抢走（切窗口等）时也要把拖动状态收干净
  thumb.addEventListener('lostpointercapture', () => {
    if (!dragging) return;
    dragging = false;
    rail.classList.remove('is-dragging');
    scheduleHide();
  });

  render();
})();
