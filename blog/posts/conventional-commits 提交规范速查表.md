---
title: Conventional Commits 提交规范速查表
date: 2026-08-16
tags: [Git, 提交规范, 开发工具]
description: 日常提交参考手册。整合官方规范、社区扩展类型与破坏性变更标记。

---

# 📋 Conventional Commits 提交规范速查表

---

## 一、提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

| 部分 | 必填 | 说明 |
|------|:----:|------|
| `type` | ✅ | 提交类型（见下方） |
| `scope` | ❌ | 影响范围，如 `api`、`ui`、`auth` |
| `subject` | ✅ | 简短描述，不超过 50 字符 |
| `body` | ❌ | 详细说明（换行分隔） |
| `footer` | ❌ | 关联 Issue、破坏性变更说明 |

---

## 二、提交类型总览

### 官方类型（conventionalcommits.org）

| 标签 | 含义 | SemVer | 典型场景 |
|:----:|------|:------:|----------|
| **feat** | 新功能 | `MINOR` | 新增页面、组件、API 接口、按钮功能 |
| **fix** | 修复 Bug | `PATCH` | 修复报错、逻辑错误、文案错误 |
| **docs** | 文档 | — | README、API 文档、代码注释更新 |
| **style** | 代码样式 | — | 空格、缩进、分号、换行等纯格式调整 |
| **refactor** | 重构 | — | 重写代码，不修复 bug 也不新增功能 |
| **perf** | 性能优化 | — | 提升加载速度、减少内存占用 |
| **test** | 测试 | — | 添加/修改单元测试、集成测试 |
| **build** | 构建 | — | webpack、vite、rollup、npm 配置 |
| **ci** | 持续集成 | — | GitHub Actions、Jenkins、流水线配置 |
| **chore** | 杂务 | — | 工具配置、.gitignore、非业务代码改动 |
| **revert** | 回滚 | — | 撤销之前的某次提交 |

> ⚠️ `style` **不是** UI 样式/CSS 修改，而是代码格式！

### 社区扩展类型

| 标签 | 含义 | 典型场景 |
|:----:|------|----------|
| **ops** | 运维 | 部署脚本、Docker、监控、K8s 配置 |
| **deps** | 依赖更新 | 升级/降级 npm/pip/cargo 包 |
| **design** | 设计调整 | UI 颜色、布局、间距、CSS 样式 |
| **i18n** | 国际化 | 多语言文案、翻译文件 |
| **a11y** | 无障碍 | aria 标签、键盘导航、屏幕阅读器 |
| **seo** | SEO 优化 | meta 标签、sitemap、结构化数据 |
| **security** | 安全修复 | 漏洞修复、CVE 补丁、加密升级 |
| **data** | 数据变更 | 数据库迁移、种子数据、JSON 配置 |
| **typo** | 错别字 | 文案、注释中的拼写错误 |
| **merge** | 合并分支 | 解决冲突后的合并提交 |
| **release** | 发布版本 | 打 tag、发布日志、版本号更新 |
| **init** | 初始化 | 项目脚手架、首次提交 |
| **wip** | 进行中 | 临时提交（**不推荐保留到主分支**） |

---

## 三、破坏性变更

| 标记 | 含义 | SemVer |
|:----:|------|:------:|
| `!` | 在 type/scope 后加感叹号 | `MAJOR` |
| `BREAKING CHANGE:` | footer 中说明破坏细节 | `MAJOR` |

```
feat(api)!: remove deprecated v1 endpoints

BREAKING CHANGE: v1 API 已废弃，请迁移至 v2。
迁移脚本见 scripts/migrate-v1-to-v2.sh
```

```
refactor(db)!: 将用户表从 MongoDB 迁移至 PostgreSQL

BREAKING CHANGE: 数据库架构完全重构，
部署前必须使用 scripts/migrate-db.sh 迁移数据。
```

---

## 四、快速决策表

### 不知道该用哪个类型？

