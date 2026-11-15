import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 图标引用的回归防线。
 *
 * 起因：b4747de 把 32px PNG favicon 换成 SVG 时删了 `*-32x32.png`，
 * 但文章模板与 404 还在引用它们 —— favicon 404，浏览器回退到旧缓存图标，
 * 「博客文章 / 小窝文章」的图标就和列表页不统一了。
 * 这里把「每个 rel=icon / apple-touch-icon 的目标必须存在」钉死。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const SOURCES = [
  'index.html',
  'public/404.html',
  'blog/index.html',
  'blog/template/post.html',
  'blog/template/404.html',
  'nook/index.html',
  'nook/404.html',
  'nook/template/detail.html',
];

/** 图标链接的 href → public/ 下的实际文件（页面在站点任意深度，assets 都在根）。 */
function iconTargets(html: string): string[] {
  return [...html.matchAll(/<link\s+rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map(
    (match) => match[1] ?? ''
  );
}

describe('页面图标引用', () => {
  it('每个 rel=icon / apple-touch-icon 都指向 public/ 里真实存在的文件', () => {
    for (const source of SOURCES) {
      const html = readFileSync(join(ROOT, source), 'utf-8');
      const targets = iconTargets(html);
      // 每页至少要有 favicon；少了说明模板被改坏
      expect(targets.length, source).toBeGreaterThan(0);
      for (const href of targets) {
        const asset = href.replace(/^(\.\.\/|\/)*/, '').replace(/^\.\//, '');
        expect(asset.startsWith('assets/'), `${source} → ${href}`).toBe(true);
        expect(existsSync(join(ROOT, 'public', asset)), `${source} → ${href}`).toBe(true);
      }
    }
  });

  it('三枚 SVG 是同一套「墨底青线」家族，不再是透明底黑线', () => {
    for (const name of ['site', 'blog', 'nook']) {
      const svg = readFileSync(join(ROOT, 'public', 'assets', 'icons', `${name}.svg`), 'utf-8');
      expect(svg, name).toContain('viewBox="0 0 32 32"');
      expect(svg, name).toContain('linearGradient'); // 墨底渐变
      expect(svg, name).toContain('#5fd1b5'); // 受光描边
      expect(svg, name).toContain('#7fe3cc'); // 符号青线
      expect(svg, name).not.toContain('stroke="#111"');
    }
  });

  it('apple-touch-icon 是 192×192、四角不透明的 PNG', async () => {
    const sharp = (await import('sharp')).default;
    for (const file of ['site-wf-192x192.png', 'blog-192x192.png', 'nook-192x192.png']) {
      const path = join(ROOT, 'public', 'assets', 'icons', file);
      const meta = await sharp(path).metadata();
      expect(meta.width, file).toBe(192);
      expect(meta.height, file).toBe(192);
      // iOS 会把圆角外的透明像素渲染成黑块，所以左上角必须是实底
      const { data } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(data[3], file).toBe(255);
    }
  });

  it('favicon 统一走 SVG 线稿，不再引用 32px 位图', () => {
    for (const source of SOURCES) {
      const html = readFileSync(join(ROOT, source), 'utf-8');
      expect(html, source).not.toContain('32x32');
      // rel="icon" 的主图标必须是 svg（apple-touch-icon 是 iOS 用的 PNG，另行允许）
      for (const match of html.matchAll(/<link\s+rel="icon"[^>]*>/g)) {
        expect(match[0], source).toContain('image/svg+xml');
        expect(match[0], source).toContain('.svg');
      }
    }
  });
});
