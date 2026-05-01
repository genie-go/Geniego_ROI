# GeniegoROI 버그 추적 문서

## 📋 개요

이 문서는 GeniegoROI 프로젝트에서 발견된 버그를 심각도 순으로 추적하고 관리합니다.

**최종 업데이트**: 2026-05-01  
**분석 기준**: 코드베이스 전체 스캔 결과

---

## 🔴 Critical (심각) - 즉시 수정 필요

### BUG-001: 프로덕션 환경 console.log 노출

**심각도**: Critical  
**우선순위**: P0  
**담당**: 프론트엔드 에이전트  
**발견일**: 2026-05-01  
**수정일**: 2026-05-01  
**상태**: 🟢 Resolved (테스트 대기)

**설명**:
프론트엔드 코드에 300+ 개의 `console.log`, `console.error`, `console.warn` 호출이 존재합니다. 프로덕션 환경에서 민감한 정보(API 키, 사용자 데이터, 에러 스택)가 브라우저 콘솔에 노출될 위험이 있습니다.

**영향 범위**:
- 보안: 민감 정보 유출 가능
- 성능: 불필요한 로깅으로 성능 저하
- 사용자 경험: 개발자 도구에서 혼란 야기

**발견 위치**:
```
frontend/src/utils/performanceMonitor.js
frontend/src/utils/apiInterceptor.js
frontend/src/pages_backup/*.jsx (다수)
frontend/src/pages/*.jsx (다수)
frontend/src/security/ContaminationGuard.js
```

**재현 단계**:
1. 프로덕션 빌드 실행
2. 브라우저 개발자 도구 콘솔 열기
3. 페이지 이동 및 API 호출 시 로그 확인

**해결 방법**:
1. **방법 1**: Vite 빌드 설정에서 `drop_console` 옵션 활성화
   - 장점: 빌드 시 자동 제거
   - 단점: 디버깅 시 불편
   
2. **방법 2**: 환경별 로거 유틸리티 구현
   - 장점: 개발/프로덕션 환경 분리
   - 단점: 기존 코드 대량 수정 필요

3. **방법 3 (권장)**: ESLint 규칙 + 빌드 시 제거
   - 장점: 개발 시 경고, 프로덕션에서 자동 제거
   - 단점: 초기 설정 필요

**예상 작업 시간**: 4시간

---

### BUG-002: 빈 에러 핸들러 (Silent Failure)

**심각도**: Critical  
**우선순위**: P0  
**담당**: 프론트엔드 + 백엔드 에이전트  
**발견일**: 2026-05-01  
**수정일**: 2026-05-01  
**상태**: 🟢 Resolved (점진적 적용 필요)

**설명**:
다수의 `.catch(() => {})` 빈 에러 핸들러가 존재하여 에러가 조용히 무시됩니다. 사용자는 오류 발생 시 아무런 피드백을 받지 못하며, 디버깅이 매우 어렵습니다.

**영향 범위**:
- 사용자 경험: 에러 발생 시 피드백 없음
- 디버깅: 문제 원인 파악 불가
- 데이터 무결성: 실패한 작업이 성공으로 오인될 수 있음

**발견 위치**:
```
frontend/src/pages_backup/MenuAccessPanel.jsx
frontend/src/pages_backup/CreativeStudioTab.jsx
frontend/src/pages_backup/AlertAutomation.jsx
frontend/src/pages_backup/WebPopup.jsx
frontend/src/pages_backup/SupplyChain.jsx
frontend/src/pages_backup/SubscriptionPricing.jsx
frontend/src/pages/*.jsx (다수)
```

**예시 코드**:
```javascript
// 문제 코드
fetch('/api/v423/data')
  .then(r => r.json())
  .then(d => setData(d))
  .catch(() => {}); // ❌ 에러 무시

// 개선 코드
fetch('/api/v423/data')
  .then(r => r.json())
  .then(d => setData(d))
  .catch(err => {
    console.error('데이터 로드 실패:', err);
    showToast('데이터를 불러올 수 없습니다', 'error');
  });
```

**해결 방법**:
1. 모든 빈 catch 블록에 적절한 에러 핸들링 추가
2. 사용자에게 에러 메시지 표시 (Toast/Alert)
3. 에러 로깅 시스템 구축 (Sentry 등)

