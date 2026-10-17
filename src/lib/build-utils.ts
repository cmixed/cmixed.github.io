import { execFileSync } from 'child_process';
import { relative, sep } from 'path';

export function parseFrontmatter<T extends Record<string, unknown>>(
  content: string
): { meta: T; body: string } {
  content = content.replace(/\r\n/g, '\n');
  let match = content.match(/^---\n([\s\S]*?)\n\n?---\n([\s\S]*)$/);
  if (!match) match = content.match(/^[^\n]*\n+---\n([\s\S]*?)\n\n?---\n([\s\S]*)$/);
  if (!match) return { meta: {} as T, body: content };
  const yaml = match[1];
  const body = match[2];
  const meta = {} as Record<string, unknown>;
  for (const line of yaml.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val: string | string[] | boolean = line.slice(idx + 1).trim();
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (val.startsWith('[') && val.endsWith(']'))
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim());
    meta[key] = val;
  }
  return { meta: meta as T, body };
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 以本地时区格式化为 YYYY-MM-DD */
export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

let repoRoot: string | null | undefined;

function getRepoRoot(): string | null {
  if (repoRoot !== undefined) return repoRoot;
  try {
    repoRoot =
      execFileSync('git', ['rev-parse', '--show-toplevel'], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() || null;
  } catch {
    repoRoot = null;
  }
  return repoRoot;
}

/**
 * 仓库相对路径 -> 最后一次提交日期（YYYY-MM-DD）。
 * 一次 `git log` 批量解析并缓存，避免逐文件启动进程。
 */
let gitDates: Map<string, string> | null | undefined;

function loadGitDates(): Map<string, string> | null {
  if (gitDates !== undefined) return gitDates;
  gitDates = null;
  const root = getRepoRoot();
  if (!root) return gitDates;
  try {
    const out = execFileSync(
      'git',
      ['-c', 'core.quotePath=false', 'log', '--format=@@%cs', '--name-only'],
      {
        cwd: root,
        encoding: 'utf-8',
        maxBuffer: 32 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    );
    const map = new Map<string, string>();
    let commitDate = '';
    for (const line of out.split('\n')) {
      if (line.startsWith('@@')) commitDate = line.slice(2);
      // git log 由新到旧输出，路径首次出现即其最后一次被修改的提交
      else if (line && commitDate && !map.has(line)) map.set(line, commitDate);
    }
    gitDates = map;
  } catch {
    gitDates = null;
  }
  return gitDates;
}

/**
 * 返回文件最后一次被提交的日期（YYYY-MM-DD），用于替代不可靠的文件 mtime。
 * 非 git 环境返回 null，由调用方回退到 mtime。
 *
 * 注：依赖完整 git 历史（CI 中 checkout 需 fetch-depth: 0）；浅克隆下
 * `git log` 只能看到 HEAD，会退化成构建日期。
 */
export function getGitLastModified(filePath: string): string | null {
  const root = getRepoRoot();
  const dates = loadGitDates();
  if (!root || !dates) return null;
  const rel = relative(root, filePath).split(sep).join('/');
  return dates.get(rel) ?? null;
}
