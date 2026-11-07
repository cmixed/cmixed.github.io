/* 站点脚本（主题 / 指针特效 / 列表搜索 / 列表排序 / 浮动操作 / 整页滚动条）的编译入口。
 *
 * 这几个脚本必须是「固定文件名的经典脚本」：theme 要在 <head> 里同步跑完（首帧前定下主题，
 * 否则会闪），另外几个被 HTML 直接 <script src>。所以它们不进 Vite 的打包图（进去会被加 hash、
 * 变成 module），而是放在 src/client/*.ts，由这里用 esbuild 单独编译：
 *   - vp build：作为 asset 直接写到 dist/<name>.js（文件名保持不变，HTML 不用改）
 *   - vp dev：用中间件在内存里编译后返回，不用先构建
 * 好处是源码是 TS，vp check / tsc 会做类型检查；产物仍是零依赖的经典脚本。
 *
 * 产物按「谁和谁总是一起加载」分组，减少小文件与请求数：
 *   theme.js   只给 <head> 的同步脚本（首帧前定主题）
 *   cursor.js  只给 public/404.html —— 那个页面是自带内联样式的独立页，
 *              没有 fab / 滚动条的样式，不能塞进 ui.js
 *   ui.js      cursor + fab + scrollbar，全站主页面（主页 / 博客 / 小窝）共用
 *   list.js    search + sort + filter-panel，只有博客与资源小窝的列表页要
 * 源码仍然是各自的文件，合并只发生在产物这一层。
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';
import type { Plugin } from 'vite-plus';

type SourceScript =
  | 'theme'
  | 'cursor'
  | 'search'
  | 'sort'
  | 'filter-panel'
  | 'card-popover'
  | 'fab'
  | 'scrollbar';

/** 产物名 → 源码（按顺序拼接，各自仍是独立 IIFE）。 */
const BUNDLES = {
  theme: ['theme'],
  cursor: ['cursor'],
  ui: ['cursor', 'fab', 'scrollbar', 'card-popover'],
  list: ['search', 'sort', 'filter-panel'],
} as const satisfies Record<string, readonly SourceScript[]>;

type BundleName = keyof typeof BUNDLES;

const SOURCE_DIR = join(import.meta.dirname, '..', 'src', 'client');
const PUBLIC_PATH = /^\/(theme|cursor|ui|list)\.js$/;

const compiled = new Map<SourceScript, Promise<string>>();

async function compileSource(name: SourceScript): Promise<string> {
  const cached = compiled.get(name);
  if (cached) return cached;

  const pending = (async () => {
    const source = await readFile(join(SOURCE_DIR, `${name}.ts`), 'utf8');
    const { code } = await transform(source, {
      loader: 'ts',
      format: 'esm',
      target: 'es2020',
      sourcefile: `${name}.ts`,
    });
    // 产物要当经典脚本直接 <script src> 跑，不能带顶层 import / export
    if (/^\s*(import|export)\b/m.test(code)) {
      throw new Error(`${name}.ts 不能有顶层 import / export：它会被当成经典脚本加载`);
    }
    return code;
  })();

  compiled.set(name, pending);
  return pending;
}

function codeOf(name: BundleName): Promise<string> {
  return Promise.all(BUNDLES[name].map(compileSource)).then((parts) => parts.join('\n'));
}

/* 产物文件名是固定的（theme.js / ui.js …），浏览器和 CDN 会按 URL 缓存 ——
   改了脚本、用户拿到的还是旧版。这里给每个产物算一个内容 hash，
   在 HTML 里以 `?v=` 的形式拼上：文件名不变，缓存靠 query 失效。 */
const versions = new Map<BundleName, string>();

function digest(js: string): string {
  return createHash('sha256').update(js).digest('hex').slice(0, 8);
}

async function prepareVersions(): Promise<void> {
  for (const name of Object.keys(BUNDLES) as BundleName[]) {
    versions.set(name, digest(await codeOf(name)));
  }
}

export function clientScripts(): Plugin {
  return {
    name: 'cmixed:client-scripts',

    async buildStart() {
      await prepareVersions();
    },

    /* HTML 里的 <script src="./ui.js"> 改写成 ./ui.js?v=<hash>。
       顺序很重要：buildStart 已经把 hash 算好，这里才读得到。 */
    transformIndexHtml(html: string) {
      return html.replace(
        /(src="\.?\/?)(theme|cursor|ui|list)\.js"/g,
        (_match, prefix: string, name: string) =>
          `${prefix}${name}.js?v=${versions.get(name as BundleName) ?? '0'}"`
      );
    },

    // dev：/theme.js、/cursor.js、/ui.js、/list.js 现编译现发
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = PUBLIC_PATH.exec((req.url || '').split('?')[0])?.[1] as BundleName | undefined;
        if (!name) return next();
        codeOf(name).then(
          (js) => {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(js);
          },
          (err: unknown) => next(err instanceof Error ? err : new Error(String(err)))
        );
      });
    },

    // build：写进 dist/，文件名与 public/ 时代完全一致
    async generateBundle() {
      for (const name of Object.keys(BUNDLES) as BundleName[]) {
        const js = await codeOf(name);
        versions.set(name, digest(js));
        this.emitFile({ type: 'asset', fileName: `${name}.js`, source: js });
      }
    },
  };
}
