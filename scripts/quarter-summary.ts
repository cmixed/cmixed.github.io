/**
 * 季度总结的补写入口 —— 只输出素材和状态，**不生成总结文本**。
 *
 *   pnpm quarter-summary          # 本地：各季度状态、指纹、统计与待补写素材
 *   pnpm quarter-summary --ci     # CI：额外写 GitHub 注解 / Step Summary / outputs
 *
 * 总结写在 `src/data/quarter-summaries.json`，一个季度一条，写完提交进仓库。
 * 构建期只读取它（见 site-meta.ts 的 selectQuarterSummaries），所以同一个季度
 * 不会被重新总结；指纹用来提醒「该季度的提交历史变了，人工复核一次」。
 *
 * CI 模式下写给 workflow 的三个信号：
 *   - stdout 里的 `::warning title=…::…` → Actions 运行页的注解
 *   - `$GITHUB_STEP_SUMMARY`            → 运行页顶部的表格
 *   - `$GITHUB_OUTPUT`                  → `needs_attention` / `missing` / `changed` / `quarters`
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isQuarterComplete,
  quarterFingerprint,
  quarterOf,
  quarterStats,
  quarterSummaryGaps,
  readCommits,
  type ChangelogEntry,
  type QuarterGap,
  type QuarterSummaryStored,
} from './site-meta';

const CI = process.argv.includes('--ci');
const ROOT = join(import.meta.dirname, '..');
const SUMMARIES_PATH = join(ROOT, 'src', 'data', 'quarter-summaries.json');

let stored: Record<string, QuarterSummaryStored> = {};
try {
  stored = JSON.parse(readFileSync(SUMMARIES_PATH, 'utf-8')) as Record<
    string,
    QuarterSummaryStored
  >;
} catch {
  console.log('（还没有 quarter-summaries.json，以下季度都需要补写）');
}

const { changelog } = readCommits();
const groups = new Map<string, ChangelogEntry[]>();
for (const entry of changelog) {
  const quarter = quarterOf(entry.date);
  const bucket = groups.get(quarter);
  if (bucket) bucket.push(entry);
  else groups.set(quarter, [entry]);
}

const gaps = quarterSummaryGaps(changelog, stored);
const gapOf = new Map(gaps.map((gap) => [gap.quarter, gap]));

for (const [quarter, list] of groups) {
  const stats = quarterStats(list);
  const fingerprint = quarterFingerprint(list);
  const complete = isQuarterComplete(quarter);
  const saved = stored[quarter];

  let status: string;
  if (!complete) status = '进行中 · 不总结';
  else if (!saved) status = '★ 待补写';
  else if (saved.fingerprint !== fingerprint) status = '已总结 · 指纹变化，请人工复核';
  else status = '已总结 · 一致';

  console.log(
    `\n${quarter}  ${status}\n  ${stats.from} — ${stats.to} · ${stats.commits} 条 / ${stats.days} 个活跃日 · 指纹 ${fingerprint}\n  ${stats.topTypes.map((item) => `${item.type} ${item.count}`).join(' · ')}`
  );

  if (complete && !saved) {
    console.log('  素材（最近 12 条标题）：');
    for (const entry of list.slice(0, 12)) {
      console.log(`    ${entry.date}  ${entry.subject}`);
    }
    console.log(`  补写后把 "fingerprint": "${fingerprint}" 一起写进 JSON。`);
  }
}

/** 一条注解一行；GitHub 的注解不支持换行，换行转 %0A。 */
function annotate(gap: QuarterGap): string {
  const label = gap.kind === 'missing' ? '待补写' : '指纹变化待复核';
  const detail =
    gap.kind === 'missing'
      ? `${gap.quarter} 已完结（${gap.commits} 条，${gap.from} — ${gap.to}，指纹 ${gap.fingerprint}），请补写 src/data/quarter-summaries.json`
      : `${gap.quarter} 提交指纹变了（存档 ${gap.storedFingerprint} / 当前 ${gap.fingerprint}），旧总结仍会复用，请人工复核`;
  return `::warning title=季度总结 · ${label}::${detail.replace(/\n/g, '%0A')}`;
}

function summaryMarkdown(): string {
  const rows = Array.from(groups, ([quarter, list]) => {
    const gap = gapOf.get(quarter);
    const stats = quarterStats(list);
    const status = !isQuarterComplete(quarter)
      ? '进行中 · 不总结'
      : gap?.kind === 'missing'
        ? '⚠️ 待补写'
        : gap?.kind === 'changed'
          ? '⚠️ 指纹变化待复核'
          : '✅ 已总结';
    return `| ${quarter} | ${status} | ${stats.commits} | ${stats.from} — ${stats.to} | \`${quarterFingerprint(list)}\` |`;
  });
  return [
    '### 季度总结检查',
    '',
    '| 季度 | 状态 | 提交 | 区间 | 指纹 |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
    gaps.length === 0
      ? '所有已完结季度都写过总结，本次不需要动笔。'
      : '补写入口：`pnpm quarter-summary`（打印素材），手写后提交 `src/data/quarter-summaries.json`。',
    '',
  ].join('\n');
}

function writeCiOutputs(): void {
  const missing = gaps.filter((gap) => gap.kind === 'missing').map((gap) => gap.quarter);
  const changed = gaps.filter((gap) => gap.kind === 'changed').map((gap) => gap.quarter);
  const quarters = gaps.map((gap) => gap.quarter);

  for (const gap of gaps) console.log(annotate(gap));

  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) appendFileSync(summaryFile, summaryMarkdown());

  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(
      outputFile,
      [
        `needs_attention=${gaps.length > 0}`,
        `missing=${missing.join(',')}`,
        `changed=${changed.join(',')}`,
        `quarters=${quarters.join(',')}`,
        '',
      ].join('\n')
    );
  }

  console.log(
    gaps.length === 0
      ? '\n[ci] 所有已完结季度都有总结，不需要补写。'
      : `\n[ci] 需要动手的季度：${quarters.join('、')}（待补写 ${missing.join('、') || '无'}；待复核 ${changed.join('、') || '无'}）`
  );
}

if (CI) writeCiOutputs();
