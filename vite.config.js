import { defineConfig } from 'vite';
import { compression, defineAlgorithm } from 'vite-plugin-compression2';
import { constants } from 'node:zlib';

export default defineConfig({
  base: './',
  plugins: [
    compression({
      algorithms: [
        defineAlgorithm('gzip', { level: 9 }),
        defineAlgorithm('brotliCompress', {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: 11,
          },
        }),
      ],
    }),
  ],
  build: {
    outDir: 'dist',
    rolldownOptions: {
      output: {
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true,
          },
        },
      },
    },
  },
  css: {
    transformer: 'lightningcss',
    devSourcemap: false,
  },
});
