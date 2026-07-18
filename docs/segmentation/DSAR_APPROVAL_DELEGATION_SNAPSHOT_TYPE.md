# DSAR — Approval Delegation Snapshot Type (§39 Snapshot Type)

> EPIC 06-A-01 Delegation Foundation · 289차 13회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §39(1726-1744) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
>
> **분할 분모 명기**: §39 `Delegation Snapshot` 측정기 합계 = **55**(`measure_spec_denominator.mjs --sec=39`: 불릿55·번호0). 본 문서 = §39 **Snapshot Type 열거 17종**만. §39 **필수필드 38 + §40 원칙 14 병합분(=52)**은 별도 문서 [DSAR_APPROVAL_DELEGATION_SNAPSHOT.md](DSAR_APPROVAL_DELEGATION_SNAPSHOT.md). (17 + 38 = 55 ✓)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_SNAPSHOT` 엔티티 | 🔴 **Delegation Snapshot 엔티티 전무** — `delegation_snapshot`·`APPROVAL_DELEGATION_SNAPSHOT` grep **0**(ⓑ §2.5·§0). Snapshot 타입을 붙일 대상 엔티티 자체가 없다 | `ABSENT`(엔티티 부재) |
| 인접 "snapshot" 선례 | `pm_baseline.snapshot_json`(`PM/Enterprise.php:360` — `captured_at`=JSON 키·프로젝트 예산/태스크 스냅샷·Delegation 무관)·`SecurityAudit` 해시체인 로그(`SecurityAudit.php:56-68` — 이벤트 로그·타입 축 없음) | `KEEP_SEPARATE_WITH_REASON`(도메인 상이) |
| Snapshot **타입 축**(어느 시점에 무엇을 동결) | 🔴 부재 — CREATION/APPROVAL/ACTIVATION/DECISION_ATTEMPT/DECISION_COMMIT 등 "동결 시점" 구분자를 저장하는 계층 0(ⓑ §3.4 Actor Auth Snapshot ABSENT) | `ABSENT` |

★**Snapshot 엔티티가 통째로 부재하므로 타입 열거 17종은 전량 미시드다.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. `VALIDATED_LEGACY` 는 원천 불가(cover 0).

## 1. 원문 전사 + 판정 — **Snapshot Type 17종**(§39 열거)

| # | 원문 Snapshot Type | 현행 대조 (능력) | 판정 |
|---|---|---|---|
| 1 | DELEGATION_CREATION | 위임 생성 시점 동결 대상 = Delegation Definition(§9) 부재 → 동결할 상태 없음 | `NOT_APPLICABLE` |
| 2 | DELEGATION_APPROVAL | 위임 승인 시점 동결 = Delegation Approval(§24) 부재 · 승인 4경로는 위임 승인이 아님(ⓑ §2.2) | `NOT_APPLICABLE` |
| 3 | DELEGATION_ACCEPTANCE | 수락 시점 동결 = Delegate 수락(§23) 개념 자체 부재(ⓑ §2.1 "수락 없음") | `NOT_APPLICABLE` |
| 4 | DELEGATION_ACTIVATION | 활성화 시점 동결 = Activation Policy(§9) 부재 | `NOT_APPLICABLE` |
| 5 | CHAIN_RESOLUTION | Chain 해석 시점 동결 = Approval Chain Resolution(§3.1) **BLOCKED_PREREQUISITE**(선행 Chain 부재)·해석 스냅샷 대상 없음 | `NOT_APPLICABLE` |
| 6 | TASK_ASSIGNMENT_REFERENCE | Task 배정 참조 동결 = Assignment Queue는 명시적 차기(06-A-02) 범위·현행 배정 스냅샷 0 | `NOT_APPLICABLE` |
| 7 | TASK_CLAIM_REFERENCE | Claim 시점 동결 = Claim 개념 차기 범위·현행 0 | `NOT_APPLICABLE` |
| 8 | DECISION_ATTEMPT | 결재 시도 시점 동결 = 재검증(5.11) 대상 Delegation 부재 → 시도 스냅샷 없음 | `NOT_APPLICABLE` |
| 9 | DECISION_COMMIT | 🔴 **인접 실재 = 승인 4경로 결재기록**(mapping `Mapping::approve:238-291`·catalog·admin_growth `:1330` decided_by·action_request) — 단 **결재자 identity·시점만 기록·권한(Authority) 동결 없음**(ⓑ §2.2·§3.2 Authority ABSENT). Delegation Version 동결 아님 | `NOT_APPLICABLE` (인접=결재기록·권한 미동결) |
| 10 | DELEGATION_SUSPENSION | 정지 시점 동결 = Delegation Suspension(§30) 부재 | `NOT_APPLICABLE` |
| 11 | DELEGATION_REVOCATION | 철회 시점 동결 = 🔴 인접 `AgencyPortal revoked_at`은 **in-place NULL 소거**(`:304,:381`)로 철회 이력 자체를 파괴(ⓑ §2.3) → 동결은커녕 반례 | `NOT_APPLICABLE` (철회 스냅샷 부재·소거 반례) |
| 12 | DELEGATION_EXPIRATION | 만료 시점 동결 = Automatic Expiration(§20) 부재·`valid_to`/`effective_to` grep 0 | `NOT_APPLICABLE` |
| 13 | DELEGATION_CHANGE | 변경 시점 동결 = Delegation Version(§10) 불변 체인 부재 | `NOT_APPLICABLE` |
| 14 | REDELEGATION | 재위임 시점 동결 = 재위임(§40 Re-delegation Governance) 개념 부재·`redelegation` grep 0 | `NOT_APPLICABLE` |
| 15 | SIMULATION | 시뮬레이션 시점 동결 = Delegation Simulation(§42) 부재 | `NOT_APPLICABLE` |
| 16 | RECONCILIATION | 대사 시점 동결 = Reconciliation(§43) 부재·HRIS/Calendar/ERP 소스 0(ⓑ §1) | `NOT_APPLICABLE` |
| 17 | AUDIT_RECONSTRUCTION | 🔴 **as-of(특정 과거 시점 기준) Delegation 재현 조회 수단 ABSENT** — 어떤 인접 자산도 "결재 당시 Delegation Version"을 되짚지 못함(SecurityAudit는 이벤트 로그일 뿐 as-of 질의 아님·`pm_baseline`은 프로젝트 도메인). 감사 재현 능력 부재 | `ABSENT` (as-of 조회 수단 부재) |

**실측 개수: 17 / 17 전사** (측정기 §39 불릿55 = 필드38 + 타입17 中 타입17). 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 16 · `ABSENT` 1.

> 🔴 **커버 0.** Snapshot 엔티티가 통째로 부재하므로 어떤 Snapshot Type도 `VALIDATED_LEGACY` 가 아니다.
> - `DECISION_COMMIT`(9): 승인 4경로 결재기록은 **인접**이나 결재자 identity·시점만 기록하고 **Authority/Delegation Version 을 동결하지 않는다**(권한 미동결) → 커버 아님.
> - `AUDIT_RECONSTRUCTION`(17): 단순 부재(NOT_APPLICABLE)가 아니라 **감사 재현이라는 능력 자체가 ABSENT** — 신설 시 as-of 질의 계층을 반드시 요구.

## 2. 규칙

- 🔴 **Snapshot Type을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 확장 가능 카탈로그로.
- 🔴 **`DECISION_COMMIT` 을 "결재기록 있음"으로 커버 처리 금지** — 승인 4경로는 결재자·시점만 남기고 **Authority/Delegation Version 을 동결하지 않는다**. Snapshot Type 의 목적(5.11 Decision 시점 재검증·5.12 Version 동결)을 충족하지 못하므로 인접일 뿐이다.
- 🔴 **`AUDIT_RECONSTRUCTION` 은 as-of 질의 계층 신설이 전제** — SecurityAudit 해시체인은 이벤트 무결성이지 "결재 당시 Delegation Version 재현"이 아니다([[reference_menu_audit_log_not_tamper_evident]] 인용 금지 원칙 계승). 감사 재현은 §41 필수필드 문서의 `immutable_hash`(LEGACY_ADAPTER) 확장과 함께 설계하라.
- 🔴 **`DELEGATION_REVOCATION`/`DELEGATION_EXPIRATION` Snapshot 은 `AgencyPortal revoked_at` in-place 소거(`:304,:381`) 안티패턴을 상속하지 마라**(§40 "과거 Snapshot 대체 금지" 반례). 철회/만료는 이력 보존형(불변 append)으로 동결.
