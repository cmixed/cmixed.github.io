import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { parseFrontmatter, escapeXml } from '../src/lib/build-utils';
import { marked } from 'marked';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const filesDir = join(__dirname, 'files');
const outDir = join(__dirname, '..', 'dist', 'nook');

interface ResourceData {
  id: string;
  title: string;
  category: string;
  file: string | null;
  size: string;
  date: string;
  tags: string[];
  description: string;
  body: string;
  dirPath: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  docs: '📄',
  tools: '🔧',
  code: '💻',
};

const CATEGORY_NAMES: Record<string, string> = {
  docs: '文档',
  tools: '工具',
  code: '代码',
};

function truncateText(text: string, maxLen: number): string {
  const clean = text.replace(/[#*`[\]()>!-]/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen) + '...';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
  return `${size} ${units[i]}`;
}

function discoverResources(): ResourceData[] {
  const results: ResourceData[] = [];
  const categories = ['docs', 'tools', 'code'];

  for (const category of categories) {
    const categoryDir = join(filesDir, category);
    try {
      statSync(categoryDir);
    } catch {
      continue;
    }

    for (const entry of readdirSync(categoryDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dirPath = join(categoryDir, entry.name);
      const mdPath = join(dirPath, 'index.md');

      try {
        statSync(mdPath);
      } catch {
        continue;
      }

      const raw = readFileSync(mdPath, 'utf-8');
      const { meta, body } = parseFrontmatter(raw);
      const description = (meta.description as string) || truncateText(body, 120);

      let filePath: string | null = null;
      let fileSize = '';
      let resourceDate = meta.date || '';
      if (meta.file) {
        try {
          const fileStat = statSync(join(dirPath, meta.file));
          filePath = meta.file;
          fileSize = formatFileSize(fileStat.size);
          if (!resourceDate) {
            resourceDate = fileStat.mtime.toISOString().slice(0, 10);
          }
        } catch {
          console.warn(`  ⚠ File not found: ${entry.name}/${meta.file}`);
        }
      }
      if (!resourceDate) {
        try {
          const mdStat = statSync(mdPath);
          resourceDate = mdStat.mtime.toISOString().slice(0, 10);
        } catch {
          resourceDate = '';
        }
      }

      results.push({
        id: entry.name,
        title: meta.title || entry.name,
        category: meta.category || category,
        file: filePath,
        size: fileSize,
        date: resourceDate,
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        description,
        body,
        dirPath,
      });
    }
  }

  results.sort((a, b) => b.date.localeCompare(a.date));
  return results;
}

function renderFilters(categories: string[]): string {
  const allBtn = `<button class="nook-filter active" data-category="">全部</button>`;
  const catBtns = categories
    .map(
      (cat) =>
        `<button class="nook-filter" data-category="${escapeXml(cat)}">${CATEGORY_ICONS[cat] || ''} ${CATEGORY_NAMES[cat] || cat}</button>`
    )
    .join('');
  return allBtn + catBtns;
}

function renderResources(resources: ResourceData[]): string {
  if (resources.length === 0) {
    return `<div class="nook-empty"><div class="nook-empty-icon">📦</div><p>暂无资源</p></div>`;
  }

  return resources
    .map((r) => {
      const icon = CATEGORY_ICONS[r.category] || '📦';
      const catName = CATEGORY_NAMES[r.category] || r.category;
      const tags = r.tags.map((t) => `<span>${escapeXml(t)}</span>`).join('');
      const fileBtn = r.file
        ? `<button class="nook-download" onclick="event.preventDefault();event.stopPropagation();window.open('files/${encodeURIComponent(r.id)}/${encodeURIComponent(r.file)}','_self')">下载 ${escapeXml(r.file.split('.').pop() || '')}</button>`
        : `<span class="nook-download" style="opacity:0.5;cursor:not-allowed">文件缺失</span>`;
      const metaParts = [];
      if (r.size) metaParts.push(escapeXml(r.size));
      if (r.date) metaParts.push(escapeXml(r.date));
      const metaStr = metaParts.join(' · ');

      return `<a href="${encodeURIComponent(r.id)}.html" class="nook-card fade-in-item" data-category="${escapeXml(r.category)}">
            <div class="nook-card-header">
                <div class="nook-card-title">${escapeXml(r.title)}</div>
                <span class="nook-card-category">${icon} ${catName}</span>
            </div>
            <div class="nook-card-desc">${escapeXml(r.description)}</div>
            <div class="nook-card-tags">${tags}</div>
            <div class="nook-card-meta">
                <span class="nook-card-info">${metaStr}</span>
                ${fileBtn}
            </div>
        </a>`;
    })
    .join('');
}

function renderDetailPage(r: ResourceData): string {
  const icon = CATEGORY_ICONS[r.category] || '📦';
  const catName = CATEGORY_NAMES[r.category] || r.category;
  const tags = r.tags.map((t) => `<span>${escapeXml(t)}</span>`).join('');
  const metaParts = [];
  if (r.size) metaParts.push(escapeXml(r.size));
  if (r.date) metaParts.push(escapeXml(r.date));
  const metaStr = metaParts.join(' · ');
  const downloadBtn = r.file
    ? `<a href="files/${encodeURIComponent(r.id)}/${encodeURIComponent(r.file)}" class="nook-detail-download" download>下载 ${escapeXml(r.file)}</a>`
    : `<span class="nook-detail-download" style="opacity:0.5;cursor:not-allowed">文件缺失</span>`;
  const content = marked.parse(r.body);
  const descriptionHtml = r.description
    ? `<p class="nook-detail-desc">${escapeXml(r.description)}</p>`
    : '';

  const tpl = readFileSync(join(__dirname, 'templates', 'detail.html'), 'utf-8');
  return tpl
    .replace(/\{\{title\}\}/g, escapeXml(r.title))
    .replace('{{description}}', escapeXml(r.description))
    .replace('{{slug}}', encodeURIComponent(r.id))
    .replace('{{categoryIcon}}', icon)
    .replace('{{categoryName}}', catName)
    .replace('{{size}}', metaStr)
    .replace('{{date}}', '')
    .replace('{{tags}}', tags)
    .replace('{{downloadBtn}}', downloadBtn)
    .replace('{{descriptionHtml}}', descriptionHtml)
    .replace('{{content}}', content);
}

async function build(): Promise<void> {
  mkdirSync(outDir, { recursive: true });

  const resources = discoverResources();
  const categories = [...new Set(resources.map((r) => r.category))];

  const filtersHtml = renderFilters(categories);
  const resourcesHtml = renderResources(resources);

  const template = readFileSync(join(__dirname, 'index.html'), 'utf-8');
  const html = template.replace('{{filters}}', filtersHtml).replace('{{resources}}', resourcesHtml);
  writeFileSync(join(outDir, 'index.html'), html);

  // Generate detail pages
  for (const r of resources) {
    const detailHtml = renderDetailPage(r);
    writeFileSync(join(outDir, `${r.id}.html`), detailHtml);
  }

  // Copy 404 page
  const notFoundSrc = join(__dirname, '404.html');
  try {
    statSync(notFoundSrc);
    copyFileSync(notFoundSrc, join(outDir, '404.html'));
  } catch {
    // 404 page is optional
  }

  // Copy main CSS from Vite output
  const cssDir = join(__dirname, '..', 'dist', 'assets');
  try {
    const cssFiles = readdirSync(cssDir).filter((f: string) => f.endsWith('.css'));
    if (cssFiles.length > 0) {
      writeFileSync(join(outDir, 'style.css'), readFileSync(join(cssDir, cssFiles[0]), 'utf-8'));
    }
  } catch {
    console.warn('  ⚠ Could not copy CSS from dist/assets/');
  }

  // Copy resource files
  for (const r of resources) {
    if (!r.file) continue;
    const srcFile = join(r.dirPath, r.file);
    const destDir = join(outDir, 'files', r.id);
    mkdirSync(destDir, { recursive: true });
    try {
      copyFileSync(srcFile, join(destDir, r.file));
    } catch {
      console.warn(`  ⚠ Failed to copy: ${r.id}/${r.file}`);
    }
  }

  // Generate data.json
  const dataJson = resources.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    file: r.file,
    size: r.size,
    date: r.date,
    tags: r.tags,
    description: r.description,
  }));
  writeFileSync(join(outDir, 'data.json'), JSON.stringify({ resources: dataJson, categories }, null, 2));

  console.log(`✓ ${resources.length} resources, ${categories.length} categories`);
}

// Only run build when executed directly, not when imported
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  build().catch(console.error);
}
