import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 8000,
    minify: 'esbuild',
    commonjsOptions: {
      transformMixedEsModules: true,
      requireReturnsDefault: 'auto',
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
            './src/i18n/locales/ar.js',
            './src/i18n/locales/es.js',
            './src/i18n/locales/fr.js',
            './src/i18n/locales/hi.js',
            './src/i18n/locales/pt.js',
            './src/i18n/locales/ru.js'
          ],
          'shared-context': [
            './src/context/GlobalDataContext.jsx',
            './src/security/SecurityGuard.js',
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      'isomorphic-dompurify': 'dompurify',
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
