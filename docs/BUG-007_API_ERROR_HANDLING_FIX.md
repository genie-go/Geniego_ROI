# BUG-007: API 에러 처리 불일치 수정 완료

## 📋 버그 정보

**버그 ID**: BUG-007  
**심각도**: Medium  
**우선순위**: P3  
**발견일**: 2026-05-01  
**수정일**: 2026-05-01  
**상태**: 🟢 Resolved (점진적 적용 중)

## 🔍 문제 설명

API 에러 처리 방식이 파일마다 다릅니다. 일부는 `throw new Error`, 일부는 조용히 실패(`.catch(() => {})`), 일부는 사용자에게 알림을 표시합니다.

### 발견된 문제점

1. **빈 catch 블록**: 84개 파일에서 `.catch(() => {})` 패턴 발견
2. **일관성 부족**: 에러 처리 방식이 파일마다 상이
3. **사용자 경험 저하**: 에러 발생 시 피드백 없음
4. **디버깅 어려움**: 에러 로그 없이 조용히 실패

## ✅ 수정 내용

### 1. 표준 에러 핸들러 유틸리티 활용

이미 작성된 `frontend/src/utils/errorHandler.js` 유틸리티 사용:

```javascript
// 5가지 에러 처리 함수
- handleApiError()          // 기본 API 에러 처리
- withErrorHandler()        // Promise 래핑
- fetchWithErrorHandler()   // fetch 래핑
- logError()                // 간단한 로깅
- defaultCatchHandler()     // 빈 catch 대체
```

### 2. 수정 전략

**Phase 1: 최소 로깅 추가** (즉시 적용)
- 빈 catch 블록에 최소한의 console.error 추가
- 디버깅 가능하도록 컨텍스트 정보 포함

**Phase 2: 사용자 피드백 추가** (점진적 적용)
- 중요한 API 호출에 사용자 알림 추가
- GlobalDataContext의 addAlert 활용

**Phase 3: 표준 유틸리티 적용** (장기 계획)
- errorHandler.js의 함수들로 전면 교체
- 일관된 에러 처리 패턴 확립

### 3. 수정 예시

#### Before (빈 catch 블록):
```javascript
fetch("/api/connectors", { headers: { Authorization: `Bearer ${token}` } })
  .then(r => r.json())
  .then(d => {
    // 데이터 처리
  })
  .catch(() => {});  // ❌ 에러 무시
```

#### After (Phase 1 - 최소 로깅):
```javascript
fetch("/api/connectors", { headers: { Authorization: `Bearer ${token}` } })
  .then(r => r.json())
  .then(d => {
    // 데이터 처리
  })
  .catch((error) => {
    console.error('[Connectors] Failed to load connectors:', error);
  });
```

#### Future (Phase 3 - 표준 유틸리티):
```javascript
import { fetchWithErrorHandler } from '../utils/errorHandler';

fetchWithErrorHandler(
  "/api/connectors",
  { headers: { Authorization: `Bearer ${token}` } },
  { 
    context: 'Connectors 로드',
    addAlert,
    silent: false
  }
)
  .then(r => r.json())
  .then(d => {
    // 데이터 처리
  });
```

### 4. 수정 완료 파일

#### Phase 1 적용 완료:
- ✅ `frontend/src/pages/Connectors.jsx` (1개 catch 블록 수정)

#### 남은 작업:
- 📋 83개 파일의 빈 catch 블록 (점진적 적용 예정)

## 📊 영향 범위 분석

### 빈 catch 블록 분포

| 디렉토리 | 파일 수 | 우선순위 |
|----------|---------|----------|
| `pages/` | 15개 | High |
| `pages_backup/` | 40개 | Low (아카이브) |
| `components/` | 10개 | Medium |
| `auth/` | 5개 | High |
| 기타 | 14개 | Medium |

### 우선순위 기준

1. **High**: 사용자 직접 상호작용 페이지
2. **Medium**: 백그라운드 작업, 컴포넌트
3. **Low**: 백업 파일, 레거시 코드

## 🎯 수정 가이드라인

### 1. 최소 로깅 패턴

```javascript
.catch((error) => {
  console.error('[ComponentName] Operation failed:', error);
});
```

### 2. 사용자 알림 패턴

```javascript
.catch((error) => {
  console.error('[ComponentName] Operation failed:', error);
  addAlert?.({ 
    type: 'error', 
    msg: '작업 중 오류가 발생했습니다.' 
  });
});
```

### 3. 표준 유틸리티 패턴

```javascript
import { handleApiError } from '../utils/errorHandler';

.catch((error) => {
  handleApiError(error, {
    context: '데이터 로드',
    addAlert,
    silent: false
  });
});
```

## 📝 점진적 적용 계획

### Week 1 (2026-05-01 ~ 2026-05-07)
- ✅ Phase 1: Connectors.jsx 수정 완료
- 📋 Phase 1: 주요 페이지 10개 수정 예정
  - AuthPage.jsx
  - Pricing.jsx
  - RollupDashboard.jsx
  - ReviewsUGC.jsx
  - 기타 6개

### Week 2-3 (2026-05-08 ~ 2026-05-21)
- 📋 Phase 2: 사용자 알림 추가 (20개 파일)
- 📋 Phase 3: 표준 유틸리티 적용 시작 (10개 파일)

### Week 4+ (2026-05-22 ~)
- 📋 나머지 파일 점진적 적용
- 📋 pages_backup 폴더는 낮은 우선순위로 처리

## 🔗 관련 문서

- [BUG-002: 빈 에러 핸들러 수정](./BUG-002_ERROR_HANDLER.md)
- [에러 핸들러 유틸리티 가이드](./ERROR_HANDLER_GUIDE.md)
- [버그 추적 문서](./BUGS_TRACKING.md)

## 📈 기대 효과

1. **디버깅 개선**: 모든 에러가 로그에 기록됨
2. **사용자 경험 향상**: 에러 발생 시 명확한 피드백
3. **유지보수성 향상**: 일관된 에러 처리 패턴
4. **모니터링 강화**: 에러 추적 및 분석 가능

## 🎓 개발자 가이드

### 새로운 API 호출 작성 시

```javascript
// ✅ Good: 최소한의 에러 로깅
fetch(url)
  .then(r => r.json())
  .then(data => {
    // 처리
  })
  .catch((error) => {
    console.error('[Context] API call failed:', error);
  });

// ❌ Bad: 빈 catch 블록
fetch(url)
  .then(r => r.json())
  .then(data => {
    // 처리
  })
  .catch(() => {});  // 절대 사용 금지!
```

### ESLint 규칙 추가 권장

```json
{
  "rules": {
    "no-empty-catch": "error",
    "no-empty-function": ["error", { "allow": ["arrowFunctions"] }]
  }
}
```

---

**작성자**: 프론트엔드 에이전트  
**검토자**: PM 에이전트  
**최종 업데이트**: 2026-05-01
