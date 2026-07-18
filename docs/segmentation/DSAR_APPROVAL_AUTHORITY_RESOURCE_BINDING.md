# DSAR — Resource Authority Binding (§22)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §22(1181-1208) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_RESOURCE_BINDING` 엔티티 | grep **0** — Authority↔리소스 바인딩 개념 부재 | `NOT_APPLICABLE`(부재→신설) |
| 마케팅 리소스 엔티티(일부 실재) | `program_id`·`project_id`(`PM/Tasks.php`·`PM/Gantt.php` 등)·`brand_id`·`partner_id`(`PartnerPortal.php`)·`customer_id`·`budget_id`(`PM/Kpi.php`·`ChannelSync.php`) — **마케팅/PM 도메인 엔티티이지 Authority-bound 아님**(승인권한이 이 리소스에 매인다는 표현 0) | `KEEP_SEPARATE_WITH_REASON` |
| 원가/이익 센터 | 🔴 `cost_center`·`profit_center` grep **0**(backend/src 전수·본 회차 실측) — 관리회계 리소스 축 **전면 부재** | `ABSENT` |
| 리소스 소유자 | 인접 = `parent_user_id IS NULL` = top-level owner 판별(`TeamPermissions.php:125-126`) — 계정 소유자이지 리소스 owner type 아님(장식) | `LEGACY_ADAPTER` |

★**Authority↔리소스 바인딩 엔티티가 부재하므로 필드 단위 커버는 원천 불가.** 마케팅 엔티티(program/project/brand/partner/customer/budget)는 실재하나 **승인권한 스코프로 바인딩되어 있지 않다** — 재사용 시 §65 "Wrong Resource Authority" 오판을 유발하므로 `KEEP_SEPARATE_WITH_REASON`. 관리회계 축(cost/profit center)은 저장계층부터 0(`ABSENT`).

## 1. 원문 전사 + 판정 — **원문 19종**(필수 필드 19)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | resource_authority_binding_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | authority_matrix_entry_id | Authority Matrix Entry(§5) 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | resource_type | 승인 리소스 유형 축 0 (Authority Type §7조차 부재) | `ABSENT` |
| 4 | resource_id | Authority-bound 리소스 참조 PK 0 (마케팅 엔티티 PK는 별 도메인) | `ABSENT` |
| 5 | resource owner type | 인접 = `parent_user_id IS NULL` top-level owner(`TeamPermissions.php:125`) — 계정 소유자이지 리소스 owner **유형** 아님 | `LEGACY_ADAPTER` |
| 6 | program_id | 실재(`PM/*` 마케팅/PM 프로그램) — **Authority-bound 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 7 | project_id | 실재(`PM/Tasks.php`·`PM/Gantt.php`) — 프로젝트 관리 엔티티·승인 스코프 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 8 | brand_id | 실재(브랜드 엔티티) — 승인 스코프 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 9 | partner_id | 실재(`PartnerPortal.php`) — 파트너 엔티티·승인 스코프 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 10 | customer_id | 실재(CRM/PG 고객) — 승인 스코프 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 11 | cost_center_id | 🔴 `cost_center` grep 0 — 원가센터 축 전면 부재 | `ABSENT` |
| 12 | profit_center_id | 🔴 `profit_center` grep 0 — 이익센터 축 전면 부재 | `ABSENT` |
| 13 | budget_id | 실재(`PM/Kpi.php`·예산 엔티티 · `AutoCampaign` 광고예산 상한 ⓑ §4) — 예산 엔티티이나 **승인권한 바인딩 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 14 | include child resources 여부 | 하위 리소스 상속 플래그 0 (리소스 계층 롤업 부재) | `ABSENT` |
| 15 | resource status requirements | 리소스 상태 전제조건 축 0 | `ABSENT` |
| 16 | valid_from | 인접 = `kr_fee_rule.effective_from`(`Db.php:898`·open-interval·ⓑ §5 FLIP) — 수수료 도메인·리소스 바인딩엔 없음 | `LEGACY_ADAPTER` |
| 17 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` 제외·본 회차 실측) | `ABSENT` |
| 18 | status | 인접 = 상태전이 다수·**합법 전이집합 선언 0** | `LEGACY_ADAPTER` |
| 19 | evidence | 정본 = `SecurityAudit::verify():56-68`(ⓑ §5) · 🔴 `menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

**실측 개수: 19 / 19 전사**(측정기 `--sec=22` = 19). 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 2 · `ABSENT` 7 · `LEGACY_ADAPTER` 4 · `KEEP_SEPARATE_WITH_REASON` 6.

> 🔴 **커버 0.** Authority↔리소스 바인딩 엔티티가 부재하므로 어떤 필드도 `VALIDATED_LEGACY`가 아니다. `KEEP_SEPARATE_WITH_REASON` 6건(program/project/brand/partner/customer/budget_id)은 **마케팅/PM 도메인 엔티티가 실재하나 승인 스코프로 바인딩되지 않은** 축이다 — 재사용 시 §65 "Wrong Resource Authority" 오판 유발. `LEGACY_ADAPTER` 4건(resource owner type=parent owner·valid_from·status·evidence)은 인접 자산.

## 2. 규칙

- 🔴 **마케팅 엔티티(program/project/brand/partner/customer/budget)를 Authority 리소스로 자동 승격 금지**(KEEP_SEPARATE_WITH_REASON) — 이들은 실재하나 "승인권한이 이 리소스에 매인다"는 표현이 0이다. Resource Binding 신설 시 이 PK들을 **참조(FK)로 재사용**하되, `resource_type` 별 승인 스코프는 신규 축으로 정의하라(엔티티 재구현 금지).
- 🔴 **`cost_center_id`/`profit_center_id`를 "있음"으로 표기 금지** — grep 0으로 관리회계 축이 저장계층부터 부재다. Registry 플래그가 실제 능력을 초과 선언하면 §65 gap을 구조적으로 유발한다(exemplar §2 monetary/currency 규칙과 동형).
- 🔴 **`resource owner type`을 `parent_user_id`로 오매핑 금지** — `parent_user_id IS NULL`은 **계정 top-level owner** 판별(`TeamPermissions.php:125`)이지 리소스 소유자 유형이 아니다. 🔴 `parent_user_id` 재사용은 tenant 해석 전역 붕괴 위험(ⓑ §3) — 의미 변경 금지.
- 🔴 **`budget_id`의 `AutoCampaign` 예산 상한(ⓑ §4)을 승인 authority로 오독 금지** — 이는 마케팅 예산 페이싱(`AutoCampaign:843-889`)이지 승인 워크플로가 아니다. 누적 한도 패턴은 §31 참조용이며 승인 리소스 바인딩과 별 도메인.
- 🔴 **`evidence`를 `menu_audit_log.hash_chain`으로 인용 금지** — 정본은 `SecurityAudit::verify()` 확장.
