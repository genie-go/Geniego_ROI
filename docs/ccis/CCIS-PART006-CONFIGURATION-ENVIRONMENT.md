# GeniegoROI Claude Code Implementation Specification

# CCIS Part006 — Configuration & Environment Management

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

환경설정(Configuration)과 환경변수(Environment) 관리 표준을 수립한다.

> ★**성격(Part001~005 와 동일)**: 사용자가 Part006 명세를 제공했으나 **그대로 따르지 않았다.**
> 명세의 Reference Stack(`GENIEGOROI_` prefix·Laravel/Symfony Config Repository·PostgreSQL·Redis·
> Kafka·Queue·S3·Docker Compose·Kubernetes ConfigMap/Secret·Vault·JWT env)은 **이 저장소에
> 대부분 존재하지 않거나, 적용 시 명세 자신의 §20("운영 환경변수 변경 금지")과 Part002·Part005 가
> 이미 확정한 사실(정본 prefix=`GENIE_`)을 위반한다.** Part001 §4 에 따라 **실측 → 매핑 → 부재/모순
> 증명 → 실재하는 표준만 성문화**했고, 실재하는 갭 1건(§8)만 코드로 수정했다.

---

## 2. 실측 — 현행 Configuration/Environment 현실

| 항목 | 명세 제안 | **실측(정본)** | 판정 |
|------|-----------|----------------|------|
| env prefix | `GENIEGOROI_` | **`GENIE_`** (34개 distinct·`GENIEGOROI_`=0) | 명세 prefix 허구(3연속 확인) |
| `.env` 위치 | Framework 관례 | **저장소 ROOT `.env`** (`Db::loadEnvFile()`=`backend/src/../../.env`) | 확립됨 |
| env 읽기 | `env()` in Config only · app 직접호출 금지 | **`getenv('GENIE_*')` 직접** (`Db::env()`·핸들러). Config Repository 계층 **부재** | 불일치(Slim, config 계층 없음) |
| config 디렉터리 | `config/{app,database,cache,queue,mail,…}.php` | **부재**(root `config/`=Part004 quality baseline 뿐) | DDD/Laravel config 부재 |
| Framework | Laravel/Symfony | **Slim 4** | 불일치 |
| DB | PostgreSQL | **MySQL 8 + SQLite 폴백**(`backend/data/genie_*.sqlite`) | 불일치 |
| Redis | 필수 | **부재**(composer predis 없음·코드 0) | 미사용 |
| Queue | Redis/DB/Kafka | **부재**(프레임워크 없음 · cron `backend/bin/*_cron.php`) | cron 기반 |
| Kafka | 필요 시 | **부재**(rdkafka 없음·코드 0) | 미사용 |
| Storage/S3 | Local/S3/MinIO | **S3 부재**(aws-sdk 없음·"S3" 문자열 9건=전부 코드명/ID 오탐). 미디어=로컬 `MediaHost`(278차) | 미사용 |
| Mail | env | **`GENIE_SMTP_*`**(Postfix+OpenDKIM·203차) | 준수(GENIE_) |
| SMS | — | **`GENIE_SMS_*`·`GENIE_NHN_*`·`GENIE_TWILIO_*`** | 실재 |
| JWT | `GENIEGOROI_JWT_SECRET` | **목적한정**(WebPush VAPID 서명 등 5파일). 메인 인증=**세션토큰**(`user_session`·hashToken), JWT env 없음 | 부분/불일치 |
| Docker/Compose | 필수 | `infra/`=Python/FastAPI **미사용 스텁**(Part003) · 배포=수동 pscp | 미사용 |
| Kubernetes/Vault | ConfigMap/Secret/Vault | **부재** | 미사용 |
| Secret 관리 | Secret Manager → k8s Secret → env → config | **2계층**: 인프라 secret=`.env`(gitignore) · **테넌트 채널 자격증명=`Crypto`(openssl AES) 암호화 저장** | 실재(Secret Manager 아님) |
| PHP | 8.3+ | **8.1.34** | 명세 상향 미충족 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §5 환경 5종(local/dev/test/staging/prod) | **부분** | 실제는 `GENIE_ENV`(production/demo 2축) + DB명 `_demo` 접미. staging/test 별도 환경 부재 |
| §6 디렉터리(config/·bootstrap/·deployment/·docker/) | **미적용** | 부재. `config/` 강제 신설은 Extend 아니라 Replace |
| §7 `GENIEGOROI_` prefix | **미적용(허구)** | Part002·Part005 기확정 — `GENIEGOROI_*` 는 어느 코드도 안 읽음. 정본 `GENIE_*`. §20("운영 env 변경 금지")과도 충돌 |
| §8 `.env` 정책(환경별 secret 미커밋) | **채택+수정** | 실재 갭 — `.gitignore` 가 `.env.production/.staging/.development` 미커버. **본 차수 hardening(§6 아래)** |
| §9 `env()` config 전용·app 직접호출 금지 | **미적용** | Slim+config 계층 부재. `getenv()` 직접이 정본 패턴(`Db::env()`). Laravel config repository 강제는 구조 이식 |
| §10 DB env | **준수(GENIE_)** | `GENIE_DB_{HOST,PORT,NAME,USER,PASS}`·`GENIE_ENV`·`GENIE_DEMO_DB_NAME` |
| §11 Redis | **대상 없음** | Redis 미사용 |
| §12 Queue | **대상 없음** | Queue 프레임워크 부재(cron) |
| §13 Storage/S3 | **대상 없음** | S3 미사용. 미디어=로컬 MediaHost |
| §14 Mail env | **준수(GENIE_)** | `GENIE_SMTP_*` |
| §15 Kafka | **대상 없음** | 부재 |
| §16 JWT/OAuth env | **부분** | JWT=VAPID 등 목적한정(env secret 아님). OAuth 앱설정은 DB(`admin/oauth-apps`) 저장 |
| §17 Docker | **미적용** | Docker 미사용 |
| §18 k8s ConfigMap/Secret | **미적용** | k8s 미사용 |
| §19 Secret Manager | **부분채택** | Vault/SM 부재. 실 모델=`.env`(인프라) + `Crypto` 암호화(테넌트 자격증명). "코드에 비밀번호 하드코딩 금지" 정신은 준수 |
| §20 Claude Code 금지 | **채택** | 운영 secret 생성·비밀번호 커밋·`.env` 커밋·운영 env 변경 금지 준수 |
| §21 config:cache/route:list | **대상 없음** | artisan/console 부재. 라우트=`routes.php` 문자열 배열 |
| §22 검증 명령 | **부분** | `composer validate`·`phpstan analyse` 실동작. artisan/docker compose config 대상 없음 |

