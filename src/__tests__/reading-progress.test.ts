import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 「阅读进度」只留两处，不再有第三条（2026-11-20）。
 *
 * 之前顶部有一条 2px 的实心 accent 条，随滚动从 0 长到满宽 —— 主页由 main.ts
 * 用 rAF 写 transform，资源小窝列表页另有一份内联实现（两处逻辑重复）。
 *
 * 现在这两处都删了：右侧本来就有整页浮层滚动条（`page-scrollbar`，给出位置感），
 * 导航右组还有一条跟着区块走的滑块（给出「读到哪一块」）。第三条只是把同一件事
 * 说第三遍，而且它是页面顶部唯一常驻的实心色块 —— 和「克制」的定位相冲。
 *
 * 这条测试钉住「删干净」：三个文件里都不该再有残留，否则样式 / 脚本会各自
 * 复活一半（比如 CSS 删了但 main.ts 还在写 transform，白跑一个 rAF 循环）。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const read = (p: string): string => readFileSync(join(ROOT, p), 'utf-8');

describe('阅读进度指示', () => {
  it('顶部实心进度条已从样式、脚本、页面三处彻底移除', () => {
    expect(read('src/style.css')).not.toContain('.scroll-progress');
    expect(read('src/main.ts')).not.toContain('scrollProgress');
    // 小窝列表页当年复制了一份内联实现，样式 / 元素 / 脚本三块都要清掉
    const nook = read('nook/index.html');
    expect(nook).not.toContain('scroll-progress');
    expect(nook).not.toContain('scrollProgress');
  });

  it('位置感仍由两处提供：浮层滚动条 + 导航滑块', () => {
    // 浮层滚动条：ui.js 里的 scrollbar.ts，触屏不创建（系统自带够用）
    expect(read('src/client/scrollbar.ts')).toContain("rail.className = 'page-scrollbar'");
    // 导航滑块：main.ts 写 --slider-x / --slider-w
    expect(read('src/main.ts')).toContain("style.setProperty('--slider-x'");
    expect(read('src/style.css')).toContain('.nav-links::before');
  });

  it('打印时仍要藏掉浮层滚动条（它不该印在纸上）', () => {
    const print = read('src/style.css').slice(read('src/style.css').indexOf('@media print'));
    expect(print.slice(0, 400)).toContain('.page-scrollbar');
  });
});
