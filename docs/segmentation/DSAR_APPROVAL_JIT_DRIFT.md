# DSAR — JIT Access Governance: 상승 드리프트 (APPROVAL_JIT_DRIFT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_DRIFT`(SPEC §21)는 발급된 JIT 상승(elevation)의 **선언된 계약과 실제 상태 간 편차**를 탐지하는 엔티티다. SPEC §21이 명시하는 탐지 5축:

| 드리프트 축 | 의미 | 기준선(선언) vs 관측 |
|---|---|---|
| Duration Drift | 승인 기간 초과 잔존 | Requested End Time(§3) vs 실제 활성 만료 |
| Scope Drift | 승인 scope 밖 접근 | Granted Scope(§18) vs Runtime Scope Usage(§13) |
| Permission Drift | 승인 permission 밖 사용 | Granted Permission(§25) vs API Invocation(§13) |
| Policy Drift | 정책 개정 후 grant 불일치 | Elevation Policy vs 발급 당시 Snapshot(§25) |
| Runtime Drift | 세션 컨텍스트 이탈 | Device/Network/Region(§11) vs Continuous Validation(§12) |

드리프트는 SPEC §14 Auto Revocation·§28 Runtime Guard의 입력 신호이며, Snapshot(§25)을 불변 기준선으로 삼는다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT file:line) |
|---|---|---|
| elevation drift 탐지 엔진 | **ABSENT** | GT② §2 "Guard(만료후 차단)/Static Lint = ABSENT"·"권한상승 risk scoring 0" |
| 불변 기준선(Snapshot 앵커) | PARTIAL(선례) | AccessReview append-only 이력 `AccessReview.php:62-80,:219-222`(GT① §4-E) |
| Duration 기준선(만료시각) | PARTIAL | 세션 만료 게이트 `UserAuth.php:249-284`·impersonation 2h TTL `UserAdmin.php:474`(GT① §4-C/D) |
| grant 기준선 테이블(TTL 축) | **공백** | `acl_permission`에 `expires_at/granted_at/valid_until` 컬럼 부재 `TeamPermissions.php:152`(GT② §2) |
| Runtime 컨텍스트 관측 | ABSENT | Session-entitlement projection 없음·ACL 매요청 DB조회(GT② §2 "Session-bound entitlement projection ABSENT") |

→ **elevation 드리프트 탐지는 순신규(ABSENT)**. 기준선으로 재활용할 append-only 증거 패턴(AccessReview)·시한부 만료 게이트만 실존.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **입력**: 발급 Snapshot(§25: Granted Role/Permission/Scope/Runtime Context/Approval Chain/Risk/Timestamp) = 불변 기준선. 관측 = Runtime Monitoring(§13).
- **출력**: 드리프트 유형(5축)·심각도·탐지시각. 탐지 결과는 SecurityAudit 불변 체인(`SecurityAudit.php:12-53`, GT① §4-F)에 증거로 append.
- **상태**: `NONE / DETECTED / RECONCILED / ESCALATED`. DETECTED → Runtime Guard(§28) 차단·Auto Revocation(§14) 후보.
- **제약**: Tenant Isolation(SPEC §33) 필수 — 드리프트 비교는 테넌트 경계 내에서만. 기준선 Snapshot은 Immutable(§33 Snapshot Integrity). 파생·임의값 금지(AccessReview 파생분류 선례 `AccessReview.php:87-122`, GT① §4-E).
- **선행 의존**: Snapshot(§25)·Grant Ledger(TTL)·Runtime Monitoring(§13) 실 구현 이전에는 비교 기준선 자체가 없어 탐지 불가.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거(GT②) | 분리 사유 |
|---|---|---|
| **model drift** `ModelMonitor.php` | GT② B-8 | ML 모델 드리프트 — elevation drift 아님. 흡수 금지 |
| 마케팅 이상탐지 `AnomalyDetection.php` | GT② B-8·§2 | 마케팅/지표 이상탐지·"권한상승 risk scoring 0" — 상승세션 드리프트 아님 |
| FE 오염가드 `SecurityGuard.js`/`ContaminationGuard.js` | GT② §2 | 테넌트오염/XSS — 만료권한 드리프트 아님 |

→ "drift"라는 어휘가 겹치나 **model drift(ML)**·이상탐지와 별개 관심사. elevation drift는 grant 계약↔runtime 편차이지 모델 성능 편차가 아니다.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정 = ABSENT(순신규)**. elevation 드리프트 탐지 골격(5축)은 grep 0(GT② §2). 재활용 substrate = AccessReview append-only 증거 패턴(`AccessReview.php:62-80`)·SecurityAudit 불변 체인·시한부 만료 게이트 — **흡수가 아닌 확장(Extend)**.
- **최대 공백**: `acl_permission` TTL 컬럼 부재(`TeamPermissions.php:152`)로 Duration/Permission 드리프트의 기준선 자체가 없음(ADR §2.3).
- **선행 의존**: Snapshot(§25)·Grant Ledger·Runtime Monitoring(§13) 실 구현 후에만 드리프트 비교 성립(BLOCKED_PREREQUISITE, ADR §4).
- **NOT_CERTIFIED**: 코드 변경 0. 본 DSAR은 계약 확정용 설계 명세.
