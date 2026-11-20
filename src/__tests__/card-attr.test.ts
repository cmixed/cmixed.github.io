import { describe, expect, it } from 'vite-plus/test';
import { cardAttribute, cardAttrBadge, languageBrand, platformBrand } from '../lib/icons';

/**
 * 卡片右上角「语言 / 平台」属性的回归防线。
 *
 * 2026-11-20 改版：图标从手写字母线稿换成**官方品牌标识**（simple-icons / Iconify logos，
 * 见 scripts/build-brand-icons.ts），并且项目卡只画版本号 —— `C++23` 读作
 * 「C++ 的标志 + 23」，不再把 `C++` 重复写成字。
 *
 * 优先级与回退逻辑一旦改错，界面不会报错、只会静默显示错的属性，所以钉在这里。
 */
describe('语言归一化与版本拆分', () => {
  it('C++ 的各种写法共用一个品牌，版本号单独摘出来', () => {
    expect(languageBrand('C++23')).toEqual({ key: 'cpp', version: '23' });
    expect(languageBrand('C++20')).toEqual({ key: 'cpp', version: '20' });
    expect(languageBrand('C++')).toEqual({ key: 'cpp', version: '' });
    expect(languageBrand('cpp')).toEqual({ key: 'cpp', version: '' });
    // 单独一个 C 也算 C/C++，但 css 不能被前缀误命中
    expect(languageBrand('C')).toEqual({ key: 'cpp', version: '' });
    expect(languageBrand('css')).toBeNull();
  });

  it('无版本号的语言返回空 version', () => {
    expect(languageBrand('Python')).toEqual({ key: 'python', version: '' });
    expect(languageBrand('Rust')).toEqual({ key: 'rust', version: '' });
    expect(languageBrand('TypeScript')).toEqual({ key: 'typescript', version: '' });
  });

  it('带小数版本的语言也能摘出版本', () => {
    expect(languageBrand('Python 3.12')).toEqual({ key: 'python', version: '3.12' });
  });

  it('别名与大小写都能认', () => {
    expect(languageBrand('py')?.key).toBe('python');
    expect(languageBrand('rs')?.key).toBe('rust');
    expect(languageBrand('ts')?.key).toBe('typescript');
    expect(languageBrand('PYTHON')?.key).toBe('python');
  });

  it('认得但没有素材的语言安全回退（不渲染空盒子）', () => {
    // 映射表认得 js / go，但 scripts/build-brand-icons.ts 只生成当前用到的 glyph。
    // 这时必须返回 null 让调用方回退到标签，而不是返回一个没有路径的 key。
    expect(languageBrand('JavaScript')).toBeNull();
    expect(languageBrand('Go')).toBeNull();
  });

  it('平台归一化', () => {
    expect(platformBrand('Windows')).toBe('windows');
    expect(platformBrand('Web')).toBe('web');
    // Linux / macOS 尚未生成素材，同样回退
    expect(platformBrand('Linux')).toBeNull();
    expect(platformBrand('macOS')).toBeNull();
    // 无法识别时返回 null，让调用方回退
    expect(platformBrand('PC工具')).toBeNull();
    expect(platformBrand(undefined)).toBeNull();
  });

  it('没有真实品牌的（汇编）不硬凑图标', () => {
    // Assembly 没有官方标识；宁可回退到标签，也不用一个形似的假 logo
    expect(languageBrand('x86-64 Assembly')).toBeNull();
  });
});

describe('卡片属性优先级', () => {
  it('语言优先于平台，项目卡只画版本号', () => {
    const attr = cardAttribute({
      language: 'Rust',
      platform: 'Windows',
      tags: ['Slint'],
      withLabel: true,
    });
    expect(attr?.kind).toBe('language');
    expect(attr?.brand).toBe('rust');
    expect(attr?.text).toBe('Rust'); // 全称给 title / 读屏
    expect(attr?.label).toBe(''); // 没有版本号就不画文字
  });

  it('C++23 在项目卡上只显示 23', () => {
    const attr = cardAttribute({ language: 'C++23', tags: [], withLabel: true });
    expect(attr?.brand).toBe('cpp');
    expect(attr?.label).toBe('23');
  });

  it('资源卡（withLabel: false）一律不画文字', () => {
    const attr = cardAttribute({ language: 'C++23', tags: [], withLabel: false });
    expect(attr?.label).toBe('');
    // 但全称必须保留，否则 title 与读屏就是空的
    expect(attr?.text).toBe('C++23');
  });

  it('没有语言才用平台', () => {
    const attr = cardAttribute({ platform: 'Windows', tags: ['游戏工具'], withLabel: false });
    expect(attr?.kind).toBe('platform');
    expect(attr?.brand).toBe('windows');
  });

  it('两者都没有则回退首个标签，用界面图标而非品牌', () => {
    const attr = cardAttribute({ tags: ['PC工具', '硬件检测'], withLabel: false });
    expect(attr?.kind).toBe('tag');
    expect(attr?.brand).toBeNull();
    expect(attr?.fallbackIcon).toBe('tag');
    expect(attr?.text).toBe('PC工具');
  });

  it('什么都没有返回 null（卡片右上角留空）', () => {
    expect(cardAttribute({ tags: [], withLabel: true })).toBeNull();
  });
});

describe('属性角标渲染', () => {
  it('品牌图标是实心填充，不是描边', () => {
    const html = cardAttrBadge({
      brand: 'cpp',
      fallbackIcon: 'code',
      text: 'C++23',
      label: '23',
      kind: 'language',
    });
    expect(html).toContain('fill="currentColor"');
    expect(html).toContain('stroke="none"');
    expect(html).toContain('card-attr--language');
    // 文字只有版本号，不是整串 C++23
    expect(html).toContain('>23</span>');
    expect(html).not.toContain('>C++23</span>');
    // 全称仍在 title / aria-label
    expect(html).toContain('title="C++23"');
    expect(html).toContain('aria-label="C++23"');
  });

  it('回退到标签时走界面图标（描边），并保留全称', () => {
    const html = cardAttrBadge({
      brand: null,
      fallbackIcon: 'tag',
      text: 'PC工具',
      label: '',
      kind: 'tag',
    });
    expect(html).toContain('stroke="currentColor"');
    expect(html).not.toContain('card-attr-text');
    expect(html).toContain('title="PC工具"');
  });

  it('属性值里的引号被转义，不会破坏标签', () => {
    const html = cardAttrBadge({
      brand: null,
      fallbackIcon: 'tag',
      text: 'a"b',
      label: 'a"b',
      kind: 'tag',
    });
    expect(html).toContain('&quot;');
    expect(html).not.toContain('title="a"b"');
  });
});
