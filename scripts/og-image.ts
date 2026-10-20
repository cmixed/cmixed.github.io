/* 社交分享卡片（1200×630 PNG）的生成脚本。
 *
 * 它和页面不共享 DOM，但共享颜色：整块暗色 :root 直接从 src/style.css 抄进渲染页面，
 * 所以改 token 之后重跑一次就跟上了 —— 上一版停在旧配色，正是因为颜色是手抄的。
 * 版式照搬主页 hero：状态胶囊 → 名字 → 签名 → 一行副标题，只放大到卡片比例。
 *
 * 字体默认走系统栈；想让产物与站内字体一致，把 Inter / JetBrains Mono 的 woff2 放进
 * 任意目录，用 OG_FONT_DIR=<目录> 跑一次（字体体积大，不进仓库）。
 *
 * 用法：vp run og-image
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const WIDTH = 1200;
const HEIGHT = 630;
const OUTPUT = join(root, 'public', 'assets', 'og-image.png');

/** 暗色主题那一整块 :root（站内默认主题），原样搬进渲染页面，token 不重复一遍。 */
async function darkTokens(): Promise<string> {
  const css = await readFile(join(root, 'src/style.css'), 'utf8');
  const start = css.indexOf('\n:root {');
  const end = css.indexOf('\n}', start);
  if (start < 0 || end < 0) throw new Error('src/style.css 里找不到 :root 块');
  return css.slice(start + 1, end + 2);
}

/** 可选的本地字体：一个 variable woff2 就覆盖全部字重，所以每个家族取一份即可。 */
async function fontFaces(): Promise<string> {
  const dir = process.env.OG_FONT_DIR;
  if (!dir) return '';
  const families = new Map<string, string>();
  for (const file of await readdir(dir)) {
    if (extname(file) !== '.woff2') continue;
    const family = file.split('-')[0].replace(/([a-z])([A-Z])/g, '$1 $2');
    if (!families.has(family)) families.set(family, file);
  }
  const faces: string[] = [];
  for (const [family, file] of families) {
    const data = (await readFile(join(dir, file))).toString('base64');
    faces.push(
      `@font-face{font-family:'${family}';font-style:normal;font-weight:100 900;font-display:block;` +
        `src:url(data:font/woff2;base64,${data}) format('woff2')}`
    );
  }
  return faces.join('\n');
}

function html(tokens: string, faces: string): string {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<style>
${faces}
${tokens}
html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;background:var(--bg)}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'PingFang SC','Noto Sans SC',sans-serif;
  color:var(--text);-webkit-font-smoothing:antialiased}
.card{position:relative;width:${WIDTH}px;height:${HEIGHT}px;display:flex;align-items:center;justify-content:center}
/* 洗色：和页面同一套三处柔光，按卡片比例重排 */
.wash{position:absolute;inset:0;background:
  radial-gradient(58% 52% at 16% 6%, var(--mica-wash-1), transparent 70%),
  radial-gradient(52% 46% at 87% 12%, var(--mica-wash-3), transparent 72%),
  radial-gradient(66% 58% at 80% 97%, var(--mica-wash-2), transparent 70%)}
/* 点阵：站内是 22px 网格，这里在中心留清楚、向边缘淡出 */
.dots{position:absolute;inset:0;opacity:0.55;
  background-image:radial-gradient(circle at 50% 50%, var(--dot) 0.9px, transparent 1.7px);
  background-size:22px 22px;
  -webkit-mask-image:radial-gradient(76% 78% at 50% 44%, #000 0%, transparent 84%);
  mask-image:radial-gradient(76% 78% at 50% 44%, #000 0%, transparent 84%)}
/* 内容背后的光斑（hero::before 那张） */
.glow{position:absolute;left:50%;top:42%;width:1000px;height:1000px;transform:translate(-50%,-50%);
  background:radial-gradient(circle, var(--primary-glow) 0%, transparent 66%)}
/* 顶部受光 + 四周暗角：页面的静态光源 */
.light{position:absolute;inset:0;background:
  linear-gradient(180deg, var(--mica-light-top), transparent 36%),
  radial-gradient(120% 105% at 50% 36%, transparent 50%, var(--mica-vignette) 100%)}
main{position:relative;text-align:center;display:flex;flex-direction:column;align-items:center}
.status{display:inline-flex;align-items:center;gap:10px;padding:9px 22px;border-radius:999px;
  background:var(--mica-surface);border:1px solid var(--border);
  color:var(--text-dim);font-size:19px;letter-spacing:0.01em}
.status i{width:9px;height:9px;border-radius:50%;background:var(--primary);box-shadow:0 0 0 4px var(--mica-raised)}
h1{font-size:112px;font-weight:800;line-height:1;letter-spacing:-0.038em;margin:28px 0 26px;color:var(--text)}
.tagline{font-family:'JetBrains Mono','SF Mono',ui-monospace,monospace;font-size:21px;
  color:var(--text-dim);letter-spacing:0.02em}
.tagline::after{content:'';display:inline-block;width:2px;height:1.05em;background:var(--primary);
  margin-left:6px;vertical-align:-0.15em}
footer{position:absolute;left:80px;right:80px;bottom:40px;display:flex;justify-content:space-between;
  font-family:'JetBrains Mono','SF Mono',ui-monospace,monospace;font-size:16px;
  color:var(--text-muted);letter-spacing:0.12em}
</style></head>
<body><div class="card">
  <div class="wash"></div><div class="dots"></div><div class="glow"></div><div class="light"></div>
  <main>
    <div class="status"><i></i>Available for opportunities</div>
    <h1>cmixed</h1>
    <p class="tagline">Modern C++ Developer · Rust Engineer · 性能优化</p>
  </main>
  <footer><span>cmixed.github.io</span><span>技术博客 · 资源小窝</span></footer>
</div></body></html>`;
}

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.setContent(html(await darkTokens(), await fontFaces()), {
    waitUntil: 'load',
  });
  await page.evaluate(() => document.fonts.ready);
  const shot = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  });
  // 渐变 + 点阵用真彩 PNG 要 400KB 上下；调色板量化后 60KB 左右，肉眼无差
  const optimized = await sharp(shot)
    .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
    .toBuffer();
  await writeFile(OUTPUT, optimized);
  console.log(`✓ ${OUTPUT} (${Math.round(optimized.length / 1024)}KB)`);
} finally {
  await browser.close();
}
