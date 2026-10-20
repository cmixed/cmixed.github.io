import projects from './data/projects.json';
import skills from './data/skills.json';

interface Project {
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
const statusText = document.getElementById('statusText') as HTMLElement;
const footerStatus = document.getElementById('footerStatus') as HTMLElement;

function updateThemeText(theme: string): void {
  statusText.textContent = theme === 'light' ? 'Light mode' : 'Dark mode';
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

function type(): void {
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

  setTimeout(type, typeSpeed);
}

type();

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
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  });
});

function renderProjects(): void {
  const grid = document.getElementById('projectsGrid') as HTMLElement;
  grid.innerHTML = (projects as Project[])
    .map(
      (p) => `
        <a href="${escapeHtml(p.url)}" class="project-card" target="_blank" rel="noopener noreferrer">
            <div class="project-header">
                <div>
                    <div class="project-title">${escapeHtml(p.title)}</div>
                    <div class="project-subtitle">${escapeHtml(p.subtitle)}</div>
                </div>
                <span class="project-status">${escapeHtml(p.status)}</span>
            </div>
            <div class="project-desc">${escapeHtml(p.desc)}</div>
            <div class="project-tech">
                ${p.tags.map((t) => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('')}
            </div>
        </a>
    `
    )
    .join('');
}
renderProjects();

function renderSkills(): void {
  const container = document.getElementById('skillsContainer') as HTMLElement;
  container.innerHTML = (skills as string[])
    .map((s) => `<div class="skill-tag">${escapeHtml(s)}</div>`)
    .join('');
}
renderSkills();

// Blog preview on main page
async function loadBlogPreview(): Promise<void> {
  try {
    const base = import.meta.env.MODE === 'production' ? './' : '/';
    const res = await fetch(base + 'blog/data.json');
    const data: BlogData = await res.json();
    const pinned = data.posts.filter((p) => p.pinned);
    const rest = data.posts.filter((p) => !p.pinned).slice(0, 2);
    const preview = [...pinned, ...rest];
    const grid = document.getElementById('blogPreviewGrid') as HTMLElement;
    grid.innerHTML = preview
      .map(
        (p) => `
            <a href="blog/${encodeURIComponent(p.slug)}.html" class="blog-preview-card${p.pinned ? ' blog-preview-card-pin' : ''}">
                <div class="blog-preview-card-title">${p.pinned ? '📌 ' : ''}${escapeHtml(p.title)}</div>
                <div class="blog-preview-card-desc">${escapeHtml(p.description)}</div>
                <div class="blog-preview-card-footer">
                    <div class="blog-preview-card-tags">
                        ${p.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}
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
    const res = await fetch(base + 'nook/data.json');
    const data = await res.json();
    const sorted = data.resources.sort((a: NookResource, b: NookResource) => {
      if (a.pin !== b.pin) return a.pin ? -1 : 1;
      return b.date.localeCompare(a.date);
    });
    const preview = sorted.slice(0, 8);
    const grid = document.getElementById('nookPreviewGrid') as HTMLElement;
    const CATEGORY_ICONS: Record<string, string> = {
      doc: '📄',
      tool: '🔧',
      code: '💻',
      website: '🌐',
    };
    const CATEGORY_NAMES: Record<string, string> = {
      doc: '文档',
      tool: '工具',
      code: '代码',
      website: '网站',
    };
    grid.innerHTML = preview
      .map((r: NookResource) => {
        const icon = CATEGORY_ICONS[r.category] || '📦';
        const catName = CATEGORY_NAMES[r.category] || r.category;
        const pinMark = r.pin ? '📌 ' : '';
        return `
            <a href="nook/${encodeURIComponent(r.id)}.html" class="nook-preview-card${r.pin ? ' nook-preview-card-pin' : ''}">
                <div class="nook-preview-card-header">
                    <div class="nook-preview-card-title">${pinMark}${escapeHtml(r.title)}</div>
                    <span class="nook-preview-card-category">${icon} ${catName}</span>
                </div>
                <div class="nook-preview-card-desc">${escapeHtml(r.description)}</div>
                <div class="nook-preview-card-footer">
                    <div class="nook-preview-card-tags">
                        ${r.tags.map((t: string) => `<span>${escapeHtml(t)}</span>`).join('')}
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
  section.querySelectorAll('.project-card, .skill-tag').forEach((el) => {
    el.classList.add('fade-in-item');
  });
  observer.observe(section);
});

// Scroll progress bar
const scrollProgress = document.createElement('div');
scrollProgress.className = 'scroll-progress';
document.body.prepend(scrollProgress);

window.addEventListener(
  'scroll',
  () => {
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight =
      document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    scrollProgress.style.transform = `scaleX(${progress})`;
  },
  { passive: true }
);

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
      request = fetch(META_BASE + file)
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
const metaClose = document.getElementById('siteModalClose') as HTMLButtonElement | null;

let changelogShown = CHANGELOG_STEP;
/** 打开前的 hash 位置：关闭时还回去，不至于把用户滚到别的锚点这件事弄丢 */
let metaReturnHash = '';
/** 打开前的滚动位置：body 在锁滚动期间是 fixed，关闭时要滚回来 */
let metaReturnScroll = 0;

/** 锁住背景滚动（细节见 style.css 里 body.modal-open 的注释） */
function lockScroll(): void {
  metaReturnScroll = window.scrollY;
  document.body.style.top = `-${metaReturnScroll}px`;
  document.body.classList.add('modal-open');
}

function unlockScroll(): void {
  if (!document.body.classList.contains('modal-open')) return;
  document.body.classList.remove('modal-open');
  document.body.style.top = '';
  window.scrollTo({ top: metaReturnScroll, behavior: 'instant' });
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
   两份合计 gzip ≈ 25KB，比首屏任何一张图都小，且是异步请求，不阻塞渲染。
   saveData 下仍然不预取（见 prefetchAllowed），点开时才下载。 */
if (prefetchAllowed()) {
  prefetchMeta('about');
  prefetchMeta('changelog');
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

function renderChangelog(meta: CommitsData): void {
  if (!metaBody) return;
  const entries = meta.changelog.slice(0, changelogShown);
  if (entries.length === 0) {
    if (metaSub) metaSub.textContent = '';
    metaBody.innerHTML = '<p class="changelog-empty">没有可显示的提交记录。</p>';
    return;
  }
  if (metaSub) {
    metaSub.textContent =
      entries.length < meta.total
        ? `共 ${meta.total} 条提交 · 显示最近 ${entries.length} 条`
        : `共 ${meta.total} 条提交 · 全部显示`;
  }
  const groups = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const day = groups.get(entry.date);
    if (day) day.push(entry);
    else groups.set(entry.date, [entry]);
  }
  metaBody.innerHTML = Array.from(groups, ([date, dayEntries]) => {
    const items = dayEntries.map((entry) => changelogItem(entry, meta.repo)).join('');
    return `<div class="changelog-day"><div class="changelog-date"><span>${escapeHtml(
      date
    )}</span></div><ul class="changelog-list">${items}</ul></div>`;
  }).join('');
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
