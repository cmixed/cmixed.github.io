import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    cssMinify: 'esbuild',
    minify: 'esbuild',
  },
  css: {
    devSourcemap: false,
  },
});
