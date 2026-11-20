/**
 * 站内图标的单一来源。
 *
 * 全站 UI 图标都是内联 SVG：24×24 画布、`currentColor`、1.7px 描边、圆头圆角，
 * 这样深浅主题不用各准备一份，也不会像字体字符 / 系统 emoji 那样在不同设备上
 * 换一张脸。GitHub 的官方 mark 是唯一例外（品牌原图，保持填充）。
 *
 * 构建脚本（blog/nook）、浏览器入口（main.ts）和 Vite 的 HTML 注入共用这里的
 * 字符串。HTML 里写 `{{icon:rss}}` 即可，`replaceIcons()` 会在构建时展开；
 * 需要 class 时写 `{{icon:search:search-icon}}`。
 */
export type IconName =
  | 'pin'
  | 'doc'
  | 'tool'
  | 'code'
  | 'website'
  | 'package'
  | 'search'
  | 'tag'
  | 'rss'
  | 'sun'
  | 'moon'
  | 'menu'
  | 'indent'
  | 'home'
  | 'blog'
  | 'nook'
  | 'user'
  | 'folder'
  | 'mail'
  | 'eye'
  | 'langPy'
  | 'langCpp'
  | 'langRs'
  | 'langTs'
  | 'langJs'
  | 'langGo'
  | 'langAsm'
  | 'platWin'
  | 'platLinux'
  | 'platMac';

