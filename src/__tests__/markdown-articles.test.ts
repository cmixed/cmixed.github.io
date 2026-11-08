import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import {
  countIssues,
  formatIssues,
  lintStrings,
  loadConfig,
  selectRepositoryFiles,
} from '../../scripts/check-markdown';

const root = process.cwd();

describe('仓库内的 Markdown 文章', () => {
  it('检查范围覆盖博客、资源小窝与 README', () => {
    const files = selectRepositoryFiles(loadConfig());
    expect(files).toContain('README.md');
    expect(files.some((file) => /^blog\/post\/.+\.md$/.test(file))).toBe(true);
    expect(files.some((file) => /^nook\/file\/.+\/index\.md$/.test(file))).toBe(true);
    expect(files.some((file) => file.startsWith('nook/file/_template/'))).toBe(false);
  });

  it('全部通过 markdownlint 检查', async () => {
    const config = loadConfig();
    const files = selectRepositoryFiles(config);
    const strings = Object.fromEntries(
      files.map((file) => [file, readFileSync(join(root, file), 'utf8')])
    );
    const results = await lintStrings(strings, config);

    expect(countIssues(results), formatIssues(results).trim()).toBe(0);
  });
});
