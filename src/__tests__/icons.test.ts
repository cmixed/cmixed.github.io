import { describe, expect, it } from 'vite-plus/test';
import { categoryIcon, icon, pinBadge, replaceIcons } from '../lib/icons';

describe('icon', () => {
  it('描边图标统一 currentColor、1.7px 与 aria-hidden', () => {
    const svg = icon('doc');
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('stroke-width="1.7"');
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('viewBox="0 0 24 24"');
  });

  it('所有图标根元素统一描边，不再有整颗实心的图标', () => {
    for (const name of ['pin', 'search', 'rss', 'moon'] as const) {
      const svg = icon(name);
      expect(svg, name).toMatch(/^<svg[^>]*fill="none"/);
      expect(svg, name).toContain('stroke-width="1.7"');
      /* 内部的小点可以 fill —— RSS 的圆点、标签的孔洞在 14px 下只能这么画；
         但整颗图标本身不再是实心路径 */
      expect(svg, name).not.toMatch(/^<svg[^>]*fill="currentColor"/);
    }
  });

  it('可以附加 class', () => {
    expect(icon('search', 'search-icon')).toContain('class="search-icon"');
  });

  it('未知分类回落到 package，不再出现 emoji 兜底', () => {
    expect(categoryIcon('nope')).toBe(icon('package'));
    expect(categoryIcon('nope')).not.toMatch(/[\u{1F000}-\u{1FAFF}]/u);
  });

  it('pinBadge 是 emoji，带「置顶」语义标签', () => {
    const badge = pinBadge();
    expect(badge).toContain('class="pin-mark"');
    expect(badge).toContain('aria-label="置顶"');
    expect(badge).toContain('📌');
    // 不再是方框 + 内联 SVG（那条约定被明确覆盖，见 icons.ts 的说明）
    expect(badge).not.toContain('<svg');
    expect(badge).not.toContain('pin-badge');
  });
});

describe('replaceIcons', () => {
  it('展开带 class 的令牌', () => {
    expect(replaceIcons('{{icon:search:search-icon}}')).toContain('class="search-icon"');
  });

  it('未知图标令牌保持原样', () => {
    expect(replaceIcons('{{icon:nope}}')).toBe('{{icon:nope}}');
  });

  it('一次替换同一段 HTML 里的多个令牌', () => {
    const html = replaceIcons('<a>{{icon:rss}}</a><span>{{icon:moon}}</span>');
    expect(html.match(/<svg/g)).toHaveLength(2);
    expect(html).not.toContain('{{icon:');
  });
});
