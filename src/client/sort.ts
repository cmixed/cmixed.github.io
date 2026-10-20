/**
 * 博客 / 资源小窝 共用的列表排序。
 *
 * 两页的排序语义完全一样：默认顺序（构建时的顺序，置顶项在最前）与两个日期字段，
 * 所以实现只留一份 —— 之前它内联在博客页里，小窝页没有，两份迟早会漂。
 *
 *   const sorter = window.initListSort({
 *     list: '.blog-page-list',
 *     card: '.blog-page-card',
 *     button: '.list-sort-btn',
 *     onChange: () => search.refresh();
 *   });
 *
 * 约定：
 *   - 按钮上写 data-sort（default / date / updated），卡片上写对应的 data-<key>
 *   - 排序结果同步到 ?sort=；默认顺序不写参数，URL 干净
 *   - 换排序时先回到「原始顺序」再排：同一日期的条目顺序因此是稳定的，
 *     不会因为上一次点过别的排序而换位
 *   - 前进 / 后退由本模块自己监听 popstate；页面只需要管自己的筛选参数
 *
 * 源码用 TS 写（受 tsc 检查），构建时由 scripts/client-scripts.ts 编译成 dist/sort.js。
 */
(() => {
  function initListSort(opts: ListSortOptions): ListSort {
    const list = document.querySelector<HTMLElement>(opts.list);
    const cards = Array.from(document.querySelectorAll<HTMLElement>(opts.card));
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(opts.button));
    const param = opts.param || 'sort';

    // 页面结构不完整时静默退出：排序是锦上添花，不该让整段脚本报错
    if (!list || cards.length === 0) {
      return { apply: () => {}, syncFromUrl: () => {} };
    }

    const original = cards.slice();
    const allowed = new Set(buttons.map((btn) => btn.dataset.sort || 'default'));
    /* 单独取一个非空别名：TS 不会把「外层 const 的收窄」带进下面的闭包 */
    const target: HTMLElement = list;

    function apply(value: string): void {
      const by = allowed.has(value) ? value : 'default';
      const sorted = original.slice();
      if (by !== 'default') {
        const attr = 'data-' + by;
        sorted.sort((a, b) =>
          (b.getAttribute(attr) || '').localeCompare(a.getAttribute(attr) || '')
        );
      }
      // 先拼进 fragment 再一次性挂回列表：只触发一次重排
      const fragment = document.createDocumentFragment();
      sorted.forEach((card) => fragment.appendChild(card));
      target.appendChild(fragment);
      buttons.forEach((btn) => {
        btn.setAttribute('aria-pressed', String((btn.dataset.sort || 'default') === by));
      });
      if (opts.onChange) opts.onChange(by);
    }

    function syncUrl(value: string): void {
      const params = new URLSearchParams(location.search);
      if (value === 'default') params.delete(param);
      else params.set(param, value);
      const qs = params.toString();
      history.pushState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }

    function syncFromUrl(): void {
      apply(new URLSearchParams(location.search).get(param) || 'default');
    }

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const by = btn.dataset.sort || 'default';
        apply(by);
        syncUrl(by);
      });
    });

    window.addEventListener('popstate', syncFromUrl);

    // 初始化：读取 ?sort=，同时把 aria-pressed 与 DOM 顺序摆正
    syncFromUrl();

    return { apply, syncFromUrl };
  }

  window.initListSort = initListSort;
})();

interface ListSortOptions {
  /** 卡片容器（排序就是调整它的子节点顺序）。 */
  list: string;
  /** 列表项选择器。 */
  card: string;
  /** 排序按钮选择器，按钮上带 data-sort。 */
  button: string;
  /** URL 参数名，默认 sort。 */
  param?: string;
  /** 每次重排后调用（页面借它让搜索重新计数）。 */
  onChange?: (sort: string) => void;
}

interface ListSort {
  apply: (sort: string) => void;
  syncFromUrl: () => void;
}

declare global {
  interface Window {
    initListSort: (opts: ListSortOptions) => ListSort;
  }
}

export {};
