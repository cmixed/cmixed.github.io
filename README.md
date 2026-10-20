# cmixed-homepage

个人主页，集成了技术博客与资源小窝 —— 纯静态、零框架，构建产物直接部署到 GitHub Pages。

在线访问：https://cmixed.github.io

| 页面 | 内容 |
| --- | --- |
| 主页 `/` | 项目、技能、博客 / 资源预览、联系方式 |
| 博客 `/blog/` | Markdown 文章、目录、代码高亮、Mermaid、标签筛选、实时搜索、RSS |
| 资源小窝 `/nook/` | `code` / `doc` / `tool` / `website` 四类资源的下载或外链，详情页支持 Markdown 正文 |
| 404 | 主站、博客、资源各一套，与正文共用同一套导航与材质 |

## 技术栈

- **工具链 / 命令**：Vite+（`vp` CLI，统一 Vite 8 / Rolldown / Oxlint / Oxfmt / Vitest）；全站命令以 `vp` 为准
- **包管理器**：pnpm 12（`vp install` 在底层调用；`packageManager: pnpm@12.3.4`）
- **运行时**：Node ≥ 22.18（CI 使用 24）
- **语言**：TypeScript 6；前端零框架，无运行时依赖
- **样式**：原生 CSS，深色 / 浅色双主题，无预处理器
- **Markdown**：marked（自定义扩展，支持 `==高亮==` 语法）
- **图表**：Mermaid（构建时预渲染为 AVIF 图片）
- **图片处理**：sharp（PNG → AVIF 转换）
- **语法高亮**：highlight.js（按需构建，仅包含实际使用的语言）
- **测试**：Vitest（由 Vite+ 提供）
- **Lint / 格式化**：Oxlint + Oxfmt（由 Vite+ 提供）

## 主要特性

- 前端零框架：原生 DOM API + Canvas 实现全部交互，无运行时依赖，产物只有 HTML / CSS / 少量 JS
- 自定义 Markdown 博客引擎：目录（长文自动折叠）、代码高亮、Mermaid、阅读时长与字数统计、置顶、上一篇 / 下一篇、RSS、标签筛选
- 自定义资源下载中心（nook）：分类 + 置顶、文件下载或外链访问、详情页 Markdown 正文
- 博客与资源列表支持实时搜索（标题 / 摘要 / 标签 / 分类，可与标签、分类筛选叠加）；索引在构建时写进列表项的 `data-search`，纯前端、无后端
- 图片 AVIF 优先：构建脚本把文章图片转成 AVIF；Mermaid 图表在构建时预渲染，运行时零渲染开销
- 深色 / 浅色主题切换（localStorage 持久化；首次访问按系统 `prefers-color-scheme` 初始化）
- 全站导航栏统一：主页、博客列表 / 文章、资源列表 / 详情、三套 404 页共用同一套 58px 高的 sticky 导航（同一材质层、同一内边距断点）；移动端抽屉关闭时不产生横向溢出，极窄屏（≤360px）自动让位
- 可访问性与动效降级：语义化标签与 aria 标注（主题开关 / 搜索 / 搜索清除 / 菜单都有可读名称）、键盘可达；动效统一完整播放（不再提供站内「降级动效」开关），仅在系统开启 `prefers-reduced-motion` 时降级 —— 漂移、掠光、指针特效层全部停掉（`src/client/cursor.ts` 直接不启动）；系统开启 `prefers-reduced-transparency` 时则整体退回不透明表面并隐藏全部光效层
- 完整 SEO：OpenGraph、JSON-LD 结构化数据、各区块 Sitemap 与 RSS
- GitHub Actions 自动执行 `vp check` + `vp test`、`vp run build` 并部署到 GitHub Pages

## 设计说明

全站共用 `src/style.css` 里的一套 token 与材质；页面级内联样式只负责布局，颜色与材质都从 token 取。下面这些决定大多带「为什么」，改动前值得先读一遍。

### Mica Alt 材质

