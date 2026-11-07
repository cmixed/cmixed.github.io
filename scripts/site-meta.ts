/* 页脚两个悬浮框（关于本站 / 更新日志）的内容来源。
 *
 * 两份内容都只在「构建时」存在：
 *   - 关于本站 = README.md 渲染成 HTML（marked，和博客同一套解析器，但用默认配置：
 *     不要博客那套 mermaid / 代码块角标的自定义 renderer）
 *   - 更新日志 = git 提交记录（约定式提交拆出 type / scope）
 *
 * 拆成两个文件（和 scripts/client-scripts.ts 一样用 Vite 插件发）：
 *   - site-about.json   README 渲染结果（gzip 约 14KB）
 *   - site-commits.json 提交记录（gzip 约 8.5KB）
 *   - vp build：generateBundle 里分别 emit 到 dist/
 *   - vp dev：中间件现读现算（改了 README 刷新就有，不用重启）
 * 拆开的理由：两份内容差一倍多，而两个入口互不相干 —— 点「关于本站」不该顺带
 * 下载 278 条提交。合成一份时首次打开要等 68.8KB（gzip 22.7KB）走完才渲染。
 * 这样 package.json 里不用多一步构建，主站也不为这两块内容背运行时依赖
 * （首页模块一执行就并行预取两份，见 src/main.ts）。
 *
 * CI 注意：git 历史要完整（部署 workflow 的 checkout 已经是 fetch-depth: 0）；
 * 拿不到 git（比如源码压缩包）时降级成「暂无记录」，不影响页面。 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { marked } from 'marked';
import type { Plugin } from 'vite-plus';
import { getGitLastModified } from '../src/lib/build-utils';

const ROOT = join(import.meta.dirname, '..');
const README_PATH = join(ROOT, 'README.md');
/** 季度总结是人工写好、提交进仓库的静态数据；构建期只读，绝不在这里生成。 */
const SUMMARIES_PATH = join(ROOT, 'src', 'data', 'quarter-summaries.json');

/** 产物文件名。首页按相对路径 fetch（生产 `./xxx.json`、开发 `/xxx.json`）。 */
export const ABOUT_FILE = 'site-about.json';
export const COMMITS_FILE = 'site-commits.json';

/** 最多带多少条提交。一次带全，前端「展开更多」只是在本地多渲染一段，不用再请求。 */
const MAX_COMMITS = 400;

export interface ChangelogEntry {
  hash: string;
  date: string;
  /** 约定式提交的类型（feat / fix / …），非约定式提交为 null */
  type: string | null;
  /** 括号里的范围（如 fix(ui) 的 ui），没有为 null */
  scope: string | null;
  /** 去掉 `type(scope): ` 前缀后的正文 */
  subject: string;
}

/** 关于本站里的一条目录跳转：id 指向对应 `readme-sec`，label 是节标题。 */
export interface AboutNav {
  id: string;
  label: string;
}

export interface AboutMeta {
  /** README 渲染后的 HTML（相对链接已改写成 GitHub 上的地址） */
  html: string;
  /** README 最后一次提交的日期（YYYY-MM-DD），非 git 环境为 null */
  updated: string | null;
  /** 标题栏右侧的目录跳转（只挑重要的节，见 ABOUT_NAV） */
  nav: AboutNav[];
}

/** 仓库里存着的总结：一个季度一条，写完就不再重写。 */
export interface QuarterSummaryStored {
  /** 写总结时该季度提交内容的指纹，用来判断要不要人工复核 */
  fingerprint: string;
  headline: string;
  body: string;
  highlights: string[];
}

/**
 * 「进行中」占位公告的文案（`defaults.inProgress`）。
 * 内容住在 quarter-summaries.json，构建期只透传，**不生成、不兜底**。
 */
export interface QuarterNotice {
  headline: string;
  body: string;
}

/** quarter-summaries.json 解析结果：季度条目与默认文案分开，互不混淆。 */
export interface SummaryArchive {
  /** 只有 `26Q3` 这样的季度键；`defaults` 之类绝不混进来 */
  entries: Record<string, QuarterSummaryStored>;
  /** 进行中占位公告文案；文件里没写 defaults.inProgress 时为 null */
  inProgressNotice: QuarterNotice | null;
}

