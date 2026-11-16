import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { SCROLL } from '../lib/spring';

/**
 * 弹簧曲线的回归防线。
 *
 * 曲线由 scripts/build-spring.ts 在构建期采样，写进 style.css 的标记区；
 * 滚动那份参数同时写进 src/lib/spring.ts。fab.ts 因为 esbuild 只做 transform
 * 没法 import，参数是手抄的 —— 这里钉住两处一致，防止改了脚本忘了同步。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');
const fab = readFileSync(join(ROOT, 'src', 'client', 'fab.ts'), 'utf-8');

function samples(name: string): number[] {
  const raw = css.match(new RegExp(`--${name}: linear\\(([^;]+)\\);`))?.[1] ?? '';
  return raw
    .split(',')
    .map((point) => Number(point.trim().split(' ')[0]))
    .filter((n) => !Number.isNaN(n));
}

describe('spring 曲线', () => {
  it('style.css 里两条曲线都是构建期采样出来的 linear()', () => {
    expect(css).toContain('--spring-press: linear(0,');
    expect(css).toContain('--spring-scroll: linear(0,');
  });

  it('滚动曲线采样足够密，且有一次轻微过冲（回弹靠它）', () => {
    const xs = samples('spring-scroll');
    expect(xs.length).toBeGreaterThan(24);
    expect(Math.max(...xs)).toBeGreaterThan(1);
    expect(Math.max(...xs)).toBeLessThan(1.05);
  });

  it('按压曲线是临界阻尼，不过冲', () => {
    const xs = samples('spring-press');
    expect(xs.length).toBeGreaterThan(24);
    expect(Math.max(...xs)).toBeLessThanOrEqual(1.0001);
  });

  it('fab.ts 的滚动参数与 src/lib/spring.ts 同源', () => {
    expect(fab).toContain(`zeta: ${SCROLL.zeta}`);
    expect(fab).toContain(`omega: ${SCROLL.omega}`);
  });
});
