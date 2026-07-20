# DSAR — JIT Access Governance: 런타임 검증·가드 (APPROVAL_JIT_RUNTIME)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_JIT_RUNTIME은 활성 상승세션을 **매 요청마다 재검증(Continuous Validation)** 하고, 검증 실패·만료·미승인·범위/권한 상승 시 **차단(Runtime Guard)** 하는 실시간 집행 계층이다. SPEC §12(Continuous Validation): MFA 유지·Device Trust·Network Trust·Risk Score·Session Activity·Organization Membership을 주기 검증, 실패 시 즉시 회수. SPEC §28(Runtime Guard): Expired Elevation·Invalid Session·Missing Approval·Policy Violation·Scope/Permission Escalation·Re-authentication Failure를 차단. 성능 요구 Runtime Validation ≤ 50ms(SPEC §35).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) | JIT 매핑 |
|---|---|---|---|
| api_key expires 런타임 401 게이트 | PARTIAL | `index.php:518`(GT① A) | Grant TTL 런타임 강제(자격증명축) |
| userByToken 만료 런타임 게이트 `expires_at > ?` | PARTIAL | `UserAuth.php:249-284`·만료 배제 `:304`(GT① 4-D·E) | 세션 TTL 런타임 강제 |
| lazy 만료 정리(로그인 시 DELETE) | PARTIAL | `UserAuth.php:989`(GT① 4-D) | 만료 정리(lazy·요청시점) |
| break-glass MFA 우회(강제·등록검사 skip) | PARTIAL | `UserAuth.php:945-946`(GT① 4-A) | 재인증 검증(역방향·우회) |
| 289 writeGuard 서버측 전역 enforcement | PARTIAL | ADR §D-7(실 substrate 재활용) | 쓰기 런타임 게이트(재활용) |
| **만료후 elevation 차단(Runtime Guard)** | **ABSENT** | GT② §2 — FE `SecurityGuard.js`·`ContaminationGuard.js`는 테넌트오염/XSS·만료권한 차단 0 | 순신규 |
| **Continuous Validation(MFA/device/network/risk 주기재검증)** | **ABSENT** | GT② §2 Session-entitlement projection ABSENT·상승세션 실시간 검증 grep 0 | 순신규 |
| Static Lint(영구권한·상승우회 탐지) | **ABSENT** | GT② §2 — 영구권한 lint 0 | 순신규 |

> **정직 경계**: 현행 런타임 게이트는 **세션/자격증명 만료의 lazy 재검증**(`UserAuth.php:249-284,:304,:989`·`index.php:518`)에 국한된다. 상승 grant의 **만료후 elevation 차단**·MFA/device/network 지속 검증·scope/permission escalation 실시간 감지는 GT② §2 기준 ABSENT. 289 writeGuard(ADR §D-7)는 쓰기 권한 서버강제로 Guard의 재활용 substrate이나 "만료된 상승권한 차단"은 미구현.

## 3. 설계 계약 (필드·상태·제약)

- **차단 사유**(SPEC §28): Expired Elevation·Invalid Session·Missing Approval·Policy Violation·Scope Escalation·Permission Escalation·Re-authentication Failure → fail-secure 차단(ADR §D-3).
- **검증 항목**(SPEC §12): MFA·Device Trust·Network Trust·Risk Score·Session Activity·Organization Membership. 실패 시 즉시 회수(APPROVAL_JIT_REVOCATION 연계).
- **재활용**: 중앙 RBAC 미들웨어(만료 401 게이트 `index.php:518`)·세션 만료 게이트(`UserAuth.php:249-284`)·writeGuard(ADR §D-7)를 **대체 아닌 확장**으로 상승 grant 검증에 결합. lazy gate(`UserAuth.php:989`)에 Runtime Guard 층을 얹음(ADR §D-3).
- **fail-secure**: 만료·모호·미승인 → 차단(ADR §D-3). Runtime Validation ≤ 50ms(SPEC §35)·Monitoring Latency ≤ 5초.
- **테넌트 격리·불변**: 검증 결과·차단 이벤트는 SecurityAudit 불변 체인(`SecurityAudit.php:12-53`, ADR §2.1) 기록.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거 | 분리 사유 |
|---|---|---|
| FE 보안 가드 | `SecurityGuard.js`·`ContaminationGuard.js`(GT② §2·B-8) | 테넌트오염/XSS 방어 — 만료권한 차단 아님 |
| plan/feature 런타임 게이팅 | `UserAuth.php:364,:77`·`PlanPolicy.php`(GT② B-3) | 구독등급 접근 — 상승검증 아님 |
| 광고 킬스위치 | `AdAdapters.php:22,:36`·`AutoCampaign.php:447`(GT② B-7) | 광고 집행차단 — Runtime Guard 아님 |
| MFA/OTP 게이트 | `UserAuth.php:930`·`AdminMfaGate.jsx`(GT② B-6) | 인증강화 — 지속검증 아님 |

## 5. 판정

- **NOT_CERTIFIED · BLOCKED_PREREQUISITE**: 코드 변경 0. Continuous Validation·만료후 elevation 차단·Static Lint는 **ABSENT(순신규)**. 만료 lazy 게이트·writeGuard는 **재활용(Extend)**.
- **재활용/ABSENT 분리**: 재활용=`index.php:518`·`UserAuth.php:249-284,:304,:989`·writeGuard(ADR §D-7). ABSENT=상승권한 만료차단·지속검증·escalation 감지·영구권한 lint(GT② §2).
- **선행 의존**: Part 1~3-8 인증 후 실 구현. 상위 Session(상승세션 계층)·Grant Ledger 확정 후 그 위에 Runtime Guard 결합. ERRE(3-7) effective 계산과 결합(ADR §4).