---

## 4. 확립된 표준 (신규 코드가 따를 정본)

- **env prefix = `GENIE_`**. `GENIEGOROI_` 금지(허구).
- **`.env` = 저장소 ROOT**. `Db::loadEnvFile()` 이 PHP-FPM 이 env 를 전달하지 않는 환경 대응으로 직접 파싱. 신규 설정은 `.env`(GENIE_) 추가 + `.env.example` 템플릿 동기화.
- **읽기 = `getenv('GENIE_*')`** (또는 `Db::env()`/`Db::envLabel()` 같은 도메인 접근자). config 계층 신설하지 않는다.
- **DB**: `GENIE_DB_*`, `GENIE_ENV`(production/demo), 미설정 시 MySQL→SQLite 폴백(`backend/data/genie_*.sqlite`).
- **Secret 2계층**:
  1. 인프라 secret(DB pass·SMTP·SMS·Twilio·Webhook·Breakglass) → `.env`(gitignore). 코드 하드코딩 금지.
  2. **테넌트별 채널 자격증명 → `Crypto`(openssl AES) 암호화 후 DB 저장·복호는 사용 시점**. 평문 저장 금지.
- **환경 전환**: `GENIE_ENV` + DB명 `_demo` 접미(운영/데모 격리). 별도 `.env.production` 파일 방식 아님.

