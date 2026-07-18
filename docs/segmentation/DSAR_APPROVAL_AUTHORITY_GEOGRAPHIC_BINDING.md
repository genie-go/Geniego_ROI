# DSAR — Geographic Authority Binding (§21)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §21(1148-1180) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_GEOGRAPHIC_BINDING` 엔티티 | grep **0** — Authority↔지리 바인딩 개념 부재 | `NOT_APPLICABLE`(부재→신설) |
| 지리 축 ① 국가 ISO | `Geo.php:49` `country` = ISO-3166-1 alpha-2 · `:106` IP→`country_code` 페일오버 다중조회 — **IP→ISO→언어 매핑**(광고차단 회피용 서버측 로케일 결정)이지 승인 지리 스코프 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 지리 축 ② TikTok country_code 차원 | 리포트 차원(집계 축)으로 `country_code` 존재(`Connectors.php`·`ChannelSync.php` 9개소) — **분석 차원이지 Authority 지리 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 지리 축 ③ region | `region` 문자열 **3축 병존**(광고 리포트 region·인프라 region·마케팅 region) · **Country→Region 매핑 0**(계층 롤업 부재) | `KEEP_SEPARATE_WITH_REASON` |

★**Authority 지리 스코프 엔티티가 부재하므로 필드 단위 커버는 원천 불가.** 국가/리전 인접 축은 **로케일 결정·리포트 차원**용이며, "이 승인권한이 어느 지역에 유효한가"를 판정하는 축은 없다. `country_code`·`region_id`는 인접 축이 존재하나 승인 지리로 재사용하면 §65 "Wrong Geography Authority" 오판을 유발하므로 `KEEP_SEPARATE_WITH_REASON`.

## 1. 원문 전사 + 판정 — **원문 21종**(필수 필드 14 + Geography Type 7)

### 필수 필드 (14)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | geographic_authority_binding_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | authority_matrix_entry_id | Authority Matrix Entry(§5) 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | geography_type | 승인 지리 유형 축 0 (아래 Type 7종 미시드) | `ABSENT` |
| 4 | region_id | 인접 = `region` 문자열 **3축 병존**(광고/인프라/마케팅) · Country→Region 롤업 0 · **정규화 지리 마스터 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 5 | country_code | 인접 = `Geo.php:49` ISO2 / `:106` IP-geo / TikTok 리포트 차원(`ChannelSync.php` 9) — **로케일·분석 차원이지 Authority 지리 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 6 | territory reference | 준국가 territory 참조 0 | `ABSENT` |
| 7 | include child geography 여부 | 하위 지리 상속 플래그 0 (계층 롤업 자체 부재) | `ABSENT` |
| 8 | exclude geography references | 제외 지리 목록 0 | `ABSENT` |
| 9 | cross-border authority 여부 | 국경 간 승인 허용 플래그 0 | `ABSENT` |
| 10 | legal entity interaction policy | 🔴 Legal Entity 엔티티 자체 부재(§20·`biz_no`/`corp_reg`/`tax_id` grep 0) → 법인-지리 상호작용 정책 원천 불가 | `ABSENT` |
| 11 | valid_from | 인접 = `kr_fee_rule.effective_from`(`Db.php:898`·open-interval·ⓑ §5 FLIP) — 수수료 도메인·지리 바인딩엔 없음 | `LEGACY_ADAPTER` |
| 12 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` 제외·본 회차 실측) | `ABSENT` |
| 13 | status | 인접 = 상태전이 다수·**합법 전이집합 선언 0** | `LEGACY_ADAPTER` |
| 14 | evidence | 정본 = `SecurityAudit::verify():56-68`(ⓑ §5) · 🔴 `menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

### Geography Type (7)

| # | 원문 Type | 현행 대조 | 판정 |
|---|---|---|---|
| 15 | GLOBAL | 전역 승인 지리 레벨 미시드 | `NOT_APPLICABLE` |
| 16 | REGION | 인접 = `region` 3축(광고/인프라/마케팅) 병존이나 정규화 지리 레벨 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 17 | COUNTRY | 인접 = `Geo` ISO2 / TikTok country_code 차원 — 로케일·분석 축이지 Authority 레벨 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 18 | AREA | 대륙/권역 레벨 미시드 | `NOT_APPLICABLE` |
| 19 | TERRITORY | 준국가 territory 레벨 미시드 | `NOT_APPLICABLE` |
| 20 | LOCAL | 도시/로컬 레벨 미시드 | `NOT_APPLICABLE` |
| 21 | CUSTOM | 커스텀 지리 레벨 미시드 | `NOT_APPLICABLE` |

**실측 개수: 21 / 21 전사**(측정기 `--sec=21` = 21 = 필수 14 + Type 7). 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 7 · `ABSENT` 7 · `KEEP_SEPARATE_WITH_REASON` 4 · `LEGACY_ADAPTER` 3.

> 🔴 **커버 0.** Authority 지리 스코프 엔티티가 부재하므로 어떤 필드도 `VALIDATED_LEGACY`가 아니다. `KEEP_SEPARATE_WITH_REASON` 4건(region_id·country_code·REGION·COUNTRY)은 **인접 로케일/분석 축**이지 승인 지리 커버가 아니다 — 재사용 시 §65 "Wrong Geography Authority" 오판 유발. `LEGACY_ADAPTER` 3건(valid_from/status/evidence)은 도메인-무관 인접 자산.

## 2. 규칙

- 🔴 **`Geo`(IP→ISO→언어)와 Authority 지리를 통합하지 마라**(KEEP_SEPARATE_WITH_REASON) — `Geo`는 광고차단 회피용 서버측 로케일 결정 목적(`Geo.php:106`)이고, TikTok `country_code`는 리포트 집계 차원이다. 둘 다 "승인권한이 유효한 지역"의 정본이 아니다. Geographic Binding 신설 시 **정규화 지리 마스터**(GLOBAL⊃REGION⊃COUNTRY⊃AREA⊃TERRITORY⊃LOCAL 계층)를 별도 축으로 세우되, 국가 코드는 `Geo` ISO2를 **참조 사전으로 재사용**하고 재구현하지 마라.
- 🔴 **`region`을 승인 지리로 오독 금지** — 현행 `region`은 3축(광고 리포트·인프라·마케팅)이 **병존**하며 상호 매핑·Country→Region 롤업이 0이다. 이 미정규화 문자열을 Authority region_id로 승격하면 축 혼선을 상속한다. `region_id`는 계층 롤업을 갖춘 신규 축으로.
- 🔴 **`legal entity interaction policy`를 채우려 Legal Entity를 날조 금지** — Legal Entity 엔티티가 §20에서 전면 부재(`biz_no`/`corp_reg`/`tax_id` grep 0)이므로, 지리-법인 상호작용 정책은 **Legal Entity Binding(§20) 신설 이후**에만 정의 가능하다(선행 의존).
- 🔴 **`evidence`를 `menu_audit_log.hash_chain`으로 인용 금지** — 정본은 `SecurityAudit::verify()` 확장([[reference_menu_audit_log_not_tamper_evident]]).
