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
- 全站导航栏统一：主页、博客列表 / 文章、资源列表 / 详情、三套 404 页共用同一套 58px 高的 sticky 导航（同一材质层、同一内边距断点）；移动端抽屉关闭时不产生横向溢出，极窄屏（≤360px）自动让位
- Mica Alt 风格材质：每个主题只由**两个主题色**构成 —— 底色 + 面板色（导航/抽屉「标题栏层」+ 卡片「正文层」+ 按钮与卡片内小标签「抬升层」）。底色与面板同属一条色相线、只差一档明度，混色后稳定在 **1.20:1**，面板因此是干净地「浮」在底色上，而不是靠换色相分层；另有细颗粒。页级背景为满屏暖纱 + 同色相洗色 + 一个中性色团 + 顶部受光 + 四周暗角 + 抖动噪点（消除暗色渐变的 8bit 色带）+ 可见点阵；暗色是「橙的低曝光」（褐，底色 `#140f0b` / 面板 `#2e2219`），浅色是「橙的高曝光」（底色 `#e5d9cb` / 面板 `#f7efe6`，面板封顶 L\*95，**不用纯白**）；隐藏原生滚动条以使 sticky 导航栏铺满窗口。静态部分零每帧开销
- 动态光源（三层，全部只动 `transform` / `opacity`，实测零重绘零重排）：`body::after` 一层光斑做 75 秒级的缓慢漂移 + 随滚动的纵向位移（`animation-timeline: scroll()`，静止时完全不产生帧），`html::before` 按本地时间叠加一档时段柔光（`data-daylight`，只在加载时设一次），导航玻璃在「切主题 / 开合抽屉」时扫过一道掠光（`nav::after`，层只有导航高，不引起重新模糊）。漂移层刻意排在抖动层之下、并让出导航高度，兼顾色带与导航模糊成本
- 前景色与填充色分离：`--primary-text` 专供文字 / 图标（暗色亮橙 `#e8b06a`、浅色深橙褐 `#8a4312`），`--primary` 只作填充与描边 —— 且填充值两个主题**共用** `#a8541a`（白字 5.32:1），切主题时强调色的形制不变、只换曝光；卡片内的小标签统一走 `--mica-chip`（填色比卡片明显一档 + accent 描边）
- 动效统一完整播放（不再提供站内「降级动效」开关），仅在系统开启 `prefers-reduced-motion` 时由 CSS 降级；系统开启 `prefers-reduced-transparency` 时则整体退回不透明表面并隐藏全部光效层
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
