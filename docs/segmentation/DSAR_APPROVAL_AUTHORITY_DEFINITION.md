# DSAR — Approval Authority Definition (§9 · 필수필드 28)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0 · 문서만**
> ★분할 분모: **28(Definition 필수필드) + 6(Effect) + 13(Assignment Basis) = 47 = §9 측정기 정합**
>   (`node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=9` → **불릿 47**). 본 문서는 그 중 **필수필드 28**을 전사한다. Effect 6 = [DSAR_APPROVAL_AUTHORITY_EFFECT.md](DSAR_APPROVAL_AUTHORITY_EFFECT.md) · Assignment Basis 13 = [DSAR_APPROVAL_AUTHORITY_ASSIGNMENT_BASIS.md](DSAR_APPROVAL_AUTHORITY_ASSIGNMENT_BASIS.md).
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §9(700-733) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · §6 Registry: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_DEFINITION` 엔티티 | `approval_authority_definition`·`authority_definition` grep **0** — Authority 정의 개념 자체 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 유일 "정의된 승인 규칙" | `HIGH_VALUE_KRW=5000000.0` PHP 상수 1건(`Catalog.php:1016`) — **테넌트 설정·버전·effective dating 원천 불가**(ⓑ §1·§4) | `ABSENT` |
| 승인 4경로 | mapping/catalog/action_request/admin_growth = **서로 다른 스키마의 상태머신**(ⓑ §2) — 공통 Definition 상위개념 없음 | `LEGACY_ADAPTER` |
| effect 판별자 저장 | 🔴 승인 결과 = 상태전이(ALLOW 방향)뿐 · **explicit DENY 표현 없음**(`acl_permission` allow-only·ⓑ §6) | `ABSENT`(DENY 축) |
| tenant 식별 | 🔴 **Tenant 마스터 테이블 없음** — `api_key.tenant_id`=FK 없는 VARCHAR(100)(`Db.php:944`)·열거는 `SELECT DISTINCT` 역추론(ⓑ §7) | `BLOCKED_CROSS_TENANT` |

★**엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **필수필드 28**

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_authority_definition_id | 엔티티 부재 → PK 없음(ⓑ §1) | `NOT_APPLICABLE` |
| 2 | approval_authority_registry_id | §6 Registry 자체 부재 → FK 대상 없음([DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md) §0) | `NOT_APPLICABLE` |
| 3 | authority_code | 부재 — Authority 식별 코드 개념 0 | `NOT_APPLICABLE` |
| 4 | authority_name | 부재 | `NOT_APPLICABLE` |
| 5 | authority_description | 부재 | `NOT_APPLICABLE` |
| 6 | authority_type_id | 부재 — Authority Type(§7) 엔티티 0(ⓑ §1) | `NOT_APPLICABLE` |
| 7 | authority_domain_id | 부재 — Authority Domain(§8) 엔티티 0(ⓑ §1) | `NOT_APPLICABLE` |
| 8 | effect | ALLOW=상태전이 인접·🔴 DENY=표현 없음(`acl_permission` allow-only·ⓑ §6) — 판별자 미저장 · 상세 = [DSAR_APPROVAL_AUTHORITY_EFFECT.md](DSAR_APPROVAL_AUTHORITY_EFFECT.md) | `LEGACY_ADAPTER` |
| 9 | assignment basis | OWNER_RELATIONSHIP 판별 실재·나머지 축 ABSENT/직교 — 상세 = [DSAR_APPROVAL_AUTHORITY_ASSIGNMENT_BASIS.md](DSAR_APPROVAL_AUTHORITY_ASSIGNMENT_BASIS.md)(ⓑ §3) | `LEGACY_ADAPTER` |
| 10 | tenant_scope | Cross-tenant 차단 REAL(`index.php:600` `X-Tenant-Id` 덮어쓰기·`:593`) 🔴 **단 strict fail-closed 기본 OFF**(`:585`)·Tenant 마스터 부재(`Db.php:944`·ⓑ §7) | `BLOCKED_CROSS_TENANT` |
| 11 | workspace_scope | 🔴 workspace 엔티티 grep 0 — 워크스페이스 스코프 개념 부재 | `NOT_APPLICABLE` |
| 12 | organization_scope | 조직 기반 Authority 스코프 부재 · `team_role`(owner>manager>member)은 권한축이나 **스코프 아님**·권한 매핑 0(ⓑ §3·§4.2) | `NOT_APPLICABLE` |
| 13 | legal_entity_scope | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0 · Registry 필드 12) | `ABSENT` |
| 14 | geographic_scope | 지리 축 = `Geo`(IP→ISO→언어)·TikTok country_code 차원 — **Authority 지리 스코프 아님**(Registry 필드 13) | `KEEP_SEPARATE_WITH_REASON` |
| 15 | resource_scope | 인접 = `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`) — Authority 리소스 스코프 아님(ⓑ §3 "장식") | `LEGACY_ADAPTER` |
| 16 | action_scope | 인접 = `$roleRank` 판정축 = **HTTP 메서드**(`index.php:568`·write=POST/PUT/PATCH/DELETE) — Authority action 스코프 아님(ⓑ §3) | `LEGACY_ADAPTER` |
| 17 | amount_scope | 🔴 금액축 부재 — 유일 = `HIGH_VALUE_KRW` 상수(`Catalog.php:1016`)가 `requires_approval` boolean만 켬(`:1103-1105`)·저장·버전 0(ⓑ §4) | `ABSENT` |
| 18 | currency_scope | 🔴 통화 스코프 0(`currency_scope`/`allowed_currency` grep 0) · 통화는 변환 전용(`fxToKrw:1749`·ⓑ §4) | `ABSENT` |
| 19 | period_scope | 인접 실재 = `AutoCampaign.php:843-889` 기간 내 누적지출(`periodSpentToDate:855`)+상한집행(`:864` pause) — 단 마케팅 도메인·승인 아님(ⓑ §4 §31 FLIP) | `LEGACY_ADAPTER` |
| 20 | environment_scope | Authority 환경 스코프 부재 · `Db::envLabel()`(prod/demo)은 배포 라벨이지 승인 스코프 아님 | `NOT_APPLICABLE` |
| 21 | approval chain applicability | 🔴 5-3-3-3 Approval Chain **커버 0**(계약 정의뿐·선행 미구현) → 적용성 판정 대상 부재 · 승인 라우트는 실등록이나(`routes.php:436-441`) chain 상위개념 없음(ⓑ §3 §74) | `ABSENT` |
| 22 | delegation eligibility reference | 인접 = 위임상한 자기정합 `DELEGATION_EXCEEDED`(`TeamPermissions.php:639`) — 승인 위임 자격 참조 아님(ⓑ §4.2) | `LEGACY_ADAPTER` |
| 23 | owner | 인접 = `parent_user_id IS NULL` owner 판별 실재(ⓑ §3) — 소유자 개념 有이나 Definition owner 아님 | `LEGACY_ADAPTER` |
| 24 | active_version | 🔴 불변 prev-링크 버전체인 선례 0 — version 6컬럼 전부 하드코딩 태그·`risk_model_registry`는 append+is_deployed이나 UPDATE-mutable(ⓑ §5) | `ABSENT` |
| 25 | valid_from | 인접 = `kr_fee_rule.effective_from`(open-interval·수수료/VAT 도메인·`Db.php:898`·`KrChannel.php:128,140`·ⓑ §5 FLIP) — Authority 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 26 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` invalid_token 제외·ⓑ §5) → 폐구간 신규 | `ABSENT` |
| 27 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·Registry 필드 21) | `LEGACY_ADAPTER` |
| 28 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev_hash·preimage ts·`hash_equals`·ⓑ §5) · 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 28 / 28 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 10(8·9·15·16·19·22·23·25·27·28) · `KEEP_SEPARATE_WITH_REASON` 1(14) · `BLOCKED_CROSS_TENANT` 1(10) · `ABSENT` 6(13·17·18·21·24·26) · `NOT_APPLICABLE` 10(1·2·3·4·5·6·7·11·12·20).

