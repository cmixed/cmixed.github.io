import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 底部居中导航坞的回归防线。
 *
 * 关键约束一：.fab-btn 还挂在文章 / 列表页导航的「缩进 / 目录 / 搜索 / 筛选」上，
 * 坞内按钮必须用独立 class，否则改尺寸会把导航一起改掉。
 * 关键约束二：坞若常驻会盖住首屏的简介与事实区横线，必须保留滚动淡入。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');
const fab = readFileSync(join(ROOT, 'src', 'client', 'fab.ts'), 'utf-8');

describe('底部居中导航坞', () => {
  it('四颗固定入口：主页 / 博客 / 资源小窝 / 回到顶部', () => {
    for (const label of ['主页', '博客', '资源小窝']) {
      expect(fab, `缺少入口 ${label}`).toContain(`label: '${label}'`);
    }
    // 回顶是按钮不是链接，走 actionButton 的 label 参数
    expect(fab).toContain("actionButton('回到顶部', 'up'");
    // 回上级 / 直达底部已撤，配套的虚拟化量高机制也一起删掉
    expect(fab).not.toContain('toBottom');
    expect(fab).not.toContain('settleAtBottom');
    expect(fab).not.toContain('fab-measuring');
    expect(css).not.toContain('html.fab-measuring');
    // 当前页高亮：aria-current 同步标给辅助技术
    expect(fab).toContain("aria-current', 'page'");
    expect(css).toContain('.fab-dock-btn.is-current');
  });

  it('坞居中显示，且保留显隐态里的 -50%', () => {
    const group = css.slice(css.indexOf('.fab-group {'), css.indexOf('.fab-group.visible'));
    expect(group).toContain('left: 50%');
    expect(group).toContain('translate(-50%, 8px)');
    const visible = css.slice(
      css.indexOf('.fab-group.visible'),
      css.indexOf('.fab-group.visible') + 200
    );
    expect(visible).toContain('translate(-50%, 0)');
    // 质感三层：受光顶边 / 内侧暗线 / 贴地阴影
    expect(group).toContain('inset 0 1px 0');
    expect(group).toContain('inset 0 -1px 0');
  });

  it('坞内按钮用独立 class，不复用导航的 .fab-btn', () => {
    // 注入的四颗按钮都走 .fab-dock-btn
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

  it('首屏不显示，滚过阈值才淡入', () => {
    expect(fab).toContain("group.classList.toggle('visible', next)");
    expect(css).toContain('.fab-group.visible');
  });
});
