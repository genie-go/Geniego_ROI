import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // 프로젝트 루트 지정
    root: path.resolve(__dirname, 'frontend'),
  // Vite 캐시 디렉터리 - D: 드라이브로 이동
  cacheDir: process.env.VITE_CACHE_DIR || 'D:/cache/vite',
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
    proxy: (() => {
      const backend = process.env.VITE_BACKEND || 'http://localhost:8080';
      const mk = () => ({ target: backend, changeOrigin: true, secure: false });
      return {
        // ── 로컬 개발 (XAMPP): /api → localhost:8080 ─────────────────────
        // ── 운영 직접 검증 (cc audit): VITE_BACKEND=https://roi.genie-go.com npx vite ──
        '/api':  mk(),
        '/auth': mk(),
        '/v3':   mk(),
        '/v4':   mk(),
        '/v419': mk(),
      };
    })(),
    // HMR 최적화
    hmr: { overlay: false },
  },

  build: {
    chunkSizeWarningLimit: 2000,
    

    rollupOptions: {
    // input omitted – Vite will use default index.html
    output: {
        // 수동 청크 분리 — 라이브러리 / 기능 영역별 분리
        // [171차 N-170-vite-fix v2] vendor-react + vendor-router + shared-ui 분리 모두 제거.
        // 170차 5회 화이트 + 171차 첫 시도 화이트 root cause = lazy chunk 가
        // shared-ui/vendor-react init 전에 React.useCallback 호출 → null.
        // React/Router/공유 컴포넌트 모두 entry chunk 흡수 → init order 보장.
        // i18n locales 만 별도 청크 유지 (13MB, gzip 4.5MB — 반드시 분리).
        manualChunks(id) {
          // [171차 N-170-vite-fix v3] page-group manualChunks 전부 제거.
          // 그룹화가 chunk 간 동일 React 모듈 참조를 만들어 init order race 야기.
          // i18n locales 만 분리 (13MB / 4.5MB gzip — 반드시 별도 청크).
          // 페이지는 Vite 기본 chunking(파일별 lazy 청크)로 위임 → 각 페이지가 자체
          // 의존성 import → Rollup 이 React 등 공통 vendor 를 entry 에 안전 배치.
          if (id.includes('/i18n/locales/')) {
            return 'i18n-locales';
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