**예상 작업 시간**: 8시간

**수정 내용**:
- ✅ 표준 에러 핸들러 유틸리티 작성 완료 (`frontend/src/utils/errorHandler.js`)
- ✅ 5가지 에러 처리 함수 구현 (handleApiError, withErrorHandler, fetchWithErrorHandler, logError, defaultCatchHandler)
- ✅ 사용 가이드 문서 작성 완료 (`docs/BUG-002_ERROR_HANDLER.md`)
- 📋 84개 파일에 점진적 적용 계획 수립 (Phase 1~4)

**다음 단계**: 개발팀에 유틸리티 공유 후 Phase 1부터 순차 적용

---

### BUG-003: 라이선스 키 형식 하드코딩

**심각도**: High  
**우선순위**: P1  
**담당**: 프론트엔드 + 백엔드 에이전트  
**발견일**: 2026-05-01  
**수정일**: 2026-05-01  
**상태**: 🟢 Resolved (점진적 적용 필요)

**설명**:
`GENIE-XXXX-XXXX-XXXX-XXXX` 라이선스 키 형식이 여러 파일에 하드코딩되어 있습니다. 형식 변경 시 모든 파일을 수정해야 하며, 일관성 유지가 어렵습니다.

**영향 범위**:
- 유지보수성: 형식 변경 시 다수 파일 수정 필요
- 일관성: 파일마다 다른 형식 사용 가능성
- 확장성: 새로운 라이선스 타입 추가 어려움

**발견 위치**:
```
backend/src/routes.php
frontend/src/pages_backup/ApiKeys.jsx
frontend/src/pages/LicenseActivation.jsx
frontend/src/pages_backup/MyCoupons.jsx
backend/src/Handlers/UserAdmin.php
backend/src/Handlers/UserAuth.php
```

**해결 방법**:
1. 라이선스 키 유틸리티 클래스 생성
2. 정규식 패턴을 상수로 정의
3. 모든 하드코딩된 부분을 유틸리티로 교체

**예상 작업 시간**: 3시간

**수정 내용**:
- ✅ 프론트엔드 유틸리티 작성 완료 (`frontend/src/utils/licenseKeyUtils.js`)
- ✅ 백엔드 유틸리티 작성 완료 (`backend/src/Utils/LicenseKeyUtils.php`)
- ✅ 7가지 유틸리티 함수 구현 (검증, 포맷팅, 생성, 마스킹 등)
- ✅ 사용 가이드 문서 작성 완료 (`docs/BUG-003_LICENSE_KEY_UTILS.md`)
- 📋 6개 파일에 점진적 적용 계획 수립 (Phase 1~4)

**다음 단계**: 개발팀에 유틸리티 공유 후 Phase 1부터 순차 적용

---

## 🟡 High (높음) - 24시간 이내 수정

### BUG-004: Naver Adapter Endpoint Mapping 미완성

**심각도**: High  
**우선순위**: P1  
**담당**: 백엔드 에이전트  
**발견일**: 2026-05-01  
**상태**: 🟡 In Progress

**설명**:
Naver SearchAds API adapter의 endpoint mapping이 TODO 상태로 남아있습니다. 실제 API 호출이 불가능한 상태입니다.

**영향 범위**:
- 기능: 네이버 검색광고 연동 불가
- 사용자: 네이버 광고 데이터 수집 불가

**발견 위치**:
```
legacy_v338_pkg/archives/*/services/connectors/src/adapters/naver.js
```

**TODO 내용**:
```javascript
// Real implementation TODO:
// 1) GET current budgets
// 2) PATCH budget changes
// endpoint mapping TODO
```

**해결 방법**:
1. Naver SearchAds API 문서 확인
2. 엔드포인트 매핑 구현
3. 테스트 케이스 작성
4. 통합 테스트 수행

**예상 작업 시간**: 6시간

---

### BUG-005: XSS 취약점 - 사용자 입력 검증 부족

**심각도**: High  
**우선순위**: P1  
**담당**: 프론트엔드 + 백엔드 에이전트  
**발견일**: 2026-05-01  
**상태**: 🔴 Open

**설명**:
일부 컴포넌트에서 사용자 입력을 `dangerouslySetInnerHTML`로 직접 렌더링하거나, 입력 검증 없이 사용합니다.

