# cmixed-homepage

个人主页，集成了技术博客与资源小窝 —— 纯静态、零框架，构建产物直接部署到 GitHub Pages。

在线访问：https://cmixed.github.io

| 页面 | 内容 |
| --- | --- |
| 主页 `/` | 关于（含技能）、项目、博客 / 资源预览、联系方式 |
| 博客 `/blog/` | Markdown 文章、目录、代码高亮、Mermaid、标签筛选、实时搜索、RSS |
| 资源小窝 `/nook/` | `code` / `doc` / `tool` / `website` 四类资源的下载或外链，详情页支持 Markdown 正文 |
| 404 | 主站、博客、资源各一套，与正文共用同一套导航与材质 |

## 技术栈

- **工具链 / 命令**：Vite+（`vp` CLI，统一 Vite 8 / Rolldown / Oxlint / Oxfmt / Vitest）；全站命令以 `vp` 为准
- **包管理器**：pnpm 12（`vp install` 在底层调用；`packageManager: pnpm@12.14.0`）
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
- 全站导航栏统一：主页、博客列表 / 文章、资源列表 / 详情、三套 404 页共用同一套 58px 高的 sticky 导航（同一材质层、同一内边距断点）；二级导航里博客统一叫「个人博客」，和首页入口同名；移动端抽屉关闭时不产生横向溢出，极窄屏（≤360px）自动让位
- 可访问性与动效降级：语义化标签与 aria 标注（主题开关 / 搜索 / 搜索清除 / 菜单都有可读名称）、键盘可达；动效统一完整播放（不再提供站内「降级动效」开关），仅在系统开启 `prefers-reduced-motion` 时降级 —— 漂移、掠光、指针特效层全部停掉（`src/client/cursor.ts` 直接不启动），hero 打字机也不再逐字循环、直接显示首句（CSS 管不到 JS 定时器，`main.ts` 里单独短路）；系统开启 `prefers-reduced-transparency` 时则整体退回不透明表面并隐藏全部光效层
- 完整 SEO：OpenGraph、JSON-LD 结构化数据、各区块 Sitemap 与 RSS
- 页脚带两个悬浮框：**关于本站**（渲染 `README.md`）与**更新日志**（渲染 git 提交记录），内容在构建期定型、用原生 `<dialog>`，材质与卡片完全同源
- 右下角浮动操作（回上级 / 回到顶部 / 直达底部）与滚动条全站一套：前者由 `src/client/fab.ts` 在主页、博客、资源小窝注入，图标是内联 SVG；后者按深浅主题换色，整页是一条不占布局的浮层条（`src/client/scrollbar.ts`），弹窗正文 / 代码块 / 表格是同形制的系统 thin 条，都不再出现系统灰条或轨道槽
- GitHub Actions 自动执行 `vp check` + `vp test`、`vp run build` 并部署到 GitHub Pages

## 设计说明

全站共用 `src/style.css` 里的一套 token 与材质；页面级内联样式只负责布局，颜色与材质都从 token 取。下面这些决定大多带「为什么」，改动前值得先读一遍。

### Mica Alt 材质

每个主题只由**两个主题色**构成 —— 底色 + 面板色（导航/抽屉「标题栏层」+ 卡片「正文层」+ 按钮与卡片内小标签「抬升层」）。两色**故意不同、不相似**：底色更绿（hue≈160）、面板更青（hue≈195），色相差 ≈35°、不透明面板 token 的亮度比 ≈1.20:1（面板压到半透明后，屏上实测「卡片 vs 紧邻底色」的局部 L\* 比约 1.05~1.17、「导航 vs 底色」约 1.04~1.10；层次主要由色相差 + 受光边 + 投影承担，不是靠亮度差），所以既有拼色的层次感、又不会像旧版「冷蓝底 + 橄榄面板」那样色相对撞；浅色用同一条公式的高曝光档，因此两套主题是"同一关系的两个曝光"。四个主题色：暗色 `#0c1714` / `#1c2a30`，浅色 `#d0e2db` / `#f2f8f9`（面板封顶 L\*96，**不用纯白**）。文字三档取「底色与面板之间」的色相（≈180°）、只差明度，所以与底色和面板都同族却不同亮；另有细颗粒（`mix-blend-mode: overlay`，把 50% 灰压在面板上不改变亮度，只留纹理 —— 之前用普通 alpha 叠加，平均把面板提亮三级、还带一层斑点，就是"脏"的来源）；每个面板的「面」再叠 1px 受光亮边 + 1px 底边反光 + 左上镜面光池 + 内侧玻璃厚边 + 贴地阴影（`--mica-panel-*` / `--mica-elev-*`），材质感因此来自"受光"而不是单纯调透明度。**顶边那道光是单独一层 token（`--mica-panel-rim`）**：暗色下它让 1px 边框比面板亮 14~16 L\*，边框本身就是光；浅色面板已经到 L\*96，纯白最多只再给 +7 L\*，所以浅色把顶边框换成白色、在它下面压 1px 冷调暗线（`--mica-panel-bevel`）、再叠一条 16px 的白色柔光带（`--mica-panel-top`）—— 靠"亮边 + 暗线 + 衰减"三件事立住，单加白没有用。卡片不透明度刻意压到 **0.80（暗）/ 0.78（浅）**：浅色面板本来就接近白，只有让底色的绿透上来才会从"一张白卡"变成"一层薄荷玻璃膜"（代价是分层变弱，用面板色提亮到 `#f2f8f9` 补回）。页级背景为满屏薄纱 + 同色相洗色 + 一个中性色团 + 顶部受光 + 四周暗角 + 抖动噪点（消除暗色渐变的 8bit 色带）+ 柔边点阵（视口锚定、向下渐隐，页脚不顶网格）；整页滚动条也走同一条 `--scrollbar-*` 皮肤，但它是 JS 浮层而不是原生条（见「滚动条与右下角浮动操作」）。**面板底色的单一来源**：所有面板的底色 + 上面那 6 层受光图都由 `src/style.css` 末尾的共享规则给出，页面级内联样式只覆盖布局，改底色必须用 `background-color` —— 用 `background:` 简写会把 `background-image` 一起重置成 `none`，卡片立刻从「玻璃板」退回「色纸」（博客 / 小窝的列表卡片之前就是这么和主页不统一的）。静态部分零每帧开销。

### 动态光源

三层，全部只动 `transform` / `opacity`，实测零重绘零重排：`body::after` 一层光斑做 75 秒级的缓慢漂移 + 随滚动的纵向位移（`animation-timeline: scroll()`，静止时完全不产生帧），`html::before` 按本地时间叠加一档时段柔光（`data-daylight`，只在加载时设一次，四个时段都落在青线上），导航玻璃在「切主题 / 开合抽屉」时扫过一道掠光（`nav::after`，层只有导航高，不引起重新模糊）。

曾有一层 24 秒掠过内容区的扫光层：它的光斑在屏幕中央扫过时观感突兀、反复调形也没能变好看，已整体移除；"每一刻都在变"现在只由 75 秒的漂移层承担。

hero 自己的光晕（`.hero::before`，6 秒呼吸）现在**显式居中在内容正后方**（`left/top: 50%` 与 keyframes 里的 `translate(-50%,-50%)` 配对）。此前它只写了 translate，又叠加了 flex 给绝对定位子元素的「静态位置」居中（各浏览器对该静态位置的处理并不一致），等于被居中两次，圆心被推出半个身位贴到 hero 左上角，整块光晕溢出盒子、被 `overflow: hidden` 在盒边硬裁一刀 —— 暗色下 hero 左边缘于是出现一道竖直断口，看起来像一块「矩形阴影」，并随 6 秒呼吸在 1~5 级之间明暗起伏（这就是截图里圈出来的那道边）。hero 现在不再裁切内容（`overflow: visible`）：光晕只靠自身 `radial-gradient` 衰减，越过 hero 上下边的那点余光正好落进相邻区块与导航玻璃后面，没有任何硬边。

### 通透感的边界

