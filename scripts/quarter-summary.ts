/**
 * 季度总结的补写入口 —— 只输出素材，**不生成总结文本**。
 *
 *   pnpm exec tsx scripts/quarter-summary.ts
 *
 * 总结写在 `src/data/quarter-summaries.json`，一个季度一条，写完提交进仓库。
 * 构建期只读取它（见 site-meta.ts 的 selectQuarterSummaries），所以同一个季度
 * 不会被重新总结；指纹用来提醒「该季度的提交历史变了，人工复核一次」。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isQuarterComplete,
  quarterFingerprint,
  quarterOf,
  quarterStats,
  readCommits,
  type ChangelogEntry,
  type QuarterSummaryStored,
} from './site-meta';

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
