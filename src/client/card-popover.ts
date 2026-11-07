/**
 * 卡片浮窗的开关（全站五类卡片共用：项目卡 / 博客列表 / 资源列表 / 两个首页预览卡）。
 *
 * 卡片标题只有一行、摘要用 `-webkit-line-clamp: 3` 截断、标签只占一行，**只有真的
 * 被省略时才允许显示浮窗** —— 否则每张卡悬停都弹一层，反而比省略本身更吵。
 * 三种省略的判据不同：
 *   摘要被 clamp 后内容仍算在 scrollHeight 里（scrollHeight > clientHeight）；
 *   标题是 nowrap + ellipsis，横向溢出体现在 scrollWidth > clientWidth；
 *   标签行是「挤不下就藏起来，行尾补 +N」，由 clampTags() 记在 data-more 上。
 *
 * 「有没有省略」这个状态挂在卡片自己身上（.is-clamped），浮窗只认它 —— 页面里不写
 * 任何「这张卡要不要浮窗」的逻辑，新加一类卡片只要补 data-card 与三个内容选择器。
 *
 * 另外两件事：
 *   - 下方放不下就翻到上方（.popover-up）；
 *   - 只有浮窗内容真的超出 --popover-max-h 时，才把 data-scrollable 打开让它可以接指针，
 *     否则浮窗压住下一张卡会把鼠标「挡」在那里（CSS 里默认 pointer-events: none）。
 *
 * 编译进 dist/list.js（和 search / sort / filter-panel 同组，只有列表页需要）。
 */
(() => {
  const CARD = '[data-card]';
  const BODY =
    '.blog-page-card-desc, .nook-card-desc, .blog-preview-card-desc, .nook-preview-card-desc, .project-desc';
  const TITLE =
    '.blog-page-card-title, .nook-card-title, .blog-preview-card-title, .nook-preview-card-title, .project-title';
  const TAGS =
    '.blog-page-card-tags, .nook-card-tags, .blog-preview-card-tags, .nook-preview-card-tags, .project-tech';

  /* 标签只占一行：能放几个放几个，剩下的隐藏，行尾补「+N」。
     容器是 nowrap，换行检测（offsetTop）在这里没意义，所以逐项累加宽度。
     卡片高度因此与标签数量无关；被收起来的个数记在 data-more 上，供 measure 判断「有省略」。 */
  function clampTags(): void {
    document.querySelectorAll<HTMLElement>(TAGS).forEach((box) => {
      const more = box.querySelector<HTMLElement>('.tag-more');
      if (!more) return;
      const tags = Array.from(box.children).filter(
        (el): el is HTMLElement => el instanceof HTMLElement && el !== more
      );
      delete box.dataset.more;
      if (tags.length === 0) return;

      tags.forEach((tag) => {
        tag.hidden = false;
      });
      more.hidden = true;

      const limit = box.clientWidth;
      const gap = parseFloat(getComputedStyle(box).columnGap) || 0;
      let used = 0;
      let fit = 0;
      for (const tag of tags) {
        const next = used + (fit ? gap : 0) + tag.getBoundingClientRect().width;
        if (next > limit) break;
        used = next;
        fit += 1;
      }
      if (fit >= tags.length) return;

      /* 要给「+N」腾位置：放不下就再退一个标签，直到总数 + 计数不超宽 */
      more.hidden = false;
      more.textContent = `+${tags.length - fit}`;
      let moreWidth = more.getBoundingClientRect().width;
      while (fit > 0 && used + gap + moreWidth > limit) {
        fit -= 1;
        used -= tags[fit].getBoundingClientRect().width + (fit ? gap : 0);
        more.textContent = `+${tags.length - fit}`;
        moreWidth = more.getBoundingClientRect().width;
      }
      tags.forEach((tag, index) => {
        tag.hidden = index >= fit;
      });
      box.dataset.more = String(tags.length - fit);
    });
  }

  function measure(): void {
    clampTags();
    document.querySelectorAll<HTMLElement>(CARD).forEach((card) => {
      const body = card.querySelector<HTMLElement>(BODY);
      const title = card.querySelector<HTMLElement>(TITLE);
      const tagRow = card.querySelector<HTMLElement>(TAGS);
      const descCut = body ? body.scrollHeight - body.clientHeight > 2 : false;
      /* 标题的省略号是 text-overflow 画的，没有「隐藏内容」可量，只能比宽度。
         +1 容差：小数宽度在缩放 / 子像素排版下会自己差一点，差 1px 不算截断。 */
      const titleCut = title ? title.scrollWidth - title.clientWidth > 1 : false;
      const tagsCut = Number(tagRow?.dataset.more ?? 0) > 0;
      card.classList.toggle('is-clamped', descCut || titleCut || tagsCut);

      /* 浮窗内容超出最大高度时才允许指针进入（能滚才有意义）；
         量的是滚动区，不是外框 —— 外框不滚。 */
      const pop = card.querySelector<HTMLElement>('.card-popover');
      const panel = pop?.querySelector<HTMLElement>('.card-popover-body');
      if (pop && panel) {
        pop.dataset.scrollable = String(panel.scrollHeight - panel.clientHeight > 2);
      }
    });
  }

  function flipUp(card: HTMLElement): void {
    const pop = card.querySelector<HTMLElement>('.card-popover');
    if (!pop) return;
    card.classList.remove('popover-up');
    if (pop.getBoundingClientRect().bottom > window.innerHeight - 8) {
      card.classList.add('popover-up');
    }
  }

  /* 指针进入卡片时才量浮窗位置：每张卡在悬停期间只算一次，
     比在 pointermove 里算便宜得多。 */
  document.addEventListener('pointerover', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const card = target.closest<HTMLElement>(CARD);
    if (card?.classList.contains('is-clamped')) flipUp(card);
  });

  let queued = false;
  function schedule(): void {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      measure();
    });
  }

  window.addEventListener('load', measure);
  window.addEventListener('resize', schedule, { passive: true });
  schedule();

  /* 首页的博客 / 资源预览是 fetch 之后才插进来的，脚本执行时那批卡还不存在。
     盯住两个网格的 childList，卡片一落地就重新量一次。 */
  if ('MutationObserver' in window) {
    const observer = new MutationObserver(schedule);
    document
      .querySelectorAll('.blog-preview-grid, .nook-preview-grid')
      .forEach((grid) => observer.observe(grid, { childList: true }));
  }

  window.initCardPopover = measure;
})();

declare global {
  interface Window {
    initCardPopover: () => void;
  }
}

export {};
