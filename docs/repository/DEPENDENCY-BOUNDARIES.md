# Dependency Boundaries

GeniegoROI 모듈 간 의존성 경계 정의

Version 1.0 | 2026-07-22 | CCIS Part002

---

## 1. 의존성 방향 원칙

```text
frontend/ (App Layer)
    │
    │  HTTP REST API only
    ▼
backend/ (Service Layer)
    │
    │  SQL
    ▼
MySQL / SQLite (Database Layer)
```

**규칙**:
- App Layer는 Service Layer에 REST API로만 의존한다
- Service Layer는 App Layer 소스를 직접 참조하지 않는다
- Database Layer는 Service Layer만 직접 접근한다
- 역방향 의존성을 만들지 않는다

---

## 2. 허용된 의존성

### 2.1 Frontend → Backend

| 통신 방식 | 허용 여부 | 비고 |
|-----------|-----------|------|
| HTTP REST API | ✅ 허용 | `VITE_API_BASE_URL` 환경변수 사용 |
| WebSocket | ✅ 허용 | 실시간 데이터 |
| 직접 파일 Import | ❌ 금지 | |
| 공유 데이터베이스 | ❌ 금지 | |

### 2.2 Backend → Database

| 통신 방식 | 허용 여부 | 비고 |
|-----------|-----------|------|
| MySQL (운영) | ✅ 허용 | `illuminate/database` 사용 |
| SQLite (로컬 개발) | ✅ 허용 | |
| 직접 파일시스템 | ⚠️ 제한 | 명시적 설계 필요 |

### 2.3 Infrastructure → Service

| 통신 방식 | 허용 여부 | 비고 |
|-----------|-----------|------|
| Container Orchestration | ✅ 허용 | Docker Compose |
| Environment Variable | ✅ 허용 | `.env` 파일 |
| 소스 코드 직접 Import | ❌ 금지 | |

---

## 3. 금지된 의존성

### 3.1 Circular Dependency 금지

```text
금지 예시:
frontend/ ──► backend/ ──► frontend/  ← 순환 의존성
backend/ ──► infra/    ──► backend/   ← 순환 의존성
```

### 3.2 계층 역전 금지

```text
금지 예시:
backend/ ──► frontend/src/components/  ← 역방향 의존성
MySQL    ──► backend/src/              ← 역방향 의존성
```

### 3.3 Direct Source Sharing 금지

두 모듈이 동일한 소스 파일을 직접 공유하지 않는다.

```text
금지:
frontend/ 와 backend/ 가 동일한 .js 파일을 import
```

---

## 4. 외부 서비스 의존성

`backend/`만 직접 외부 서비스에 접근한다.

| 외부 서비스 | 접근 모듈 | 클래스 |
|------------|-----------|--------|
| Naver SMS | `backend/` | `NaverSms.php` |
| Twilio | `backend/` | `Twilio.php` |
| SMTP 메일 | `backend/` | `SmtpClient.php`, `Mailer.php` |
| MySQL | `backend/` | `Db.php` |

`frontend/`는 외부 API에 직접 접근하지 않고 반드시 `backend/` API를 경유한다.

---

## 5. 의존성 검증

`scripts/validation/check-module-boundaries.sh`를 실행하여 경계를 검증한다:

```bash
bash scripts/validation/check-module-boundaries.sh
```

검증 항목:
- `frontend/src/` 내 `../backend/` 참조 탐지
- `backend/src/` 내 `../frontend/src/` 참조 탐지
- `infra/` 내 직접 소스 코드 import 탐지
- `vendor/`, `node_modules/`에 대한 직접 경로 사용 탐지

---

## 6. 미래 Microservice 전환 시 경계 정책

서비스가 `services/`로 분리될 때 적용할 경계:

```text
services/roi-service/
    ↓ REST API or Event
services/identity-service/
```

- 서비스 간 데이터베이스 공유 금지
- 서비스 간 소스 Import 금지
- Shared Library는 `libraries/` 디렉터리에만 배치
- Shared Library는 특정 서비스 로직을 포함하지 않음

---

*CCIS Part002 — Dependency Boundaries*
