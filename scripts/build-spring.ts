/**
 * 构建期把弹簧曲线采样成 CSS `linear()`，并写进 src/style.css 的标记区。
 *
 * 为什么放在构建期：`linear()` 的点列是纯几何计算，跟运行时状态无关，
 * 采样 32 个点足够让肉眼分不出和多段贝塞尔的差别，而浏览器拿到的是
 * 一条普通缓动 —— 合成器直接插值，主线程零参与。
 *
 * 两条曲线：
 *   press  临界阻尼 ζ=1，ω=26，约 260ms 收敛 —— 按压缩放、图标切换这种「短促」动效
 *   scroll 欠阻尼 ζ=0.85，ω=18，约 380ms 收敛 —— 滚动到位「轻轻一顿」，
 *          过冲约 2%，只跳一次，不是弹簧玩具
 *
 * 运行时按松手速度伸缩的部分（滚动）不在这里：那要拿到实时速度才能算，
 * 见 src/lib/spring.ts 的解析式求值。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SAMPLES = 32;

interface Curve {
  zeta: number;
  omega: number;
}

/** 0→1 的归一化位移；ζ<1 会过冲，超过 1 的值原样保留（回弹就靠它）。 */
function value(t: number, { zeta, omega }: Curve): number {
  if (zeta >= 1) return 1 - (1 + omega * t) * Math.exp(-omega * t);
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const e = Math.exp(-zeta * omega * t);
  return 1 - e * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
}

/** 收敛到 0.1% 以内所需的时间，作为动画时长。 */
function settle({ zeta, omega }: Curve): number {
  let t = 0;
  while (t < 4 && Math.abs(1 - value(t, { zeta, omega })) > 0.001) t += 0.002;
  return Math.min(4, t + 0.02);
}

function linearEase(curve: Curve): string {
  const duration = settle(curve);
  const points: string[] = ['0'];
  for (let i = 1; i <= SAMPLES; i += 1) {
    const at = (duration * i) / SAMPLES;
    const x = value(at, curve).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    const percent = ((i / SAMPLES) * 100).toFixed(1).replace(/\.0$/, '');
    points.push(`${x} ${percent}%`);
  }
  return `linear(${points.join(', ')})`;
}

const PRESS: Curve = { zeta: 1, omega: 26 };
const SCROLL: Curve = { zeta: 0.85, omega: 18 };

const pressEase = linearEase(PRESS);
const scrollEase = linearEase(SCROLL);

/** 把两条曲线写进 style.css 的标记区，单一来源始终是这个脚本。 */
const cssPath = join(ROOT, 'src', 'style.css');
const css = readFileSync(cssPath, 'utf-8');
const block = [
  '    /* 由 scripts/build-spring.ts 生成，勿手改：改曲线请改脚本里的 ζ / ω */',
  `    --spring-press: ${pressEase};`,
  `    --spring-scroll: ${scrollEase};`,
].join('\n');
const next = css.replace(
  /\/\* spring-ease:start \*\/[\s\S]*?\/\* spring-ease:end \*\//,
  `/* spring-ease:start */\n${block}\n    /* spring-ease:end */`
);
if (next === css) throw new Error('style.css 里找不到 spring-ease 标记区');
writeFileSync(cssPath, next);

/** 运行时（滚动）用同一组参数求值，避免两处参数漂移。 */
const tsPath = join(ROOT, 'src', 'lib', 'spring.ts');
const ts = `/**
 * 弹簧参数的单一来源（由 scripts/build-spring.ts 生成，勿手改）。
 *
 * 滚动不能用 CSS：scrollTop 不是合成属性，只能逐帧写。这里只存参数，
 * 求值在运行时按「距离 + 松手速度」算 —— 那是编译期拿不到的量。
 */
export const PRESS = { zeta: ${PRESS.zeta}, omega: ${PRESS.omega} } as const;
export const SCROLL = { zeta: ${SCROLL.zeta}, omega: ${SCROLL.omega} } as const;
`;
writeFileSync(tsPath, ts);

console.log(`✓ spring: press ${settle(PRESS).toFixed(2)}s / scroll ${settle(SCROLL).toFixed(2)}s`);
