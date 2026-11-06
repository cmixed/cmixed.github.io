/**
 * 列表页（博客 / 资源小窝）左侧筛选栏的开关。
 *
 * 桌面 ≥1280：停靠在卡片左侧，展开时页面加宽，标签列表在栏内滚动。
 * <1280：变成左侧抽屉，遮罩 / Esc / 选中标签都能收起。
 *
 * 状态放在 <html> 的 class 上，页面 <head> 里有一小段同步脚本按
 * localStorage + 视口宽度先加好 class，所以桌面默认展开不会闪一下再跳宽。
 *
 *   window.initFilterPanel(); // 两个列表页都直接调用，ID 用默认值
 */
(() => {
  const DESKTOP_QUERY = '(min-width: 1280px)';
  const STORAGE_KEY = 'list-filters-open';

  interface FilterPanelOptions {
    toggleId?: string;
    panelId?: string;
    overlayId?: string;
    closeId?: string;
    scrollId?: string;
    chipSelector?: string;
  }

  function initFilterPanel(opts: FilterPanelOptions = {}): void {
    const toggleEl = document.getElementById(opts.toggleId ?? 'filterToggle');
    const panelEl = document.getElementById(opts.panelId ?? 'filterPanel');
    if (!toggleEl || !panelEl) return;
    /* 单独取非空别名：TS 不会把外层 const 的收窄带进下面的闭包。 */
    const toggle: HTMLElement = toggleEl;
    const panel: HTMLElement = panelEl;

    const overlay = document.getElementById(opts.overlayId ?? 'filterOverlay');
    const closeBtn = document.getElementById(opts.closeId ?? 'filterClose');
    const scrollEl = document.getElementById(opts.scrollId ?? 'filterScroll') ?? panel;
    const chipSelector = opts.chipSelector ?? '.list-chip';
    const desktop = window.matchMedia(DESKTOP_QUERY);

    const isOpen = (): boolean => document.documentElement.classList.contains('filters-open');

    function syncToggle(): void {
      toggle.classList.toggle('active', isOpen());
      toggle.setAttribute('aria-expanded', String(isOpen()));
    }

    function remember(open: boolean): void {
      if (!desktop.matches) return;
      try {
        localStorage.setItem(STORAGE_KEY, String(open));
      } catch {
        // 隐私模式下 localStorage 可能不可写：只影响记忆，不影响开关。
      }
    }

    function syncFade(): void {
      const max = scrollEl.scrollHeight - scrollEl.clientHeight;
      const scrollable = max > 2;
      scrollEl.classList.toggle('fade-top', scrollable && scrollEl.scrollTop > 2);
      scrollEl.classList.toggle('fade-bottom', scrollable && scrollEl.scrollTop < max - 2);
    }

    /** 只滚面板自身，不把整页带走。 */
    function revealActive(): void {
      const active = panel.querySelector<HTMLElement>(`${chipSelector}.active`);
      if (!active) return;
      const rect = active.getBoundingClientRect();
      const box = scrollEl.getBoundingClientRect();
      if (rect.top < box.top) scrollEl.scrollTop += rect.top - box.top - 8;
      else if (rect.bottom > box.bottom) scrollEl.scrollTop += rect.bottom - box.bottom + 8;
    }

    function focusFirst(): void {
      const target =
        panel.querySelector<HTMLElement>(`${chipSelector}.active`) ??
        panel.querySelector<HTMLElement>(chipSelector) ??
        closeBtn ??
        panel;
      target.focus({ preventScroll: true });
      revealActive();
      requestAnimationFrame(syncFade);
    }

    function open(): void {
      document.documentElement.classList.add('filters-open');
      document.documentElement.classList.toggle('filters-drawer-open', !desktop.matches);
      syncToggle();
      focusFirst();
    }

    function close(returnFocus: boolean): void {
      document.documentElement.classList.remove('filters-open', 'filters-drawer-open');
      syncToggle();
      if (returnFocus) toggle.focus({ preventScroll: true });
    }

    toggle.addEventListener('click', () => {
      if (isOpen()) close(true);
      else open();
      remember(isOpen());
    });

    overlay?.addEventListener('click', () => close(true));
    closeBtn?.addEventListener('click', () => close(true));

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !isOpen()) return;
      // 桌面上只在焦点位于面板 / 按钮时收起，别抢搜索框自己的 Esc。
      if (desktop.matches) {
        const active = document.activeElement;
        if (active !== toggle && !panel.contains(active)) return;
      }
      close(true);
      remember(false);
    });

    // 抽屉里点中标签后收起；桌面停靠时保持展开，方便连续换标签。
    panel.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(chipSelector)) return;
      if (!desktop.matches) close(true);
    });

    // 视口跨过断点时先收起，避免「手机抽屉」和「桌面停靠」互相残留。
    desktop.addEventListener('change', () => {
      document.documentElement.classList.remove('filters-open', 'filters-drawer-open');
      if (desktop.matches) {
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(STORAGE_KEY);
        } catch {
          // ignore
        }
        if (saved !== 'false') document.documentElement.classList.add('filters-open');
      }
      syncToggle();
      requestAnimationFrame(syncFade);
    });

    scrollEl.addEventListener('scroll', syncFade, { passive: true });
    window.addEventListener('resize', syncFade, { passive: true });

    syncToggle();
    requestAnimationFrame(syncFade);
  }

  window.initFilterPanel = initFilterPanel;
})();

declare global {
  interface Window {
    initFilterPanel: (opts?: {
      toggleId?: string;
      panelId?: string;
      overlayId?: string;
      closeId?: string;
      scrollId?: string;
      chipSelector?: string;
    }) => void;
  }
}

export {};
