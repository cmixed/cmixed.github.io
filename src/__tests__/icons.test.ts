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

  it('置顶与搜索用实心路径', () => {
    expect(icon('pin')).toContain('fill="currentColor"');
    expect(icon('search')).toContain('fill="currentColor"');
    expect(icon('search')).not.toContain('stroke-width');
  });

  it('可以附加 class', () => {
    expect(icon('search', 'search-icon')).toContain('class="search-icon"');
  });

  it('未知分类回落到 package，不再出现 emoji 兜底', () => {
    expect(categoryIcon('nope')).toBe(icon('package'));
    expect(categoryIcon('nope')).not.toMatch(/[\u{1F000}-\u{1FAFF}]/u);
  });

  it('pinBadge 带「置顶」语义标签', () => {
    const badge = pinBadge();
    expect(badge).toContain('class="pin-badge"');
    expect(badge).toContain('aria-label="置顶"');
    expect(badge).toContain('<svg');
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
