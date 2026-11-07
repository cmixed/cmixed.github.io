import projects from './data/projects.json';
import skills from './data/skills.json';
import { chipCols } from './lib/chip-width';
import { categoryIcon, pinBadge } from './lib/icons';

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
  status: string;
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

  typeTimer = window.setTimeout(type, typeSpeed);
}

if (prefersReduced.matches) {
  typeElement.textContent = texts[0];
} else {
  const typewriter = document.getElementById('typewriter') as HTMLElement;
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

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  navLinks.classList.toggle('active');
  document.body.classList.toggle('nav-open');
});

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navLinks.classList.remove('active');
    document.body.classList.remove('nav-open');
  });
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
    .map(
      (p) => `
        <a href="${escapeHtml(p.url)}" class="project-card" data-project="${escapeHtml(p.id)}" target="_blank" rel="noopener noreferrer">
            <div class="project-header">
                <div>
                    <div class="project-title">${escapeHtml(p.title)}</div>
                    <div class="project-subtitle">${escapeHtml(p.subtitle)}</div>
                </div>
                <span class="project-status" style="--chip-cols:${chipCols(p.status)}">${escapeHtml(p.status)}</span>
            </div>
            <div class="project-desc">${escapeHtml(p.desc)}</div>
            <div class="project-tech">
                ${p.tags.map((t) => `<span class="tech-tag" style="--chip-cols:${chipCols(t)}">${escapeHtml(t)}</span>`).join('')}<span class="tag-more" hidden></span>
            </div>
        </a>
    `
    )
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

