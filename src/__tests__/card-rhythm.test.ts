import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 卡片底部（正文 → 标签 → 元信息）纵向节奏的回归防线。
 *
 * 这一版之前，这四段间距是在四个地方各写一份的：列表页正文带 `margin-bottom: 1rem`、
 * 标签行再带 `margin-bottom: 1rem`，于是标签上下各空 16px；首页预览卡却是
 * footer `padding-top: 0.6rem` + 标签 0.4rem。同一个标签行在两种卡里不是同一件事，
 * 卡片看起来就「散」。现在统一成 style.css 里的三个 token，规则只读它们。
 *
 * 这里钉三件事：
 *   1. 三个 token 确实定义在 :root；
 *   2. 四类卡片的 footer 都吃 `--card-foot-gap`，标签行都吃另外两个；
 *   3. 正文不再自带 `margin-bottom: 1rem` —— 两处一起写会叠成双倍空隙。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf-8');

/** 取出某个选择器的第一条规则体（这些块都是扁平的，取到第一个 `}` 就够）。 */
function rule(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `找不到选择器 ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
}

describe('卡片底部的纵向节奏由 token 统一', () => {
  const css = read('src/style.css');
  const blogList = read('blog/index.html');
  const nookList = read('nook/index.html');

  it('三个间距 token 定义在 :root', () => {
    expect(css).toContain('--card-foot-gap:');
    expect(css).toContain('--card-tags-gap:');
    expect(css).toContain('--card-tags-gap-y:');
  });

  it('四类卡片的 footer 都用 --card-foot-gap 推开正文', () => {
    const cases: Array<[string, string]> = [
      [css, '.blog-preview-card-footer'],
      [css, '.nook-preview-card-footer'],
      [blogList, '.blog-page-card-footer'],
      [nookList, '.nook-card-footer'],
    ];
    for (const [source, selector] of cases) {
      const body = rule(source, selector);
      expect(body, selector).toContain('padding-top: var(--card-foot-gap)');
      // margin-top: auto 不能丢：否则同一行的卡片底边不对齐
      expect(body, selector).toContain('margin-top: auto');
    }
  });

  it('四类卡片的标签行共用同一组 gap / margin-bottom', () => {
    const cases: Array<[string, string]> = [
      [css, '.blog-preview-card-tags'],
      [css, '.nook-preview-card-tags'],
      [blogList, '.blog-page-card-tags'],
      [nookList, '.nook-card-tags'],
    ];
    for (const [source, selector] of cases) {
      const body = rule(source, selector);
      expect(body, selector).toContain('gap: var(--card-tags-gap)');
      expect(body, selector).toContain('margin-bottom: var(--card-tags-gap-y)');
    }
  });

  it('正文不再自己带 margin-bottom，否则和 footer 的 padding-top 叠成双倍', () => {
    const cases: Array<[string, string]> = [
      [css, '.blog-preview-card-desc'],
      [css, '.nook-preview-card-desc'],
      [blogList, '.blog-page-card-desc'],
      [nookList, '.nook-card-desc'],
    ];
    for (const [source, selector] of cases) {
      expect(rule(source, selector), selector).not.toContain('margin-bottom');
    }
  });
});

describe('只读标签的盒子与卡片信息行同档', () => {
  const css = read('src/style.css');

  it('标签内边距取自 --chip-pad-*，不在各处写死', () => {
    expect(css).toContain('--chip-pad-y:');
    expect(css).toContain('--chip-pad-x:');
    const body = css.slice(css.indexOf('.tech-tag,'), css.indexOf('.changelog-hash,'));
    expect(body).toContain('padding: var(--chip-pad-y) var(--chip-pad-x)');
  });

  it('置顶徽标的高度跟着标签盒子算，改动内边距后仍与分类胶囊共边线', () => {
    expect(css).toContain('--pin-box: calc(var(--chip-font) * 1.45 + var(--chip-pad-y) * 2 + 2px)');
  });
});