玻璃（`backdrop-filter` + `saturate`）**常驻**给导航栏与移动端抽屉 —— 它们底下真有内容在动，"背景的颜色被吸上来"才看得见，且漂移层让开了导航高度，重建模糊只发生在滚动时；小卡（项目 / 博客 / 小窝）只在**指针下的那一张**开真玻璃（`@media (hover: hover) and (pointer: fine)` + `:hover`，见 `src/style.css` 末尾），因为漂移层一直在卡片背后动、常驻会让每张卡每帧重模糊（屏上 6~9 张卡 ≈ 8~12 条导航的采样面积，且是持续的）。悬停时面板同步降到 `--mica-surface-glass`（0.62 / 0.58），否则 0.8 的膜会把模糊挡住九成、等于白做；指针一离开就归零，静止时全站依旧零每帧开销。**关于 / 联系这类大面积面板不参与 hover 真玻璃**：面积是项目卡的 4~5 倍，模糊重栅格化的收益远小于成本，它们 hover 只加 `border-color` + 2px 位移的轻反馈（位移走合成器，避免大卡阴影过渡每帧重画）。

### 指针特效层

`src/client/cursor.ts`（和 `fab` / `scrollbar` 一起构建成 `dist/ui.js`，全站主页面共用一份；`public/404.html` 这个自带内联样式的独立页仍单独加载 `dist/cursor.js`）：折线尾迹（相邻采样点连直线、越新越粗越亮，280ms 淡出）+ 点击波纹（全站）+ 光标光晕（220px，80ms 缓动跟随）+ 卡片追光（把指针位置写进卡片的 `--mx/--my`，配合 `@property --glare` 做淡进淡出）。性能约定：单 canvas + 单 `requestAnimationFrame`，每帧只清"上一帧画过的包围盒"，指针静止后循环自停（实测静止 2 秒 `clearRect` 调用为 0 次）；触屏只保留点击波纹；`prefers-reduced-motion` 下整个文件不启动。**追光只开给小卡**（面积 ≤ 16 万 px²）：写 `--mx/--my` 会让整张卡的 `background-image` 每帧重画，关于卡 1000×448 时实测 1.5s 悬停产生约 13s 栅格任务、帧间隔掉到 ~40ms；限制后回到 60fps，大卡只保留 hover 描边 + 位移。canvas 的 DPR 上限压到 1.5 —— 光晕是软边，满 retina 换来的清晰度看不出来，显存和填充率却翻倍。

### 主题切换：圆形揭示

用 View Transition 的圆形揭示：从主题开关所在位置把新主题"铺"满整页（半径按到最远角落算，460ms），比一条掠光更直觉（光是从你按下的地方来的）；揭示期间临时挂 `html.vt` 掐掉全站颜色过渡，否则新快照会抓到过渡起点（旧颜色）、揭示出来什么都没变。不支持 `startViewTransition` 的浏览器自动回落到导航掠光（掠光带取"另一个模式"的对照色：浅色页面上用深色带 —— 旧版用白带压在近白导航上等于没有，这正是"浅色看不出通透"的一部分）。

### 色彩：前景色与填充色分离

`--primary-text` 专供文字 / 图标（暗色亮青 `#5fd8c0`、浅色深青 `#0b5f57`），`--primary` 只作填充与描边 —— 且填充值两个主题**共用** `#0f766e`（白字 5.47:1），切主题时强调色不变形；卡片内的小标签走 `--mica-chip` / `--mica-chip-border` / `--mica-chip-text`，两个主题各取一档合适的浓度与描边。

**小标签只有一套设计语言，两个角色**：尺寸由 `--chip-radius` / `--chip-pad-*` / `--chip-font` 统一。只读标签（卡片标签、项目状态、分类、文章标签、代码语言角标）是 **6px 圆角方片**、不可点，材质走 `--mica-chip` / `--mica-chip-border` / `--mica-chip-text`：浅色保持柔和的青绿填色 + 深青描边 + 深青文字，暗色把填色从 0.20 降到 0.10、描边换成半透明 mint、文字用更柔和的浅薄荷 —— 原来那层高饱和填色 + 亮青字在深色卡上会发荧光。可点胶囊只有两处（导航里的搜索框是输入控件，不算）：列表页的筛选控件（`.list-chip`，博客与资源小窝同用一个类）与主页技能胶囊（`.skill-chip`，点一下滚到对应项目卡，不跳出站）。筛选胶囊用 `--chip-fill` / `--chip-border` / `--chip-fill-hover`（浅色用「比底色更亮」的抬升填充，深色用 mint 微光）；技能胶囊另有 `--skill-fill` / `--skill-fill-hover`：浅色白卡上不能再用近白芯（中间会是空的），所以给一层 0.10 的薄荷芯；深色用 0.12，比标签的 0.10 略实一档，但仍保留强描边。原因很具体：胶囊原本是「透明底 + `--border` 描边」，而那条边框相对页面底色只有 **1.69:1（浅色 1.38:1）**，远低于控件边界该有的 3:1，未激活时几乎看不出是个控件（`--border` 又不能整体加深：它是所有面板的描边，加深会把材质层次拉平）。现在暗色给一层 mint 微光（不加白，加白会读成灰片）+ 亮青描边，屏上实测 **4.5:1**；浅色用「比底色更亮」的填充 —— 和浅色面板同一个抬升语言 —— 配深青描边，实测 **2.9:1**；技能胶囊的填充按 未激活 < hover < 选中 **单调变实**。文字只用 `--text-dim`，未激活给 `font-weight: 500`（12px 下 400 太细，边界清楚之后字也要跟上）。形状与状态仍是语义分界 —— **6px 方片=信息，999px 胶囊=可点**。**筛选栏的形态**：≥1280 是左侧 200px 的 sticky 栏；≤1279 不再用抽屉，改成列表上方的一片横排区域 —— 抽屉要遮罩、关闭按钮、Esc 与滚动锁定，为 23 个标签付这些不值，而且它盖住列表时看不到「筛完还剩几篇」。两处都是 `flex-wrap` 流式排列，一行填几个由容器宽度决定，标签不再 `width: 100%` 占满整行。

**标签宽度量化**：所有内容标签（筛选、卡片、项目技术栈、文章标签、状态）共用 `src/lib/chip-width.ts` 的 `chipCols()` —— 全角 1em、拉丁 0.55em，加上内边距与计数后按 **1 个汉字（1em）** 向上取整，写进 `--chip-cols`，CSS 用 `min-width: calc(var(--chip-cols) * 1em)` 保底。用 `min-width` 而不是 `width`：`clang-format` 这种 12 字符一旦压死宽度就会被省略号吃掉。实测桌面 1em = 13px，宽度落在 39 / 52 / 65 / 78 这类更细的档上，短标签不必被撑到下一个双字档。定长标签（提交 hash、代码语言角标）不参与量化，套阶梯会把内容挤出去。

**长尾折叠**：显示条数由断点决定 —— 桌面 `--filters-visible: 12`、平板 8、手机 6。`list.js` 按索引截断：超出的打 `.is-tail` 并移到「其他 N 个」之后，末尾一条整行细线、文字压在线上（「其他 N 个」→「收起」）。它是一次动作而不是一个筛选值，所以不做成胶囊；细线只有 1px，靠 `min-height: 44px` 撑出触屏热区。**长尾标签在 DOM 里排在按钮之后**，所以展开时它们出现在那条横线的下方，横线本身的位置不动 —— 点同一条线收起。不按固定条数折叠 —— 标签分布随文章变，按「计数为 1」分界不用回头调数字。

**第一行只有一个居中的「全部标签 N」，下面整片才是胶囊**。原来的「标签 / 分类」小标题与右侧「全部」两个元素合并成一颗控件：`.list-chip-all` 是文字按钮（透明底、4px 圆角、选中时 accent 字 + 下划线 + 字重 600），不是胶囊 —— 它是一次「复位」，不是一个筛选项。仍保留 `.list-chip` 类，筛选脚本按它绑定状态；但字号要写成 `.list-chip.list-chip-all` 双类选择器，否则压不住 `.list-filters-panel .list-chip`（0,2,0）给栏内胶囊定的 0.875rem。

它与下面那条「—— 其他 N 个 ——」是**一组**：共用 `--filter-action-font`（0.9375rem = 15px）、字重 600、44px 触屏热区、同一套 accent / 灰阶（深浅主题各走各的 token）。下划线只画在 `.list-chip-text` 上 —— inline-flex 里 `text-decoration` 不会连续穿过数字节点，整块加会断成两段。