// Blog preview on main page
async function loadBlogPreview(): Promise<void> {
  try {
    const base = import.meta.env.MODE === 'production' ? './' : '/';
    // no-store：置顶 / 新文章是构建时写进 data.json 的，不能吃浏览器缓存，
    // 否则推上去后首页还会显示上一次的置顶。
    const res = await fetch(base + 'blog/data.json', { cache: 'no-store' });
    const data: BlogData = await res.json();
    // 固定取前 6 篇（构建时已经是「置顶按更新时间 → 普通按创建时间」）。
    // 6 在 2 列网格里正好排满 3 行；不取全部，是因为置顶一多首页会被无限撑长。
    const preview = data.posts.slice(0, 6);
    const grid = document.getElementById('blogPreviewGrid') as HTMLElement;
    grid.innerHTML = preview
      .map(
        (p) => `
            <a href="blog/${encodeURIComponent(p.slug)}.html" class="blog-preview-card${p.pinned ? ' blog-preview-card-pin' : ''}">
                <div class="blog-preview-card-title">${p.pinned ? pinBadge() : ''}${escapeHtml(p.title)}</div>
                <div class="blog-preview-card-desc">${escapeHtml(p.description)}</div>
                <div class="blog-preview-card-footer">
                    <div class="blog-preview-card-tags">
                        ${p.tags.map((t) => `<span style="--chip-cols:${chipCols(t)}">${escapeHtml(t)}</span>`).join('')}<span class="tag-more" hidden></span>
                    </div>
                    <div class="blog-preview-card-meta">创建于 ${escapeHtml(p.date)} · 更新于 ${escapeHtml(p.updated)}</div>
                </div>
            </a>
        `
      )
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
        return `
            <a href="nook/${encodeURIComponent(r.id)}.html" class="nook-preview-card${r.pin ? ' nook-preview-card-pin' : ''}">
                <div class="nook-preview-card-header">
                    <div class="nook-preview-card-title">${pinMark}${escapeHtml(r.title)}</div>
                    <span class="nook-preview-card-category">${catIcon}<span class="chip-text">${catName}</span></span>
                </div>
                <div class="nook-preview-card-desc">${escapeHtml(r.description)}</div>
                <div class="nook-preview-card-footer">
                    <div class="nook-preview-card-tags">
                        ${r.tags.map((t: string) => `<span style="--chip-cols:${chipCols(t)}">${escapeHtml(t)}</span>`).join('')}<span class="tag-more" hidden></span>
                    </div>
                    <div class="nook-preview-card-meta">${escapeHtml(r.size)} · ${escapeHtml(r.date)}</div>
                </div>
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
  type: string | null;
  scope: string | null;
  subject: string;
}

interface AboutData {
  html: string;
  updated: string | null;
}

interface CommitsData {
  changelog: ChangelogEntry[];
  total: number;
  repo: string | null;
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

const aboutMeta = createMetaLoader<AboutData>('site-about.json', 'about:v1');
const commitsMeta = createMetaLoader<CommitsData>('site-commits.json', 'commits:v1');
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
/** 已写进标题栏的季度清单：不变就不重建按钮，避免点一下焦点就丢 */
let quarterKey = '';
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

function changelogItem(entry: ChangelogEntry, repo: string | null): string {
  const inner = `<span class="changelog-hash">${escapeHtml(entry.hash)}</span>${
    entry.type
      ? `<span class="changelog-type">${escapeHtml(
          entry.scope ? `${entry.type}/${entry.scope}` : entry.type
        )}</span>`
      : ''
  }<span class="changelog-subject">${escapeHtml(entry.subject)}</span>`;
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
  metaActions.querySelectorAll<HTMLElement>('.changelog-quarter').forEach((chip) => {
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

  metaBody.classList.add('changelog-measuring');
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
    requestAnimationFrame(() => metaBody?.classList.remove('changelog-measuring'));
  });
  if (far) syncQuarterTabs();
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

/* 季度按钮常驻在标题行，不随正文重渲染消失，所以事件只绑一次。
   绑在容器上做委托，重建按钮也不用重新绑。 */
metaActions?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLElement>('.changelog-quarter');
  const quarter = button?.dataset.quarter;
  if (!quarter) return;
  ensureQuarter(quarter);
  /* 补内容会重置滚动位置，等下一帧布局稳定再跳 */
  requestAnimationFrame(() => scrollToQuarter(quarter));
});

/* 滚动时同步高亮。只读 rect、rAF 合帧，滚动里不写样式也不触发重排 */
let quarterFrame = 0;
metaBody?.addEventListener(
  'scroll',
  () => {
    if (quarterFrame) return;
    quarterFrame = requestAnimationFrame(() => {
      quarterFrame = 0;
      syncQuarterTabs();
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
    quarterKey = '';
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
  const key = allQuarters.join('|');
  if (metaActions && key !== quarterKey) {
    quarterKey = key;
    metaActions.innerHTML = allQuarters
      .map(
        (quarter) =>
          `<button type="button" class="changelog-quarter" data-quarter="${quarter}">${quarter}</button>`
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
    return `<section class="changelog-quarter-group" id="q-${quarter}"><div class="changelog-quarter-title"><span class="changelog-quarter-chip">${quarter}</span></div>${items}</section>`;
  }).join('');

  metaBody.innerHTML = groupsHtml;
  syncQuarterTabs();

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
  if (!metaBody) return;
  /* 「关于本站」没有季度跳转：清空标题栏右侧，那块空间自然收回去 */
  if (metaActions) metaActions.innerHTML = '';
  quarterKey = '';
  if (metaSub) {
    metaSub.textContent = meta.updated ? `README.md · 更新于 ${meta.updated}` : 'README.md';
  }
  // 构建期渲染、只来自仓库自己的 README，可以直接当 HTML 插入
  metaBody.innerHTML = meta.html;
  metaBody.scrollTop = 0;
}

function renderMeta(kind: MetaKind, data: AboutData | CommitsData): void {
  if (kind === 'about') {
    renderAbout(data as AboutData);
    return;
  }
  changelogShown = CHANGELOG_STEP;
  renderChangelog(data as CommitsData);
  metaBody?.scrollTo(0, 0);
}

/** 两份内容是否相同：后台刷新回来时用它决定要不要重渲染（避免白闪一次）。 */
function sameMeta(kind: MetaKind, a: AboutData | CommitsData, b: AboutData | CommitsData): boolean {
  if (kind === 'about') {
    const before = a as AboutData;
    const after = b as AboutData;
    return before.html === after.html && before.updated === after.updated;
  }
  const before = a as CommitsData;
  const after = b as CommitsData;
  return (
    before.total === after.total &&
    before.repo === after.repo &&
    before.changelog.length === after.changelog.length &&
    before.changelog.every((entry, i) => entry.hash === after.changelog[i]?.hash)
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
  if (!cached && metaSub) metaSub.textContent = '';
  if (cached) renderMeta(kind, cached);
  else metaBody.innerHTML = '<p class="site-modal-loading">载入中…</p>';

  const openedAt = performance.now();

  const ourHash = `#${META_HASH[kind]}`;
  metaReturnHash = location.hash === ourHash ? '' : location.hash;
  if (!metaDialog.open) {
    metaDialog.showModal();
    lockScroll();
  }
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
