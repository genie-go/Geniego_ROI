# BUG-005: XSS 취약점 수정 완료

## 📋 작업 개요
- **버그 ID**: BUG-005
- **심각도**: 🔴 High (보안 취약점)
- **상태**: ✅ 완료
- **작업일**: 2026-05-01
- **담당**: Cline AI Agent

## 🔍 문제 분석

### 발견된 취약점
프로젝트 전체에서 `dangerouslySetInnerHTML` 사용 시 사용자 입력이나 외부 데이터를 sanitize 없이 직접 렌더링하여 XSS(Cross-Site Scripting) 공격에 취약한 상태였습니다.

### 영향받는 파일 (6개)
1. `frontend/src/components/EventPopupDisplay.jsx`
2. `frontend/src/pages_backup/Admin.jsx`
3. `frontend/src/pages/ResultSection.jsx`
4. `frontend/src/pages/HelpCenter.jsx`
5. `frontend/src/pages/AIInsights.jsx`
6. `frontend/src/layout/Topbar.jsx`

## 🛠️ 해결 방법

### 1. XSS Sanitizer 유틸리티 작성
**파일**: `frontend/src/utils/xssSanitizer.js`

```javascript
/**
 * XSS 공격 방지를 위한 HTML Sanitizer
 * DOMPurify 라이브러리 사용
 */
import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty) {
  if (!dirty) return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span', 'div', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'style', 'class'],
    ALLOW_DATA_ATTR: false,
  });
}
```

### 2. 각 파일별 수정 내용

#### EventPopupDisplay.jsx
```javascript
// Before
<div dangerouslySetInnerHTML={{ __html: popup.body }} />

// After
import { sanitizeHtml } from '../utils/xssSanitizer.js';
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(popup.body) }} />
```

#### Admin.jsx (pages_backup)
```javascript
// Before
<div dangerouslySetInnerHTML={{__html:form.body||"..."}} />

// After
import { sanitizeHtml } from "../utils/xssSanitizer.js";
<div dangerouslySetInnerHTML={{__html:sanitizeHtml(form.body||"...")}} />
```

#### ResultSection.jsx
```javascript
// Before
<span dangerouslySetInnerHTML={{ __html: t('gAiRec.imgCreateReadyDesc') }} />

// After
import { sanitizeHtml } from '../utils/xssSanitizer.js';
<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(t('gAiRec.imgCreateReadyDesc')) }} />
```

#### HelpCenter.jsx
```javascript
// Before
<div dangerouslySetInnerHTML={{ __html: t("help.apiSubtitle") }} />

// After
import { sanitizeHtml } from "../utils/xssSanitizer.js";
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(t("help.apiSubtitle")) }} />
```

#### AIInsights.jsx
```javascript
// Before
<div dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff">$1</strong>') }} />

// After
import { sanitizeHtml } from '../utils/xssSanitizer.js';
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff">$1</strong>')) }} />
```

#### Topbar.jsx
```javascript
// Before
<span dangerouslySetInnerHTML={{ __html: t('profile.pwGuide2', 'New password must be <strong>8+ characters</strong>.') }} />

// After
import { sanitizeHtml } from "../utils/xssSanitizer.js";
<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(t('profile.pwGuide2', 'New password must be <strong>8+ characters</strong>.')) }} />
```

## ✅ 검증 결과

### 보안 개선사항
1. ✅ 모든 `dangerouslySetInnerHTML` 사용처에 sanitize 적용
2. ✅ XSS 공격 벡터 차단 (script, onerror, onclick 등)
3. ✅ 안전한 HTML 태그만 허용 (b, i, strong, a, br, p, span 등)
4. ✅ 위험한 속성 제거 (onclick, onerror, javascript: 등)

### 테스트 시나리오
- ✅ 일반 HTML 태그 정상 렌더링
- ✅ `<script>` 태그 제거 확인
- ✅ `onerror` 이벤트 핸들러 제거 확인
- ✅ `javascript:` URL 제거 확인
- ✅ i18n 번역 텍스트 정상 표시

## 📊 영향 분석

### 변경된 파일 수
- 신규 파일: 1개 (xssSanitizer.js)
- 수정된 파일: 6개

### 코드 변경 통계
- 추가된 import 문: 6개
- 수정된 dangerouslySetInnerHTML: 6개
- 총 변경 라인 수: ~20 라인

## 🔒 보안 권장사항

### 향후 개발 시 주의사항
1. **새로운 dangerouslySetInnerHTML 사용 시 반드시 sanitizeHtml() 적용**
2. **사용자 입력 데이터는 항상 검증 및 sanitize**
3. **외부 API 응답 데이터도 신뢰하지 말고 sanitize**
4. **정기적인 보안 감사 수행**

### ESLint 규칙 추가 권장
```json
{
  "rules": {
    "react/no-danger": "warn",
    "react/no-danger-with-children": "error"
  }
}
```

## 📝 관련 문서
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [React Security Best Practices](https://react.dev/learn/writing-markup-with-jsx#the-rules-of-jsx)

## 🎯 다음 단계
- [ ] BUG-006: i18n 하드코딩 분석 및 수정
- [ ] BUG-007: API 에러 처리 불일치 분석 및 수정
- [ ] 정기적인 보안 스캔 자동화 설정

---

**작업 완료**: 2026-05-01 10:15 KST
**검증자**: Cline AI Agent
**승인 상태**: ✅ 완료
