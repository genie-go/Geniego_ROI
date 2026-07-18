# DSAR — Approval Authority Matrix Type (§12 Matrix Type)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §12(881-897) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모 분할(§12 측정기 정합)**: §12 는 두 목록으로 구성 — **필수필드 20([문서1 `DSAR_APPROVAL_AUTHORITY_MATRIX.md`](DSAR_APPROVAL_AUTHORITY_MATRIX.md)) + MATRIX_TYPE 15(본 문서2) = 35**. `measure_spec_denominator.mjs --sec=12` 실측 **35**(불릿 35·번호 0)과 정합. 본 문서는 **Matrix Type 15**만 전사한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Matrix Type ENUM | 🔴 `matrix_type` 컬럼 부재 · 15종 어느 것도 미시드(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| ENTERPRISE 인접 | `admin_growth_approval`(`AdminGrowth::approvalDecide:1313-1344`·DDL `:142-149`) = 플랫폼 전역 큐 · 🔴**tenant_id 없음**(ⓑ §2) | `LEGACY_ADAPTER` |
| TENANT 인접 | mapping_change_request(`Mapping::approve:238-294`)·catalog_writeback_job(`Catalog::approveQueue:2341-2365`) = 테넌트 스코프 경로 · 단 Authority matrix 아님(ⓑ §2) | `LEGACY_ADAPTER` |
| 도메인 엔티티(Legal/Org/Position/Financial/Rebate/…) | 🔴 `biz_no`/`corp_reg`/`tax_id`·position·rebate/claim/settlement authority grep **0**(ⓑ §1·§4) | `NOT_APPLICABLE` |

★**Type 15종은 Matrix 엔티티의 분류 축이나, Matrix 자체가 부재하므로 유형 시드 0.** ENUM 하드코딩 금지 — 확장 가능 카탈로그로(§66·Registry 규칙 참조).

## 1. 원문 전사 + 판정 — **§12 Matrix Type 15**

| # | 원문 Type | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | ENTERPRISE | 인접 = `admin_growth_approval`(플랫폼 전역 큐·tenant_id 없음·`:142-149`·ⓑ §2) · `VALIDATED_LEGACY`(단일 플랫폼 큐·테넌트 격리 N/A) | `LEGACY_ADAPTER` |
| 2 | TENANT | 인접 = mapping/catalog 경로(테넌트 스코프·ⓑ §2) — 단 Authority matrix 아님 | `LEGACY_ADAPTER` |
| 3 | LEGAL_ENTITY | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §4) | `NOT_APPLICABLE` |
| 4 | ORGANIZATION | 조직 계층 마스터 엔티티 부재 — `parent_user_id`=사람 계층 walk 0(ⓑ §3) | `NOT_APPLICABLE` |
| 5 | FUNCTIONAL | 기능/부서 승인권한 축 0 — `department_approval` grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 6 | JOB_LEVEL | 직급 임계 0 — `job_grade_threshold`·`position_threshold` grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 7 | POSITION | 직위 바인딩 축 0(ⓑ §1) | `NOT_APPLICABLE` |
| 8 | FINANCIAL | Finance Approval Matrix 0 — `signature_authority`·`commitment_authority` grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 9 | REBATE | rebate authority 0 — `rebate_limit`·`rebate authority` grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 10 | CLAIM | claim authority 0 — `claim_limit` grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 11 | SETTLEMENT | settlement authority 0(정산 파이프라인은 있으나 승인권한 아님·ⓑ §1) | `NOT_APPLICABLE` |
| 12 | PAYMENT | payment authority 0 — `payment_authority`·`payout_authority` grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 13 | CONTRACT | contract authority 0 — `contract_limit` grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 14 | HYBRID | 복합 유형 — 구성요소 유형(Enterprise/Tenant 외) 대부분 부재로 조합 불가 | `NOT_APPLICABLE` |
| 15 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 15 / 15 전사** (§12 Matrix Type). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2 · `NOT_APPLICABLE` 13.

> 🔴 **커버 0.** Matrix 엔티티 부재로 유형 시드 0. `LEGACY_ADAPTER` 2건(ENTERPRISE=admin_growth·TENANT=mapping/catalog)은 **인접 상태머신**이지 Authority Matrix Type 이 아니다.

## 2. 규칙

- 🔴 **Type 15종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 **확장 가능 카탈로그**로.
- 🔴 **ENTERPRISE↔TENANT 를 admin_growth↔mapping 로 1:1 등치하지 마라** — 스키마가 전부 다르다(`tenant_id`는 admin_growth 에 없고 `required_approvals`는 Mapping 에만·ⓑ §2). 인접 상태머신을 Matrix Type 인스턴스로 흡수하면 무후퇴 위반.
- 🔴 **`NOT_APPLICABLE` 13종을 "미래 시드"로 미리 컬럼 채우지 마라** — 도메인 엔티티(Legal Entity·Position·Rebate·Settlement 등)가 선행 부재(ⓑ §4)이므로 유형만 만들면 참조 무결성 없는 고아 태그가 된다.
