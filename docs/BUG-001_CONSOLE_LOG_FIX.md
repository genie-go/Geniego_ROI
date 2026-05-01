# BUG-001: 프로덕션 환경 console.log 노출 수정 완료

## 📋 작업 요약

**버그 ID**: BUG-001  
**심각도**: Critical (P0)  
**작업 일시**: 2026-05-01  
**담당**: PM 에이전트  
**상태**: ✅ 수정 완료 (테스트 대기)

---

## 🔧 수정 내용

### 1. Vite 빌드 설정 수정 (`frontend/vite.config.js`)

프로덕션 빌드 시 자동으로 `console.log`, `console.error`, `console.warn`, `debugger` 문을 제거하도록 Terser 옵션을 추가했습니다.

```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 8000,
    minify: 'terser',  // ✅ 추가
    terserOptions: {   // ✅ 추가
      compress: {
        drop_console: true,    // 모든 console.* 제거
        drop_debugger: true,   // debugger 문 제거
      },
    },
    rollupOptions: {
      // ... 기존 설정 유지
    },
  },
  // ... 기존 설정 유지
});
```

**효과**:
- 프로덕션 빌드 시 모든 `console.log`, `console.error`, `console.warn` 자동 제거
- `debugger` 문도 자동 제거
- 개발 환경(`npm run dev`)에서는 정상적으로 로그 출력
- 민감한 정보 유출 위험 제거
- 번들 크기 감소 및 성능 향상

---

### 2. ESLint 설정 추가 (`frontend/.eslintrc.json`)

개발 중에 `console.log` 사용 시 경고를 표시하도록 ESLint 규칙을 설정했습니다.

```json
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-console": "warn",      // ✅ console 사용 시 경고
    "no-debugger": "warn"      // ✅ debugger 사용 시 경고
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

**효과**:
- 개발자가 `console.log`를 사용하면 IDE에서 경고 표시
- 코드 리뷰 시 쉽게 발견 가능
- 팀 전체의 코드 품질 향상

---

### 3. package.json 업데이트

필요한 패키지와 스크립트를 추가했습니다.

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .js,.jsx"  // ✅ 추가
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "eslint": "^8.57.0",                      // ✅ 추가
    "eslint-plugin-react": "^7.34.0",         // ✅ 추가
    "eslint-plugin-react-hooks": "^4.6.0",    // ✅ 추가
    "ssh2": "^1.17.0",
    "terser": "^5.36.0",                      // ✅ 추가
    "vite": "^5.4.2"
  }
}
```

**추가된 패키지**:
- `terser`: 프로덕션 빌드 시 코드 압축 및 console 제거
- `eslint`: 코드 품질 검사 도구
- `eslint-plugin-react`: React 전용 ESLint 규칙
- `eslint-plugin-react-hooks`: React Hooks 규칙

**추가된 스크립트**:
- `npm run lint`: 전체 소스 코드 ESLint 검사

---

## 📝 사용자 액션 필요

### 1. 패키지 설치

터미널에서 다음 명령어를 실행하여 새로 추가된 패키지를 설치해주세요:

```bash
cd D:\project\GeniegoROI\frontend
npm install
```

### 2. 빌드 테스트

프로덕션 빌드가 정상적으로 작동하는지 확인해주세요:

```bash
cd D:\project\GeniegoROI\frontend
npm run build
```

빌드가 성공하면 `frontend/dist` 폴더가 생성됩니다.

### 3. 빌드 결과 확인

빌드된 파일에 console.log가 제거되었는지 확인:

```bash
# 빌드된 JS 파일에서 console.log 검색 (없어야 정상)
cd D:\project\GeniegoROI\frontend\dist\assets
findstr /s "console.log" *.js
```

결과가 없거나 매우 적으면 성공입니다.

### 4. (선택) ESLint 검사

현재 코드베이스에서 console.log 사용 현황 확인:

```bash
cd D:\project\GeniegoROI\frontend
npm run lint
```

경고가 많이 나올 수 있지만, 이는 정상입니다. 프로덕션 빌드에서는 자동으로 제거됩니다.

---

## ✅ 검증 방법

### 개발 환경 (console.log 유지)
```bash
npm run dev
```
- 브라우저 콘솔에서 로그 정상 출력 확인

### 프로덕션 빌드 (console.log 제거)
```bash
npm run build
npm run preview
```
- 브라우저 콘솔에서 로그가 출력되지 않음 확인
- 빌드된 JS 파일에 console.log가 없음 확인

---

## 📊 예상 효과

### 보안
- ✅ API 키, 토큰 등 민감 정보 유출 방지
- ✅ 에러 스택 트레이스 노출 방지
- ✅ 사용자 데이터 노출 방지

### 성능
- ✅ 불필요한 로깅 제거로 런타임 성능 향상
- ✅ 번들 크기 감소 (console.log 문자열 제거)
- ✅ 메모리 사용량 감소

### 개발 경험
- ✅ 개발 중에는 정상적으로 디버깅 가능
- ✅ ESLint 경고로 console.log 사용 인지
- ✅ 프로덕션 배포 시 자동 제거

---

## 🔄 다음 단계

1. **사용자 확인**: 위의 "사용자 액션 필요" 섹션 실행
2. **빌드 테스트**: 프로덕션 빌드 성공 확인
3. **Git Commit**: 변경 사항 커밋 및 푸시
4. **다음 버그 수정**: BUG-002 (빈 에러 핸들러) 작업 시작

---

## 📚 관련 파일

- `frontend/vite.config.js` - Terser 설정 추가
- `frontend/.eslintrc.json` - ESLint 규칙 설정 (신규 생성)
- `frontend/package.json` - 패키지 및 스크립트 추가

---

## 📖 참고 문서

- [Vite Build Options](https://vitejs.dev/config/build-options.html)
- [Terser Documentation](https://terser.org/docs/api-reference)
- [ESLint Rules](https://eslint.org/docs/latest/rules/no-console)

---

**작성자**: PM 에이전트  
**최종 업데이트**: 2026-05-01 09:15