下面那片胶囊：默认 `--chip-fill` 填充 + `--chip-border` 描边、文字用 `--text`（不是 `--text-dim`，13px 下那档太淡）；hover 换 `--chip-fill-hover` + `--primary` 描边；选中用 `--primary-dim` 淡填 + `--primary` 描边 + `--primary-text` 字、字重 600，**不用实心 `--primary`**（浅色主题下那块深青会成为整页最重的元素，比文章标题还重）。

### 页脚：关于本站 / 更新日志

两个悬浮框，内容**在构建期就定型**。`scripts/site-meta.ts` 是一个和 `client-scripts.ts` 同形式的 Vite 插件：`vp build` 时 emit 成 `dist/site-about.json` 与 `dist/site-commits.json`，`vp dev` 时用中间件现读现算 —— 所以改完 README 刷新就生效，`package.json` 里也不用为此多加一步构建。「关于本站」是 `README.md` 经 marked 渲染（**默认配置**，不套博客那套 mermaid / 代码块角标的 renderer；仓库内相对链接如 `LICENSE` 改写成 GitHub 上的对应地址，站外链接补 `target` / `rel`），「更新日志」取 `git log`（约定式提交拆成 `type` / `scope` 与标题，按日期分组，最多带 400 条）。

**为什么拆成两个文件**：合成一份时是 68.8KB（gzip 22.7KB），首开要等整包走完才渲染，其中一半多是「关于本站」根本用不到的提交记录（约 280 条）。现在按入口拆开（README 的 HTML 约 47KB / gzip 19KB，提交记录约 36KB / gzip 8.7KB），各自只取需要的那份。

**下载时机**：`main.ts` 一执行就**并行预取两份**，不等 `load`、也不等 `requestIdleCallback`。这两条以前都踩过坑：`load` 要等首页所有图片，rIC 又要等主线程空闲（`timeout` 2.5s），而用户经常在 1s 内就点开 —— 结果就是「点的时候两份文件还没开始下载」，等的那几秒全在网络上（下载完之后解析 / 渲染其实只要几毫秒，见下一条）。两份合计 gzip 约 28KB，异步、不阻塞首屏，比任何一张图都小；fetch 用 `priority: 'low'`，不和首屏的头像 / 签名图抢带宽；`navigator.connection.saveData` 为真时整段跳过，点开时才下载。入口的悬停 / 按下 / 键盘聚焦仍会再预热一次（极慢网下的补救，loader 内部单飞，不会重复请求）。

**跨会话**再叠一层 `localStorage`（stale-while-revalidate，键名 `site-meta:about:v1` / `site-meta:commits:v1`）：点开先用上一次的内容同步渲染（0ms），同时后台刷新；新内容到了，只有用户还停在顶部、且打开不到 1.5s 时才原地替换，否则只更新缓存，不影响正在读的位置。GitHub Pages 的 `Cache-Control` 只有 10 分钟，过了就要重新走网络 —— 这一层让「打开页面立刻点」不再受它影响。写不进去（隐私模式、配额满）就静默退化成纯网络。直达链接（`#about-site` / `#changelog`）另在 `index.html` 的 `<head>` 里按 hash 注入 `<link rel="preload" as="fetch" crossorigin>`，解析阶段就开始下载。拿不到 git（比如源码压缩包）就降级成「暂无记录」，不影响页面。CI 的 build job 本来就 `fetch-depth: 0`，历史是完整的。

**打开那一刻的开销**：数据已经到手之后，打开慢的根因不是网络，而是**排版**。整篇 README 排出来有 1.2 万像素高，一次 `innerHTML` 同步排完，6× CPU 下要 206ms；主线程一卡，指针事件和光标 canvas 都排不上队，用户看到的就是「卡一下，鼠标不动」。解法是构建期把 README 按 h1/h2 切成 13 个 `<div class="readme-sec">`（不能用 `<section>`：全站 `section { padding: 5rem 2rem }` 会把每一节撑高一截），配合 `content-visibility: auto` + `contain-intrinsic-size: auto 550px`，弹窗只排视口附近那几节 —— 实测排版从 206ms 降到约 6ms，点击到弹窗出现（含 `showModal` 的 top layer / backdrop 首帧）1× 约 25ms、6× 约 35ms。分节会切断外边距合并，所以每节首元素的上边距收掉、节间按 h2 的 `margin-top` 补回 2.5rem，全部展开后的总高度与不分节时一致。更新日志同理：按天挂 `.changelog-day`，80 条约 3,700px，只排可见的那几天。

**锁背景滚动**：打开时给 `<html>` 加 `modal-open`，只写 `overflow: hidden`。不要用 `body { position: fixed; top: -<Y> }`：那会让整页重新排版（长文等于整篇 reflow 一遍），关闭时还得 `scrollTo` 回去、把 sticky 导航临时改成 `fixed`，只为了一件滚动锁定的事。实测 `html { overflow: hidden }` 滚动位置原样保留（900 → 900）、滚轮被拦住，`<dialog>` 在 top layer 里不受影响，关闭后什么都不用恢复。

弹窗打开期间还有两处必须停：`html.modal-open body::after` 把背景漂移暂停、`.fx-layer`（整屏指针 canvas）隐藏。`::backdrop` 是全屏 6px 模糊，底下任何还在动的层都会让它每帧重模糊整屏 —— 这和移动端抽屉的 `body.nav-open::after` 是同一条规则；光标层画在 backdrop 下面，留着只会变成一层被模糊的残影，指针一动还会再次触发重模糊，读起来就是「鼠标静止」。关掉弹窗时画布会清空，避免闪回打开前那一帧的光晕。

框体是原生 `<dialog>` + `showModal()`：ESC 关闭、焦点陷阱、`::backdrop`、关闭后焦点回到页脚按钮，全是浏览器给的，没有手写焦点管理。材质同样没另写一份 —— `.site-modal` 直接进了文件末尾那条共享面板选择器，底色、受光边、颗粒、贴地阴影自动继承；新增的只有尺寸、圆角、`::backdrop`（`rgba(var(--bg-rgb), .55)` + 6px 模糊：暗色压一层底色、浅色铺一层薄纱，都不用纯黑）和进场的淡入位移（`prefers-reduced-motion` 下不做）。直达链接是 `#about-site` / `#changelog`（`replaceState`；关闭时把打开前的 hash 还回去 —— 页脚在主页，这个位置本来就属于锚点导航）。更新日志每行是「hash 方片标签 + 类型标签 + 标题」，标签复用只读小标签那套材质（`.changelog-hash` / `.changelog-type` 直接挂在共享选择器上，不新增材质）；超过 80 条给一个「展开更多」，数据已经在本地，不再请求。窄屏（≤600px）标题换到标签下面一行，否则两个标签吃掉三分之二宽度、标题挤成三行右边还空着。

### 首页入口与区块标题

hero 下的入口从三颗（项目 / 博客 / 资源）换成四颗（关于本站 / 个人博客 / 资源小窝 / 更新日志），并分两档权重：**关于本站、更新日志是「轻」档**（面板底 + 弱描边，`--chip-fill` / `--chip-border`），**个人博客、资源小窝是「重」档**（accent 淡填 + accent 描边 + accent 字，`--primary-dim` / `--primary` / `--primary-text`）。两档不只差 token，还差**尺寸**：重档 `.8rem 1.9rem` / `0.95rem`，轻档 `.55rem 1.15rem` / `0.82rem`，扫视时主路径先被看到。四颗统一成 999px 胶囊（与「6px 方片 = 信息，999px 胶囊 = 可点」对齐，此前是 8px 圆角，是全站唯一的例外），两颗主按钮的箭头分居外侧、各指向自己的文字（`→ 个人博客` / `资源小窝 ←`，`aria-hidden`，hover 各自向文字推 3px）。hover 只提描边、加深填充（`--primary-dim-hover`），不再画 20px 的光晕，也不做「淡填 → 实心 accent」的色块跳变 —— 之前那一下与「克制」的定位相反。`.btn` 补齐了 `:focus-visible`（全站其余可点控件本来就有，当时只有它缺）。重档刻意不做实心 accent：两块实心并排会互相抢注意力，也会和导航里那颗唯一的主题色开关撞在一起 —— 所以停在淡填，hover 才让 accent 真正亮起来，这就是「克制的显著」。关于本站 / 更新日志直接复用页脚的 `data-meta` 接线（`main.ts` 按 `[data-meta]` 绑定），点开的是同一个悬浮框，没有第二套逻辑。

