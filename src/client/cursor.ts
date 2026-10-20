/* 指针特效层：折线尾迹 + 点击波纹 + 光标光晕 + 卡片追光。
   全站共用这一个文件（主页 / 博客 / 小窝 / 404 都引它），一套参数保证表现统一。

   性能约定（这个站的前提是「空闲零开销」）：
   ① 只用一个 canvas、一条 requestAnimationFrame；指针静止 260ms 后循环自停，
      停下来的那一刻画面保持原样（光晕不会被清掉），不再产生任何帧。
   ② 每帧只清「上一帧画过的包围盒」，不清整屏。
   ③ 卡片追光的 CSS 变量按帧节流：每个 pointermove 都写会重绘整张卡。
   ④ prefers-reduced-motion: reduce 时直接不启动（CSS 那边也会把层藏掉）；
      触屏只保留点击波纹 —— 尾迹与光晕是「指针持续存在」才成立的东西。

   源码用 TS 写（受 tsc 检查），构建时由 scripts/client-scripts.ts 编译成 dist/cursor.js。 */
(() => {
  const doc = document;
  const root = doc.documentElement;

  if (typeof requestAnimationFrame !== 'function') return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* --- 强度（中等档）--- */
  const TRAIL_LIFE = 280; /* 尾迹存活 ms */
  const TRAIL_MAX = 14; /* 最多保留几个点 */
  const TRAIL_W = 2.4; /* 最新一段的线宽 */
  const RIPPLE_LIFE = 480; /* 波纹存活 ms */
  const RIPPLE_R = 54; /* 波纹最大半径 */
  const HALO_R = 230; /* 光晕半径 */
  const HALO_EASE = 0.14; /* 光晕跟随的缓动系数（越大跟得越紧） */

  const cv = doc.createElement('canvas');
  cv.className = 'fx-layer';
  cv.setAttribute('aria-hidden', 'true');
  doc.body.appendChild(cv);
  const ctx2d = cv.getContext('2d');
  if (!ctx2d) {
    cv.remove();
    return;
  }
  const ctx: CanvasRenderingContext2D = ctx2d;

  interface Pt {
    x: number;
    y: number;
    t: number;
  }

  interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
  }

  interface Palette {
    trail: string;
    trailA: number;
    halo: string;
    haloA: number;
    ring: string;
    ringA: number;
  }

  let dpr = 1;
  let prevBox: Box | null = null;
  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(innerWidth * dpr);
    cv.height = Math.round(innerHeight * dpr);
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    prevBox = null; /* 尺寸变了，上一帧的脏矩形失效，下一帧整屏重画一次 */
  }
  resize();
  addEventListener('resize', resize, { passive: true });

  /* 两个主题各一套颜色：暗色下用薄荷（比底色亮才叫「光」），
     浅色下只能用 accent 的深青（白在近白底上等于不存在）。 */
  function palette(): Palette {
    if (root.getAttribute('data-theme') === 'light') {
      return {
        trail: '15, 118, 110',
        trailA: 0.3,
        halo: '15, 118, 110',
        haloA: 0.04,
        ring: '15, 118, 110',
        ringA: 0.34,
      };
    }
    return {
      trail: '150, 240, 220',
      trailA: 0.4,
      halo: '150, 235, 215',
      haloA: 0.05,
      ring: '150, 240, 220',
      ringA: 0.42,
    };
  }

  const trail: Pt[] = []; /* 最近的指针轨迹 */
  const ripples: Pt[] = []; /* 点击波纹 */
  let mx = -1e4;
  let my = -1e4; /* 指针真位置 */
  let hx = -1e4;
  let hy = -1e4; /* 光晕的缓动位置 */
  let mouseSeen = false; /* 出现过鼠标（触屏从来不画光晕） */
  let inside = true; /* 指针是否还在窗口里 */
  let raf: number | null = null;

  function addBox(b: Box | null, x: number, y: number, w: number, h: number): Box {
    if (!b) return { x: x, y: y, w: w, h: h };
    const x2 = Math.max(b.x + b.w, x + w);
    const y2 = Math.max(b.y + b.h, y + h);
    b.x = Math.min(b.x, x);
    b.y = Math.min(b.y, y);
    b.w = x2 - b.x;
    b.h = y2 - b.y;
    return b;
  }

  function render(now: number): void {
    if (prevBox) ctx.clearRect(prevBox.x, prevBox.y, prevBox.w, prevBox.h);
    let box: Box | null = null;
    const c = palette();

    /* 光晕（缓动跟随，所以看起来像「光跟得慢半拍」） */
    if (mouseSeen && inside) {
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, HALO_R);
      g.addColorStop(0, 'rgba(' + c.halo + ',' + c.haloA + ')');
      g.addColorStop(0.5, 'rgba(' + c.halo + ',' + c.haloA * 0.42 + ')');
      g.addColorStop(1, 'rgba(' + c.halo + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hx, hy, HALO_R, 0, 6.2832);
      ctx.fill();
      box = addBox(box, hx - HALO_R, hy - HALO_R, HALO_R * 2, HALO_R * 2);
    }

    /* 折线尾迹：相邻点连直线（不用曲线——折线更像数据/电路的笔迹），
       越新越粗越亮，越旧越细越淡。 */
    if (trail.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < trail.length; i++) {
        const p0 = trail[i - 1];
        const p1 = trail[i];
        const k = 1 - (now - p1.t) / TRAIL_LIFE;
        if (k <= 0) continue;
        const t = i / (trail.length - 1);
        ctx.strokeStyle = 'rgba(' + c.trail + ',' + c.trailA * k * t + ')';
        ctx.lineWidth = 0.5 + TRAIL_W * t;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        box = addBox(
          box,
          Math.min(p0.x, p1.x) - 6,
          Math.min(p0.y, p1.y) - 6,
          Math.abs(p0.x - p1.x) + 12,
          Math.abs(p0.y - p1.y) + 12
        );
      }
    }

    /* 点击波纹：一圈向外扩散并淡掉，中心留一点光 */
    for (let j = 0; j < ripples.length; j++) {
      const rp = ripples[j];
      const e = (now - rp.t) / RIPPLE_LIFE;
      if (e < 0 || e > 1) continue;
      const r = 6 + RIPPLE_R * (1 - Math.pow(1 - e, 2));
      ctx.strokeStyle = 'rgba(' + c.ring + ',' + c.ringA * (1 - e) + ')';
      ctx.lineWidth = 1.6 * (1 - e) + 0.4;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, r, 0, 6.2832);
      ctx.stroke();
      ctx.fillStyle = 'rgba(' + c.ring + ',' + c.ringA * 0.5 * (1 - e) + ')';
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, 2.2 * (1 - e), 0, 6.2832);
      ctx.fill();
      box = addBox(box, rp.x - r - 3, rp.y - r - 3, (r + 3) * 2, (r + 3) * 2);
    }

    prevBox = box;
  }

  function tick(now: number): void {
    raf = null;
    while (trail.length && now - trail[0].t > TRAIL_LIFE) trail.shift();
    while (ripples.length && now - ripples[0].t > RIPPLE_LIFE) ripples.shift();

    let haloMoving = false;
    if (mouseSeen) {
      const dx = mx - hx;
      const dy = my - hy;
      if (Math.abs(dx) > 0.35 || Math.abs(dy) > 0.35) {
        hx += dx * HALO_EASE;
        hy += dy * HALO_EASE;
        haloMoving = true;
      } else if (hx !== mx || hy !== my) {
        hx = mx;
        hy = my;
        haloMoving = true;
      }
    }

    render(now);

    /* 尾迹还在、波纹还没完、光晕还在追 → 继续；否则停在这里（画面保留，零开销） */
    if (trail.length > 1 || ripples.length || haloMoving) raf = requestAnimationFrame(tick);
  }

  function ensure(): void {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  addEventListener(
    'pointermove',
    (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!mouseSeen) {
        mouseSeen = true;
        hx = e.clientX;
        hy = e.clientY;
      }
      inside = true;
      mx = e.clientX;
      my = e.clientY;
      trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (trail.length > TRAIL_MAX) trail.shift();
      ensure();
    },
    { passive: true }
  );

  addEventListener(
    'pointerdown',
    (e: PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return;
      ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      ensure();
    },
    { passive: true }
  );

  /* 指针离开窗口：光晕收起（下一帧把它擦掉） */
  doc.addEventListener('mouseout', (e: MouseEvent) => {
    if (e.relatedTarget) return;
    inside = false;
    ensure();
  });
  doc.addEventListener('mouseover', () => {
    if (!inside) {
      inside = true;
      ensure();
    }
  });

  /* --- 卡片追光 ---
     镜面高光跟着指针走（用的是卡片自己的 --mx/--my，见 src/style.css 的「面」）。
     写变量会重绘那一张卡，所以按帧节流；--glare 由 @property 过渡，淡进淡出。 */
  const GLARE_SEL =
    '.stats-box,.project-card,.blog-preview-card,.nook-preview-card,' +
    '.contact-container,.blog-page-card,.nook-card,.blog-nav-post,.e404';
  let lastCard: Element | null = null;
  let px = 0;
  let py = 0;
  let glareRaf: number | null = null;

  function applyGlare(): void {
    glareRaf = null;
    if (!lastCard) return;
    const r = lastCard.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const el = lastCard as HTMLElement;
    el.style.setProperty('--mx', (((px - r.left) / r.width) * 100).toFixed(2) + '%');
    el.style.setProperty('--my', (((py - r.top) / r.height) * 100).toFixed(2) + '%');
  }

  doc.addEventListener(
    'pointermove',
    (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const target = e.target instanceof Element ? e.target : null;
      const card: Element | null = target ? target.closest(GLARE_SEL) : null;
      if (card !== lastCard) {
        if (lastCard) (lastCard as HTMLElement).style.setProperty('--glare', '0');
        lastCard = card;
        if (card) (card as HTMLElement).style.setProperty('--glare', '1');
      }
      if (!card) return;
      px = e.clientX;
      py = e.clientY;
      if (!glareRaf) glareRaf = requestAnimationFrame(applyGlare);
    },
    { passive: true }
  );
})();

export {};
