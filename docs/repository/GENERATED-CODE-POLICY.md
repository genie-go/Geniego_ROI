# Generated Code Policy

GeniegoROI 생성 코드 정책

Version 1.0 | 2026-07-22 | CCIS Part002

---

## 1. 정의

**Generated Code**란 소스 코드를 직접 작성하지 않고 도구, 명령어, 또는 빌드 프로세스가 자동으로 생성한 코드를 말한다.

---

## 2. 현재 Generated Code 목록

| 항목 | 원본 | 생성 명령 | 위치 | Git 추적 |
|------|------|-----------|------|----------|
| PHP 의존성 | `backend/composer.json` | `composer install` | `backend/vendor/` | **gitignored** |
| npm 의존성 | `frontend/package.json` | `npm install` | `frontend/node_modules/` | **gitignored** |
| Frontend 빌드 | `frontend/src/` | `npm run build` | `frontend/dist/` | **gitignored** |
| Capacitor Web Assets | `frontend/dist/` | `cap sync` | `frontend/android/app/src/main/assets/public/` | **gitignored** |
| Capacitor iOS Assets | `frontend/dist/` | `cap sync ios` | `frontend/ios/App/App/public/` | **gitignored** |
| Composer Lock | `backend/composer.json` | `composer update` | `backend/composer.lock` | **추적됨** |
| npm Lock | `frontend/package.json` | `npm install` | `frontend/package-lock.json` | **추적됨** |

---

## 3. 생성 코드 규칙

### 3.1 수동 수정 금지

다음 파일은 절대 수동으로 수정하지 않는다:

- `backend/vendor/**` — `composer install`로 재생성
- `frontend/node_modules/**` — `npm install`로 재생성
- `frontend/dist/**` — `npm run build`로 재생성
- `frontend/android/app/src/main/assets/public/**` — `cap sync`로 재생성
- `frontend/ios/App/App/public/**` — `cap sync ios`로 재생성

### 3.2 Lock 파일 추적

다음 Lock 파일은 **반드시 Git에 추적**한다:

- `backend/composer.lock` — 재현 가능한 빌드를 위해
- `frontend/package-lock.json` — 재현 가능한 빌드를 위해

Lock 파일은 의도적으로만 업데이트한다:
```bash
# PHP 의존성 업데이트
cd backend && composer update {package-name}

# npm 의존성 업데이트
cd frontend && npm update {package-name}
```

### 3.3 Regeneration 가능성 보장

모든 Generated Code는 원본에서 언제든 재생성 가능해야 한다:

```bash
# Backend 재생성
cd backend && composer install --no-dev --optimize-autoloader

# Frontend 재생성
cd frontend && npm install && npm run build

# Capacitor 재생성
cd frontend && npm run cap:sync
```

### 3.4 CI에서 Drift 검증

CI Pipeline에서 Generated Code와 원본의 일치를 검증한다:
- `composer.lock`이 `composer.json`과 일치하는지 확인
- `package-lock.json`이 `package.json`과 일치하는지 확인

---

## 4. 미래 Generated Code 정책 (예정)

향후 API Contract 또는 Proto 파일이 생성되는 경우:

| 대상 | 원본 위치 | 생성 위치 | 생성 명령 |
|------|-----------|-----------|-----------|
| OpenAPI PHP Client | `contracts/openapi/` | `backend/generated/` | `openapi-generator` |
| OpenAPI TypeScript Client | `contracts/openapi/` | `frontend/src/generated/` | `openapi-generator` |
| Protobuf Classes | `contracts/protobuf/` | `backend/generated/proto/` | `protoc` |

생성 위치의 `generated/` 디렉터리는:
- 수동 수정 금지
- `.gitignore`에 포함 또는 별도 Artifact Registry에 배포

---

## 5. 위반 탐지

`scripts/validation/check-generated-files.sh`를 실행하여 검증한다:

```bash
bash scripts/validation/check-generated-files.sh
```

탐지 대상:
- `backend/vendor/`에 수동 수정된 파일 (`composer.json`과 불일치)
- `frontend/node_modules/`가 Git에 추적된 경우
- `frontend/dist/`가 Git에 추적된 경우
- Lock 파일과 원본 Manifest의 불일치

---

*CCIS Part002 — Generated Code Policy*
