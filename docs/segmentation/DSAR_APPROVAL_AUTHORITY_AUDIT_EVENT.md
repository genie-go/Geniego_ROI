# DSAR — Approval Authority Audit Event (§71)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0 (문서만)**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §71(2884-2919) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md)(§2·§5·§8) · 인접 판정 정본: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=71` → **§71 = 36(bullet 36·number 0)**. ⚠️**정정**: 인계 브리프의 "37"은 육안 오산 — 측정기 authoritative = **36**(2884-2919, 34개 `APPROVAL_AUTHORITY_*` + `RETROACTIVE_AUTHORITY_CORRECTION_RECORDED` + `MANUAL_REVIEW_REQUESTED`).

## 0. 헤더 — 분모 명기

| 측정기 | 섹션 | 줄범위 | 원문 항목 수 | 판정 대상 |
|---|---|---|---|---|
| `--sec=71` | §71 Audit Event (`APPROVAL_AUTHORITY_AUDIT_EVENT`) | 2878-2922 | **36** | 지원 Event 36 |

★**핵심 사실(ⓑ)**: Authority 개념 부재라 **Authority 감사 이벤트를 발행하는 코드가 0**이다(ⓑ §2·§5). 감사 인프라 자체는 실재하나 — **정본 = `SecurityAudit`**(security_audit_log 해시체인·`verify()`) + `pm_audit_log`(PM 액션) — Authority 라이프사이클/런타임 이벤트는 어느 것도 emit 되지 않는다. 따라서 이벤트 대부분 `NOT_APPLICABLE`, 인접 감사패턴 실재분만 `LEGACY_ADAPTER`, 소급정정 이벤트는 집행수단 부재로 `BLOCKED_HISTORICAL_INTEGRITY_RISK`이다. **`VALIDATED_LEGACY` 사용 0(커버 0).**

## 1. 감사 정본·인용금지 (§2)

- **감사 정본 = `SecurityAudit`** — `SecurityAudit::verify():56-68`(tenant 포함 해시 `:27`·prev_hash·created_at 명시 저장 `:29-31`·`hash_equals`+prev 교차 `:64`). 변조/삭제 시 `broken_at` 반환. 무결성 검증 가능한 유일 감사체인.
- **보조 감사 = `pm_audit_log`** — PM 액션 감사 로그(관리 액션 기록). 단 해시체인 검증기 없음.
- 🔴 **`menu_audit_log.hash_chain` 인용 금지** ([[reference_menu_audit_log_not_tamper_evident]]) — `verify()` 호출 0 · preimage ts 소실 → **변조탐지 불가능한 장식**. Authority 감사 이벤트 근거로 절대 인용하지 마라.
- 🔴 **정면 반례(복제 금지)** — `AgencyPortal.php:304,381` `revoked_at=NULL` in-place 소거(ⓑ §5) → as-of 재구성 파괴. Authority 감사 이벤트는 append-only여야 하며 이 패턴을 상속하면 안 된다.

---

## 2. §71 Audit Event — 원문 36 전사 + 판정

원문 verbatim(2884-2919). 접두 `APPROVAL_AUTHORITY_`는 원문 그대로 유지.

