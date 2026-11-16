import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 全站文本选中的统一策略：默认全站关，只有读者要复制的正文开。
 *
 * 旧做法是一张 22 项的白名单（button / .list-chip / .btn …），逐个给控件写
 * user-select: none。每加一个组件就得想起来补一项，实测漏了 40 处 —— 卡片标题、
 * 技术标签、状态条、区块标题、目录、详情元信息、svg / canvas、404 文案都能
 * 被点击落插入符（光标浏览模式下最明显）。
 *
 * 现在反转默认值：* 全站关，allowlist 里那一小撮正文开。新增 UI 自动安全，
 * 不再需要维护名单。这组断言钉住「一处策略、没有散落副本」这个不变量。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');
const main = readFileSync(join(ROOT, 'src', 'main.ts'), 'utf-8');
const page404 = readFileSync(join(ROOT, 'public', '404.html'), 'utf-8');
const caretGuard = readFileSync(join(ROOT, 'src', 'client', 'caret.ts'), 'utf-8');
const bundles = readFileSync(join(ROOT, 'scripts', 'client-scripts.ts'), 'utf-8');

/** 取某条规则的声明体（剥掉注释，避免把文字里的属性名误判为声明）。 */
function declarations(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `找不到选择器 ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start)).replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('全站文本选中策略', () => {
  it('全站默认不可选且不画插入符，用 * 覆盖顶层 dialog，且不用 !important', () => {
    const deny = declarations('*,\n*::before,\n*::after');
    expect(deny).toContain('user-select: none');
    expect(deny).toContain('-webkit-user-select: none');
    // user-select: none 只挡选区；部分浏览器 / 光标浏览仍会画插入符（首页胶囊
    // 与签名左上被点出过一根白竖线），必须一起藏掉
    expect(deny).toContain('caret-color: transparent');
    expect(deny).not.toContain('!important');
  });

  it('allowlist 只放开正文与输入控件，并覆盖其所有后代', () => {
    // 两条选择器：容器自身 + 其后代。只写前者的话，后代被 * 改回 none。
    const allowStart = css.indexOf(':is(.md-body,');
    expect(allowStart).toBeGreaterThan(-1);
    const block = css.slice(allowStart, css.indexOf('}', css.indexOf('}', allowStart) + 1));
    for (const name of [
      '.md-body',
      '.about-text',
      '.about-facts',
      '.nook-detail-content',
      '.site-modal-body',
      'input',
      'textarea',
      'pre',
      'code',
    ]) {
      expect(block, `allowlist 缺少 ${name}`).toContain(name);
    }
    expect(block).toContain('user-select: text');
    // 读者要读的正文里插入符必须放回来，否则光标浏览读到哪都看不见
    expect(block).toContain('caret-color: auto');
    expect(block).toContain(') *');
  });

  it('独立 404 页用同样的默认关（它不加载 style.css）', () => {
    expect(page404).toContain('*::before, *::after');
    expect(page404).toContain('user-select: none');
  });

  it('不再有散落的 user-select 声明或 JS mousedown 兜底', () => {
    // 全站只有默认关 + allowlist 开两处声明，其余组件都不自带
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const hits = stripped.match(/user-select:/g) ?? [];
    // 默认关 2 条（含 -webkit-）+ allowlist 2 条（含 -webkit-）= 4
    expect(hits.length).toBe(4);

    // 旧的 22 项枚举名单与 hero 的单点补丁都已删除
    expect(css).not.toContain('.list-chip,\n.list-chip-more,');
    expect(declarations('.hero-title img')).not.toContain('user-select');
    expect(declarations('.about-name-tag')).not.toContain('user-select');
    expect(declarations('.footer-dot')).not.toContain('user-select');
    expect(main).not.toContain("addEventListener('mousedown'");
  });

  it('插入符兜底在 ui.js：只拦不可选中且非交互的目标', () => {
    // CSS 只能「看不见」插入符；有的浏览器（含光标浏览）照样会落下一根。
    // mousedown 的默认动作里包含「移动插入符」，拦掉它才是「不产生」。
    expect(caretGuard).toContain("'mousedown'");
    expect(caretGuard).toContain('preventDefault');
    // 拦不拦跟着 CSS 的选中策略走，不在 JS 里维护第二份名单
    expect(caretGuard).toMatch(/userSelect !== 'none'/);
    // 交互控件必须放行：preventDefault 会连它们的 focus 一起吃掉
    expect(caretGuard).toContain('a, button, input');
    // 编进全站共用的 ui.js，而不是只在首页生效的 main.ts
    expect(bundles).toContain("'caret'");
    expect(bundles).toMatch(/ui: \[[^\]]*'caret'/);
  });
});
