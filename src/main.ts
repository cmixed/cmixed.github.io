import projects from './data/projects.json';
import skills from './data/skills.json';
import { chipCols } from './lib/chip-width';
import { cardAttrBadge, cardAttribute, categoryIcon, pinBadge } from './lib/icons';

interface SkillItem {
  name: string;
  project?: string;
}

interface SkillGroup {
  group: string;
  items: SkillItem[];
}

interface Project {
  id: string;
  title: string;
  subtitle: string;
  desc: string;
  url: string;
  /** 实现语言，渲染成卡片右上角的图标 + 文字 */
  language: string;
  /** 运行平台，可选；有它时语言优先显示，平台退到次位 */
  platform?: string;
  tags: string[];
}

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  updated: string;
  tags: string[];
  description: string;
  pinned?: boolean;
}

interface BlogData {
  posts: BlogPost[];
  allTags: string[];
}

interface NookResource {
  id: string;
  title: string;
  category: string;
  file: string | null;
  url: string;
  pin: boolean;
  size: string;
  date: string;
  tags: string[];
  /** 运行平台（Windows / Web…），卡片右上角那颗图标的来源 */
  platform?: string;
  /** 实现语言，可选；有它时优先于平台 */
  language?: string;
  description: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const html = document.documentElement;
const footerStatus = document.getElementById('footerStatus') as HTMLElement;

function updateThemeText(theme: string): void {
  /* 状态条留给「Available for opportunities」：它是人的状态，不是主题状态。
     主题已经在开关和页脚的 © 行里表达，hero 里再写一遍 Light / Dark 只是重复。 */
  footerStatus.textContent = theme === 'light' ? '© 2026 cmixed · Light' : '© 2026 cmixed · Dark';
}

updateThemeText(html.getAttribute('data-theme') || 'dark');

themeToggle.addEventListener('click', () => {
  document.body.classList.add('theme-transitioning');
  try {
    const newTheme = window.toggleTheme();
    updateThemeText(newTheme);
  } finally {
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 300);
  }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  updateThemeText(e.matches ? 'dark' : 'light');
});

const texts = [
  'Modern C++ Developer',
  '职业资格软件设计师',
  'AI & LLM Developer',
  '大规模软件开发初学者',
  'Rust Engineer',
  '性能优化爱好者',
  'Python Developer',
];
let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typeElement = document.getElementById('type-text') as HTMLElement;
const typewriter = document.getElementById('typewriter') as HTMLElement;

/* 这条 setTimeout 链本身永不停止，所以两个开关必须放在循环外面：
   ① prefers-reduced-motion: reduce —— CSS 只压得动 animation / transition，
     管不到 JS 定时器；不短路的话，开了「减少动态效果」的用户照样看到逐字跳动，
     与 README 承诺的降级不符。此时直接写死第一句，不启动循环。
   ② 页面隐藏（切标签 / 最小化）或 hero 滚出视口时停表，重新可见再续上，
      避免后台 / 离屏空转。 */
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let typeTimer = 0;
let typewriterVisible = true;

function type(): void {
  if (document.hidden || !typewriterVisible) {
    typeTimer = 0;
    return;
  }

  const currentText = texts[textIndex];

  if (isDeleting) {
    typeElement.textContent = currentText.substring(0, charIndex - 1);
    charIndex--;
  } else {
    typeElement.textContent = currentText.substring(0, charIndex + 1);
    charIndex++;
  }

  let typeSpeed = isDeleting ? 50 : 100;

  if (!isDeleting && charIndex === currentText.length) {
    typeSpeed = 2000;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    textIndex = (textIndex + 1) % texts.length;
    typeSpeed = 500;
  }

  /* 光标只在真正逐字写 / 删的时候挂出来（.is-typing），两段停顿（2s 换句、
     0.5s 起头）里整根藏掉 —— 一根一直闪的竖线停在原地看着像故障。 */
  typewriter.classList.toggle('is-typing', typeSpeed <= 100);

  typeTimer = window.setTimeout(type, typeSpeed);
}

if (prefersReduced.matches) {
  typeElement.textContent = texts[0];
} else {
  const typewriterObserver = new IntersectionObserver(
    ([entry]) => {
      typewriterVisible = entry.isIntersecting;
      if (!typewriterVisible) {
        window.clearTimeout(typeTimer);
        typeTimer = 0;
        return;
      }
      // 重新进入视口 / 回到前台不立刻补一个字，照常等一个间隔再续
      if (!typeTimer && !document.hidden) typeTimer = window.setTimeout(type, 300);
    },
    { threshold: 0 }
  );
  typewriterObserver.observe(typewriter);

  type();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearTimeout(typeTimer);
      typeTimer = 0;
      return;
    }
    if (!typeTimer && typewriterVisible) typeTimer = window.setTimeout(type, 300);
  });
}

const hamburger = document.getElementById('hamburger') as HTMLButtonElement;
const navLinks = document.querySelector('.nav-links') as HTMLElement;

/* 抽屉开合只有这一个出入口：三个 class 必须同步切，否则汉堡会停成 ×、
   或者 body 还锁着滚动。 */
function setNavOpen(open: boolean): void {
  hamburger.classList.toggle('active', open);
  navLinks.classList.toggle('active', open);
  document.body.classList.toggle('nav-open', open);
  hamburger.setAttribute('aria-expanded', String(open));
}

hamburger.addEventListener('click', () => {
  setNavOpen(!document.body.classList.contains('nav-open'));
});

/* 点抽屉外面任意一处就关 —— 遮罩是 body::before 画的伪元素，没有自己的节点，
   点上去事件 target 是 body，所以只能在 document 上做委托、用「没点进抽屉」判定。
   误触的代价应当等于「关掉」，而不是「什么都没发生」。
   汉堡那颗单独判断：它在遮罩之上（见 CSS 的 body.nav-open nav），click 命中的
   是它自己 —— 先 toggle 成关闭，冒泡到这里时 nav-open 已是 false，直接返回，
   不会关两遍。 */
document.addEventListener('click', (e) => {
  if (!document.body.classList.contains('nav-open')) return;
  const target = e.target as Node | null;
  if (target && (navLinks.contains(target) || hamburger.contains(target))) return;
  setNavOpen(false);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !document.body.classList.contains('nav-open')) return;
  setNavOpen(false);
  hamburger.focus();
});

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => setNavOpen(false));
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (this: HTMLAnchorElement, e: Event) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href')!);
    if (target) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      /* preventDefault 之后浏览器不会自己改 hash：手动写回去，
         否则「跳到个人博客卡片」这个位置既不能分享，前进 / 后退也记不住。 */
      const href = this.getAttribute('href');
      if (href && href.length > 1) history.pushState(null, '', href);
    }
  });
});

