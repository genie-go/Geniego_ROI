# DSAR — JIT Access Governance: 정적 린트 (Part 3-9 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §29 Static Lint = 코드/정책/스키마에서 **JIT 원칙 위반을 정적으로 탐지**하는 게이트다(런타임 이전·CI 단계). 탐지 7종: **Permanent Privileged Role**(영구 특권역할), **Hardcoded Elevation**(하드코딩 상승), **Missing Auto Revocation**(자동회수 누락), **Missing Monitoring**(감시 누락), **Missing Snapshot**(스냅샷 누락), **Missing Evidence**(증거 누락), **Bypass Approval**(승인 우회). Zero Standing Privilege(ZSP) 원칙을 코드 수준에서 강제한다(SPEC §0).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Lint 탐지축 | 관측 사실 (파일:라인) | 상태 |
|---|---|---|
| Permanent Privileged Role | `acl_permission`(`TeamPermissions.php:152`) TTL 컬럼 부재·team_role 영속(`UserAuth.php:1019`·`EnterpriseAuth.php:487`) — **린트가 잡아야 할 대상 자체가 규범(현행 정상)**. 탐지기 ABSENT | ABSENT |
| Hardcoded Elevation | 영구 부여 `putTeamPermissions`(`TeamPermissions.php:599`)·env 마스터로그인 `UserAuth.php:793`(GT①C) — 정적 탐지기 없음 | ABSENT |
| Missing Auto Revocation | cron 3종(`alerts_cron`·`optimize_cron`·`oauth_refresh_cron`)만·권한 purge 잡 무매치(GT②B-9) — 회수부재 자체를 린트하는 도구 없음 | ABSENT |
| Missing Monitoring / Snapshot / Evidence | AccessReview append-only 이력 `AccessReview.php:62-80`·SecurityAudit 증거 `:224-233`(선례·GT①§4-E) — **elevation grant 대상 정적 검증 없음** | ABSENT |
| Bypass Approval | approved-only 게이트 `Alerting.php:684-686`는 런타임 강제이지 정적 lint 아님(GT①§4-B) | ABSENT |

- **★함정(GT②§2·표)**: FE `SecurityGuard.js`·`ContaminationGuard.js`는 **XSS/테넌트오염** 방어 유틸이다. "Guard/보안" 명칭이 유사하나 **영구권한·승인우회를 탐지하는 권한 lint가 아니다**(오흡수 금지).
- **정직 경계**: Static Lint는 8 거버넌스 계층 중 Guard/Lint축이 **grep 0**로 확정된 순수 ABSENT다(GT②표 §2 마지막 행).

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

| 규칙 | 계약 내용 |
|---|---|
| L-1 ZSP 스캔 | High-risk 역할/permission을 `acl_permission`에 영구 배정한 코드·시드를 탐지(Permanent Privileged Role) → CI 실패. |
| L-2 하드코딩 금지 | 소스 내 role/scope 직접 상승(request→approval→grant 폐루프 우회) 탐지. |
| L-3 필수 부속 강제 | 신규 elevation 발급 경로가 Auto Revocation·Monitoring·Snapshot(§25)·Evidence(§26)를 결선하지 않으면 탐지(Missing 4종). |
| L-4 승인우회 탐지 | maker-checker(§7)를 우회해 grant를 직접 생성하는 경로 탐지(Bypass Approval). |
| L-5 신규 도구 | 기존 FE Guard·CI(EN locale 가드 등)와 **별개 신규 lint 룰셋**. 재사용 substrate 없음(순신규). |

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- FE `SecurityGuard.js`·`ContaminationGuard.js`(GT②§2) — XSS·테넌트오염. 권한 lint 아님(★대표 오탐 방지 대상).
- `menu_audit_log`(`AdminMenu.php:98`·GT②B-8) — 장식 감사(verify 별도). elevation snapshot/evidence 정적검증 아님.
- `ModelMonitor.php`·`AnomalyDetection.php`(GT②B-8) — ML/마케팅 드리프트·이상탐지. elevation lint 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**Static Lint = 완전 ABSENT(순신규).** 재활용 가능한 substrate가 없다 — FE Guard는 관심사 상이(XSS/테넌트), CI는 로케일 문법 가드뿐. 린트 대상인 "영구 특권"은 현행 코드에서 **규범(정상)**이므로, 실 구현 시 grant 원장(§D-1)·발급 폐루프가 먼저 존재해야 위반을 정의할 수 있다. 코드 변경 0 · Part 1~3-8 인증 및 Grant Ledger 신설 후 RP-track(BLOCKED_PREREQUISITE).
