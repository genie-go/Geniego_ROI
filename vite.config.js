import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // 프로젝트 루트 지정
    root: path.resolve(__dirname, 'frontend'),
  // Vite 캐시 디렉터리 - D: 드라이브로 이동
  cacheDir: 'D:/cache/vite',
  publicDir: 'public',

  plugins: [
    react({
      // Babel JSX transform 사용 (esbuild JSX 파서 대신)
      babel: { plugins: [] },
      jsxRuntime: 'automatic',
    }),
  ],

  server: {
    port: 5173,
    proxy: {
      // ── 로컬 개발 (XAMPP): /api → localhost:8080 ─────────────────────
      '/api': { target: 'http://localhost:8080', changeOrigin: true, secure: false },
      '/auth': { target: 'http://localhost:8080', changeOrigin: true, secure: false },
      '/v3': { target: 'http://localhost:8080', changeOrigin: true, secure: false },
      '/v4': { target: 'http://localhost:8080', changeOrigin: true, secure: false },
      '/v419': { target: 'http://localhost:8080', changeOrigin: true, secure: false },
      // ── 운영 서버 (배포 시 아래 줄 활성화 후 위 로컬 설정 주석처리) ──
      // '/api': { target: 'https://roi.genie-go.com', changeOrigin: true, secure: false },
      // '/auth': { target: 'https://roi.genie-go.com', changeOrigin: true, secure: false },
      // '/v3': { target: 'https://roi.genie-go.com', changeOrigin: true, secure: false },
      // '/v4': { target: 'https://roi.genie-go.com', changeOrigin: true, secure: false },
      // '/v419': { target: 'https://roi.genie-go.com', changeOrigin: true, secure: false },
    },
    // HMR 최적화
    hmr: { overlay: false },
  },

  build: {
    chunkSizeWarningLimit: 2000,
    

    rollupOptions: {
    // input omitted – Vite will use default index.html
    output: {
        // 수동 청크 분리 — 라이브러리 / 기능 영역별 분리
        manualChunks(id) {
          // React 코어
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // 라우터
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          // i18n 로케일 파일들 - 별도 청크
          if (id.includes('/i18n/locales/')) {
            return 'i18n-locales';
          }
          // 무거운 페이지 그룹 1: Analytics/Dashboard
          if (id.includes('/pages/Dashboard') || id.includes('/pages/PnLDashboard') || id.includes('/pages/PerformanceHub')) {
            return 'pages-analytics';
          }
          // 무거운 페이지 그룹 2: Commerce
          if (id.includes('/pages/InfluencerUGC') || id.includes('/pages/Commerce') || id.includes('/pages/OrderHub')) {
            return 'pages-commerce';
          }
          // 무거운 페이지 그룹 3: Data/Schema
          if (id.includes('/pages/DataSchema') || id.includes('/pages/DataProduct') || id.includes('/pages/EventNorm')) {
            return 'pages-data';
          }
          // 무거운 페이지 그룹 4: Operations
          if (id.includes('/pages/OperationsHub') || id.includes('/pages/CatalogSync') || id.includes('/pages/KrChannel')) {
            return 'pages-ops';
          }
          // Rollup/AI 그룹
          if (id.includes('/pages/RollupDashboard') || id.includes('/pages/AIRuleEngine') || id.includes('/pages/AIInsights')) {
            return 'pages-ai';
          }
          // 매핑 레지스트리
          if (id.includes('/pages/MappingRegistry')) {
            return 'pages-mapping';
          }
          // [최적화 추가] 가장 무거운 단일 페이지 — SubscriptionPricing (195KB)
          if (id.includes('/pages/SubscriptionPricing')) {
            return 'pages-subscription';
          }
          // [최적화 추가] Admin 대시보드 (139KB)
          if (id.includes('/pages/Admin')) {
            return 'pages-admin';
          }
          // [최적화 추가] 이메일·자동화 마케팅 (82KB + 51KB)
          if (id.includes('/pages/EmailMarketing') || id.includes('/pages/AutoMarketing') || id.includes('/pages/AIMarketingHub')) {
            return 'pages-marketing2';
          }
          // [최적화 추가] WMS·주문·카탈로그 (96KB + 99KB + 96KB)
          if (id.includes('/pages/WmsManager') || id.includes('/pages/CatalogSync')) {
            return 'pages-ops2';
          }
          // [최적화 추가] API Keys·Attribution (89KB + 57KB)
          if (id.includes('/pages/ApiKeys') || id.includes('/pages/Attribution')) {
            return 'pages-apikeys';
          }
          // [최적화 추가] 구독 가격·결제 (62KB + 42KB)
          if (id.includes('/pages/PriceOpt') || id.includes('/pages/Pricing')) {
            return 'pages-pricing';
          }
          // [최적화 추가] HelpCenter·FeedbackCenter (42KB + 17KB)
          if (id.includes('/pages/HelpCenter') || id.includes('/pages/FeedbackCenter') || id.includes('/pages/Onboarding')) {
            return 'pages-support';
          }
        },
        // 에셋 파일명 해시
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // 소스맵 비활성화 (프로덕션)
    sourcemap: false,
    // CSS 코드 분리
    cssCodeSplit: true,
    // 미니파이 (esbuild 기본값 — Terser보다 빠름)
    minify: 'esbuild',
    // 타겟 - 모던 브라우저
    target: 'es2020',
  },

  // 의존성 사전 번들링 최적화
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['*.cjs'], // exclude all .cjs scripts from pre‑bundling
    // esbuild가 소스파일 전체를 스캔하지 않도록 엔트리 제한
    entries: ['src/main.jsx'],
  },


  // 에셋 인라인 임계값 (4KB 이하 base64 인라인)
  assetsInlineLimit: 4096,

  // CSS 최적화
  css: {
    devSourcemap: false,
  },
})
