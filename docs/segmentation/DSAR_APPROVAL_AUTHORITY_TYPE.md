# DSAR — Approval Authority Type (§7)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §7(602-651) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_TYPE` 엔티티 | `approval_authority_type`·`authority_type` grep **0** — Authority Type 카탈로그 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 유일 금액 승인조건 | `Catalog.php:1016` `HIGH_VALUE_KRW=5000000.0`(PHP 상수) → `:1103-1104` `$price>=HIGH_VALUE_KRW`→`requires_approval=true`·`approval_type='high_value'`(ⓑ §1·§4) — **승인 필요여부 boolean만 · 한도 미집행** | `LEGACY_ADAPTER`(Type 아님) |
| 유일 누적차감 | `AutoCampaign.php:843-889` 예산상한+기간+누적차감(마케팅 도메인·승인 워크플로 아님·ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 승인권한 모드 게이트 | `AdAdapters.php:42-49` `agent_mode`(`'recommend'\|'approval'\|'auto'`)·`agentAutoAllowed:53-55` 자율집행 억제 이진 게이트(ⓑ §2 5번째 축) | `LEGACY_ADAPTER` |
| explicit deny | `acl_permission`=allow-only · DENY 표현 자체 없음(ⓑ §3·§6) | `ABSENT` |

★**Authority Type 엔티티가 통째로 부재하므로 어떤 Type/필드도 커버 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. **인접 자산 존재 ≠ 커버.**

## 1. 원문 전사 + 판정 — **원문 40종**(지원 Type 25 + 필수 필드 15)

### 지원 Type (25)

| # | 원문 Type | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | MONETARY_APPROVAL | 유일 금액조건 = `HIGH_VALUE_KRW` 고액 게이트(`Catalog.php:1016,1103-1104`·boolean만·한도 미집행) — Authority Type 아님 | `LEGACY_ADAPTER` |
| 2 | SPENDING | 부재 — spending authority 0(ⓑ §1) | `NOT_APPLICABLE` |
| 3 | COMMITMENT | 부재 — commitment_authority 0 | `NOT_APPLICABLE` |
| 4 | BUDGET | 인접 = `AutoCampaign.php:843-889` 예산상한+누적차감(마케팅·승인 아님·ⓑ §4) | `LEGACY_ADAPTER` |
| 5 | REBATE | 부재 — `rebate*` grep 0(backend/src 전수·ⓑ §1) | `NOT_APPLICABLE` |
| 6 | CLAIM | 부재 — claim_limit 0 | `NOT_APPLICABLE` |
| 7 | SETTLEMENT | 부재 — 정산 파이프라인은 있으나 승인권한 Type 아님(ⓑ §1) | `NOT_APPLICABLE` |
| 8 | PAYMENT | 부재 — payment_authority 0 | `NOT_APPLICABLE` |
| 9 | PAYOUT | 부재 — payout_authority 0 | `NOT_APPLICABLE` |
| 10 | REFUND | 부재 — refund_limit 0(환불 처리는 있으나 승인권한 Type 아님) | `NOT_APPLICABLE` |
| 11 | CREDIT | 부재 — credit_limit 0 | `NOT_APPLICABLE` |
| 12 | WRITE_OFF | 부재 — writeoff_limit 0 | `NOT_APPLICABLE` |
| 13 | CONTRACT | 부재 — contract_limit 0 | `NOT_APPLICABLE` |
| 14 | PROCUREMENT | 부재 — `po_*`=Price Optimization 오탐(ⓑ §1) | `NOT_APPLICABLE` |
| 15 | DISCOUNT | 부재 — discount_approval grep 0 | `NOT_APPLICABLE` |
| 16 | PRICE_OVERRIDE | 인접 = `Catalog` 가격 writeback + `HIGH_VALUE_KRW` 게이트(`Catalog.php:1103-1104`·`approval_type='high_value'`·1번과 동일 자산) — 가격 변경을 금액으로 게이트하나 override 승인권한 Type 아님 | `LEGACY_ADAPTER` |
| 17 | PROGRAM_ACTIVATION | 부재 — program_limit 0 | `NOT_APPLICABLE` |
| 18 | PROGRAM_MODIFICATION | 부재 | `NOT_APPLICABLE` |
| 19 | CUSTOMER_COMPENSATION | 부재 | `NOT_APPLICABLE` |
| 20 | PARTNER_INCENTIVE | 부재 | `NOT_APPLICABLE` |
| 21 | DATA_ACCESS | 인접 없음 — `acl_permission`=allow-only 데이터-행 필터(`TeamPermissions.php:286` scopeSql)이지 데이터접근 승인권한 Type 아님(ⓑ §3) | `NOT_APPLICABLE` |
| 22 | SECURITY_EXCEPTION | 부재 — `SecurityAudit`=감사증거 저장기(`:56-68`)이지 보안예외 승인 Type 아님 | `NOT_APPLICABLE` |
| 23 | POLICY_EXCEPTION | 부재 — `RuleEngine`=마케팅 세그 DSL(`:24`)·정책예외 승인 아님 | `NOT_APPLICABLE` |
| 24 | MANUAL_OVERRIDE_REFERENCE | 인접 = `agent_mode` `'approval'`(`AdAdapters.php:42-49`)·`agentAutoAllowed:53-55` 자율집행 억제 이진 게이트(ⓑ §2) — override 참조 승인권한 Type 아님 | `LEGACY_ADAPTER` |
| 25 | CUSTOM | 부재 | `NOT_APPLICABLE` |

### 필수 필드 (15)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 26 | approval_authority_type_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 27 | type_code | 부재 | `NOT_APPLICABLE` |
| 28 | type_name | 부재 | `NOT_APPLICABLE` |
| 29 | category | 부재 · 위 Type 25종 category 축 자체 미시드 | `NOT_APPLICABLE` |
| 30 | monetary 여부 | 🔴 금액축 부재 — 유일 금액조건 = `HIGH_VALUE_KRW` 상수(boolean만·`Catalog.php:1016`·ⓑ §4). 능력 부재 | `ABSENT` |
| 31 | cumulative 여부 | 인접 실재 = `AutoCampaign:843-889` 예산 누적차감(마케팅·승인 아님·ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 32 | delegatable reference 여부 | 🔴 delegation_of_authority grep 0 · 인접 = `acl_permission` 위임상한 자기정합(`TeamPermissions.php:639` `DELEGATION_EXCEEDED`·ⓑ §3) — Authority 위임 아님 | `LEGACY_ADAPTER` |
| 33 | legal entity bound 여부 | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §4) | `ABSENT` |
| 34 | currency bound 여부 | 🔴 통화 스코프 0(`currency_scope`/`allowed_currency` 0)·환율 저장계층 부재(`Connectors.php:1790`·ⓑ §4) | `ABSENT` |
| 35 | resource bound 여부 | 인접 = `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`·ⓑ §3) — Authority 리소스 스코프 아님(장식) | `LEGACY_ADAPTER` |
| 36 | action bound 여부 | 인접 = `acl_permission` ACTIONS(`TeamPermissions.php:39` `approve` 등 allow-only)·판정축은 HTTP 메서드(`index.php:568`·ⓑ §3) — Authority action bind 아님 | `LEGACY_ADAPTER` |
| 37 | explicit deny support | 🔴 explicit deny 표현 없음 — `acl_permission`=allow-only(deny 자체가 없음·ⓑ §6) | `ABSENT` |
| 38 | mandatory snapshot 여부 | 🔴 Actor Authorization Snapshot ABSENT — 3경로 다 승인시점 권한/역할/플랜 미보존(`Mapping:285`{user,ts}·ⓑ §5)·as-of 재구성 불가 | `ABSENT` |
| 39 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5) | `LEGACY_ADAPTER` |
| 40 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev_hash·created_at 저장·`hash_equals` 검증기·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 40 / 40 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 10 · `ABSENT` 5 · `NOT_APPLICABLE` 25.

