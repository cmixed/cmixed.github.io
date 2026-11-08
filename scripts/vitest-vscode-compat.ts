/**
 * VS Code 的 Vitest 扩展（截至 1.52.2）仍通过已废弃的
 * `api.vitest.experimental.ignoreFsModuleCache` 声明自己的插件，Vitest 5 会因此打印
 * DEPRECATED 警告。这里在配置解析后把字段迁到新位置；扩展改用新字段后自动失效。
 * 其他环境没有这个插件，所以对 `vp test` / CI 是空操作。
 */

export interface VitestPluginApi {
  ignoreFsModuleCache?: boolean;
  experimental?: { ignoreFsModuleCache?: boolean };
}

/** 迁移单个插件的字段，返回是否发生了迁移。 */
export function migrateIgnoreFsModuleCache(plugin: unknown): boolean {
  const api = (plugin as { api?: { vitest?: VitestPluginApi } }).api?.vitest;
  if (api?.experimental?.ignoreFsModuleCache !== true) return false;
  api.ignoreFsModuleCache = true;
  delete api.experimental.ignoreFsModuleCache;
  return true;
}

export function vitestVscodeCompat() {
  return {
    name: 'vitest-vscode-compat',
    enforce: 'post' as const,
    configResolved(config: { plugins: readonly unknown[] }) {
      for (const plugin of config.plugins) migrateIgnoreFsModuleCache(plugin);
    },
  };
}