/** 构建期从提交记录现算的统计，不写进存档文件，避免和 git 历史对不上。 */
export interface QuarterStats {
  commits: number;
  days: number;
  from: string;
  to: string;
  topTypes: Array<{ type: string; count: number }>;
}

export interface QuarterSummary extends QuarterSummaryStored {
  stats: QuarterStats;
}

/** 待补写 / 待复核的季度：CI 用它决定要不要提醒，人用它决定要不要动笔。 */
export interface QuarterGap {
  quarter: string;
  /** missing = 还没写过总结；changed = 写过但提交指纹变了 */
  kind: 'missing' | 'changed';
  commits: number;
  fingerprint: string;
  /** kind 为 changed 时的存档指纹，便于对照是哪一段提交变了 */
  storedFingerprint?: string;
  from: string;
  to: string;
}

export interface CommitsMeta {
  changelog: ChangelogEntry[];
  /** 仓库里的提交总数（可能大于 changelog.length） */
  total: number;
  /** 仓库主页地址，用于把提交 hash 指回 GitHub；拿不到为 null */
  repo: string | null;
  /** 只包含「已过完且有总结」的季度；进行中的季度一定不在里面 */
  summaries: Record<string, QuarterSummary>;
  /**
   * 还没过完、因此不总结的季度。前端据此显示一块「进行中」的占位公告，
   * 但它**不进** quarterSummaryGaps 的缺口清单，不会触发补写提醒。
   */
  inProgress: string[];
  /**
   * 「进行中」公告的文案（透传自 quarter-summaries.json 的 defaults.inProgress）。
   * 文案归数据、状态归构建，前端只渲染；为 null 时前端不出公告卡。
   */
  inProgressNotice: QuarterNotice | null;
}

const CONVENTIONAL = /^(\w+)(?:\(([^)]+)\))?!?:\s+([\s\S]+)$/;

/** 解析 `git log --pretty=%h\x1f%cs\x1f%s` 的一行；格式不对返回 null。 */
export function parseCommitLine(raw: string): ChangelogEntry | null {
  const [hash, date, ...rest] = raw.split('\x1f');
  const subject = rest.join('\x1f').trim();
  if (!/^[0-9a-f]{4,40}$/.test(hash || '') || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  if (!subject) return null;
  const match = CONVENTIONAL.exec(subject);
  return {
    hash,
    date,
    type: match ? match[1] : null,
    scope: match ? (match[2] ?? null) : null,
    subject: match ? match[3] : subject,
  };
}

/** 把 `git log` 的整段输出拆成条目（保持 git 给的顺序，即新 → 旧）。 */
export function parseCommits(output: string): ChangelogEntry[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCommitLine)
    .filter((entry): entry is ChangelogEntry => entry !== null);
}

/** `2026-08-14` → `26Q3`：两位年份 + 季度。 */
export function quarterOf(date: string): string {
  const [year = '', month = '1'] = date.split('-');
  return `${year.slice(2)}Q${Math.floor((Number(month) - 1) / 3) + 1}`;
}

/**
 * 季度是否**过完**：结束月所在的那个月走完才算。
 * 2026-11 时 26Q4（结束于 12 月）仍是进行中，26Q3 及之前都已完结。
 * 用 UTC 月份，避免构建机时区把季度边界前后挪一天。
 */
export function isQuarterComplete(quarter: string, now: Date = new Date()): boolean {
  const match = /^(\d{2})Q([1-4])$/.exec(quarter);
  if (!match) return false;
  const year = 2000 + Number(match[1]);
  const endMonth = Number(match[2]) * 3;
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  return currentYear > year || (currentYear === year && currentMonth > endMonth);
}

/** 该季度提交内容的指纹。提交没变 → 指纹不变 → 已写好的总结不必重写。 */
export function quarterFingerprint(entries: ChangelogEntry[]): string {
  return createHash('sha256')
    .update(entries.map((entry) => `${entry.hash}\t${entry.subject}`).join('\n'))
    .digest('hex')
    .slice(0, 12);
}

