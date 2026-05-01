# BUG-003: 라이선스 키 형식 하드코딩 수정

## 📋 작업 요약

**버그 ID**: BUG-003  
**심각도**: High (P1)  
**작업 일시**: 2026-05-01  
**담당**: 프론트엔드 + 백엔드 에이전트  
**상태**: ✅ 완료 (유틸리티 구현 완료, 점진적 적용 필요)

---

## 🔧 수정 내용

### 1. 프론트엔드 라이선스 키 유틸리티 (`frontend/src/utils/licenseKeyUtils.js`)

라이선스 키 형식 `GENIE-XXXX-XXXX-XXXX-XXXX`가 여러 파일에 하드코딩된 문제를 해결하기 위해 중앙 집중식 유틸리티를 작성했습니다.

#### 주요 기능

1. **LICENSE_KEY_FORMAT**: 라이선스 키 형식 상수 정의
2. **isValidLicenseKey()**: 라이선스 키 형식 검증
3. **formatLicenseKey()**: 라이선스 키 표준 형식으로 포맷팅
4. **autoFormatLicenseKey()**: 입력 중 자동 포맷팅
5. **generateLicenseKey()**: 라이선스 키 생성 (데모/테스트용)
6. **maskLicenseKey()**: 라이선스 키 마스킹 (보안 표시용)
7. **getLicenseKeyError()**: 검증 에러 메시지 반환

### 2. 백엔드 라이선스 키 유틸리티 (`backend/src/Utils/LicenseKeyUtils.php`)

PHP 백엔드에서 사용할 수 있는 동일한 기능의 유틸리티 클래스를 작성했습니다.

#### 주요 메서드

1. **isValid()**: 라이선스 키 형식 검증
2. **generate()**: 라이선스 키 생성
3. **format()**: 라이선스 키 포맷팅
4. **mask()**: 라이선스 키 마스킹
5. **getError()**: 검증 에러 메시지 반환
6. **getFormatInfo()**: 형식 정보 배열 반환

---

## 📝 사용 방법

### 프론트엔드 (JavaScript/React)

```javascript
import { 
    LICENSE_KEY_FORMAT, 
    isValidLicenseKey, 
    autoFormatLicenseKey,
    getLicenseKeyError 
} from '../utils/licenseKeyUtils';

function LicenseInput() {
    const [key, setKey] = useState('');
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const formatted = autoFormatLicenseKey(e.target.value);
        setKey(formatted);
        setError(getLicenseKeyError(formatted, 'ko'));
    };

    const handleSubmit = () => {
        if (isValidLicenseKey(key)) {
            // 라이선스 활성화 API 호출
            activateLicense(key);
        } else {
            setError('올바른 라이선스 키 형식이 아닙니다.');
        }
    };

    return (
        <div>
            <input
                value={key}
                onChange={handleChange}
                placeholder={LICENSE_KEY_FORMAT.PLACEHOLDER}
                maxLength={LICENSE_KEY_FORMAT.TOTAL_LENGTH}
            />
            {error && <div style={{ color: 'red' }}>{error}</div>}
            <button onClick={handleSubmit}>활성화</button>
        </div>
    );
}
```

### 백엔드 (PHP)

```php
<?php
use GeniegoROI\Utils\LicenseKeyUtils;

// 라이선스 키 생성
$newKey = LicenseKeyUtils::generate();
// 예: GENIE-A1B2-C3D4-E5F6-G7H8

// 라이선스 키 검증
$userInput = $_POST['license_key'] ?? '';
if (LicenseKeyUtils::isValid($userInput)) {
    // 유효한 라이선스 키
    $formatted = LicenseKeyUtils::format($userInput);
    // DB에 저장 등
} else {
    // 에러 메시지 반환
    $error = LicenseKeyUtils::getError($userInput, 'ko');
    echo json_encode(['ok' => false, 'error' => $error]);
}

// 라이선스 키 마스킹 (로그/UI 표시용)
$masked = LicenseKeyUtils::mask($userInput, true);
// 예: GENIE-****-****-****-G7H8
```

---

