# DSAR — Approval Authority Registry (§6)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §6 · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_REGISTRY` 엔티티 | `authority_registry`·`approval_authority` grep **0** — Authority 레지스트리 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 인접 "registry" 선례 | `channel_registry`·`risk_model_registry`(`Db.php:448-455`)·`api_key`(권한 저장 `Db.php:944-949`) — **전부 도메인 상이 · Authority 레지스트리 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 유일 승인 인프라 | 4경로(mapping/catalog/action_request/admin_growth) = 상태머신 · **레지스트리 상위개념 없음**(ⓑ §2) | `LEGACY_ADAPTER`(상위 통합 대상 부재) |
| tenant 식별 | 🔴 **Tenant 마스터 테이블 없음** — `api_key.tenant_id`=FK 없는 VARCHAR(100)(`Db.php:944`)·열거는 `SELECT DISTINCT` 역추론(ⓑ §7) | `BLOCKED_CROSS_TENANT`(권위 목록 부재) |

★**엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 36종**(필수 필드 22 + Registry Type 14)

### 필수 필드 (22)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_authority_registry_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | tenant_id | 🔴 Tenant 마스터 부재 · 인접 = 느슨한 `tenant_id VARCHAR`(FK 0·`Db.php:944`) — 격리 강제는 `index.php:600` REAL이나 strict 기본 OFF(`:585`) | `BLOCKED_CROSS_TENANT` |
| 3 | registry_code | 부재 | `NOT_APPLICABLE` |
| 4 | registry_name | 부재 | `NOT_APPLICABLE` |
| 5 | registry_type | 부재 · 아래 Type 14종 열거도 전부 미시드 | `NOT_APPLICABLE` |
| 6 | authoritative_source | 부재 — Authority SoT 미결정(ⓓ ADR 대상) | `NOT_APPLICABLE` |
| 7 | supported domains | 부재 — Authority Domain(§8) 자체 없음 | `NOT_APPLICABLE` |
| 8 | supported authority types | 부재 — Authority Type(§7) 자체 없음 | `NOT_APPLICABLE` |
| 9 | monetary support | 🔴 금액축 부재 — 유일 금액조건 = `HIGH_VALUE_KRW` 상수(승인 필요여부 boolean만·ⓑ §4) | `ABSENT` |
| 10 | multi-currency support | 🔴 통화 스코프 0 · 환율 저장계층 부재(`Connectors.php:1790`·ⓑ §4) | `ABSENT` |
| 11 | cumulative limit support | 인접 실재 = `AutoCampaign:843-889` 예산 누적차감(단 마케팅 도메인·승인 아님·ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 12 | legal entity support | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0) | `ABSENT` |
| 13 | geographic support | 지리 축 = `Geo`(IP→ISO→언어)·TikTok country_code 차원 — **Authority 지리 스코프 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 14 | resource scope support | 인접 = `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`) — Authority 리소스 스코프 아님(장식) | `LEGACY_ADAPTER` |
| 15 | deny rule support | 🔴 explicit deny 표현 없음 — `acl_permission`=allow-only(ⓑ §6) | `ABSENT` |
| 16 | simulation support | 부재 — Authority Simulation(§61) 0 | `NOT_APPLICABLE` |
| 17 | owner | 인접 = `parent_user_id IS NULL` owner 판별(ⓑ §3) — 소유자 개념은 있으나 registry owner 아님 | `LEGACY_ADAPTER` |
| 18 | active version | 🔴 불변 prev-링크 버전체인 선례 0(version 6컬럼 전부 하드코딩 태그·ⓑ §5) | `ABSENT` |
| 19 | valid_from | 인접 = `kr_fee_rule.effective_from`(open-interval·수수료 도메인·ⓑ §5 FLIP) — Authority 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 20 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` invalid_token 제외) → 폐구간 신규 | `ABSENT` |
| 21 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 22 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts 저장·검증기 · ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

### Registry Type (14)

| # | 원문 Type | 현행 대조 | 판정 |
|---|---|---|---|
| 23 | PLATFORM | 인접 = `admin_growth_approval`(플랫폼 전역 큐·tenant 없음·ⓑ §2) | `LEGACY_ADAPTER` |
| 24 | TENANT | 인접 = mapping/catalog 경로(테넌트 스코프) — 단 Authority registry 아님 | `LEGACY_ADAPTER` |
| 25 | LEGAL_ENTITY | 부재 — Legal Entity 0 | `NOT_APPLICABLE` |
| 26 | FINANCE | 부재 — Finance Approval Matrix 0(ⓑ §1) | `NOT_APPLICABLE` |
| 27 | PROCUREMENT | 부재 — Procurement Authority 0 · `po_*`=Price Optimization 오탐 | `NOT_APPLICABLE` |
| 28 | REBATE | 부재 — rebate authority 0 | `NOT_APPLICABLE` |
| 29 | CLAIM | 부재 | `NOT_APPLICABLE` |
| 30 | SETTLEMENT | 부재 — settlement authority 0(정산 파이프라인은 있으나 승인권한 아님) | `NOT_APPLICABLE` |
| 31 | PAYMENT | 부재 — payment authority 0 | `NOT_APPLICABLE` |
| 32 | CONTRACT | 부재 | `NOT_APPLICABLE` |
| 33 | ERP | 부재 — ERP Authority Table 0(ⓑ §1) | `NOT_APPLICABLE` |
| 34 | HRIS | 부재 — `hris`=`hig`hRis`k` 오탐(헤더 레지스트리) | `NOT_APPLICABLE` |
| 35 | POLICY_ENGINE | 인접 = `RuleEngine`(마케팅 세그 DSL·`:24`) — 승인 정책엔진 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 36 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 36 / 36 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 10 · `KEEP_SEPARATE_WITH_REASON` 3 · `BLOCKED_CROSS_TENANT` 1 · `ABSENT` 5 · `NOT_APPLICABLE` 17.

> 🔴 **커버 0.** Registry 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 10건은 **확장 대상 인접 자산**(evidence=SecurityAudit·cumulative=AutoCampaign·valid_from=kr_fee_rule 등)이지 커버가 아니다.

## 2. 규칙

- 🔴 **Registry 는 신설이나, 하위 필드의 인접 선례를 재구현하지 마라** — evidence=`SecurityAudit::verify()` 확장 · cumulative=`AutoCampaign` 페이싱 패턴 참조 · valid_from=`kr_fee_rule.effective_from` 질의계층 확장. **중복 엔진 금지.**
- 🔴 **`tenant_id` 를 느슨한 VARCHAR 로 두지 마라**(§66 Cross-Tenant Binding) — Registry 신설 시 Tenant 마스터 부재 문제(ⓑ §7)를 상속하지 말고 권위 tenant 참조를 선결하라. strict fail-closed 기본 ON 권장.
- 🔴 **`monetary support`/`multi-currency support` 를 "있음"으로 표기 금지** — 금액축·통화 이력이 저장계층부터 부재다(ⓑ §4). Registry 플래그가 실제 능력을 초과 선언하면 §65 "Amount가 Limit 초과인데 승인 성공" gap 을 구조적으로 유발한다.
- 🔴 **Registry Type 14종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 확장 가능 카탈로그로.
