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
 * 左组（个人博客 / 资源小窝）是**文字**、不套胶囊：那两个中文词读得比图形快，
 * 而且只有两个。跨页的图形入口在底部坞里（见 fab-dock.test.ts）。
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

    // 左组回到文字：主页是两个纯文字链接，没有 aria-label / sr-only
    expect(html).toContain('<a href="blog/" class="nav-title">个人博客</a>');
    expect(html).toContain('<a href="nook/" class="nav-title">资源小窝</a>');
    expect(html).not.toContain('nav-title-icon');
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
});
