/**
 * 手机版「卡片预览」模式：小屏没有 hover，五类卡片的浮窗在 @media (hover:none) 下
 * 被刻意关掉（浮窗会盖住下一张卡），于是被省略的标题 / 摘要 / 标签就没处看。
 * 这颗按钮给出一个显式的替代入口：进入预览模式后，点卡片不再跳走，而是用
 * <dialog> 弹出该卡的完整内容。
 *
 * 三条设计约束：
 *   1. 内容同源 —— 浮窗内容直接搬卡片里的 .card-popover-body，不额外取数、不改模板。
 *      art 列表 / nook 列表 / 首页两个预览卡 / 项目卡都是同一份结构，新增一类也自动生效。
 *   2. 模态交给原生 <dialog> —— 背景滚动锁、焦点陷阱、Esc / 点遮罩关闭、关闭后焦点归位
 *      全是浏览器给的，和 #siteModal / 快捷键面板同构；不手写一套。
 *   3. 只在「有卡片的小屏」出现 —— 文章页 / 详情页没有卡片，按钮没有意义。
 *      用 html[data-has-cards] 标记，检测放在 rAF + load + MutationObserver 三处，
 *      首页预览卡是 fetch 之后才插进来的，脚本执行时那批卡还不存在。
 *
 * 进入模式不改卡片 DOM、不改链接 href：只在捕获阶段拦一次 click 的跳转，
 * 关掉模式就完全恢复原样。这比「把 <a> 换成 <button>」安全 —— 后者要改五类模板，
 * 还要把键盘 / 右键 / 新标签页打开全部重写一遍。
 *
 * 经典脚本（和 fab / keys 同组进 ui.js），无顶层 import / export。
 */
