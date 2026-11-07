import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 五类卡片（项目 / 博客列表 / 资源列表 / 两个首页预览卡）的「同一套卡片规格」。
 *
 * 这一版把它们统一成：标题一行、正文最多三行、标签一行（多的收成 +N），
 * 被省略的内容全部由同一份浮窗补全。浮窗不是每类卡片各写一份，而是：
 *   - 卡片根上打 `data-card`，被省略时由 card-popover.ts 加 `.is-clamped`；
 *   - CSS 只认 `[data-card].is-clamped` 这一个组合，新增卡片类型不用改样式。
 * 这里钉住的就是这几条约定 —— 它们一旦被拆开，界面会静默退回「每类卡片一种样子」。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf-8');

/** 取出某个选择器的第一条规则体（这些块都是扁平的，取到第一个 `}` 就够）。 */
function rule(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `找不到选择器 ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
}

const css = read('src/style.css');
const blogList = read('blog/index.html');
const nookList = read('nook/index.html');
const blogBuild = read('blog/build.ts');
const nookBuild = read('nook/build.ts');
const main = read('src/main.ts');
const popoverScript = read('src/client/card-popover.ts');

describe('五类卡片都声明自己是卡片（data-card）', () => {
  it('列表页（构建期生成）与首页（运行时生成）都带 data-card', () => {
    for (const [name, source] of [
      ['blog/build.ts', blogBuild],
      ['nook/build.ts', nookBuild],
      ['main.ts 项目卡', main.slice(main.indexOf('renderProjects'), main.indexOf('renderSkills'))],
      [
        'main.ts 博客预览',
        main.slice(main.indexOf('loadBlogPreview'), main.indexOf('loadNookPreview')),
      ],
      [
        'main.ts 资源预览',
        main.slice(main.indexOf('loadNookPreview'), main.indexOf('observerOptions')),
      ],
    ] as Array<[string, string]>) {
      expect(source, name).toContain('data-card');
    }
  });

  it('每类卡片都有一份完整的浮窗内容（标题 / 摘要 / 标签）', () => {
    const bodies = [
      ['blog', blogBuild],
      ['nook', nookBuild],
      ['preview', main],
      ['project', main],
    ] as Array<[string, string]>;
    for (const [name, source] of bodies) {
      expect(source.split('card-popover-body').length - 1, name).toBeGreaterThan(0);
      expect(source, name).toContain('card-popover-title');
      expect(source, name).toContain('card-popover-desc');
      expect(source, name).toContain('card-popover-tags');
    }
  });
});

describe('标题一行、正文三行', () => {
  it('四类正文都 clamp 到三行（项目卡与两张预览卡在 style.css，两张列表卡在页面内联）', () => {
    const shared = rule(
      css,
      ':is(.blog-preview-card-desc, .nook-preview-card-desc, .project-desc)'
    );
    expect(shared).toContain('-webkit-line-clamp: 3');
    expect(shared).toContain('min-height');

    for (const [source, selector] of [
      [blogList, '.blog-page-card-desc'],
      [nookList, '.nook-card-desc'],
    ] as Array<[string, string]>) {
      const body = rule(source, selector);
      expect(body, selector).toContain('-webkit-line-clamp: 3');
      expect(body, selector).toContain('min-height');
    }
  });

  it('项目卡标题也是单行省略，且头部左格可以压缩', () => {
    const title = rule(css, '.project-title');
    expect(title).toContain('white-space: nowrap');
    expect(title).toContain('text-overflow: ellipsis');
    expect(rule(css, '.project-header > div')).toContain('min-width: 0');
  });
});

describe('标签一行、多的收成 +N', () => {
  it('项目卡的标签行也在 clampTags 的名单里', () => {
    const tagsLine = popoverScript
      .slice(popoverScript.indexOf('const TAGS'), popoverScript.indexOf('function clampTags'))
      .replace(/\s+/g, ' ');
    for (const row of [
      '.blog-page-card-tags',
      '.nook-card-tags',
      '.blog-preview-card-tags',
      '.nook-preview-card-tags',
      '.project-tech',
    ]) {
      expect(tagsLine, row).toContain(row);
    }
  });

  it('收起多少个记在标签行的 data-more 上（省略是卡片自己的属性）', () => {
    expect(popoverScript).toContain('box.dataset.more = String(tags.length - fit)');
    expect(popoverScript).toContain('const tagsCut = Number(tagRow?.dataset.more ?? 0) > 0');
    expect(popoverScript).toContain(
      "card.classList.toggle('is-clamped', descCut || titleCut || tagsCut)"
    );
  });
});

describe('浮窗是全站同一份', () => {
  it('卡片根上有 data-card 才触发，不再逐类列举', () => {
    expect(css).toContain('[data-card].is-clamped:hover .card-popover');
    expect(css).toContain('[data-card].is-clamped:focus-visible .card-popover');
    // 翻到上方也是同一套
    expect(css).toContain('[data-card].popover-up .card-popover');
  });

  it('高度封顶，溢出交给内部滚动区', () => {
    expect(css).toContain('--popover-max-h: min(56vh, 360px)');
    const panel = rule(css, '.card-popover-body');
    expect(panel).toContain('max-height: var(--popover-max-h)');
    expect(panel).toContain('overflow: auto');
  });

  it('只有内容溢出时才接指针，否则浮窗不挡下面那张卡', () => {
    expect(css).toContain(".card-popover[data-scrollable='true']");
    expect(rule(css, '.card-popover')).toContain('pointer-events: none');
    expect(popoverScript).toContain('pop.dataset.scrollable = String(');
  });

  it('浮窗是实色面：压在卡片上不能像导航那样透', () => {
    const pop = rule(css, '.card-popover');
    expect(pop).toContain('background-color: var(--popover-surface)');
    expect(pop).not.toContain('backdrop-filter');
    // 两个主题都给了值，且不是半透明
    expect(css).toMatch(/--popover-surface: #[0-9a-f]{6};/g);
    expect(css).not.toMatch(/--popover-surface: rgba\(/);
  });
});

describe('有卡片的区块不再虚拟化', () => {
  it('content-visibility 的 paint 裁切会切掉浮窗，三个区块都关掉', () => {
    const block = css.slice(css.indexOf('#projects,'));
    expect(block).toContain('#blog-preview');
    expect(block).toContain('#nook-preview');
    expect(block).toContain('content-visibility: visible');
  });
});
