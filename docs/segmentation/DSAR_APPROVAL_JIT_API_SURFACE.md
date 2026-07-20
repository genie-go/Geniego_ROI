# DSAR — JIT Access Governance: API 표면 (Part 3-9 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §32 API = JIT elevation 폐루프의 **최소 엔드포인트 9종**이다.

| # | 엔드포인트(SPEC 매핑) |
|---|---|
| 1 | Elevation Request 생성(§3) |
| 2 | Elevation 승인(§7 Approval) |
| 3 | Elevation 거부(§7) |
| 4 | Elevation Session 조회(§11) |
| 5 | Runtime 상태 조회(§13 Monitoring) |
| 6 | Session 연장(§16 Extension) |
| 7 | Auto Revocation 실행(§14) |
| 8 | Analytics 조회(§20) |
| 9 | Simulation 실행(§24) |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| API | 근접·재활용 substrate (파일:라인) | 상태 |
|---|---|---|
| 2·3 승인/거부 | maker-checker decide `Alerting.php:598`·정족수2 `:642-650`·approved-only 집행 `:684-686`·승인자 서버도출 fail-closed `:600-606`(GT①§4-B) — **마케팅 action_request 라우트 `routes.php:443-445`**(KEEP_SEPARATE) | 재활용(패턴) |
| 1 Request 생성 | 시한부 발급 원형 impersonate `UserAdmin.php:451`·`routes.php:1675`(GT①§4-C) — 하향 대행 발급이지 elevation request 아님 | 오근접 |
| 4 Session 조회 | `user_session` 스키마 `Db.php:1111-1119`·userByToken `UserAuth.php:249-284`(GT①§4-D) — 세션 조회 substrate, elevation session 아님 | PARTIAL |
| 5 Runtime 상태 | Runtime Monitoring(§13) ABSENT(GT②표 §2) | ABSENT |
| 6 연장 | Session Extension grep 0(GT②B-9 lazy만) | ABSENT |
| 7 Auto Revocation | cron 3종만(`alerts_cron`·`optimize_cron`·`oauth_refresh_cron`)·권한 purge 워커 ABSENT(GT②B-9)·revoke 의미 `AccessReview.php:210-214`(is_active=0 재사용) | ABSENT(엔진)/재활용(semantics) |
| 8 Analytics | JIT Analytics grep 0(GT②표 §2·B-8 마케팅 엔진 분리) | ABSENT |
| 9 Simulation | 비즈니스 simulate `RuleEngine.php`·`Decisioning.php`·`PriceOpt.php`(GT②B-8) — elevation simulation 아님 | 오근접 |

- **핵심 사실(GT②§1)**: `jit_*`·elevation 테이블/핸들러/**라우트 전무**. 9 엔드포인트 전부 신규 등록 필요. 신규 실배선은 `/api` 접두 필수(MEMORY reference — nginx SPA HTML 폴백 착시 회피).

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

| 규칙 | 계약 내용 |
|---|---|
| A-1 신규 라우트 | 9 엔드포인트는 최신 버전 접두 하 **신규 등록**(기존 impersonate/approval 라우트는 KEEP_SEPARATE 재활용). |
| A-2 승인 패턴 재사용 | 2·3(승인/거부)은 `Alerting.php:598`~`:686` maker-checker 상태머신을 **패턴 재사용**하되 별도 테이블·경로(action_request 개명 금지·ADR §D-2). |
| A-3 발급 패턴 재사용 | 1(Request→grant)은 impersonate 2h TTL 발급(`UserAdmin.php:472-482`) + 원 principal 보존 패턴 재사용 — 단 상향 elevation으로 분리(하향 대행 아님). |
| A-4 fail-secure | 모든 write는 승인·만료·정책 검증 통과 후만. 미승인 grant 사용은 §30 Error로 거부. |
| A-5 성능·감사 | Request≤100ms·Approval≤200ms(SPEC §35). 모든 호출 SecurityAudit 불변체인(`SecurityAudit.php:12-53`) 기록. |

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- `action_request` decide/execute 라우트 `routes.php:443-445`(GT②B-1) — 마케팅 결재 API. elevation 승인 개명·흡수 금지.
- impersonate 라우트 `routes.php:1675`(등록 `:2712`·GT②B-2) — 하향 대행 발급. elevation request 아님.
- catalog approveQueue `routes.php:110`·agency approve `routes.php:338`(GT②B-1) — 상품/대행사 승인. elevation 아님.
- `mapping_change_request` maker-checker `Db.php:623-636`·`Mapping.php:209,:287,:527`(GT①§4-B) — 매핑 거버넌스 정족수. elevation 승인 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**API Surface = 라우트 전면 ABSENT / 승인·발급 패턴만 재활용.** 9 엔드포인트 모두 신규 등록 대상이며, 승인/거부(2·3)는 `Alerting.php` maker-checker를, Request 발급(1)은 impersonate 시한부 발급 패턴을 **별도 경로로 재사용**한다. Runtime/연장/Auto-Revocation/Analytics/Simulation(5~9)은 대응 엔진이 전무해 순신규. 코드 변경 0 · Part 1~3-8 인증 및 Grant Ledger 신설 후 RP-track(BLOCKED_PREREQUISITE).
