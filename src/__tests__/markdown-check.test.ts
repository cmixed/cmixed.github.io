import { describe, expect, it } from 'vite-plus/test';
import type { LintError } from 'markdownlint';
import {
  countIssues,
  formatIssues,
  globToRegExp,
  lintStrings,
  loadConfig,
  parseJsonc,
  selectFiles,
} from '../../scripts/check-markdown';

const config = loadConfig();

async function rulesOf(markdown: string, file = 'blog/post/demo.md'): Promise<string[]> {
  const results = await lintStrings({ [file]: markdown }, config);
  return results[file].map((issue) => issue.ruleNames[0]);
}

function fakeIssue(lineNumber: number, ruleNames: string[], errorDetail?: string): LintError {
  return { lineNumber, ruleNames, errorDetail } as LintError;
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

  it('转义引号不会提前结束字符串', () => {
    expect(parseJsonc<{ text: string }>('{ "text": "say \\"hi\\" // 不是注释" }')).toEqual({
      text: 'say "hi" // 不是注释',
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

  it('单个 * 不跨目录，? 只匹配一个字符', () => {
    const re = globToRegExp('blog/*.md');
    expect(re.test('blog/a.md')).toBe(true);
    expect(re.test('blog/post/a.md')).toBe(false);
    expect(globToRegExp('nook/file/?.md').test('nook/file/a.md')).toBe(true);
    expect(globToRegExp('nook/file/?.md').test('nook/file/ab.md')).toBe(false);
  });

  it('正则元字符按字面量处理', () => {
    expect(globToRegExp('a+b(c).md').test('a+b(c).md')).toBe(true);
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

const passingCases = [
  {
    name: '紧凑风格的中文表格通过（CJK 宽度不影响紧凑判定）',
    markdown: ['# 标题', '', '| 名称 | 说明 |', '| --- | --- |', '| 甲 | 中文说明 |', ''].join(
      '\n'
    ),
  },
  {
    name: '围栏代码块里的假表格不参与检查',
    markdown: ['# 标题', '', '```text', '| a | b |', '|---|---|', '```', ''].join('\n'),
  },
  {
    name: '转义管道不会打乱列数',
    markdown: [
      '# 标题',
      '',
      '| 表达式 | 含义 |',
      '| --- | --- |',
      '| `a \\| b` | 按位或 |',
      '',
    ].join('\n'),
  },
  {
    name: 'H1 + 元信息块的旧式排版被当作 front matter，不触发标题规则',
    markdown: [
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
    ].join('\n'),
  },
  {
    name: '没有元信息的文章同样通过标题规则',
    markdown: ['# 标题', '', '## 小节', '', '正文。', ''].join('\n'),
  },
];

const violationCases = [
  {
    name: '同一张表混用紧凑与紧贴时报 MD060',
    markdown: ['# 标题', '', '| 名称 | 说明 |', '|---|---|', '| 甲 | 中文 |', ''].join('\n'),
    rule: 'MD060',
  },
  {
    name: '裸 URL 报 MD034',
    markdown: ['# 标题', '', '参见 https://example.com 。', ''].join('\n'),
    rule: 'MD034',
  },
  {
    name: '未标注语言的代码块报 MD040',
    markdown: ['# 标题', '', '```', 'code', '```', ''].join('\n'),
    rule: 'MD040',
  },
  {
    name: '标题末尾带标点报 MD026',
    markdown: ['# 标题。', '', '正文。', ''].join('\n'),
    rule: 'MD026',
  },
];

describe('lintStrings 使用仓库配置', () => {
  it.each(passingCases)('$name', async ({ markdown }) => {
    expect(await rulesOf(markdown)).toEqual([]);
  });

  it.each(violationCases)('$name', async ({ markdown, rule }) => {
    expect(await rulesOf(markdown)).toContain(rule);
  });
});

describe('formatIssues / countIssues', () => {
  it('按文件名排序，输出 行:列、规则名与说明', () => {
    const results = {
      'blog/post/b.md': [fakeIssue(3, ['MD022', 'blanks-around-headings'], '上方缺空行')],
      'blog/post/a.md': [],
      'blog/post/c.md': [fakeIssue(7, ['MD040'])],
    };
    expect(formatIssues(results)).toBe(
      [
        '',
        'blog/post/b.md',
        '  3:1  MD022/blanks-around-headings  上方缺空行',
        '',
        'blog/post/c.md',
        '  7:1  MD040',
      ].join('\n')
    );
    expect(countIssues(results)).toBe(2);
  });
});
