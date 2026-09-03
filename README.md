# cmixed-homepage

个人主页，集成了技术博客与资源小窝。

在线访问：https://cmixed.github.io

## 技术栈

- **构建工具**：Vite 8 + Rolldown（Rust 驱动的打包器）
- **语言**：TypeScript 6
- **样式**：原生 CSS，支持深色/浅色主题
- **Markdown**：marked（自定义扩展，支持 `==高亮==` 语法）
- **图表**：Mermaid（构建时预渲染为 AVIF 图片）
- **图片处理**：sharp（PNG → AVIF 转换）
- **语法高亮**：highlight.js（按需构建，仅包含实际使用的语言）
- **测试**：Vitest
- **Lint**：ESLint + Prettier

## 主要特性

- 纯原生 JavaScript，无框架依赖，轻量高效
- 自定义 Markdown 博客引擎，支持目录、分页、RSS
- 自定义资源下载中心（nook）
- 图片 AVIF 优先策略，Mermaid 图表构建时预渲染
- 深色/浅色主题切换（localStorage 持久化）
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
npm install

# 启动开发服务器
npm run dev
```

## 构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录，包含主站、博客和资源小窝。

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 完整生产构建 |
| `npm run blog` | 仅构建博客 |
| `npm run nook` | 仅构建资源小窝 |
| `npm run lint` | ESLint 检查 |
| `npm run lint:fix` | ESLint 自动修复 |
| `npm run format` | Prettier 格式化 |
| `npm run format:check` | Prettier 格式检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run test` | 运行测试 |
| `npm run optimize-images` | PNG → AVIF 图片转换 |

## 部署

推送 `main` 分支后，GitHub Actions 自动执行 lint → typecheck → test → build → deploy 到 GitHub Pages。

## License

[MIT](LICENSE)
