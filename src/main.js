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

    updateMatrixColors();

    setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
    }, 500);
});

function updateThemeText(theme) {
    if (theme === 'light') {
        statusText.textContent = 'SYSTEM ONLINE // 日间作战模式';
        footerStatus.textContent = '日间战术系统运行正常';
    } else {
        statusText.textContent = 'SYSTEM ONLINE // 夜间作战模式';
        footerStatus.textContent = '夜间战术系统运行正常';
    }
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        updateThemeText(newTheme);
    }
});

const texts = [
    'Modern C++ 开发者',
    'Python 工程师',
    'Command & Conquer 指挥官',
    '系统级编程爱好者'
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

const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const fontSize = 14;
const columns = canvas.width / fontSize;
const drops = [];

for (let i = 0; i < columns; i++) {
    drops[i] = Math.random() * -100;
}

let matrixColor = '#00d4aa';
let bgColor = '#0a0f0d';

function updateMatrixColors() {
    const style = getComputedStyle(html);
    matrixColor = style.getPropertyValue('--matrix-color').trim();
    bgColor = style.getPropertyValue('--bg').trim();
}
updateMatrixColors();

function drawMatrix() {
    ctx.fillStyle = bgColor + '0D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = matrixColor;
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

let lastMatrixTime = 0;
let matrixActive = true;

document.addEventListener('visibilitychange', () => {
    matrixActive = !document.hidden;
});

function matrixLoop(time) {
    if (matrixActive && time - lastMatrixTime >= 35) {
        drawMatrix();
        lastMatrixTime = time;
    }
    requestAnimationFrame(matrixLoop);
}
requestAnimationFrame(matrixLoop);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

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

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.project-card, .skill-tag').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s, transform 0.6s';
    observer.observe(el);
});
