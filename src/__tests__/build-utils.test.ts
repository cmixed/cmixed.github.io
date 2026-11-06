import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import {
  countAndSortNames,
  countImages,
  countWords,
  escapeXml,
  estimateReadTime,
  getGitLastModified,
  parseFrontmatter,
  renderTemplate,
  toYmd,
} from '../lib/build-utils';

describe('parseFrontmatter', () => {
  it('解析标量、布尔与行内数组，正文原样返回', () => {
    const content = `---
title: Test Post
date: 2024-01-15
tags: [TypeScript, Testing]
pinned: true
draft: false
description: A test post
---
Body content here`;
    expect(parseFrontmatter(content)).toEqual({
      meta: {
        title: 'Test Post',
        date: '2024-01-15',
        tags: ['TypeScript', 'Testing'],
        pinned: true,
        draft: false,
        description: 'A test post',
      },
      body: 'Body content here',
    });
  });

  it('没有 frontmatter 时 meta 为空、正文原样返回', () => {
    expect(parseFrontmatter('Just plain content')).toEqual({
      meta: {},
      body: 'Just plain content',
    });
  });

  it('缺闭合分隔符时不把正文误当成 frontmatter', () => {
    const content = '---\ntitle: x\nBody without a closing fence';
    expect(parseFrontmatter(content)).toEqual({ meta: {}, body: content });
  });

  it('CRLF 行尾也能解析，正文统一成 LF', () => {
    const content = '---\r\ntitle: Windows\r\n---\r\nBody\r\ncontent';
    expect(parseFrontmatter(content)).toEqual({
      meta: { title: 'Windows' },
      body: 'Body\ncontent',
    });
  });

  it('兼容 frontmatter 前的标题行（旧文章格式）', () => {
    const content = '# 标题\n\n---\ntitle: x\n---\nBody';
    expect(parseFrontmatter(content)).toEqual({ meta: { title: 'x' }, body: 'Body' });
  });

  it('按第一个冒号分键，值里的冒号保留', () => {
    expect(parseFrontmatter('---\nurl: https://example.com/a:b\n---\n').meta).toEqual({
      url: 'https://example.com/a:b',
    });
  });

  it('空值解析为空字符串，没有冒号的行忽略', () => {
    expect(parseFrontmatter('---\ntitle: x\ndescription:\nnot yaml\n---\n').meta).toEqual({
      title: 'x',
      description: '',
    });
  });

  it('允许 frontmatter 结束于文件末尾（正文为空）', () => {
    expect(parseFrontmatter('---\ntitle: x\n---\n')).toEqual({
      meta: { title: 'x' },
      body: '',
    });
  });
});

describe('escapeXml', () => {
  it('一次转义五种特殊字符', () => {
    expect(escapeXml('<a href="x">\'&\'</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;'
    );
  });

  it('普通文本原样返回', () => {
    expect(escapeXml('纯文本 plain text')).toBe('纯文本 plain text');
  });
});

describe('toYmd', () => {
  it('补零成 YYYY-MM-DD（本地时区）', () => {
    expect(toYmd(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(toYmd(new Date(2024, 10, 23))).toBe('2024-11-23');
  });
});

describe('getGitLastModified', () => {
  it('未跟踪的路径返回 null，由调用方回退到 mtime', () => {
    expect(getGitLastModified(join(import.meta.dirname, 'not-a-real-file.md'))).toBeNull();
  });
});

describe('estimateReadTime', () => {
  it('按 400 字符向上取整，最少 1 分钟', () => {
    expect(estimateReadTime('a'.repeat(100))).toBe(1);
    expect(estimateReadTime('a'.repeat(400))).toBe(1);
    expect(estimateReadTime('a'.repeat(401))).toBe(2);
    expect(estimateReadTime('a'.repeat(800))).toBe(2);
  });

  it('中文按字计数', () => {
    expect(estimateReadTime('中'.repeat(400))).toBe(1);
    expect(estimateReadTime('中'.repeat(401))).toBe(2);
  });

  it('忽略 Markdown 符号与多余空白', () => {
    expect(estimateReadTime('#'.repeat(400))).toBe(1);
    expect(estimateReadTime('  \n\t ')).toBe(1);
  });
});

describe('countWords', () => {
  it('去掉 Markdown 符号与首尾空白后按字符计数', () => {
    expect(countWords('## 标题\n\n正文')).toBe(5);
  });

  it('空内容为 0', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('#'.repeat(10))).toBe(0);
  });
});

describe('countImages', () => {
  it('只数 <img>，不把 <image> 算进去', () => {
    expect(countImages('<img src="a"><img\nsrc="b"><image>')).toBe(2);
  });

  it('没有图片为 0', () => {
    expect(countImages('<p>no images</p>')).toBe(0);
  });
});

describe('countAndSortNames', () => {
  it('按出现次数降序，同次数按名称排序', () => {
    expect(countAndSortNames(['C++', '工程化', 'C++', 'Git', 'Git', 'Git'])).toEqual([
      { name: 'Git', count: 3 },
      { name: 'C++', count: 2 },
      { name: '工程化', count: 1 },
    ]);
  });

  it('同次数按名称排序，不依赖输入顺序', () => {
    expect(countAndSortNames(['b', 'a', 'b', 'a'])).toEqual([
      { name: 'a', count: 2 },
      { name: 'b', count: 2 },
    ]);
  });

  it('空输入返回空数组', () => {
    expect(countAndSortNames([])).toEqual([]);
  });
});

describe('renderTemplate', () => {
  it('替换全部占位符，同一个键出现多次也全换', () => {
    expect(
      renderTemplate('Hello {{name}}, {{name}} in {{place}}!', { name: 'World', place: 'TS' })
    ).toBe('Hello World, World in TS!');
  });

  it('未知占位符保持原样，空数据不改模板', () => {
    expect(renderTemplate('{{known}} {{unknown}}', { known: 'x' })).toBe('x {{unknown}}');
    expect(renderTemplate('{{x}}', {})).toBe('{{x}}');
  });

  it('替换值里的 $& / $1 / $$ 按字面量处理', () => {
    expect(renderTemplate('{{v}}', { v: '$& $1 $$' })).toBe('$& $1 $$');
  });

  it('键里的正则元字符按字面量匹配', () => {
    expect(renderTemplate('{{a.b}} {{axb}}', { 'a.b': 'hit' })).toBe('hit {{axb}}');
  });
});