每个主题只由**两个主题色**构成 —— 底色 + 面板色（导航/抽屉「标题栏层」+ 卡片「正文层」+ 按钮与卡片内小标签「抬升层」）。两色**故意不同、不相似**：底色更绿（hue≈160）、面板更青（hue≈195），色相差 ≈35°、不透明面板 token 的亮度比 ≈1.20:1（面板压到半透明后，屏上实测「卡片 vs 紧邻底色」的局部 L\* 比约 1.05~1.17、「导航 vs 底色」约 1.04~1.10；层次主要由色相差 + 受光边 + 投影承担，不是靠亮度差），所以既有拼色的层次感、又不会像旧版「冷蓝底 + 橄榄面板」那样色相对撞；浅色用同一条公式的高曝光档，因此两套主题是"同一关系的两个曝光"。四个主题色：暗色 `#0c1714` / `#1c2a30`，浅色 `#d0e2db` / `#f2f8f9`（面板封顶 L\*96，**不用纯白**）。文字三档取「底色与面板之间」的色相（≈180°）、只差明度，所以与底色和面板都同族却不同亮；另有细颗粒（`mix-blend-mode: overlay`，把 50% 灰压在面板上不改变亮度，只留纹理 —— 之前用普通 alpha 叠加，平均把面板提亮三级、还带一层斑点，就是"脏"的来源）；每个面板的「面」再叠 1px 受光亮边 + 1px 底边反光 + 左上镜面光池 + 内侧玻璃厚边 + 贴地阴影（`--mica-panel-*` / `--mica-elev-*`），材质感因此来自"受光"而不是单纯调透明度。**顶边那道光是单独一层 token（`--mica-panel-rim`）**：暗色下它让 1px 边框比面板亮 14~16 L\*，边框本身就是光；浅色面板已经到 L\*96，纯白最多只再给 +7 L\*，所以浅色把顶边框换成白色、在它下面压 1px 冷调暗线（`--mica-panel-bevel`）、再叠一条 16px 的白色柔光带（`--mica-panel-top`）—— 靠"亮边 + 暗线 + 衰减"三件事立住，单加白没有用。卡片不透明度刻意压到 **0.80（暗）/ 0.78（浅）**：浅色面板本来就接近白，只有让底色的绿透上来才会从"一张白卡"变成"一层薄荷玻璃膜"（代价是分层变弱，用面板色提亮到 `#f2f8f9` 补回）。页级背景为满屏薄纱 + 同色相洗色 + 一个中性色团 + 顶部受光 + 四周暗角 + 抖动噪点（消除暗色渐变的 8bit 色带）+ 柔边点阵（视口锚定、向下渐隐，页脚不顶网格）；隐藏原生滚动条以使 sticky 导航栏铺满窗口。**面板底色的单一来源**：所有面板的底色 + 上面那 6 层受光图都由 `src/style.css` 末尾的共享规则给出，页面级内联样式只覆盖布局，改底色必须用 `background-color` —— 用 `background:` 简写会把 `background-image` 一起重置成 `none`，卡片立刻从「玻璃板」退回「色纸」（博客 / 小窝的列表卡片之前就是这么和主页不统一的）。静态部分零每帧开销。

### 动态光源

三层，全部只动 `transform` / `opacity`，实测零重绘零重排：`body::after` 一层光斑做 75 秒级的缓慢漂移 + 随滚动的纵向位移（`animation-timeline: scroll()`，静止时完全不产生帧），`html::before` 按本地时间叠加一档时段柔光（`data-daylight`，只在加载时设一次，四个时段都落在青线上），导航玻璃在「切主题 / 开合抽屉」时扫过一道掠光（`nav::after`，层只有导航高，不引起重新模糊）。

曾有一层 24 秒掠过内容区的扫光层：它的光斑在屏幕中央扫过时观感突兀、反复调形也没能变好看，已整体移除；"每一刻都在变"现在只由 75 秒的漂移层承担。

