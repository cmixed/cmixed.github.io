import { describe, expect, it, vi } from 'vite-plus/test';
import {
  buildAbout,
  buildCommits,
  inProgressQuarters,
  isQuarterComplete,
  normalizeRepoUrl,
  parseCommitLine,
  parseCommits,
  quarterFingerprint,
  quarterOf,
  quarterStats,
  quarterSummaryGaps,
  readSummaryArchive,
  renderAboutHtml,
  rewriteLinks,
  selectQuarterSummaries,
  type ChangelogEntry,
  type QuarterSummaryStored,
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
    expect(Object.keys(commits).sort()).toEqual([
      'changelog',
      'inProgress',
      'inProgressNotice',
      'repo',
      'summaries',
      'total',
    ]);

    // 进行中的季度只出现在 inProgress，绝不能混进 summaries / 缺口清单
    for (const quarter of commits.inProgress) {
      expect(isQuarterComplete(quarter)).toBe(false);
      expect(commits.summaries[quarter]).toBeUndefined();
    }

    // 公告文案透传自 defaults.inProgress，构建期不生成内容
    const archive = readSummaryArchive();
    expect(commits.inProgressNotice).toEqual(archive.inProgressNotice);
    if (commits.inProgressNotice) {
      expect(commits.inProgressNotice.headline.length).toBeGreaterThan(0);
      expect(commits.inProgressNotice.body.length).toBeGreaterThan(0);
    }

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

    // 总结只给已过完的季度；stats 必须和该季度的提交对得上
    for (const [quarter, summary] of Object.entries(commits.summaries)) {
      expect(isQuarterComplete(quarter)).toBe(true);
      expect(summary.stats.commits).toBeGreaterThan(0);
      expect(summary.stats.days).toBeGreaterThan(0);
      expect(summary.highlights.length).toBeGreaterThan(0);
    }
  });
});

describe('季度判定、指纹与统计', () => {
  it('quarterOf 把日期映射到两位年份 + 季度', () => {
    expect(quarterOf('2026-01-01')).toBe('26Q1');
    expect(quarterOf('2026-09-30')).toBe('26Q3');
    expect(quarterOf('2026-12-31')).toBe('26Q4');
  });

  it('只有结束月走完的季度才算过完，进行中的一律不总结', () => {
    const nov = new Date('2026-11-07T00:00:00Z');
    expect(isQuarterComplete('26Q4', nov)).toBe(false); // 12 月还没到
    expect(isQuarterComplete('26Q3', nov)).toBe(true);
    expect(isQuarterComplete('26Q2', nov)).toBe(true);
    expect(isQuarterComplete('25Q4', nov)).toBe(true); // 跨年
    expect(isQuarterComplete('26Q3', new Date('2026-09-30T00:00:00Z'))).toBe(false);
    expect(isQuarterComplete('26Q3', new Date('2026-10-01T00:00:00Z'))).toBe(true);
    expect(isQuarterComplete('nonsense', nov)).toBe(false);
  });

  it('同样的提交得到同样的指纹；内容变了指纹就变', () => {
    const entries: ChangelogEntry[] = [
      { hash: 'aaa1111', date: '2026-08-14', type: 'fix', scope: null, subject: 'a' },
      { hash: 'bbb2222', date: '2026-08-13', type: 'feat', scope: null, subject: 'b' },
    ];
    expect(quarterFingerprint(entries)).toBe(quarterFingerprint(entries.slice()));
    expect(quarterFingerprint(entries)).not.toBe(
      quarterFingerprint([{ ...entries[0], subject: 'changed' }, entries[1]])
    );
  });

  it('统计按完整季度算，不随前端渲染了多少条变化', () => {
    const entries: ChangelogEntry[] = [
      { hash: 'aaa1111', date: '2026-08-14', type: 'fix', scope: null, subject: 'a' },
      { hash: 'bbb2222', date: '2026-08-14', type: 'fix', scope: null, subject: 'b' },
      { hash: 'ccc3333', date: '2026-07-01', type: 'feat', scope: null, subject: 'c' },
    ];
    expect(quarterStats(entries)).toEqual({
      commits: 3,
      days: 2,
      from: '2026-07-01',
      to: '2026-08-14',
      topTypes: [
        { type: 'fix', count: 2 },
        { type: 'feat', count: 1 },
      ],
    });
  });
});

