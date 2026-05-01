# 성능 모니터링 시스템 가이드

## 📋 개요

이 문서는 GeniegoROI 프론트엔드 애플리케이션의 성능 모니터링 시스템 사용 방법을 안내합니다.

**작성일**: 2026년 5월 1일  
**버전**: 1.0  
**담당**: 프론트엔드 개발 에이전트

---

## 🎯 목적

- **실시간 성능 측정**: Web Vitals 및 React 렌더링 성능 추적
- **성능 저하 조기 감지**: 임계값 초과 시 즉시 파악
- **지속적 개선**: 데이터 기반 최적화 의사결정 지원

---

## 🛠️ 구성 요소

### 1. Web Vitals 측정 (`frontend/src/utils/webVitals.js`)

#### 측정 지표

| 지표 | 설명 | 좋음 | 개선 필요 | 나쁨 |
|------|------|------|-----------|------|
| **LCP** (Largest Contentful Paint) | 최대 콘텐츠풀 페인트 | < 2.5초 | 2.5~4초 | > 4초 |
| **FID** (First Input Delay) | 최초 입력 지연 | < 100ms | 100~300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | 누적 레이아웃 이동 | < 0.1 | 0.1~0.25 | > 0.25 |
| **FCP** (First Contentful Paint) | 최초 콘텐츠풀 페인트 | < 1.8초 | 1.8~3초 | > 3초 |
| **TTFB** (Time to First Byte) | 최초 바이트까지의 시간 | < 800ms | 800~1800ms | > 1800ms |

#### 사용 방법

```javascript
import { initWebVitals, getPerformanceData, savePerformanceReport } from './utils/webVitals.js';

// 애플리케이션 시작 시 초기화 (main.jsx에서 자동 실행됨)
initWebVitals();

// 현재 성능 데이터 가져오기
const data = getPerformanceData();
console.log('LCP:', data.lcp);
console.log('FID:', data.fid);
console.log('CLS:', data.cls);

// 페이지별 성능 리포트 저장
savePerformanceReport('Dashboard');
```

---

### 2. React Profiler (`frontend/src/components/PerformanceProfiler.jsx`)

#### 기능

- **렌더링 시간 측정**: 컴포넌트별 실제 렌더링 시간 추적
- **최적화 효과 분석**: useMemo/useCallback 적용 전후 비교
- **느린 렌더링 감지**: 16ms(60fps) 초과 시 경고

#### 사용 방법

```javascript
import PerformanceProfiler from './components/PerformanceProfiler.jsx';

function MyPage() {
  return (
    <PerformanceProfiler id="MyPage">
      {/* 페이지 컨텐츠 */}
    </PerformanceProfiler>
  );
}
```

#### 데이터 조회

```javascript
import { getProfilerData, getAverageRenderTime, getPerformanceSummary } from './components/PerformanceProfiler.jsx';

// 전체 프로파일링 데이터
const allData = getProfilerData();

// 특정 컴포넌트 평균 렌더링 시간
const stats = getAverageRenderTime('RollupDashboard');
console.log('평균 렌더링 시간:', stats.avgDuration, 'ms');
console.log('총 렌더링 횟수:', stats.count);

// 모든 컴포넌트 성능 요약
const summary = getPerformanceSummary();
summary.forEach(stat => {
  console.log(`${stat.componentId}: ${stat.avgDuration}ms (${stat.count}회)`);
});
```

---

## 📊 성능 모니터링 워크플로우

### 1. 개발 단계

#### 로컬 개발 서버 실행
```bash
cd frontend
npm run dev
```

#### 브라우저 개발자 도구 확인
1. **Console 탭**: Web Vitals 및 Profiler 로그 확인
2. **Performance 탭**: React DevTools Profiler 사용
3. **Network 탭**: 리소스 로딩 시간 분석

#### React DevTools Profiler 사용법
1. React DevTools 확장 프로그램 설치
2. Profiler 탭 열기
3. 🔴 Record 버튼 클릭
4. 페이지 인터랙션 수행
5. ⏹️ Stop 버튼 클릭
6. Flame Graph에서 렌더링 시간 분석

---

### 2. 정기 측정 주기

| 주기 | 측정 항목 | 담당자 |
|------|-----------|--------|
| **매일** | 개발 환경 Web Vitals | 개발자 |
| **주간** | 프로덕션 Lighthouse 점수 | QA 팀 |
| **월간** | 전체 페이지 성능 감사 | PM + 개발팀 |
| **분기** | 성능 예산 검토 및 조정 | 아키텍트 |

---

### 3. 성능 저하 감지 시 대응 절차

#### Step 1: 문제 확인
```javascript
// 로컬 스토리지에서 성능 데이터 확인
const reports = JSON.parse(localStorage.getItem('g_perf_reports') || '[]');
const profilerData = JSON.parse(localStorage.getItem('g_profiler_data') || '[]');

// 최근 성능 저하 페이지 식별
const slowPages = reports.filter(r => r.metrics.lcp > 4000 || r.metrics.fid > 300);
console.log('성능 저하 페이지:', slowPages);
```

#### Step 2: 원인 분석
- **LCP > 4초**: 이미지 최적화, lazy loading 적용
- **FID > 300ms**: JavaScript 번들 크기 감소, 코드 스플리팅
- **CLS > 0.25**: 이미지/광고 크기 명시, 폰트 로딩 최적화
- **렌더링 > 100ms**: useMemo/useCallback 적용, React.memo 사용

