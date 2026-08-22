import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync, statSync } from 'fs';
import { join, basename } from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';

interface PostMeta {
  title?: string;
  date?: string;
  updated?: string;
  tags?: string[];
  description?: string;
  pinned?: boolean;
}

interface PostInfo {
  mdPath: string;
  slug: string;
  assetsDir: string | null;
}

interface PostData {
  slug: string;
  title: string;
  date: string;
  updated: string;
  tags: string[];
  description: string;
  readTime: number;
  pinned: boolean;
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
}

marked.use({
  breaks: true,
  renderer: {
    image({ href, title, text }: { href: string; title?: string | null; text: string }): string {
      const titleAttr = title ? ` title="${title}"` : '';
      return `<img src="${href}" alt="${text}"${titleAttr} loading="lazy" decoding="async">`;
    },
    link({ href, title, text }: { href: string; title?: string | null; text: string }): string {
      const isExternal = /^https?:\/\//.test(href);
      const titleAttr = title ? ` title="${title}"` : '';
      if (isExternal) {
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
      }
      return `<a href="${href}"${titleAttr}>${text}</a>`;
    },
  } as any,
  extensions: [
    {
      name: 'highlight',
      level: 'inline' as const,
      start(src: string): number | undefined {
        return src.match(/==/)?.index;
      },
      tokenizer(src: string) {
        const match = src.match(/^==(.+?)==/);
        if (match) return { type: 'highlight', raw: match[0], text: match[1] };
      },
      renderer(token: unknown): string {
        return `<mark>${marked.parseInline((token as { text: string }).text)}</mark>`;
      },
    },
  ],
});

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const postsDir = join(__dirname, 'posts');
const outDir = join(__dirname, '..', 'dist', 'blog');
const templatesDir = join(__dirname, 'templates');

export function renderTemplate(template: string, data: Record<string, string>): string {
  return Object.entries(data).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template
  );
}

export function parseFrontmatter(content: string): { meta: PostMeta; body: string } {
  content = content.replace(/\r\n/g, '\n');
  let match = content.match(/^---\n([\s\S]*?)\n\n?---\n([\s\S]*)$/);
  if (!match) match = content.match(/^[^\n]*\n+---\n([\s\S]*?)\n\n?---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const yaml = match[1],
    body = match[2],
    meta: PostMeta = {};
  for (const line of yaml.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val: string | string[] | boolean = line.slice(idx + 1).trim();
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (val.startsWith('[') && val.endsWith(']'))
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim());
    (meta as Record<string, unknown>)[key] = val;
  }
  return { meta, body };
}

function copyDirSync(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name),
      destPath = join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(srcPath, destPath);
    else if (!entry.name.endsWith('.md')) copyFileSync(srcPath, destPath);
  }
}