function renderProjects(): void {
  const grid = document.getElementById('projectsGrid') as HTMLElement;
  grid.innerHTML = (projects as Project[])
    .map((p) => {
      /* 右上角只留一颗属性：语言优先，其次平台，都没有才回退首个标签。
         项目卡带文字 —— C++20 与 C++23 共用一颗图标，没有文字就分不出来了。 */
      const attr = cardAttribute({
        language: p.language,
        platform: p.platform,
        tags: p.tags,
        withLabel: true,
      });
      return `
        <a href="${escapeHtml(p.url)}" class="project-card" data-card data-project="${escapeHtml(p.id)}" target="_blank" rel="noopener noreferrer">
            <div class="project-header">
                <div>
                    <div class="project-title">${escapeHtml(p.title)}</div>
                    <div class="project-subtitle">${escapeHtml(p.subtitle)}</div>
                </div>
                ${attr ? cardAttrBadge(attr) : ''}
            </div>
            <div class="project-desc">${escapeHtml(p.desc)}</div>
            <div class="project-tech">
                ${p.tags.map((t) => `<span class="tech-tag" style="--chip-cols:${chipCols(t)}">${escapeHtml(t)}</span>`).join('')}<span class="tag-more" hidden></span>
            </div>
            <span class="card-popover" aria-hidden="true">
                <span class="card-popover-body">
                    <span class="card-popover-title">${escapeHtml(p.title)}</span>
                    <span class="card-popover-sub">${escapeHtml(p.subtitle)}</span>
                    <span class="card-popover-desc">${escapeHtml(p.desc)}</span>
                    <span class="card-popover-tags">${p.tags.map((t) => `<span style="--chip-cols:${chipCols(t)}">${escapeHtml(t)}</span>`).join('')}</span>
                </span>
            </span>
        </a>
    `;
    })
    .join('');
}
renderProjects();

/* 技能胶囊：有对应项目的技能渲染成按钮，点一下把页面滚到那张项目卡并短暂高亮。
   不往外跳 —— 个人站的目标是让人把作品看完，而不是把人送去 GitHub；
   项目卡本身就是仓库链接，想走的人点卡片即可，路径没有变长。
   没有单一项目可指的能力（逆向、底层架构等）退回静态胶囊。 */
function renderSkillChip(item: SkillItem): string {
  const label = escapeHtml(item.name);
  if (!item.project) return `<span class="skill-chip">${label}</span>`;
  const project = escapeHtml(item.project);
  return (
    `<button type="button" class="skill-chip is-link" data-project="${project}" ` +
    `title="跳到项目：${project}">${label}</button>`
  );
}

/* 项目卡用稳定的 id（projects.json 的 id）做锚点，而不是拿显示标题当键：
   改标题不会悄悄断掉技能跳转，data 里也能在测试里校验两边是否对得上。 */
let targetCard: HTMLElement | null = null;
let targetTimer = 0;

function focusProject(project: string): void {
  const card = document.querySelector<HTMLElement>(
    `.project-card[data-project="${CSS.escape(project)}"]`
  );
  if (!card) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });

  if (targetCard && targetCard !== card) targetCard.classList.remove('is-target');
  if (targetTimer) window.clearTimeout(targetTimer);
  card.classList.add('is-target');
  /* 视觉上滚过去了还不够：把焦点交给项目卡，键盘 / 读屏用户才知道落点变了，
     也才能直接按 Enter 打开仓库。preventScroll 避免焦点把页面又拽一次。 */
  card.focus({ preventScroll: true });
  targetCard = card;
  targetTimer = window.setTimeout(() => {
    card.classList.remove('is-target');
    if (targetCard === card) targetCard = null;
    targetTimer = 0;
  }, 1800);
}

function renderSkills(): void {
  const container = document.getElementById('skillsContainer') as HTMLElement;
  container.innerHTML = (skills as SkillGroup[])
    .map(
      ({ group, items }) => `
        <div class="skill-group">
            <div class="skill-group-title">${escapeHtml(group)}</div>
            <div class="skill-group-items">
                ${items.map(renderSkillChip).join('')}
            </div>
        </div>`
    )
    .join('');

  /* 事件委托：18 颗胶囊只挂一个监听，重渲染也不会留下旧监听 */
  container.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const chip = target.closest<HTMLButtonElement>('.skill-chip[data-project]');
    if (!chip) return;
    focusProject(chip.dataset.project ?? '');
  });
}
renderSkills();

/* ===== 站点速览 =====
   「关于」和「项目」之间那条小字：只报内容规模（项目 / 文章 / 资源）。
   项目数来自打包进来的 projects.json；文章 / 资源数跟着各自的预览数据一起到货。
   提交信息不放这里 —— 完整记录在「更新日志」里，到货一项填一项，全空时不占位。 */
interface StatsView {
  projects?: number;
  posts?: number;
  resources?: number;
}

const statsView: StatsView = { projects: (projects as Project[]).length };

function renderSiteStats(): void {
  const host = document.getElementById('siteStats');
  if (!host) return;
  const v = statsView;
  const counts: string[] = [];
  if (v.projects !== undefined) counts.push(`<b>${v.projects}</b> 置顶项目`);
  if (v.posts !== undefined) counts.push(`<b>${v.posts}</b> 博客文章`);
  if (v.resources !== undefined) counts.push(`<b>${v.resources}</b> 个人资源`);
  // 提交信息不放这里：完整记录在「更新日志」里，速览条只报内容规模。
  const dot = ' <span class="footer-dot" aria-hidden="true">·</span> ';
  host.innerHTML = counts.join(dot);
  host.hidden = counts.length === 0;
}

renderSiteStats();

// Blog preview on main page
async function loadBlogPreview(): Promise<void> {
  try {
    const base = import.meta.env.MODE === 'production' ? './' : '/';
    // no-store：置顶 / 新文章是构建时写进 data.json 的，不能吃浏览器缓存，
    // 否则推上去后首页还会显示上一次的置顶。
    const res = await fetch(base + 'blog/data.json', { cache: 'no-store' });
    const data: BlogData = await res.json();
    statsView.posts = data.posts.length;
    renderSiteStats();
    // 固定取前 6 篇（构建时已经是「置顶按更新时间 → 普通按创建时间」）。
    // 6 在 2 列网格里正好排满 3 行；不取全部，是因为置顶一多首页会被无限撑长。
    const preview = data.posts.slice(0, 6);
    const grid = document.getElementById('blogPreviewGrid') as HTMLElement;
    grid.innerHTML = preview
      .map((p) => {
        // 标签只占一行（放不下的由 card-popover.ts 收成 +N），浮窗里要的是完整一份
        const tagsHtml = p.tags
          .map((t) => `<span style="--chip-cols:${chipCols(t)}">${escapeHtml(t)}</span>`)
          .join('');
        const pinMark = p.pinned ? pinBadge() : '';
        return `
            <a href="blog/${encodeURIComponent(p.slug)}.html" class="blog-preview-card${p.pinned ? ' blog-preview-card-pin' : ''}" data-card>
                <div class="blog-preview-card-head">
                    <div class="blog-preview-card-title">${pinMark}${escapeHtml(p.title)}</div>
                </div>
                <div class="blog-preview-card-desc">${escapeHtml(p.description)}</div>
                <div class="blog-preview-card-footer">
                    <div class="blog-preview-card-tags">
                        ${tagsHtml}<span class="tag-more" hidden></span>
                    </div>
                    <div class="blog-preview-card-meta">创建于 ${escapeHtml(p.date)} · 更新于 ${escapeHtml(p.updated)}</div>
                </div>
                <span class="card-popover" aria-hidden="true">
                    <span class="card-popover-body">
                        <span class="card-popover-title">${escapeHtml(p.title)}</span>
                        <span class="card-popover-desc">${escapeHtml(p.description)}</span>
                        <span class="card-popover-tags">${tagsHtml}</span>
                        <span class="card-popover-meta">创建于 ${escapeHtml(p.date)} · 更新于 ${escapeHtml(p.updated)}</span>
                    </span>
                </span>
            </a>
        `;
      })
      .join('');
  } catch {
    (document.getElementById('blogPreviewGrid') as HTMLElement).innerHTML = '';
  }
}
void loadBlogPreview();

