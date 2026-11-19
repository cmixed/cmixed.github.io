import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 右下角胶囊条的回归防线。
 *
 * 关键约束：.fab-btn 还挂在文章 / 列表页导航的「缩进 / 目录 / 搜索 / 筛选」上，
 * 胶囊内的按钮必须用独立 class，否则改胶囊尺寸会把导航一起改掉。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');
const fab = readFileSync(join(ROOT, 'src', 'client', 'fab.ts'), 'utf-8');

describe('右下角浮动胶囊条', () => {
  it('胶囊按钮用独立 class，不复用导航的 .fab-btn', () => {
    // 注入的三颗按钮（含回上级链接）都走 .fab-dock-btn
    expect(fab).toContain("className = 'fab-dock-btn'");
    expect(fab).toContain("link.className = 'fab-dock-btn'");
    expect(fab).not.toContain("el.className = 'fab-btn'");
    // 导航页的 .fab-btn 仍在 HTML 里，CSS 里也仍给它留着样式
    expect(css).toContain('.fab-btn:hover,');
    expect(css).toContain('.fab-btn.active');
  });

  it('胶囊是横向玻璃条，按钮透明、整条只做一次 backdrop-filter', () => {
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
