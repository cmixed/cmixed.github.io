import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 快捷键面板的两条回归防线：
 *
 * 1. 帮助键不能只有 `?` —— 中文键盘上是 Shift+/，输入法开着还会发成全角「？」。
 *    现在 `?` / `？` / `F1` 都能开，全角字符在 normalizeKey 里折回半角。
 * 2. 面板必须**真的**复用 .site-modal 的皮。早先 .keys-help 里写过
 *    `background: var(--mica-chrome)`，简写会把共享组那七层受光整组重置，
 *    于是它和更新日志 / 关于本站不是一个画风（平色板 vs 玻璃板）。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const keys = readFileSync(join(ROOT, 'src', 'client', 'keys.ts'), 'utf-8');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');

function declarations(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `找不到选择器 ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start)).replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('快捷键帮助面板', () => {
  it('帮助键是 ? 与 F1 两个，且全角「？」也能触发', () => {
    expect(keys).toContain("keys: ['?', 'F1']");
    // 全角 ASCII 折回半角（FF01–FF5E − FEE0）
    expect(keys).toContain('0xff01');
    expect(keys).toContain('0xfee0');
    expect(keys).toContain('normalizeKey(event.key)');
  });

  it('面板复用 .site-modal 的材质：不自己铺底色，也不另写标题 / 关闭钮', () => {
    expect(keys).toContain("className = 'site-modal keys-help'");
    expect(keys).toContain('site-modal-title');
    expect(keys).toContain('site-modal-close');

    const panel = declarations('.keys-help');
    expect(panel).not.toContain('background');
    expect(panel).not.toContain('backdrop-filter');
    expect(panel).toContain('width: min(440px');

    // 曾经另写过的两套皮肤必须彻底消失
    expect(css).not.toContain('.keys-help-title');
    expect(css).not.toContain('.keys-help-close');
  });

  it('键位表支持「或」与「然后」两种连接', () => {
    expect(keys).toContain("split('|')");
    expect(keys).toContain('keys-help-then');
  });
});
