import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 底部居中导航坞的回归防线。
 *
 * 关键约束一：.fab-btn 还挂在文章 / 列表页导航的「缩进 / 目录 / 搜索 / 筛选」上，
 * 坞内按钮必须用独立 class，否则改尺寸会把导航一起改掉。
 * 关键约束二：坞常驻显示，显隐交给导航栏的 .dock-toggle（.is-off），不再滚动淡入。
 * 关键约束三：主题钮是「移动」现成的 #themeToggle，帮助调 window.siteKeys.toggleHelp。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');
const fab = readFileSync(join(ROOT, 'src', 'client', 'fab.ts'), 'utf-8');

describe('底部居中导航坞', () => {
  it('固定入口：主页 / 博客 / 小窝 / 回顶 / 回底 / 目录 / 深浅模式 / 帮助', () => {
    for (const label of ['主页', '博客', '资源小窝']) {
      expect(fab, `缺少入口 ${label}`).toContain(`label: '${label}'`);
    }
    // 回顶 / 回底 / 帮助是按钮不是链接，走 actionButton 的 label 参数
    expect(fab).toContain("actionButton('回到顶部', 'up'");
    expect(fab).toContain("actionButton('直达底部', 'down'");
    expect(fab).toContain("actionButton('帮助', 'help'");
    // 回底要现算目标高度：页面还会变长（图片 / 预览卡），必须校准
    expect(fab).toContain('scrollHeight - window.innerHeight');
    expect(fab).toContain('function scrollToBottom');
    /* 连点回底再回顶时，回底那次 1s 后的补滚会抢写 scrollTo ——
       必须有「新跳转中止旧动画 + 校准按序号作废」这条，否则回顶会没反应。 */
    expect(fab).toContain('let navSeq = 0');
    expect(fab).toContain('if (runningStop) runningStop()');
    expect(fab).toContain('if (seq !== navSeq || passes >= 2) return');
    expect(fab).toContain('stop(false)');
    // 目录 / 主题都是「借」现成节点，不是另造一颗
    expect(fab).toContain("getElementById('tocToggle')");
    expect(fab).toContain("getElementById('themeToggle')");
    // 搬进坞时统一摘 .fab-btn 挂 .fab-dock-btn（目录原先是 40px，会和导航的 26px 打架）
    expect(fab).toContain("item.el.classList.remove('fab-btn')");
    expect(fab).toContain("item.el.classList.add('fab-dock-btn')");
    // 帮助复用快捷键面板
    expect(fab).toContain('window.siteKeys?.toggleHelp()');
    // 回上级与旧的虚拟化量高机制已彻底删掉
    expect(fab).not.toContain('fab-measuring');
    expect(css).not.toContain('html.fab-measuring');
    // 当前页高亮：aria-current 同步标给辅助技术
    expect(fab).toContain("aria-current', 'page'");
    expect(css).toContain('.fab-dock-btn.is-current');
    // 目录面板开着时 .active 由内联脚本切，坞里要有同色规则
    expect(css).toContain('.fab-dock-btn.active');
  });

  it('坞居中显示，两态都保留 -50%', () => {
    const group = css.slice(css.indexOf('.fab-group {'), css.indexOf('.fab-group.is-off'));
    expect(group).toContain('left: 50%');
    expect(group).toContain('translate(-50%, 0)');
    const off = css.slice(css.indexOf('.fab-group.is-off'), css.indexOf('.fab-group.is-off') + 200);
    expect(off).toContain('translate(-50%, 8px)');
    // 质感三层：受光顶边 / 内侧暗线 / 贴地阴影
    expect(group).toContain('inset 0 1px 0');
    expect(group).toContain('inset 0 -1px 0');
  });

  it('坞内按钮用独立 class，不复用导航的 .fab-btn', () => {
    // 注入的每颗按钮都走 .fab-dock-btn
    expect(fab).toContain("className = 'fab-dock-btn'");
    expect(fab).toContain("link.className = 'fab-dock-btn'");
    expect(fab).not.toContain("el.className = 'fab-btn'");
    // 导航页的 .fab-btn 仍在 HTML 里，CSS 里也仍给它留着样式
    expect(css).toContain('.fab-btn:hover,');
    expect(css).toContain('.fab-btn.active');
  });

  it('坞是横向玻璃条，按钮透明、整条只做一次 backdrop-filter', () => {
    const group = css.slice(css.indexOf('.fab-group {'), css.indexOf('.fab-group.visible'));
    expect(group).toContain('flex-direction: row');
    expect(group).toContain('border-radius: 999px');
    expect(group).toContain('backdrop-filter: var(--mica-nav-glass)');
    const dock = css.slice(css.indexOf('.fab-dock-btn {'), css.indexOf('.fab-dock-btn +'));
    expect(dock).toContain('background: transparent');
    // 玻璃只给容器，按钮不再各自糊一层
    expect(css).not.toContain('.fab-group .fab-btn');
  });

  it('每颗按钮都有文字标签，hover 与键盘聚焦都可读', () => {
    expect(fab).toContain('fab-dock-label');
    expect(css).toContain('.fab-dock-btn:hover .fab-dock-label,');
    expect(css).toContain('.fab-dock-btn:focus-visible .fab-dock-label');
    // 键盘焦点环向胶囊内收，不撞相邻按钮
    expect(css).toMatch(/\.fab-dock-btn:focus-visible\s*\{[^}]*outline-offset: -2px/);
  });

  it('极窄屏收一档尺寸：文章页八颗不能顶出 320px', () => {
    // 38px × 8 + 间隙已超过 320，必须有 ≤360px 的更小一档
    const narrow = css.slice(css.lastIndexOf('@media (max-width: 360px)'));
    expect(narrow).toContain('.fab-dock-btn');
    expect(narrow).toMatch(/\.fab-dock-btn \{\s*width: 32px;\s*height: 32px;/);
    expect(narrow).toContain('gap: 0.1rem');
  });

  it('关掉坞时把借来的按钮回填导航栏原位', () => {
    // 借 = 原位插注释锚点，回填插到锚点后面
    expect(fab).toContain("document.createComment('dock-home')");
    expect(fab).toContain('parent.insertBefore(anchor, el)');
    expect(fab).toContain('item.anchor.parentNode?.insertBefore(item.el, item.anchor.nextSibling)');
    // 回填要还原类名与外观：目录补回 .fab-btn、气泡标签收起
    expect(fab).toContain('if (item.restoreClass) item.el.classList.add(item.restoreClass)');
    expect(fab).toContain('item.label.hidden = true');
    expect(fab).toContain('item.label.hidden = false');
    expect(css).toContain('.fab-dock-label[hidden]');
    // 坞初始就是关的：元素没离开过原位，锚点后面就是它自己，必须跳过
    expect(fab).toContain('if (item.el.previousSibling === item.anchor) continue');
    // 开关驱动搬入 / 回填
    expect(fab).toMatch(/if \(on\) moveToDock\(\);\s*\n\s*else moveHome\(\);/);
    // 目录与主题都走 borrow，保持「借」而不是各自 append
    expect(fab).toContain("borrow(tocToggle, '目录', 'fab-btn')");
    expect(fab).toContain("borrow(themeToggle, '切换深浅模式', null)");
  });

  it('常驻显示，显隐交给导航栏开关并持久化', () => {
    expect(fab).not.toContain('showAfter');
    expect(fab).not.toContain("classList.toggle('visible'");
    expect(fab).toContain("classList.toggle('is-off', !on)");
    expect(fab).toContain("toggleAttribute('inert', !on)");
    // 开关占主题钮腾出的位置，aria-pressed 表状态，localStorage 记忆
    expect(fab).toContain('insertBefore(toggle, themeToggle)');
    expect(fab).toContain("setAttribute('aria-pressed', String(on))");
    expect(fab).toContain('localStorage.getItem(DOCK_KEY)');
    expect(fab).toContain("className = 'dock-toggle'");
    expect(css).toContain('.dock-toggle');
    expect(css).toContain('.dock-toggle[aria-pressed="false"]');
    // 坞内主题钮必须放开 overflow，否则 hover 气泡被圆形钮裁掉
    expect(css).toContain('.fab-group .theme-toggle');
    expect(css).toContain('overflow: visible');
  });
});