// Nook preview on main page
async function loadNookPreview(): Promise<void> {
  try {
    const base = import.meta.env.MODE === 'production' ? './' : '/';
    // 和博客预览一样不吃缓存：资源置顶 / 新增资源应在刷新后立刻出现。
    const res = await fetch(base + 'nook/data.json', { cache: 'no-store' });
    const data = await res.json();
    statsView.resources = data.resources.length;
    renderSiteStats();
    const sorted = data.resources.sort((a: NookResource, b: NookResource) => {
      if (a.pin !== b.pin) return a.pin ? -1 : 1;
      return b.date.localeCompare(a.date);
    });
    const preview = sorted.slice(0, 8);
    const grid = document.getElementById('nookPreviewGrid') as HTMLElement;
    const CATEGORY_NAMES: Record<string, string> = {
      doc: '文档',
      tool: '工具',
      code: '代码',
      website: '网站',
    };
    grid.innerHTML = preview
      .map((r: NookResource) => {
        const catIcon = categoryIcon(r.category);
        const catName = CATEGORY_NAMES[r.category] || r.category;
        const pinMark = r.pin ? pinBadge() : '';
        /* 资源卡右上角：平台 / 语言只出图标（用户要求「文字不要」），
           没有就回退首个标签。分类胶囊仍留在最右，两者并排 —— 纯图标体积小，
           一个说明「这是什么类型的资源」，一个说明「它跑在哪」，不冲突。 */
        const attr = cardAttribute({
          language: r.language,
          platform: r.platform,
          tags: r.tags,
          withLabel: false,
        });
        const tagsHtml = r.tags
          .map((t: string) => `<span style="--chip-cols:${chipCols(t)}">${escapeHtml(t)}</span>`)
          .join('');
        return `
            <a href="nook/${encodeURIComponent(r.id)}.html" class="nook-preview-card${r.pin ? ' nook-preview-card-pin' : ''}" data-card>
                <div class="nook-preview-card-header">
                    <div class="nook-preview-card-title">${pinMark}${escapeHtml(r.title)}</div>
                    ${attr ? cardAttrBadge(attr) : ''}
                    <span class="nook-preview-card-category">${catIcon}<span class="chip-text">${catName}</span></span>
                </div>
                <div class="nook-preview-card-desc">${escapeHtml(r.description)}</div>
                <div class="nook-preview-card-footer">
                    <div class="nook-preview-card-tags">
                        ${tagsHtml}<span class="tag-more" hidden></span>
                    </div>
                    <div class="nook-preview-card-meta">${escapeHtml(r.size)} · ${escapeHtml(r.date)}</div>
                </div>
                <span class="card-popover" aria-hidden="true">
                    <span class="card-popover-body">
                        <span class="card-popover-title">${escapeHtml(r.title)}</span>
                        <span class="card-popover-desc">${escapeHtml(r.description)}</span>
                        <span class="card-popover-tags">${tagsHtml}</span>
                        <span class="card-popover-meta">${escapeHtml(r.size)} · ${escapeHtml(r.date)}</span>
                    </span>
                </span>
            </a>
        `;
      })
      .join('');
  } catch {
    (document.getElementById('nookPreviewGrid') as HTMLElement).innerHTML = '';
  }
}
void loadNookPreview();

const observerOptions: IntersectionObserverInit = {
  threshold: 0.05,
  rootMargin: '0px 0px -30px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.fade-in-item').forEach((el) => {
        el.classList.add('visible');
      });
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('#skills, #projects, #blog-preview, #nook-preview').forEach((section) => {
  section.querySelectorAll('.project-card, .skill-chip').forEach((el) => {
    el.classList.add('fade-in-item');
  });
  observer.observe(section);
});

/* Scroll progress bar
   只写 transform、不碰布局；页面总高缓存起来，只在窗口 / 内容高度变化时重算。
   不能每次 scroll 都读 scrollHeight：主页 5 个区块是 content-visibility: auto，
   未进视口的区块只按估算高度占位，读 scrollHeight 会迫使浏览器先把布局算准；
   滚动事件每秒几十上百次，这个读取就成了滚动时的固定成本。与 client/scrollbar.ts
   同一条约定：滚动回调里只读 scrollTop、只写 transform。 */
const scrollProgress = document.createElement('div');
scrollProgress.className = 'scroll-progress';
document.body.prepend(scrollProgress);

let progressMax = 0;
let progressQueued = false;
let progressDirty = true;

function measureProgress(): void {
  progressMax = html.scrollHeight - html.clientHeight;
  progressDirty = false;
}

function paintProgress(): void {
  progressQueued = false;
  if (progressDirty) measureProgress();
  const progress = progressMax > 0 ? html.scrollTop / progressMax : 0;
  scrollProgress.style.transform = `scaleX(${progress})`;
}

/* 一帧内的多次 scroll 合并成一次写入：事件频率不等于帧率。
   resize / ResizeObserver 只标脏，把 scrollHeight 的读取也合并到这一帧，
   不在 observer 回调里同步读布局。 */
function queueProgress(measure = false): void {
  if (measure) progressDirty = true;
  if (progressQueued) return;
  progressQueued = true;
  requestAnimationFrame(paintProgress);
}

measureProgress();
paintProgress();

window.addEventListener('scroll', () => queueProgress(), { passive: true });
window.addEventListener('resize', () => queueProgress(true), { passive: true });

// 图片解码、异步插入的预览卡、区块展开都会改变总高；只观察 body 尺寸，
// scrollHeight 的读取合并到下一帧，不在 observer 回调里同步读布局。
if ('ResizeObserver' in window) {
  new ResizeObserver(() => queueProgress(true)).observe(document.body);
}

/* ===== 页脚悬浮框（关于本站 / 更新日志） =====
   内容来自构建期生成的两份 JSON（见 scripts/site-meta.ts）：
   - site-about.json   README 渲染结果（gzip 约 14KB）
   - site-commits.json 提交记录（gzip 约 8.5KB）
   拆成两份是因为两个入口互不相干：点「关于本站」不该顺带下载 281 条提交
   （合成一份时首次打开要等 68.8KB / gzip 22.7KB 走完才渲染）。
   下载时机：
   - 模块一执行就并行预取两份（不等 load、不等 idle —— 用户常在 1s 内点击）
   - 入口被悬停 / 按下 / 键盘聚焦时再预热一次（极慢网下的补救，请求会去重）
   - 省流量模式（saveData）下不预取，点开时才下载
   缓存：
   - 内存：本次页面内只请求一次
   - localStorage（stale-while-revalidate）：跨会话，先同步渲染上次的内容，
     后台再刷新；新内容到了，如果用户还停在顶部、且刚打开不到 1.5s，才原地替换
   打开时数据如果已经到了，直接同步渲染 —— 连「载入中…」那一帧都不会出现。
   悬浮框本体是原生 <dialog>，ESC、焦点陷阱、遮罩、关闭后焦点归位都由浏览器负责。 */