export function estimateReadTime(body: string): number {
  const text = body.replace(/[#*`[\]()>!-]/g, '').replace(/\s+/g, ' ');
  const words = text.length; // Chinese chars ~ 1 word each
  return Math.max(1, Math.ceil(words / 400));
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '');
}

function discoverPosts(): PostInfo[] {
  const results: PostInfo[] = [];
  for (const entry of readdirSync(postsDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push({
        mdPath: join(postsDir, entry.name),
        slug: basename(entry.name, '.md'),
        assetsDir: null,
      });
    } else if (entry.isDirectory()) {
      const dirPath = join(postsDir, entry.name);
      const mdFiles = readdirSync(dirPath).filter((f: string) => f.endsWith('.md'));
      if (mdFiles.length > 0)
        results.push({
          mdPath: join(dirPath, mdFiles[0]),
          slug: basename(entry.name),
          assetsDir: dirPath,
        });
    }
  }
  return results;
}

function build(): void {
  mkdirSync(outDir, { recursive: true });

  // Process posts
  const postInfos = discoverPosts();
  const posts: PostData[] = [];
  const postHtmlMap: Map<string, { toc: string; content: string }> = new Map();
  const headingRe = /<h([1234])>(.*?)<\/h\1>/g;

  for (const info of postInfos) {
    const raw = readFileSync(info.mdPath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    const htmlBase = (marked(body) as string).replace(/<table>/g, '<div class="table-wrapper"><table>').replace(/<\/table>/g, '</table></div>');
    const readTime = estimateReadTime(body);

    // Get file modification time
    const fileStats = statSync(info.mdPath);
    const mtime = fileStats.mtime;
    const defaultUpdated = `${mtime.getFullYear()}-${String(mtime.getMonth() + 1).padStart(2, '0')}-${String(mtime.getDate()).padStart(2, '0')}`;

    posts.push({
      slug: info.slug,
      title: meta.title || info.slug,
      date: meta.date || '未知日期',
      updated: meta.updated || defaultUpdated,
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      description: meta.description || '',
      readTime,
      pinned: meta.pinned === true,
    });

    // Standalone page (rewrite ./ paths to include slug directory)
    const htmlStandalone = htmlBase.replace(/\.\/(?=[^"']*\.avif)/g, `./${info.slug}/`);

    // Collect headings and add stable IDs based on text content
    interface Heading { id: string; level: number; text: string; }
    const headings: Heading[] = [];
    const usedIds = new Map<string, number>();
    const htmlWithIds = htmlStandalone.replace(headingRe, (_match, level, text) => {
      const cleanText = text.replace(/<[^>]+>/g, '');
      let id = slugify(cleanText);
      const count = usedIds.get(id) || 0;
      usedIds.set(id, count + 1);
      if (count > 0) id += `-${count}`;
      headings.push({ id, level: Number(level), text: cleanText });
      return `<h${level} id="${id}">${text}</h${level}>`;
    });

    // Build nested TOC: h1 (top, no arrow) > h2 (arrow, collapsible) > h3 (arrow if has h4) > h4
    let tocHtml = '';
    const openGroups: number[] = []; // stack of open heading levels

    function closeTo(targetLevel: number): void {
      while (openGroups.length > 0 && openGroups[openGroups.length - 1] >= targetLevel) {
        openGroups.pop();
        tocHtml += '</div></div>';
      }
    }

    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];

      if (h.level === 1) {
        closeTo(1);
        tocHtml += `<div class="toc-item toc-h1"><a href="#${h.id}" data-level="1">${h.text}</a></div>`;
      } else if (h.level === 2) {
        closeTo(2);
        const hasH3Children = i + 1 < headings.length && headings[i + 1].level >= 3;
        if (hasH3Children) {
          tocHtml += `<div class="toc-group"><div class="toc-item"><span class="toc-arrow"></span><a href="#${h.id}" data-level="2" class="toc-link">${h.text}</a></div><div class="toc-children">`;
          openGroups.push(2);
        } else {
          tocHtml += `<div class="toc-item"><span class="toc-spacer"></span><a href="#${h.id}" data-level="2" class="toc-link">${h.text}</a></div>`;
        }
      } else if (h.level === 3) {
        closeTo(3);
        const hasChildren = i + 1 < headings.length && headings[i + 1].level === 4;
        if (hasChildren) {
          tocHtml += `<div class="toc-group collapsed"><div class="toc-item"><span class="toc-arrow"></span><a href="#${h.id}" data-level="3" class="toc-link">${h.text}</a></div><div class="toc-children">`;
          openGroups.push(3);
        } else {
          tocHtml += `<div class="toc-item"><span class="toc-spacer"></span><a href="#${h.id}" data-level="3" class="toc-link">${h.text}</a></div>`;
        }
      } else {
        // h4 — always a leaf
        tocHtml += `<div class="toc-item"><span class="toc-spacer"></span><a href="#${h.id}" data-level="4" class="toc-link">${h.text}</a></div>`;
      }
    }
    closeTo(0);

    // Prepend article title as first TOC item (scrolls to top)
    const titleText = escapeXml(meta.title || info.slug);
    tocHtml = `<div class="toc-item toc-title" onclick="window.scrollTo({top:0,behavior:'smooth'})" style="cursor:pointer"><span>${titleText}</span></div>` + tocHtml;

    postHtmlMap.set(info.slug, { toc: tocHtml, content: htmlWithIds });

    // Copy assets
    if (info.assetsDir) {
      copyDirSync(info.assetsDir, join(outDir, info.slug));
    }
  }

  const pinned = posts.filter((p) => p.pinned).sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
  const rest = posts.filter((p) => !p.pinned).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  posts.splice(0, posts.length, ...pinned, ...rest);

  // Add prev/next and generate final HTML
  const postTemplate = readFileSync(join(templatesDir, 'post.html'), 'utf-8');
  for (let i = 0; i < posts.length; i++) {
    posts[i].prev = i < posts.length - 1 ? { slug: posts[i + 1].slug, title: posts[i + 1].title } : null;
    posts[i].next = i > 0 ? { slug: posts[i - 1].slug, title: posts[i - 1].title } : null;

    const post = posts[i];
    const { toc, content } = postHtmlMap.get(post.slug)!;

    let prevNextHtml = '';
    if (post.prev) {
      prevNextHtml += `<a class="blog-nav-post prev" href="${encodeURIComponent(post.prev.slug)}.html"><div class="blog-nav-post-label">&larr; 上一篇</div><div class="blog-nav-post-title">${escapeXml(post.prev.title)}</div></a>`;
    }
    if (post.next) {
      prevNextHtml += `<a class="blog-nav-post next" href="${encodeURIComponent(post.next.slug)}.html"><div class="blog-nav-post-label">下一篇 &rarr;</div><div class="blog-nav-post-title">${escapeXml(post.next.title)}</div></a>`;
    }

    const postHtml = renderTemplate(postTemplate, {
      slug: post.slug,
      description: escapeXml(post.description),
      descriptionHtml: post.description
        ? `<p class="blog-article-desc">${escapeXml(post.description)}</p>`
        : '',
      title: escapeXml(post.title),
      date: post.date,
      updated: post.updated,
      readTime: String(post.readTime),
      tags: post.tags.map((t) => `<span class="tag">${escapeXml(t)}</span>`).join(' '),
      toc,
      content,
      prevNext: prevNextHtml,
    });
    writeFileSync(join(outDir, `${post.slug}.html`), postHtml);
  }

  const allTags = [...new Set(posts.flatMap((p) => p.tags))];

  // Generate data.json for main site blog preview
  const dataJson = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    updated: p.updated,
    tags: p.tags,
    description: p.description,
    ...(p.pinned ? { pinned: true } : {}),
  }));
  writeFileSync(join(outDir, 'data.json'), JSON.stringify({ posts: dataJson, allTags }, null, 2));

  // Generate RSS feed
  const rssItems = posts
    .map(
      (p) => `
    <item>
        <title>${escapeXml(p.title)}</title>
        <link>https://cmixed.github.io/blog/${encodeURIComponent(p.slug)}.html</link>
        <description>${escapeXml(p.description)}</description>
        <pubDate>${new Date(p.date).toUTCString()}</pubDate>
        <guid>https://cmixed.github.io/blog/${encodeURIComponent(p.slug)}.html</guid>
    </item>`
    )
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
    <title>cmixed 博客</title>
    <link>https://cmixed.github.io/blog/</link>
    <atom:link href="https://cmixed.github.io/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <description>cmixed 的技术博客 - C++、Rust、系统编程、AI 应用</description>
    <language>zh-cn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
</channel>
</rss>`;

  writeFileSync(join(outDir, 'feed.xml'), rss);

  // Generate sitemap with blog posts
  const sitemapUrls = posts
    .map(
      (p) => `  <url>
    <loc>https://cmixed.github.io/blog/${encodeURIComponent(p.slug)}.html</loc>
    <lastmod>${p.updated}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cmixed.github.io/</loc>
    <lastmod>2026-08-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://cmixed.github.io/blog/</loc>
    <lastmod>${posts.length > 0 ? posts[0].updated : '2026-08-22'}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
${sitemapUrls}
</urlset>`;

  writeFileSync(join(outDir, 'sitemap.xml'), sitemap);

  // Generate static blog list page
  const indexTemplate = readFileSync(join(__dirname, 'index.html'), 'utf-8');
  const tagsHtml = allTags.map((t) => `<a href="./?tag=${encodeURIComponent(t)}" class="blog-tag">${escapeXml(t)}</a>`).join('');
  const postsHtml = posts
    .map((p) => `
        <a href="./${encodeURIComponent(p.slug)}.html" class="blog-page-card" data-date="${escapeXml(p.date)}" data-updated="${escapeXml(p.updated)}">
            <div class="blog-page-card-title">${escapeXml(p.title)}</div>
            <div class="blog-page-card-tags">${p.tags.map((t) => `<span>${escapeXml(t)}</span>`).join('')}</div>
            <div class="blog-page-card-meta">阅读约 ${p.readTime} 分钟 · 创建于 ${escapeXml(p.date)} · 更新于 ${escapeXml(p.updated)}</div>
            <div class="blog-page-card-desc">${escapeXml(p.description)}</div>
        </a>`)
    .join('');
  const indexHtml = indexTemplate.replace('{{tags}}', tagsHtml).replace('{{posts}}', postsHtml);
  writeFileSync(join(outDir, 'index.html'), indexHtml);

  // Generate blog 404 page
  const notFoundTemplate = readFileSync(join(templatesDir, '404.html'), 'utf-8');
  writeFileSync(join(outDir, '404.html'), notFoundTemplate);

  // Copy main CSS
  const cssDir = join(__dirname, '..', 'dist', 'assets');
  const cssFiles = readdirSync(cssDir).filter((f: string) => f.endsWith('.css'));
  if (cssFiles.length > 0)
    writeFileSync(join(outDir, 'style.css'), readFileSync(join(cssDir, cssFiles[0]), 'utf-8'));

  console.log(`✓ ${posts.length} posts, ${allTags.length} tags, RSS feed, 404 page`);
}

// Only run build when executed directly, not when imported
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  build();
}
