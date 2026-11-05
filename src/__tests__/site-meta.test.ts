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
const HASH = 'abc1234';
const DATE = '2026-01-02';

function commit(subject: string): string {
  return `${HASH}${SEP}${DATE}${SEP}${subject}`;
}

describe('parseCommitLine', () => {
  it('拆出约定式提交的 type / scope，并从标题里去掉前缀', () => {
    expect(parseCommitLine(commit('fix(ui): make pills readable'))).toEqual({
      hash: HASH,
      date: DATE,
      type: 'fix',
      scope: 'ui',
      subject: 'make pills readable',
    });
  });

  it('没有 scope 的约定式提交 scope 为 null', () => {
    expect(parseCommitLine(commit('feat: add footer meta'))).toMatchObject({
      type: 'feat',
      scope: null,
      subject: 'add footer meta',
    });
  });

  it('破坏性标记 ! 不影响 type / scope 的拆分', () => {
    expect(parseCommitLine(commit('feat(api)!: drop old endpoint'))).toMatchObject({
      type: 'feat',
      scope: 'api',
      subject: 'drop old endpoint',
    });
    expect(parseCommitLine(commit('feat!: drop old endpoint'))).toMatchObject({
      type: 'feat',
      scope: null,
      subject: 'drop old endpoint',
    });
  });

  it('非约定式提交保留原标题、type 为 null', () => {
    expect(parseCommitLine(commit("Merge branch 'main'"))).toMatchObject({
      type: null,
      scope: null,
      subject: "Merge branch 'main'",
    });
  });

  it('标题里带冒号但不像约定式提交时，不改写正文', () => {
    expect(parseCommitLine(commit('更新 README: 补充命令表'))).toMatchObject({
      type: null,
      subject: '更新 README: 补充命令表',
    });
  });

  it('标题里出现分隔符时保留后续内容，不会被截断', () => {
    expect(parseCommitLine(`${HASH}${SEP}${DATE}${SEP}fix: a${SEP}b`)).toMatchObject({
      type: 'fix',
      subject: `a${SEP}b`,
    });
  });

  it('去掉标题两侧空白', () => {
    expect(parseCommitLine(`${HASH}${SEP}${DATE}${SEP}  fix: x  `)).toMatchObject({
      type: 'fix',
      subject: 'x',
    });
  });

  it('格式不对（缺 hash / 日期 / 标题）返回 null', () => {
    expect(parseCommitLine('')).toBeNull();
    expect(parseCommitLine(`${HASH}${SEP}not-a-date${SEP}fix: x`)).toBeNull();
    expect(parseCommitLine(`${HASH}${SEP}2026-1-2${SEP}fix: x`)).toBeNull();
    expect(parseCommitLine(`abc${SEP}${DATE}${SEP}fix: x`)).toBeNull();
    expect(parseCommitLine(`${HASH}${SEP}${DATE}${SEP}   `)).toBeNull();
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

  it('跳过格式不对的行，只保留合法条目', () => {
    const output = [
      `b2c3d4e${SEP}2026-10-21${SEP}feat: second`,
      'not a commit line',
      `bad${SEP}2026-10-20${SEP}fix: short hash`,
      `a1b2c3d${SEP}2026-10-20${SEP}fix: first`,
    ].join('\r\n');
    expect(parseCommits(output).map((entry) => entry.subject)).toEqual(['second', 'first']);
  });

  it('空输出得到空数组', () => {
    expect(parseCommits('')).toEqual([]);
  });
});

describe('normalizeRepoUrl', () => {
  it('常见 remote 写法都归一成仓库主页', () => {
    for (const remote of [
      'git@github.com:cmixed/cmixed.github.io.git',
      'ssh://git@github.com/cmixed/cmixed.github.io.git',
      'git://github.com/cmixed/cmixed.github.io',
      'https://github.com/cmixed/cmixed.github.io.git',
      'https://github.com/cmixed/cmixed.github.io.git/',
      'https://github.com/cmixed/cmixed.github.io',
    ]) {
      expect(normalizeRepoUrl(remote)).toBe('https://github.com/cmixed/cmixed.github.io');
    }
  });

  it('非 GitHub remote 或带子路径的 URL 返回 null', () => {
    expect(normalizeRepoUrl('https://gitlab.com/a/b.git')).toBeNull();
    expect(normalizeRepoUrl('https://github.com/cmixed/cmixed.github.io/tree/main')).toBeNull();
  });
});

describe('rewriteLinks', () => {
  const repo = 'https://github.com/cmixed/cmixed.github.io';

  it('站外链接（含 mailto）加 target / rel', () => {
    expect(rewriteLinks('<a href="https://example.com/x">x</a>', repo)).toBe(
      '<a href="https://example.com/x" target="_blank" rel="noopener noreferrer">x</a>'
    );
    expect(rewriteLinks('<a href="mailto:a@b.c">mail</a>', repo)).toContain(
      'href="mailto:a@b.c" target="_blank" rel="noopener noreferrer"'
    );
  });

  it('仓库内相对路径改指 GitHub（站点上没有这些文件）', () => {
    expect(rewriteLinks('<a href="LICENSE">MIT</a>', repo)).toBe(
      `<a href="${repo}/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT</a>`
    );
    expect(rewriteLinks('<a href="./docs/a.md">docs</a>', repo)).toContain(
      `${repo}/blob/main/docs/a.md`
    );
    expect(rewriteLinks('<a href="/docs/a.md">docs</a>', repo)).toContain(
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

  it('没有标题的内容也会包成一节，空输入得到空字符串', () => {
    expect(renderAboutHtml('just text', null)).toContain(
      '<div class="readme-sec"><p>just text</p>'
    );
    expect(renderAboutHtml('', null)).toBe('');
  });
});

describe('buildAbout / buildCommits', () => {
  it('关于本站是分好节的 README，更新时间为空或 YYYY-MM-DD', async () => {
    const about = await buildAbout();
    expect(Object.keys(about).sort()).toEqual(['html', 'updated']);
    expect(about.html.length).toBeGreaterThan(0);
    expect(about.html).toContain('class="readme-sec"');
    if (about.updated !== null) expect(about.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('更新日志的条数与字段自洽', () => {
    const commits = buildCommits();
    expect(Object.keys(commits).sort()).toEqual(['changelog', 'repo', 'total']);

    expect(commits.changelog.length).toBeLessThanOrEqual(400);
    expect(commits.total).toBeGreaterThanOrEqual(commits.changelog.length);
    if (commits.total > 0) expect(commits.changelog.length).toBeGreaterThan(0);

    for (const entry of commits.changelog) {
      expect(entry.hash).toMatch(/^[0-9a-f]{4,40}$/);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.subject.length).toBeGreaterThan(0);
      if (entry.type !== null) expect(entry.type).toMatch(/^\w+$/);
      if (entry.scope !== null) expect(entry.scope.length).toBeGreaterThan(0);
    }

    if (commits.repo !== null) expect(commits.repo).toMatch(/^https:\/\/github\.com\//);
  });
});