interface ChangelogEntry {
  hash: string;
  date: string;
  /** 恒来自 AGENTS.md 的固定词表，构建期硬校验 */
  type: string;
  scope: string | null;
  subject: string;
}

/** 关于本站里的一条目录跳转（构建期从 README 的节标题挑出来）。 */
interface AboutNavItem {
  id: string;
  label: string;
}

interface AboutData {
  html: string;
  updated: string | null;
  /** 标题栏右侧的目录跳转；旧缓存里可能没有 */
  nav?: AboutNavItem[];
}

interface QuarterStatsView {
  commits: number;
  days: number;
  from: string;
  to: string;
  topTypes: Array<{ type: string; count: number }>;
}

interface QuarterSummaryView {
  headline: string;
  body: string;
  highlights: string[];
  stats: QuarterStatsView;
}

interface CommitsData {
  changelog: ChangelogEntry[];
  total: number;
  repo: string | null;
  /** 只有「已过完且写过总结」的季度；进行中的季度不在这里 */
  summaries: Record<string, QuarterSummaryView>;
  /** 还没过完的季度：页面上显示「进行中」占位公告，不触发补写提醒 */
  inProgress?: string[];
  /** 进行中季度的统计（提交数 / 活跃日 / 类型分布）：编译期算，不依赖人工总结 */
  liveStats?: Record<string, QuarterStatsView>;
  /** 「进行中」公告的文案，透传自 quarter-summaries.json 的 defaults.inProgress */
  inProgressNotice?: QuarterNoticeView | null;
}

/** 「进行中」占位公告的文案（数据层 defaults.inProgress 透传过来）。 */
interface QuarterNoticeView {
  headline: string;
  body: string;
}

type MetaKind = 'about' | 'changelog';

const META_HASH: Record<MetaKind, string> = { about: 'about-site', changelog: 'changelog' };
const META_TITLE: Record<MetaKind, string> = { about: '关于本站', changelog: '更新日志' };
const CHANGELOG_STEP = 80;
const META_BASE = import.meta.env.MODE === 'production' ? './' : '/';

/**
 * 一份 JSON 的「两层缓存 + 单飞请求」。
 * - 内存：页面打开期间只有一份；
 * - localStorage：跨会话。GitHub Pages 的 Cache-Control 只有 10 分钟，过了就要重新
 *   走网络；而「打开页面立刻点」等不了那一次往返，所以先拿上一次的内容顶上
 *   （stale-while-revalidate），新版本到了再换。
 * peek 让 openMeta 判断能不能同步渲染；isStale 表示这份来自磁盘、值得后台刷新。
 * 失败不缓存，下次点开还能重试。
 */
interface StoredMeta<T> {
  savedAt: number;
  data: T;
}

const META_STORE_PREFIX = 'site-meta:';

function readStoredMeta<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(META_STORE_PREFIX + key);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredMeta<T>;
    // 结构不对就当没有：宁可多等一次网络，也不要拿坏数据去渲染
    if (!stored || typeof stored.savedAt !== 'number' || !stored.data) return null;
    return stored.data;
  } catch {
    return null; // 隐私模式、配额满、坏 JSON：都退化成「没有缓存」
  }
}

