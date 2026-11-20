import { describe, expect, it } from 'vite-plus/test';
import { cardAttribute, cardAttrBadge, languageIcon, platformIcon } from '../lib/icons';

/**
 * 卡片右上角「语言 / 平台」属性的回归防线（2026-11-20 新增）。
 *
 * 需求：语言、平台从 tags 里拆出来成为卡片属性，用图标放右上角。
 * 优先级是「语言 → 平台 → 首个标签」；项目卡带文字、资源卡纯图标。
 * 这些规则一旦被改错，界面不会报错，只会静默显示错的属性 —— 所以钉在这里。
 */
describe('语言 / 平台归一化', () => {
  it('语言按前缀匹配：C++20 与 C++23 共用一颗', () => {
    expect(languageIcon('C++20')).toBe('langCpp');
    expect(languageIcon('C++23')).toBe('langCpp');
    expect(languageIcon('C++')).toBe('langCpp');
    expect(languageIcon('cpp')).toBe('langCpp');
    // 单独一个 C 也算 C/C++，但 css 不能被前缀误命中
    expect(languageIcon('C')).toBe('langCpp');
    expect(languageIcon('css')).toBeNull();
  });

  it('其余语言大小写与别名都能认', () => {
    expect(languageIcon('Python')).toBe('langPy');
    expect(languageIcon('py')).toBe('langPy');
    expect(languageIcon('Rust')).toBe('langRs');
    expect(languageIcon('TypeScript')).toBe('langTs');
    expect(languageIcon('ts')).toBe('langTs');
    expect(languageIcon('JavaScript')).toBe('langJs');
    expect(languageIcon('Go')).toBe('langGo');
    expect(languageIcon('Assembly')).toBe('langAsm');
    expect(languageIcon('x86')).toBe('langAsm');
  });

  it('平台归一化，Web 复用地球图标', () => {
    expect(platformIcon('Windows')).toBe('platWin');
    expect(platformIcon('Linux')).toBe('platLinux');
    expect(platformIcon('macOS')).toBe('platMac');
    expect(platformIcon('Web')).toBe('website');
    // 无法识别时返回 null，让调用方回退
    expect(platformIcon('PC工具')).toBeNull();
    expect(platformIcon(undefined)).toBeNull();
  });
});

describe('卡片属性优先级', () => {
  it('语言优先于平台', () => {
    const attr = cardAttribute({
      language: 'Rust',
      platform: 'Windows',
      tags: ['Slint'],
      withLabel: true,
    });
    expect(attr?.kind).toBe('language');
    expect(attr?.icon).toBe('langRs');
    expect(attr?.text).toBe('Rust');
  });

  it('没有语言才用平台', () => {
    const attr = cardAttribute({ platform: 'Windows', tags: ['游戏工具'], withLabel: false });
    expect(attr?.kind).toBe('platform');
    expect(attr?.icon).toBe('platWin');
  });

  it('两者都没有则回退首个标签，用通用 tag 图标', () => {
    const attr = cardAttribute({ tags: ['PC工具', '硬件检测'], withLabel: false });
    expect(attr?.kind).toBe('tag');
    expect(attr?.icon).toBe('tag');
    expect(attr?.text).toBe('PC工具');
  });

  it('什么都没有返回 null（卡片右上角留空）', () => {
    expect(cardAttribute({ tags: [], withLabel: true })).toBeNull();
  });
});

describe('属性角标的渲染', () => {
  it('项目卡带文字，资源卡纯图标但保留 title / aria-label', () => {
    const withText = cardAttrBadge({
      icon: 'langCpp',
      text: 'C++20',
      withLabel: true,
      kind: 'language',
    });
    expect(withText).toContain('card-attr--language');
    expect(withText).toContain('card-attr-text');
    expect(withText).toContain('C++20');

    const iconOnly = cardAttrBadge({
      icon: 'platWin',
      text: 'Windows',
      withLabel: false,
      kind: 'platform',
    });
    expect(iconOnly).toContain('card-attr--platform');
    // 用户要求「文字不要」：不画文字节点，但全称仍要可读
    expect(iconOnly).not.toContain('card-attr-text');
    expect(iconOnly).toContain('title="Windows"');
    expect(iconOnly).toContain('aria-label="Windows"');
  });

  it('属性值里的引号被转义，不会破坏标签', () => {
    const html = cardAttrBadge({ icon: 'tag', text: 'a"b', withLabel: true, kind: 'tag' });
    expect(html).toContain('&quot;');
    expect(html).not.toContain('title="a"b"');
  });
});
