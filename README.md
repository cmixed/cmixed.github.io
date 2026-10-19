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
- Mica Alt 风格材质：每个主题只由**两个主题色**构成 —— 底色 + 面板色（导航/抽屉「标题栏层」+ 卡片「正文层」+ 按钮与卡片内小标签「抬升层」）。两色**故意不同、不相似**：底色更绿（hue≈160）、面板更青（hue≈195），色相差 ≈35°、不透明面板 token 的亮度比 ≈1.20:1（面板压到半透明后，屏上实测「卡片 vs 紧邻底色」的局部 L\* 比约 1.05~1.17、「导航 vs 底色」约 1.04~1.10；层次主要由色相差 + 受光边 + 投影承担，不是靠亮度差），所以既有拼色的层次感、又不会像旧版「冷蓝底 + 橄榄面板」那样色相对撞；浅色用同一条公式的高曝光档，因此两套主题是"同一关系的两个曝光"。四个主题色：暗色 `#0c1714` / `#1c2a30`，浅色 `#d0e2db` / `#f2f8f9`（面板封顶 L\*96，**不用纯白**）。文字三档取「底色与面板之间」的色相（≈180°）、只差明度，所以与底色和面板都同族却不同亮；另有细颗粒（`mix-blend-mode: overlay`，把 50% 灰压在面板上不改变亮度，只留纹理 —— 之前用普通 alpha 叠加，平均把面板提亮三级、还带一层斑点，就是"脏"的来源）；每个面板的「面」再叠 1px 受光亮边 + 1px 底边反光 + 左上镜面光池 + 内侧玻璃厚边 + 贴地阴影（`--mica-panel-*` / `--mica-elev-*`），材质感因此来自"受光"而不是单纯调透明度。卡片不透明度刻意压到 **0.80（暗）/ 0.78（浅）**：浅色面板本来就接近白，只有让底色的绿透上来才会从"一张白卡"变成"一层薄荷玻璃膜"（代价是分层变弱，用面板色提亮到 `#f2f8f9` 补回）。页级背景为满屏薄纱 + 同色相洗色 + 一个中性色团 + 顶部受光 + 四周暗角 + 抖动噪点（消除暗色渐变的 8bit 色带）+ 柔边点阵（视口锚定、向下渐隐，页脚不顶网格）；隐藏原生滚动条以使 sticky 导航栏铺满窗口。静态部分零每帧开销
- 动态光源（三层，全部只动 `transform` / `opacity`，实测零重绘零重排）：`body::after` 一层光斑做 75 秒级的缓慢漂移 + 随滚动的纵向位移（`animation-timeline: scroll()`，静止时完全不产生帧），`html::before` 按本地时间叠加一档时段柔光（`data-daylight`，只在加载时设一次，四个时段都落在青线上），导航玻璃在「切主题 / 开合抽屉」时扫过一道掠光（`nav::after`，层只有导航高，不引起重新模糊）（曾有一层 24 秒掠过内容区的扫光层：它的光斑在屏幕中央扫过时观感突兀、反复调形也没能变好看，已整体移除；"每一刻都在变"现在只由 75 秒的漂移层承担）；hero 自己的静态光晕（`.hero::before`，6 秒呼吸）圆心被 keyframes 里的 `translate(-50%,-50%)` 推到 hero 左上方、整块光晕溢出了 hero 盒，原先的 `overflow: hidden` 把它在盒边硬裁掉，于是暗色下 hero 左边缘出现一道竖直断口（看起来像一块「矩形阴影」，且随 6 秒呼吸在 1~5 级之间明暗起伏）；现改为 `overflow: clip` + `overflow-clip-margin: 200px`，光晕在盒外继续柔和衰减，断口消失（不用支持 `overflow-clip-margin` 的旧浏览器仍退回按盒裁切）
- 通透感的边界：玻璃（`backdrop-filter` + `saturate`）**常驻**给导航栏与移动端抽屉 —— 它们底下真有内容在动，"背景的颜色被吸上来"才看得见，且漂移层让开了导航高度，重建模糊只发生在滚动时；卡片只在**指针下的那一张**开真玻璃（`@media (hover: hover) and (pointer: fine)` + `:hover`，见 `src/style.css` 末尾），因为漂移层一直在卡片背后动、常驻会让每张卡每帧重模糊（屏上 6~9 张卡 ≈ 8~12 条导航的采样面积，且是持续的）。悬停时面板同步降到 `--mica-surface-glass`（0.62 / 0.58），否则 0.8 的膜会把模糊挡住九成、等于白做；指针一离开就归零，静止时全站依旧零每帧开销
- 指针特效层（`public/cursor.js`，全站共用一份）：折线尾迹（相邻采样点连直线、越新越粗越亮，200ms 淡出）+ 点击波纹（全站）+ 光标光晕（220px，80ms 缓动跟随）+ 卡片追光（把指针位置写进卡片的 `--mx/--my`，配合 `@property --glare` 做淡进淡出）。性能约定：单 canvas + 单 `requestAnimationFrame`，每帧只清"上一帧画过的包围盒"，指针静止后循环自停（实测静止 2 秒 `clearRect` 调用为 0 次）；触屏只保留点击波纹；`prefers-reduced-motion` 下整个文件不启动
- 主题切换用 View Transition 的圆形揭示：从主题开关所在位置把新主题"铺"满整页（半径按到最远角落算，460ms），比一条掠光更直觉（光是从你按下的地方来的）；揭示期间临时挂 `html.vt` 掐掉全站颜色过渡，否则新快照会抓到过渡起点（旧颜色）、揭示出来什么都没变。不支持 `startViewTransition` 的浏览器自动回落到导航掠光（掠光带取"另一个模式"的对照色：浅色页面上用深色带 —— 旧版用白带压在近白导航上等于没有，这正是"浅色看不出通透"的一部分）
- 前景色与填充色分离：`--primary-text` 专供文字 / 图标（暗色亮青 `#5fd8c0`、浅色深青 `#0d6a62`），`--primary` 只作填充与描边 —— 且填充值两个主题**共用** `#0f766e`（白字 5.47:1），切主题时强调色不变形；卡片内的小标签统一走 `--mica-chip`（填色比卡片明显一档 + accent 描边）
- 动效统一完整播放（不再提供站内「降级动效」开关），仅在系统开启 `prefers-reduced-motion` 时降级 —— 漂移、掠光、指针特效层全部停掉（`public/cursor.js` 直接不启动）；系统开启 `prefers-reduced-transparency` 时则整体退回不透明表面并隐藏全部光效层
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
