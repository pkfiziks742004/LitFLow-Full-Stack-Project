import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');

          if (!normalized.includes('/node_modules/')) {
            return undefined;
          }

          if (normalized.includes('/react/') || normalized.includes('/react-dom/') || normalized.includes('/react-router-dom/')) {
            return 'react-vendor';
          }

          if (normalized.includes('/recharts/') || normalized.includes('/d3-')) {
            return 'charts-vendor';
          }

          if (normalized.includes('/lucide-react/')) {
            return 'icons-vendor';
          }

          return undefined;
        }
      }
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  }
});
