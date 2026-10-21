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
 * （首页在 load 后的空闲时段预取，见 src/main.ts）。
 *
 * CI 注意：git 历史要完整（部署 workflow 的 checkout 已经是 fetch-depth: 0）；
 * 拿不到 git（比如源码压缩包）时降级成「暂无记录」，不影响页面。 */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { marked } from 'marked';
import type { Plugin } from 'vite-plus';
import { getGitLastModified } from '../src/lib/build-utils';

const ROOT = join(import.meta.dirname, '..');
const README_PATH = join(ROOT, 'README.md');

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

export interface AboutMeta {
  /** README 渲染后的 HTML（相对链接已改写成 GitHub 上的地址） */
  html: string;
  /** README 最后一次提交的日期（YYYY-MM-DD），非 git 环境为 null */
  updated: string | null;
}

export interface CommitsMeta {
  changelog: ChangelogEntry[];
  /** 仓库里的提交总数（可能大于 changelog.length） */
  total: number;
  /** 仓库主页地址，用于把提交 hash 指回 GitHub；拿不到为 null */
  repo: string | null;
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
 * 按 h1/h2 把 README 切成一节一个 `<div class="readme-sec">`。
 *
 * 弹窗正文只有 ~700px 高，而整篇 README 排出来有 1.2 万像素：不切节的话，
 * 每次打开都要同步排完整篇（弱机实测 200ms+，主线程一卡，光标也跟着停）。
 * 切节后配合 style.css 里的 `content-visibility: auto`，只排视口附近那几节。
 *
 * 用 `<div>` 而不是 `<section>`：全站 `section { padding: 5rem 2rem }` 会把
 * 每一节都撑高一截。h1/h2 是 marked 生成的顶层块，字符串切分就够，
 * 不需要为构建期再引入一个 DOM 解析器。
 */
function wrapSections(html: string): string {
  return html
    .split(/(?=<h[12][\s>])/i)
    .filter((part) => part.trim())
    .map((part) => `<div class="readme-sec">${part}</div>`)
    .join('');
}

/** README → 悬浮框里的 HTML。表格套一层 `.table-wrapper`，窄屏才能横向滚动。 */
export function renderAboutHtml(markdown: string, repoUrl: string | null): string {
  let html = marked.parse(markdown, { async: false });
  html = rewriteLinks(html, repoUrl);
  html = html
    .replace(/<table>/g, '<div class="table-wrapper"><table>')
    .replace(/<\/table>/g, '</table></div>');
  return wrapSections(html);
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

function readCommits(): { changelog: ChangelogEntry[]; total: number } {
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
  return {
    html: renderAboutHtml(markdown, readRepoUrl()),
    updated: getGitLastModified(README_PATH),
  };
}

export function buildCommits(): CommitsMeta {
  const { changelog, total } = readCommits();
  return { changelog, total, repo: readRepoUrl() };
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