(() => {
  const CARD = '[data-card]';
  const POPOVER_BODY = '.card-popover-body';
  const CLOSE_PATH =
    'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';

  const root = document.documentElement;
  let toggle: HTMLButtonElement | null = null;
  let dialog: HTMLDialogElement | null = null;
  let active = false;

  /* 卡片预览是「本页能做的一件事」，和缩进 / 目录 / 筛选同类，所以它就该在坞里 ——
     早先做成坞外的一颗独立浮层按钮，理由是「模式开关要和导航动作分开」，
     但结果是手机上同时飘着两个控件，且它的位置还要手工算在坞上方。
     现在（2026-11-20）并进坞：按钮直接长成 .fab-dock-btn 的样子，
     坞的玻璃、分隔线、焦点环、气泡标签全部继承，自己只剩「显隐条件」这一件事。
     fab 先于本文件执行、坞一定已存在；找不到坞才退回 body（防御性分支，
     正常产物走不到）。插在坞的最后一颗（帮助）之前，保持「帮助永远在最右」。 */
  function ensureToggle(): HTMLButtonElement {
    if (toggle) return toggle;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-preview-toggle fab-dock-btn';
    btn.id = 'cardPreviewToggle';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', '开启卡片预览');
    btn.title = '卡片预览';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="M4.6 12S7.7 6.4 12 6.4 19.4 12 19.4 12 16.3 17.6 12 17.6 4.6 12 4.6 12Z"/><circle cx="12" cy="12" r="2.4"/></svg>' +
      '<span class="fab-dock-label">卡片预览</span>';
    btn.addEventListener('click', () => setMode(!active));
    const dock = document.querySelector<HTMLElement>('.fab-group');
    if (dock) {
      // 插在最后一颗（帮助）之前；坞为空时 appendChild 等价
      const last = dock.lastElementChild;
      if (last) dock.insertBefore(btn, last);
      else dock.appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }
    toggle = btn;
    return btn;
  }

  /* 弹窗结构跟 #siteModal / 快捷键面板一致：标题栏 + 关闭钮 + 滚动正文区。
     材质、圆角、::backdrop、焦点环全部继承 .site-modal，这里只填内容与类名。 */
  function ensureDialog(): HTMLDialogElement {
    if (dialog) return dialog;
    const el = document.createElement('dialog');
    el.className = 'site-modal card-preview-modal';
    el.setAttribute('aria-labelledby', 'cardPreviewTitle');
    el.innerHTML =
      '<div class="site-modal-head">' +
      '<div class="site-modal-heading">' +
      '<h2 class="site-modal-title" id="cardPreviewTitle">卡片预览</h2>' +
      '<p class="site-modal-sub">完整内容 · Esc 关闭</p>' +
      '</div>' +
      '<button type="button" class="site-modal-close" aria-label="关闭">' +
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${CLOSE_PATH}"/></svg>` +
      '</button>' +
      '</div>' +
      '<div class="site-modal-body"></div>';
    el.querySelector('.site-modal-close')?.addEventListener('click', () => el.close());
    // 点遮罩关闭：dialog 自身的点击里 target 才是 dialog（点在面板内是子元素）
    el.addEventListener('click', (event) => {
      if (event.target === el) el.close();
    });
    document.body.appendChild(el);
    dialog = el;
    return el;
  }

  function setMode(on: boolean): void {
    active = on;
    root.classList.toggle('card-preview-mode', on);
    const btn = ensureToggle();
    const label = on ? '退出预览' : '卡片预览';
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? '退出卡片预览' : '开启卡片预览');
    btn.title = label;
    // 坞内气泡标签跟着状态改词，和邻座的「回到顶部」一样是名词性的短标签
    const text = btn.querySelector('.fab-dock-label');
    if (text) text.textContent = label;
    if (!on && dialog?.open) dialog.close();
  }

  function openCard(card: HTMLElement): void {
    const source = card.querySelector<HTMLElement>(POPOVER_BODY);
    if (!source) return;
    const el = ensureDialog();
    // 搬浮窗的完整一份（标题 / 副标题 / 摘要 / 全部标签 / 元信息），不重新拼 HTML
    const body = el.querySelector<HTMLElement>('.site-modal-body');
    if (body) body.innerHTML = source.innerHTML;
    // 标题栏用卡片自己的标题，让人知道在看哪张；取不到就留通用名
    const title = card.querySelector<HTMLElement>(
      '.project-title, .blog-page-card-title, .nook-card-title, .blog-preview-card-title, .nook-preview-card-title'
    );
    const heading = el.querySelector<HTMLElement>('#cardPreviewTitle');
    if (heading && title?.textContent) heading.textContent = title.textContent.trim();
    if (el.open) el.close();
    el.showModal();
  }

  /* 捕获阶段拦截：冒泡阶段 imgsrc / 列表搜索各自的 handler 可能已经先动了，
     捕获能保证「预览模式下点卡片」只有一条路径。
     下载按钮是卡片里的另一个交互点（nook 列表），放过它，别把下载也吞掉。 */
  document.addEventListener(
    'click',
    (event) => {
      if (!active || event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.nook-download, .site-modal, .card-preview-toggle')) return;
      const card = target.closest<HTMLElement>(CARD);
      if (!card) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openCard(card);
    },
    { capture: true }
  );

  /* 页面有卡片才显示按钮：rAF 覆盖同步渲染，load 兜首页 fetch 的预览卡，
     MutationObserver 盯两个异步网格，卡片落地就亮。 */
  function syncHasCards(): void {
    if (document.querySelector(CARD)) root.setAttribute('data-has-cards', '');
    else root.removeAttribute('data-has-cards');
  }
  // 按钮一开始就挂进 DOM（显隐完全交给 CSS 的两个条件），不要等到第一次 setMode
  ensureToggle();
  requestAnimationFrame(syncHasCards);
  window.addEventListener('load', syncHasCards);
  if ('MutationObserver' in window) {
    const observer = new MutationObserver(syncHasCards);
    document
      .querySelectorAll('.blog-preview-grid, .nook-preview-grid')
      .forEach((grid) => observer.observe(grid, { childList: true }));
  }
})();