hero 自己的光晕（`.hero::before`，6 秒呼吸）现在**显式居中在内容正后方**（`left/top: 50%` 与 keyframes 里的 `translate(-50%,-50%)` 配对）。此前它只写了 translate，又叠加了 flex 给绝对定位子元素的「静态位置」居中（各浏览器对该静态位置的处理并不一致），等于被居中两次，圆心被推出半个身位贴到 hero 左上角，整块光晕溢出盒子、被 `overflow: hidden` 在盒边硬裁一刀 —— 暗色下 hero 左边缘于是出现一道竖直断口，看起来像一块「矩形阴影」，并随 6 秒呼吸在 1~5 级之间明暗起伏（这就是截图里圈出来的那道边）。hero 现在不再裁切内容（`overflow: visible`）：光晕只靠自身 `radial-gradient` 衰减，越过 hero 上下边的那点余光正好落进相邻区块与导航玻璃后面，没有任何硬边。

### 通透感的边界

玻璃（`backdrop-filter` + `saturate`）**常驻**给导航栏与移动端抽屉 —— 它们底下真有内容在动，"背景的颜色被吸上来"才看得见，且漂移层让开了导航高度，重建模糊只发生在滚动时；卡片只在**指针下的那一张**开真玻璃（`@media (hover: hover) and (pointer: fine)` + `:hover`，见 `src/style.css` 末尾），因为漂移层一直在卡片背后动、常驻会让每张卡每帧重模糊（屏上 6~9 张卡 ≈ 8~12 条导航的采样面积，且是持续的）。悬停时面板同步降到 `--mica-surface-glass`（0.62 / 0.58），否则 0.8 的膜会把模糊挡住九成、等于白做；指针一离开就归零，静止时全站依旧零每帧开销。

### 指针特效层

`src/client/cursor.ts`（构建成 `dist/cursor.js`），全站共用一份：折线尾迹（相邻采样点连直线、越新越粗越亮，280ms 淡出）+ 点击波纹（全站）+ 光标光晕（220px，80ms 缓动跟随）+ 卡片追光（把指针位置写进卡片的 `--mx/--my`，配合 `@property --glare` 做淡进淡出）。性能约定：单 canvas + 单 `requestAnimationFrame`，每帧只清"上一帧画过的包围盒"，指针静止后循环自停（实测静止 2 秒 `clearRect` 调用为 0 次）；触屏只保留点击波纹；`prefers-reduced-motion` 下整个文件不启动。

### 主题切换：圆形揭示

用 View Transition 的圆形揭示：从主题开关所在位置把新主题"铺"满整页（半径按到最远角落算，460ms），比一条掠光更直觉（光是从你按下的地方来的）；揭示期间临时挂 `html.vt` 掐掉全站颜色过渡，否则新快照会抓到过渡起点（旧颜色）、揭示出来什么都没变。不支持 `startViewTransition` 的浏览器自动回落到导航掠光（掠光带取"另一个模式"的对照色：浅色页面上用深色带 —— 旧版用白带压在近白导航上等于没有，这正是"浅色看不出通透"的一部分）。

### 色彩：前景色与填充色分离

`--primary-text` 专供文字 / 图标（暗色亮青 `#5fd8c0`、浅色深青 `#0d6a62`），`--primary` 只作填充与描边 —— 且填充值两个主题**共用** `#0f766e`（白字 5.47:1），切主题时强调色不变形；卡片内的小标签统一走 `--mica-chip`（填色比卡片明显一档 + accent 描边）。

**小标签只有一套设计语言，两个角色**：尺寸由 `--chip-radius` / `--chip-pad-*` / `--chip-font` 统一，材质共用 `--mica-chip`。只读标签（卡片标签、项目状态、技能、分类、文章标签、代码语言角标）是 **4px 方角**、不可点；列表页的筛选控件（`.blog-tag` / `.nook-filter`）是 **胶囊**，有 hover 与实心选中态（`--primary` + 白字）。形状与状态就是语义分界 —— 但尺寸、字体、配色完全同源，所以两类放在一起仍像一家人。触屏下筛选标签只把 `min-height` 撑到 44px，不放大视觉尺寸。

## 项目结构

