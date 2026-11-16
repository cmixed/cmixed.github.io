import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 关于卡上半段的回归防线：头像是一整块「照片 + 压在照片上的字母」，事实列表紧跟简介。
 *
 * 这块返工过几轮，每轮的教训都留在这里：
 * 1. 「内衬照片 + 底部 --primary-dim 名带」两层边框 + 一圈内边距，看着是两块拼的；
 * 2. 名带改成流内元素后，卡跟着右列 stretch，769–1024px 之间照片被顶到框顶、
 *    下面留出一整块空底色；
 * 3. 改成「小方照片 + 下面一枚签名」后，签名和首页标题重复，用户要求换回上一版；
 * 4. 定稿：**照片铺满整框，`cmixed` 字母以渐隐层压在照片下缘**，没有第二层边框、
 *    没有缝、没有空底板。首页仍由签名作标题，两处的写法有意不同。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');
const html = readFileSync(join(ROOT, 'index.html'), 'utf-8');

/** 取出某个选择器的第一条规则体（这些块都是扁平的）。 */
function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `找不到选择器 ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
}

describe('关于卡的头像与事实区', () => {
  it('照片铺满外框：没有内边距、没有第二层边框、没有独立圆角', () => {
    const box = rule('.about-avatar');
    expect(box).toContain('border: 1px solid var(--mica-chip-border)');
    expect(box).toContain('overflow: hidden');
    expect(box).not.toContain('padding');
    expect(box).toContain('position: relative');

    const img = rule('.about-avatar img');
    expect(img).toContain('width: 100%');
    expect(img).toContain('height: 100%');
    expect(img).toContain('object-fit: cover');
    // 照片自己的圆角/边框会和外框套成两层，必须没有
    expect(img).not.toContain('border');
    expect(img).not.toContain('border-radius');
  });

  it('名字是压在照片下缘的渐隐字母，不是流内名带、也不是签名图', () => {
    const tag = rule('.about-name-tag');
    expect(tag).toContain('position: absolute');
    expect(tag).toContain('inset: auto 0 0');
    expect(tag).toContain('linear-gradient');
    expect(tag).toContain('user-select: none');
    expect(tag).toContain('pointer-events: none');
    // 有上边框就等于有接缝；名字不该是一块贴上去的牌子
    expect(tag).not.toContain('border-top');
    expect(tag).not.toContain('align-self: stretch');

    const start = html.indexOf('<div class="about-avatar">');
    expect(start).toBeGreaterThan(-1);
    const block = html.slice(start, html.indexOf('</div>', start));
    expect(block).toContain('<span class="about-name-tag">cmixed</span>');
    // 关于卡不再重复首页那枚手写签名
    expect(block).not.toContain('cmixed_sign_v1.svg');
    expect(css).not.toContain('about-avatar-sign');
    expect(css).not.toContain('about-avatar-photo');
  });

  it('尺寸只写在容器上：媒体查询不单独改照片，也不会拉伸成竖条', () => {
    expect(css).not.toContain('.about-avatar img { width');
    for (const w of [130, 110, 180]) {
      expect(css, `缺少 ${w}px 断点`).toMatch(new RegExp(`\\.about-avatar \\{\\s*width: ${w}px;`));
    }
    // 窄屏纵排必须放开 max-height，否则照片会被拉成窄条
    expect(css).toContain('max-height: none');
  });

  it('事实列表跟在简介下面，不用 auto 外边距顶到卡底', () => {
    const facts = rule('.about-facts');
    expect(facts).toContain('margin: 1.1rem 0 0');
    expect(facts).not.toContain('margin: auto');
    expect(rule('.about-main')).toContain('align-items: stretch');
  });
});
