import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 卡片头部的回归防线。
 *
 * 这一版把「置顶徽标」从标题行里挪到了右上角，标题也随之改成单行省略。
 * 三件事必须一起成立，否则界面会静默退回旧样子（截图才能看出来）：
 *   1. 标题仍然只有一行（nowrap + ellipsis），不能再被 line-clamp 成两行；
 *   2. 徽标排在标题之后、其他右上角元素（分类胶囊）之前；
 *   3. 顶部色带比卡片圆角小 1px，否则浅色下圆角处会露出一块白色顶边。
 * 另外标题被截断时要能触发浮窗，这条判据在 card-popover.ts 里。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf-8');

/** 取出某个选择器的第一条规则体（这些块都是扁平的，取到第一个 `}` 就够）。 */
function rule(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `找不到选择器 ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
}

describe('卡片标题：只占一行', () => {
  const css = read('src/style.css');
  const blogList = read('blog/index.html');
  const nookList = read('nook/index.html');

  it('四类卡片的标题都是 nowrap + 省略号', () => {
    const cases: Array<[string, string]> = [
      [css, '.blog-preview-card-title'],
      [css, '.nook-preview-card-title'],
      [blogList, '.blog-page-card-title'],
      [nookList, '.nook-card-title'],
    ];
    for (const [source, selector] of cases) {
      const body = rule(source, selector);
      expect(body, selector).toContain('white-space: nowrap');
      expect(body, selector).toContain('text-overflow: ellipsis');
      // 单行和 line-clamp 是互斥的：留一条 clamp 就会在窄屏悄悄变回两行
      expect(body, selector).not.toContain('line-clamp');
    }
  });

  it('标题在 flex 行里可以被压缩（min-width: 0），否则省略号不会出现', () => {
    for (const [source, selector] of [
      [css, '.blog-preview-card-title'],
      [css, '.nook-preview-card-title'],
      [blogList, '.blog-page-card-title'],
      [nookList, '.nook-card-title'],
    ] as Array<[string, string]>) {
      expect(rule(source, selector), selector).toContain('min-width: 0');
    }
  });
});

describe('置顶徽标：右上角，排在其他元素前面', () => {
  it('列表页：徽标在 head / header 里，标题之后', () => {
    const blog = read('blog/build.ts');
    const blogHead = blog.slice(
      blog.indexOf('blog-page-card-head'),
      blog.indexOf('blog-page-card-desc')
    );
    expect(blogHead.indexOf('blog-page-card-title')).toBeGreaterThan(-1);
    expect(blogHead.indexOf('${pinMark}')).toBeGreaterThan(
      blogHead.indexOf('blog-page-card-title')
    );
    // 徽标不许再塞进标题里
    expect(blog).not.toContain('<div class="blog-page-card-title">${pinMark}');

    const nook = read('nook/build.ts');
    const nookHead = nook.slice(nook.indexOf('nook-card-header'), nook.indexOf('nook-card-desc'));
    const pinAt = nookHead.indexOf('${pinMark}');
    expect(pinAt).toBeGreaterThan(nookHead.indexOf('nook-card-title'));
    // 「其他元素前面」：分类胶囊在徽标之后
    expect(nookHead.indexOf('nook-card-category')).toBeGreaterThan(pinAt);
    expect(nook).not.toContain('<div class="nook-card-title">${pinMark}');
  });

  it('首页预览卡：徽标同样在标题之后、分类之前', () => {
    const main = read('src/main.ts');
    const blogCard = main.slice(
      main.indexOf('blog-preview-card-head'),
      main.indexOf('blog-preview-card-desc')
    );
    expect(blogCard.indexOf('${pinMark}')).toBeGreaterThan(
      blogCard.indexOf('blog-preview-card-title')
    );
    expect(main).not.toContain('<div class="blog-preview-card-title">${pinMark}');

    const nookCard = main.slice(
      main.indexOf('nook-preview-card-header'),
      main.indexOf('nook-preview-card-desc')
    );
    const pinAt = nookCard.indexOf('${pinMark}');
    expect(pinAt).toBeGreaterThan(nookCard.indexOf('nook-preview-card-title'));
    expect(nookCard.indexOf('nook-preview-card-category')).toBeGreaterThan(pinAt);
    expect(main).not.toContain('<div class="nook-preview-card-title">${pinMark}');
  });
});

describe('顶部色带的圆角与卡片同心', () => {
  it('::before 的半径比卡片小 1px（内缩 1px 的边框宽度）', () => {
    const css = read('src/style.css');
    const listPages = [read('blog/index.html'), read('nook/index.html')];
    for (const selector of [
      '.project-card::before',
      '.blog-preview-card::before',
      '.nook-preview-card::before',
    ]) {
      expect(rule(css, selector), selector).toContain(
        'border-radius: calc(var(--card-radius) - 1px)'
      );
    }
    for (const [source, selector] of [
      [listPages[0], '.blog-page-card::before'],
      [listPages[1], '.nook-card::before'],
    ] as Array<[string, string]>) {
      expect(rule(source, selector), selector).toContain(
        'border-radius: calc(var(--card-radius) - 1px)'
      );
    }
  });
});

describe('标题被截断时触发浮窗', () => {
  it('浮窗判据同时看摘要高度与标题宽度', () => {
    const source = read('src/client/card-popover.ts');
    expect(source).toContain('scrollHeight - body.clientHeight');
    expect(source).toContain('title.scrollWidth - title.clientWidth');
    expect(source).toContain('descCut || titleCut');
  });

  it('浮窗只认卡片自己的省略状态（不逐类列举卡片）', () => {
    const css = read('src/style.css');
    for (const card of [
      '.blog-page-card',
      '.nook-card',
      '.blog-preview-card',
      '.nook-preview-card',
      '.project-card',
    ]) {
      expect(css, card).toContain(card);
    }
    expect(css).toContain('[data-card].is-clamped:hover .card-popover');
  });
});