hero 按钮的宽度不再跟着打字机走：`.hero` 是 flex 行容器，`.hero-content` 原来是 shrink-to-fit，打字机逐字变长时整块内容（连同 `width: 100%` 的按钮）会逐字变宽 —— 小屏上看起来像按钮在「抽」。现在 `.hero-content` 写死 `width: 100%`（仍受 `max-width: 720px` 约束），宽度只由视口决定。窄屏（≤768px）四颗按钮排成「两颗轻胶囊在上、两颗主胶囊在下」：轻档自然宽度居中成一对，主档各占一半并排；`::before` 生成一条零高的整行 flex 项把两档隔开，否则宽屏手机剩余空间够第一颗主胶囊挤进第一行、第二颗才换行。主档保留 `48px` 高、`0.95rem` 字，轻档 `44px`，触屏上不会被抹成同一层。没有改成「给宽度加过渡」：宽度是按字符离散变化的，过渡只会让它持续抽搐，起止两端照样跳。移动端 hero 的高度单位从 `dvh` 换成 `svh`，body 的最小高度用 `lvh`：浏览器底部地址栏 / 工具栏收放时这两个值不跟着变，页面不会上下跳。

区块标题（关于 / 项目 / 博客 / 资源 / 联系）从 `1.5rem` 提到 `1.75rem`（窄屏 `1.3rem` → `1.5rem`）。「查看全部」从标题**下面**一行搬进标题行右端：标题左对齐、按钮右对齐，中间仍是那道渐隐装饰线 —— 靠 `order` 排列（标题 0 / 线 1 / 按钮 2），线自然夹在两者之间并吃掉剩余宽度，不用额外包一层 flex。按钮做成胶囊（按全站约定，胶囊 = 可点），高度直接取标题的行盒（`--section-header-size × --section-header-line`），所以标题与按钮上下两端严丝合缝；按钮字号也跟着标题缩放，窄屏不会出现「大胶囊配小标题」。标题行盒单独定成 1.15 而不是继承正文的 1.6：后者会把单行标题撑成 45px 的胖条，胶囊也得跟着变胖。

### 关于与技能

「关于」与「技能」现在合在同一张 Mica 卡里，全站只保留一个「关于」区块标题，导航里的「技能」入口随之删除（`#skills` 仍作为深链锚点保留，方便直接分享到技能段）。上半是身份（头像 + 简介 + 三列事实），下半是能力（四组技能）；中间那条内分隔线上嵌一个 0.75rem 的「技能」小标签 —— 它只是导线的注记，字号与组名同级、不进入标题层级，所以不会像旧版的大标题那样把一张卡重新劈成两个区块。卡片高度随文字换行连续变化（实测 1440px 约 689px、1024px 约 742px、769px 约 919px、600px 约 1020px），靠几个 `contain-intrinsic-size` 断点补不准；所以 `#about` 不再参与 `content-visibility: auto`，避免展开时页面长高或缩短、滚动条拇指跟着跳。

技能胶囊不再是外链，而是 `button`：点一下按 `projects.json` 的稳定 `id` 找到对应项目卡，滚到视口中央、描边高亮 1.8s，并把焦点交给那张卡（键盘 / 读屏用户因此知道落点变了，也能直接 Enter 进仓库）。数据侧用 `skills.json` 的 `project` 引用 `projects.json` 的 `id`，两边是否对得上由单测校验；显示标题可以改，跳转不会悄悄断掉。没有对应项目的技能（Linux、逆向等）仍是不可点的静态胶囊。

窄屏（≤768px）下技能标签流改成单行横向滑动：组名独占一行，标签行 `overflow-x: auto`、隐藏滚动条；右侧会露出半颗胶囊，作为「还能滑」的视觉提示，不再折行把卡片堆得很高。

### 首页博客预览与置顶

首页博客预览固定取 `blog/data.json` 的**前 6 篇**（2 列网格正好排满 3 行）。构建时 `data.json` 已经是「置顶按更新时间降序 → 普通按创建时间降序」，所以首页和博客列表的前 4 张卡永远一致：置顶变了、文章更新了，首页跟着变，不需要再手动改首页。之前是「全部置顶 + 2 篇普通」，置顶一多首页会被越撑越长，旧置顶也一直占位。`fetch` 加 `cache: 'no-store'`，避免浏览器缓存让新置顶晚一步出现。

置顶标记是 `.pin-badge`：6px 方片 + 内联 SVG pushpin，accent 描边 / 淡填；尺寸取 **`1.2em`**，跟着所在标题的字号走，图标本身 0.9em 填满方框。取 1.2 而不是 1：与文字完全同高时，字面里那圈留白会让方框看起来**比字小**，1em 和 1.1em 都试过，仍然偏小。不用系统 emoji：彩色字形在 Windows / macOS / Android / iOS 各画一套，不跟 `currentColor`，和全站单色内联 SVG 的图标语言冲突。首页、博客列表、资源列表和详情页共用 `src/lib/icons.ts` 里的同一颗徽标，`<title>` / OG 标题里仍是纯文字。

### 列表页头部与排序

博客与资源小窝的列表页头部现在同构：标题一行，小字与排序共用下一行（小字靠左、排序靠右，`margin-left: auto` 保证窄屏换行后仍贴右）。标题不再是每页自己定的 `1.8rem`，而是直接读 `--section-header-size`（`1.75rem` / 窄屏 `1.5rem`）—— 这对 token 从 `.section-header` 提到了 `:root`，所以从首页点进列表页，标题字号不再跳变。小字的行盒与排序控件同高（`--list-row`：桌面 `2rem`、窄屏 `2.25rem`、触屏 `2.75rem`），上下两端严丝合缝；排序因此读起来是小字那一行的右端，而不是另起一块控件。

排序做成「一个容器 + 三段」的分段胶囊，**和筛选栏一样不用实心 accent**：同一张页面上，「我筛了哪个标签」和「我按什么排序」靠形状与位置区分（左侧整行条目 vs 标题行右端的三段），不靠色块轻重。三个选项（默认 / 创建时间 / 更新时间）两页一致；默认顺序永远回到构建时的顺序（置顶项在最前），同一日期时也不会因为上一次点过别的排序而换位。小窝原来没有排序，这次补上：`date` 一直有，`updated` 读 frontmatter 的可选字段，没写就等同创建时间。

**切换动效**（`src/client/sort.ts`）：三段文字宽度不同，所以背后放一颗 `.list-sort-thumb`，由 JS 量一次真实 rect 写成 `--thumb-x` / `--thumb-w`，切换时 `transform` 滑过去，而不是「旧块淡出、新块淡入」。按钮本身保持透明，底色交给滑块，避免两块底色交叠。卡片用 **FLIP** 从旧位置滑到新位置：`document.getAnimations` / Web Animations API，动画结束自动还原，不和 hover transform、fade-in 打架。

> 需要澄清一个常见误解：**卡片 HTML 和初始顺序是编译期生成的，但排序本身是运行时重排 DOM**（`list.js` 把子节点按 `data-date` / `data-updated` 排好后一次性挂回）。动效的成本是两次 rect 读取 + N 个合成层动画，只在点击那一瞬发生；实测含强制布局的单次切换：博客 8 张卡中位 **3.2ms**、小窝 5 张 **2.2ms**（首次约 7ms，含脚本预热）。`prefers-reduced-motion: reduce` 下滑块与 FLIP 都跳过。

搜索框从列表内容区搬进导航中段。桌面（≥768px）是常驻的 `999px` 胶囊：`flex: 1 1 200px`、`max-width: 360px`，吃掉左右两组之间的空余，768–1023px 按剩余空间自动收缩；输入框 34px 高，字号 0.85rem。手机（<768px）收成一颗放大镜 `.fab-btn`，点开后是导航内的第二行（`nav.search-open`：`height: auto; flex-wrap: wrap`，搜索行 `flex: 0 0 100%` + `order: 3`）—— 不用绝对定位 / `fixed`，因为导航有 `overflow-x: clip`，浮层会被裁掉；第二行走文档流，sticky 导航变高后内容自然下移。手机行高 44px、输入 16px（根字号在 ≤480px 是 15px，这里写死 16px，避免 iOS 聚焦时放大整页），右侧「取消」，`Esc` / 点面板外 / 软键盘搜索键都能收起，焦点回到放大镜。`/` 快捷键在手机上先展开再聚焦；有 `?q=` 或输入了内容但面板收起时，放大镜右上角显示和筛选按钮同款的小圆点。`#searchCount`（找到 N 篇）和空态仍留在列表区，不塞进 58px 的导航。