function writeStoredMeta<T>(key: string, data: T): void {
  try {
    localStorage.setItem(META_STORE_PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* 写不进去就算了，下一次还是走网络 */
  }
}

function createMetaLoader<T>(
  file: string,
  storeKey: string
): { peek: () => T | null; isStale: () => boolean; load: () => Promise<T> } {
  let data: T | null = null;
  let stale = false;
  let request: Promise<T> | null = null;
  return {
    peek: () => {
      if (!data) {
        data = readStoredMeta<T>(storeKey);
        stale = data !== null;
      }
      return data;
    },
    isStale: () => stale,
    load(): Promise<T> {
      if (request) return request;
      if (data && !stale) return Promise.resolve(data);
      request = fetch(META_BASE + file, { priority: 'low' })
        .then((res) => {
          if (!res.ok) throw new Error(`${file} ${res.status}`);
          return res.json() as Promise<T>;
        })
        .then(
          (json) => {
            data = json;
            stale = false;
            writeStoredMeta(storeKey, json);
            return json;
          },
          (error: unknown) => {
            request = null;
            throw error;
          }
        );
      return request;
    },
  };
}

const aboutMeta = createMetaLoader<AboutData>('site-about.json', 'about:v2');
/* v3 → v4：2026-11-15 重写了全部 401 条历史的 hash，旧缓存里的每一行都指向
   不存在的提交。换存储键，避免存量访客先渲染一帧旧数据再被后台刷新替换。 */
const commitsMeta = createMetaLoader<CommitsData>('site-commits.json', 'commits:v4');
const META_LOAD: Record<MetaKind, () => Promise<AboutData | CommitsData>> = {
  about: () => aboutMeta.load(),
  changelog: () => commitsMeta.load(),
};

const metaDialog = document.getElementById('siteModal') as HTMLDialogElement | null;
const metaTitle = document.getElementById('siteModalTitle') as HTMLElement | null;
const metaSub = document.getElementById('siteModalSub') as HTMLElement | null;
const metaBody = document.getElementById('siteModalBody') as HTMLElement | null;
const metaActions = document.getElementById('siteModalActions') as HTMLElement | null;
const metaClose = document.getElementById('siteModalClose') as HTMLButtonElement | null;

let changelogShown = CHANGELOG_STEP;
/** 最近一次渲染用的完整数据：点一个还没渲染的季度时，要靠它把内容补齐 */
let changelogData: CommitsData | null = null;
/** 已写进标题栏的胶囊清单（弹窗类型 + 各项）：不变就不重建，避免点一下焦点就丢。
    带上类型是必须的 —— 两个弹窗共用这块 DOM，只比清单本身的话，
    切过去而清单恰好相同（或两个都为空）时会留着上一个弹窗的按钮。 */
let actionsKey = '';

/** 当前弹窗是哪一个：滚动同步要知道该亮季度标签还是目录跳转点。 */
let metaKind: MetaKind = 'about';
/** 打开前的 hash 位置：关闭时还回去，不至于把用户滚到别的锚点这件事弄丢 */
let metaReturnHash = '';

/** 锁住背景滚动（细节见 style.css 里 html.modal-open 的注释） */
function lockScroll(): void {
  document.documentElement.classList.add('modal-open');
}

function unlockScroll(): void {
  document.documentElement.classList.remove('modal-open');
}

/** 省流量模式下不预取：用户显式点开时再下载。 */
function prefetchAllowed(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !connection?.saveData;
}

/** 预热：只把请求发出去，结果留在 loader 的缓存里；失败静默（点开时会再试）。 */
function prefetchMeta(kind: MetaKind): void {
  if (!prefetchAllowed()) return;
  void META_LOAD[kind]().catch(() => {
    /* 预取失败不需要打扰用户 */
  });
}

/* 一上来就并行拉两份，不等 load、也不等空闲。
   以前是 load → requestIdleCallback(timeout 2500) → 关于本站 → 再一个 idle → 更新日志：
   load 本身要等首页所有图片，rIC 又要等主线程空闲，而用户经常在 1s 内就点开，
   于是「点的时候两份文件都还没开始下载」—— 这才是首点几秒的来源（渲染只要几十毫秒）。
   两份合计 gzip ≈ 28KB，比首屏任何一张图都小，且是异步请求，不阻塞渲染；
   fetch 用 low priority，避免和首屏的头像 / 签名图抢带宽。
   saveData 下仍然不预取（见 prefetchAllowed），点开时才下载。 */
if (prefetchAllowed()) {
  prefetchMeta('about');
  prefetchMeta('changelog');
}

/** `2026-08-14` → `26Q3`：两位年份 + 季度。 */
function quarterOf(date: string): string {
  const [year = '', month = '1'] = date.split('-');
  return `${year.slice(2)}Q${Math.floor((Number(month) - 1) / 3) + 1}`;
}

/**
 * 季度总结卡片（已过完且写过总结）或「进行中」占位公告（还没过完）。
 * 文案全部来自构建期的 `site-commits.json`：总结来自 quarter-summaries.json
 * 的季度条目，公告来自其中的 defaults.inProgress —— 这里只做渲染，不内置文案。
 * 每个季度段只调一次，日期分组里不重复插。
 */
function quarterSummaryHtml(
  quarter: string,
  summary: QuarterSummaryView | undefined,
  meta: Pick<CommitsData, 'inProgress' | 'inProgressNotice' | 'liveStats'>
): string {
  if (!summary) {
    const notice = meta.inProgressNotice;
    if (!meta.inProgress?.includes(quarter) || !notice) return '';
    /* 总结是人工的、统计不是：进行中的季度照样把编译期算好的数字摊出来，
       否则这一块只剩一句「还没写」，等于白占一屏。 */
    const live = meta.liveStats?.[quarter];
    const types = live?.topTypes
      ?.map((item) => `${escapeHtml(item.type)} ${item.count}`)
      .join(' · ');
    const statsLine = live
      ? `<div class="changelog-summary-stats">${live.commits} 次提交 · ${live.days} 个活跃日${
          types ? ` · ${types}` : ''
        }</div>`
      : '';
    return `<article class="changelog-summary is-in-progress">
      <div class="changelog-summary-head">
        <span class="changelog-summary-tag">季度进行中 · ${escapeHtml(quarter)}</span>
        ${
          live
            ? `<span class="changelog-summary-range">${escapeHtml(live.from)} — ${escapeHtml(live.to)}</span>`
            : ''
        }
      </div>
      <h3 class="changelog-summary-title">${escapeHtml(notice.headline)}</h3>
      <p>${escapeHtml(notice.body)}</p>
      ${statsLine}
    </article>`;
  }
  const { stats } = summary;
  const types = stats.topTypes.map((item) => `${escapeHtml(item.type)} ${item.count}`).join(' · ');
  const points = summary.highlights.map((text) => `<li>${escapeHtml(text)}</li>`).join('');
  return `<article class="changelog-summary">
      <div class="changelog-summary-head">
        <span class="changelog-summary-tag">季度总结 · ${escapeHtml(quarter)}</span>
        <span class="changelog-summary-range">${escapeHtml(stats.from)} — ${escapeHtml(stats.to)}</span>
      </div>
      <h3 class="changelog-summary-title">${escapeHtml(summary.headline)}</h3>
      <p>${escapeHtml(summary.body)}</p>
      <ul class="changelog-summary-points">${points}</ul>
      <div class="changelog-summary-stats">${stats.commits} 次提交 · ${stats.days} 个活跃日 · ${types}</div>
    </article>`;
}

function changelogItem(entry: ChangelogEntry, repo: string | null): string {
  /* 行首定长的 commit 编号 → 正文 → 末尾右对齐的分类标签。
     hash 定宽，正文左缘就不再随 type 标签宽度漂移；构建期已按 AGENTS.md
     硬校验，每条都有类型标签，不需要展示层兜底。 */
  const typeLabel = entry.scope ? `${entry.type}/${entry.scope}` : entry.type;
  const inner = `<span class="changelog-hash">${escapeHtml(entry.hash)}</span><span class="changelog-subject">${escapeHtml(entry.subject)}</span><span class="changelog-type">${escapeHtml(typeLabel)}</span>`;
  if (!repo) return `<li><div class="changelog-item">${inner}</div></li>`;
  return `<li><a class="changelog-item" href="${escapeHtml(
    `${repo}/commit/${entry.hash}`
  )}" target="_blank" rel="noopener noreferrer">${inner}</a></li>`;
}

/**
 * 让标题栏里的季度高亮跟着滚动走。
 *
 * 判定线取「正文顶部往下 24px」：某个季度段的上边缘越过这条线，它就是当前段。
 * 只读 rect、不写样式，滚动里每帧最多跑一次（下面做了 rAF 合帧）。
 */
function syncQuarterTabs(): void {
  if (!metaBody || !metaActions) return;
  const groups = metaBody.querySelectorAll<HTMLElement>('.changelog-quarter-group');
  if (groups.length === 0) return;
  const line = metaBody.getBoundingClientRect().top + 24;
  /* 滚到底时最后一个季度未必能顶到判定线（它内容可能很短、滚动条先到底），
     这时直接把它算作当前段，否则点最后一个标签高亮会停在倒数第二个上。 */
  const atBottom = metaBody.scrollTop + metaBody.clientHeight >= metaBody.scrollHeight - 2;
  let current = atBottom ? groups[groups.length - 1].id.slice(2) : groups[0].id.slice(2);
  if (!atBottom) {
    for (const group of groups) {
      if (group.getBoundingClientRect().top <= line) current = group.id.slice(2);
      else break;
    }
  }
  metaActions.querySelectorAll<HTMLElement>('.meta-chip[data-quarter]').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.quarter === current);
  });
}

/**
 * 跳到某个季度。
 *
 * 用 scrollTop 自己算目标位置，不用 scrollIntoView —— 后者会连带滚动祖先
 * （页面本身也跟着动一下），落点也算不准。
 * 按天虚拟化的段落（.changelog-day）在没进过视口时只有 340px 的估算高度：
 * 直接算出来的目标会被夹在几百像素处，滚动途中内容一节节撑开，于是停在半路
 * （实测 26Q4 → 26Q2 只滚到 925px，目标在 12700px）。量之前先临时展开全部段落，
 * 量到真实高度再滚；两帧后撤掉类，虚拟化照旧，auto 已记住真实高度不会缩回去。
 * 超过一屏半的距离用平滑滚动要好几秒，看着像没反应，直接瞬移。
 */
