/**
 * 列表页（博客 / 资源小窝）筛选区的开关，以及标签长尾的展开 / 收起。
 *
 * 桌面 ≥1280：左侧 sticky 栏，展开时页面加宽，标签在栏内滚动。
 * <1280：不再是抽屉 —— 标签区常显在列表上方（见 style.css），导航里的开关隐藏，
 *         这个文件在那两个断点上只剩折叠逻辑。
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

    /* 标签的显示条数由断点决定（--filters-visible：桌面 12、平板 8、手机 6）。
       构建期不知道设备，所以这里按索引截断：超出的打 .is-tail 并移到「其他 N 个」
       之后 —— 展开时它们因此出现在那条横线的下方，横线本身的位置不动。 */
    const moreBtn = panel.querySelector<HTMLButtonElement>('.list-chip-more');
    const filtersBox = panel.querySelector<HTMLElement>('.list-filters');
    /* 顺序只取一次：反复 applyLimit 会重排 DOM，再 query 就拿到被打乱的顺序了 */
    const allChips = filtersBox
      ? Array.from(filtersBox.querySelectorAll<HTMLElement>('.list-chip'))
      : [];

    function applyLimit(): void {
      if (!moreBtn || !filtersBox || allChips.length === 0) return;
      const raw = getComputedStyle(panel).getPropertyValue('--filters-visible').trim();
      const limit = Number.parseInt(raw, 10);
      if (!Number.isFinite(limit)) return;

      allChips.forEach((chip, index) => {
        if (index >= limit) {
          chip.classList.add('is-tail');
          filtersBox.appendChild(chip);
        } else {
          chip.classList.remove('is-tail');
          filtersBox.insertBefore(chip, moreBtn);
        }
      });

      const hidden = Math.max(0, allChips.length - limit);
      moreBtn.hidden = hidden === 0;
      moreBtn.textContent = `其他 ${hidden} 个`;
      moreBtn.setAttribute('aria-expanded', 'false');
      filtersBox.classList.remove('expanded');
    }

    if (moreBtn && filtersBox) {
      moreBtn.addEventListener('click', () => {
        const expanded = filtersBox.classList.toggle('expanded');
        moreBtn.setAttribute('aria-expanded', String(expanded));
        moreBtn.textContent = expanded
          ? '收起'
          : `其他 ${allChips.filter((chip) => chip.classList.contains('is-tail')).length} 个`;
      });
      applyLimit();
      window.addEventListener('resize', applyLimit, { passive: true });
    }

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