筛选胶囊从卡片上方搬到卡片左侧，做成文章目录的列表页版本。桌面 `≥1280px` 停靠在左（`sticky`，宽 `200px`），页面 `max-width` 同时增加「栏宽 + gap」的 `232px`，卡片宽度基本不变，栏占的是页面原来的左侧留白；展开状态存在 `localStorage: list-filters-open`，首帧前由 `<head>` 里的同步脚本加 `html.filters-open`，不会先按窄版排一遍再跳宽。`<1280px` 变成左侧抽屉：遮罩 + Esc + 选中标签自动收起，手机默认收起，抽屉里锁住整页滚动。

面板内每颗胶囊都是整行：`.list-chip-label` 左对齐、`.list-chip-count` 右对齐，标签按使用次数降序（同次数按名称）排序。博客补了一颗「全部」（与资源小窝同构，首项默认激活，点它等于清空筛选），两页的容器都叫 `.list-filters`。标签仍是 `<a href="?tag=…">`（真链接，JS 只是接管了点击，`?tag=` 仍可分享），分类是 `<button data-category>`；两者的外观、尺寸、激活态与 44px 触控高度完全同一份规则。导航右端新增一颗 `.fab-btn`（复用文章页目录按钮的尺寸与位置）负责开关，`aria-expanded` / `aria-controls` 与当前是否有筛选（`data-filtered` 小圆点）都会同步。

卡片内部顺序也统一了：**标题 → 摘要 → 标签 → 元信息**（小窝是标签 → 大小 / 日期 + 动作按钮）。卡片是纵向 flex、标签那一块用 `margin-top: auto` 压到底，同一行的卡片底边因此对齐。博客卡片之前是标题 → 标签 → 元信息 → 摘要，标签夹在标题和正文之间、摘要沉到卡片最底下，两页并排看是两种卡片。

排序逻辑在 `src/client/sort.ts`（和 `search.ts`、`filter-panel.ts` 一起构建成 `dist/list.js`，两个列表页共用）：博客页原来那份内联实现顺手带走了「点了排序不改 URL」的毛病，现在两个页面都写 `?sort=`、都支持前进 / 后退，且共用同一个稳定排序。

### 导航：左组留在本页，右组去别处

三处导航的左组长得一样（`cmixed` + 两个入口），起排位置也一致；**落点分两拨**：

| 位置 | 主页 | 列表页 |
|---|---|---|
| 左组 | `cmixed`（不可点，后面留出与子页 `←` 等宽的空位）+ **个人博客**（`/blog/`）+ **资源小窝**（`/nook/`） | `cmixed ←`（回主站）+ 个人博客 / 资源小窝（跳各自列表页） |
| 右组 | **关于**（`#about`）/ **项目**（`#projects`）/ **博客**（`#blog-preview`）/ **资源**（`#nook-preview`）/ **联系**（`#contact`） | RSS / 搜索 / 筛选 / 主题 |

左组三项与列表页的左组完全同构：都是「去别的页面」的链接，唯一区别是主页的 `cmixed` 不可点（已经在主站了）。右组五项全是「在本页里走」的锚点，点下去是滚动而不是跳页。窄屏（≤768px）右组整体收进汉堡抽屉（`body.nav-open` + `.nav-links.active`），左组保持可见——它在抽屉之上，不遮住当前页的身份。

主页 logo 后面跟一个**灰色 `→`**（`.logo-arrow`，`color: var(--text-muted)`），子页是 `cmixed ←`。两个箭头在同一字符集、同一字体下宽度相同，所以三页 logo 实测都是 **104px**、「个人博客」左边缘都在 **160px**，切页时左组不会横移。

方向也把语义分开了：主页的箭头朝外（去列表页），子页的箭头朝内（回主页）。

> 之前试过两种硬编码：`0.85em` 差 9px、`1.285em` 差 0.3px。0.3px 肉眼看不见，但它依赖字号与字体，是笔会过期的债。同一段文本、同一个字符，比任何计算都可靠。

锚点跳转会在 `scrollIntoView` 之后手工 `history.pushState`：`main.ts` 为了平滑滚动调了 `preventDefault`，浏览器不会自己改 hash，不补这一步「跳到博客卡片」这个位置就既不能分享、前进后退也记不住。

### 关于卡：头像下的名牌

一块**大的圆角矩形**把「照片 + 下方多出的半块」整体包住，两者**融合**，不是挂牌子：

| 项 | 桌面 | ≤480px |
|---|---|---|
| 外框 | 184 × 220，**20px 圆角** | 126 宽 |
| 照片 | 168 × 168，**四角 14px** | 110 × 110 |
| 名字带 | 182 × 35，与外框同宽 | 124 × 34 |

- `.about-avatar` 是外框：0.45rem 内边距、`--mica-chip` 底、`--mica-chip-border` 描边、20px 圆角、`overflow: hidden`。照片保留自己的 14px 四角圆角，**不再为了接缝削平底角**。
- `.about-name-tag` 用 `align-self: stretch` + 负的左右 margin 撑到外框边缘，底边贴住外框；圆角由外框的 20px 裁出来，所以它天生就是「只有下半部圆角的半块」。背景换 `--primary-dim` 与外框拉开一档，顶部一条细线分界。
- **没有吊线、没有间隙**：上一版用两条 1px 短线把一块小牌子挂在照片下面，是分离的；现在两块共用同一条轮廓、同一层底色，读起来是一个整体。
- 名字带仍在文档流里：绝对定位会压到下面的技能分隔线上。外框底边距技能分隔线 24px；窄屏无横向溢出。
- 只读标识：不加 `cursor`、`user-select: none`。

### 客户端脚本的缓存

`theme.js` / `cursor.js` / `ui.js` / `list.js` 是固定文件名的经典脚本（不能进 Vite 打包图，否则会变成 module、主题脚本来不及在首帧前跑完）。固定文件名意味着每个部署之后浏览器都会继续用缓存里那份。

解决方式：`scripts/client-scripts.ts` 在 `buildStart` 阶段编译出全部产物、算 `sha256` 前 8 位，`transformIndexHtml` 把 `<script src="./ui.js">` 改写成 `./ui.js?v=<hash>`；博客与小窝的模板由各自的 `build.ts` 用同一套算法（读 `dist/<name>.js` 再算）补齐。改一次脚本 → hash 变 → URL 变 → 缓存自然失效。

### 交互控件：文字选中与键盘焦点

按钮 / 胶囊里的文字默认可选中：点击时若有几像素手部位移，就会选走半个标签（实测点 `26Q3` 选成 `"6Q"`），中间留下一段蓝色选区和文本光标 —— 用户看到的「点击后光标放在中间」就是这个。

所以所有**可点控件**（`button`、`.list-chip`、`.list-chip-more`、`.list-sort-btn`、`.changelog-quarter`、`.skill-chip`、导航项、FAB、footer 按钮等）统一 `user-select: none`；正文、文章、代码、邮箱仍用 `user-select: text`，不影响复制。同时给 `button:focus-visible` / `a:focus-visible` 兜一圈 accent 焦点环：用 `:focus-visible` 而不是 `:focus`，鼠标点击不留框，键盘 Tab 又不会丢焦点；已有自定义焦点样式的组件特异性更高，仍走自己的规则。

### 更新日志：按季度分段

日志从「按日期一行行铺下去」改成两层结构：

- **季度标签在弹窗标题行右侧**（`.site-modal-actions`），不是正文里的 sticky 条 —— 标题右边那片空白本来一直空着，而标签又必须常驻；放到标题行之后它天然在滚动区之外，不用 sticky、不占正文高度。「关于本站」时容器清空，`:empty` 让它整个塌掉。窄屏（≤600px）标题行换行，标签落到第二行横跨整行。
- **每段前面一条横线，中间夹一颗胶囊**标出季度，与下面按日期分组的小标题形成两级。

**点击要保证「自动加载 + 落到对应位置」**：

