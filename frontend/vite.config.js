import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// [현 차수] 로컬 인스톨러 지원 — 개발 프록시 타깃을 env로 제어(기본=운영, 비파괴).
//   로컬 풀스택 구동 시 install 스크립트가 VITE_PROXY_TARGET=http://localhost:8080 설정 → 로컬 백엔드로 프록시.
const PROXY_TARGET = process.env.VITE_PROXY_TARGET || 'https://roi.genie-go.com';

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
      // [현 차수] 전 백엔드 경로(/api·/auth·/creatives·/v{NNN})를 한 타깃으로 프록시.
      //   기본 타깃=운영(기존 프론트 단독 dev 호환). 로컬 풀스택은 VITE_PROXY_TARGET=http://localhost:8080.
      '^/(api|auth|creatives|health|healthz|v[0-9]{2,4})(/|$)': {
        target: PROXY_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