const ICONS: Record<IconName, string> = {
  // 置顶：图钉线稿（帽 + 身 + 针），和全站其它图标同一套描边。
  // 原来是 Material 的实心 push_pin —— 在所有线稿里像一块贴纸，12px 下也糊成一坨黑。
  pin: '<path d="M8 3.2h8"/><path d="M9.8 3.2v5.2l-2.4 2.8v2.4h9.2v-2.4L14.2 8.4V3.2"/><path d="M12 13.6v5.4"/>',
  doc: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  code: '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
  website:
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  package:
    '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  // 搜索跟其它图标一样走描边：原来那颗实心 Material 路径在导航里是唯一的实心，
  // 和 RSS / 标签 / 主题混排时像是从另一套图标里借来的。
  search: '<circle cx="10.8" cy="10.8" r="6.2"/><path d="m15.4 15.4 4.3 4.3"/>',
  // 标签保留 lucide 的直角 + 尖角轮廓（圆角化后反而认不出是标签）；
  // 孔洞改成实心点并往内挪一格：描边圆在 14px 下糊成一团，贴着左上角也显得偏
  tag: '<path d="M20.59 13.41 12 22 3 13V4h9l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7.8" cy="8.2" r="1.9" fill="currentColor" stroke="none"/>',
  // RSS：点落在两条弧的圆心上（5,19），半径给到 2.4 —— 16px 下直径还有 3.2px，
  // 不会再缩成一颗看不清的灰粒；再大就会压到内弧上
  rss: '<path d="M5 10.4a8.6 8.6 0 0 1 8.6 8.6"/><path d="M5 5a14 14 0 0 1 14 14"/><circle cx="5" cy="19" r="2.4" fill="currentColor" stroke="none"/>',
  // 太阳：八条等长射线，收敛到 r=5.9→7.7，小尺寸下不会散成碎点
  sun: '<circle cx="12" cy="12" r="3.9"/><path d="M12 2.4v1.9M12 19.7v1.9M2.4 12h1.9M19.7 12h1.9M5.2 5.2l1.35 1.35M17.45 17.45l1.35 1.35M18.8 5.2l-1.35 1.35M6.55 17.45 5.2 18.8"/>',
  // 月亮：更饱满的月牙，缺口朝右上
  moon: '<path d="M20.4 14.6A8.7 8.7 0 1 1 9.4 3.6a6.9 6.9 0 0 0 11 11Z"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  indent:
    '<polyline points="3 8 7 12 3 16"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/>',
  /* 三个栏目图标与两处 favicon 同构 —— 房子带拱门 / 折角稿纸 / 等距收纳盒，
     「点它去那个栏目」由图形本身说明。原先这三个只存在于 fab.ts（坞的跨页入口），
     现在坞不再放跨页入口，改由导航栏承担，于是提到这里做单一来源。
     门洞跟着整体放大：3.6 宽、5.0 高的拱门在 18px 下才读得出「是扇门」。 */
  home: '<path d="M4.4 11.3 12 5.1l7.6 6.2"/><path d="M6.7 9.9v9.2h10.6V9.9"/><path d="M10.2 19.1v-3.2a1.8 1.8 0 0 1 3.6 0v3.2"/>',
  blog: '<path d="M7.4 4.6h6.4l3.2 3.2v11.6H7.4Z"/><path d="M13.8 4.6v3.2h3.2"/><path d="M9.8 12.2h5.4M9.8 15.2h3.8"/>',
  nook: '<path d="M12 5 18.6 8.4v7.2L12 19l-6.6-3.4V8.4Z"/><path d="M5.4 8.4 12 11.8l6.6-3.4M12 11.8V19"/>',
  /** 关于：单人半身像（头 + 肩），比「信息 i」更贴近「这个人是谁」。 */
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5.2 20.2a6.8 6.8 0 0 1 13.6 0"/>',
  /** 项目：打开的文件夹。比 <> 更稳 —— <> 已经有 code 图标在用。 */
  folder:
    '<path d="M3.6 7.2a2 2 0 0 1 2-2h3.1l2 2.2h6.1a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2Z"/><path d="M3.6 11.2h16.2"/>',
  /** 联系：信封（封口 V 折）。 */
  mail: '<rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.2"/><path d="m4.4 7.4 7.6 5.4 7.6-5.4"/>',
  /** 卡片预览：一只眼睛（看完整内容）。 */
  eye: '<path d="M2.6 12S6.1 5.8 12 5.8 21.4 12 21.4 12 17.9 18.2 12 18.2 2.6 12 2.6 12Z"/><circle cx="12" cy="12" r="2.7"/>',

  /* ===== 语言图标 =====
     一律是「字母线稿」，不画品牌 logo：品牌标志几乎都是实心色块，
     塞进这套 1.7px 开放路径里会糊成一团（和当初撤掉实心 pushpin 同一个理由）。
     字母在 16px 下仍可辨，且项目卡旁边本来就有文字（C++20 / Rust）做二次确认。
     C++ 用 C 加两个小十字 —— 单看 C 分不出 C 还是 C++。 */
  langPy: '<path d="M9.4 17V8h3.6a3 3 0 0 1 0 6H9.4"/>',
  langCpp:
    '<path d="M14.6 9.6a4 4 0 1 0 0 4.8"/><path d="M17.4 8.6v3M15.9 10.1h3"/><path d="M21 8.6v3M19.5 10.1h3"/>',
  langRs: '<path d="M9.4 17V8h3.4a2.7 2.7 0 0 1 0 5.4H9.4"/><path d="m12.8 13.4 3.2 3.6"/>',
  langTs: '<path d="M8 8.6h7.2"/><path d="M11.6 8.6V17"/>',
  langJs: '<path d="M14.8 8.6V15a2.3 2.3 0 0 1-4.6 0"/>',
  langGo: '<path d="M15.8 10.2a3.9 3.9 0 1 0 0 3.8h.2v-2.1h-2.3"/>',
  langAsm: '<path d="M8.6 17 12 8l3.4 9"/><path d="M9.9 14.1h4.2"/>',

  /* ===== 平台图标 =====
     这四个是「纯图标」场合（资源卡右上角不带文字），所以必须靠形状说话，
     不能用字母。Windows 用标志性的透视四格，Web 复用已有的地球，
     Linux / macOS 各自给一只简化轮廓。 */
  platWin:
    '<path d="M4 6.6 11 5.6v6H4Z"/><path d="M12.6 5.4 20 4.4v7.2h-7.4Z"/><path d="M4 13.4h7v6L4 18.4Z"/><path d="M12.6 13.4H20v7.2l-7.4-1Z"/>',
  platLinux:
    '<path d="M12 3.6a3.1 3.1 0 0 1 3.1 3.1v3c1.6 2 2.5 4.5 2.5 7 0 2.1-2.5 3.3-5.6 3.3S6.4 18.8 6.4 16.7c0-2.5.9-5 2.5-7v-3A3.1 3.1 0 0 1 12 3.6Z"/><path d="M6.6 17.4c-1.3 1-1.9 2-1.5 2.5.5.7 2.4.3 4.2-.8"/><path d="M17.4 17.4c1.3 1 1.9 2 1.5 2.5-.5.7-2.4.3-4.2-.8"/>',
  platMac:
    '<path d="M15.3 8.6c-.9 0-1.6.5-2.2.5s-1.3-.5-2.1-.5c-1.9 0-3.7 1.7-3.7 4.3 0 2.8 1.9 6 3.5 6 .7 0 1.2-.5 2.1-.5s1.4.5 2.1.5c1.6 0 3.5-3.2 3.5-6 0-2.6-1.6-4.3-3.2-4.3Z"/><path d="M12.3 8.3c-.2-1.5 1-2.9 2.5-3.1.2 1.5-1 3-2.5 3.1Z"/>',
};

