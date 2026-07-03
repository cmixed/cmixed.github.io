import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const postsDir = join(__dirname, 'posts');
const outDir = join(__dirname, '..', 'dist', 'blog');

mkdirSync(outDir, { recursive: true });

function parseFrontmatter(content) {
    content = content.replace(/\r\n/g, '\n');
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { meta: {}, body: content };

    const yaml = match[1];
    const body = match[2];
    const meta = {};

    for (const line of yaml.split('\n')) {
        const idx = line.indexOf(':');
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim();

        if (val.startsWith('[') && val.endsWith(']')) {
            val = val.slice(1, -1).split(',').map(s => s.trim());
        }
        meta[key] = val;
    }

    return { meta, body };
}

const files = readdirSync(postsDir).filter(f => f.endsWith('.md'));
const posts = [];

for (const file of files) {
    const raw = readFileSync(join(postsDir, file), 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    const slug = basename(file, '.md');
    const html = marked(body);

    posts.push({
        slug,
        title: meta.title || slug,
        date: meta.date || '未知日期',
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        description: meta.description || '',
        content: html
    });

    // Write individual post HTML for direct linking
    writeFileSync(join(outDir, `${slug}.html`), `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${meta.title || slug} · cmixed</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
    <style>
        body{font-family:'Inter',-apple-system,sans-serif;background:#0f172a;color:#f1f5f9;max-width:720px;margin:0 auto;padding:2rem;line-height:1.8}
        a{color:#525e54}h1{margin-bottom:.5rem}h2{margin-top:2rem}code{background:#1e293b;padding:.15rem .4rem;border-radius:4px;font-size:.9em}
        pre{background:#1e293b;padding:1rem;border-radius:8px;overflow-x:auto}pre code{background:none;padding:0}
        .meta{color:#94a3b8;font-size:.85rem;margin-bottom:2rem}.tag{display:inline-block;padding:.15rem .5rem;border:1px solid rgba(82,94,84,.2);border-radius:4px;font-size:.75rem;margin-right:.5rem;color:#94a3b8}
    </style>
</head>
<body>
    <a href="/">&larr; 返回首页</a>
    <h1>${meta.title || slug}</h1>
    <div class="meta">${meta.date || ''} · ${(meta.tags || []).map(t => `<span class="tag">${t}</span>`).join(' ')}</div>
    ${html}
</body>
</html>`);
}

posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Collect all unique tags
const allTags = [...new Set(posts.flatMap(p => p.tags))];

writeFileSync(join(outDir, 'data.json'), JSON.stringify({ posts, allTags }, null, 2));

// Copy blog index.html to dist
const blogIndex = readFileSync(join(__dirname, 'index.html'), 'utf-8');
writeFileSync(join(outDir, 'index.html'), blogIndex);

console.log(`✓ Generated ${posts.length} posts with ${allTags.length} tags`);
