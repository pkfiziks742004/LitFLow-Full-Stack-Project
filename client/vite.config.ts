import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { inspectAttr } from 'kimi-plugin-inspect-react';

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [command === 'serve' ? inspectAttr() : null, react()].filter(Boolean),
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');

          if (!normalized.includes('/node_modules/')) {
            return undefined;
          }

          if (normalized.includes('/d3/')) {
            return 'graph-vendor';
          }

          if (normalized.includes('/html2canvas/')) {
            return 'html2canvas-vendor';
          }

          if (normalized.includes('/jspdf/')) {
            return 'pdf-vendor';
          }

          if (normalized.includes('/@radix-ui/')) {
            return 'ui-vendor';
          }

          if (normalized.includes('/lucide-react/')) {
            return 'icons-vendor';
          }

          return undefined;
        },
      },
    },
  },
}));
