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
  tags: string[];
  description: string;
}

interface BlogData {
  posts: BlogPost[];
  allTags: string[];
}

function escapeHtml(str: string): string {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const html = document.documentElement;
const statusText = document.getElementById('statusText') as HTMLElement;
const footerStatus = document.getElementById('footerStatus') as HTMLElement;

const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme) {
  html.setAttribute('data-theme', savedTheme);
  updateThemeText(savedTheme);
} else if (!systemPrefersDark) {
  html.setAttribute('data-theme', 'light');
  updateThemeText('light');
}

themeToggle.addEventListener('click', () => {
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.body.classList.add('theme-transitioning');

  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeText(newTheme);

  setTimeout(() => {
    document.body.classList.remove('theme-transitioning');
  }, 300);
});

function updateThemeText(theme: string): void {
  statusText.textContent = theme === 'light' ? 'Light mode' : 'Dark mode';
  footerStatus.textContent = theme === 'light' ? '© 2026 cmixed · Light' : '© 2026 cmixed · Dark';
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    const newTheme = e.matches ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    updateThemeText(newTheme);
  }
});

const a11yToggle = document.getElementById('a11yToggle') as HTMLButtonElement;
const savedA11y = localStorage.getItem('a11y-reduced-motion');
if (savedA11y === 'on') {
  html.classList.add('reduce-motion');
  a11yToggle.classList.add('active');
}

a11yToggle.addEventListener('click', () => {
  const isActive = html.classList.toggle('reduce-motion');
  a11yToggle.classList.toggle('active', isActive);
  localStorage.setItem('a11y-reduced-motion', isActive ? 'on' : 'off');
});

const texts = [
  'Modern C++ Developer',
  'Rust Engineer',
  'Python & AI Developer',
  'Game Developer',
  'System Programmer',
  'Library Designer',
  'Performance Optimizer',
  'Certified Software Designer',
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
  container.innerHTML = (skills as string[]).map((s) => `<div class="skill-tag">${escapeHtml(s)}</div>`).join('');
}
renderSkills();

// Blog preview on main page
async function loadBlogPreview(): Promise<void> {
  try {
    const base = import.meta.env.MODE === 'production' ? './' : '/';
    const res = await fetch(base + 'blog/data.json');
    const data: BlogData = await res.json();
    const preview = data.posts.slice(0, 4);
    const grid = document.getElementById('blogPreviewGrid') as HTMLElement;
    grid.innerHTML = preview
      .map(
        (p) => `
            <a href="blog/#${escapeHtml(p.slug)}" class="blog-preview-card">
                <div class="blog-preview-card-title">${escapeHtml(p.title)}</div>
                <div class="blog-preview-card-meta">${escapeHtml(p.date)}</div>
                <div class="blog-preview-card-desc">${escapeHtml(p.description)}</div>
                <div class="blog-preview-card-tags">
                    ${p.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}
                </div>
            </a>
        `
      )
      .join('');
  } catch {
    (document.getElementById('blogPreviewGrid') as HTMLElement).innerHTML = '';
  }
}
loadBlogPreview();

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

document.querySelectorAll('#skills, #projects, #blog-preview').forEach((section) => {
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
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    scrollProgress.style.width = progress + '%';
  },
  { passive: true }
);
