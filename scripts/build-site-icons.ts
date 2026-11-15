/**
 * 由三枚 SVG favicon 生成 iOS 用的 192×192 PNG。
 *
 * SVG 是圆角墨底、四角透明；apple-touch-icon 不接受 SVG，而且 iOS 会把透明角
 * 渲染成黑块，所以 PNG 先铺一层同色实底再叠图标。改完 SVG 跑一次 `pnpm icons`。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dir = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public', 'assets', 'icons');
const ICONS: Record<string, string> = {
  site: 'site-wf-192x192.png',
  blog: 'blog-192x192.png',
  nook: 'nook-192x192.png',
};
/** 与 SVG 渐变底端同色，圆角外的四角由它兜住 */
const INK = '#0d2023';

for (const [name, file] of Object.entries(ICONS)) {
  const svg = readFileSync(join(dir, `${name}.svg`));
  // density 576 = 32 viewBox 单位放大 8 倍，再收到 192，边缘仍按矢量重采样
  const icon = await sharp(svg, { density: 576 }).resize(192, 192).png().toBuffer();
  const canvas = await sharp({
    create: { width: 192, height: 192, channels: 4, background: INK },
  })
    .png()
    .toBuffer();
  await sharp(canvas)
    .composite([{ input: icon }])
    .png()
    .toFile(join(dir, file));
  console.log(`✓ ${file}`);
}
