import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
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
 * 用法：
 *   tsx scripts/check-markdown.ts            全量检查，只报告
 *   tsx scripts/check-markdown.ts --strict   有告警时以非 0 退出
 *   tsx scripts/check-markdown.ts --staged   只检查暂存的 md（pre-commit）
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

function listMarkdownFiles(staged: boolean): string[] {
  const args = staged
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACM', '-z', '--', '*.md']
    : ['ls-files', '-z', '*.md'];
  const output = execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return output.split('\0').filter(Boolean);
}

function formatIssues(files: readonly string[], issues: readonly LintError[]): string {
  const lines: string[] = [];
  const byFile = new Map<string, LintError[]>();
  for (const issue of issues) {
    const name = (issue as LintError & { fileName?: string }).fileName || '';
    const list = byFile.get(name) || [];
    list.push(issue);
    byFile.set(name, list);
  }

  for (const file of files) {
    const list = byFile.get(file);
    if (!list?.length) continue;
    lines.push('', file);
    for (const issue of list) {
      const column = issue.errorRange?.[0] ?? 1;
      const rule = issue.ruleNames.join('/');
      const detail = issue.errorDetail ? `  ${issue.errorDetail}` : '';
      lines.push(`  ${issue.lineNumber}:${column}  ${rule}${detail}`);
    }
  }
  return lines.join('\n');
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

  const config = parseJsonc<MarkdownlintCli2Config>(readFileSync(configPath, 'utf8'));
  const files = selectFiles(listMarkdownFiles(staged), config).sort();

  if (files.length === 0) {
    console.log(staged ? 'Markdown check: no staged markdown files.' : 'Markdown check: no files.');
    return;
  }

  const strings = Object.fromEntries(
    files.map((file) => [file, readFileSync(join(repoRoot, file), 'utf8')])
  );
  const results = await lintStrings(strings, config);
  let issues = Object.entries(results).flatMap(([file, list]) =>
    list.map((issue) => ({ ...issue, fileName: file }))
  );

  let fixed = 0;
  if (fix) {
    for (const file of files) {
      const fileIssues = issues.filter(
        (issue) => (issue as LintError & { fileName?: string }).fileName === file
      );
      if (!fileIssues.length) continue;
      const original = strings[file];
      const updated = applyFixes(original, fileIssues);
      if (updated !== original) {
        writeFileSync(join(repoRoot, file), updated);
        fixed += fileIssues.filter((issue) => issue.fixInfo).length;
        strings[file] = updated;
      }
    }
    if (fixed > 0) {
      const after = await lintStrings(strings, config);
      issues = Object.entries(after).flatMap(([file, list]) =>
        list.map((issue) => ({ ...issue, fileName: file }))
      );
    }
  }

  if (issues.length === 0) {
    console.log(
      `Markdown check: OK (${files.length} files${fixed ? `, ${fixed} fixes applied` : ''}).`
    );
    return;
  }

  const affected = new Set(
    issues.map((issue) => (issue as LintError & { fileName?: string }).fileName as string)
  );
  console.log(`Markdown check: ${issues.length} issue(s) in ${affected.size} file(s).`);
  console.log(formatIssues(files, issues));
  console.log('');

  if (strict) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
