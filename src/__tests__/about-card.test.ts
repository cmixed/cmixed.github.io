import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 关于卡上半段的回归防线：头像卡是「一块料」，事实列表紧跟在简介下面。
 *
 * 之前的两处毛病都是同一件事的两面：
 * 1. 头像卡是「内衬照片 + 底部一块 --primary-dim 名带」，两层边框 + 一圈内边距
 *    让照片和名带看着是两块拼起来的；
 * 2. 名带是流内元素，卡又跟着右列 stretch，于是 769–1024px 之间照片只有 130–168px、
 *    名带被顶到框底，中间留出一大块空底色。
 * 现在照片铺满整框（object-fit: cover），名字是压在照片下缘的绝对定位渐隐层，
 * 框高由 min/max 与 stretch 决定，缺的像素被照片吃掉，不会再有空的底板。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');

/** 取出某个选择器的第一条规则体（这些块都是扁平的）。 */
function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `找不到选择器 ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
}

describe('关于卡的头像与事实区', () => {
  it('头像卡没有内边距和第二层边框，照片直接铺到框边', () => {
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

  it('名字是压在照片下缘的渐隐层，不是流内名带', () => {
    const tag = rule('.about-name-tag');
    expect(tag).toContain('position: absolute');
    expect(tag).toContain('inset: auto 0 0');
    expect(tag).toContain('linear-gradient');
    // 有上边框就等于有接缝；名字不该是一条贴上去的牌子
    expect(tag).not.toContain('border-top');
    expect(tag).not.toContain('align-self: stretch');
  });

  it('尺寸只写在容器上，媒体查询不再单独改照片', () => {
    expect(css).not.toContain('.about-avatar img { width');
    const block = css.match(/\.about-avatar \{\s*width: 130px/g) ?? [];
    expect(block.length).toBe(1);
  });

  it('事实列表跟在简介下面，不用 auto 外边距顶到卡底', () => {
    const facts = rule('.about-facts');
    expect(facts).toContain('margin: 1.1rem 0 0');
    expect(facts).not.toContain('margin: auto');
    expect(rule('.about-main')).toContain('align-items: stretch');
  });
});
