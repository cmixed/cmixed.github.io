import { describe, expect, it } from 'vite-plus/test';
import { migrateIgnoreFsModuleCache, vitestVscodeCompat } from '../../scripts/vitest-vscode-compat';

describe('vitestVscodeCompat', () => {
  it('把扩展的废弃字段迁移到 api.vitest.ignoreFsModuleCache', () => {
    const plugin = {
      name: 'vitest:vscode-extension',
      api: { vitest: { experimental: { ignoreFsModuleCache: true } } },
    };

    vitestVscodeCompat().configResolved({ plugins: [plugin] });

    expect(plugin.api.vitest).toEqual({ experimental: {}, ignoreFsModuleCache: true });
  });

  it('其他插件与已迁移的插件保持原样', () => {
    const modern = { name: 'modern', api: { vitest: { ignoreFsModuleCache: true } } };
    const other = { name: 'other' };
    const frozen = {
      name: 'frozen',
      api: { vitest: { experimental: { ignoreFsModuleCache: false } } },
    };
    const snapshot = structuredClone([modern, other, frozen]);

    vitestVscodeCompat().configResolved({ plugins: [modern, other, frozen] });

    expect([modern, other, frozen]).toEqual(snapshot);
    expect(migrateIgnoreFsModuleCache(other)).toBe(false);
  });
});
