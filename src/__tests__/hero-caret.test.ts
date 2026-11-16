import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 首页 hero 的两条回归防线：
 *
 * 1. 打字机光标只在「正在逐字写 / 删」时出现。此前它 24 小时都在闪，
 *    而标题（签名）和打字机都是居中的 —— 句子一短，那根竖线就落在签名尾巴上，
 *    看起来像是签名自己冒出来的光标。
 * 2. 标题图（手写签名）不能被拖、指针事件也不落在 <img> 上：否则单击会触发
 *    原生图片拖拽。文本插入符由全站 user-select 默认关统一挡住（见
 *    selection-policy.test.ts），不再在 h1 上单独拦 mousedown。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');
const main = readFileSync(join(ROOT, 'src', 'main.ts'), 'utf-8');
const html = readFileSync(join(ROOT, 'index.html'), 'utf-8');

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `找不到选择器 ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
}

/** 注释里也会出现「opacity: 1」这类字样，断言声明时先剥掉注释。 */
function declarations(selector: string): string {
  return rule(selector).replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('hero 光标与签名', () => {
  it('光标默认藏起来，只有 .is-typing 期间才闪', () => {
    const idle = rule('.typewriter:not(.is-typing) .cursor');
    expect(idle).toContain('opacity: 0');
    expect(idle).toContain('animation: none');
    // 基础规则保留 blink，供打字期间使用
    expect(rule('.typewriter .cursor')).toContain('animation: blink');
  });

  it('main.ts 按下一拍的间隔切换 is-typing（停顿里摘掉）', () => {
    expect(main).toContain("classList.toggle('is-typing'");
    // 停顿是 2000 / 500，逐字是 100 / 50：判定阈值必须把它们分开
    expect(main).toMatch(/toggle\('is-typing',\s*typeSpeed <= 100\)/);
  });

  it('标题就是签名图：不可拖拽、不接收指针事件，alt 仍是 cmixed', () => {
    const img = declarations('.hero-title img');
    expect(img).toContain('pointer-events: none');
    expect(img).toContain('-webkit-user-drag: none');

    // h1 里只有这一张图，标题的可读文本由 alt 提供
    expect(html).toMatch(
      /<h1 class="hero-title">\s*<img[^>]*cmixed_sign_v1\.svg"[^>]*alt="cmixed"/
    );
    expect(html).toMatch(/cmixed_sign_v1\.svg"[^>]*draggable="false"/);
    // 首页不再另排一行文字标题，也不再有独立的 .hero-signature 块
    expect(html).not.toContain('<h1>cmixed</h1>');
    expect(html).not.toContain('hero-signature');
    expect(css).not.toContain('.hero-signature');
  });
});
