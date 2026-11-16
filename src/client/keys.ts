/**
 * 全站快捷键：主页 / 博客 / 资源小窝共用一套，编译进 ui.js。
 *
 * 只做「全站都有意义」的键；页面级动作按选择器现场判断有没有那个按钮：
 *   T        切换主题（复用 theme.js 的 window.toggleTheme）
 *   ? / F1   这份帮助面板（? 是通用约定，F1 是不用按 Shift 的那个）
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
    /** 多个键互为「或」；单个字符串里带空格的是「G 然后 H」这种序列 */
    keys: string[];
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

  /**
   * 中文输入法开着的时候，Shift+/ 发出的是全角「？」，全角字母也一样。
   * 不折回半角的话，`?` / `/` 这些键在中文用户机器上直接失效 ——
   * 全角 ASCII 是连续区间 FF01–FF5E，减去 FEE0 就是对应的半角字符。
   */
  function normalizeKey(raw: string): string {
    if (raw.length !== 1) return raw;
    const code = raw.charCodeAt(0);
    if (code >= 0xff01 && code <= 0xff5e) return String.fromCharCode(code - 0xfee0).toLowerCase();
    return raw.toLowerCase();
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
    for (const item of bindings) list.push([item.keys.join('|'), item.label]);
    list.push(['G H', `去${routes.h.label}`]);
    list.push(['G B', `去${routes.b.label}`]);
    list.push(['G N', `去${routes.n.label}`]);
    return list;
  }

  /** `?|F1` → 两颗键中间一个「或」；`G H` → 两颗键中间一个「然后」。 */
  function keyCell(spec: string): string {
    return spec
      .split('|')
      .map((alt) =>
        alt
          .split(' ')
          .map((part) => `<kbd>${part.length === 1 ? part.toUpperCase() : part}</kbd>`)
          .join('<span class="keys-help-then">然后</span>')
      )
      .join('<span class="keys-help-then">或</span>');
  }

  function toggleHelp(): void {
    if (!help) {
      const dialog = document.createElement('dialog');
      dialog.className = 'site-modal keys-help';
      dialog.setAttribute('aria-label', '快捷键');
      /* 结构和 #siteModal 完全一致（标题 / 副标题 / 关闭钮 / 正文区），
         材质与圆角全部由 .site-modal 那套共享规则给，这里不另写皮肤。
         关闭钮的路径和 index.html 里那颗是同一个 Material close；客户端脚本
         是经典脚本、不能 import，所以只能复制这一段 path。 */
      dialog.innerHTML = `
        <div class="site-modal-head">
          <div class="site-modal-heading">
            <h2 class="site-modal-title">快捷键</h2>
            <p class="site-modal-sub">全站通用 · Esc 关闭</p>
          </div>
          <button type="button" class="site-modal-close" aria-label="关闭">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        <div class="site-modal-body"><dl class="keys-help-list"></dl></div>`;
      dialog.querySelector('.site-modal-close')?.addEventListener('click', () => dialog.close());
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
          ([spec, label]) =>
            `<div class="keys-help-row"><dt>${keyCell(spec)}</dt><dd>${label}</dd></div>`
        )
        .join('');
    }
    if (help.open) help.close();
    else help.showModal();
  }

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.isComposing || isTyping()) return;

    const key = normalizeKey(event.key);

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

    const hit = bindings.find((item) => item.keys.includes(key));
    if (!hit) return;
    event.preventDefault();
    hit.run();
  });

  // 主题：theme.js 已经把所有页面都装上了 window.toggleTheme
  const toggleTheme = (window as unknown as { toggleTheme?: () => string }).toggleTheme;
  if (typeof toggleTheme === 'function') {
    bind({ keys: ['t'], label: '切换主题', run: () => toggleTheme() });
  }
  /* ? 是通用约定，但中文键盘要按 Shift+/，开输入法还会发成全角；F1 是「帮助」的本职键，
     一个键就能按出来。两个都收，帮助面板里也并排列出来。 */
  bind({ keys: ['?', 'F1'], label: '显示 / 关闭这份帮助', run: toggleHelp });

  // 列表页才有：筛选与排序都直接点页面上的那颗按钮，不另存一份状态
  if (document.getElementById('filterToggle')) {
    bind({
      keys: ['f'],
      label: '开 / 关筛选面板',
      run: () => document.getElementById('filterToggle')?.click(),
    });
  }
  const sortButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.list-sort-btn'));
  if (sortButtons.length > 1) {
    bind({
      keys: ['s'],
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
      bind: (binding: { keys: string[]; label: string; run: () => void }) => void;
      list: () => Array<{ keys: string[]; label: string }>;
      toggleHelp: () => void;
    };
  }
}

export {};
