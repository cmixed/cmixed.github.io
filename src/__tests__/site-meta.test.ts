import { describe, expect, it } from 'vite-plus/test';
import {
  buildAbout,
  buildCommits,
  normalizeRepoUrl,
  parseCommitLine,
  parseCommits,
  renderAboutHtml,
  rewriteLinks,
} from '../../scripts/site-meta';

const SEP = '\x1f';

describe('parseCommitLine', () => {
  it('拆出约定式提交的 type / scope，并从标题里去掉前缀', () => {
    expect(parseCommitLine(`3c8eee6${SEP}2026-10-20${SEP}fix(ui): make pills readable`)).toEqual({
      hash: '3c8eee6',
      date: '2026-10-20',
      type: 'fix',
      scope: 'ui',
      subject: 'make pills readable',
    });
  });

  it('没有 scope 的约定式提交 scope 为 null', () => {
    const entry = parseCommitLine(`abc1234${SEP}2026-01-02${SEP}feat: add footer meta`);
    expect(entry).toMatchObject({ type: 'feat', scope: null, subject: 'add footer meta' });
  });

  it('非约定式提交保留原标题、type 为 null', () => {
    const entry = parseCommitLine(`abc1234${SEP}2026-01-02${SEP}Merge branch 'main'`);
    expect(entry).toMatchObject({ type: null, scope: null, subject: "Merge branch 'main'" });
  });

  it('标题里带冒号但不像约定式提交时，不改写正文', () => {
    const entry = parseCommitLine(`abc1234${SEP}2026-01-02${SEP}更新 README: 补充命令表`);
    expect(entry).toMatchObject({ type: null, subject: '更新 README: 补充命令表' });
  });

  it('格式不对（缺 hash / 日期 / 标题）返回 null', () => {
    expect(parseCommitLine('')).toBeNull();
    expect(parseCommitLine(`3c8eee6${SEP}not-a-date${SEP}fix: x`)).toBeNull();
    expect(parseCommitLine(`3c8eee6${SEP}2026-10-20${SEP}`)).toBeNull();
    expect(parseCommitLine(`zzz${SEP}2026-10-20${SEP}fix: x`)).toBeNull();
  });
});

describe('parseCommits', () => {
  it('跳过空行，保持 git 给的顺序', () => {
    const output = [
      `b2c3d4e${SEP}2026-10-21${SEP}feat: second`,
      '',
      `a1b2c3d${SEP}2026-10-20${SEP}fix: first`,
      '',
    ].join('\n');
    expect(parseCommits(output).map((entry) => entry.hash)).toEqual(['b2c3d4e', 'a1b2c3d']);
  });

  it('空输出得到空数组', () => {
    expect(parseCommits('')).toEqual([]);
  });
});

describe('normalizeRepoUrl', () => {
  it('ssh 与 https 两种 remote 都归一成仓库主页', () => {
    expect(normalizeRepoUrl('git@github.com:cmixed/cmixed.github.io.git')).toBe(
      'https://github.com/cmixed/cmixed.github.io'
    );
    expect(normalizeRepoUrl('https://github.com/cmixed/cmixed.github.io.git')).toBe(
      'https://github.com/cmixed/cmixed.github.io'
    );
    expect(normalizeRepoUrl('https://github.com/cmixed/cmixed.github.io')).toBe(
      'https://github.com/cmixed/cmixed.github.io'
    );
  });

  it('非 GitHub remote 返回 null', () => {
    expect(normalizeRepoUrl('https://gitlab.com/a/b.git')).toBeNull();
  });
});

describe('rewriteLinks', () => {
  const repo = 'https://github.com/cmixed/cmixed.github.io';

  it('站外链接加 target / rel', () => {
    expect(rewriteLinks('<a href="https://example.com/x">x</a>', repo)).toBe(
      '<a href="https://example.com/x" target="_blank" rel="noopener noreferrer">x</a>'
    );
  });

  it('仓库内相对路径改指 GitHub（站点上没有这些文件）', () => {
    expect(rewriteLinks('<a href="LICENSE">MIT</a>', repo)).toBe(
      `<a href="${repo}/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT</a>`
    );
    expect(rewriteLinks('<a href="./docs/a.md">docs</a>', repo)).toContain(
      `${repo}/blob/main/docs/a.md`
    );
  });

  it('锚点原样保留', () => {
    expect(rewriteLinks('<a href="#usage">usage</a>', repo)).toBe('<a href="#usage">usage</a>');
  });

  it('拿不到仓库地址时相对链接不动', () => {
    expect(rewriteLinks('<a href="LICENSE">MIT</a>', null)).toBe('<a href="LICENSE">MIT</a>');
  });
});

describe('renderAboutHtml', () => {
  it('渲染标题与表格，并给表格套横向滚动容器', () => {
    const html = renderAboutHtml('# 标题\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n', null);
    expect(html).toContain('<h1>标题</h1>');
    expect(html).toContain('<div class="table-wrapper"><table>');
    expect(html).toContain('</table></div>');
  });

  it('代码块保留语言类名（供等宽样式命中）', () => {
    const html = renderAboutHtml('```bash\nvp build\n```\n', null);
    expect(html).toContain('<pre><code class="language-bash">');
  });

  it('按 h1/h2 分节，供弹窗按节虚拟化', () => {
    const html = renderAboutHtml('# 一\n\n开头\n\n## 二\n\n正文\n\n### 2.1\n\n细节\n', null);
    const sections = html.match(/class="readme-sec"/g) ?? [];
    expect(sections).toHaveLength(2);
    expect(html).toContain('<div class="readme-sec"><h1>一</h1>');
    expect(html).toContain('<div class="readme-sec"><h2>二</h2>');
    // 分节不能吃掉标题和正文
    expect(html).toContain('<h3>2.1</h3>');
    expect(html).toContain('<p>细节</p>');
  });
});

describe('buildAbout / buildCommits', () => {
  it('两份载荷各自独立，不再互相夹带', async () => {
    const about = await buildAbout();
    expect(Object.keys(about).sort()).toEqual(['html', 'updated']);

    const commits = buildCommits();
    expect(Object.keys(commits).sort()).toEqual(['changelog', 'repo', 'total']);
  });
});
