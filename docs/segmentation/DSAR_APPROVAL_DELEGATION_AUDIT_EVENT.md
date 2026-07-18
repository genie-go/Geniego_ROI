# DSAR — Approval Delegation Audit Event Contract (§57)

> EPIC 06-A-01 Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §57 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR(예정): `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`
> **분모 = 측정기 산출**(`measure_spec_denominator.mjs --sec=57` → 31).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_AUDIT_EVENT` 발행 | 🔴 Delegation 감사 이벤트 발행 코드 grep **0** — Delegation 개념 부재로 이벤트 생산자 전무(ⓑ §0·§1) | `NOT_APPLICABLE`(이벤트 발행 코드 0) |
| 감사 패턴 선례 | 🔴 REAL = `SecurityAudit::verify():56-68`(hash_chain 검증 정본)·`pm_audit_log`(결정 감사) — 검증형 감사 substrate 실재(ⓑ §2.5) | `LEGACY_ADAPTER`(감사 write 패턴 인접·일부) |
| 🔴 menu_audit_log.hash_chain | **인용 금지** — 검증 불가능한 장식([[reference_menu_audit_log_not_tamper_evident]]) | 정본 아님 |
| 소급 정정 이벤트 | `RETROACTIVE_DELEGATION_CORRECTION_RECORDED` — 과거 Decision 무결성을 사후 변경할 위험. 반례 = AgencyPortal `revoked_at`(수동 철회만·소급 재기록 경로 0·ⓑ §2.3) | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |

★**감사 이벤트 대상(Delegation) 엔티티가 통째로 부재하므로 어떤 이벤트도 실 발행 경로가 없다.** 아래는 원문 31종 전사(신설 명세)이며 현행 대조는 "발행 코드 부재/감사 substrate 선례/소급 무결성 위험"을 기록한다. **`VALIDATED_LEGACY` 금지**(§58) — 커버 0.

---

## 1. 원문 전사 + 판정 — **원문 31종**

| # | 원문 Audit Event | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | APPROVAL_DELEGATION_REGISTRY_CREATED | Registry 엔티티 부재 → 발행 코드 0 | `NOT_APPLICABLE` |
| 2 | APPROVAL_DELEGATION_TYPE_CREATED | Type 부재 | `NOT_APPLICABLE` |
| 3 | APPROVAL_DELEGATION_DEFINITION_CREATED | Definition 부재 | `NOT_APPLICABLE` |
| 4 | APPROVAL_DELEGATION_VERSION_CREATED | 불변 버전체인 선례 0(ⓑ §2.5) | `NOT_APPLICABLE` |
| 5 | APPROVAL_DELEGATION_VALIDATED | Validation 파이프라인 부재 | `NOT_APPLICABLE` |
| 6 | APPROVAL_DELEGATION_ACCEPTANCE_REQUESTED | 수락 개념 부재(ⓑ §2.1) | `NOT_APPLICABLE` |
| 7 | APPROVAL_DELEGATION_ACCEPTED | 동일 | `NOT_APPLICABLE` |
| 8 | APPROVAL_DELEGATION_DECLINED | 동일 | `NOT_APPLICABLE` |
| 9 | APPROVAL_DELEGATION_APPROVAL_REQUESTED | Approval Foundation 커버 0(ⓑ §3.1) | `NOT_APPLICABLE` |
| 10 | APPROVAL_DELEGATION_APPROVED | 동일 | `NOT_APPLICABLE` |
| 11 | APPROVAL_DELEGATION_REJECTED | 동일 | `NOT_APPLICABLE` |
| 12 | APPROVAL_DELEGATION_SCHEDULED | Scheduled Delegation 부재 | `NOT_APPLICABLE` |
| 13 | APPROVAL_DELEGATION_ACTIVATED | Activation 상태머신 부재 | `NOT_APPLICABLE` |
| 14 | APPROVAL_DELEGATION_SUSPENDED | Suspension 상태 부재(로그인 스로틀은 권한정지 아님·ⓑ §3.4) | `NOT_APPLICABLE` |
| 15 | APPROVAL_DELEGATION_RESUMED | 동일 | `NOT_APPLICABLE` |
| 16 | APPROVAL_DELEGATION_REVOKED | 🔴 `revoke`=토큰/자격 폐기 오탐(ⓑ §2.3)·Delegation revoke 아님 | `NOT_APPLICABLE` |
| 17 | APPROVAL_DELEGATION_EXPIRED | 폐구간 만료 저장계층 부재(`valid_to` grep 0·ⓑ §2.1) | `NOT_APPLICABLE` |
| 18 | APPROVAL_DELEGATION_REDELEGATED | 🔴 재위임 경로 grep 0(ⓑ §2.1) | `NOT_APPLICABLE` |
| 19 | APPROVAL_DELEGATION_CYCLE_DETECTED | Delegation Chain 순환검출 grep 0(PM DFS는 도메인 상이·ⓑ §2.4) | `NOT_APPLICABLE` |
| 20 | APPROVAL_DELEGATION_CONFLICT_DETECTED | Conflict 엔티티 부재 | `NOT_APPLICABLE` |
| 21 | APPROVAL_DELEGATION_CANDIDATE_CREATED | Candidate 엔티티 부재 | `NOT_APPLICABLE` |
| 22 | APPROVAL_DELEGATION_RESOLUTION_STARTED | Resolution 엔티티 부재 | `NOT_APPLICABLE` |
| 23 | APPROVAL_DELEGATION_RESOLVED | 동일 | `NOT_APPLICABLE` |
| 24 | APPROVAL_DELEGATION_SNAPSHOT_CREATED | Delegation Snapshot 0(무결성 패턴=SecurityAudit·§2 참조) | `NOT_APPLICABLE` |
| 25 | APPROVAL_DELEGATION_CHANGE_IMPACT_DETECTED | 버전 변경영향 대상 부재 | `NOT_APPLICABLE` |
| 26 | APPROVAL_DELEGATION_REVALIDATION_REQUESTED | 재검증 트리거 대상 부재 | `NOT_APPLICABLE` |
| 27 | APPROVAL_DELEGATION_SIMULATION_STARTED | Simulation 엔티티 부재 | `NOT_APPLICABLE` |
| 28 | APPROVAL_DELEGATION_SIMULATION_COMPLETED | 동일 | `NOT_APPLICABLE` |
| 29 | APPROVAL_DELEGATION_DRIFT_DETECTED | Reconciliation/Drift 소스(HRIS/Calendar/ERP) 존재조차 안 함(ⓑ §1) | `NOT_APPLICABLE` |
| 30 | RETROACTIVE_DELEGATION_CORRECTION_RECORDED | 🔴 과거 Decision 무결성 사후 변경 위험 — 반례 AgencyPortal `revoked_at`(수동 철회만·소급 재기록 경로 0·ⓑ §2.3) | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |
| 31 | MANUAL_REVIEW_REQUESTED | 수동검토 대상 Delegation 부재 | `NOT_APPLICABLE` |

**실측 개수: 31 / 31 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 30 · `BLOCKED_HISTORICAL_INTEGRITY_RISK` 1(RETROACTIVE_DELEGATION_CORRECTION_RECORDED).

> 🔴 **커버 0.** Delegation 감사 이벤트 발행 코드가 grep 0이므로 어떤 이벤트도 `VALIDATED_LEGACY` 가 아니다. 감사 substrate 선례(SecurityAudit hash-chain + pm_audit_log)는 **재사용 대상 인접 인프라(LEGACY_ADAPTER 일부·§2)**이지 Delegation 이벤트 커버가 아니다 — 이벤트 자체를 발행하는 Delegation 생산자가 전무하다.

## 2. 규칙 — 감사 정본 = SecurityAudit

- 🔴 **감사 정본 = `SecurityAudit::verify():56-68`(hash_chain 검증 정본) + `pm_audit_log`(결정 감사)** — Delegation 감사 이벤트를 신설할 때 새 감사 로그 엔진을 만들지 말고 이 검증형 substrate 를 **확장**하라(중복 엔진 금지·ⓑ §2.5).
- 🔴 **`menu_audit_log.hash_chain` 을 인용/근거로 삼지 마라** — 검증 불가능한 장식이다([[reference_menu_audit_log_not_tamper_evident]]). 감사 무결성 주장은 반드시 `hash_equals`+`prev_hash` 재계산 검증기(SecurityAudit) 위에서만.
- 🔴 **RETROACTIVE_DELEGATION_CORRECTION_RECORDED 는 기본 차단(BLOCKED_HISTORICAL_INTEGRITY_RISK)** — 과거 Decision 시점의 Delegation Version 은 Snapshot 으로 불변 보존(§5.12)돼야 하며, 소급 정정은 **원본을 덮어쓰지 않는 append-only 정정 레코드 + 무결성 해시체인** 하에서만 허용하라. 반례 = AgencyPortal `revoked_at`(수동 철회만·소급 재기록 경로 없음·ⓑ §2.3) — 이 패턴을 소급 변경으로 오용하지 마라.
- 🔴 **30개 NOT_APPLICABLE 이벤트를 "미구현 결함"으로 오판 금지** — Delegation 이벤트 생산자 자체가 부재(§59 "중복 아니라 부재")이므로, 실 발행 경로는 §3 선행조건(Approval/Authority/Org/Legal Entity/Position) + Delegation 엔티티 신설 후 **별도 승인세션**에서만 생긴다.
