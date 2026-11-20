import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 手机版卡片预览模式的回归防线。
 *
 * 关键约束一：内容同源 —— 弹窗搬卡片里的 .card-popover-body，不另建数据源 / 模板。
 * 关键约束二：模态交给原生 <dialog>（和 #siteModal / 快捷键面板同构），不手写焦点陷阱。
 * 关键约束三：按钮只在这页有卡片、且设备无 hover 时出现；文章 / 详情页不显示。
 * 关键约束四：捕获阶段拦卡片跳转，放过卡片内的下载按钮，退出模式完全恢复。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');
const script = readFileSync(join(ROOT, 'src', 'client', 'card-preview.ts'), 'utf-8');
const bundles = readFileSync(join(ROOT, 'scripts', 'client-scripts.ts'), 'utf-8');

describe('手机版卡片预览模式', () => {
  it('内容来自卡片的浮窗，不另建数据源', () => {
    expect(script).toContain("const POPOVER_BODY = '.card-popover-body'");
    expect(script).toContain('card.querySelector<HTMLElement>(POPOVER_BODY)');
    expect(script).toContain('body.innerHTML = source.innerHTML');
    // 标题栏取卡片自己的标题，五类标题选择器都在
    expect(script).toContain('.project-title');
    expect(script).toContain('.blog-page-card-title');
    expect(script).toContain('.nook-card-title');
  });

  it('复用原生 dialog + 共享 site-modal 皮肤与关闭语义', () => {
    expect(script).toContain("createElement('dialog')");
    expect(script).toContain("className = 'site-modal card-preview-modal'");
    expect(script).toContain("querySelector('.site-modal-close')?.addEventListener('click'");
    // 点遮罩关闭：event.target === dialog
    expect(script).toContain('if (event.target === el) el.close()');
    expect(script).toContain('el.showModal()');
    expect(css).toContain('.site-modal::backdrop');
  });

  it('按钮仅无 hover + 有卡片时出现，且贴在坞上方', () => {
    expect(script).toContain("root.setAttribute('data-has-cards', '')");
    expect(script).toContain("root.removeAttribute('data-has-cards')");
    // 三处检测：同步渲染 / 首页 fetch / 异步网格
    expect(script).toContain('requestAnimationFrame(syncHasCards)');
    expect(script).toContain("window.addEventListener('load', syncHasCards)");
    expect(script).toContain('new MutationObserver(syncHasCards)');
    // 按钮初始化即挂载，显隐交给 CSS；不能懒到第一次 setMode 才建（那样永不出现）
    expect(script).toMatch(/ensureToggle\(\);\s*\n\s*requestAnimationFrame\(syncHasCards\)/);
    expect(css).toMatch(
      /@media \(hover: none\)\s*\{\s*html\[data-has-cards\] \.card-preview-toggle \{ display: flex; \}/
    );
    expect(css).toContain('.card-preview-toggle');
    expect(css).toMatch(/\.card-preview-toggle \{[^}]*position: fixed/);
  });

  it('预览模式是显式开关，aria-pressed 与文案同步，退模式关弹窗', () => {
    expect(script).toContain("setAttribute('aria-pressed', String(on))");
    expect(script).toContain("text.textContent = on ? '退出预览' : '卡片预览'");
    expect(script).toContain('if (!on && dialog?.open) dialog.close()');
    expect(script).toContain("root.classList.toggle('card-preview-mode', on)");
    expect(css).toContain('html.card-preview-mode [data-card]');
  });

  it('捕获阶段拦跳转、放过下载按钮，不改卡片 DOM', () => {
    expect(script).toContain('{ capture: true }');
    expect(script).toContain('event.stopImmediatePropagation()');
    expect(script).toContain("target.closest('.nook-download, .site-modal, .card-preview-toggle')");
    expect(script).toContain('const card = target.closest<HTMLElement>(CARD)');
    // 不写 href / 不建 button 替换 <a>：原链接保持原样
    expect(script).not.toContain("setAttribute('href'");
  });

  it('编进 ui.js，且在 card-popover 之后（浮窗先量好）', () => {
    expect(bundles).toContain("| 'card-preview'");
    const uiLine = bundles.slice(bundles.indexOf('  ui: ['), bundles.indexOf('  list: ['));
    expect(uiLine.indexOf('card-popover')).toBeLessThan(uiLine.indexOf('card-preview'));
  });
});
