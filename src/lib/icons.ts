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
  // 搜索跟其它图标一样走描边：原来那颗实心 Material 路径在导航里是唯一的实心，
  // 和 RSS / 标签 / 主题混排时像是从另一套图标里借来的。
  search: '<circle cx="10.8" cy="10.8" r="6.2"/><path d="m15.4 15.4 4.3 4.3"/>',
  // 标签保留 lucide 的直角 + 尖角轮廓（圆角化后反而认不出是标签），孔洞放大到 1.3
  tag: '<path d="M20.59 13.41 12 22 3 13V4h9l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="8" r="1.3"/>',
  // RSS：点落在两条弧的圆心上（5,19），原来偏到 (5.6,18.4)，三条元素看着不共心
  rss: '<path d="M5 10.4a8.6 8.6 0 0 1 8.6 8.6"/><path d="M5 5a14 14 0 0 1 14 14"/><circle cx="5" cy="19" r="1.7" fill="currentColor" stroke="none"/>',
  // 太阳：八条等长射线，收敛到 r=5.9→7.7，小尺寸下不会散成碎点
  sun: '<circle cx="12" cy="12" r="3.9"/><path d="M12 2.4v1.9M12 19.7v1.9M2.4 12h1.9M19.7 12h1.9M5.2 5.2l1.35 1.35M17.45 17.45l1.35 1.35M18.8 5.2l-1.35 1.35M6.55 17.45 5.2 18.8"/>',
  // 月亮：更饱满的月牙，缺口朝右上
  moon: '<path d="M20.4 14.6A8.7 8.7 0 1 1 9.4 3.6a6.9 6.9 0 0 0 11 11Z"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  indent:
    '<polyline points="3 8 7 12 3 16"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/>',
};

/** 置顶徽标是唯一保留实心的：12px 下描边 pin 认不出来。搜索已改回描边。 */
const FILLED = new Set<IconName>(['pin']);

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
