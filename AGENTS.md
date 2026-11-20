# 项目规范

本仓库是嘉哥的个人站点（Vite+ / TypeScript，无运行时框架）。任何 AI 助手在本仓库工作前先读本文件，尤其是提交信息一节。

## 提交信息（强制）

所有提交必须使用约定式提交（Conventional Commits）：

`<type>[(<scope>)][!]: <description>`

- `type` **只能**取以下 11 个值，全部小写：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、`revert`。
- `scope` 可选，小写，只含 `a-z 0-9 . _ / -`，例如 `fix(blog)`、`docs(about)`。
- `!` 可选，放在 `:` 前表示破坏性变更。
- `: ` 冒号后**必须恰好一个空格**；`description` 非空、用祈使语气、首字母小写。
- 英文专名与缩写按原本拼写保留大小写，不要为了「统一」改小写：`TOC`、`Vite`、`TypeScript`、`VS Code`、`C++ API`、`JSON-LD`、`GitHub`。中文描述照常写。

正确示例：

- `feat(cards): one clamp spec for five card kinds and one popover`
- `fix: TOC arrow syncs state on collapse`
- `docs: note commit title normalisation`
- `revert: add chest resource page and optimize blog`

错误示例（这些会让构建直接失败）：

- `Fix TOC arrow: ...` —— 缺 type，动词大写开头
- `feat:(blog) update blog` —— 冒号后缺空格、scope 位置错
- `fear:`、`chorn:`、`seo:`、`redesign:`、`copy:`、`merge:` —— type 不在词表
- `Revert "fix: ..."` —— git 自动生成的格式，改写成 `revert: ...`
- `My Homepage`、纯中文标题 —— 缺 type

### 校验方式

`scripts/site-meta.ts` 里的 `COMMIT_TITLE` 是**唯一**判定规则。`parseCommitLine()` 遇到不合规标题直接抛错，会中断 `vp build` 与 `vp dev`，报错里会指向本文件。提交前自检：

```bash
git log -1 --format=%s
npm run build
```

**不要**为不合规标题加兜底、白名单、覆盖表、豁免基线或展示层归一化。历史已于 2026-11-15 全量重写为合规；新提交不合规就改提交信息（未推送时用 `git commit --amend`），不要改解析规则。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npx vp check` | 格式、lint、类型检查 |
| `npx vp test run` | 单元测试 |
| `npm run build` | 全量构建（markdown 检查、图片优化、博客 / 小窝生成） |
| `npx tsx scripts/quarter-summary.ts --ci` | 季度总结缺口检查 |
| `pnpm brand-icons` | 重新生成语言 / 平台的品牌图标（`src/lib/brand-icons.ts`）。加语言 / 平台时改 `scripts/build-brand-icons.ts` 的 `SOURCES` 再跑。生成文件不要手改 |

交付前依次跑通 `vp check` → `vp test run` → `npm run build`，并按上面的格式分提交（代码一条、`docs:` 一条）。

## 其它约定

- `MAX_COMMITS` 目前 800。仓库总提交接近上限时调大 `scripts/site-meta.ts` 里的常量并同步 README，避免早期季度被截断导致指纹变化。
- 季度总结（`src/data/quarter-summaries.json`）是一季一次的人工存档，构建期**只读不生成**；指纹变化只提醒人工复核，不要自动改写总结正文。
- 推送前确认工作区干净；本仓库已发布为 GitHub Pages，`main` 的历史重写需要 `git push --force-with-lease` 并事先做 `git bundle` 全量备份。
