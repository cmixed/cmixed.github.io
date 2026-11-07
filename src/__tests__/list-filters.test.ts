import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 列表页筛选栏顶部那一行：统计说明 + 「全部」复位，两个列表页同构。
 *
 * 这一版之前是「—— 全部 ——」横线标题压在栏顶，统计（共 N 篇 · X 个标签）挂在
 * 页头副标题前面 —— 一个描述着标签栏的数字，离标签栏隔着半个屏幕；而栏顶那颗
 * 复位按钮反倒什么信息都不带。现在统计搬进栏顶，页头只剩标语。
 *
 * 这里钉四件事：
 *   1. 栏顶是统计文案，不再是「全部」；
 *   2. 复位语义没丢（空 data-* + .list-chip 类，脚本靠它们同步「是否全选」）；
 *   3. 页头副标题里不再有统计，旧的 .list-sub-stat / .list-sub-sep 也没了；
 *   4. 样式只留一条尾线，下划线只给真正的标签。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf-8');

describe('列表页栏顶：统计说明兼复位', () => {
  const css = read('src/style.css');
  const blogBuild = read('blog/build.ts');
  const nookBuild = read('nook/build.ts');
  const blogList = read('blog/index.html');
  const nookList = read('nook/index.html');

  it('两页的栏顶都是统计文案，单位各自成句', () => {
    expect(blogBuild).toContain('共 ${posts.length} 篇 · ${tagStats.length} 个标签');
    expect(nookBuild).toContain('共 ${resourceCount} 个 · ${categoryCount} 个分类');
    expect(blogBuild).not.toContain('>全部<');
    expect(nookBuild).not.toContain('>全部<');
  });

  it('统计行仍然是「全部」复位：空 data-* 与 .list-chip 类都在', () => {
    expect(blogBuild).toContain('class="list-chip list-chip-all active" data-tag=""');
    expect(nookBuild).toContain('class="list-chip list-chip-all active" data-category=""');
    // 只看文字读不出它是个链接 / 按钮，aria-label 补一句动作
    expect(blogBuild).toContain('aria-label="显示全部：');
    expect(nookBuild).toContain('aria-label="显示全部：');
  });

  it('页头副标题只留标语，不再拼统计', () => {
    for (const html of [blogList, nookList]) {
      expect(html).not.toContain('{{listStat}}');
      expect(html).not.toContain('list-sub-stat');
      expect(html).toMatch(/<p class="list-sub">[^<{]/);
    }
  });

  it('旧的统计样式已清除，不再有人引用', () => {
    expect(css).not.toContain('.list-sub-stat');
    expect(css).not.toContain('.list-sub-sep');
    expect(blogBuild).not.toContain('listStat');
    expect(nookBuild).not.toContain('listStat');
  });

  it('栏顶只留一条尾线：文字左对齐、线吃掉剩余宽度', () => {
    const block = css.slice(
      css.indexOf('.list-chip.list-chip-all {'),
      css.indexOf('.list-chip.list-chip-all::after')
    );
    expect(block).toContain('font-size: 0.8125rem');
    expect(block).toContain('min-width: 0');
    // 整行从「居中压线」改成左对齐 + 尾线，抬头要和胶囊的左缘对齐
    expect(css).toContain('justify-content: flex-start');
    // 压线要两侧各一段，文字变长后两侧只剩两小截 —— 现在只画 ::after
    expect(css).not.toContain('.list-chip.list-chip-all::before');
    expect(css).toContain('.list-chip.list-chip-all::after');
  });

  it('下划线只给真正的标签，不再画到栏顶那行统计上', () => {
    expect(css).toContain('.list-chip.active:not(.list-chip-all) .list-chip-text');
    expect(css).not.toContain('.list-chip-all.active .list-chip-text');
  });
});
