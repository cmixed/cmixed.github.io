/**
 * 全站快捷键：主页 / 博客 / 资源小窝共用一套，编译进 ui.js。
 *
 * 只做「全站都有意义」的键；页面级动作按选择器现场判断有没有那个按钮：
 *   T        切换主题（复用 theme.js 的 window.toggleTheme）
 *   ?        这份帮助面板
 *   G H/B/N  去主页 / 博客 / 小窝（序列键，1.2s 内按第二键）
 *   F        开 / 关筛选面板（仅列表页，等价于点那颗筛选按钮）
 *   S        循环排序：默认 → 创建时间 → 更新时间（仅列表页）
 *   /        搜索（search.js 自己处理，这里只在帮助里列出来）
 *
 * 三条硬规则：
 *   1. 焦点在输入框 / 输入法组合中一律不拦 —— 否则中文输入会吞字；
 *   2. 带 Ctrl / ⌘ / Alt 的组合键一律让给浏览器，不抢 Ctrl+K 这类系统习惯；
 *   3. 每个动作都先看页面上有没有对应控件，没有就静默略过，不报错。
 */
(() => {
  interface Binding {
    key: string;
    label: string;
    run: () => void;
  }

  const bindings: Binding[] = [];
  const routes: Record<string, { url: string; label: string }> = {
    h: { url: '/', label: '主页' },
    b: { url: '/blog/', label: '个人博客' },
    n: { url: '/nook/', label: '资源小窝' },
  };

  let waitingRoute = false;
  let routeTimer = 0;

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

  function go(url: string): void {
    if (location.pathname === url) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    location.href = url;
  }

  function bind(binding: Binding): void {
    bindings.push(binding);
  }

  /* --- 帮助面板：复用 .site-modal 的皮，条目从注册表 + 固定项现场生成 --- */
  let help: HTMLDialogElement | null = null;

  function rows(): Array<[string, string]> {
    const list: Array<[string, string]> = [];
    if (document.querySelector('.nav-search')) list.push(['/', '搜索']);
    for (const item of bindings) list.push([item.key.toUpperCase(), item.label]);
    list.push(['G H', `去${routes.h.label}`]);
    list.push(['G B', `去${routes.b.label}`]);
    list.push(['G N', `去${routes.n.label}`]);
    return list;
  }

  function toggleHelp(): void {
    if (!help) {
      const dialog = document.createElement('dialog');
      dialog.className = 'site-modal keys-help';
      dialog.setAttribute('aria-label', '快捷键');
      dialog.innerHTML = `
        <div class="site-modal-head">
          <div class="site-modal-heading"><h2 class="keys-help-title">快捷键</h2></div>
          <button type="button" class="keys-help-close" aria-label="关闭">&times;</button>
        </div>
        <div class="site-modal-body"><dl class="keys-help-list"></dl></div>`;
      dialog.querySelector('.keys-help-close')?.addEventListener('click', () => dialog.close());
      // 点遮罩关闭：dialog 自身的点击里 target 是 dialog 时才算点在遮罩上
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
      document.body.appendChild(dialog);
      help = dialog;
    }
    const list = help.querySelector('.keys-help-list');
    if (list) {
      list.innerHTML = rows()
        .map(
          ([key, label]) =>
            `<div class="keys-help-row"><dt>${key
              .split(' ')
              .map((part) => `<kbd>${part}</kbd>`)
              .join('<span class="keys-help-then">然后</span>')}</dt><dd>${label}</dd></div>`
        )
        .join('');
    }
    if (help.open) help.close();
    else help.showModal();
  }

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.isComposing || isTyping()) return;

    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    if (waitingRoute) {
      waitingRoute = false;
      clearTimeout(routeTimer);
      const route = routes[key];
      if (route) {
        event.preventDefault();
        go(route.url);
        return;
      }
    }

    if (key === 'g') {
      waitingRoute = true;
      clearTimeout(routeTimer);
      routeTimer = window.setTimeout(() => {
        waitingRoute = false;
      }, 1200);
      return;
    }

    const hit = bindings.find((item) => item.key === key);
    if (!hit) return;
    event.preventDefault();
    hit.run();
  });

  // 主题：theme.js 已经把所有页面都装上了 window.toggleTheme
  const toggleTheme = (window as unknown as { toggleTheme?: () => string }).toggleTheme;
  if (typeof toggleTheme === 'function') {
    bind({ key: 't', label: '切换主题', run: () => toggleTheme() });
  }
  bind({ key: '?', label: '显示 / 关闭这份帮助', run: toggleHelp });

  // 列表页才有：筛选与排序都直接点页面上的那颗按钮，不另存一份状态
  if (document.getElementById('filterToggle')) {
    bind({
      key: 'f',
      label: '开 / 关筛选面板',
      run: () => document.getElementById('filterToggle')?.click(),
    });
  }
  const sortButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.list-sort-btn'));
  if (sortButtons.length > 1) {
    bind({
      key: 's',
      label: '切换排序（默认 / 创建 / 更新）',
      run: () => {
        const current = sortButtons.findIndex((btn) => btn.getAttribute('aria-pressed') === 'true');
        sortButtons[(current + 1) % sortButtons.length]?.click();
      },
    });
  }

  /* 把键位标注写回控件，读屏和「悬停提示」都能看到，不用另存一张表 */
  for (const [selector, keys] of [
    ['#themeToggle', 'T'],
    ['#filterToggle', 'F'],
    ['#searchToggle', '/'],
  ] as const) {
    document.querySelector(selector)?.setAttribute('aria-keyshortcuts', keys);
  }

  (window as unknown as { siteKeys: unknown }).siteKeys = {
    bind,
    list: () => bindings.slice(),
    toggleHelp,
  };
})();

declare global {
  interface Window {
    siteKeys?: {
      bind: (binding: { key: string; label: string; run: () => void }) => void;
      list: () => Array<{ key: string; label: string }>;
      toggleHelp: () => void;
    };
  }
}

export {};
