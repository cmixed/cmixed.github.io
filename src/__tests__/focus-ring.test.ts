import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 键盘焦点环的「安全区」策略。
 *
 * 根因：全局焦点环是 outline-offset: 2px，环画在元素 border box 之外；
 * 而 CSS 规定一个轴写了 auto / hidden / clip，另一个轴的 visible 会计算成
 * auto —— 于是「只想横向滚动」的胶囊条其实上下也裁，2px 线 + 2px 偏移
 * 被切得只剩四枚角标。F1 打开帮助、Esc 关闭后焦点回到季度胶囊时最明显。
 *
 * 统一原则：不让焦点环依赖祖先给的空间。能撑开的滚动条容器留 6px 内边距
 * （裁切边是 padding box），撑不开的窄屏胶囊把环改画在自己框内；纵向滚动区
 * 用 scroll-padding 让 Tab 落点离裁切边远一点。绝不用 outline: none 把环藏掉
 * —— 那是把「焦点在哪」也一起藏掉。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');
const post = readFileSync(join(ROOT, 'blog', 'template', 'post.html'), 'utf-8');

/** 取规则的声明体（含选择器里的换行），剥掉注释避免误判。 */
function rule(selector: string): string {
  const start = css.indexOf(selector);
  expect(start, `找不到规则 ${selector}`).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open)).replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('键盘焦点环安全区', () => {
  it('全局环只给键盘焦点，且淡入而不是硬闪一下', () => {
    const ring = rule("button:focus-visible,\na:focus-visible,\n[role='button']:focus-visible {");
    expect(ring).toContain('outline: 2px solid var(--primary)');
    expect(ring).toContain('outline-offset: 2px');
    expect(ring).toContain('animation: focus-ring-in');
    expect(css).toContain('@keyframes focus-ring-in');
    // 鼠标点击不该留框，减少动效时不该有淡入
    expect(css).not.toContain('button:focus,\na:focus,');
    const reduced = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)]
      .map((m) => m[1])
      .some((block) => block.includes('button:focus-visible') && block.includes('animation: none'));
    expect(reduced, '减少动效时焦点环淡入没关掉').toBe(true);
    // 谁都不许用「藏掉环」来回避裁切
    expect(css).not.toMatch(/:focus-visible\s*\{[^}]*outline: none/);
  });

  it('弹窗标题栏与筛选面板：留 6px 安全区但不改标题行高度', () => {
    for (const selector of ['.site-modal-actions {', '.list-filters-scroll {']) {
      const block = rule(selector);
      expect(block, `${selector} 缺少 6px 内边距`).toContain('padding: 6px');
      expect(block, `${selector} 没把高度还回去`).toContain('margin-block: -6px');
    }
    expect(rule('.site-modal-actions {')).toContain('overflow-x: auto');
    expect(rule('.list-filters-scroll {')).toContain('scroll-padding-block: 10px');
  });

  it('纵向滚动区：Tab 落点不贴裁切边', () => {
    const start = css.indexOf(':where(.site-modal-body, .card-popover-body,');
    expect(start).toBeGreaterThan(-1);
    const open = css.indexOf('{', start);
    // 选择器列表也要一起断言，光看声明体查不出漏了哪个容器
    const whole = css.slice(start, css.indexOf('}', open));
    expect(whole).toContain('scroll-padding-block: 10px');
    for (const name of [
      '.site-modal-body',
      '.card-popover-body',
      '.md-body pre',
      '.md-body .table-wrapper',
    ]) {
      expect(whole, `缺少 ${name}`).toContain(name);
    }
  });

  it('撑不开的窄屏胶囊条：环改画在自己框内', () => {
    expect(css).toContain('.skill-group-items .skill-chip.is-link:focus-visible');
    expect(rule('.skill-group-items .skill-chip.is-link:focus-visible {')).toContain(
      'outline-offset: -2px'
    );
    expect(rule('.site-modal-actions .meta-chip:focus-visible {')).toContain(
      'outline-offset: -2px'
    );
  });

  it('文章目录：尾部留白 + scroll-padding 越过 18px 渐隐带', () => {
    expect(post).toContain('padding-bottom: 26px');
    expect(post).toContain('scroll-padding-block: 26px');
  });

  it('关着的移动抽屉退出可聚焦树，打开时立刻恢复', () => {
    const closed = rule('    .nav-links {');
    expect(closed).toContain('visibility: hidden');
    expect(closed).toContain('visibility 0s linear 0.3s');
    expect(rule('    .nav-links.active {')).toContain('visibility: visible');
  });
});
