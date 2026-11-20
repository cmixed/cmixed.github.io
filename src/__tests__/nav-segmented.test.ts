import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 导航栏「胶囊分段控件」的回归防线（2026-11-20）。
 *
 * 背景：五个本页锚点改成图标后，节距 64px（图标 32 + 间距 32）—— 间距等于图标本身，
 * 五个按钮像撒在导航里、彼此毫无关系。改成装进浅底胶囊（间距 2px）+ 一条跟随当前
 * 区块的滑块之后，成组地读成「一个控件里的五格」。
 *
 * 左组（blog / nook）是**文字**、不套胶囊：两个 URL slug 读得比图形快，也和
 * 地址栏同形。中文全称（个人博客 / 资源小窝）下沉到底部坞的标签与 aria-label。
 * 跨页的图形入口也在坞里（见 fab-dock.test.ts）。
 *
 * 四条约束：
 *   1. 右组装进浅底胶囊（细描边 / 3px 内边距 / 999px 圆角）；
 *   2. 右组的选中底由 ::before 滑块画，格子自己不能再画一层（会叠成两倍深）；
 *   3. 滑块位置由 main.ts 写 --slider-x / --slider-w，且按 border 宽度校正；
 *   4. 移动端抽屉必须把胶囊样式全部重置，否则会变成一条竖着的圆角长条。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const read = (p: string): string => readFileSync(join(ROOT, p), 'utf-8');
const css = read('src/style.css');
const main = read('src/main.ts');
const html = read('index.html');

