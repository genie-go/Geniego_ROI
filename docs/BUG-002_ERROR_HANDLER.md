# BUG-002: 빈 에러 핸들러 (Silent Failure) 수정

## 📋 작업 요약

**버그 ID**: BUG-002  
**심각도**: Critical (P0)  
**작업 일시**: 2026-05-01  
**담당**: 프론트엔드 에이전트  
**상태**: ✅ 부분 완료 (유틸리티 구현 완료, 점진적 적용 필요)

---

## 🔧 수정 내용

### 1. 표준 에러 핸들러 유틸리티 작성 (`frontend/src/utils/errorHandler.js`)

84개의 빈 `.catch(() => {})` 블록을 대체하기 위한 표준 에러 핸들러 유틸리티를 작성했습니다.

#### 주요 기능

1. **handleApiError**: API 에러를 처리하고 사용자에게 알림 표시
2. **withErrorHandler**: Promise를 래핑하여 자동 에러 처리
3. **fetchWithErrorHandler**: fetch 호출을 래핑하여 자동 에러 처리
4. **logError**: 간단한 에러 로깅 (사용자 알림 없이)
5. **defaultCatchHandler**: 빈 catch 블록을 대체하는 기본 핸들러

---

## 📝 사용 방법

### 기본 사용법

```javascript
import { handleApiError, defaultCatchHandler } from '../utils/errorHandler';
import { useGlobalData } from '../context/GlobalDataContext';

function MyComponent() {
  const { addAlert } = useGlobalData();

  // 방법 1: handleApiError 직접 사용
  useEffect(() => {
    fetch('/api/v423/data')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(err => handleApiError(err, {
        addAlert,
        context: '데이터 로드'
      }));
  }, []);

  // 방법 2: defaultCatchHandler 사용 (최소한의 로깅)
  useEffect(() => {
    fetch('/api/v423/data')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(defaultCatchHandler('MyComponent - 데이터 로드'));
  }, []);
}
```

### Toast 알림 사용

```javascript
import { handleApiError } from '../utils/errorHandler';

function MyComponent() {
  const [toast, setToast] = useState(null);

  const loadData = () => {
    fetch('/api/v423/data')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(err => handleApiError(err, {
        setToast,
        context: '데이터 로드'
      }));
  };

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
```

### withErrorHandler 사용

```javascript
import { withErrorHandler } from '../utils/errorHandler';

function MyComponent() {
  const { addAlert } = useGlobalData();

  const loadData = () => {
    withErrorHandler(
      fetch('/api/v423/data').then(r => r.json()),
      { addAlert, context: '데이터 로드' }
    ).then(d => setData(d));
  };
}
```

### fetchWithErrorHandler 사용

```javascript
import { fetchWithErrorHandler } from '../utils/errorHandler';

function MyComponent() {
  const { addAlert } = useGlobalData();

  const loadData = async () => {
    try {
      const response = await fetchWithErrorHandler(
        '/api/v423/data',
        { headers: { Authorization: `Bearer ${token}` } },
        { addAlert, context: '데이터 로드' }
      );
      const data = await response.json();
      setData(data);
    } catch (err) {
      // 에러는 이미 처리되었지만 추가 로직 가능
    }
  };
}
```

---

## 🎯 적용 대상 파일 (84개)

### 우선순위 High (즉시 적용 권장)

**pages 폴더 (사용자 직접 접근)**:
- `frontend/src/pages/Connectors.jsx` - 3개
- `frontend/src/pages/AuthPage.jsx` - 2개
- `frontend/src/pages/LicenseActivation.jsx` - 1개
- `frontend/src/pages/PriceOpt.jsx` - 6개
- `frontend/src/pages/ReviewsUGC.jsx` - 3개
- `frontend/src/pages/RollupDashboard.jsx` - 4개
- `frontend/src/pages/KakaoChannel.jsx` - 4개
- `frontend/src/pages/KrChannel.jsx` - 4개
- `frontend/src/pages/CreativeStudio.jsx` - 1개
- `frontend/src/pages/AccountPerformance.jsx` - 1개
- `frontend/src/pages/Audit.jsx` - 1개

### 우선순위 Medium (점진적 적용)

**pages_backup 폴더**:
- `frontend/src/pages_backup/MenuAccessPanel.jsx` - 2개
- `frontend/src/pages_backup/SupplyChain.jsx` - 3개
- `frontend/src/pages_backup/SubscriptionPricing.jsx` - 4개
- `frontend/src/pages_backup/ReturnsPortal.jsx` - 2개
- `frontend/src/pages_backup/PixelTracking.jsx` - 1개
- `frontend/src/pages_backup/MyCoupons.jsx` - 1개
- `frontend/src/pages_backup/KakaoChannel.jsx` - 4개
- `frontend/src/pages_backup/FeedbackCenter.jsx` - 1개
- `frontend/src/pages_backup/ApiKeys.jsx` - 1개
- `frontend/src/pages_backup/Admin.jsx` - 13개
- 기타 pages_backup 파일들

### 우선순위 Low (백로그)

**기타 파일**:
- `frontend/src/auth/AuthContext.jsx` - 1개
- 기타 유틸리티 파일들

---

## 📊 예상 효과

### 사용자 경험 개선
- ✅ 에러 발생 시 명확한 피드백 제공
- ✅ 네트워크 오류 시 재시도 안내
- ✅ 예측 가능한 에러 처리

### 개발자 경험 개선
- ✅ 일관된 에러 처리 패턴
- ✅ 디버깅 용이성 향상
- ✅ 에러 로그 중앙 집중화

### 데이터 무결성
- ✅ 실패한 작업 추적 가능
- ✅ 사용자가 작업 실패를 인지
- ✅ 재시도 또는 대체 방법 제공 가능

---

## 🔄 점진적 적용 계획

### Phase 1: 핵심 페이지 (Week 1)
- [ ] Connectors.jsx
- [ ] AuthPage.jsx
- [ ] LicenseActivation.jsx
- [ ] PriceOpt.jsx
- [ ] ReviewsUGC.jsx

### Phase 2: 주요 기능 페이지 (Week 2)
- [ ] RollupDashboard.jsx
- [ ] KakaoChannel.jsx
- [ ] KrChannel.jsx
- [ ] CreativeStudio.jsx
- [ ] AccountPerformance.jsx

### Phase 3: 백업 페이지 (Week 3-4)
- [ ] pages_backup 폴더 전체 파일

### Phase 4: 기타 파일 (Backlog)
- [ ] 유틸리티 및 컨텍스트 파일

---

## 📚 관련 파일

- `frontend/src/utils/errorHandler.js` - 에러 핸들러 유틸리티 (신규 생성)
- `frontend/src/context/GlobalDataContext.jsx` - addAlert 함수 제공
- `frontend/src/pages/*.jsx` - 적용 대상 파일들

---

## 🚀 다음 단계

1. **개발팀 공유**: 에러 핸들러 유틸리티 사용법 공유
2. **점진적 적용**: Phase 1부터 순차적으로 적용
3. **코드 리뷰**: 적용된 파일 검토 및 피드백
4. **모니터링**: 에러 로그 수집 및 분석
5. **개선**: 사용자 피드백 기반 에러 메시지 개선

---

## 📖 참고 문서

- [에러 핸들링 베스트 프랙티스](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
- [Promise 에러 처리](https://javascript.info/promise-error-handling)
- [React 에러 바운더리](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

---

**작성자**: 프론트엔드 에이전트  
**최종 업데이트**: 2026-05-01 09:26  
**다음 작업**: BUG-003 (라이선스 키 형식 하드코딩)
