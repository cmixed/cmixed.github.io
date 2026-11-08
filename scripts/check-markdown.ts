import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyFixes } from 'markdownlint';
import type { Configuration, LintError } from 'markdownlint';
import { lint } from 'markdownlint/promise';

/**
 * 文章 Markdown 检查器 —— 唯一入口。
 *
 * 规则与检查范围都来自仓库根目录的 `.markdownlint-cli2.jsonc`，
 * VS Code 的 markdownlint 扩展读的也是同一份配置，所以编辑器提示与
 * 提交 / 构建时的结果一致。
 *
 * 仓库内容是否合规由 `src/__tests__/markdown-articles.test.ts` 作为测试用例守住，
 * 本脚本负责人工报告、`--fix` 与构建前快速失败。
 *
 * 用法：
 *   tsx scripts/check-markdown.ts            全量检查，只报告
 *   tsx scripts/check-markdown.ts --strict   有告警时以非 0 退出
 *   tsx scripts/check-markdown.ts --staged   只检查暂存的 md
 *   tsx scripts/check-markdown.ts --fix      自动修复支持 fixInfo 的告警
 *
 * 设置环境变量 SKIP_MD_CHECK=1 可跳过（紧急发布用）。
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(repoRoot, '.markdownlint-cli2.jsonc');

export interface MarkdownlintCli2Config {
  frontMatter?: string;
  config?: Configuration;
  globs?: string[];
  ignores?: string[];
}

/** 去掉 JSONC 里的注释与尾随逗号，避免为了可读性再引一个依赖。 */
export function parseJsonc<T>(text: string): T {
  let out = '';
  let inString = false;
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        out += char;
      }
      continue;
    }
    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      out += char;
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (char === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    out += char;
  }

  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1')) as T;
}

/** `*` / `**` / `?` 的极简 glob，只覆盖配置里用到的形式。 */
export function globToRegExp(glob: string): RegExp {
  const parts: string[] = [];
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          parts.push('(?:.*/)?');
          i += 2;
        } else {
          parts.push('.*');
          i += 1;
        }
      } else {
        parts.push('[^/]*');
      }
    } else if (char === '?') {
      parts.push('[^/]');
    } else {
      parts.push(char.replace(/[.+^${}()|[\]\\]/g, '\\$&'));
    }
  }
  return new RegExp(`^${parts.join('')}$`);
}

/** 按 globs / ignores 筛选文件。 */
export function selectFiles(files: readonly string[], config: MarkdownlintCli2Config): string[] {
  const include = (config.globs || []).map(globToRegExp);
  const exclude = (config.ignores || []).map(globToRegExp);
  return files.filter(
    (file) =>
      (include.length === 0 || include.some((re) => re.test(file))) &&
      !exclude.some((re) => re.test(file))
  );
}

/** 读取并解析仓库根目录的共享配置（编辑器扩展用的也是这一份）。 */
export function loadConfig(path = configPath): MarkdownlintCli2Config {
  return parseJsonc<MarkdownlintCli2Config>(readFileSync(path, 'utf8'));
}

/** 纯函数入口：便于单测，不碰文件系统。 */
export async function lintStrings(
  strings: Record<string, string>,
  config: MarkdownlintCli2Config
): Promise<Record<string, LintError[]>> {
  return lint({
    strings,
    config: config.config,
    frontMatter: config.frontMatter ? new RegExp(config.frontMatter, 'u') : undefined,
  });
}

/** git 不可用时的回退：按目录遍历，跳过依赖与构建产物。 */
function listFromFileSystem(): string[] {
  const ignored = new Set(['.git', 'node_modules', 'dist', 'coverage', 'blog/vendor']);
  const files: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(join(repoRoot, directory), { withFileTypes: true })) {
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) walk(path);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(path);
      }
    }
  };
  walk('');
  return files;
}

function listGitFiles(args: string[]): string[] | null {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * 列出待检查的 Markdown 文件。
 *
 * 全量模式同时包含已跟踪与未跟踪（但未被 `.gitignore` 忽略）的文件，
 * 与 `blog/build.ts` / `nook/build.ts` 的目录扫描范围一致 —— 新写但还没
 * `git add` 的文章也会被检查，不会等到 push 后才在 CI 里炸。
 */
export function listMarkdownFiles(staged: boolean): string[] {
  if (staged) {
    return (
      listGitFiles(['diff', '--cached', '--name-only', '--diff-filter=ACM', '-z', '--', '*.md']) ??
      listFromFileSystem()
    );
  }
  return (
    listGitFiles(['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '*.md']) ??
    listFromFileSystem()
  );
}

/** 读取配置并筛出需要检查的文件（已排序）。 */
export function selectRepositoryFiles(config = loadConfig(), staged = false): string[] {
  return (
    selectFiles(listMarkdownFiles(staged), config)
      // 工作区里已删除但还没暂存的文件不该让检查失败
      .filter((file) => existsSync(join(repoRoot, file)))
      .sort()
  );
}

/** 把结果格式化成「文件 + 行:列 + 规则」的文本，CLI 与测试共用。 */
export function formatIssues(results: Record<string, readonly LintError[]>): string {
  const lines: string[] = [];
  for (const file of Object.keys(results).sort()) {
    const issues = results[file];
    if (!issues.length) continue;
    lines.push('', file);
    for (const issue of issues) {
      const column = issue.errorRange?.[0] ?? 1;
      const detail = issue.errorDetail ? `  ${issue.errorDetail}` : '';
      lines.push(`  ${issue.lineNumber}:${column}  ${issue.ruleNames.join('/')}${detail}`);
    }
  }
  return lines.join('\n');
}

/** 统计告警总数。 */
export function countIssues(results: Record<string, readonly LintError[]>): number {
  return Object.values(results).reduce((total, issues) => total + issues.length, 0);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (process.env.SKIP_MD_CHECK === '1') {
    console.log('Markdown check skipped (SKIP_MD_CHECK=1).');
    return;
  }

  const strict = argv.includes('--strict');
  const staged = argv.includes('--staged');
  const fix = argv.includes('--fix');

  const config = loadConfig();
  const files = selectRepositoryFiles(config, staged);

  if (files.length === 0) {
    console.log(staged ? 'Markdown check: no staged markdown files.' : 'Markdown check: no files.');
    return;
  }

  const strings = Object.fromEntries(
    files.map((file) => [file, readFileSync(join(repoRoot, file), 'utf8')])
  );
  let results = await lintStrings(strings, config);
  let fixed = 0;

  if (fix) {
    for (const file of files) {
      const fileIssues = results[file] ?? [];
      const fixable = fileIssues.filter((issue) => issue.fixInfo);
      if (fixable.length === 0) continue;
      const updated = applyFixes(strings[file], fileIssues);
      if (updated === strings[file]) continue;
      writeFileSync(join(repoRoot, file), updated);
      fixed += fixable.length;
      strings[file] = updated;
    }
    if (fixed > 0) results = await lintStrings(strings, config);
  }

  const total = countIssues(results);
  if (total === 0) {
    console.log(
      `Markdown check: OK (${files.length} files${fixed ? `, ${fixed} fixes applied` : ''}).`
    );
    return;
  }

  const affected = files.filter((file) => results[file]?.length).length;
  console.log(`Markdown check: ${total} issue(s) in ${affected} file(s).`);
  console.log(formatIssues(results));
  console.log('');

  if (strict) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
