# DSAR — Approval Delegation Geographic Binding (§17)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §17 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 정의: [DSAR_APPROVAL_DELEGATION_DEFINITION.md](DSAR_APPROVAL_DELEGATION_DEFINITION.md) · 상위 스코프: [DSAR_APPROVAL_DELEGATION_SCOPE.md](DSAR_APPROVAL_DELEGATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=17` → **§17 = 13**(줄범위 1006-1027 · 불릿 13 · 번호 0). 분할 = **필수필드 13**(하위 ENUM 없음 · binding_id/version_id 2 + geography_type/region_id/country_code/territory reference/include descendants/exclusions/cross-border 7 + valid_from/valid_to/status/evidence 4).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_GEOGRAPHIC_BINDING` 엔티티 | `delegation_geographic_binding`·`geographic_binding` grep **0** — 위임 지리 바인딩 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 인접 지리 축 | `country_code` = `Geo`(IP→ISO→언어 매핑)·TikTok 채널 `country_code` 차원 · `region` 3축 병존(마케팅/지리/차원) — **분석·현지화 차원이지 Authority 위임 지리 스코프 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 지리 계층(territory/descendants) | 🔴 지리 하위트리(territory·region→country 계층) 개념 0 · 인접 순회는 PM/메뉴 DFS(도메인 상이·ⓑ §2.4) | `ABSENT` |
| cross-border 위임 게이트 | 🔴 국경 간 위임 개념·표현 계층 0 | `ABSENT` |
| exclusion(제외) 표현 | 🔴 `acl_permission`=allow-only — 지리 제외(exclusions) 표현 없음(ⓑ §3.4) | `ABSENT` |

★**Geographic Binding 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 인접 `Geo`/`country_code`/`region` 은 IP→ISO 해석·현지화·채널 차원이며 **Authority 위임 지리 스코프가 아니다**(3축 명명 분리). 아래는 원문 전사이며 `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 13종**(필수 필드 13 · 하위 ENUM 없음)

### 필수 필드 (13)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_geographic_binding_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | Delegation Version(§10) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | geography_type | 🔴 위임 지리 유형(region/country/territory 등 위임 스코프 유형) 개념 부재 | `ABSENT` |
| 4 | region_id | 인접 = `region` 3축 병존(마케팅 지역·`Geo` ISO 지역·TikTok 차원) — **분석/현지화 축이지 Authority 위임 지역 아님**(명명 충돌 주의) | `KEEP_SEPARATE_WITH_REASON` |
| 5 | country_code | 인접 = `country_code`=`Geo`(IP→ISO→언어)·TikTok 채널 country_code 차원 — **위임 지리 스코프 아님**(현지화/채널 차원) | `KEEP_SEPARATE_WITH_REASON` |
| 6 | territory reference | 🔴 territory(영역) 엔티티·참조 0 | `ABSENT` |
| 7 | include descendants 여부 | 🔴 지리 계층(region→country→territory 하위트리) 부재 → 하위 포함 개념 없음 · 인접 DFS(PM/AdminMenu)는 도메인 상이(ⓑ §2.4) | `ABSENT` |
| 8 | exclusions | 🔴 `acl_permission`=allow-only — 지리 제외 표현 없음(`__deny__`=data_scope 센티넬·ⓑ §3.4) | `ABSENT` |
| 9 | cross-border 여부 | 🔴 국경 간(cross-border) 위임 개념·게이트 0 | `ABSENT` |
| 10 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료 도메인·open-interval·ⓑ §3) — Geographic Binding 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 11 | valid_to | 🔴 `valid_to`/`effective_to` grep **0** → 폐구간 신규 | `ABSENT` |
| 12 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 13 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 13 / 13 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 3 · `KEEP_SEPARATE_WITH_REASON` 2 · `ABSENT` 6 · `NOT_APPLICABLE` 2.

> 🔴 **커버 0.** Geographic Binding 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `KEEP_SEPARATE_WITH_REASON` 2건(region_id·country_code)은 인접 `Geo`/TikTok/`region` 3축이지 **Authority 위임 지리가 아니다**(명명만 겹침). `LEGACY_ADAPTER` 3건(valid_from·status·evidence)은 확장 대상 인접 자산이지 커버가 아니다.

## 2. 규칙

- 🔴 **`country_code`/`region_id` 를 인접 `Geo`/TikTok/`region` 축과 혼용하지 마라** — 현행 `country_code` 는 `Geo`(IP→ISO→언어) 해석 결과와 TikTok 채널 차원이고 `region` 은 3축(마케팅·지리·차원) 병존한다. 이들은 **분석/현지화/채널 차원**이지 "이 위임은 특정 Country/Region 승인에만 적용" 을 표현하는 Authority 위임 지리 스코프가 아니다. 위임 지리는 **§9 Definition·§10 Version 하위 불변 스냅샷**으로 별도 신설하고 명명을 분리하라(중복 차원 금지).
- 🔴 **`include descendants` 를 지리 계층 순회로 "있음" 표기 금지** — region→country→territory 하위트리 계층이 부재다. 인접 DFS(`PM/Dependencies.php:79-100`·`AdminMenu::wouldCycle:540-555`)는 PM 태스크/메뉴 도메인이다(ⓑ §2.4). 지리 계층은 territory/region 마스터 신설 후에만 하위 포함이 의미를 갖는다.
- 🔴 **`cross-border`/`exclusions` 를 묵시적 허용으로 처리 금지** — cross-border 위임 게이트가 부재하고 `acl_permission`=allow-only 라 제외 표현이 없다. 신설 시 국경 간 위임은 기본 차단(fail-closed)으로 두고 명시적 지리 제외 표현 계층을 얹어라.
- 🔴 **`evidence` 는 `SecurityAudit::verify()` 확장, `valid_to` 는 폐구간 신규** — evidence 정본은 `SecurityAudit::verify():56-68`이며 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]). `valid_to`/`effective_to` grep 0 → 폐구간 신규 도입.
