import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 8000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-locales': [
            './src/i18n/locales/ko.js',
            './src/i18n/locales/en.js',
            './src/i18n/locales/ja.js',
            './src/i18n/locales/zh.js',
            './src/i18n/locales/zh-TW.js',
            './src/i18n/locales/de.js',
            './src/i18n/locales/th.js',
            './src/i18n/locales/vi.js',
            './src/i18n/locales/id.js',
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://roi.genie-go.com',
        changeOrigin: true,
      },
    },
  },
});
