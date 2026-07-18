# DSAR — Approval Delegation Version Status (§10 상태)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §10 상태(793-810) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md) · 상위: [VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) 필드 #30

> **★분할 분모: 필수필드 31 + Version Type 19 + 상태 16 = 66 = §10 측정기 정합** (`measure_spec_denominator.mjs --sec=10` = 66 · 필수필드 31[[VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md)] + Version Type 19[[VERSION_TYPE](DSAR_APPROVAL_DELEGATION_VERSION_TYPE.md)] + status **16**[본 문서]). 본 문서 = 상태 **16종**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 버전 상태머신 | `approval_delegation_version.status` grep **0** — Delegation·버전 엔티티 부재(→[VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) #30·ⓑ §0·§1) | `NOT_APPLICABLE` |
| 합법 전이집합 선언 | 🔴 상태전이 로직은 타 도메인 다수(mapping/catalog/action_request/admin_growth 상태머신·ⓑ §2.2)이나 **합법 전이집합(legal transition set) 선언 0**(전 도메인) | `NOT_APPLICABLE` |
| 수락/승인 단계 분화 | 🔴 ACCEPTANCE_PENDING/APPROVAL_PENDING 전제인 Delegate 수락·위임 승인 단계 미분화 **ABSENT**(승인=진입 게이트 통과자·[VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) #25·#26·ⓑ §2.2) | `NOT_APPLICABLE` |

★**버전 상태머신 부재 → 상태 16종 열거는 무의미.** 16종 전량 `NOT_APPLICABLE`. 상태전이 자체는 타 도메인(승인 4경로)에 다수 존재하나, **합법 전이집합을 선언한 곳이 전무**하므로 버전 상태로 승격할 정본이 없다(§2 규칙). `VALIDATED_LEGACY` 금지(커버 0).

## 1. 원문 전사 + 판정 — **상태 16종**

| # | 원문 상태 | 상태 의미 · 현행 대조(ⓑ) | 판정 |
|---|---|---|---|
| 1 | DRAFT | 버전 초안 · Delegation 버전 엔티티 부재 → 초안 상태 없음(ⓑ §1) | `NOT_APPLICABLE` |
| 2 | VALIDATION_PENDING | 검증 대기 · Delegation 검증 파이프라인 부재(§43 Reconciliation ABSENT·ⓑ §4) | `NOT_APPLICABLE` |
| 3 | VALIDATION_FAILED | 검증 실패 · 상동 — 검증 대상 없음 | `NOT_APPLICABLE` |
| 4 | ACCEPTANCE_PENDING | 수락 대기 · 🔴 Delegate 수락(§23) 개념 0(manager 일방 치환 `TeamPermissions:652`·ⓑ §2.1 표·§2.2) | `NOT_APPLICABLE` |
| 5 | APPROVAL_PENDING | 승인 대기 · 인접 = `catalog` `status='pending_approval'`(`Catalog:2341`)이나 위임 아닌 잡 상태(ⓑ §2.2) | `NOT_APPLICABLE` |
| 6 | APPROVED | 승인됨 · 인접 = 4경로 approved 상태이나 위임 승인 아님(ⓑ §2.2) | `NOT_APPLICABLE` |
| 7 | SCHEDULED | 예약(미래 활성) · 🔴 Future-Dated 예약 0 · Delegation Period(§20) 부재([VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) #22·ⓑ §2.1 표) | `NOT_APPLICABLE` |
| 8 | ACTIVE | 활성 · 버전 활성화 이벤트 부재(activated_at NOT_APPLICABLE·[VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) #27) | `NOT_APPLICABLE` |
| 9 | ACTIVE_WITH_WARNINGS | 경고 동반 활성 · 활성 상태 자체 부재 → 파생 상태 없음 | `NOT_APPLICABLE` |
| 10 | SUSPENDED | 일시 정지 · 버전 상태머신 부재 · Security Suspension=로그인 스로틀(`login_attempt.locked_until`·권한정지 아님·ⓑ §3.4) | `NOT_APPLICABLE` |
| 11 | REVOKED | 철회됨 · 🔴 인접 = `AgencyPortal revoked_at`(수동 철회)이나 버전 상태 아니며 **in-place 소거**(이력 미보존·ⓑ §2.3) | `NOT_APPLICABLE` |
| 12 | EXPIRED | 만료 · 🔴 Delegation Period(§20) 부재 → 만료 개념 없음([VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) #23·ⓑ §2.1 표) | `NOT_APPLICABLE` |
| 13 | SUPERSEDED | 후속 버전에 의해 대체 · 🔴 불변 prev-링크 버전체인 선례 0([VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) #4·ⓑ §2.5) → 대체 관계 표현 불가 | `NOT_APPLICABLE` |
| 14 | RETIRED | 은퇴 · 버전 상태머신 부재 | `NOT_APPLICABLE` |
| 15 | ARCHIVED | 보관 · 상동 | `NOT_APPLICABLE` |
| 16 | BLOCKED | 차단 · 상동 | `NOT_APPLICABLE` |

**실측 개수: 16 / 16 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 16(전량).

> 🔴 **커버 0.** Delegation 버전 상태머신이 부재하므로 16종 상태는 **전이할 실체가 없다**. 승인 4경로에 상태전이가 있으나(ⓑ §2.2) **합법 전이집합 선언이 전무**하여 어떤 것도 버전 상태 정본으로 승격되지 않는다. SUPERSEDED(#13)은 불변 prev-링크 버전체인([VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) #4 ABSENT)이, EXPIRED(#12)·SCHEDULED(#7)은 Delegation Period(§20 ABSENT)가, ACCEPTANCE_PENDING(#4)·APPROVAL_PENDING(#5)은 수락·승인 라이프사이클이 각각 선행되어야 성립한다.

## 2. 규칙

- 🔴 **상태 16종을 선언하되 합법 전이집합을 먼저 정의하라** — 현행 전 도메인에 **합법 전이집합 선언 0**(ⓑ §2.2). 상태 ENUM 만 넣고 전이 규칙이 없으면 임의 상태 점프(예: DRAFT→ACTIVE 직행·ACCEPTANCE_PENDING 우회)를 구조적으로 허용한다.
- 🔴 **SUPERSEDED 는 불변 prev-링크 위에서만 성립한다** — [VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) #4 `previous_version_id` 가 append-only 체인으로 신설되어야 대체 관계가 표현된다. `risk_model_registry` 의 UPDATE-mutable 패턴을 복제하면 대체 이력이 소실된다.
- 🔴 **REVOKED 를 in-place 소거로 구현하지 마라** — 인접 `AgencyPortal revoked_at`(ⓑ §2.3)은 원본을 파괴하는 철회다. REVOKED 상태는 원본 버전을 보존한 채 상태 전이로만 표현하고, `SecurityAudit::verify()` prev-링크 불변성(ⓑ §2.5)을 상속해야 한다(`BLOCKED_HISTORICAL_INTEGRITY_RISK` 회피).
- 🔴 **ACCEPTANCE_PENDING·APPROVAL_PENDING 은 수락·승인 단계 분화를 전제한다** — 현행 Delegate 수락·위임 승인 단계 ABSENT([VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) #25·#26·ⓑ §2.2). §23 Acceptance·§24 Delegation Approval(신설)로 세우지 않으면 두 상태는 APPROVED 와 구별 불가한 장식이 된다.
- 🔴 **SCHEDULED·EXPIRED 는 Delegation Period 저장을 전제한다** — 현행 미래 effective_from 예약·폐구간 effective_to 모두 부재([VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) #22·#23). §20 Delegation Period 신설 없이는 SCHEDULED→ACTIVE→EXPIRED 전이가 불가능하다.