> 🔴 **커버 0.** Definition 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 10건은 **확장 대상 인접 자산**(effect ALLOW=상태전이·resource=acl scopeSql·period=AutoCampaign 페이싱·valid_from=kr_fee_rule·owner=parent owner·evidence=SecurityAudit)이지 커버가 아니다.

## 2. 규칙

- 🔴 **Definition 은 신설이나, 하위 필드의 인접 선례를 재구현하지 마라** — evidence=`SecurityAudit::verify()` 확장 · period=`AutoCampaign` 누적차감 패턴 참조 · valid_from=`kr_fee_rule.effective_from` 질의계층 확장. **중복 엔진 금지.**
- 🔴 **`amount_scope`/`currency_scope` 를 "있음"으로 표기 금지** — 금액축·통화 이력이 저장계층부터 부재다(ⓑ §4). Definition 플래그가 실제 능력을 초과 선언하면 §65 "Amount가 Limit 초과인데 승인 성공" gap 을 구조적으로 유발한다. `HIGH_VALUE_KRW` 상수는 §24 Amount Band 로 승격·상수 은퇴(신규 임계상수 추가 금지).
- 🔴 **`effect` 를 ALLOW-only 로 좁히지 마라** — DENY 표현이 저장계층부터 없어(`acl_permission` allow-only·ⓑ §6) explicit-deny 우선(§4.9)이 구조적으로 불가능하다. 상세 = [DSAR_APPROVAL_AUTHORITY_EFFECT.md](DSAR_APPROVAL_AUTHORITY_EFFECT.md).
- 🔴 **`approval chain applicability` 를 채우기 전 5-3-3-3 Approval Chain 선결** — 현재 커버 0(계약뿐)이므로 Definition 이 존재하지 않는 chain 을 참조하면 dangling reference 가 된다.
- 🔴 **`tenant_scope` 를 느슨한 VARCHAR 로 상속 금지**(§66 Cross-Tenant Binding) — Tenant 마스터 부재(ⓑ §7)를 그대로 물려받지 말고 권위 tenant 참조 선결·strict fail-closed 기본 ON 권장.
