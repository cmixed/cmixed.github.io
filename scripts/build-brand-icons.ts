/**
 * 从官方图标包里提取语言 / 平台的品牌标识，生成 `src/lib/brand-icons.ts`。
 *
 * 为什么要有这一步（2026-11-20）：
 * 这些图标最初是手写的 SVG 路径 —— 字母线稿（P / R / T）和几笔勾勒的企鹅、苹果。
 * 问题不是「不好看」，而是**不可辨识**：描边的 Python 认不出是 Python，字母 C 加两个
 * 十字也只是一个抽象符号。语言与平台标识是读者用来「一眼扫出这条是什么技术栈」的，
 * 必须用业界公认的品牌形状。所以改为从两个权威来源取：
 *
 *   - simple-icons（CC0-1.0）：Python / C++ / Rust / TypeScript / Go / Linux / macOS
 *   - @iconify-json/logos（各品牌方授权）：Windows —— simple-icons 因商标原因下架了它，
 *     这个集合里还留着官方的四格窗
 *
 * 两条约定：
 *   1. **一律转成 currentColor 单色**。品牌原色是硬编码 fill（#3776AB 蓝、#DEA584 橙…），
 *      全彩塞进这条青绿主题的导航与卡片里会立刻变成花花绿绿的一堆。形状已经足够辨识，
 *      颜色交给主题。
 *   2. **路径数据落到仓库里**，不每次构建时读包。两个包合计几十 MB，而这份数据是静态的；
 *      脚本只在 `pnpm brand-icons` 时手动跑（与 `pnpm icons` 同一模式）。
 *
 * 改图标 = 改下面的 SOURCES 再跑 `pnpm brand-icons`。不要手改生成文件。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SI_DIR = join(ROOT, 'node_modules', 'simple-icons', 'icons');
const LOGOS_JSON = join(ROOT, 'node_modules', '@iconify-json', 'logos', 'icons.json');
const OUT = join(ROOT, 'src', 'lib', 'brand-icons.ts');

/** 生成文件里的键 → 来源。改这里就是改映射表。
 *
 *  **只生成当前真实用到的**（数据里出现过的语言 / 平台）。理由很实际：品牌路径
 *  动辄几千字符 —— Linux 一条就 5.3 kB、Rust 4.1 kB —— 全部预置会把首屏 JS 从
 *  30 kB 推到 49 kB，而其中一半是没人看的。
 *
 *  加一门语言 / 一个平台 = 在下面加一行 + `pnpm brand-icons`。
 *  `languageBrand()` 会检查 key 是否真的生成过，缺失时安全回退到标签。 */
const SOURCES: Array<{ key: string; from: 'si' | 'logos'; name: string }> = [
  // ---- 语言 ----
  { key: 'python', from: 'si', name: 'python' },
  { key: 'cpp', from: 'si', name: 'cplusplus' },
  { key: 'rust', from: 'si', name: 'rust' },
  { key: 'typescript', from: 'si', name: 'typescript' },
  // ---- 平台 ----
  { key: 'windows', from: 'logos', name: 'microsoft-windows-icon' },
  { key: 'web', from: 'si', name: 'googlechrome' },
];

/** 把一段 SVG 内部标记压成单行，并抹掉硬编码的颜色。 */
function normalizeBody(body: string): string {
  return (
    body
      // Simple Icons 每个文件都带 <title>Python</title>：我们的徽标已经有
      // aria-label / title 属性，重复一层只会让读屏念两遍，也白占体积
      .replace(/<title>[\s\S]*?<\/title>/g, '')
      .replace(/\s*\n\s*/g, '')
      // 品牌色 → 交给 currentColor（见文件头第 1 条约定）
      .replace(/\sfill="(?!none)[^"]*"/g, '')
      .replace(/\sstyle="[^"]*"/g, '')
      .trim()
  );
}

function readSimpleIcons(name: string): { body: string; viewBox: string } {
  const svg = readFileSync(join(SI_DIR, `${name}.svg`), 'utf8');
  const vb = svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 24 24';
  // 取 <svg ...> 与 </svg> 之间的全部内容（Simple Icons 通常只有一个 <path>）
  const inner = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  return { body: normalizeBody(inner), viewBox: vb };
}

function readLogos(
  name: string,
  icons: Record<string, { body?: string }>
): { body: string; viewBox: string } {
  const entry = icons[name];
  if (!entry?.body) throw new Error(`logos 集合里没有 ${name}`);
  const vb = (entry as { width?: number; height?: number }).width
    ? `0 0 ${(entry as { width: number }).width} ${(entry as { height: number }).height}`
    : '0 0 256 256';
  return { body: normalizeBody(entry.body), viewBox: vb };
}

const logos = JSON.parse(readFileSync(LOGOS_JSON, 'utf8')) as {
  icons: Record<string, { body?: string; width?: number; height?: number }>;
};

const glyphs: Array<{ key: string; body: string; viewBox: string }> = [];
for (const src of SOURCES) {
  const glyph = src.from === 'si' ? readSimpleIcons(src.name) : readLogos(src.name, logos.icons);
  if (!glyph.body) throw new Error(`${src.key} 的内容为空`);
  glyphs.push({ key: src.key, ...glyph });
}

const lines: string[] = [
  '/* 由 scripts/build-brand-icons.ts 生成，不要手改。',
  ' * 来源：simple-icons（CC0-1.0）与 @iconify-json/logos（各品牌方授权）。',
  ' * 重新生成：pnpm brand-icons */',
  '',
  '/** 品牌标识的一段内部标记：可能是一个 <path>，也可能是多个。 */',
  'export interface BrandGlyph {',
  '  body: string;',
  '  viewBox: string;',
  '}',
  '',
  'export const BRAND_GLYPHS = {',
];
for (const g of glyphs) {
  lines.push(`  ${g.key}: {`);
  lines.push(`    viewBox: '${g.viewBox}',`);
  lines.push(`    body: '${g.body.replace(/'/g, "\\'")}',`);
  lines.push('  },');
}
lines.push('} as const satisfies Record<string, BrandGlyph>;', '');
lines.push('export type BrandKey = keyof typeof BRAND_GLYPHS;', '');

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`wrote ${OUT}`);
for (const g of glyphs) {
  console.log(`  ${g.key.padEnd(11)} viewBox=${g.viewBox.padEnd(12)} bodyLen=${g.body.length}`);
}
