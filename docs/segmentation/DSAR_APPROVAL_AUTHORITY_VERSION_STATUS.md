# DSAR — Approval Authority Version Status (§10 상태)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §10 상태(815-830) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md) · 상위: [VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) 필드 #27

> **★분할 분모: 28+15+14=57 = §10 측정기 정합** (`measure_spec_denominator.mjs --sec=10` = 57 · 필수필드 28[[VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md)] + Version Type 15[[VERSION_TYPE](DSAR_APPROVAL_AUTHORITY_VERSION_TYPE.md)] + status **14**[본 문서]). 본 문서 = 상태 **14종**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 버전 상태머신 | `approval_authority_version.status` grep **0** — 버전 엔티티 부재(→[VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) #27·ⓑ §5) | `NOT_APPLICABLE` |
| 합법 전이집합 선언 | 🔴 상태전이 로직은 타 도메인 다수(mapping/catalog/action_request/admin_growth 상태머신·ⓑ §2)이나 **합법 전이집합(legal transition set) 선언 0**(전 도메인·ⓑ §5) | `NOT_APPLICABLE` |
| Review 단계 분화 | 🔴 REVIEW_PENDING 전제인 검토(reviewer) 단계 미분화 **ABSENT**(승인=진입 게이트 1~2인·[VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) #22·ⓑ §2) | `NOT_APPLICABLE` |

★**버전 상태머신 부재 → 상태 14종 열거는 무의미.** 14종 전량 `NOT_APPLICABLE`. 상태전이 자체는 타 도메인(승인 4경로)에 다수 존재하나, **합법 전이집합을 선언한 곳이 전무**하므로 버전 상태로 승격할 정본이 없다(§2 규칙). `VALIDATED_LEGACY` 금지(커버 0).

## 1. 원문 전사 + 판정 — **상태 14종**

| # | 원문 상태 | 상태 의미 · 현행 대조(ⓑ) | 판정 |
|---|---|---|---|
| 1 | DRAFT | 버전 초안 · 버전 엔티티 부재 → 초안 상태 없음 | `NOT_APPLICABLE` |
| 2 | VALIDATION_PENDING | 검증 대기 · Authority 검증 파이프라인 부재(§63 Reconciliation ABSENT·ⓑ §7) | `NOT_APPLICABLE` |
| 3 | VALIDATION_FAILED | 검증 실패 · 상동 — 검증 대상 없음 | `NOT_APPLICABLE` |
| 4 | REVIEW_PENDING | 검토 대기 · 🔴 Review 단계 미분화(reviewed_by ABSENT·[VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) #22·ⓑ §2) | `NOT_APPLICABLE` |
| 5 | APPROVAL_PENDING | 승인 대기 · 인접 = `catalog` `status='pending_approval'`(`Catalog:2341`)이나 버전 아닌 잡 상태(ⓑ §2) | `NOT_APPLICABLE` |
| 6 | APPROVED | 승인됨 · 인접 = 4경로 approved 상태이나 버전 승인 아님(ⓑ §2) | `NOT_APPLICABLE` |
| 7 | SCHEDULED | 예약(미래 활성) · 🔴 Future-Dated ABSENT(로컬 미래 effective_from 예약 0·ⓑ §5) | `NOT_APPLICABLE` |
| 8 | ACTIVE | 활성 · 버전 활성화 이벤트 부재(activated_at NOT_APPLICABLE·[VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) #24) | `NOT_APPLICABLE` |
| 9 | ACTIVE_WITH_WARNINGS | 경고 동반 활성 · 활성 상태 자체 부재 → 파생 상태 없음 | `NOT_APPLICABLE` |
| 10 | SUPERSEDED | 후속 버전에 의해 대체 · 🔴 불변 prev-링크 버전체인 선례 0([VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) #4·ⓑ §5) → 대체 관계 표현 불가 | `NOT_APPLICABLE` |
| 11 | SUSPENDED | 일시 정지 · 버전 상태머신 부재 | `NOT_APPLICABLE` |
| 12 | RETIRED | 은퇴 · 상동 | `NOT_APPLICABLE` |
| 13 | ARCHIVED | 보관 · 상동 | `NOT_APPLICABLE` |
| 14 | BLOCKED | 차단 · 상동 | `NOT_APPLICABLE` |

**실측 개수: 14 / 14 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 14(전량).

> 🔴 **커버 0.** 버전 상태머신이 부재하므로 14종 상태는 **전이할 실체가 없다**. 승인 4경로에 상태전이가 있으나(ⓑ §2) **합법 전이집합 선언이 전무**하여(ⓑ §5) 어떤 것도 버전 상태 정본으로 승격되지 않는다. SUPERSEDED(#10)은 불변 prev-링크 버전체인([VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) #4 ABSENT)이 선행되어야 표현 가능하다.

## 2. 규칙

- 🔴 **상태 14종을 선언하되 합법 전이집합을 먼저 정의하라** — 현행 전 도메인에 **합법 전이집합 선언 0**(ⓑ §5). 상태 ENUM 만 넣고 전이 규칙이 없으면 임의 상태 점프(예: DRAFT→ACTIVE 직행)를 구조적으로 허용한다(§2 규칙).
- 🔴 **SUPERSEDED 는 불변 prev-링크 위에서만 성립한다** — [VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) #4 `previous_version_id` 가 append-only 체인으로 신설되어야 대체 관계가 표현된다. `risk_model_registry` 의 UPDATE-mutable 패턴(ⓑ §5)을 복제하면 대체 이력이 소실된다.
- 🔴 **REVIEW_PENDING 은 검토 단계 분화를 전제한다** — 현행 reviewed_by ABSENT([VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) #22). 검토자 축을 §47 Candidate(신설)로 세우지 않으면 REVIEW_PENDING 은 APPROVAL_PENDING 과 구별 불가한 장식이 된다.
- 🔴 **SCHEDULED 는 Future-Dated 저장을 전제한다** — 현행 미래 effective_from 예약 0(ⓑ §5). [VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) #19 effective_from 확장 시 미래 예약과 폐구간(#20 effective_to)을 함께 신설해야 SCHEDULED→ACTIVE 전이가 가능하다.