/** 统计从完整提交记录现算（条目是 git 给的新 → 旧顺序）。 */
export function quarterStats(entries: ChangelogEntry[]): QuarterStats {
  const types = new Map<string, number>();
  for (const entry of entries) {
    const type = entry.type || 'other';
    types.set(type, (types.get(type) || 0) + 1);
  }
  return {
    commits: entries.length,
    days: new Set(entries.map((entry) => entry.date)).size,
    from: entries[entries.length - 1]?.date ?? '',
    to: entries[0]?.date ?? '',
    topTypes: Array.from(types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([type, count]) => ({ type, count })),
  };
}

function groupByQuarter(changelog: ChangelogEntry[]): Map<string, ChangelogEntry[]> {
  const groups = new Map<string, ChangelogEntry[]>();
  for (const entry of changelog) {
    const quarter = quarterOf(entry.date);
    const bucket = groups.get(quarter);
    if (bucket) bucket.push(entry);
    else groups.set(quarter, [entry]);
  }
  return groups;
}

/**
 * 还没过完的季度：页面上给它们放一块「进行中」的占位公告，
 * 但这些季度永远不进缺口清单，不会触发补写提醒。
 */
export function inProgressQuarters(changelog: ChangelogEntry[], now: Date = new Date()): string[] {
  return Array.from(groupByQuarter(changelog).keys()).filter(
    (quarter) => !isQuarterComplete(quarter, now)
  );
}

/**
 * 已完结季度里「该动笔却还没动笔」的清单。
 *
 * 构建期用它自动判断要不要提醒（脚本 / workflow 直接消费这份结构化结果），
 * 但它**不生成**任何总结文本 —— 文本只在 `quarter-summaries.json` 里人写一次。
 */
export function quarterSummaryGaps(
  changelog: ChangelogEntry[],
  stored: Record<string, QuarterSummaryStored>,
  now: Date = new Date()
): QuarterGap[] {
  const gaps: QuarterGap[] = [];
  for (const [quarter, list] of groupByQuarter(changelog)) {
    if (!isQuarterComplete(quarter, now)) continue;
    const saved = stored[quarter];
    const fingerprint = quarterFingerprint(list);
    const stats = quarterStats(list);
    const base = {
      quarter,
      commits: list.length,
      fingerprint,
      from: stats.from,
      to: stats.to,
    };
    if (!saved) gaps.push({ ...base, kind: 'missing' });
    else if (saved.fingerprint !== fingerprint) {
      gaps.push({ ...base, kind: 'changed', storedFingerprint: saved.fingerprint });
    }
  }
  return gaps;
}

/**
 * 挑出可以显示总结的季度。
 *
 * 「不重复总结」靠两件事保证：
 *   1. 构建期**从不生成**总结文本，只读 `quarter-summaries.json` 里已经写好的；
 *      缺总结只提醒补写（见 quarterSummaryGaps），不会自动补一份。
 *   2. 输出按季度键控，每个季度最多一条，进行中的季度直接排除。
 * 指纹对不上时也仍然复用旧总结、只提醒人工复核 —— 不覆盖、不重写。
 */
export function selectQuarterSummaries(
  changelog: ChangelogEntry[],
  stored: Record<string, QuarterSummaryStored>,
  now: Date = new Date(),
  warn: (message: string) => void = console.warn
): Record<string, QuarterSummary> {
  const result: Record<string, QuarterSummary> = {};
  for (const [quarter, list] of groupByQuarter(changelog)) {
    if (!isQuarterComplete(quarter, now)) continue;
    const saved = stored[quarter];
    // 没写的那几条交给 quarterSummaryGaps 统一提醒，这里不生成、不占位
    if (!saved) continue;
    result[quarter] = { ...saved, stats: quarterStats(list) };
  }

  for (const gap of quarterSummaryGaps(changelog, stored, now)) {
    if (gap.kind === 'missing') {
      warn(
        `[changelog] ${gap.quarter} 已完结但还没有总结（${gap.commits} 条提交，指纹 ${gap.fingerprint}）；请补写 src/data/quarter-summaries.json`
      );
    } else {
      warn(
        `[changelog] ${gap.quarter} 的提交指纹变了（存档 ${gap.storedFingerprint} / 当前 ${gap.fingerprint}）：仍复用已写好的总结，请人工复核`
      );
    }
  }
  return result;
}

