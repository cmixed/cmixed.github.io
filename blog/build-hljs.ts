import { readFileSync, readdirSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const postsDir = join(__dirname, 'post');
const vendorDir = join(__dirname, 'vendor');
const outPath = join(vendorDir, 'highlight.min.js');

interface LangInfo {
  hljsName: string;
  modulePath: string;
}

const LANG_MAP: Record<string, LangInfo> = {
  cpp: { hljsName: 'cpp', modulePath: 'highlight.js/lib/languages/cpp.js' },
  assembly: { hljsName: 'x86asm', modulePath: 'highlight.js/lib/languages/x86asm' },
  text: { hljsName: 'plaintext', modulePath: 'highlight.js/lib/languages/plaintext' },
  plaintext: { hljsName: 'plaintext', modulePath: 'highlight.js/lib/languages/plaintext' },
  EBNF: { hljsName: 'ebnf', modulePath: 'highlight.js/lib/languages/ebnf' },
  ebnf: { hljsName: 'ebnf', modulePath: 'highlight.js/lib/languages/ebnf' },
  yaml: { hljsName: 'yaml', modulePath: 'highlight.js/lib/languages/yaml' },
  bash: { hljsName: 'bash', modulePath: 'highlight.js/lib/languages/bash' },
  json: { hljsName: 'json', modulePath: 'highlight.js/lib/languages/json' },
  xml: { hljsName: 'xml', modulePath: 'highlight.js/lib/languages/xml' },
  css: { hljsName: 'css', modulePath: 'highlight.js/lib/languages/css' },
  javascript: { hljsName: 'javascript', modulePath: 'highlight.js/lib/languages/javascript' },
  js: { hljsName: 'javascript', modulePath: 'highlight.js/lib/languages/javascript' },
  typescript: { hljsName: 'typescript', modulePath: 'highlight.js/lib/languages/typescript' },
  ts: { hljsName: 'typescript', modulePath: 'highlight.js/lib/languages/typescript' },
  rust: { hljsName: 'rust', modulePath: 'highlight.js/lib/languages/rust' },
  python: { hljsName: 'python', modulePath: 'highlight.js/lib/languages/python' },
  c: { hljsName: 'c', modulePath: 'highlight.js/lib/languages/c' },
  diff: { hljsName: 'diff', modulePath: 'highlight.js/lib/languages/diff' },
  ini: { hljsName: 'ini', modulePath: 'highlight.js/lib/languages/ini' },
  toml: { hljsName: 'toml', modulePath: 'highlight.js/lib/languages/toml' },
  markdown: { hljsName: 'markdown', modulePath: 'highlight.js/lib/languages/markdown' },
  sql: { hljsName: 'sql', modulePath: 'highlight.js/lib/languages/sql' },
  shell: { hljsName: 'shell', modulePath: 'highlight.js/lib/languages/shell' },
  dockerfile: { hljsName: 'dockerfile', modulePath: 'highlight.js/lib/languages/dockerfile' },
};

function scanLanguages(): Set<string> {
  const langs = new Set<string>();
  for (const entry of readdirSync(postsDir, { withFileTypes: true })) {
    let mdPath: string | null = null;
    if (entry.isFile() && entry.name.endsWith('.md')) {
      mdPath = join(postsDir, entry.name);
    } else if (entry.isDirectory()) {
      const dirPath = join(postsDir, entry.name);
      for (const f of readdirSync(dirPath)) {
        if (f.endsWith('.md')) { mdPath = join(dirPath, f); break; }
      }
    }
    if (!mdPath) continue;
    const content = readFileSync(mdPath, 'utf-8');
    for (const m of content.matchAll(/^```(\S+)/gm)) {
      const lang = m[1].trim();
      if (lang && lang !== 'mermaid') langs.add(lang);
    }
  }
  return langs;
}

function buildHljs(usedLangs: Set<string>): void {
  mkdirSync(vendorDir, { recursive: true });

  const imports: string[] = [];
  const registrations: string[] = [];

  for (const lang of usedLangs) {
    const info = LANG_MAP[lang];
    if (!info) {
      console.warn(`  ⚠ Unknown language: "${lang}", skipping`);
      continue;
    }
    imports.push(`import ${info.hljsName} from '${info.modulePath}';`);
    registrations.push(`hljs.registerLanguage('${info.hljsName}', ${info.hljsName});`);
  }

  const bundleCode = `
import hljs from 'highlight.js/lib/core';
${imports.join('\n')}
${registrations.join('\n')}
window.hljs = hljs;
`;

  const tmpFile = join(__dirname, '_hljs_bundle.ts');
  writeFileSync(tmpFile, bundleCode);

  try {
    execFileSync('npx', [
      'esbuild', tmpFile,
      '--bundle',
      '--format=iife',
      '--global-name=hljs',
      '--minify',
      '--outfile=' + outPath,
    ], { stdio: 'inherit' });
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

// Only run when executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const langs = scanLanguages();
  console.log(`✓ Scanned languages: ${[...langs].join(', ')}`);
  buildHljs(langs);
  const size = readFileSync(outPath).length;
  console.log(`✓ Built highlight.min.js (${size} bytes)`);
}