describe('导航栏胶囊分段控件', () => {
  it('只有右组是胶囊容器，左组是文字', () => {
    // 容器规则不再带 .nav-pages（那个包裹是图标时代的，已移除）
    expect(css).toMatch(/^\.nav-links \{$/m);
    expect(css).not.toContain('.nav-pages');
    const block = css.slice(css.indexOf('.nav-links {'));
    const body = block.slice(0, block.indexOf('}'));
    expect(body).toContain('gap: 2px');
    expect(body).toContain('padding: 3px');
    expect(body).toContain('border-radius: 999px');
    expect(body).toContain('background: var(--chip-fill)');
    expect(body).toContain('border: 1px solid var(--chip-border)');

    // 左组是 URL slug 的**大写**形态，不是中文（和地址栏同形，也省 54px 宽度）
    expect(html).toContain('<a href="blog/" class="nav-title">BLOG</a>');
    expect(html).toContain('<a href="nook/" class="nav-title">NOOK</a>');
    expect(html).not.toContain('nav-title-icon');
    // 两个箭头已撤：靠「两页 logo 天然同宽」对齐，不再用占位符。
    // 只看 nav-left 内部 —— hero 按钮里的 &larr; 是另一回事
    const navLeft = html.slice(
      html.indexOf('<div class="nav-left">'),
      html.indexOf('</div>', html.indexOf('<div class="nav-left">'))
    );
    expect(navLeft).not.toContain('logo-arrow');
    expect(navLeft).not.toContain('&larr;');
  });

  it('两层命名：导航说 slug，坞说中文全称', () => {
    /* 这条是「同一个地方两个名字」的防线 —— 刻意分开的两层，不是笔误：
       导航栏左组常驻可见、要省宽度，所以写 blog / nook（和地址栏同形）；
       坞里的标签只出现在 hover 气泡与 aria-label，没有宽度压力，
       给完整中文名对读屏用户更有用。两边都被钉住，谁被改回去都会报错。 */
    for (const f of ['blog/index.html', 'nook/index.html']) {
      const s = read(f);
      expect(s, `${f} 左组应为大写 slug`).toMatch(
        /class="(?:blog|nook)-nav-title[^"]*">(?:BLOG|NOOK)<\/a>/
      );
      expect(s, `${f} 不该再出现中文左组`).not.toMatch(
        /class="(?:blog|nook)-nav-title[^"]*">(?:个人博客|资源小窝)<\/a>/
      );
    }
    const fabSrc = read('src/client/fab.ts');
    expect(fabSrc).toContain("label: '个人博客'");
    expect(fabSrc).toContain("label: '资源小窝'");
    expect(fabSrc).not.toContain("label: '博客'");
  });

  it('左组由竖线分隔，logo 与入口之间不再靠箭头占位', () => {
    /* 选择器必须是 `.logo + a`，不能写死 `.nav-title` —— 主页那颗叫 .nav-title、
       三个子页叫 .blog-nav-title / .nook-nav-title / .nook-detail-nav-title，
       写死任一个都会漏掉另一半（第一版就漏了子页，竖线只在主页出现）。 */
    const block = css.slice(css.indexOf('.logo + a::before {'));
    const body = block.slice(0, block.indexOf('}'));
    expect(body).toContain('width: 1px');
    expect(body).toContain('background: var(--border)');
    expect(body).toContain('right: calc(100% + 9.5px)');
    // 间距收成一组：1.25rem，两个 slug 靠近、与 logo 分开
    const left = css.slice(css.indexOf('.nav-left, .blog-nav-left'));
    expect(left.slice(0, left.indexOf('}'))).toContain('gap: 1.25rem');
  });

  it('格子尺寸统一 36×30、图标 17px', () => {
    const block = css.slice(css.indexOf('.nav-icon-link {'));
    const body = block.slice(0, block.indexOf('}'));
    expect(body).toContain('width: 36px');
    expect(body).toContain('height: 30px');
    expect(body).toContain('border-radius: 999px');
    // 底由滑块画，格子自身必须透明
    expect(body).toContain('background: transparent');
    expect(css).toMatch(/\.nav-icon-link svg \{[^}]*width: 17px/);
  });

  it('滑块只由 ::before 画，位置读 CSS 变量', () => {
    const block = css.slice(css.indexOf('.nav-links::before {'));
    const body = block.slice(0, block.indexOf('}'));
    expect(body).toContain('left: var(--slider-x)');
    expect(body).toContain('width: var(--slider-w)');
    expect(body).toContain('background: var(--primary-dim)');
    expect(body).toContain('pointer-events: none');
    // 首帧初值指向第一格：脚本还没跑时「关于」本来就是高亮项
    expect(css).toMatch(/\.nav-links \{[^}]*--slider-x: 3px[^}]*--slider-w: 36px/);
    // 没有当前项时淡出，别停在一格假装选中
    expect(css).toContain('.nav-links:not(:has(.is-active))::before');
  });

  it('当前项自己不再画底色（否则与滑块叠成两倍深）', () => {
    const block = css.slice(css.indexOf('.nav-icon-link.is-active {'));
    const body = block.slice(0, block.indexOf('}'));
    expect(body).toContain('color: var(--primary-text)');
    expect(body).not.toContain('background');
  });

  it('main.ts 按 border 宽度校正滑块坐标', () => {
    expect(main).toContain("strip.style.setProperty('--slider-x'");
    expect(main).toContain("strip.style.setProperty('--slider-w'");
    // 绝对定位的包含块是 padding box，不减 border 会整体偏 1px
    expect(main).toContain('borderLeftWidth');
    // 断点变化时 key 没变，sync 会提前 return，必须另有一次重排
    expect(main).toMatch(/addEventListener\('resize',[\s\S]{0,200}relayout\(\)/);
  });

  it('移动端抽屉重置胶囊样式并去掉滑块', () => {
    const drawer = css.slice(css.indexOf('.nav-links {\n        position: fixed;'));
    const body = drawer.slice(0, drawer.indexOf('}'));
    expect(body).toContain('border: 0');
    expect(body).toContain('border-radius: 0');
    expect(body).toContain('padding: 0');
    expect(css).toContain('    .nav-links::before {\n        content: none;\n    }');
  });

  it('左组在三个页面宽度一致：字号规则四个类都要写，当前态不改字重', () => {
    /* 曾经两个坑叠在一起，让「左侧这一组」的宽度随所在页面浮动：
       ① ≤480px 的字号规则只列了三个子页的类，主页那颗叫 `.nav-title` 被漏掉 ——
          390px 下主页 BLOG/NOOK 是 13.5px、子页是 12.75px，整组差 3.75px；
       ② 当前页带 `font-weight: 600`，粗体更宽 —— 1440px 下 BLOG 41.56 → 42.44，
          于是主页 236.84、博客 237.72、小窝 237.84，同一组导航在三个页面不一样长。
       现在四个类共用一个字号、当前态只改颜色与下划线。 */
    const narrow = css.slice(css.indexOf('@media (max-width: 480px)'));
    const rule = narrow.slice(narrow.indexOf('.nav-title,'));
    expect(rule.slice(0, 160)).toMatch(
      /\.nav-title,\s*\n\s*\.blog-nav-title, \.nook-nav-title, \.nook-detail-nav-title \{ font-size: 0\.85rem; \}/
    );

    // 当前态不许再动字重（也不许动 letter-spacing —— 那同样会改宽度）
    const active = css.slice(css.indexOf('.blog-nav-active, .nook-nav-active'));
    const body = active.slice(0, active.indexOf('}'));
    expect(body).not.toContain('font-weight');
    expect(body).not.toContain('letter-spacing');
    expect(body).toContain('color: var(--text)');
    // 下划线是常驻的，与 hover 的临时展开区分开
    expect(css).toContain(
      '.blog-nav-active::after, .nook-nav-active::after, .nook-detail-nav-active::after { transform: scaleX(1); }'
    );
  });
});
