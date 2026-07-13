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

  for (const info of postInfos) {
    const raw = readFileSync(info.mdPath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    const slugForPaths = encodeURIComponent(info.slug);
    const htmlBase = marked(body) as string;
    const htmlJson = htmlBase.replace(/\.\/(?=["'])/g, `./${slugForPaths}/`);
    const readTime = estimateReadTime(body);

    posts.push({
      slug: info.slug,
      title: meta.title || info.slug,
      date: meta.date || '未知日期',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      description: meta.description || '',
      readTime,
      content: htmlJson,
    });

    // Standalone page
    const postTemplate = readFileSync(join(templatesDir, 'post.html'), 'utf-8');
    const postHtml = renderTemplate(postTemplate, {
      slug: info.slug,
      description: escapeXml(meta.description || ''),
      title: escapeXml(meta.title || info.slug),
      date: meta.date || '',
      readTime: String(readTime),
      tags: (meta.tags || []).map((t) => `<span class="tag">${escapeXml(t)}</span>`).join(' '),
      content: htmlBase,
    });
    writeFileSync(join(outDir, `${info.slug}.html`), postHtml);

    // Copy assets
    if (info.assetsDir && statSync(info.assetsDir).isDirectory()) {
      copyDirSync(info.assetsDir, join(outDir, info.slug));
    }
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Add prev/next
  for (let i = 0; i < posts.length; i++) {
    posts[i].prev =
      i < posts.length - 1 ? { slug: posts[i + 1].slug, title: posts[i + 1].title } : null;
    posts[i].next = i > 0 ? { slug: posts[i - 1].slug, title: posts[i - 1].title } : null;
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

  writeFileSync(join(outDir, 'data.json'), JSON.stringify({ posts, allTags }, null, 2));
  writeFileSync(join(outDir, 'feed.xml'), rss);

  // Copy blog index.html
  writeFileSync(join(outDir, 'index.html'), readFileSync(join(__dirname, 'index.html'), 'utf-8'));

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
