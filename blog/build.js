import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync, statSync } from 'fs';
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

function copyDirSync(src, dest) {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src, { withFileTypes: true })) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else if (!entry.name.endsWith('.md')) {
            copyFileSync(srcPath, destPath);
        }
    }
}

// Discover posts: .md files in posts/ OR .md inside subdirectories of posts/
function discoverPosts() {
    const results = [];
    for (const entry of readdirSync(postsDir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
            results.push({
                mdPath: join(postsDir, entry.name),
                slug: basename(entry.name, '.md'),
                assetsDir: null
            });
        } else if (entry.isDirectory()) {
            const dirPath = join(postsDir, entry.name);
            const mdFiles = readdirSync(dirPath).filter(f => f.endsWith('.md'));
            if (mdFiles.length > 0) {
                results.push({
                    mdPath: join(dirPath, mdFiles[0]),
                    slug: basename(entry.name),
                    assetsDir: dirPath
                });
            }
        }
    }
    return results;
}

const postInfos = discoverPosts();
const posts = [];

for (const info of postInfos) {
    const raw = readFileSync(info.mdPath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);

    // Rewrite image paths: ./img.png → slug/img.png (for blog index page)
    // and keep ./img.png for standalone page (images are in same dir)
    const bodyForJson = body.replace(/\.\//g, `./${info.slug}/`);
    const bodyForHtml = body;

    const htmlJson = marked(bodyForJson);
    const htmlStandalone = marked(bodyForHtml);

    posts.push({
        slug: info.slug,
        title: meta.title || info.slug,
        date: meta.date || '未知日期',
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        description: meta.description || '',
        content: htmlJson
    });

    // Standalone page
    writeFileSync(join(outDir, `${info.slug}.html`), `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${meta.title || info.slug} · cmixed</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
    <style>
        body{font-family:'Inter',-apple-system,sans-serif;background:#0f172a;color:#f1f5f9;max-width:720px;margin:0 auto;padding:2rem;line-height:1.8}
        a{color:#525e54}h1{margin-bottom:.5rem}h2{margin-top:2rem}code{background:#1e293b;padding:.15rem .4rem;border-radius:4px;font-size:.9em}
        pre{background:#1e293b;padding:1rem;border-radius:8px;overflow-x:auto}pre code{background:none;padding:0}
        .meta{color:#94a3b8;font-size:.85rem;margin-bottom:2rem}.tag{display:inline-block;padding:.15rem .5rem;border:1px solid rgba(82,94,84,.2);border-radius:4px;font-size:.75rem;margin-right:.5rem;color:#94a3b8}
        img{max-width:100%;border-radius:8px;margin:1rem 0}
    </style>
</head>
<body>
    <a href="../">&larr; 返回博客</a>
    <h1>${meta.title || info.slug}</h1>
    <div class="meta">${meta.date || ''} · ${(meta.tags || []).map(t => `<span class="tag">${t}</span>`).join(' ')}</div>
    ${htmlStandalone}
</body>
</html>`);

    // Copy assets (images etc.) — skip .md files
    if (info.assetsDir && statSync(info.assetsDir).isDirectory()) {
        copyDirSync(info.assetsDir, join(outDir, info.slug));
    }
}

posts.sort((a, b) => new Date(b.date) - new Date(a.date));

const allTags = [...new Set(posts.flatMap(p => p.tags))];

writeFileSync(join(outDir, 'data.json'), JSON.stringify({ posts, allTags }, null, 2));

const blogIndex = readFileSync(join(__dirname, 'index.html'), 'utf-8');
writeFileSync(join(outDir, 'index.html'), blogIndex);

console.log(`✓ Generated ${posts.length} posts with ${allTags.length} tags`);
