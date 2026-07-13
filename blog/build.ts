import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync, statSync } from 'fs';
import { join, basename } from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';

interface PostMeta {
  title?: string;
  date?: string;
  tags?: string[];
  description?: string;
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
  tags: string[];
  description: string;
  readTime: number;
  content: string;
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
}

marked.use({
  breaks: true,
  renderer: {
    image({ href, title, text }: { href: string; title?: string | null; text: string }): string {
      const titleAttr = title ? ` title="${title}"` : '';
      return `<img src="${href}" alt="${text}"${titleAttr} loading="lazy">`;
    },
    link({ href, title, text }: { href: string; title?: string | null; text: string }): string {
      const isExternal = /^https?:\/\//.test(href);
      const titleAttr = title ? ` title="${title}"` : '';
      if (isExternal) {
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
      }
      return `<a href="${href}"${titleAttr}>${text}</a>`;
    },
  },
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
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const yaml = match[1],
    body = match[2],
    meta: PostMeta = {};
  for (const line of yaml.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val: string | string[] = line.slice(idx + 1).trim();
    if (val.startsWith('[') && val.endsWith(']'))
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

  for (const info of postInfos) {
    const raw = readFileSync(info.mdPath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    const htmlBase = marked(body) as string;
    const readTime = estimateReadTime(body);

    posts.push({
      slug: info.slug,
      title: meta.title || info.slug,
      date: meta.date || '未知日期',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      description: meta.description || '',
      readTime,
      content: '',
    });

    // Standalone page (rewrite ./ paths to include slug directory)
    const htmlStandalone = htmlBase.replace(/\.\/(?=[^"']*\.avif)/g, `./${info.slug}/`);

    // Collect headings and add IDs
    interface Heading { id: string; level: number; text: string; }
    const headings: Heading[] = [];
    const htmlWithIds = htmlStandalone.replace(/<h([23])>(.*?)<\/h\1>/g, (_match, level, text, offset) => {
      const id = 'heading-' + offset;
      const cleanText = text.replace(/<[^>]+>/g, '');
      headings.push({ id, level: Number(level), text: cleanText });
      return `<h${level} id="${id}">${text}</h${level}>`;
    });

    // Build nested TOC: h2 groups with h3 children
    let tocHtml = '';
    let inGroup = false;
    for (const h of headings) {
      if (h.level === 2) {
        if (inGroup) tocHtml += '</div>';
        tocHtml += `<div class="toc-group"><a href="#${h.id}" data-level="2" class="toc-h2">${h.text}</a><div class="toc-children">`;
        inGroup = true;
      } else {
        tocHtml += `<a href="#${h.id}" data-level="3">${h.text}</a>`;
      }
    }
    if (inGroup) tocHtml += '</div></div>';

    postHtmlMap.set(info.slug, { toc: tocHtml, content: htmlWithIds });

    // Copy assets
    if (info.assetsDir && statSync(info.assetsDir).isDirectory()) {
      copyDirSync(info.assetsDir, join(outDir, info.slug));
    }
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
      title: escapeXml(post.title),
      date: post.date,
      readTime: String(post.readTime),
      tags: post.tags.map((t) => `<span class="tag">${escapeXml(t)}</span>`).join(' '),
      toc,
      content,
      prevNext: prevNextHtml,
    });
    writeFileSync(join(outDir, `${post.slug}.html`), postHtml);
  }

  const allTags = [...new Set(posts.flatMap((p) => p.tags))];

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

  // Generate static blog list page
  const indexTemplate = readFileSync(join(__dirname, 'index.html'), 'utf-8');
  const tagsHtml = allTags.map((t) => `<a href="./?tag=${encodeURIComponent(t)}" class="blog-tag">${escapeXml(t)}</a>`).join('');
  const postsHtml = posts
    .map((p) => `
        <a href="./${encodeURIComponent(p.slug)}.html" class="blog-page-card">
            <div class="blog-page-card-title">${escapeXml(p.title)}</div>
            <div class="blog-page-card-meta">${escapeXml(p.date)} · 阅读约 ${p.readTime} 分钟</div>
            <div class="blog-page-card-desc">${escapeXml(p.description)}</div>
            <div class="blog-page-card-tags">${p.tags.map((t) => `<span>${escapeXml(t)}</span>`).join('')}</div>
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
