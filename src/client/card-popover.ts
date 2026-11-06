/**
 * 列表卡片的浮窗开关（博客 / 资源小窝共用）。
 *
 * 卡片正文用 `-webkit-line-clamp: 3` 截断，**只有真的被截掉时才允许显示浮窗** ——
 * 否则每张卡悬停都弹一层，反而比截断本身更吵。判断方式就是量
 * `scrollHeight > clientHeight`：被 clamp 掉的内容仍算在 scrollHeight 里。
 *
 * 另外负责「下方放不下就翻到上方」：浮窗是 absolute 定位在卡片下方 0.5rem 处，
 * 窗口底部的卡片会把浮窗顶出视口，量一次 getBoundingClientRect 再挂 .popover-up。
 *
 * 编译进 dist/list.js（和 search / sort / filter-panel 同组，只有列表页需要）。
 */
(() => {
  const CARD = '.blog-page-card, .nook-card';
  const BODY = '.blog-page-card-desc, .nook-card-desc';

  /* 标签只占一行：能放几个放几个，剩下的隐藏，行尾补「+N」。
     容器是 nowrap，换行检测（offsetTop）在这里没意义，所以逐项累加宽度。
     卡片高度因此与标签数量无关。 */
  function clampTags(): void {
    document
      .querySelectorAll<HTMLElement>('.blog-page-card-tags, .nook-card-tags')
      .forEach((box) => {
        const more = box.querySelector<HTMLElement>('.tag-more');
        if (!more) return;
        const tags = Array.from(box.children).filter(
          (el): el is HTMLElement => el instanceof HTMLElement && el !== more
        );
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
      });
  }

  function measure(): void {
    clampTags();
    document.querySelectorAll<HTMLElement>(CARD).forEach((card) => {
      const body = card.querySelector<HTMLElement>(BODY);
      if (!body) return;
      card.classList.toggle('is-clamped', body.scrollHeight - body.clientHeight > 2);
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

  window.initCardPopover = measure;
})();

declare global {
  interface Window {
    initCardPopover: () => void;
  }
}

export {};