- 标签列的是全部季度，包括还没渲染的。点一个没渲染的季度时，`ensureQuarter()` 直接把 `changelogShown` 撑到全部条目（纯文本行，359 条一起排也就几十毫秒，比维护增量加载划算），重渲染后再滚。只补到「该季度第一条」是不够的：最后一个季度往往只剩十几条，滚动条会先到底，标题推不到顶部（实测目标 16.7k 被夹在 16.0k，标题停在视口下方 489px）。
- 滚动由 `scrollToQuarter()` 自己算 `scrollTop`，不用 `scrollIntoView`（它会连带滚动祖先）。超过一屏半直接瞬移，平滑滚一万多像素要好几秒，看着像没反应。
- 高亮由 `syncQuarterTabs()` 在滚动时同步（rAF 合帧、只读 rect）；滚到底时直接把最后一个季度算作当前段，否则短的最后一段永远顶不到判定线。

三个坑：

1. 导航最初写成 `<nav>`，命中了全站导航的 `justify-content: space-between`，三个标签被撑成两端分布 —— 改成 `<div role="group">`。
2. 分段写成 `<section>`，吃到 `section { padding: 5rem 2rem }`（每段上下各多 80px）和 **`content-visibility: auto` + 500px 占位**。前者显式 `padding: 0`，后者必须 `content-visibility: visible`：离屏季度整段被压成 500px，跳转目标被夹在几百像素处。
3. `.changelog-day` 原本也做了按天虚拟化（340px 估算高），落点会随内容逐节展开而漂移。这里刻意**不虚拟化**：一天的条目就是几行纯文本，真正需要省的是打开时那一整篇 README，不是这份扁平列表。

### 季度总结：过完才写，写完不再重写

更新日志的季度段里会插一张总结卡（标题、一段概述、要点、统计）。三条硬规则：

- **没过完的季度不总结**。`isQuarterComplete()` 用 UTC 月份判断：Q3 结束于 9 月，要等 10 月才算过完；2026-11 时的 26Q4 仍是进行中，即使存档里有总结也不会输出。当前只有 26Q3（226 条）和 26Q2（18 条）有总结。
- **不重复总结**。总结文本写在 `src/data/quarter-summaries.json`，一个季度一条、带 `fingerprint`（该季度全部 `hash + subject` 的 sha256 前 12 位）。构建期 `selectQuarterSummaries()` **只读不生成**：已有总结原样复用；已完结但缺总结的只 `console.warn` 提醒，绝不自动补一份；指纹变了也继续复用旧总结、只提醒人工复核。所以每次构建不会重新"总结"一遍。
- **每段一张**。`renderChangelog()` 按季度键取一次，插在横线胶囊标题之后、按日期分组的明细之前；日期分组里不会再插。统计（条数 / 活跃日 / 首末日期 / 类型分布）从完整提交记录现算，不写进存档文件，免得和 git 历史对不上。

新季度过完后补写一次：

```bash
pnpm quarter-summary   # 打印各季度状态、指纹、统计与待补写素材
```

把输出的指纹和手写的一条总结写进 `src/data/quarter-summaries.json` 并提交即可。注意 `git log -n 400` 是上限：若仓库总提交超过 400，早期季度会被截断、指纹变化，届时要调大 `MAX_COMMITS`。

**缓存**：弹窗数据走 localStorage 的 stale-while-revalidate。数据结构升级时要把 `createMetaLoader` 的 storeKey 升版（`commits:v1` → `v2`），否则老缓存里没有 `summaries`、首开看不到总结；`sameMeta()` 也因此把总结的键一起比较，保证「季度过完、新增总结但提交没变」时后台刷新仍会重渲染。

### 站点图标与浮动按钮

三处 favicon 同一套画法：**透明底 + 纯黑线稿**（32×32 viewBox、`stroke="#111"`、`fill="none"`）。不要纯色填充，深色圆角底与青色描边都已去掉 —— 浏览器标签页上只看到简洁的黑色线条。

| 文件 | 用途 | 图形 |
|---|---|---|
| `public/assets/icons/site.svg` | 主站 `<link rel="icon">` | 房子 |
| `public/assets/icons/blog.svg` | 个人博客 | 一对尖括号 |
| `public/assets/icons/nook.svg` | 资源小窝 | 立方体 |
| `*-192x192.png` | 只留给 `apple-touch-icon` —— iOS 不接受 SVG，这 3 个 PNG 不能删。由同一份 SVG 渲染成**白底黑线**（图形放大到 150px 居中）：透明底会被 iOS 渲染成黑底，黑线就看不见了 | — |

`site-wf-32x32.png` 已删除：`index.html` 与 `404.html` 的 `rel="icon"` 都改指 `site.svg`，那个 32px 的位图不再有人引用。

右下角三颗浮动按钮（`.fab-group`）的图标**按落点分配**，不按页面随意挑：

| 页面 | 第一颗回哪 | 图标 |
|---|---|---|
| 主页 `/` | 不回（自身就是主页） | **不渲染**这颗，只剩 ↑ / ↓ |
| 博客列表 `/blog/`、小窝列表 `/nook/` | 站点主页 | 房子（`home`） |
| 博客文章 `/blog/x.html` | 博客主页 | 尖括号（`blog`） |
| 小窝详情 `/nook/x.html` | 小窝主页 | 立方体（`nook`） |

`upTarget()` 一次返回 `{ href, label, icon }`，图标和落点是同一个决策的两个字段 —— 分两处判断迟早会漂移成「点了房子却回博客」。

三颗图标都是**开放路径、只描边**（`fill: none`，24×24 / 1.7px / 圆头 / `currentColor`），与导航里的 RSS、主题、搜索同源。不给 `hover` 加 `fill`：房顶和三面墙填起来会糊成一个色块；「填充」交给按钮本身 —— 悬停时底色、描边、文字色一起变亮。

主站的标签页标题是 `cmixed · 主页 · 博客 · 资源`（三个栏目名并列）；OG / twitter 标题仍是 `cmixed · 技术博客` —— 分享卡片上「这个站是干什么的」比罗列栏目更有用，两者受众不同，不强行统一。博客列表页的 `<title>` / OG / twitter 统一为 `个人博客 · cmixed`，与导航里的栏目名一致。

### 列表卡片：固定三行、浮窗补全、网格对齐

三个列表（首页项目卡 / 博客 / 资源小窝）的卡片结构一致，下面几条是硬约束：

- **标签只占一行**：卡片里的标签行是 `flex-wrap: nowrap`，`list.js` 逐项累加宽度，放不下的隐藏、行尾补「+N」（当前桌面显示 5 个 + 「+1」，390px 下 3 个 + 「+3」）。首页项目卡底的 `.project-tech` 用同一套规则，四个技术栈标签放得下就全显示，放不下才折叠。卡片高度因此与标签数量无关。注意卡片必须写 `min-width: 0` —— grid 项的默认 `min-width: auto` 会被 nowrap 标签的总宽顶开，窄屏整张卡会撑破视口。
- **顶部高亮是内嵌光，不是一条硬线**：五类卡片（项目卡 / 两个预览卡 / 博客列表 / 小窝列表）原来都用 `::before` 在 `top:0` 画 2px 的 `--primary` 线，hover 时涨到 4px；它绝对定位在卡片之上，列表卡又为了浮窗开了 `overflow: visible`，于是线会探出圆角、像浮在卡片上的另一层。现在 `::before` 改成 `inset: 0` + `border-radius: inherit` 覆盖整卡，用 `inset 0 4px 0 var(--card-top-band)` 画 4px 内带、再叠一层向下 96px 淡出的薄雾，整层靠 `opacity` 过渡：静止 0、hover / focus 1、置顶卡 0.55。厚度更足、颜色更柔、永远在边框内侧。两个主题各给一组 `--card-top-band` / `--card-top-glow`。

- **摘要固定三行、整页卡片等高**：`-webkit-line-clamp: 3` 加 `min-height: calc(3 * 1.6 * 0.85rem)`，再配 `grid-auto-rows: 1fr`。只 clamp 不固定高度，短摘要的卡会留洞；只固定高度不 clamp，长摘要会把卡撑高。两条一起，同一页每张卡高度一致，标签行与元信息行也落在同一水平线上。

