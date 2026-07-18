# DSAR — Approval Delegation Scope (§11)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §11 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 정의: [DSAR_APPROVAL_DELEGATION_DEFINITION.md](DSAR_APPROVAL_DELEGATION_DEFINITION.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=11` → **§11 = 33**. 분할 = **필수필드 18 + Scope Mode 15 = 33 = §11 측정기**. ★측정기가 육안 추정(17+15=32)을 **18+15=33 으로 정정**했다(`include all …` 10종 + scope_mode 1 + scope_id/version_id 2 + exclusion policy 1 + valid_from/valid_to/status/evidence 4 = 18).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_SCOPE` 엔티티 | `delegation_scope`·`delegation_scope_id` grep **0** — Delegation Scope 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 인접 "scope" 선례 | `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`)·`data_scope` ABAC(`__deny__` 센티넬) — **행 필터·Authority 위임 스코프 아님**(장식·ⓑ §2.1·§3.4) | `LEGACY_ADAPTER` |
| exclusion(제외) 표현 | 🔴 `acl_permission`=**allow-only** — explicit exclusion/deny 표현 없음(ⓑ §3.4) | `ABSENT` |
| scope 대상 축(Authority/Chain/Level) | 🔴 Approval Authority·Chain·Level 전부 부재(§3.1/§3.2 커버 0.00%·5-3-3-3/4) → 스코프 대상 자체 미정의 | `BLOCKED_PREREQUISITE` |
| scope 대상 축(Org/Legal Entity) | 🔴 Organization Unit·Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §3.3) | `ABSENT` |

★**Scope 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 33종**(필수 필드 18 + Scope Mode 15)

### 필수 필드 (18)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_scope_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | Delegation Version(§10) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | scope_mode | 🔴 위임 스코프 개념 부재 — 아래 Mode 15종 전부 미시드 | `ABSENT` |
| 4 | include all authorities 여부 | Authority 부재(§3.2)로 "전 Authority 포함" 플래그 의미 성립 안 됨 | `ABSENT` |
| 5 | include all actions 여부 | Delegation Action Binding(§14) 부재 | `ABSENT` |
| 6 | include all resources 여부 | Resource Registry(§3.3) 부재 | `ABSENT` |
| 7 | include all organizations 여부 | Organization Unit 부재 | `ABSENT` |
| 8 | include all legal entities 여부 | 🔴 Legal Entity 엔티티 0(회사프로필 `business_number` 단일 문자열·법인 아님·ⓑ §3.3) | `ABSENT` |
| 9 | include all geographies 여부 | Geo(IP→ISO) 인접이나 위임 지리 스코프 아님 → 플래그 부재 | `ABSENT` |
| 10 | include all currencies 여부 | 🔴 통화 스코프 0·환율 저장계층 부재(ⓑ §3.2) | `ABSENT` |
| 11 | include all chains 여부 | Approval Chain(§3.1) 커버 0.00% | `ABSENT` |
| 12 | include all stages 여부 | Approval Stage 부재 | `ABSENT` |
| 13 | include all levels 여부 | Approval Chain Level 부재 | `ABSENT` |
| 14 | exclusion policy | 🔴 `acl_permission`=allow-only — 제외(exclusion) 표현 없음(`__deny__`=data_scope 센티넬·ⓑ §3.4) | `ABSENT` |
| 15 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료 도메인·open-interval·ⓑ §3) — Scope 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 16 | valid_to | 🔴 `valid_to`/`effective_to` grep 0 → 폐구간 신규 | `ABSENT` |
| 17 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 18 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

### Scope Mode (15)