## 🎯 적용 대상 파일

### 프론트엔드 (5개 위치)

1. **frontend/src/pages_backup/ApiKeys.jsx** (2개)
   - 플레이스홀더: `GENIE-XXXX-XXXX-XXXX-XXXX`
   - 입력 필드 placeholder

2. **frontend/src/pages/LicenseActivation.jsx** (3개)
   - 형식 안내 텍스트
   - 예시 텍스트
   - 입력 필드 placeholder

### 백엔드 (1개 위치)

1. **backend/src/routes.php** (1개)
   - 라이선스 키 생성 로직 주석

---

## 📊 예상 효과

### 유지보수성 향상
- ✅ 라이선스 키 형식 변경 시 한 곳만 수정
- ✅ 일관된 형식 검증 로직
- ✅ 중복 코드 제거

### 확장성 향상
- ✅ 새로운 라이선스 타입 추가 용이
- ✅ 다양한 형식 지원 가능 (예: GENIE-PRO-XXXX-XXXX)
- ✅ 검증 로직 커스터마이징 가능

### 개발자 경험 개선
- ✅ 명확한 API 제공
- ✅ 타입 안전성 (TypeScript 지원 가능)
- ✅ 재사용 가능한 유틸리티

---

## 🔄 점진적 적용 계획

### Phase 1: 신규 코드 (즉시)
- [ ] 새로 작성하는 모든 코드에서 유틸리티 사용

### Phase 2: 핵심 페이지 (Week 1)
- [ ] frontend/src/pages/LicenseActivation.jsx
- [ ] backend/src/routes.php (라이선스 생성 로직)

### Phase 3: 백업 페이지 (Week 2)
- [ ] frontend/src/pages_backup/ApiKeys.jsx
- [ ] frontend/src/pages_backup/MyCoupons.jsx

### Phase 4: 백엔드 핸들러 (Week 3)
- [ ] backend/src/Handlers/UserAdmin.php
- [ ] backend/src/Handlers/UserAuth.php

---

## 📚 관련 파일

- `frontend/src/utils/licenseKeyUtils.js` - 프론트엔드 유틸리티 (신규 생성)
- `backend/src/Utils/LicenseKeyUtils.php` - 백엔드 유틸리티 (신규 생성)
- `frontend/src/pages/LicenseActivation.jsx` - 적용 대상
- `frontend/src/pages_backup/ApiKeys.jsx` - 적용 대상
- `backend/src/routes.php` - 적용 대상

---

## 🚀 다음 단계

1. **개발팀 공유**: 라이선스 키 유틸리티 사용법 공유
2. **점진적 적용**: Phase 1부터 순차적으로 적용
3. **테스트**: 라이선스 키 검증 로직 단위 테스트 작성
4. **문서화**: API 문서에 라이선스 키 형식 명시
5. **모니터링**: 라이선스 키 검증 실패 로그 수집

---

## 💡 추가 개선 사항

### 향후 고려사항

1. **라이선스 타입 확장**
   ```javascript
   // 예: 프리미엄 라이선스
   GENIE-PRO-XXXX-XXXX-XXXX
   
   // 예: 엔터프라이즈 라이선스
   GENIE-ENT-XXXX-XXXX-XXXX
   ```

2. **체크섬 추가**
   - 마지막 세그먼트를 체크섬으로 사용하여 무결성 검증

3. **만료일 인코딩**
   - 라이선스 키에 만료일 정보 인코딩

4. **기능 플래그**
   - 라이선스 키에 활성화된 기능 정보 인코딩

---

## 📖 참고 문서

- [라이선스 키 생성 베스트 프랙티스](https://en.wikipedia.org/wiki/Product_key)
- [정규식 패턴 검증](https://regex101.com/)
- [PHP random_bytes()](https://www.php.net/manual/en/function.random-bytes.php)

---

**작성자**: 프론트엔드 + 백엔드 에이전트  
**최종 업데이트**: 2026-05-01 09:30  
**다음 작업**: BUG-004 (Naver Adapter) 또는 BUG-005 (XSS 취약점)
