/* 站点脚本（主题 / 指针特效 / 列表搜索）的编译入口。
 *
 * 这三个脚本必须是「固定文件名的经典脚本」：theme 要在 <head> 里同步跑完（首帧前定下主题，
 * 否则会闪），另外两个被 HTML 直接 <script src>。所以它们不进 Vite 的打包图（进去会被加 hash、
 * 变成 module），而是放在 src/client/*.ts，由这里用 esbuild 单独编译：
 *   - vp build：作为 asset 直接写到 dist/<name>.js（文件名保持不变，HTML 不用改）
 *   - vp dev：用中间件在内存里编译后返回，不用先构建
 * 好处是源码是 TS，vp check / tsc 会做类型检查；产物仍是零依赖的经典脚本。 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { transform } from 'esbuild';
import type { Plugin } from 'vite-plus';

const CLIENT_SCRIPTS = ['theme', 'cursor', 'search'] as const;
type ClientScript = (typeof CLIENT_SCRIPTS)[number];

const SOURCE_DIR = join(import.meta.dirname, '..', 'src', 'client');
const PUBLIC_PATH = /^\/(theme|cursor|search)\.js$/;

async function compile(name: ClientScript): Promise<string> {
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
}

export function clientScripts(): Plugin {
  const cache = new Map<ClientScript, Promise<string>>();
  const codeOf = (name: ClientScript): Promise<string> => {
    let pending = cache.get(name);
    if (!pending) {
      pending = compile(name);
      cache.set(name, pending);
    }
    return pending;
  };

  return {
    name: 'cmixed:client-scripts',

    // dev：/theme.js、/cursor.js、/search.js 现编译现发
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = PUBLIC_PATH.exec((req.url || '').split('?')[0])?.[1] as
          | ClientScript
          | undefined;
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
      for (const name of CLIENT_SCRIPTS) {
        this.emitFile({ type: 'asset', fileName: `${name}.js`, source: await codeOf(name) });
      }
    },
  };
}