> 🔴 **커버 0.** Authority Type 엔티티가 통째로 부재하므로 어떤 Type/필드도 `VALIDATED_LEGACY`가 아니다. `LEGACY_ADAPTER` 10건(Type 4: MONETARY_APPROVAL·BUDGET·PRICE_OVERRIDE·MANUAL_OVERRIDE_REFERENCE + 필드 6: cumulative·delegatable·resource·action·status·evidence)은 **확장 대상 인접 자산**이지 커버가 아니다. MONETARY_APPROVAL·PRICE_OVERRIDE는 **동일 `HIGH_VALUE_KRW` 게이트**를 공유(중복 자산 아님·같은 boolean 상수).

## 2. 규칙

- 🔴 **Type 카탈로그는 신설이나, 인접 자산을 재구현하지 마라** — cumulative=`AutoCampaign` 페이싱 패턴 참조 · evidence=`SecurityAudit::verify()` 확장 · manual override=`agent_mode` 게이트 확장. **중복 엔진 금지**(§73).
- 🔴 **`monetary 여부`를 "있음"으로 표기 금지** — 금액축·통화 이력이 저장계층부터 부재다(ⓑ §4). `HIGH_VALUE_KRW`는 boolean 게이트일 뿐 한도를 집행하지 않으며(ⓑ §65), Type 플래그가 실제 능력을 초과 선언하면 §65 "Amount가 Limit 초과인데 승인 성공" gap 을 구조적으로 유발한다.
- 🔴 **Type 25종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 `CUSTOM` 포함 확장 가능 카탈로그로.
- 🔴 **PRICE_OVERRIDE 를 `HIGH_VALUE_KRW` 상수로 봉인하지 마라** — high_value 라우팅 갭(ⓑ §4: high_value와 unregister가 동일 경로·동일 권한 `requirePro` 로 결재)은 **별도 승인세션**의 실 결함이다. Type 명세는 이를 §24 Amount Band 로 승격하는 방향만 기록하고 코드는 건드리지 않는다.
