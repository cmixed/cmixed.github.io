import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 三类卡片的**头部结构**必须一致（2026-11-20）。
 *
 * 项目卡与资源卡早就接了 `cardAttribute`，博客卡一直漏着 —— 结果主页上
 * 项目卡右上角有语言徽标、资源卡有平台图标，博客卡右上角空着，同一屏里
 * 三种头部形状。这不是设计取舍，是漏做。
 *
 * 现在的统一规则：**每张卡右上角都有一个 `.card-attr`**。
 *   项目卡 → language（带版本文字，C++20 / C++23 要能分开）
 *   资源卡 → language / platform（纯图标）+ 分类（纯图标，同款方块）
 *   博客卡 → 标签里识别出的语言，识别不到就用通用标签图标（纯图标）
 *
 * 另外钉死：资源卡不再出现「图标 + 网站 / 工具 / 代码」这种图标加文字的分类胶囊。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const read = (p: string): string => readFileSync(join(ROOT, p), 'utf-8');

describe('卡片头部结构统一', () => {
  it('博客卡（列表页）右上角也有属性位', () => {
    const blog = read('blog/build.ts');
    const head = blog.slice(
      blog.indexOf('blog-page-card-head'),
      blog.indexOf('blog-page-card-desc')
    );
    expect(head, '列表页博客卡缺 cardAttrBadge').toContain('cardAttrBadge(attr)');
    expect(head.indexOf('cardAttrBadge')).toBeGreaterThan(head.indexOf('blog-page-card-title'));
  });

  it('博客卡（主页预览）右上角也有属性位', () => {
    const main = read('src/main.ts');
    const head = main.slice(
      main.indexOf('blog-preview-card-head'),
      main.indexOf('blog-preview-card-desc')
    );
    expect(head, '主页博客预览卡缺 cardAttrBadge').toContain('cardAttrBadge(attr)');
  });

  it('三类卡片都走同一个 cardAttribute，不各写一套判断', () => {
    for (const f of ['src/main.ts', 'blog/build.ts', 'nook/build.ts']) {
      expect(read(f), `${f} 应使用 cardAttribute`).toContain('cardAttribute(');
    }
  });

  it('资源卡的分类只留图标，不再带「网站 / 工具 / 代码」文字', () => {
    for (const [f, marker] of [
      ['nook/build.ts', 'nook-card-header'],
      ['src/main.ts', 'nook-preview-card-header'],
    ]) {
      const s = read(f);
      // 分类胶囊改用与语言徽标同一个方块，纯图标
      expect(s, `${f} 分类应使用 card-attr`).toContain('class="card-attr card-attr--category"');
      // 不再输出旧的分类类名与文字子节点
      expect(s).not.toContain('nook-card-category');
      expect(s).not.toContain('nook-preview-card-category');
      expect(s).not.toMatch(/card-attr--category"[^>]*>[^<]*<span class="chip-text"/);
      void marker;
    }
  });

  it('旧的分类类名已从样式里清干净，详情页那条保留', () => {
    const css = read('src/style.css');
    // 列表卡 / 预览卡的旧类名都不该再有规则（注释里提到是可以的）
    expect(css).not.toMatch(/^\.nook-card-category\b/m);
    expect(css).not.toMatch(/^\.nook-preview-card-category\b/m);
    // 详情页仍有带文字的分类，它的 svg 尺寸规则要留着
    expect(css).toContain('.nook-detail-category svg');
    // 分类方块与语言徽标共用 --attr-box 尺寸
    expect(css).toContain('.card-attr--category svg');
  });
});