```
├── src/
│   ├── main.ts          # 主站交互：主题接线、导航、搜索、项目与技能渲染
│   ├── client/          # 全站共用的经典脚本（TS）：theme / cursor / search
│   ├── style.css        # 全站样式与 Mica Alt 材质（token 的唯一来源）
│   ├── data/            # projects.json / skills.json
│   └── lib/             # 构建工具：front-matter 解析、日期与 git 时间
├── blog/
│   ├── post/            # Markdown 文章（可在同目录放 asset/ 图片）
│   ├── template/        # 文章页、404 模板
│   ├── build.ts         # 生成列表、文章页、RSS、sitemap 与供主页用的 data.json
│   └── build-hljs.ts    # 按实际用到的语言裁剪 highlight.js
├── nook/
│   ├── file/            # 资源：<category>/<slug>/index.md（+ 附带文件）
│   ├── template/        # 详情页模板
│   └── build.ts
├── public/              # 原样拷到站点根 —— 这里的目录结构就是 URL 结构
│   ├── 404.html         #   /404.html（GitHub Pages 只认这个路径，挪走就没有自定义 404）
│   ├── robots.txt       #   /robots.txt（爬虫只读根目录）
│   ├── sitemap.xml      #   /sitemap.xml（由 robots.txt 声明）
│   └── assets/          #   站内引用的图：og-image.png / icons/ / 签名 / 头像
├── scripts/             # optimize-images.ts（PNG → AVIF）、client-scripts.ts（客户端脚本编译）、og-image.ts（分享卡）
├── docs/                # 迁移计划与报告
├── index.html           # 主站入口
└── vite.config.ts       # 多页构建与 HTML 入口
```

`public/` 不是素材仓库，它的目录结构就是站点 URL 结构。所以只把**路径被约定死的**文件留在根目录（`404.html` 是 GitHub Pages 的约定，`robots.txt` / `sitemap.xml` 是爬虫的约定），其余按用途收进 `assets/`：换目录就等于换 URL，而约定路径一挪就失效。

## 本地运行