| 你的改动是…… | 使用标签 |
|-------------|:--------:|
| 新增功能/页面/组件 | `feat` |
| 修复 bug/报错/错误文案 | `fix` |
| UI 样式调整（颜色、布局、间距） | `design` |
| 按钮/提示文案修正（有错字或表述不清） | `fix` |
| 按钮/提示文案调整（产品需求变更） | `feat` |
| 代码重构（无功能变化） | `refactor` |
| 提升性能（加载更快、内存更少） | `perf` |
| 添加/修改测试 | `test` |
| 代码格式化（Prettier/ESLint 自动修复） | `style` |
| README/注释/API 文档更新 | `docs` |
| 依赖包升级 | `deps` / `chore` |
| 构建工具配置（webpack/vite） | `build` |
| CI/CD 流水线调整 | `ci` |
| .gitignore / 工具配置 / 杂项 | `chore` |
| 数据库迁移/种子数据 | `data` |
| 多语言翻译文件 | `i18n` |
| 无障碍功能改进 | `a11y` |
| SEO 相关 | `seo` |
| 安全漏洞修复 | `security` |
| 部署脚本/Docker/K8s | `ops` |
| 撤销之前的提交 | `revert` |
| 合并分支（解决冲突） | `merge` |
| 版本发布/打 tag | `release` |

---

## 五、Scope 常用值

```
api      → 后端接口
ui       → 用户界面
auth     → 认证/授权
db       → 数据库
deps     → 依赖
ci       → 持续集成
build    → 构建
test     → 测试
core     → 核心模块
utils    → 工具函数
styles   → CSS/SCSS 样式
config   → 配置文件
i18n     → 国际化
seo      → SEO
```

> 💡 **建议**：团队约定一套固定 scope，保持提交信息一致。

---

## 六、完整示例

### 简单提交
```
feat(auth): add OAuth2 login support
```

```
fix(ui): resolve mobile menu not closing on click
```

```
docs(api): update authentication endpoint examples
```

```
style: format all files with Prettier 3.0
```

### 带 body 和 footer
```
feat(api): implement user profile endpoints

- Add GET /api/v1/users/me
- Add PATCH /api/v1/users/me
- Add request validation middleware

Closes #123
```

### 破坏性变更
```
feat(db)!: migrate from MongoDB to PostgreSQL

BREAKING CHANGE: all existing data must be migrated
using the provided script before deployment.

Refs: #456
```

### 多行 footer
```
fix(auth): resolve token refresh race condition

The refresh token was being reused before the new
access token was stored, causing 401 errors.

Fixes #789
Co-authored-by: Alice <alice@example.com>
```

---

## 七、书写规范

### ✅ 正确示范
```
feat(search): add fuzzy matching for product names
fix(checkout): prevent double submission on rapid clicks
refactor(utils): extract date formatting into shared helper
```

### ❌ 错误示范
```
update file              ← 无类型
fix bug                  ← 太笼统
feat: some changes       ← 描述不清
style: update button color  ← style 不是 UI 样式
```

### 书写原则
1. **祈使句** — 用 "Add" 而非 "Added" 或 "Adds"
2. **首字母小写**（type 除外）
3. **末尾不加句号**
4. **subject 不超过 50 字符**
5. **描述做了什么，而非怎么做**

---

## 八、SemVer 速查

| 提交类型 | SemVer 影响 |
|---------|:-----------:|
| `fix` | `PATCH` |
| `feat` | `MINOR` |
| `BREAKING CHANGE` / `!` | `MAJOR` |
| 其他类型 | 无影响 |

---

## 九、参考链接

| 资源 | 链接 |
|------|------|
| 📎 官方规范（中文） | [conventionalcommits.org/zh-hans](https://www.conventionalcommits.org/zh-hans/v1.0.0/) |
| 📎 官方规范（英文） | [conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/) |
| 📎 Angular 提交规范 | [github.com/angular/angular/blob/main/CONTRIBUTING.md](https://github.com/angular/angular/blob/main/CONTRIBUTING.md) |
| 📎 commitlint 配置 | [github.com/conventional-changelog/commitlint](https://github.com/conventional-changelog/commitlint) |

---

> 📌 **提示**：团队可自定义类型和 scope，关键是**保持一致性**。建议将此文档纳入项目 `CONTRIBUTING.md`。