describe('季度总结：只复用，不重复生成', () => {
  const NOV = new Date('2026-11-07T00:00:00Z');
  const changelog: ChangelogEntry[] = [
    { hash: 'aaa1111', date: '2026-11-07', type: 'feat', scope: null, subject: 'q4 work' },
    { hash: 'bbb2222', date: '2026-08-14', type: 'fix', scope: null, subject: 'q3 work' },
    { hash: 'ccc3333', date: '2026-05-01', type: 'feat', scope: null, subject: 'q2 work' },
  ];

  function saved(quarter: string): QuarterSummaryStored {
    return {
      fingerprint: quarterFingerprint(
        changelog.filter((entry) => quarterOf(entry.date) === quarter)
      ),
      headline: `${quarter} 的一句话`,
      body: '正文',
      highlights: ['要点'],
    };
  }

  const ALL = { '26Q4': saved('26Q4'), '26Q3': saved('26Q3'), '26Q2': saved('26Q2') };
  const noWarn = () => {};

  it('进行中的季度即使存了总结也不输出', () => {
    expect(Object.keys(selectQuarterSummaries(changelog, ALL, NOV, noWarn)).sort()).toEqual([
      '26Q2',
      '26Q3',
    ]);
  });

  it('已完结但没总结的季度只提醒补写，绝不自动生成', () => {
    const warn = vi.fn();
    expect(selectQuarterSummaries(changelog, {}, NOV, warn)).toEqual({});
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain('请补写');
  });

  it('已有总结原样复用，且重复调用结果完全一致', () => {
    const first = selectQuarterSummaries(changelog, ALL, NOV, noWarn);
    const second = selectQuarterSummaries(changelog, ALL, NOV, noWarn);
    expect(second).toEqual(first);
    expect(first['26Q3'].headline).toBe('26Q3 的一句话');
    expect(first['26Q3'].stats.commits).toBe(1);
    expect(first['26Q3'].stats.from).toBe('2026-08-14');
  });

  it('指纹变了仍复用已写好的总结，只提醒人工复核，不覆盖重写', () => {
    const warn = vi.fn();
    const out = selectQuarterSummaries(
      changelog,
      { ...ALL, '26Q3': { ...saved('26Q3'), fingerprint: 'deadbeef' } },
      NOV,
      warn
    );
    expect(out['26Q3'].headline).toBe('26Q3 的一句话');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('人工复核');
  });

  it('缺口清单：进行中不算，缺总结与指纹变化分开标', () => {
    // 三种存档状态：都写好了 / 一条都没有 / 只有 26Q3 的指纹过期
    expect(quarterSummaryGaps(changelog, ALL, NOV)).toEqual([]);
    expect(quarterSummaryGaps(changelog, {}, NOV).map((gap) => gap.quarter)).toEqual([
      '26Q3',
      '26Q2',
    ]);
    expect(quarterSummaryGaps(changelog, {}, NOV).every((gap) => gap.kind === 'missing')).toBe(
      true
    );

    const changed = quarterSummaryGaps(
      changelog,
      { ...ALL, '26Q3': { ...saved('26Q3'), fingerprint: 'deadbeef' } },
      NOV
    );
    expect(changed.map((gap) => gap.quarter)).toEqual(['26Q3']);
    expect(changed[0]).toMatchObject({
      kind: 'changed',
      commits: 1,
      storedFingerprint: 'deadbeef',
      from: '2026-08-14',
      to: '2026-08-14',
    });

    // 进行中的季度永远不进缺口清单，CI 不会为它提醒
    expect(quarterSummaryGaps(changelog, {}, NOV).some((gap) => gap.quarter === '26Q4')).toBe(
      false
    );
  });

  it('inProgress 只列还没过完的季度，补写提醒的判定完全不受它影响', () => {
    expect(inProgressQuarters(changelog, NOV)).toEqual(['26Q4']);
    // 季度过完后自动从 inProgress 消失，改由缺口清单接手
    expect(inProgressQuarters(changelog, new Date('2027-01-15T00:00:00Z'))).toEqual([]);

    // 即使一条总结都没写，缺口也只有已完结的 Q3 / Q2：
    // Q4 页面上是「进行中」模板公告，不算缺口，不会被提醒补写
    expect(quarterSummaryGaps(changelog, {}, NOV).map((gap) => gap.quarter)).toEqual([
      '26Q3',
      '26Q2',
    ]);
    // 存档里也不该有进行中季度的总结，否则会被误当成已总结
    expect(selectQuarterSummaries(changelog, {}, NOV, () => {})['26Q4']).toBeUndefined();
  });

  it('readSummaryArchive 把 defaults 与季度条目分开，公告文案走数据层', () => {
    const archive = readSummaryArchive();

    // 季度条目只认 26Q3 这类键，defaults 之类的配置绝不混进来
    for (const key of Object.keys(archive.entries)) {
      expect(key).toMatch(/^\d{2}Q[1-4]$/);
    }
    expect(archive.entries['defaults']).toBeUndefined();

    // defaults.inProgress 是「进行中」公告的文案，原样透传
    expect(archive.inProgressNotice).not.toBeNull();
    expect(archive.inProgressNotice?.headline.length).toBeGreaterThan(0);
    expect(archive.inProgressNotice?.body.length).toBeGreaterThan(0);

    // 文案存在与否完全不影响补写判定：缺口只看季度条目
    const gaps = quarterSummaryGaps(changelog, archive.entries, NOV);
    expect(gaps.some((gap) => gap.quarter === '26Q4')).toBe(false);
    expect(gaps.every((gap) => gap.quarter !== 'defaults')).toBe(true);
  });
});