环境要求：Node ≥ 22.18，以及全局安装的 Vite+（提供 `vp`，安装方式见 [viteplus.dev](https://viteplus.dev/guide/)）。`vp` 只是启动器，真正的工具链来自项目内锁定的 `vite-plus`，所以连装依赖也交给它，不需要单独记 pnpm 的命令：

```bash
# 安装依赖（内部调用 pnpm，尊重 pnpm-lock.yaml）
# prepare 会顺便把 git 钩子接上，不用再手动做一步
vp install

# 启动开发服务器
vp dev
```

`prepare` 脚本（`vp hooks enable --hooks-dir .husky`）在每次安装依赖后自动执行，所以新克隆只需装依赖、钩子就用上了。它做两件事：在 `.husky/_` 生成 git 钩子分发器（该目录自我忽略，不进仓库），并把 `core.hooksPath` 指向它（写在本地 `.git/config`，不随仓库分发）。

钩子由 `.husky/pre-commit` 定义，分发器会先把 `node_modules/.bin` 加进 `PATH`，所以它用的是项目内锁定的 `vp`，即使没装全局 Vite+ 也能跑。需要临时跳过用 `git commit --no-verify`；如果安装时用了 `--ignore-scripts`，手动补一次 `vp hooks enable --hooks-dir .husky` 即可。

## 构建

```bash
vp run build
```

构建顺序：图片优化（PNG → AVIF）→ Vite 主站（含 `src/client/*.ts` → `dist/*.js`）→ highlight.js 裁剪 → 博客 → 资源小窝。产物输出到 `dist/`（主站 `index.html`、`blog/`、`nook/`、`assets/`），可直接静态托管。

## 内容维护

### 博客

文章放在 `blog/post/`，文件名或目录名就是 URL（中文会做 URL 编码，例如 `C++ API设计.md` → `/blog/C++ API设计.html`）；带图片时用目录形式 `blog/post/<slug>/<slug>.md` + `asset/`。

front-matter 写在文件开头：

```markdown
---
title: 文章标题
date: 2026-10-20
tags: [标签1, 标签2]
description: 列表页与搜索用的摘要
pinned: false
---
```

- 正文支持 `==高亮==`、表格、代码块、Mermaid（`mermaid` 代码块）
- 图片放 `asset/`；`vp run optimize-images` 会把 `blog/post/**/*.png` 转成同名 `.avif`，正文引用 `.avif` 即可
- 构建自动产出：列表页、文章页、上一篇 / 下一篇、`feed.xml`、`sitemap.xml`，以及主页预览用的 `data.json`

### 资源小窝

资源放在 `nook/file/<category>/<slug>/index.md`，`category` 取 `code` / `doc` / `tool` / `website` 之一；`nook/file/_template/index.md` 是可复制的模板。

```markdown
---
title: 资源名称
category: tool
description: 一句话描述
file: example.zip       # 下载类资源；外链类改用 url
pin: false
tags: [标签1, 标签2]
---

这里是资源的详细说明，支持 Markdown 正文。
```

`file` 与 `url` 二选一；文件大小在构建时自动读取并显示。

## 可用命令

**唯一入口是 `vp`。** 自带命令（`dev` / `check` / `test` / `fmt`…）直接 `vp <命令>`；需要多步串联的流程用 `vp run <script>`（可简写为 `vpr <script>`），跑的就是 `package.json` 里的同名脚本。

| 命令 | 说明 |
|------|------|
| `vp install` | 安装依赖（内部调用 pnpm，尊重 `pnpm-lock.yaml`） |
| `vp dev` | 启动开发服务器 |
| `vp run build` | 完整构建：图片优化 + 主站 + 博客 + 资源小窝 |
| `vp preview` | 预览构建产物 |
| `vp run blog` | 仅构建博客（含 highlight.js 裁剪） |
| `vp run nook` | 仅构建资源小窝 |
| `vp check` | 格式 + Lint + 类型检查 |
| `vp check --fix` | 自动修复格式与 lint 问题 |
| `vp lint` | Oxlint 检查（`vp lint --fix` 自动修复） |
| `vp fmt` | Oxfmt 格式化（`vp fmt --check` 只检查不写入） |
| `vp run typecheck` | TypeScript 类型检查（`typecheck:watch` 监听） |
| `vp test` | 运行测试（`vp test watch` 监听模式） |
| `vp run optimize-images` | PNG → AVIF 图片转换 |
| `vp run og-image` | 重新生成分享卡 `public/assets/og-image.png` |

> **`vp build` 只跑 Vite。** 博客页、小窝页、highlight.js 裁剪是 `package.json` 里 `build` 脚本的后继步骤，所以整站构建必须用 **`vp run build`**；直接敲 `vp build` 会得到一个没有文章页和小窝页的 `dist/`。

## 工程约定

- **源码一律用 TypeScript。** `src/`、`blog/build.ts`、`nook/build.ts`、`scripts/` 都在 `vp check` 的类型检查范围内；`blog/vendor/highlight.min.js` 是 `build-hljs.ts` 的产物，属于唯一例外。
- **三个全站脚本仍是「固定文件名的经典脚本」。** `src/client/` 下的 `theme` / `cursor` / `search` 不进 Vite 的打包图：进了会被加 hash、变成 module，而主题脚本必须在 `<head>` 里同步跑完（否则首帧闪）。所以由 `scripts/client-scripts.ts` 用 esbuild 单独编译成 `dist/<name>.js` —— `vp build` 作为 asset 写出，`vp dev` 用中间件现编译现发，HTML 里的 `./theme.js` 这类引用因此保持稳定。
- **材质与尺寸只有 `src/style.css` 一个来源**，页面内联样式只留布局（定位、间距、网格）。

## 兼容性

- 目标浏览器：近两年的 Chrome / Edge / Firefox / Safari（桌面与移动端）
- 渐进增强：不支持 `startViewTransition` 时用导航掠光代替圆形揭示；不支持 `backdrop-filter` 时退回近似不透明面板
- 系统偏好：`prefers-reduced-motion` 停掉漂移 / 掠光 / 指针特效；`prefers-reduced-transparency` 退回不透明表面并隐藏光效层

## 部署

推送 `main` 分支后，GitHub Actions 使用 [`setup-vp`](https://github.com/voidzero-dev/setup-vp) 自动执行：

1. **check**：`vp check` → `vp test`
2. **build**：`vp run build`（图片优化 + 主站 + 博客 + 资源小窝）
3. **deploy**：部署到 GitHub Pages

## License

[MIT](LICENSE)
