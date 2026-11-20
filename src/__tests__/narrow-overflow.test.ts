import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 极窄屏不许横向溢出（2026-11-20）。
 *
 * 320px 下主页文档 `scrollWidth` 比视口多 3px，来源是 `.projects-grid`：
 * 网格在 ≤768px 命中 `grid-template-columns: 1fr`，而 `1fr` 等价于
 * `minmax(auto, 1fr)` —— 这个 `auto` 下界的意思是「不许缩到内容的 min-content
 * 以下」。卡片里有一行 `white-space: nowrap` 的技术标签（`.project-tech` 是
 * `flex-wrap: nowrap`），几个 tag 的 min-content 累加约 253px，加上卡片
 * padding/border，整条轨道被撑到 292px，而容器只有 258px。
 *
 * 修法是给 grid item 显式 `min-width: 0`，把 auto 下界拿掉。
 * 不能用 `overflow: hidden` 兜 —— 那会把卡片下缘之外的 `.card-popover` 浮窗一起裁掉。
 *
 * 另外 `minmax(280px, 1fr)` 这类写法本身也有同样的问题：`minmax` 的下界是硬下界，
 * 容器比它窄时列宽仍取下界。所以两处预览网格都写成 `minmax(min(100%, 280px), 1fr)`。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const read = (p: string): string => readFileSync(join(ROOT, p), 'utf-8');
const css = read('src/style.css');

describe('极窄屏横向溢出', () => {
  it('网格项拿掉 min-width: auto 的默认下界', () => {
    const block = css.slice(css.indexOf('.projects-grid > * {'));
    expect(block.slice(0, block.indexOf('}'))).toContain('min-width: 0');
  });

  it('minmax 的下界用 min(100%, …)，容器再窄也不撑破', () => {
    /* 裸 `minmax(280px, 1fr)` 在 258px 容器里会把列撑到 280px 以上；
       `min(100%, 280px)` 在窄容器退化成 100%，宽容器行为不变。 */
    expect(css).not.toMatch(/minmax\(\s*280px/);
    expect(css).toContain('minmax(min(100%, 280px), 1fr)');
    // 资源小窝列表页早就这么写了，两边保持同一套写法
    expect(read('nook/index.html')).toContain('minmax(min(100%, 250px), 1fr)');
  });

  it('不能用 overflow: hidden 兜卡片（会裁掉浮窗）', () => {
    const block = css.slice(css.indexOf('.project-card {'));
    const body = block.slice(0, block.indexOf('}'));
    // 匹配属性声明本身（带分号）—— 注释里那句「不再用 overflow: hidden 裁圆角」不算
    expect(body).not.toMatch(/overflow:\s*hidden\s*;/);
    expect(body).toMatch(/overflow:\s*visible\s*;/);
  });
});
