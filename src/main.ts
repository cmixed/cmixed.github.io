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
   内容来自构建期生成的 site-meta.json（README 渲染结果 + git 提交记录，见
   scripts/site-meta.ts）：第一次打开才请求，之后留在内存里。
   悬浮框本体是原生 <dialog>，ESC、焦点陷阱、遮罩、关闭后焦点归位都由浏览器负责。 */
interface ChangelogEntry {
  hash: string;
  date: string;
  type: string | null;
  scope: string | null;
  subject: string;
}

interface SiteMeta {
  about: { html: string; updated: string | null };
  changelog: ChangelogEntry[];
  total: number;
  repo: string | null;
}

type MetaKind = 'about' | 'changelog';

const META_HASH: Record<MetaKind, string> = { about: 'about-site', changelog: 'changelog' };
const META_TITLE: Record<MetaKind, string> = { about: '关于本站', changelog: '更新日志' };
const CHANGELOG_STEP = 80;

const metaDialog = document.getElementById('siteModal') as HTMLDialogElement | null;
const metaTitle = document.getElementById('siteModalTitle') as HTMLElement | null;
const metaSub = document.getElementById('siteModalSub') as HTMLElement | null;
const metaBody = document.getElementById('siteModalBody') as HTMLElement | null;
const metaClose = document.getElementById('siteModalClose') as HTMLButtonElement | null;

let metaData: SiteMeta | null = null;
let metaRequest: Promise<SiteMeta> | null = null;
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

function loadMeta(): Promise<SiteMeta> {
  if (metaData) return Promise.resolve(metaData);
  if (!metaRequest) {
    const base = import.meta.env.MODE === 'production' ? './' : '/';
    metaRequest = fetch(base + 'site-meta.json').then((res) => {
      if (!res.ok) throw new Error(`site-meta.json ${res.status}`);
      return res.json() as Promise<SiteMeta>;
    });
    metaRequest.then(
      (data) => {
        metaData = data;
      },
      () => {
        metaRequest = null; // 失败不缓存，下次点开还能重试
      }
    );
  }
  return metaRequest;
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

function renderChangelog(meta: SiteMeta): void {
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

function renderMeta(meta: SiteMeta, kind: MetaKind): void {
  if (!metaBody) return;
  if (kind === 'about') {
    if (metaSub) {
      metaSub.textContent = meta.about.updated
        ? `README.md · 更新于 ${meta.about.updated}`
        : 'README.md';
    }
    // 构建期渲染、只来自仓库自己的 README，可以直接当 HTML 插入
    metaBody.innerHTML = meta.about.html;
    metaBody.scrollTop = 0;
  } else {
    changelogShown = CHANGELOG_STEP;
    renderChangelog(meta);
    metaBody.scrollTop = 0;
  }
}

async function openMeta(kind: MetaKind): Promise<void> {
  if (!metaDialog || !metaBody) return;
  if (metaTitle) metaTitle.textContent = META_TITLE[kind];
  if (metaSub) metaSub.textContent = '';
  metaBody.innerHTML = '<p class="site-modal-loading">载入中…</p>';

  const ourHash = `#${META_HASH[kind]}`;
  metaReturnHash = location.hash === ourHash ? '' : location.hash;
  if (!metaDialog.open) {
    metaDialog.showModal();
    lockScroll();
  }
  history.replaceState(null, '', ourHash);

  try {
    renderMeta(await loadMeta(), kind);
  } catch {
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

  // 页脚的两个链接 + 首页 hero 的两颗轻档按钮共用同一套 wiring
  document.querySelectorAll<HTMLButtonElement>('[data-meta]').forEach((button) => {
    const kind = button.dataset.meta as MetaKind;
    button.addEventListener('click', () => void openMeta(kind));
  });

  // 直达链接：#about-site / #changelog
  const initial = (Object.keys(META_HASH) as MetaKind[]).find(
    (kind) => location.hash === `#${META_HASH[kind]}`
  );
  if (initial) void openMeta(initial);
}