| # | 원문 Event (verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | `APPROVAL_AUTHORITY_REGISTRY_CREATED` | Registry 엔티티 부재 → 생성 이벤트 발행 0(ⓑ §1) | `NOT_APPLICABLE` |
| 2 | `APPROVAL_AUTHORITY_TYPE_CREATED` | Authority Type 축 0 | `NOT_APPLICABLE` |
| 3 | `APPROVAL_AUTHORITY_DOMAIN_CREATED` | Authority Domain 축 0 | `NOT_APPLICABLE` |
| 4 | `APPROVAL_AUTHORITY_DEFINITION_CREATED` | Definition 엔티티 0 | `NOT_APPLICABLE` |
| 5 | `APPROVAL_AUTHORITY_VERSION_CREATED` | 불변 버전체인 선례 0(ⓑ §5) | `NOT_APPLICABLE` |
| 6 | `APPROVAL_AUTHORITY_VALIDATED` | Authority 검증 라이프사이클 부재 | `NOT_APPLICABLE` |
| 7 | `APPROVAL_AUTHORITY_APPROVED` | Authority **정의** 승인 라이프사이클 이벤트 — 부재(승인 4경로는 업무요청 결재이지 Authority 정의 승인 아님·ⓑ §2) | `NOT_APPLICABLE` |
| 8 | `APPROVAL_AUTHORITY_ACTIVATED` | active version 활성화 이벤트 부재(ⓑ §5) | `NOT_APPLICABLE` |
| 9 | `APPROVAL_AUTHORITY_SUSPENDED` | 정지 라이프사이클 부재 | `NOT_APPLICABLE` |
| 10 | `APPROVAL_AUTHORITY_MATRIX_CREATED` | 🔴 DOA/Authority Matrix Table 없음(ⓑ §1) | `NOT_APPLICABLE` |
| 11 | `APPROVAL_AUTHORITY_MATRIX_VERSION_CREATED` | 동상 | `NOT_APPLICABLE` |
| 12 | `APPROVAL_AUTHORITY_MATRIX_ENTRY_CREATED` | Matrix Entry 부재 | `NOT_APPLICABLE` |
| 13 | `APPROVAL_AUTHORITY_SUBJECT_BOUND` | Subject Binding 축 부재(ⓑ §3) | `NOT_APPLICABLE` |
| 14 | `APPROVAL_AUTHORITY_ROLE_BOUND` | Role Binding 축 부재(`acl_permission`=장식·ⓑ §3) | `NOT_APPLICABLE` |
| 15 | `APPROVAL_AUTHORITY_POSITION_BOUND` | Position 계층 부재(ⓑ §3) | `NOT_APPLICABLE` |
| 16 | `APPROVAL_AUTHORITY_ORGANIZATION_BOUND` | Organization 바인딩 축 부재 | `NOT_APPLICABLE` |
| 17 | `APPROVAL_AUTHORITY_LEGAL_ENTITY_BOUND` | 🔴 Legal Entity 0(registry doc §1-12) | `NOT_APPLICABLE` |
| 18 | `APPROVAL_AUTHORITY_RESOURCE_BOUND` | Authority 리소스 스코프 아님(ⓑ §3) | `NOT_APPLICABLE` |
| 19 | `APPROVAL_AUTHORITY_ACTION_BOUND` | Action 권한 바인딩 축 부재(ⓑ §3) | `NOT_APPLICABLE` |
| 20 | `APPROVAL_AUTHORITY_THRESHOLD_CREATED` | 임계 축 부재(ⓑ §4) | `NOT_APPLICABLE` |
| 21 | `APPROVAL_AUTHORITY_CURRENCY_SCOPE_CREATED` | 통화 스코프 0(ⓑ §4) | `NOT_APPLICABLE` |
| 22 | `APPROVAL_AUTHORITY_CANDIDATE_CREATED` | §47 Candidate 도출 ABSENT(ⓑ §6) | `NOT_APPLICABLE` |
| 23 | `APPROVAL_AUTHORITY_RESOLUTION_STARTED` | §50/§51 Resolution ABSENT(ⓑ §6) | `NOT_APPLICABLE` |
| 24 | `APPROVAL_AUTHORITY_RESOLVED` | 동상 | `NOT_APPLICABLE` |
| 25 | `APPROVAL_AUTHORITY_DENIED` | 🔴 explicit deny 표현 자체 없음(`acl_permission` allow-only·ⓑ §6) → deny 이벤트 발행 불가 | `NOT_APPLICABLE` |
| 26 | `APPROVAL_AUTHORITY_LIMIT_EXCEEDED` | 인접(마케팅)=`AutoCampaign:864` `budget_cap_pause`(ⓑ §4) — 승인 한도초과 이벤트 아님 | `NOT_APPLICABLE` |
| 27 | `APPROVAL_AUTHORITY_PERIOD_LIMIT_EXCEEDED` | 동상(AutoCampaign 기간지출·마케팅 도메인) | `NOT_APPLICABLE` |
| 28 | `APPROVAL_AUTHORITY_CONFLICT_DETECTED` | §53 충돌 탐지 0(ⓑ §6) | `NOT_APPLICABLE` |
| 29 | `APPROVAL_AUTHORITY_SNAPSHOT_CREATED` | **인접 감사패턴** — `SecurityAudit`가 불변해시 레코드 append(preimage·prev_hash·`verify()`·ⓑ §5). 🔴 단 §55 Actor Auth Snapshot 자체는 ABSENT → 스냅샷 대상 데이터 없음(패턴만 재사용 대상) | `LEGACY_ADAPTER` |
| 30 | `APPROVAL_AUTHORITY_CHANGE_IMPACT_DETECTED` | Authority 변경 영향분석 대상 부재 | `NOT_APPLICABLE` |
| 31 | `APPROVAL_AUTHORITY_REVALIDATION_REQUESTED` | 재검증 트리거 부재(변경 이벤트 없음) | `NOT_APPLICABLE` |
| 32 | `APPROVAL_AUTHORITY_SIMULATION_STARTED` | §61 Simulation 0(registry doc §1-16) | `NOT_APPLICABLE` |
| 33 | `APPROVAL_AUTHORITY_SIMULATION_COMPLETED` | 동상 | `NOT_APPLICABLE` |
| 34 | `APPROVAL_AUTHORITY_DRIFT_DETECTED` | Task/Decision Actor Drift 감지 0(ⓑ §5·§8) | `NOT_APPLICABLE` |
| 35 | `RETROACTIVE_AUTHORITY_CORRECTION_RECORDED` | 🔴 소급정정 집행수단 부재 — `ensureTables`=CREATE만·백필 0(ⓑ §5) · 정면 반례 `AgencyPortal:304,381` in-place 소거. 소급정정을 "기록"할 append-only 이력이 없어 위험(현행 방식 복제 시 historical integrity 파괴) | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |
| 36 | `MANUAL_REVIEW_REQUESTED` | **인접 실재** — 4승인경로 `pending_approval` 수동검토 큐(`Mapping`·`Catalog::approveQueue`·`admin_growth`·ⓑ §2)가 수동검토 진입의 실 발생지 · 단 Authority 이벤트 발행 아님(상태전이) | `LEGACY_ADAPTER` |

