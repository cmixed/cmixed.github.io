import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

/**
 * 更新日志条目的回归防线：左侧缩进、三段顺序、两颗小标签的分工、窄屏两段式布局。
 *
 * 这一版之前 `.md-body ul`（0,1,1）压过了 `.changelog-list`（0,1,0），
 * 整块列表被通用 Markdown 缩进推到右侧 22.5px；窄屏又坚持单行三段，
 * 正文只剩 130px、要折三四行。后来把定长 hash 移到行首、分类标签移到行尾，
 * 正文左缘才不再随标签宽度漂移。
 */
const ROOT = join(import.meta.dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src', 'style.css'), 'utf-8');
const main = readFileSync(join(ROOT, 'src', 'main.ts'), 'utf-8');

/** 取出某个选择器的第一条规则体（这些块都是扁平的）。 */
function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `找不到选择器 ${selector}`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
}

describe('更新日志条目的布局与标签分工', () => {
  it('列表缩进用 .md-body 双类压过通用 ul 规则', () => {
    const list = rule('.md-body .changelog-list');
    expect(list).toContain('padding: 0');
    expect(list).toContain('margin: 0');
    expect(rule('.md-body .changelog-list > li')).toContain('margin-bottom: 0');
  });

  it('渲染顺序是 hash → subject → type', () => {
    const start = main.indexOf('const inner = `<span');
    expect(start).toBeGreaterThan(-1);
    const line = main.slice(start, main.indexOf('`;', start));
    const hash = line.indexOf('changelog-hash');
    const subject = line.indexOf('changelog-subject');
    const type = line.indexOf('changelog-type');
    expect(hash).toBeGreaterThan(-1);
    expect(hash).toBeLessThan(subject);
    expect(subject).toBeLessThan(type);
  });

  it('hash 是定宽编号块、type 是右对齐的分类标签，材质不同', () => {
    const hash = rule('.changelog-hash');
    expect(hash).toContain('min-width: 4.6rem');
    expect(hash).toContain('background: var(--mica-chip)');
    expect(hash).toContain('border: 1px solid var(--border)');
    const type = rule('.changelog-type');
    expect(type).toContain('margin-left: auto');
    expect(type).toContain('background: var(--primary-dim)');
    // 共享的定长标签材质里只剩语言角标
    const shared = css.slice(
      css.indexOf('.code-block-lang {') - 120,
      css.indexOf('.code-block-lang {')
    );
    expect(shared).not.toContain('.changelog-hash');
    expect(shared).not.toContain('.changelog-type');
  });

  it('窄屏把元数据与标题拆成两行，标题吃满整行', () => {
    const start = css.indexOf('/* 窄屏改成');
    expect(start).toBeGreaterThan(-1);
    // 取到媒体查询收尾的顶格 `}` 为止，只看这一段窄屏规则
    const narrow = css.slice(start, css.indexOf('\n}', start));
    expect(narrow).toContain('flex-wrap: wrap');
    expect(narrow).toContain('.changelog-subject');
    expect(narrow).toContain('flex: 1 1 100%');
    expect(narrow).toContain('order: 1');
    expect(narrow).toContain('order: 2');
    expect(narrow).toContain('order: 3');
  });
});
