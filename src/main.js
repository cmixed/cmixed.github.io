const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;
const statusText = document.getElementById('statusText');
const footerStatus = document.getElementById('footerStatus');

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

function updateThemeText(theme) {
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

const a11yToggle = document.getElementById('a11yToggle');
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
    'Performance Optimizer'
];
let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typeElement = document.getElementById('type-text');

function type() {
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

const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
    document.body.classList.toggle('nav-open');
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.classList.remove('nav-open');
    });
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

const projects = [
    {
        title: 'srs',
        subtitle: '异构模型集成级联系统',
        desc: 'Python 实现的 AI 心理健康咨询系统，集成多种异构大语言模型，支持 RAG 增强检索、多通道通讯与用户管理。',
        url: 'https://github.com/cmixed/srs',
        status: 'Python',
        tags: ['Python', 'LLM', 'RAG', 'AI']
    },
    {
        title: 'zcol',
        subtitle: '单头文件 C++23 终端颜色库',
        desc: 'C++23 实现的 Header-Only 终端彩色输出与日志库，支持 RAII 作用域颜色守卫、源位置日志、UDL 语法糖。',
        url: 'https://github.com/cmixed/zcol',
        status: 'C++23',
        tags: ['C++23', 'Header-Only', 'Terminal', 'Library']
    },
    {
        title: 'pac_man',
        subtitle: '经典吃豆人游戏',
        desc: '使用 C++23 + EasyX 实现的经典 Pac-Man 游戏，包含完整的游戏逻辑、AI 幽灵寻路与碰撞检测。',
        url: 'https://github.com/cmixed/pac_man',
        status: 'C++23',
        tags: ['C++23', 'AI', 'Game Dev', 'EasyX']
    },
    {
        title: 'route',
        subtitle: '图算法与并行计算框架',
        desc: '基于 C++20 的图数据结构与最短路径算法实现，支持 Dijkstra、A*、Bellman-Ford 等多线程并行计算。',
        url: 'https://github.com/cmixed/route',
        status: 'C++20',
        tags: ['C++20', 'Graph', 'Thread Pool', 'Algorithm']
    },
    {
        title: 'fk-deltaforce',
        subtitle: '三角洲 ACE 日志分析',
        desc: 'Rust 实现的三角洲行动反作弊日志分析工具，自动解析扫描日志、统计风险指标并导出高危目标 CSV 报告。',
        url: 'https://github.com/cmixed/fk-deltaforce',
        status: 'Rust',
        tags: ['Rust', 'Log Parsing', 'CLI', 'Analysis']
    }
];

function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = projects.map(p => `
        <a href="${p.url}" class="project-card" target="_blank" rel="noopener noreferrer">
            <div class="project-header">
                <div>
                    <div class="project-title">${p.title}</div>
                    <div style="font-size: 0.8rem; color: var(--text-dim);">${p.subtitle}</div>
                </div>
                <span class="project-status">${p.status}</span>
            </div>
            <div class="project-desc">${p.desc}</div>
            <div class="project-tech">
                ${p.tags.map(t => `<span class="tech-tag">${t}</span>`).join('')}
            </div>
        </a>
    `).join('');
}
renderProjects();

const skills = [
    'Modern C++', 'Rust', 'Python 3', 'x86 Assembly',
    'C++23 Library Design', 'Header-Only Library',
    'System Programming', 'Performance Optimization',
    'Reverse Engineering', 'Low-level Architecture',
    'Game Development', 'Game AI & Pathfinding',
    'Graph Algorithms', 'Parallel Computing',
    'LLM & RAG', 'AI Application',
    'Algorithm Design', 'CLI Tool Development',
    'Multithreading', 'Git', 'CMake', 'Linux'
];

function renderSkills() {
    const container = document.getElementById('skillsContainer');
    container.innerHTML = skills.map(s => `<div class="skill-tag">${s}</div>`).join('');
}
renderSkills();

const observerOptions = {
    threshold: 0.05,
    rootMargin: '0px 0px -30px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const children = entry.target.querySelectorAll('.project-card, .skill-tag');
            children.forEach(el => {
                el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('#skills, #projects').forEach(section => {
    const items = section.querySelectorAll('.project-card, .skill-tag');
    items.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(12px)';
    });
    observer.observe(section);
});

// Scroll progress bar
const scrollProgress = document.createElement('div');
scrollProgress.className = 'scroll-progress';
document.body.prepend(scrollProgress);

window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    scrollProgress.style.width = progress + '%';
}, { passive: true });

// ===== BLOG =====
const blogList = document.getElementById('blogList');
const blogTags = document.getElementById('blogTags');
const blogDetail = document.getElementById('blogDetail');
const blogDetailContent = document.getElementById('blogDetailContent');
const blogBack = document.getElementById('blogBack');
let blogData = null;
let activeBlogTag = null;

async function loadBlog() {
    try {
        const base = import.meta.env.MODE === 'production' ? './' : '/';
        const res = await fetch(base + 'blog/data.json');
        blogData = await res.json();
        renderBlogTags();
        renderBlogList();
    } catch (e) {
        blogList.innerHTML = '<p style="color: var(--text-muted)">博客暂无内容</p>';
    }
}

function renderBlogTags() {
    blogTags.innerHTML = blogData.allTags.map(tag =>
        `<button class="blog-tag" data-tag="${tag}">${tag}</button>`
    ).join('');

    blogTags.querySelectorAll('.blog-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            if (activeBlogTag === tag) {
                activeBlogTag = null;
                btn.classList.remove('active');
            } else {
                activeBlogTag = tag;
                blogTags.querySelectorAll('.blog-tag').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
            renderBlogList();
        });
    });
}

function renderBlogList() {
    const posts = activeBlogTag
        ? blogData.posts.filter(p => p.tags.includes(activeBlogTag))
        : blogData.posts;

    blogList.innerHTML = posts.map(p => `
        <div class="blog-card" data-slug="${p.slug}">
            <div class="blog-card-title">${p.title}</div>
            <div class="blog-card-meta">${p.date}</div>
            <div class="blog-card-desc">${p.description}</div>
            <div class="blog-card-tags">
                ${p.tags.map(t => `<span class="blog-card-tag">${t}</span>`).join('')}
            </div>
        </div>
    `).join('');

    blogList.querySelectorAll('.blog-card').forEach(card => {
        card.addEventListener('click', () => showBlogPost(card.dataset.slug));
    });
}

function showBlogPost(slug) {
    const post = blogData.posts.find(p => p.slug === slug);
    if (!post) return;

    const tagHtml = post.tags.map(t => `<span class="tag">${t}</span>`).join(' ');
    blogDetailContent.innerHTML = `
        <h1>${post.title}</h1>
        <div class="blog-detail-meta">${post.date} ${tagHtml}</div>
        ${post.content}
    `;

    blogList.style.display = 'none';
    blogTags.style.display = 'none';
    blogDetail.style.display = 'block';
    document.getElementById('blog').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

blogBack.addEventListener('click', () => {
    blogDetail.style.display = 'none';
    blogList.style.display = 'grid';
    blogTags.style.display = 'flex';
});

loadBlog();
