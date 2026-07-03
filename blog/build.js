import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync, statSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';

marked.use({ breaks: true });

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const postsDir = join(__dirname, 'posts');
const outDir = join(__dirname, '..', 'dist', 'blog');
mkdirSync(outDir, { recursive: true });

function parseFrontmatter(content) {
    content = content.replace(/\r\n/g, '\n');
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { meta: {}, body: content };
    const yaml = match[1], body = match[2], meta = {};
    for (const line of yaml.split('\n')) {
        const idx = line.indexOf(':');
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim();
        if (val.startsWith('[') && val.endsWith(']')) val = val.slice(1, -1).split(',').map(s => s.trim());
        meta[key] = val;
    }
    return { meta, body };
}

function copyDirSync(src, dest) {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src, { withFileTypes: true })) {
        const srcPath = join(src, entry.name), destPath = join(dest, entry.name);
        if (entry.isDirectory()) copyDirSync(srcPath, destPath);
        else if (!entry.name.endsWith('.md')) copyFileSync(srcPath, destPath);
    }
}

function estimateReadTime(body) {
    const text = body.replace(/[#*`\[\]()>!-]/g, '').replace(/\s+/g, ' ');
    const words = text.length; // Chinese chars ~ 1 word each
    return Math.max(1, Math.ceil(words / 400));
}

function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function discoverPosts() {
    const results = [];
    for (const entry of readdirSync(postsDir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
            results.push({ mdPath: join(postsDir, entry.name), slug: basename(entry.name, '.md'), assetsDir: null });
        } else if (entry.isDirectory()) {
            const dirPath = join(postsDir, entry.name);
            const mdFiles = readdirSync(dirPath).filter(f => f.endsWith('.md'));
            if (mdFiles.length > 0) results.push({ mdPath: join(dirPath, mdFiles[0]), slug: basename(entry.name), assetsDir: dirPath });
        }
    }
    return results;
}

// Process posts
const postInfos = discoverPosts();
const posts = [];

for (const info of postInfos) {
    const raw = readFileSync(info.mdPath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    const slugForPaths = encodeURIComponent(info.slug);
    const bodyForJson = body.replace(/\.\//g, `./${slugForPaths}/`);
    const htmlJson = marked(bodyForJson);
    const readTime = estimateReadTime(body);

    posts.push({
        slug: info.slug,
        title: meta.title || info.slug,
        date: meta.date || '未知日期',
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        description: meta.description || '',
        readTime,
        content: htmlJson
    });

    // Standalone page
    const htmlStandalone = marked(body);
    writeFileSync(join(outDir, `${info.slug}.html`), `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeXml(meta.description || '')}">
    <title>${escapeXml(meta.title || info.slug)} · cmixed</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
    <style>
        body{font-family:'Inter',-apple-system,sans-serif;background:#0f172a;color:#f1f5f9;max-width:720px;margin:0 auto;padding:2rem;line-height:1.8}
        a{color:#525e54}h1{margin-bottom:.5rem}h2{margin-top:2rem}code{background:#1e293b;padding:.15rem .4rem;border-radius:4px;font-size:.9em}
        pre{background:#1e293b;padding:1rem;border-radius:8px;overflow-x:auto}pre code{background:none;padding:0}
        .meta{color:#94a3b8;font-size:.85rem;margin-bottom:2rem}.tag{display:inline-block;padding:.15rem .5rem;border:1px solid rgba(82,94,84,.2);border-radius:4px;font-size:.75rem;margin-right:.5rem;color:#94a3b8}
        img{max-width:100%;height:auto;border-radius:8px;margin:1rem 0}
    </style>
</head>
<body>
    <a href="../">&larr; 返回博客</a>
    <h1>${escapeXml(meta.title || info.slug)}</h1>
    <div class="meta">${meta.date || ''} · 阅读约 ${readTime} 分钟 · ${(meta.tags || []).map(t => `<span class="tag">${escapeXml(t)}</span>`).join(' ')}</div>
    ${htmlStandalone}
</body>
</html>`);

    // Copy assets
    if (info.assetsDir && statSync(info.assetsDir).isDirectory()) {
        copyDirSync(info.assetsDir, join(outDir, info.slug));
    }
}

posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Add prev/next
for (let i = 0; i < posts.length; i++) {
    posts[i].prev = i < posts.length - 1 ? { slug: posts[i + 1].slug, title: posts[i + 1].title } : null;
    posts[i].next = i > 0 ? { slug: posts[i - 1].slug, title: posts[i - 1].title } : null;
}

const allTags = [...new Set(posts.flatMap(p => p.tags))];

// Generate RSS feed
const rssItems = posts.map(p => `
    <item>
        <title>${escapeXml(p.title)}</title>
        <link>https://cmixed.github.io/blog/#${p.slug}</link>
        <description>${escapeXml(p.description)}</description>
        <pubDate>${new Date(p.date).toUTCString()}</pubDate>
        <guid>https://cmixed.github.io/blog/#${p.slug}</guid>
    </item>`).join('');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
    <title>cmixed 博客</title>
    <link>https://cmixed.github.io/blog/</link>
    <description>cmixed 的技术博客 - C++、Rust、系统编程、AI 应用</description>
    <language>zh-cn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
</channel>
</rss>`;

writeFileSync(join(outDir, 'data.json'), JSON.stringify({ posts, allTags }, null, 2));
writeFileSync(join(outDir, 'feed.xml'), rss);

// Copy blog index.html
writeFileSync(join(outDir, 'index.html'), readFileSync(join(__dirname, 'index.html'), 'utf-8'));

// Generate blog 404 page
writeFileSync(join(outDir, '404.html'), `<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <title>404 · 博客 | cmixed</title>
    <link rel="stylesheet" href="style.css">
    <style>body{padding-top:0;display:flex;align-items:center;justify-content:center;min-height:80vh}
    .e404{text-align:center}.e404 h1{font-size:5rem;color:var(--primary);margin-bottom:.5rem}
    .e404 p{color:var(--text-dim);margin-bottom:1.5rem}</style>
</head>
<body>
    <div class="e404"><h1>404</h1><p>文章不存在或已被移除</p><a href="../" class="btn">返回首页</a></div>
</body>
</html>`);

// Copy main CSS
const cssDir = join(__dirname, '..', 'dist', 'assets');
const cssFiles = readdirSync(cssDir).filter(f => f.endsWith('.css'));
if (cssFiles.length > 0) writeFileSync(join(outDir, 'style.css'), readFileSync(join(cssDir, cssFiles[0]), 'utf-8'));

console.log(`✓ ${posts.length} posts, ${allTags.length} tags, RSS feed, 404 page`);