**§71 실측 = 36 / 36 전사(측정기 36 일치).** 판정: `LEGACY_ADAPTER` **2**(29·36) · `BLOCKED_HISTORICAL_INTEGRITY_RISK` **1**(35) · `NOT_APPLICABLE` **33** · `VALIDATED_LEGACY` **0**.

---

## 3. 커버리지 (문서3 = §71)

| 판정 | §71(36) |
|---|---|
| `VALIDATED_LEGACY` | **0** |
| `LEGACY_ADAPTER` | **2** |
| `BLOCKED_HISTORICAL_INTEGRITY_RISK` | **1** |
| `NOT_APPLICABLE` | **33** |

> 🔴 **커버 0.00%.** Authority 감사 이벤트를 발행하는 코드가 0이므로 어떤 이벤트도 `VALIDATED_LEGACY`가 아니다. `LEGACY_ADAPTER` 2건(SNAPSHOT_CREATED→SecurityAudit 해시 append 패턴·MANUAL_REVIEW_REQUESTED→pending 큐)은 **재사용 대상 인접 패턴**이지 이벤트 emit 커버가 아니다.

## 4. 규칙

- 🔴 **Authority 감사 이벤트는 `SecurityAudit` 해시체인으로 append-only 발행하라 — 재구현 금지.** 🔴 `menu_audit_log.hash_chain`([[reference_menu_audit_log_not_tamper_evident]])·`AgencyPortal` in-place 소거 패턴은 절대 상속 금지.
- 🔴 **`RETROACTIVE_AUTHORITY_CORRECTION_RECORDED`(BLOCKED)를 in-place 수정으로 구현하지 마라** — 소급정정은 원본을 지우지 않고 **정정 레코드를 추가**해야 하며(as-of 재구성 보존), 이는 append-only 이력 신설이 선행이다. 집행수단 없이 이벤트 stub만 추가 금지.
- 🔴 **`SNAPSHOT_CREATED`(LEGACY_ADAPTER 패턴)를 "스냅샷 있음"으로 오독 금지** — 패턴(`SecurityAudit`)만 재사용 대상이고 §55 Actor Auth Snapshot 데이터 자체는 ABSENT(ⓑ §5). 스냅샷 대상(승인시점 권한/역할/플랜) 캡처 신설이 선행.
- 🔴 **이벤트 36종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 신규 타입 INSERT 예외 선례(5-3-3-1 §8) 반복 금지. 확장 가능 카탈로그로.
