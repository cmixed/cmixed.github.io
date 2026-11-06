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
  | 'indent';

const ICONS: Record<IconName, string> = {
  // 置顶用 Material 的 push_pin 实心路径：12px 下比描边 pin 更容易认出来。
  pin: '<path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>',
  doc: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  code: '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
  website:
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  package:
    '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  // 搜索保留原来的填充式 Material 路径，和输入框左侧那颗完全一致。
  search:
    '<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>',
  tag: '<path d="M20.59 13.41 12 22 3 13V4h9l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="8" r="1"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1" fill="currentColor" stroke="none"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  indent:
    '<polyline points="3 8 7 12 3 16"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/>',
};

/** 置顶、搜索是实心路径；其余统一走描边。 */
const FILLED = new Set<IconName>(['pin', 'search']);

const ICON_NAMES = new Set<string>(Object.keys(ICONS));

const CATEGORY_ICONS: Record<string, IconName> = {
  doc: 'doc',
  tool: 'tool',
  code: 'code',
  website: 'website',
};

export function icon(name: IconName, className?: string): string {
  const cls = className ? ` class="${className}"` : '';
  const paint = FILLED.has(name)
    ? 'fill="currentColor"'
    : 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg${cls} viewBox="0 0 24 24" ${paint} aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

/** 小窝分类图标；未知分类回落到「包裹」，不再出现 emoji 兜底。 */
export function categoryIcon(category: string, className?: string): string {
  return icon(CATEGORY_ICONS[category] ?? 'package', className);
}

/** 置顶徽标：6px 方片 + pin 图标，和只读标签同一套「信息」语义。 */
export function pinBadge(): string {
  return `<span class="pin-badge" role="img" aria-label="置顶">${icon('pin')}</span>`;
}

const ICON_TOKEN = /\{\{icon:([a-z]+)(?::([a-z0-9-]+))?\}\}/g;

/** 把 HTML 里的 `{{icon:name}}` / `{{icon:name:class}}` 展开成内联 SVG。 */
export function replaceIcons(html: string): string {
  return html.replace(ICON_TOKEN, (token, name: string, className?: string) => {
    if (!ICON_NAMES.has(name)) return token;
    return icon(name as IconName, className);
  });
}