function scrollToQuarter(quarter: string): void {
  if (!metaBody) return;
  const section = metaBody.querySelector<HTMLElement>(`#q-${quarter}`);
  if (!section) return;

  metaBody.classList.add('is-measuring');
  const measure = (): number =>
    metaBody.scrollTop +
    section.getBoundingClientRect().top -
    metaBody.getBoundingClientRect().top -
    8;
  const target = measure();
  const far = Math.abs(target - metaBody.scrollTop) > metaBody.clientHeight * 1.5;
  metaBody.scrollTo({ top: target, behavior: far ? 'auto' : 'smooth' });

  requestAnimationFrame(() => {
    /* 展开后各段真实高度与估算值差几像素，落点再校一次（不循环） */
    if (far) {
      const corrected = measure();
      if (Math.abs(corrected - metaBody.scrollTop) > 4) {
        metaBody.scrollTo({ top: corrected, behavior: 'auto' });
      }
    }
    requestAnimationFrame(() => metaBody?.classList.remove('is-measuring'));
  });
  if (far) syncQuarterTabs();
}

/**
 * 关于本站的目录高亮跟着滚动走（和季度标签同一套判定线）。
 * 只在「有跳转点的节」里找当前节 —— 中间隔着没跳转点的短节时，
 * 高亮停在最近越过判定线的那条跳转点上，不会全灭。
 */
function syncAboutTabs(): void {
  if (!metaBody || !metaActions) return;
  const sections = [...metaActions.querySelectorAll<HTMLElement>('.meta-chip[data-target]')]
    .map((chip) => metaBody.querySelector<HTMLElement>(`#${chip.dataset.target ?? ''}`))
    .filter((el): el is HTMLElement => el !== null);
  if (sections.length === 0) return;
  const line = metaBody.getBoundingClientRect().top + 24;
  const atBottom = metaBody.scrollTop + metaBody.clientHeight >= metaBody.scrollHeight - 2;
  let current = atBottom ? sections[sections.length - 1].id : sections[0].id;
  if (!atBottom) {
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= line) current = section.id;
      else break;
    }
  }
  metaActions.querySelectorAll<HTMLElement>('.meta-chip[data-target]').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.target === current);
  });
}

/**
 * 跳到关于本站的某一节。
 *
 * 离屏的节在虚拟化下只有 550px 的估算高度，直接量会把目标夹在半路。
 * 所以先临时展开全部节跑一次布局、撤掉虚拟化，再量第二次：
 *   - 第一次只是让每节真的渲染一遍（同一帧内进出，浏览器不会绘制，看不到变化）；
 *   - 展开后各节的 contain-intrinsic-size: auto 会记住自己的真实高度，
 *     第二次量到的就是最终几何 —— 直接滚过去就准，不必滚动途中再校正。
 * 顺序不能反：先量后撤（而不是等滚完再校正），否则每节 16px 的差会累积成
 * 十几到几十像素的落点偏差（实测前三节分别差 16 / 32 / 48px）。
 */
function scrollToSection(id: string): void {
  if (!metaBody) return;
  const section = metaBody.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (!section) return;

  const measure = (): number =>
    metaBody.scrollTop +
    section.getBoundingClientRect().top -
    metaBody.getBoundingClientRect().top -
    8;

  metaBody.classList.add('is-measuring');
  measure();
  metaBody.classList.remove('is-measuring');
  const target = measure();

  const far = Math.abs(target - metaBody.scrollTop) > metaBody.clientHeight * 1.5;
  metaBody.scrollTo({ top: target, behavior: far ? 'auto' : 'smooth' });
  if (far) syncAboutTabs();
}

/**
 * 目标季度还没渲染就先把内容补出来。
 *
 * 默认只渲染最近 CHANGELOG_STEP 条，更早的季度根本不在 DOM 里 ——
 * 点标签时直接把剩余条目全部补出来。只补到「该季度第一条」是不够的：
 * 最后一个季度往往只剩十几条，滚动条会先到底，标题没法推到顶部
 * （实测目标 16.7k 被夹在 16.0k，季度标题停在视口下方 489px）。
 * 这里全是纯文本行，359 条一起排也就几十毫秒，比维护增量加载划算。
 */
function ensureQuarter(quarter: string): void {
  if (!metaBody || !changelogData) return;
  if (metaBody.querySelector(`#q-${quarter}`)) return;
  const exists = changelogData.changelog.some((entry) => quarterOf(entry.date) === quarter);
  if (!exists) return;
  changelogShown = changelogData.changelog.length;
  renderChangelog(changelogData);
}

/* 季度/目录按钮常驻在标题行，不随正文重渲染消失，所以事件只绑一次。
   绑在容器上做委托，重建按钮也不用重新绑。 */
metaActions?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLElement>('.meta-chip');

  /* 关于本站：按节跳转 */
  const sectionId = button?.dataset.target;
  if (sectionId) {
    scrollToSection(sectionId);
    return;
  }

  /* 更新日志：按季度跳转 */
  const quarter = button?.dataset.quarter;
  if (!quarter) return;
  ensureQuarter(quarter);
  /* 补内容会重置滚动位置，等下一帧布局稳定再跳 */
  requestAnimationFrame(() => scrollToQuarter(quarter));
});

/* 滚动时同步高亮。只读 rect、rAF 合帧，滚动里不写样式也不触发重排 */
let scrollFrame = 0;
metaBody?.addEventListener(
  'scroll',
  () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      /* 标题栏里的胶囊两个弹窗共用：同一时刻只有一种跳转点，按当前弹窗分流 */
      if (metaKind === 'about') syncAboutTabs();
      else syncQuarterTabs();
    });
  },
  { passive: true }
);