/**
 * 读 quarter-summaries.json：`defaults` 归默认文案，其余只有形如 `26Q3`
 * 的键才算季度条目 —— 两处分开，缺口判定 / 总结挑选永远看不到 defaults。
 */
export function readSummaryArchive(): SummaryArchive {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(SUMMARIES_PATH, 'utf-8')) as Record<string, unknown>;
  } catch {
    /* 文件缺失 / 格式坏掉不阻断构建，只是没有总结、也没有公告文案 */
    return { entries: {}, inProgressNotice: null };
  }

  const entries: Record<string, QuarterSummaryStored> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'defaults' || !/^\d{2}Q[1-4]$/.test(key)) continue;
    entries[key] = value as QuarterSummaryStored;
  }

  const defaults = raw['defaults'] as { inProgress?: QuarterNotice } | undefined;
  const notice = defaults?.inProgress;
  const inProgressNotice =
    notice && typeof notice.headline === 'string' && typeof notice.body === 'string'
      ? { headline: notice.headline, body: notice.body }
      : null;

  return { entries, inProgressNotice };
}

/** `git@github.com:owner/repo.git` / `https://github.com/owner/repo.git` → 仓库主页 URL。 */
export function normalizeRepoUrl(remote: string): string | null {
  const match = /github\.com[:/]+([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(remote.trim());
  return match ? `https://github.com/${match[1]}/${match[2]}` : null;
}

/**
 * README 里的链接有两种要处理：
 *   - 站外链接：加 target / rel（悬浮框里点开不该把站点顶掉）
 *   - `LICENSE`、`docs/x.md` 这种仓库内相对路径：站上没有这个文件，改指 GitHub
 * `#锚点` 原样保留（悬浮框内的锚点没有对应元素，但至少不会跳到 404）。
 */
export function rewriteLinks(html: string, repoUrl: string | null): string {
  return html.replace(/<a href="([^"]*)"/g, (whole, href: string) => {
    if (href.startsWith('#')) return whole;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"`;
    }
    if (!repoUrl) return whole;
    const path = href.replace(/^\.\//, '').replace(/^\/+/, '');
    return `<a href="${repoUrl}/blob/main/${path}" target="_blank" rel="noopener noreferrer"`;
  });
}

/**
 * 挑进标题栏跳转点的节标题（按 README 里的 `##` 标题原样写）。
 * 只挑重要的几节 —— 全部 12 个放标题栏会挤成两行，跳转点反而不好找。
 * 想换一批就改这个数组；写了不存在的标题，buildAbout 会 warn。
 */
const ABOUT_NAV: readonly string[] = ['技术栈', '主要特性', '设计说明', '项目结构', '内容维护'];

/**
 * 按 h1/h2 把 README 切成一节一个 `<div class="readme-sec">`，每节带稳定的
 * `about-sec-N` id（跳转点用），并顺手取出节标题供目录挑选。
 *
 * 弹窗正文只有 ~700px 高，而整篇 README 排出来有 1.2 万像素：不切节的话，
 * 每次打开都要同步排完整篇（弱机实测 200ms+，主线程一卡，光标也跟着停）。
 * 切节后配合 style.css 里的 `content-visibility: auto`，只排视口附近那几节。
 *
 * 用 `<div>` 而不是 `<section>`：全站 `section { padding: 5rem 2rem }` 会把
 * 每一节都撑高一截。h1/h2 是 marked 生成的顶层块，字符串切分就够，
 * 不需要为构建期再引入一个 DOM 解析器。
 */
function wrapSections(html: string): { html: string; sections: AboutNav[] } {
  const sections: AboutNav[] = [];
  const wrapped = html
    .split(/(?=<h[12][\s>])/i)
    .filter((part) => part.trim())
    .map((part, index) => {
      const id = `about-sec-${index}`;
      const heading = /^<h[12][^>]*>([\s\S]*?)<\/h[12]>/i.exec(part)?.[1] ?? '';
      const label = heading.replace(/<[^>]+>/g, '').trim();
      if (label) sections.push({ id, label });
      return `<div class="readme-sec" id="${id}">${part}</div>`;
    })
    .join('');
  return { html: wrapped, sections };
}