실행 규약은 [`docs/development/NAMING-STANDARDS.md`](../development/NAMING-STANDARDS.md) §환경변수 와 정합.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **`GENIEGOROI_` prefix** — 안 함. Part002·Part005 가 이미 허구로 판정한 키. 정본 `GENIE_`. §20 과도 충돌.
2. **Laravel/Symfony Config Repository·`config/*.php`·artisan** — 안 함. Slim 4 구조에 config 계층 부재. 강제 신설은 Replace.
3. **Redis·Queue·Kafka·S3/MinIO·Vault·Docker·Kubernetes** — 안 함. 저장소 부재. 신설은 인프라 결정 + Extend 위반.
4. **JWT env(`GENIEGOROI_JWT_SECRET`)** — 안 함. 메인 인증=세션토큰. JWT 는 VAPID 등 목적한정(키는 DB/생성).
5. **PHP 8.3 상향** — 안 함. 실측 8.1.34(인프라 결정).
6. **PHPUnit/Pest(§22)** — 미도입(Part004·005 정합). 도입 시 baseline 게이트 방식.

---

## 6. 실재 갭 수정 (§8 — .gitignore hardening)

명세 §8 이 요구한 "환경별 secret .env 미커밋"에 **실재 갭**이 있었다:

- `.gitignore` 는 `.env`·`.env.local`(+ backend/frontend)만 덮고 **`.env.production`·`.env.staging`·`.env.development` 미커버**. 현재 그 파일들은 없으나, 생성 시 **운영/스테이징 비밀이 커밋 가능**했다.
- 조치: 위 6종(root + backend)을 `.gitignore` 에 사전 추가. ★**블랭킷 `.env.*` 는 금지** — `frontend/.env.demo`·`.env.capacitor` 는 빌드모드 설정(비secret·`vite --mode` 가 읽음)이라 추적을 유지해야 한다(블랭킷 시 데모 빌드 파괴).
- 확인: 현재 커밋된 `.env*` = 템플릿(`*.example`) + 프론트 빌드모드뿐 → **실 secret 커밋 0**(양호).

---

## 7. Claude Code 구현 규칙

1. env 는 **`GENIE_`** 만. `GENIEGOROI_` 금지.
2. `.env`(root)에 값 추가 시 **`.env.example` 템플릿 동기화**. 실 secret 값은 커밋 금지.
3. 코드에서 **`getenv('GENIE_*')`** 또는 도메인 접근자 사용. Redis/Queue/config-repo 신설 금지.
4. **테넌트 자격증명은 `Crypto` 암호화 저장**. 평문·로그 노출 금지(203·credentials 정책).
5. 운영 환경변수·`.env` 값 변경은 **배포 승인 대상**(운영 파괴 위험).
6. Docker/k8s/Vault/Kafka/Redis/S3 를 "명세에 있다"는 이유로 이식하지 않는다.

---

## 8. Completion Criteria

- [x] 환경 정의 **실측**(GENIE_ENV·production/demo·SQLite 폴백)
- [x] env prefix·`.env` 위치·읽기 메커니즘 실측
- [x] 명세 §5~§22 **섹션별 매핑·판정**
- [x] 확립된 표준 성문화(§4)
- [x] Secret 모델 실측(2계층: `.env` + `Crypto`)
- [x] **실재 갭 §8 수정**(.gitignore hardening) — 프론트 빌드모드 .env 보존
- [x] 의도적 미적용 + 사유(§5)
- [x] Claude Code 규칙(§7)
- [x] `composer validate`·검증 명령 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 config/env 관리의 성문화 + 실 갭 1건 수정이지, 가상 스택(Redis/Kafka/k8s/Vault) 이식이 아니다.

---

## 다음 Part

**CCIS Part007 — Architecture Pattern & Project Structure (DDD/Hexagonal/CQRS/Event-Driven)** — ★사전 경고: 이 저장소는 **Slim 4 + 평면 `Handlers/`(정적 메서드) + `routes.php` 문자열 매핑**이다. DDD Bounded Context·Aggregate·Hexagonal Port/Adapter·CQRS·Event-Driven 은 **전부 부재**(Part005 §3 §8 실측). Part007 도 실측→매핑→부재증명→기존 구조 성문화로 처리할 것(대규모 재구조화=Golden Rule 위반).