function renderChangelog(meta: CommitsData): void {
  if (!metaBody) return;
  changelogData = meta;
  const entries = meta.changelog.slice(0, changelogShown);
  if (entries.length === 0) {
    if (metaSub) metaSub.textContent = '';
    if (metaActions) metaActions.innerHTML = '';
    actionsKey = '';
    metaBody.innerHTML = '<p class="changelog-empty">没有可显示的提交记录。</p>';
    return;
  }
  if (metaSub) {
    metaSub.textContent =
      entries.length < meta.total
        ? `共 ${meta.total} 条提交 · 显示最近 ${entries.length} 条`
        : `共 ${meta.total} 条提交 · 全部显示`;
  }
  /* 先按季度分段，段内再按日期 —— 提交通常跨年，直接按日期铺开就是一长串没有层级的列表 */
  const byQuarter = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const quarter = quarterOf(entry.date);
    const bucket = byQuarter.get(quarter);
    if (bucket) bucket.push(entry);
    else byQuarter.set(quarter, [entry]);
  }

  /* 标题栏列的是**全部**季度（含还没渲染的）：先让人看到「日志能回到哪一年」，
     点一个没渲染的季度时再由 ensureQuarter 补内容。清单不变就不重建按钮。 */
  const allQuarters = Array.from(new Set(meta.changelog.map((entry) => quarterOf(entry.date))));
  const key = `changelog|${allQuarters.join('|')}`;
  if (metaActions && key !== actionsKey) {
    actionsKey = key;
    metaActions.setAttribute('aria-label', '按季度跳转');
    metaActions.innerHTML = allQuarters
      .map(
        (quarter) =>
          `<button type="button" class="meta-chip" data-quarter="${quarter}">${quarter}</button>`
      )
      .join('');
  }

  const groupsHtml = Array.from(byQuarter, ([quarter, list]) => {
    const days = new Map<string, ChangelogEntry[]>();
    for (const entry of list) {
      const day = days.get(entry.date);
      if (day) day.push(entry);
      else days.set(entry.date, [entry]);
    }
    const items = Array.from(days, ([date, dayEntries]) => {
      const rows = dayEntries.map((entry) => changelogItem(entry, meta.repo)).join('');
      return `<div class="changelog-day"><div class="changelog-date"><span>${escapeHtml(
        date
      )}</span></div><ul class="changelog-list">${rows}</ul></div>`;
    }).join('');
    return `<section class="changelog-quarter-group" id="q-${quarter}"><div class="changelog-quarter-title"><span class="changelog-quarter-chip">${quarter}</span></div>${quarterSummaryHtml(
      quarter,
      meta.summaries?.[quarter],
      meta
    )}${items}</section>`;
  }).join('');

  metaBody.innerHTML = groupsHtml;
  /* 同理延到下一帧：渲染发生在 showModal 之前，当场量高度只会量到 0 */
  requestAnimationFrame(syncQuarterTabs);

  if (entries.length < meta.changelog.length) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'changelog-more';
    more.textContent = `展开更多（还有 ${meta.changelog.length - entries.length} 条）`;
    more.addEventListener('click', () => {
      const top = metaBody.scrollTop;
      changelogShown += CHANGELOG_STEP;
      renderChangelog(meta);
      metaBody.scrollTop = top;
    });
    metaBody.appendChild(more);
  }
}

function renderAbout(meta: AboutData): void {
  const body = metaBody;
  if (!body) return;

  /* 标题栏右侧换成目录跳转点：和更新日志的季度标签同一套胶囊，
     清单不变就不重建 —— 后台刷新回来重渲染时，点过的那颗不会丢焦点。 */
  const nav = meta.nav ?? [];
  const key = `about|${nav.map((item) => `${item.id}:${item.label}`).join('|')}`;
  if (metaActions && key !== actionsKey) {
    actionsKey = key;
    metaActions.setAttribute('aria-label', '按章节跳转');
    metaActions.innerHTML = nav
      .map(
        (item) =>
          `<button type="button" class="meta-chip" data-target="${escapeHtml(
            item.id
          )}">${escapeHtml(item.label)}</button>`
      )
      .join('');
  }

  if (metaSub) {
    metaSub.textContent = meta.updated ? `README.md · 更新于 ${meta.updated}` : 'README.md';
  }
  // 构建期渲染、只来自仓库自己的 README，可以直接当 HTML 插入
  body.innerHTML = meta.html;
  /* 高亮延到下一帧：此刻弹窗还没 showModal（openMeta 先渲染再开），
     clientHeight / scrollHeight 都是 0，会被判成「已滚到底」而点亮最后一颗。
     滚动位置也由 openMeta 在 showModal 之后复位（弹窗关着时设 scrollTop 无效）。 */
  requestAnimationFrame(syncAboutTabs);
}

function renderMeta(kind: MetaKind, data: AboutData | CommitsData): void {
  metaKind = kind;
  if (kind === 'about') {
    renderAbout(data as AboutData);
    return;
  }
  changelogShown = CHANGELOG_STEP;
  renderChangelog(data as CommitsData);
}

/** 两份内容是否相同：后台刷新回来时用它决定要不要重渲染（避免白闪一次）。 */
function sameMeta(kind: MetaKind, a: AboutData | CommitsData, b: AboutData | CommitsData): boolean {
  if (kind === 'about') {
    const before = a as AboutData;
    const after = b as AboutData;
    const navKey = (data: AboutData): string =>
      (data.nav ?? []).map((item) => `${item.id}:${item.label}`).join('|');
    return (
      before.html === after.html &&
      before.updated === after.updated &&
      navKey(before) === navKey(after)
    );
  }
  const before = a as CommitsData;
  const after = b as CommitsData;
  /* 总结的键、进行中的季度和公告文案都要比：季度过完、新增一条总结或改了
     公告文案但提交没变时，后台刷新回来仍要重渲染，否则要等下次打开才看得到。 */
  const summaryKeys = (data: CommitsData): string =>
    Object.keys(data.summaries ?? {})
      .sort()
      .join('|');
  const progressKeys = (data: CommitsData): string =>
    `${(data.inProgress ?? []).join('|')}␝${data.inProgressNotice?.headline ?? ''}␝${data.inProgressNotice?.body ?? ''}`;
  return (
    before.total === after.total &&
    before.repo === after.repo &&
    before.changelog.length === after.changelog.length &&
    /* 不只比 hash：解析规则调整后 hash 不变、type / subject 变了，
       后台刷新拿到的新数据也要触发重渲染，否则要等下一次换缓存键。 */
    before.changelog.every(
      (entry, i) =>
        entry.hash === after.changelog[i]?.hash &&
        entry.type === after.changelog[i]?.type &&
        entry.subject === after.changelog[i]?.subject
    ) &&
    summaryKeys(before) === summaryKeys(after) &&
    progressKeys(before) === progressKeys(after)
  );
}

async function openMeta(kind: MetaKind): Promise<void> {
  if (!metaDialog || !metaBody) return;
  const cached = kind === 'about' ? aboutMeta.peek() : commitsMeta.peek();
  const stale = kind === 'about' ? aboutMeta.isStale() : commitsMeta.isStale();
  // 先发请求、再开弹窗：弹窗的第一帧不等网络。
  // 命中内存时连「载入中…」都不写，直接同步渲染，视觉上没有任何过渡；
  // 命中 localStorage 时也先渲染，同时发请求做一次后台刷新（stale-while-revalidate）。
  const pending = !cached || stale ? META_LOAD[kind]() : null;

  if (metaTitle) metaTitle.textContent = META_TITLE[kind];
  if (!cached) {
    /* 换弹窗时标题栏里的胶囊属于上一个弹窗，先清掉；渲染时会按新数据重建 */
    if (metaSub) metaSub.textContent = '';
    if (metaActions) metaActions.innerHTML = '';
    actionsKey = '';
    metaBody.innerHTML = '<p class="site-modal-loading">载入中…</p>';
  } else {
    renderMeta(kind, cached);
  }

  const openedAt = performance.now();

  const ourHash = `#${META_HASH[kind]}`;
  metaReturnHash = location.hash === ourHash ? '' : location.hash;
  if (!metaDialog.open) {
    metaDialog.showModal();
    lockScroll();
  }
  /* 复位滚动要放在 showModal 之后：弹窗关着时是 display: none，
     给它设 scrollTop 不生效，重新打开会停在上次读到的位置。 */
  metaBody.scrollTop = 0;
  history.replaceState(null, '', ourHash);

  if (!pending) return;
  try {
    const fresh = await pending;
    if (!cached) {
      renderMeta(kind, fresh);
    } else if (
      !sameMeta(kind, cached, fresh) &&
      metaBody.scrollTop === 0 &&
      performance.now() - openedAt < 1500
    ) {
      // 只有「刚打开、还没滚动」才原地换：否则会把正在读的位置跳走。
      // 换不换都不影响下一次打开 —— load() 已经把新内容写进两层缓存。
      renderMeta(kind, fresh);
    }
  } catch {
    // 有旧内容就先留着：旧 README / 旧提交记录比一句错误有用
    if (cached) return;
    if (metaSub) metaSub.textContent = '';
    metaBody.innerHTML = '<p class="changelog-empty">内容加载失败，请刷新后重试。</p>';
  }
}