| # | 원문 Mode | 현행 대조 | 판정 |
|---|---|---|---|
| 19 | FULL_WITHIN_ORIGINAL_AUTHORITY | 인접 = `acl_permission` 위임상한(`actionsCover:194-198`·부여자 assignable 내에서만·ⓑ §2.1) — 단조성 검증이지 스코프모드 아님(기간/수락 전무) | `KEEP_SEPARATE_WITH_REASON` |
| 20 | PARTIAL | 인접 = acl 위임상한(최소권한 하위집합)·§5.6 기본값 partial — 단 Scope 축소 표현 계층 부재 | `KEEP_SEPARATE_WITH_REASON` |
| 21 | AUTHORITY_SPECIFIC | 🔴 Authority 개념 부재(§3.2·5-3-3-4) → 특정 Authority 지정 불가 | `BLOCKED_PREREQUISITE` |
| 22 | DOMAIN_SPECIFIC | Approval Authority Domain(§3.2) 부재 → 도메인 지정 불가 | `BLOCKED_PREREQUISITE` |
| 23 | RESOURCE_SPECIFIC | 인접 = `acl` scopeSql 행필터(장식·ⓑ §2.1)·Resource Registry 부재 → 위임 리소스 스코프 개념 없음 | `ABSENT` |
| 24 | ACTION_SPECIFIC | Delegation Action Binding(§14) 부재·acl action 인접이나 스코프모드 아님 | `ABSENT` |
| 25 | ORGANIZATION_SPECIFIC | 🔴 Organization Unit 엔티티 0(ⓑ §3.3) | `ABSENT` |
| 26 | LEGAL_ENTITY_SPECIFIC | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §3.3) | `ABSENT` |
| 27 | GEOGRAPHIC_SPECIFIC | 지리 축 = `Geo`(IP→ISO→언어)·TikTok country_code 차원 — 위임 지리 스코프 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 28 | MONETARY_SPECIFIC | 🔴 금액축 부재 — 유일 = `Catalog.php:1016` HIGH_VALUE_KRW 상수(boolean·Authority 금액한도 아님·ⓑ §3.2) | `BLOCKED_PREREQUISITE` |
| 29 | CHAIN_SPECIFIC | 🔴 Approval Chain(§3.1) 커버 0.00%(계약 명세뿐·실 테이블 0) | `BLOCKED_PREREQUISITE` |
| 30 | LEVEL_SPECIFIC | 🔴 Approval Chain Level(§3.1) 부재 | `BLOCKED_PREREQUISITE` |
| 31 | TASK_SPECIFIC_REFERENCE | Approval Task 도메인 미구현(본 블록 비대상·EPIC 06-A-02) | `ABSENT` |
| 32 | HYBRID | 스코프모드 조합 표현 계층 부재 | `ABSENT` |
| 33 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 33 / 33 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 3 · `KEEP_SEPARATE_WITH_REASON` 3 · `BLOCKED_PREREQUISITE` 5 · `ABSENT` 19 · `NOT_APPLICABLE` 3.

> 🔴 **커버 0.** Scope 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 3건(valid_from=kr_fee_rule·status=상태전이·evidence=SecurityAudit)·`KEEP_SEPARATE_WITH_REASON` 3건(FULL/PARTIAL=acl 위임상한·GEOGRAPHIC=Geo)은 **확장/참조 대상 인접 자산**이지 커버가 아니다. `BLOCKED_PREREQUISITE` 5건은 **선행 Authority/Chain(§3.1·§3.2) 신설 전 판정 자체 불가**다.

## 2. 규칙

- 🔴 **Scope 는 신설이나, `acl_permission` scopeSql 을 위임 스코프로 재해석하지 마라** — acl 은 member 절대 권한 행필터(allow-only)이지 Delegator→Delegate 위임 축소가 아니다(ⓑ §2.1). 위임 스코프는 **§9 Definition·§10 Version 하위 불변 스냅샷**으로 신설한다.
- 🔴 **`FULL_WITHIN_ORIGINAL_AUTHORITY` 를 기본값으로 두지 마라** — §5.6 최소권한 원칙상 기본은 `PARTIAL` 이다. acl 위임상한(`actionsCover:194`)은 참조 패턴이되, 기간·수락 없는 영구 상한이므로 그대로 복제 금지.
- 🔴 **`include all …` 10종을 "true 로 채워 광범위 위임" 하지 마라** — 대상 축(Authority/Chain/Level/Org/Legal Entity)이 저장계층부터 부재다. include-all 은 대상 레지스트리 신설 후에만 의미가 생기며, 부재 상태에서 true 는 §5.2 "Original Authority 초과" 게이트 붕괴를 유발한다.
- 🔴 **`AUTHORITY_SPECIFIC`/`MONETARY_SPECIFIC`/`CHAIN_SPECIFIC`/`LEVEL_SPECIFIC` 을 "구현됨"으로 표기 금지** — 5종 전부 `BLOCKED_PREREQUISITE`. 선행 Authority Foundation(§3.2)·Approval Chain(§3.1) 신설이 **선행**돼야 스코프 지정이 가능하다.
- 🔴 **`exclusion policy` 를 acl deny 로 표현하려 하지 마라** — acl 은 allow-only(`__deny__`=data_scope fail-closed 센티넬)다. 위임 제외(특정 Action/Resource/Legal Entity 배제)는 신설 표현 계층이 필요하며, §5.6 "Payment Release 권한은 위임에서 제외" 같은 명시 배제가 여기에 얹힌다.
