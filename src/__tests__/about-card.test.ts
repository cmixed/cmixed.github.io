import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 关于卡上半段的回归防线。
 *
 * 这一块返工过四轮，每轮的教训都留在这里：
 * 1. 「内衬照片 + 底部 --primary-dim 名带」两层边框 + 一圈内边距，看着是两块拼的；
 * 2. 名带改成流内元素后，卡又跟着右列 stretch，769–1024px 之间照片被顶到框顶、
 *    下面留出一整块空底色；
 * 3. 名带改成绝对定位渐隐层，照片能铺满、卡与右列同高，但名字压在照片上与首页重复；
 * 4. 定稿：**小方照片 + 下面一枚签名**，没有名字带、没有名字文字 —— 左边是一张
 *    签了名的肖像，右边是简介 + 三列事实。
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

/** 注释里也会出现属性名，断言声明时先剥掉注释。 */
function declarations(selector: string): string {
  return rule(selector).replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('关于卡的头像与事实区', () => {
  it('照片是正方形、铺满左列，圆角与外框长在照片自己身上', () => {
    const photo = declarations('.about-avatar-photo');
    expect(photo).toContain('width: 100%');
    expect(photo).toContain('aspect-ratio: 1');
    expect(photo).toContain('object-fit: cover');
    expect(photo).toContain('border-radius: 16px');
    expect(photo).not.toContain('padding');
    // 左列容器只负责排布，不再自己撑一个框
    const box = declarations('.about-avatar');
    expect(box).toContain('flex-direction: column');
    expect(box).not.toContain('border');
    expect(box).not.toContain('aspect-ratio');
  });

  it('头像下面挂的是签名，不是名字（没有名带、没有文字）', () => {
    expect(html).not.toContain('about-name-tag');
    expect(css).not.toContain('.about-name-tag');
    expect(html).not.toContain('>cmixed</span>');

    const start = html.indexOf('<div class="about-avatar">');
    expect(start).toBeGreaterThan(-1);
    const block = html.slice(start, html.indexOf('</div>', start));
    expect(block).toContain('about-avatar-photo');
    // 签名用图，且是装饰：alt 留空 + aria-hidden
    expect(block).toMatch(/class="about-avatar-sign"[^>]*cmixed_sign_v1\.svg"[^>]*alt=""/);
    expect(block).toContain('aria-hidden="true"');
    // 没有 span 之类的文字节点
    expect(block).not.toContain('<span');

    const sign = declarations('.about-avatar-sign');
    expect(sign).toContain('pointer-events: none');
    expect(sign).toContain('user-select: none');
  });

  it('尺寸只写在左列容器上，媒体查询不再单独改图', () => {
    expect(css).not.toContain('.about-avatar-photo { width: 1');
    for (const w of [112, 96, 152]) {
      expect(css, `缺少 ${w}px 断点`).toContain(`.about-avatar { width: ${w}px; }`);
    }
  });

  it('事实列表跟在简介下面，不用 auto 外边距顶到卡底', () => {
    const facts = rule('.about-facts');
    expect(facts).toContain('margin: 1.1rem 0 0');
    expect(facts).not.toContain('margin: auto');
    // 左列不再与右列同高，整行按内容高度排
    expect(declarations('.about-main')).toContain('align-items: flex-start');
  });
});