function closeMeta(): void {
  metaDialog?.close();
}

if (metaDialog && metaBody) {
  metaDialog.addEventListener('click', (event) => {
    if (event.target === metaDialog) closeMeta();
  });
  metaDialog.addEventListener('close', () => {
    unlockScroll();
    history.replaceState(null, '', location.pathname + location.search + (metaReturnHash || ''));
    metaReturnHash = '';
  });
  metaClose?.addEventListener('click', closeMeta);

  // 页脚的两个链接 + 首页 hero 的两颗轻档按钮共用同一套 wiring。
  // 悬停 / 按下 / 聚焦都算「用户要去点它」，立刻把对应那份预热起来。
  document.querySelectorAll<HTMLButtonElement>('[data-meta]').forEach((button) => {
    const kind = button.dataset.meta as MetaKind;
    const warm = (): void => prefetchMeta(kind);
    button.addEventListener('pointerenter', warm);
    button.addEventListener('pointerdown', warm);
    button.addEventListener('focusin', warm);
    button.addEventListener('click', () => void openMeta(kind));
  });

  // 直达链接：#about-site / #changelog
  const initial = (Object.keys(META_HASH) as MetaKind[]).find(
    (kind) => location.hash === `#${META_HASH[kind]}`
  );
  if (initial) void openMeta(initial);
}

/* 联系卡的「复制」：把 data-copy 里的值写进剪贴板，按钮文字临时改成「已复制」。
   值本身同时是可选中的文本（见 style.css 的选中 allowlist），剪贴板被拒时
   读者还能手动拖选 —— 这条兜底不能省。 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 非安全上下文（http）或权限被拒时退回 execCommand：老但到处都还在
    const scratch = document.createElement('textarea');
    scratch.value = text;
    scratch.setAttribute('readonly', '');
    scratch.style.position = 'fixed';
    scratch.style.opacity = '0';
    document.body.appendChild(scratch);
    scratch.select();
    const ok = document.execCommand('copy');
    scratch.remove();
    return ok;
  }
}

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.dataset.copy ?? '';
    if (!value) return;
    void copyToClipboard(value).then((ok) => {
      const original = button.textContent ?? '';
      button.textContent = ok ? '已复制' : '复制失败';
      button.classList.toggle('is-copied', ok);
      window.setTimeout(() => {
        button.textContent = original;
        button.classList.remove('is-copied');
      }, 1600);
    });
  });
});

/* ===== 导航栏图标 / 区块标题图标的滚动联动 =====
   右组五个锚点与五个区块标题各配一颗图标，滚到哪一块，那两颗一起点亮。
   判据用「区块顶边越过视口上方 32%」而不是 IntersectionObserver 的比例阈值：
   五个区块高度差很大（联系区只有一屏多一点，项目区能到三屏），
   按可见面积算会在长区块里提前切走、在短区块里闪过去。
   取「最后一个顶边已经过线的区块」最接近人眼判断，且不需要维护 observer。

   只在主页跑：main.ts 只被 index.html 引入。rAF 合并滚动事件，
   每帧只有 5 次 getBoundingClientRect（不读写样式），开销可以忽略。 */
function initSectionSpy(): void {
  const links = new Map<string, HTMLAnchorElement>();
  document.querySelectorAll<HTMLAnchorElement>('[data-section-link]').forEach((link) => {
    links.set(link.dataset.sectionLink ?? '', link);
  });

  const icons = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>('section[id] .section-icon').forEach((el) => {
    const section = el.closest('section[id]');
    if (section) icons.set(section.id, el);
  });

  if (links.size === 0) return;

  /* 区块 id → 导航里的 data-section-link 值。区块 id 用页面锚点（blog-preview /
     nook-preview），导航用短名（blog / nook）：映射只写这一处，两边不必互相将就。 */
  const KEY: Record<string, string> = {
    about: 'about',
    projects: 'projects',
    'blog-preview': 'blog',
    'nook-preview': 'nook',
    contact: 'contact',
  };

  const sections = Object.keys(KEY)
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);

  if (sections.length === 0) return;

  let current = '';
  let queued = false;

  /* ===== 滑块定位 =====
     右组五个图标装在一条浅底胶囊里，当前区块的淡青底由容器的 ::before 画（见
     style.css 的 .nav-links::before）。这里把当前项的位置换算成 CSS 变量：
     相对于容器的 **padding box**（绝对定位元素的包含块就是它），
     所以要先减掉边框宽度，否则每一格都偏 1px。
     宽度直接取元素实测宽度 —— 五格是定宽的，但将来若某格换成长图标也不会错位。 */
  const strip = document.querySelector<HTMLElement>('.nav-links');

  function slideTo(link: HTMLElement | null): void {
    if (!strip) return;
    if (!link) {
      // 没有当前项（理论上不会发生）：让滑块淡出，而不是停在上一格假装选中
      strip.style.setProperty('--slider-w', '0px');
      return;
    }
    const box = strip.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    const border = parseFloat(getComputedStyle(strip).borderLeftWidth) || 0;
    strip.style.setProperty('--slider-x', `${item.left - box.left - border}px`);
    strip.style.setProperty('--slider-w', `${item.width}px`);
  }

  function sync(): void {
    queued = false;
    // 视口上方 32% 处那条判定线：区块顶边越过它就算「正在读这一块」
    const line = window.innerHeight * 0.32;
    let picked = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= line) picked = section;
    }
    // 滚到最底时，最后一个区块可能顶边仍在线下（它太矮）；此时直接选它
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      picked = sections[sections.length - 1];
    }

    const key = KEY[picked.id] ?? '';
    if (key === current) return;
    current = key;

    for (const [name, link] of links) link.classList.toggle('is-active', name === key);
    for (const [id, icon] of icons) icon.classList.toggle('is-active', id === picked.id);
    slideTo(links.get(key) ?? null);
  }

  /* 首次定位与断点切换后都要重算：窗口变宽时五格的绝对位置会变，
     而 sync() 因为 key 没变会提前 return，滑块就会停在旧坐标上。 */
  function relayout(): void {
    slideTo(links.get(current) ?? null);
  }

  function schedule(): void {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => {
    schedule();
    relayout();
    // 字体 / 缩放变化会让格子宽度差个零点几像素，下一帧再校一次
    requestAnimationFrame(relayout);
  });
  // 图片 / 预览卡到货会改页面高度，落点跟着变
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
  schedule();
}

initSectionSpy();