#### Step 3: 최적화 적용
```javascript
// Before
function MyComponent({ data }) {
  const processedData = expensiveCalculation(data); // 매 렌더링마다 실행
  return <div>{processedData}</div>;
}

// After
function MyComponent({ data }) {
  const processedData = useMemo(() => expensiveCalculation(data), [data]);
  return <div>{processedData}</div>;
}
```

#### Step 4: 검증
1. 최적화 전 성능 데이터 저장
2. 최적화 적용
3. 최적화 후 성능 데이터 측정
4. 개선율 계산 및 문서화

---

## 🎯 성능 예산 (Performance Budget)

### 목표 지표

| 지표 | 목표 | 현재 | 상태 |
|------|------|------|------|
| LCP | < 2.5초 | 측정 필요 | ⏳ |
| FID | < 100ms | 측정 필요 | ⏳ |
| CLS | < 0.1 | 측정 필요 | ⏳ |
| 번들 크기 (메인) | < 500KB | ~450KB | ✅ |
| 초기 로딩 시간 | < 3초 (3G) | 측정 필요 | ⏳ |
| 탭 전환 시간 | < 200ms | 측정 필요 | ⏳ |

---

## 🔧 도구 및 리소스

### 1. Chrome DevTools
- **Performance 탭**: 전체 페이지 로딩 분석
- **Lighthouse**: 자동화된 성능 감사
- **Network 탭**: 리소스 로딩 시간 분석

### 2. React DevTools
- **Profiler 탭**: 컴포넌트별 렌더링 시간
- **Components 탭**: Props/State 변경 추적

### 3. 외부 도구
- **WebPageTest**: 실제 네트워크 환경 테스트
- **GTmetrix**: 종합 성능 분석
- **Sentry Performance**: 프로덕션 모니터링 (향후 도입 권장)

---

## 📈 성능 개선 체크리스트

### 코드 레벨
- [ ] useMemo로 복잡한 계산 메모이제이션
- [ ] useCallback으로 함수 참조 안정화
- [ ] React.memo로 불필요한 리렌더링 방지
- [ ] 가상화(react-window)로 긴 목록 최적화
- [ ] 코드 스플리팅으로 번들 크기 감소

### 리소스 레벨
- [ ] 이미지 최적화 (WebP, lazy loading)
- [ ] 폰트 최적화 (font-display: swap)
- [ ] CSS/JS 압축 및 minify
- [ ] CDN 사용
- [ ] HTTP/2 또는 HTTP/3 활성화

### 네트워크 레벨
- [ ] 브라우저 캐싱 설정
- [ ] Gzip/Brotli 압축
- [ ] 리소스 프리로딩/프리페칭
- [ ] Service Worker 캐싱 (PWA)

---

## 🚨 경고 임계값

### 자동 경고 트리거

```javascript
// 개발 환경에서 자동 경고 (PerformanceProfiler.jsx)
if (actualDuration > 100) {
  console.error(
    `⚠️ [Profiler] SLOW RENDER DETECTED!\n` +
    `  Component: ${id}\n` +
    `  Duration: ${actualDuration.toFixed(2)}ms\n` +
    `  Consider optimization: useMemo, useCallback, React.memo`
  );
}
```

### 수동 모니터링 임계값
- **LCP > 4초**: 즉시 조치 필요
- **FID > 300ms**: 우선순위 높음
- **CLS > 0.25**: 사용자 경험 저하
- **렌더링 > 100ms**: 최적화 검토

---

## 📝 성능 측정 결과 기록 템플릿

### 측정 일시
- **날짜**: YYYY-MM-DD
- **시간**: HH:MM
- **환경**: 개발/스테이징/프로덕션

### 측정 결과

| 페이지 | LCP | FID | CLS | FCP | TTFB | 평균 렌더링 시간 |
|--------|-----|-----|-----|-----|------|------------------|
| Dashboard | - | - | - | - | - | - |
| RollupDashboard | - | - | - | - | - | - |
| PerformanceHub | - | - | - | - | - | - |
| CatalogSync | - | - | - | - | - | - |

### 개선 사항
- **적용 전**: [측정값]
- **적용 후**: [측정값]
- **개선율**: [%]

### 비고
- [특이사항 기록]

---

## 🔄 지속적 개선 프로세스

### 1. 측정 (Measure)
- 정기적으로 성능 지표 수집
- 로컬 스토리지 데이터 분석

### 2. 분석 (Analyze)
- 성능 저하 원인 파악
- 병목 지점 식별

### 3. 최적화 (Optimize)
- 코드 레벨 최적화 적용
- 리소스 최적화 수행

### 4. 검증 (Verify)
- 최적화 효과 측정
- 목표 달성 여부 확인

### 5. 문서화 (Document)
- 개선 사항 기록
- 베스트 프랙티스 공유

---

## 📚 참고 자료

### 공식 문서
- [Web Vitals](https://web.dev/vitals/)
- [React Profiler API](https://react.dev/reference/react/Profiler)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

### 내부 문서
- [BUG-008 성능 최적화 보고서](./BUG-008_PERFORMANCE_REPORT.md)
- [프론트엔드 아키텍처 가이드](./FRONTEND_ARCHITECTURE.md)

---

## 🤝 문의 및 지원

- **담당자**: 프론트엔드 개발 에이전트
- **이슈 트래킹**: GitHub Issues
- **긴급 문의**: Slack #frontend-performance 채널

---

**마지막 업데이트**: 2026년 5월 1일  
**다음 검토 예정**: 2026년 6월 1일
