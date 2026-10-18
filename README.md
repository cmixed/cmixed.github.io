# cmixed-homepage

个人主页，集成了技术博客与资源小窝。

在线访问：https://cmixed.github.io

## 技术栈

- **工具链**：Vite+（`vp` CLI，统一 Vite 8 / Rolldown / Oxlint / Oxfmt / Vitest）
- **构建**：Vite 8 + Rolldown（Rust 驱动的打包器）
- **包管理器**：pnpm 12
- **语言**：TypeScript 6
- **样式**：原生 CSS，支持深色/浅色主题
- **Markdown**：marked（自定义扩展，支持 `==高亮==` 语法）
- **图表**：Mermaid（构建时预渲染为 AVIF 图片）
- **图片处理**：sharp（PNG → AVIF 转换）
- **语法高亮**：highlight.js（按需构建，仅包含实际使用的语言）
- **测试**：Vitest（由 Vite+ 提供）
- **Lint / 格式化**：Oxlint + Oxfmt（由 Vite+ 提供）

## 主要特性

- 纯原生 JavaScript，无框架依赖，轻量高效
- 自定义 Markdown 博客引擎，支持目录、分页、RSS
- 自定义资源下载中心（nook）
- 博客与资源列表支持实时搜索（标题 / 摘要 / 标签 / 分类，可与标签、分类筛选叠加）
- 图片 AVIF 优先策略，Mermaid 图表构建时预渲染
- 深色/浅色主题切换（localStorage 持久化）
- Mica Alt 风格材质：accent 着色的两层结构（导航/抽屉「标题栏层」+ 卡片正文层）+ 细颗粒，静态实现、无新增动画与请求
- 完整 SEO 支持：OpenGraph、JSON-LD 结构化数据、Sitemap、RSS
- GitHub Actions 自动构建部署

## 项目结构

```
├── src/            # 主站源码（TypeScript + CSS）
├── blog/           # 博客引擎与文章
│   ├── post/       # Markdown 文章
│   └── build.ts    # 博客构建脚本
├── nook/           # 资源小窝
│   ├── file/       # 资源文件
│   └── build.ts    # 资源构建脚本
├── public/         # 静态资源
├── scripts/        # 构建辅助脚本
└── docs/           # 项目文档
```

## 本地运行

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

## 构建

```bash
pnpm build
```

构建产物输出到 `dist/` 目录，包含主站、博客和资源小窝。

## 可用命令

Vite+ 提供 `vp` CLI。全局安装后可直接运行 `vp dev`、`vp check`；未全局安装时用 `pnpm exec vp ...` 调用。项目脚本封装了常用流程：

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器（`vp dev`） |
| `pnpm build` | 完整构建：图片优化 + 主站 + 博客 + 资源小窝 |
| `pnpm blog` | 仅构建博客 |
| `pnpm nook` | 仅构建资源小窝 |
| `pnpm check` | 格式 + Lint + 类型检查（`vp check`） |
| `pnpm check:fix` | 自动修复格式与 lint 问题 |
| `pnpm lint` | Oxlint 检查 |
| `pnpm format` | Oxfmt 格式化 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | 运行测试（`vp test run`） |
| `pnpm optimize-images` | PNG → AVIF 图片转换 |

## 部署

推送 `main` 分支后，GitHub Actions 使用 [`setup-vp`](https://github.com/voidzero-dev/setup-vp) 自动执行：

1. **check**：`vp check` → `vp test`
2. **build**：`vp run build`（图片优化 + 主站 + 博客 + 资源小窝）
3. **deploy**：部署到 GitHub Pages

## License

[MIT](LICENSE)