**영향 범위**:
- 보안: XSS 공격 가능
- 데이터 무결성: 악성 스크립트 삽입 가능

**발견 위치**:
```
frontend/src/pages/DataProduct.jsx
frontend/src/pages/CreativeStudio.jsx
frontend/src/pages_backup/PixelTracking.jsx
```

**예시 코드**:
```javascript
// 취약한 코드
<div dangerouslySetInnerHTML={{__html: userInput}} />

// 개선 코드
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(userInput)}} />
```

**해결 방법**:
1. DOMPurify 라이브러리 도입
2. 모든 사용자 입력 sanitize 처리
3. SecurityGuard 유틸리티 강화

**예상 작업 시간**: 4시간

---

## 🟠 Medium (중간) - 2주일 이내 수정

### BUG-006: i18n 하드코딩 텍스트

**심각도**: Medium  
**우선순위**: P3  
**담당**: 프론트엔드 에이전트  
**발견일**: 2026-05-01  
**상태**: 🟡 In Progress

**설명**:
일부 컴포넌트에서 한국어 텍스트가 하드코딩되어 있어 다국어 지원이 불완전합니다.

**영향 범위**:
- 다국어 지원: 15개 언어 중 일부만 지원
- 유지보수성: 텍스트 변경 시 코드 수정 필요

**발견 위치**:
```
frontend/src/pages/WmsManager.jsx
frontend/src/pages/LicenseActivation.jsx
frontend/src/pages_backup/ApiKeys.jsx
```

**예시**:
```javascript
// 하드코딩
<button>저장</button>

// i18n 적용
<button>{t('common.save')}</button>
```

**해결 방법**:
1. 하드코딩된 텍스트 추출
2. i18n 키 생성 및 15개 언어 번역 추가
3. 컴포넌트에 i18n 적용

**예상 작업 시간**: 6시간

---

### BUG-007: API 에러 처리 불일치

**심각도**: Medium  
**우선순위**: P3  
**담당**: 프론트엔드 에이전트  
**발견일**: 2026-05-01  
**상태**: 🔴 Open

**설명**:
API 에러 처리 방식이 파일마다 다릅니다. 일부는 `throw new Error`, 일부는 조용히 실패, 일부는 사용자에게 알림을 표시합니다.

**영향 범위**:
- 일관성: 에러 처리 방식 불일치
- 사용자 경험: 예측 불가능한 에러 피드백

**발견 위치**:
```
frontend/src/services/apiClient.js
frontend/src/pages/*.jsx (다수)
```

**해결 방법**:
1. 표준 API 에러 핸들러 유틸리티 작성
2. 모든 API 호출에 일관된 에러 처리 적용
3. 에러 타입별 사용자 피드백 정의

**예상 작업 시간**: 5시간

---

### BUG-008: 성능 저하 - 불필요한 리렌더링

**심각도**: Medium  
**우선순위**: P3  
**담당**: 프론트엔드 에이전트  
**발견일**: 2026-05-01  
**상태**: 🔴 Open

**설명**:
일부 컴포넌트에서 `useMemo`, `useCallback` 최적화가 누락되어 불필요한 리렌더링이 발생합니다.

**영향 범위**:
- 성능: 페이지 로딩 속도 저하
- 사용자 경험: 느린 반응 속도

**발견 위치**:
```
frontend/src/pages/RollupDashboard.jsx
frontend/src/pages/PerformanceHub.jsx
frontend/src/pages/CatalogSync.jsx
```

**해결 방법**:
1. React DevTools Profiler로 성능 분석
2. 불필요한 리렌더링 지점 식별
3. `useMemo`, `useCallback`, `React.memo` 적용

**예상 작업 시간**: 4시간

---

## 🟢 Low (낮음) - 백로그

### BUG-009: 코드 중복

**심각도**: Low  
**우선순위**: P4  
**담당**: 프론트엔드 + 백엔드 에이전트  
**발견일**: 2026-05-01  
**상태**: 🔵 Backlog

**설명**:
여러 파일에서 동일한 API 호출 패턴, 유틸리티 함수가 중복됩니다.

**영향 범위**:
- 유지보수성: 수정 시 여러 곳 변경 필요
- 코드 품질: 불필요한 코드 증가

