/**
 * 首页是唯一的 Vite HTML 入口，`{{icon:…}}` 令牌在这里展开。
 * 博客 / 小窝的骨架由各自的 build.ts 读取，所以那边直接调用 replaceIcons()，
 * 两边读的是同一份 src/lib/icons.ts。
 */
import type { Plugin } from 'vite-plus';
import { replaceIcons } from '../src/lib/icons';

export function iconTokens(): Plugin {
  return {
    name: 'icon-tokens',
    transformIndexHtml(html) {
      return replaceIcons(html);
    },
  };
}