/** 全部图标统一走描边（fill: none）；置顶也从实心改回线稿，不再有例外。 */
const ICON_NAMES = new Set<string>(Object.keys(ICONS));

const CATEGORY_ICONS: Record<string, IconName> = {
  doc: 'doc',
  tool: 'tool',
  code: 'code',
  website: 'website',
};

/* 置顶标记已改为 emoji（见 pinBadge），不再需要裁紧的视窗常量。 */

export function icon(name: IconName, className?: string, viewBox = '0 0 24 24'): string {
  const cls = className ? ` class="${className}"` : '';
  return `<svg${cls} viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

/** 小窝分类图标；未知分类回落到「包裹」，不再出现 emoji 兜底。 */
export function categoryIcon(category: string, className?: string): string {
  return icon(CATEGORY_ICONS[category] ?? 'package', className);
}

/* ===== 置顶标记 =====
   2026-11-20 按要求从「方框 + 线稿图钉」改成 emoji 📌，并且移到卡片标题**最前面**。
   这确实和文档里「不用 emoji：彩色字形跨平台不一致、不跟 currentColor / 主题走」
   那条约定相反 —— 那次是为了让图标语言统一，这次是为了让置顶在标题行里一眼可见：
   原来是右上角一个小方框，标题单行省略之后它离标题反而更远。
   代价是 Windows / macOS / Android 各画一枚略不同的图钉；接受这个代价，
   因为它的作用是「扫一眼知道这条被置顶」，不需要和线稿图标同构。
   显隐由导航栏那颗开关控制（`html[data-pin-hidden] .pin-mark`），
   关掉之后置顶仍然靠卡片顶部的 accent 色带表达，不会失去信息。 */
export function pinBadge(): string {
  return `<span class="pin-mark" role="img" aria-label="置顶">📌</span>`;
}

/* ===== 语言 / 平台 → 图标 =====
   两处数据来源都写成自由字符串（frontmatter 的 `language: C++`、projects.json 的
   `"language": "C++20"`），所以这里按**归一化前缀**匹配，不做精确相等：
   C++20 / C++23 / C++ 共用一颗，TypeScript / TS 共用一颗。
   匹配不上返回 null，由调用方回退（资源卡回退首个标签的 tag 图标）。 */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

/** 语言名 → 图标。`C` 单独一次精确判断 —— 前缀匹配会让 `css` 误命中。 */
export function languageIcon(name: string | undefined): IconName | null {
  if (!name) return null;
  const v = normalize(name);
  if (v === 'c' || v.startsWith('c++') || v.startsWith('cpp')) return 'langCpp';
  if (v.startsWith('python') || v === 'py') return 'langPy';
  if (v.startsWith('rust') || v === 'rs') return 'langRs';
  if (v.startsWith('typescript') || v === 'ts') return 'langTs';
  if (v.startsWith('javascript') || v === 'js' || v.startsWith('node')) return 'langJs';
  if (v === 'go' || v.startsWith('golang')) return 'langGo';
  if (v.startsWith('assembly') || v === 'asm' || v.startsWith('x86') || v.startsWith('arm'))
    return 'langAsm';
  return null;
}

/** 平台名 → 图标。Web 复用已有的地球（`website`），不另画一颗。 */
export function platformIcon(name: string | undefined): IconName | null {
  if (!name) return null;
  const v = normalize(name);
  if (v.startsWith('windows') || v === 'win') return 'platWin';
  if (v.startsWith('linux')) return 'platLinux';
  if (v.startsWith('macos') || v === 'mac' || v.startsWith('darwin') || v === 'osx')
    return 'platMac';
  if (v === 'web' || v.startsWith('浏览器') || v.startsWith('前端') || v.startsWith('browser'))
    return 'website';
  return null;
}

/** 卡片右上角属性（项目卡：图标 + 文字；资源卡：纯图标）。 */
export interface CardAttr {
  icon: IconName;
  /** 全称（语言名 / 平台名 / 首个标签）。纯图标时它仍要留着做 title 与读屏名 */
  text: string;
  /** 是否在图标后画出文字 */
  withLabel: boolean;
  kind: 'language' | 'platform' | 'tag';
}

/**
 * 算出卡片右上角该显示哪一条属性。
 *
 * 优先级：语言 → 平台 → 回退首个标签。
 * - 项目卡两样都带文字（C++20 与 C++23 必须靠文字区分）；
 * - 资源卡只出图标（用户明确要求「文字不要」），回退时用 tag 图标 + `title` 补全称。
 */
export function cardAttribute(opts: {
  language?: string;
  platform?: string;
  tags?: string[];
  withLabel: boolean;
}): CardAttr | null {
  const langIcon = languageIcon(opts.language);
  if (langIcon && opts.language) {
    return { icon: langIcon, text: opts.language, withLabel: opts.withLabel, kind: 'language' };
  }
  const platIcon = platformIcon(opts.platform);
  if (platIcon && opts.platform) {
    return { icon: platIcon, text: opts.platform, withLabel: opts.withLabel, kind: 'platform' };
  }
  const first = opts.tags?.[0];
  if (first) {
    // 语言 / 平台都没写时才回退；标签本身没有专属图标，用通用的 tag
    return { icon: 'tag', text: first, withLabel: opts.withLabel, kind: 'tag' };
  }
  return null;
}

/** 右上角那颗属性的 HTML。纯图标时把全称塞进 title + aria-label。 */
export function cardAttrBadge(attr: CardAttr): string {
  const text = escapeAttr(attr.text);
  const label = attr.withLabel ? `<span class="card-attr-text">${text}</span>` : '';
  return `<span class="card-attr card-attr--${attr.kind}" title="${text}" aria-label="${text}">${icon(attr.icon)}${label}</span>`;
}

/** 属性值来自数据文件，可能含引号，进属性前必须转义。 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ICON_TOKEN = /\{\{icon:([a-z]+)(?::([a-z0-9-]+))?\}\}/g;

/** 把 HTML 里的 `{{icon:name}}` / `{{icon:name:class}}` 展开成内联 SVG。 */
export function replaceIcons(html: string): string {
  return html.replace(ICON_TOKEN, (token, name: string, className?: string) => {
    if (!ICON_NAMES.has(name)) return token;
    return icon(name as IconName, className);
  });
}
