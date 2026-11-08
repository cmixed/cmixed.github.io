import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import {
  globToRegExp,
  lintStrings,
  parseJsonc,
  selectFiles,
  type MarkdownlintCli2Config,
} from '../../scripts/check-markdown';

const root = process.cwd();
const config = parseJsonc<MarkdownlintCli2Config>(
  readFileSync(join(root, '.markdownlint-cli2.jsonc'), 'utf8')
);

async function rulesOf(markdown: string, file = 'blog/post/demo.md'): Promise<string[]> {
  const results = await lintStrings({ [file]: markdown }, config);
  return results[file].map((issue) => issue.ruleNames[0]);
}

describe('parseJsonc', () => {
  it('去掉行注释、块注释与尾随逗号', () => {
    const parsed = parseJsonc<{ a: number; b: string[] }>(`{
      // 行注释
      "a": 1, /* 块注释 */
      "b": ["x", "y"],
    }`);
    expect(parsed).toEqual({ a: 1, b: ['x', 'y'] });
  });

  it('保留字符串里的 // 与 /*', () => {
    expect(parseJsonc<{ url: string }>('{ "url": "https://example.com/*.md" }')).toEqual({
      url: 'https://example.com/*.md',
    });
  });
});

describe('globToRegExp / selectFiles', () => {
  it('blog/post/**/*.md 同时匹配顶层与子目录', () => {
    const re = globToRegExp('blog/post/**/*.md');
    expect(re.test('blog/post/a.md')).toBe(true);
    expect(re.test('blog/post/sub/a.md')).toBe(true);
    expect(re.test('blog/post/a.png')).toBe(false);
  });

  it('nook 只收 index.md，并排除 _template', () => {
    const files = selectFiles(
      [
        'README.md',
        'blog/post/a.md',
        'docs/plan.md',
        'nook/file/tool/x/index.md',
        'nook/file/_template/index.md',
      ],
      config
    );
    expect(files).toEqual(['README.md', 'blog/post/a.md', 'nook/file/tool/x/index.md']);
  });
});

describe('lintStrings', () => {
  it('紧凑风格的中文表格通过（CJK 宽度不影响紧凑判定）', async () => {
    const markdown = [
      '# 标题',
      '',
      '| 名称 | 说明 |',
      '| --- | --- |',
      '| 甲 | 中文说明 |',
      '',
    ].join('\n');
    expect(await rulesOf(markdown)).toEqual([]);
  });

  it('同一张表混用紧凑与紧贴时报 MD060', async () => {
    const markdown = ['# 标题', '', '| 名称 | 说明 |', '|---|---|', '| 甲 | 中文 |', ''].join('\n');
    expect(await rulesOf(markdown)).toContain('MD060');
  });

  it('围栏代码块里的假表格不参与检查', async () => {
    const markdown = ['# 标题', '', '```text', '| a | b |', '|---|---|', '```', ''].join('\n');
    expect(await rulesOf(markdown)).toEqual([]);
  });

  it('转义管道不会打乱列数', async () => {
    const markdown = [
      '# 标题',
      '',
      '| 表达式 | 含义 |',
      '| --- | --- |',
      '| `a \\| b` | 按位或 |',
      '',
    ].join('\n');
    expect(await rulesOf(markdown)).toEqual([]);
  });

  it('H1 + 元信息块的旧式排版被当作 front matter，不触发标题规则', async () => {
    const markdown = [
      '# 现代 C++ 代码风格',
      '',
      '---',
      'title: 现代 C++ 代码风格',
      'description: 一套规范。',
      '---',
      '',
      '## 第一节',
      '',
      '正文。',
      '',
    ].join('\n');
    expect(await rulesOf(markdown)).toEqual([]);
  });

  it('没有元信息的文章同样通过标题规则', async () => {
    const markdown = ['# 标题', '', '## 小节', '', '正文。', ''].join('\n');
    expect(await rulesOf(markdown)).toEqual([]);
  });
});
