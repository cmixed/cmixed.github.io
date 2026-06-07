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
    footerStatus.textContent = theme === 'light' ? '© 2026 Cmixed · Light' : '© 2026 Cmixed · Dark';
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        updateThemeText(newTheme);
    }
});

const texts = [
    'Modern C++ Developer',
    'Python Engineer',
    'System Programmer',
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
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
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
        title: 'pac_man',
        subtitle: '经典吃豆人游戏',
        desc: '使用 C++ 实现的经典 Pac-Man 游戏，包含完整的游戏逻辑与 AI 寻路算法。',
        url: 'https://github.com/cmixed/pac_man',
        status: 'C++',
        tags: ['C++', 'AI', 'Game Dev']
    },
    {
        title: 'route',
        subtitle: '图算法最短路径',
        desc: '基于 C++20 的图数据结构与最短路径算法实现，支持多线程并行计算与自定义线程池。',
        url: 'https://github.com/cmixed/route',
        status: 'C++20',
        tags: ['C++20', 'Graph', 'Thread Pool']
    },
    {
        title: 'fk-deltaforce',
        subtitle: '三角洲 ACE 日志分析',
        desc: 'Rust 实现的三角洲行动 ACE 反作弊扫描日志分析工具，自动解析日志并生成统计报告与高危目标 CSV。',
        url: 'https://github.com/cmixed/fk-deltaforce',
        status: 'Rust',
        tags: ['Rust', 'Log Parsing', 'CLI']
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
    'Modern C++', 'Python 3', 'x86 Assembly',
    'System Programming', 'Performance Optimization',
    'Reverse Engineering', 'Low-level Architecture',
    'Git', 'CMake', 'Linux'
];

function renderSkills() {
    const container = document.getElementById('skillsContainer');
    container.innerHTML = skills.map(s => `<div class="skill-tag">${s}</div>`).join('');
}
renderSkills();

document.querySelectorAll('section').forEach(el => el.classList.add('section-reveal'));

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.section-reveal, .project-card, .skill-tag').forEach(el => {
    if (!el.classList.contains('section-reveal')) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s, transform 0.6s';
    }
    observer.observe(el);
});