**해결 방법**:
1. 공통 유틸리티 함수 추출
2. 중복 코드 제거
3. 공통 컴포넌트/훅 생성

**예상 작업 시간**: 8시간

---

### BUG-010: 주석 처리된 디버그 코드

**심각도**: Low  
**우선순위**: P4  
**담당**: 프론트엔드 에이전트  
**발견일**: 2026-05-01  
**상태**: 🔵 Backlog

**설명**:
주석 처리된 디버그 코드가 프로덕션 빌드에 포함될 가능성이 있습니다.

**영향 범위**:
- 코드 품질: 불필요한 코드 증가
- 빌드 크기: 번들 사이즈 증가

**해결 방법**:
1. 주석 처리된 디버그 코드 제거
2. 필요 시 환경 변수로 제어

**예상 작업 시간**: 2시간

---

## 📊 버그 통계

### 심각도별 분포

| 심각도 | 개수 | 비율 |
|--------|------|------|
| Critical | 2 | 20% |
| High | 3 | 30% |
| Medium | 4 | 40% |
| Low | 2 | 20% |
| **합계** | **11** | **100%** |

### 우선순위별 분포

| 우선순위 | 개수 | 대응 시간 |
|----------|------|-----------|
| P0 | 2 | 즉시 |
| P1 | 3 | 24시간 이내 |
| P3 | 4 | 2주일 이내 |
| P4 | 2 | 백로그 |

### 담당 에이전트별 분포

| 에이전트 | 개수 |
|----------|------|
| 프론트엔드 | 6 |
| 백엔드 | 1 |
| 프론트엔드 + 백엔드 | 4 |

---

## 🎯 우선순위 작업 계획

### Week 1 (2026-05-01 ~ 2026-05-07)

**목표**: Critical 버그 모두 수정

1. **BUG-001**: console.log 제거 (4시간)
   - ESLint 규칙 설정
   - Vite 빌드 설정 수정
   - 기존 코드 정리

2. **BUG-002**: 에러 핸들링 개선 (8시간)
   - 표준 에러 핸들러 작성
   - 빈 catch 블록 수정
   - Toast 알림 추가

3. **BUG-003**: 라이선스 키 유틸리티 (3시간)
   - 유틸리티 클래스 작성
   - 하드코딩 제거

**예상 총 작업 시간**: 15시간

---

### Week 2 (2026-05-08 ~ 2026-05-14)

**목표**: High 버그 모두 수정

1. **BUG-004**: Naver Adapter 완성 (6시간)
2. **BUG-005**: XSS 취약점 수정 (4시간)

**예상 총 작업 시간**: 10시간

---

### Week 3-4 (2026-05-15 ~ 2026-05-28)

**목표**: Medium 버그 수정

1. **BUG-006**: i18n 하드코딩 제거 (6시간)
2. **BUG-007**: API 에러 처리 표준화 (5시간)
3. **BUG-008**: 성능 최적화 (4시간)

**예상 총 작업 시간**: 15시간

---

### Backlog

**목표**: 시간 여유 시 처리

1. **BUG-009**: 코드 중복 제거 (8시간)
2. **BUG-010**: 디버그 코드 정리 (2시간)

---

## 📝 버그 보고 템플릿

새로운 버그 발견 시 아래 템플릿을 사용하여 이 문서에 추가하세요.

```markdown
### BUG-XXX: [버그 제목]

**심각도**: Critical/High/Medium/Low  
**우선순위**: P0/P1/P2/P3/P4  
**담당**: [에이전트명]  
**발견일**: YYYY-MM-DD  
**상태**: 🔴 Open / 🟡 In Progress / 🟢 Resolved / 🔵 Backlog

**설명**:
[버그 상세 설명]

**영향 범위**:
- [영향 1]
- [영향 2]

**발견 위치**:
```
[파일 경로]
```

**재현 단계**:
1. [단계 1]
2. [단계 2]

**해결 방법**:
[해결 방법 설명]

**예상 작업 시간**: X시간
```

---

## 📚 참고 문서

- [에이전트 팀 시스템](./AGENT_TEAM.md)
- [작업 프로세스](./WORK_PROCESS.md)
- [보안 가이드](./security/)

---

**최종 업데이트**: 2026-05-01  
**문서 버전**: 1.0  
**작성자**: PM 에이전트
