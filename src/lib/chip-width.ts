/**
 * 标签宽度的量化规则 —— 构建期（blog / nook）与运行时（main.ts 渲染卡片）共用。
 *
 * 规则：以「2 个中文字 = 4 个英文字母」为一档，宽度按这一档向上取整。
 * 所以一排标签的宽度都是 2em 的整数倍，短标签（AI / Git / LLM）不会缩成一粒，
 * 长标签也不会把整行撑得参差。
 *
 * 计法：全角字符算 2 个半字宽，其余（拉丁字母、数字、空格、标点）算 1 个；
 * 4 个半字 = 1 档 = 2em。CSS 侧用 `min-width: calc(var(--chip-cols) * 2em)`，
 * 因为 min-width 含 padding，这里就不再单独折算内边距。
 */

/** 全角区间：CJK 统一表意、假名、谚文、全角标点、兼容表意。 */
const WIDE =
  /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;

export function chipCols(text: string, extraEm = 0): number {
  /* 按 em 累加：全角 1em，拉丁字母 / 数字 / 标点约 0.55em（Inter 12px 下的实测均值）。
     再加 1.5em 给左右内边距与 1px 边框，extraEm 给计数或图标。
     最后按「2 个中文字 = 2em」一档向上取整，最少 1 档。 */
  let em = 0;
  for (const ch of text) em += WIDE.test(ch) ? 1 : 0.55;
  return Math.max(1, Math.ceil((em + 1.5 + extraEm) / 2));
}

/** 直接拼进 HTML 的 style 片段：` style="--chip-cols:2"`。 */
export function chipStyle(text: string): string {
  return ` style="--chip-cols:${chipCols(text)}"`;
}
