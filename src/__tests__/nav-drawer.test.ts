import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 移动端导航抽屉的回归防线（2026-11-20）。
 *
 * 背景：抽屉打开后点左侧空白「什么都不会发生」。查下来是三处叠在一起：
 *   1. 遮罩复用 `body::before`，而那条带 `pointer-events: none` —— 遮罩是个
 *      看得见摸不着的壳，点击直接穿透到下面的卡片和链接；
 *   2. `nav` 自带 `z-index: 100` 形成层叠上下文，抽屉的 `z-index: 200` 被困在
 *      里面，整块仍压在遮罩（150）下面 —— 连面板里的锚点都点不到；
 *   3. 抽屉宽 75%（390px 上 292px），右侧三分之一全是空白。
 *
 * 现在：遮罩吃点击、nav 在开合时抬到 160、宽度收到半个屏宽，
 * 关闭路径统一收进 main.ts 的 `setNavOpen`。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const read = (p: string): string => readFileSync(join(ROOT, p), 'utf-8');
const css = read('src/style.css');
const main = read('src/main.ts');
const html = read('index.html');

describe('移动端导航抽屉', () => {
  it('遮罩必须接收点击，否则点空白会穿透到下面的链接', () => {
    const block = css.slice(css.indexOf('body.nav-open::before {'));
    const body = block.slice(0, block.indexOf('}'));
    expect(body).toContain('pointer-events: auto');
    // 起点是 body::before，那条是 none —— 不显式恢复就继承到遮罩上
    const base = css.slice(css.indexOf('body::before {'));
    expect(base.slice(0, base.indexOf('}'))).toContain('pointer-events: none');
  });

  it('抽屉要真正浮在遮罩之上，nav 得抬出 150', () => {
    expect(css).toContain('body.nav-open nav {');
    const block = css.slice(css.indexOf('body.nav-open nav {'));
    const body = block.slice(0, block.indexOf('}'));
    expect(body).toMatch(/z-index:\s*16\d/);
    // 抽屉自身层级不变（它相对 nav 的上下文垫高）
    const drawer = css.slice(css.indexOf('.nav-links.active'));
    expect(drawer.slice(0, 60)).toContain('right: 0');
  });

  it('抽屉收窄到半个屏宽，不再用 75%', () => {
    const block = css.slice(css.indexOf('@media (max-width: 768px)'));
    const drawerRule = block.slice(block.indexOf('.nav-links {'));
    const body = drawerRule.slice(0, drawerRule.indexOf('height: 100vh'));
    expect(body).toContain('width: 50vw');
    expect(body).toContain('max-width: 190px');
    expect(body).not.toContain('width: 75%');
  });

  it('关闭只有一个出入口：setNavOpen 同步三处状态', () => {
    expect(main).toContain('function setNavOpen(');
    expect(main).toContain("hamburger.classList.toggle('active', open)");
    expect(main).toContain("navLinks.classList.toggle('active', open)");
    expect(main).toContain("document.body.classList.toggle('nav-open', open)");
    expect(main).toContain("setAttribute('aria-expanded', String(open))");
    expect(html).toContain('aria-expanded="false"');
  });

  it('点抽屉外任意处关闭，点面板内空白不关闭', () => {
    // 委托必须在 document 上：遮罩是伪元素，没有可绑的节点
    expect(main).toContain("document.addEventListener('click'");
    expect(main).toContain('navLinks.contains(target)');
    expect(main).toContain('hamburger.contains(target)');
  });

  it('Esc 也能关，并把焦点还给汉堡', () => {
    expect(main).toContain("e.key !== 'Escape'");
    expect(main).toContain('hamburger.focus()');
  });
});