> 试过一版「高度随摘要行数分 1/2/3 档」（`align-items: start` + 不给 `min-height`），结果是卡片东缺一块西一块 —— 一行两张卡高度不同，底边对不齐。等高更耐看。
- **浮窗只在真的被截断时出现**：`list.js` 里的 `card-popover` 逐个量 `scrollHeight > clientHeight`，截断了才给卡片加 `.is-clamped`，CSS 只认这个类。当前 8 篇文章的摘要都没超过三行，所以浮窗一次都不会弹 —— 这是预期，不是没接上。浮窗内容与卡片同源（标题 / 摘要 / 标签），不额外取数；下方放不下时由 `.popover-up` 翻到卡片上方；触屏不给（会盖住下一张卡）。
- **网格列数按内容密度定，不强行统一**：博客固定 2 列（元信息是「阅读 / 创建 / 更新 / 字数 / 图片」长句，再窄就换行）；资源小窝 `minmax(250px, 1fr)`，1120px 内容宽下 4 列（原来 320px 只有 3 列，卡大而空）；首页项目卡 `auto-fit minmax(280px)`，中屏 3 列、大屏 4 列。列数不同的是**密度**，相同的才是**语言**：卡片内边距 1.25rem、圆角 12px、顶部 accent 条、浮窗、标签量化，三处同一套。
- **置顶徽标取 `1em`**：跟着所在标题的字号走，用 `vertical-align: -0.16em` 对齐首行视觉中线（`-0.12em` 时图标顶端会冒出去）。分类、RSS、搜索等图标同走 `src/lib/icons.ts` 的 24×24 / `currentColor` / 1.7px 描边，尺寸由 `em` 或 token 给出，不在页面里各写一份。

### 滚动条与右下角浮动操作

**滚动条**：一套 token（`--scrollbar-*`：暗色 mint 微光、浅色深青），两种实现。

整页那条是**浮层**，由 `src/client/scrollbar.ts` 画（和 cursor / fab 一起构建成 `dist/ui.js`）。原生整页滚动条做不到这个效果：经典条按定义要占 10px 布局宽度、还会画出自己的轨道，sticky 导航和 hero 就铺不到窗口右缘 —— 右侧永远缺一条缝，那正是「滚动槽」；`overflow: overlay` 已从 Chrome 114 移除，而 `::-webkit-scrollbar { width: 0 }` 等于没有滚动条。所以原生条藏掉（`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`），换一根 `position: fixed` 的 10px 轨道 + 拇指：几何是 `scrollTop / (scrollHeight - clientHeight)` 映射到轨道剩余长度，拇指最小 32px，监听 `scroll` / `resize` / `ResizeObserver(body)`（首页预览、正文图片都是 load 之后才撑高）；滚动时浮现、停 1.2s 淡出、指针靠近右缘 18px 再浮现；拇指可拖。触屏不创建（系统自带的浮层条够用），无 JS 时整页没有滚动条但滚动不受影响。滚动事件里只拿缓存的 `max` / `travel` 写 `transform`，不每帧读 `scrollHeight`；高度变化交给 `resize` / `ResizeObserver` 重算，避免一次布局读取拖慢长页面。藏掉原生条还有个附带好处：滚动条不再占布局宽度，悬浮框锁滚动时（`html { overflow: hidden }`）背景也不会横移 10px —— 之前靠 `scrollbar-gutter: stable` 预留，而那个预留本身就是一条槽。

块内滚动（弹窗正文、代码块横向、表格）保持**系统 thin 条**：`scrollbar-width: thin` + `scrollbar-color`（Firefox、Chrome 的覆盖式滚动条）+ `::-webkit-scrollbar`（Safari、经典滚动条），两条路径取同一个颜色。它们都在面板内部，轨道透明就够 —— 拇指内缩 2px 成圆角玻璃条，hover、拖动逐档提亮，看上去和整页那枚一样是浮着的。博客侧栏目录**故意排除在外**：它用上下两道渐隐提示「还有内容」，加回滚动条会把那个设计顶掉。

**右下角浮动操作**：回上级 / 回到顶部 / 直达底部，由 `src/client/fab.ts`（和 cursor / scrollbar 一起构建成 `dist/ui.js`）在主页、博客（列表 + 文章）、资源小窝（列表 + 详情）注入同一组按钮 —— markup 也在脚本里，页面不再各存一份 `div.fab-group`。第一个按钮的落点是算出来的：目录页指向父目录、内容页指向所在目录（`/blog/` → 站点主页、`/blog/x.html` → 博客主页、`/nook/x.html` → 资源小窝主页）；主页本身就是站点主页，这一颗直接省略。整组滚过一段才淡入，阈值跟着页面长度走（可滚距离的 15%，夹在 120～400px）—— 固定 400px 会让只能滚三四百像素的列表页永远不亮。图标用内联 SVG：缺字体时 `U+2302`（⌂）会变成方框，而且字体字符在不同平台上的字重 / 字形也不一致；现在导航 RSS / 主题 / 目录 / 缩进也统一到 `src/lib/icons.ts`。

三颗按钮的材质取 `--mica-chrome`（和导航同一个「标题栏层」），不挂 `backdrop-filter`：导航那层本来就有 0.90 不透明，模糊在视觉上看不出来，却会让三颗常驻按钮在漂移层背后每帧重模糊。hover 时用 `background-image` 叠一层淡青，而不是换掉底色 —— 换底会让它们和导航脱开。

「直达底部」不能直接滚到 `document.scrollHeight`：主页（`#about` 除外）与文章页的 `<section>` 用了 `content-visibility: auto`，没进过视口的区块只按 `contain-intrinsic-size` 的占位高度计高（文章 800px、主页 500px），长文实测 `scrollHeight` 只有 46,065，真实高度 172,218。直接滚过去等于滚到「估算出来的底部」，滚动途中区块逐节展开、页面变长，于是停在半路 —— 表现为「卡在第 3 章，再点一次才到底」。所以点击时先给 `<html>` 加一帧 `fab-measuring`：所有 section 临时 `content-visibility: visible`，读一次 `scrollHeight` 逼出真实布局（长文 3.8ms）并滚过去，下一帧再撤类 —— 这一帧足够让 `contain-intrinsic-size: auto` 记住真实高度，撤掉后页面不会缩回去，`scrollTo` 的目标也不会被夹小。落地后再量一次，若仍差 >2px、且用户没有自己滚（`wheel` / 触摸 / 按键），补一次；`scrollend` 不可用时用 2.2s 超时兜底。

**正文排版只有一份**：README 是 Markdown，博客文章也是，所以原来写在 `blog/template/post.html` 内联样式里的 `.blog-article-content h1 … table` 整块搬进了 `src/style.css`、改名 `.md-body`，文章页容器同时挂 `md-body` 类（`body.indent` 首行缩进、TOC、mermaid、代码块语言角标这类文章页独有的东西仍留在模板里）。搬家前后逐页比对过：2 篇文章 × 2 主题 × 桌面 / 移动 × 3 个滚动位置，**像素级 0 差异**；之后调正文字号只改一处。

## 项目结构

```
├── src/
│   ├── main.ts          # 主站交互：主题接线、导航、搜索、项目与技能渲染、悬浮框（页脚 + 首页入口）
│   ├── client/          # 全站共用的经典脚本源码（TS）：theme / cursor / search / sort / filter-panel / fab / scrollbar
│   ├── style.css        # 全站样式、Mica Alt 材质与 Markdown 正文排版（.md-body，token 的唯一来源）
│   ├── data/            # projects.json / skills.json（主页卡片的内容源）
│   ├── __tests__/       # 单测：构建工具、图标、站点元数据、技能与项目 id 的一致性
│   └── lib/             # 构建工具（front-matter / 模板 / 日期 / git）与图标单一来源 icons.ts
├── blog/
│   ├── post/            # Markdown 文章（可在同目录放 asset/ 图片）
│   ├── template/        # 文章页、博客 404 模板
│   ├── index.html       # 博客列表页骨架（筛选项与卡片由 build.ts 注入）
│   ├── build.ts         # 生成列表、文章页、RSS、sitemap 与供主页用的 data.json
│   ├── build-hljs.ts    # 按实际用到的语言裁剪 highlight.js
│   ├── vendor/          # 裁出来的 highlight.js 与明暗两套主题（自托管，不进打包图）
│   └── mermaid-cache/   # 渲染过的 Mermaid 图（按源码 hash 缓存，命中就不重渲染）
├── nook/
│   ├── file/            # 资源：<category>/<slug>/index.md（+ 附带文件）
│   ├── template/        # 详情页模板
│   ├── index.html       # 资源列表页骨架（分类 / 标签筛选同上）
│   ├── 404.html         # 小窝自己的 404 页
│   └── build.ts         # 生成列表、详情页、RSS、sitemap 与 data.json
├── public/              # 原样拷到站点根 —— 这里的目录结构就是 URL 结构
│   ├── 404.html         #   /404.html（GitHub Pages 只认这个路径，挪走就没有自定义 404）
│   ├── robots.txt       #   /robots.txt（爬虫只读根目录）
│   ├── sitemap.xml      #   /sitemap.xml（sitemap index，由 robots.txt 声明）
│   ├── sitemap-pages.xml #  /sitemap-pages.xml（首页等静态页）
│   └── assets/          #   站内引用的图：og-image.png / icons/ / 签名 / 头像
├── scripts/             # 构建期脚本：都由 vp 调起，不进前端打包图
│   ├── optimize-images.ts   # PNG → AVIF
│   ├── client-scripts.ts    # src/client/*.ts → dist/{theme,cursor,ui,list}.js（固定文件名，按共用场景分组）
│   ├── icon-tokens.ts       # HTML 里的 {{icon:…}} → 内联 SVG（首页 Vite 入口）
│   ├── site-meta.ts         # README + git log → dist/site-about.json / site-commits.json（页脚两个悬浮框）
│   └── og-image.ts          # 生成分享卡 public/assets/og-image.png
├── docs/                # 迁移计划与报告
├── index.html           # 主站入口
├── vite.config.ts       # 多页构建、HTML 入口、插件注册（client-scripts / site-meta）
└── tsconfig.json        # 源码一律 TS：vp check / tsc 覆盖 src、blog、nook、scripts
```