/** README → 悬浮框里的 HTML + 目录跳转。表格套一层 `.table-wrapper`，窄屏才能横向滚动。 */
export function renderAboutHtml(
  markdown: string,
  repoUrl: string | null,
  warn: (message: string) => void = console.warn
): { html: string; nav: AboutNav[] } {
  let html = marked.parse(markdown, { async: false });
  html = rewriteLinks(html, repoUrl);
  html = html
    .replace(/<table>/g, '<div class="table-wrapper"><table>')
    .replace(/<\/table>/g, '</table></div>');
  const { html: wrapped, sections } = wrapSections(html);
  const nav = ABOUT_NAV.map((title) => {
    const found = sections.find((section) => section.label === title);
    if (!found) warn(`[about] 目录跳转点「${title}」在 README 里找不到对应章节`);
    return found;
  }).filter((item): item is AboutNav => item !== undefined);
  return { html: wrapped, nav };
}

function git(args: string[]): string {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 16 * 1024 * 1024,
  });
}

/** 仓库地址：本地 remote 叫 self、CI 上叫 origin，所以不按名字取，找第一个 GitHub 地址。 */
export function readRepoUrl(): string | null {
  try {
    const remotes = git(['remote', '-v']);
    for (const line of remotes.split('\n')) {
      const url = line.split(/\s+/)[1];
      if (!url) continue;
      const normalized = normalizeRepoUrl(url);
      if (normalized) return normalized;
    }
  } catch {
    /* 非 git 环境：没有就不改写链接 */
  }
  return null;
}

export function readCommits(): { changelog: ChangelogEntry[]; total: number } {
  try {
    const total = Number.parseInt(git(['rev-list', '--count', 'HEAD']).trim(), 10) || 0;
    const output = git([
      '-c',
      'core.quotePath=false',
      'log',
      `-n`,
      String(MAX_COMMITS),
      '--date=short',
      '--pretty=format:%h\x1f%cs\x1f%s',
    ]);
    return { changelog: parseCommits(output), total };
  } catch {
    return { changelog: [], total: 0 };
  }
}

export async function buildAbout(): Promise<AboutMeta> {
  const markdown = await readFile(README_PATH, 'utf-8');
  const { html, nav } = renderAboutHtml(markdown, readRepoUrl());
  return {
    html,
    nav,
    updated: getGitLastModified(README_PATH),
  };
}

export function buildCommits(now: Date = new Date()): CommitsMeta {
  const { changelog, total } = readCommits();
  const archive = readSummaryArchive();
  return {
    changelog,
    total,
    repo: readRepoUrl(),
    summaries: selectQuarterSummaries(changelog, archive.entries, now),
    inProgress: inProgressQuarters(changelog, now),
    inProgressNotice: archive.inProgressNotice,
  };
}

export function siteMeta(): Plugin {
  return {
    name: 'cmixed:site-meta',

    // dev：两份 JSON 现读现发（README / 提交记录改了刷新就生效）
    configureServer(server) {
      const producers: Record<string, () => Promise<unknown>> = {
        [`/${ABOUT_FILE}`]: () => buildAbout(),
        [`/${COMMITS_FILE}`]: () => Promise.resolve(buildCommits()),
      };
      server.middlewares.use((req, res, next) => {
        const produce = producers[(req.url || '').split('?')[0]];
        if (!produce) return next();
        produce().then(
          (meta) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(JSON.stringify(meta));
          },
          (err: unknown) => next(err instanceof Error ? err : new Error(String(err)))
        );
      });
    },

    // build：写进 dist/ 根目录，和首页同级
    async generateBundle() {
      const files: Array<[string, unknown]> = [
        [ABOUT_FILE, await buildAbout()],
        [COMMITS_FILE, buildCommits()],
      ];
      for (const [fileName, data] of files) {
        this.emitFile({ type: 'asset', fileName, source: JSON.stringify(data) });
      }
    },
  };
}
