# DSAR — Approval Authority Matrix (§12)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §12(854-897) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모 분할(§12 측정기 정합)**: §12 는 두 목록으로 구성 — **필수필드 20(본 문서1) + MATRIX_TYPE 15([문서2 `DSAR_APPROVAL_AUTHORITY_MATRIX_TYPE.md`](DSAR_APPROVAL_AUTHORITY_MATRIX_TYPE.md)) = 35**. `measure_spec_denominator.mjs --sec=12` 실측 **35**(불릿 35·번호 0)과 정합. 본 문서는 **필수필드 20**만 전사한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_MATRIX` 엔티티 | `authority_matrix`·`doa_matrix`·`approval_policy` grep **0**(ⓑ §1 부재목록) — Matrix 개념 통째 부재 | `NOT_APPLICABLE`(부재→신설) |
| Matrix 상위 = Registry | Registry(§6) 자체가 부재 → `approval_authority_registry_id` FK 참조 대상 없음 | `NOT_APPLICABLE` |
| 유일 승인 인프라 | 4경로(mapping/catalog/action_request/admin_growth) = **서로 다른 스키마의 상태머신**(ⓑ §2) · Matrix(도메인×액션×금액 권한격자)로 통합할 "동일 목적 Authority" 없음(ⓑ §0·§73) | `LEGACY_ADAPTER`(인접 상태머신) |
| tenant 식별 | 🔴 **Tenant 마스터 테이블 없음** — `api_key.tenant_id`=FK 없는 VARCHAR(100)(`Db.php:944`)·열거는 `SELECT DISTINCT` 역추론(ⓑ §7) | `BLOCKED_CROSS_TENANT` |
| source/conflict/specificity 정책 | 🔴 후보 도출(§47)·소스 우선순위(§48)·특이성(§52)·충돌 해소(§53/§54) **전 항목 코드 부재**(ⓑ §6) | `ABSENT` |

★**엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **§12 필수필드 20**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_authority_matrix_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_authority_registry_id | Registry(§6) 부재 → FK 참조 대상 없음 | `NOT_APPLICABLE` |
| 3 | tenant_id | 🔴 Tenant 마스터 부재 · 인접 = 느슨한 `tenant_id VARCHAR`(FK 0·`Db.php:944`) — 격리 강제 `index.php:600` REAL이나 strict 기본 OFF(`:585`) | `BLOCKED_CROSS_TENANT` |
| 4 | matrix_code | 부재 | `NOT_APPLICABLE` |
| 5 | matrix_name | 부재 | `NOT_APPLICABLE` |
| 6 | matrix_type | 부재 · Type 15종([문서2](DSAR_APPROVAL_AUTHORITY_MATRIX_TYPE.md)) 전부 미시드 | `NOT_APPLICABLE` |
| 7 | authority_domains | 부재 — Authority Domain(§8) 축 자체 없음(ⓑ §3 결론) | `NOT_APPLICABLE` |
| 8 | authority_types | 부재 — Authority Type(§7) 축 자체 없음(ⓑ §3) | `NOT_APPLICABLE` |
| 9 | default currency | 🔴 통화 스코프 0 · `currency_scope`/`allowed_currency` grep 0 · 통화는 변환 전용(`fxToKrw:1749`·ⓑ §4 §26) | `ABSENT` |
| 10 | fiscal calendar reference | 🔴 회계달력/기간 기준 엔티티 0 — `AutoCampaign` 예산 기간은 롤링윈도(`periodSpentToDate:855`)이지 회계달력 아님(ⓑ §4 §30) | `ABSENT` |
| 11 | source priority policy | 🔴 소스 우선순위(§48) 코드 부재 · "conflict" 히트는 전부 SQL `ON CONFLICT`/ad_schedule precedence(ⓑ §6) | `ABSENT` |
| 12 | conflict policy | 🔴 충돌 탐지/해소(§53/§54) 부재 · explicit-deny>allow(§4.9) 구조 없음(ⓑ §6) | `ABSENT` |
| 13 | specificity policy | 🔴 특이성 해소(§52) 부재 · §4.8 임의 최대한도 선택 금지는 복수 Authority 부재로 무발동(ⓑ §6) | `ABSENT` |
| 14 | cumulative usage support | 인접 실재 = `AutoCampaign:843-889` 예산 누적차감(`periodSpentToDate:855`→상한 도달 `pause:864`) — 단 마케팅 도메인·승인 아님(ⓑ §4 §30/§31 FLIP) | `LEGACY_ADAPTER` |
| 15 | owner | 인접 = `parent_user_id IS NULL` owner 판별(ⓑ §3) — 소유자 개념은 있으나 matrix owner 아님 | `LEGACY_ADAPTER` |
| 16 | active_version | 🔴 불변 prev-링크 버전체인 선례 0 · version 6컬럼 전부 하드코딩/서술 태그(ⓑ §5) | `ABSENT` |
| 17 | valid_from | 인접 = `kr_fee_rule.effective_from`(open-interval·수수료/VAT 도메인·`Db.php:898`·ⓑ §5 FLIP) — 승인/권한 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 18 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` invalid_token 제외·ⓑ §5) → 폐구간 신규 | `ABSENT` |
| 19 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §2) | `LEGACY_ADAPTER` |
| 20 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts 저장·검증기·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 20 / 20 전사** (§12 필수필드). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 5 · `BLOCKED_CROSS_TENANT` 1 · `ABSENT` 7 · `NOT_APPLICABLE` 7.

> 🔴 **커버 0.** Matrix 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 5건은 **확장 대상 인접 자산**(cumulative=AutoCampaign·owner=parent_user_id·valid_from=kr_fee_rule·evidence=SecurityAudit)이지 커버가 아니다.

## 2. 규칙

- 🔴 **Matrix 는 신설이나, 하위 필드의 인접 선례를 재구현하지 마라** — cumulative=`AutoCampaign` 페이싱 패턴 참조 · valid_from=`kr_fee_rule.effective_from` 질의계층 확장 · evidence=`SecurityAudit::verify()` 확장. **중복 엔진 금지.**
- 🔴 **`tenant_id` 를 느슨한 VARCHAR 로 두지 마라**(§66 Cross-Tenant Binding) — Tenant 마스터 부재(ⓑ §7)를 상속하지 말고 권위 tenant 참조를 선결. strict fail-closed 기본 ON 권장.
- 🔴 **`default currency`·`fiscal calendar reference` 를 "있음"으로 표기 금지** — 통화 스코프·회계달력이 저장계층부터 부재다(ⓑ §4). Matrix 플래그가 실제 능력을 초과 선언하면 §65 "Amount가 Limit 초과인데 승인 성공" gap 을 구조적으로 유발한다.
- 🔴 **`source priority`/`conflict`/`specificity policy` 를 스텁 컬럼으로 두지 마라** — §47~§54 Resolution 전 항목이 부재(ⓑ §6)이므로, 정책 필드만 만들고 해소 엔진을 비우면 fake-looks-real(action_request `required_approvals=2` 표시용 하드코딩 선례·ⓑ §9-5)을 재현한다.