构建产物 `dist/` 不提交，结构大致是：

```
dist/
├── index.html            # 主站
├── site-about.json       # 「关于本站」内容（README 渲染结果，构建期生成）
├── site-commits.json     # 「更新日志」内容（git 提交记录，构建期生成）
├── theme.js              # 四个固定文件名的经典脚本（不进打包图）
├── cursor.js             # 仅 public/404.html 这个独立页用
├── ui.js                 # cursor + fab + scrollbar + card-popover，全站主页面共用
├── list.js               # search + sort + filter-panel，博客 / 资源小窝列表页共用
├── assets/               # 打包后的 CSS / JS，外加 public/assets 原样拷来的图
├── blog/                 # 列表页、文章页、data.json、feed.xml、sitemap.xml、vendor/、mermaid/
├── nook/                 # 列表页、详情页、data.json、feed.xml、sitemap.xml
├── 404.html              # 来自 public/404.html
├── robots.txt
├── sitemap-pages.xml     # 首页等静态页
└── sitemap.xml           # sitemap index（pages / blog / nook）
```

`public/` 不是素材仓库，它的目录结构就是站点 URL 结构。所以只把**路径被约定死的**文件留在根目录（`404.html` 是 GitHub Pages 的约定，`robots.txt` / `sitemap.xml` 是爬虫的约定，`sitemap-pages.xml` 是 sitemap index 的子项），其余按用途收进 `assets/`：换目录就等于换 URL，而约定路径一挪就失效。

`blog/` 与 `nook/` 里只有页面自己的产物；四个脚本都在站点根，模板用 `../ui.js` 或 `/ui.js` 引用。以前每个子目录还会复制一份同名脚本，但没有任何页面引用它们 —— 现在只保留 `style.css` 这一份真正被 `href="style.css"` 用到的副本。

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

### 在 VS Code 里跑测试（WSL）

命令行 `vp test` 不受影响；这里说的是 VS Code 的「测试」面板。它在扩展宿主里 `createServer().listen(0)` 起一个 WebSocket 服务 —— 不带 host 时 Node 只绑 IPv6 的 `::` —— 再让 worker 连 `ws://localhost:PORT`。WSL 生成的 `/etc/hosts` 通常只有 `127.0.0.1 localhost`（`::1` 绑在 `ip6-localhost`），于是 `localhost` 只解析到 127.0.0.1，连不上只监听 `::` 的服务：worker 报 `ECONNREFUSED`、退出码 1，扩展显示「could not load any config」。

`.vscode/vitest-localhost-ipv6.mjs` 是一个 preload：解析 `localhost` 时补一条 `::1`，Node 20+ 的 Happy Eyeballs 会在 IPv4 失败后自动回退。`.vscode/settings.json` 用 `vitest.nodeExecArgs`（`--import`，项目要求 Node ≥ 22.18，够新）把它挂到扩展拉起的 Node 上，只影响扩展的 worker，不改系统、也不影响 `vp test`。改完需要重载窗口（`Developer: Reload Window`），`nodeExecArgs` 只在扩展激活时读取。

永久方案是不用 preload：在 `/etc/wsl.conf` 写 `[network]` / `generateHosts = false`，自己维护 `/etc/hosts`（加 `::1 localhost`），然后 `wsl --shutdown` 重启。代价是每次改 hosts 要 root，而且整份 hosts 都得自己管；preload 不需要权限，也不会被 WSL 下次启动覆盖。

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
date: 2026-10-20
updated: 2026-10-25
file: example.zip       # 下载类资源；外链类改用 url
pin: false
tags: [标签1, 标签2]
---

这里是资源的详细说明，支持 Markdown 正文。
```

`file` 与 `url` 二选一；文件大小在构建时自动读取并显示。`date` 是创建时间（不写就取 git 最后提交 / 文件 mtime），`updated` 是更新时间、列表的「更新时间」排序读它（不写就等同创建时间）。

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
- **七个源文件、四个产物，全是「固定文件名的经典脚本」。** `src/client/` 下的 `theme` / `cursor` / `search` / `sort` / `filter-panel` / `fab` / `scrollbar` 不进 Vite 的打包图：进了会被加 hash、变成 module，而主题脚本必须在 `<head>` 里同步跑完（否则首帧闪）。所以由 `scripts/client-scripts.ts` 用 esbuild 单独编译，并按「总是一起加载」分组：`theme.js`（仅 theme）、`cursor.js`（仅独立 404 页）、`ui.js`（cursor + fab + scrollbar + card-popover，全站主页面）、`list.js`（search + sort + filter-panel，两个列表页）—— 少两个 `<script src>`、少两次请求。`vp build` 作为 asset 写出，`vp dev` 用中间件现编译现发，HTML 里的 `./ui.js` 这类引用因此保持稳定。
- **图标一律内联 SVG。** `src/lib/icons.ts` 是唯一来源：24×24、`currentColor`、1.7px 描边、圆头圆角；`{{icon:name}}` / `{{icon:name:class}}` 令牌由 `scripts/icon-tokens.ts`（首页 Vite 入口）和 `replaceIcons()`（博客 / 小窝构建）展开。GitHub 官方 mark 是唯一品牌例外。不再用 emoji（置顶图钉 / 分类图标）或字体字符（RSS / 太阳 / 月亮 / 目录 / 缩进用的 `U+260D`、`U+263C`、`U+263E`、`U+2630`、`U+21E5`）：彩色字形跨平台不一致，也不跟主题色走。
- **图标只留有人用的尺寸。** favicon 只给 32×32（标签页就是它），192 只写 `apple-touch-icon`：桌面 Chrome 看到一条没有 `sizes` 的 `rel="icon"` 会把它当候选去拉，实测白拉 38.4KB。首页签名图补上 `width`，图片到达前后不跳行。
- **材质与尺寸只有 `src/style.css` 一个来源**，页面内联样式只留布局（定位、间距、网格）。
- **动界面必须同时验证深浅两套主题。** 颜色、边框、阴影、文字一律走 token，不在组件里写死色值；改完用 `data-theme="dark"` 与 `"light"` 各看一眼，确认对比度和层次都不塌。硬编码的 `#fff` / `rgba(255,255,255,…)` 只允许出现在「压在 `--primary` 实心上的文字」这类不随主题变化的场景，并且要注释说明理由 —— 筛选胶囊的选中态从实心 `--primary` 换成 `--primary-dim` 之后，原先压在它上面的 `rgba(255,255,255,.82)` 计数色在浅色主题下会直接消失，就是这一类坑。
- **无头浏览器截图要显式模拟指针能力。** headless Chrome 恒报 `hover: none` / `pointer: none`：`@media (hover: hover) and (pointer: fine)` 的分支（卡片 hover 真玻璃）和 `@media (hover: none)` 的补丁（触屏标签填充）都会走错。视觉验收时要么注入样式压掉触屏那条，要么在真机上看 —— 否则会对着错的渲染结果调样式。

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
