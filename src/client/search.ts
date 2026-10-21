/**
 * 博客 / 资源小窝 共用的列表实时搜索。
 *
 * 只负责搜索自身的状态：输入、清除、快捷键、?q= 同步、分词匹配、计数与空态。
 * 页面已有的标签 / 分类筛选通过 extraFilter 回调传入，二者按 AND 叠加。
 *
 *   const search = window.initListSearch({
 *     inputId: 'searchInput',
 *     clearId: 'searchClear',
 *     countId: 'searchCount',
 *     emptyId: 'searchEmpty',
 *     cardSelector: '.blog-page-card',
 *     countUnit: '篇文章',
 *     extraFilter: (card) => true
 *   });
 *   search.refresh(); // 页面切换标签 / 分类或重新排序后调用
 *
 * 源码用 TS 写（受 tsc 检查），构建时由 scripts/client-scripts.ts 和 sort 一起编译成 dist/list.js。
 */
(() => {
  function tokenize(query: string): string[] {
    return query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t);
  }

  // 每个 token 都必须是 data-search 的子串（AND），大小写不敏感，天然支持中文
  function matches(card: Element, tokens: string[]): boolean {
    const key = card.getAttribute('data-search') || '';
    for (let i = 0; i < tokens.length; i++) {
      if (key.indexOf(tokens[i]) === -1) return false;
    }
    return true;
  }

  function isTyping(): boolean {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable === true
    );
  }

  window.initListSearch = (opts: ListSearchOptions): ListSearch => {
    const input = document.getElementById(opts.inputId) as HTMLInputElement | null;
    if (!input)
      return {
        refresh: () => {},
        getQuery: () => '',
      };
    /* 单独取一个非空别名：TS 不会把「外层 const 的收窄」带进下面的闭包 */
    const field: HTMLInputElement = input;

    const clearBtn = opts.clearId ? document.getElementById(opts.clearId) : null;
    const countEl = opts.countId ? document.getElementById(opts.countId) : null;
    const emptyEl = opts.emptyId ? document.getElementById(opts.emptyId) : null;
    const cards = Array.from(document.querySelectorAll<HTMLElement>(opts.cardSelector));
    const unit = opts.countUnit || '条';
    const extraFilter = opts.extraFilter || (() => true);
    let query = '';
    let tokens: string[] = [];

    function apply(): number {
      let visible = 0;
      for (let i = 0; i < cards.length; i++) {
        const ok = extraFilter(cards[i]) && matches(cards[i], tokens);
        cards[i].style.display = ok ? '' : 'none';
        if (ok) visible++;
      }
      if (countEl) {
        if (tokens.length) {
          countEl.hidden = false;
          countEl.textContent = '找到 ' + visible + ' ' + unit;
        } else {
          countEl.hidden = true;
        }
      }
      if (emptyEl) emptyEl.hidden = visible !== 0;
      if (clearBtn) clearBtn.hidden = !field.value;
      return visible;
    }

    function syncUrl(): void {
      const params = new URLSearchParams(location.search);
      if (query) params.set('q', query);
      else params.delete('q');
      const qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }

    function setQuery(value: string): void {
      query = value;
      tokens = tokenize(value);
      apply();
      syncUrl();
    }

    field.addEventListener('input', () => {
      setQuery(field.value);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        field.value = '';
        setQuery('');
        field.focus();
      });
    }

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === '/' && !isTyping()) {
        e.preventDefault();
        field.focus();
      } else if (e.key === 'Escape' && document.activeElement === field) {
        if (field.value) {
          field.value = '';
          setQuery('');
        } else {
          field.blur();
        }
      }
    });

    window.addEventListener('popstate', () => {
      const q = new URLSearchParams(location.search).get('q') || '';
      if (q === query) return;
      field.value = q;
      query = q;
      tokens = tokenize(q);
      apply();
    });

    // 初始化：读取 ?q=
    field.value = new URLSearchParams(location.search).get('q') || '';
    query = field.value;
    tokens = tokenize(query);
    apply();

    return {
      refresh: apply,
      getQuery: () => query,
    };
  };
})();

interface ListSearchOptions {
  inputId: string;
  clearId?: string;
  countId?: string;
  emptyId?: string;
  /** 列表项选择器，匹配到的元素会被 show / hide。 */
  cardSelector: string;
  /** 计数文案的单位，默认「条」。 */
  countUnit?: string;
  /** 页面自己那层筛选（标签 / 分类），与搜索按 AND 叠加。 */
  extraFilter?: (card: HTMLElement) => boolean;
}

interface ListSearch {
  /** 重新跑一次过滤（切标签 / 排序后调用）。 */
  refresh: () => void;
  getQuery: () => string;
}

declare global {
  interface Window {
    initListSearch: (opts: ListSearchOptions) => ListSearch;
  }
}

export {};
