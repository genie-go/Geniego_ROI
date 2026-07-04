# DependencyRegistry — 의존성 레지스트리 (포인터)

> **정본(SSOT)**: `frontend/package.json`+`frontend/package-lock.json`(프론트) · `backend/composer.json`+`composer.lock`(백엔드). 여기서 버전 중복 보관 금지.

## 핵심 의존
- 프론트: React 18·Vite 7·react-router·recharts(CartesianChart)·xlsx·eslint 8.57(+plugin-react/react-hooks)·acorn(pre-commit G5).
- 백엔드: Slim 4·PHP 8.1+·PDO(MySQL+SQLite).
- ★로컬 트랩: Windows 파일잠금 시 node_modules `.DELETE.<hash>` 잔여물→eslint 실행불가. 복원 후 재시도(265차). CI(ubuntu clean npm)는 무관.

## 원칙
- 신규 라이브러리 도입 전 기존 의존 확인(중복 기능 라이브러리 금지·기존 재사용). 예: 차트=recharts·i18n=자체·yaml 파서 없음(수동).
- lock 파일 커밋 유지(CI npm ci 재현성).

## 갱신 규칙
신규/변경 의존성은 package.json/composer.json(정본) 갱신 + 여기 핵심의존 반영. 도입 사유 기록.
