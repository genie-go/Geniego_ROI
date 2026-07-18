# DSAR — Approval Delegation Monetary Binding (§18)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §18 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 정의: [DSAR_APPROVAL_DELEGATION_DEFINITION.md](DSAR_APPROVAL_DELEGATION_DEFINITION.md) · 상위 스코프: [DSAR_APPROVAL_DELEGATION_SCOPE.md](DSAR_APPROVAL_DELEGATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=18` → **§18 = 17**(줄범위 1028-1055 · 불릿 17 · 번호 0). 분할 = **필수필드 17**(하위 ENUM 없음 · binding_id/version_id 2 + amount basis/lower bound/lower inclusive/upper bound/upper inclusive 5 + original authority ceiling/delegated ceiling/delegation reduction percentage 3 + cumulative limit policy/utilization attribution policy/period limit reference 3 + valid_from/valid_to/status/evidence 4).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_MONETARY_BINDING` 엔티티 | `delegation_monetary_binding`·`monetary_binding` grep **0** — 위임 금액 바인딩 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 유일 금액 조건 | 🔴 `HIGH_VALUE_KRW = 5000000.0` **상수**(`Catalog.php:1016`) — 승인 게이트 필요여부 **boolean 판정만**(`:1103` `$price >= self::HIGH_VALUE_KRW`) · 금액 밴드/상하한/포함성 저장계층 **없음**(ⓑ §3.2·5-3-3-4) | `LEGACY_ADAPTER`(임계 상수·금액축 아님) |
| Authority Ceiling(원본 상한) | 🔴 **Approval Authority 개념 전면 부재**(5-3-3-4 결론·`authority_matrix`/`amount_band` grep 0) — "원본 Actor 의 금액 한도" 자체가 미정의(ⓑ §3.2) | `BLOCKED_PREREQUISITE`(Authority 선행 부재) |
| 위임 누적/귀속(cumulative·utilization) | 위임 금액 이력 저장계층 부재 · 인접 = `AutoCampaign:843-889` 예산 누적차감(마케팅 도메인·승인 아님·ⓑ §2) | `ABSENT`(위임 금액 도메인 부재) |
| "Delegated Ceiling ≤ Original Ceiling" 집행 | 🔴 원본 Authority Ceiling 이 없어 **위임 상한이 원본을 초과하는지 판정 자체가 불가** — §65 "Amount 가 Limit 초과인데 승인 성공" gap 을 구조적으로 유발 | `BLOCKED_FINANCIAL_CONTROL_RISK` |

★**금액축(amount band) 저장계층과 Authority Ceiling 이 통째로 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이/인접 자산"을 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 17종**(필수 필드 17 · 하위 ENUM 없음)

### 필수 필드 (17)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_monetary_binding_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | Delegation Version(§10) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | amount basis | 🔴 유일 금액조건 = `HIGH_VALUE_KRW` 상수(`Catalog.php:1016`·boolean 게이트 `:1103`) — 금액 기준(basis) 축·저장계층 없음(ⓑ §3.2) | `LEGACY_ADAPTER` |
| 4 | lower bound | 하한 개념 없음 — 단일 임계 `>= 5,000,000 KRW` 하드코딩(`Catalog.php:1103`) | `LEGACY_ADAPTER` |
| 5 | lower inclusive | 경계 포함성 표현 없음(임계 `>=` 하드코딩·밴드 스키마 부재) | `LEGACY_ADAPTER` |
| 6 | upper bound | 상한 개념 없음 — 단일 임계만(밴드 상한 미표현) | `LEGACY_ADAPTER` |
| 7 | upper inclusive | 경계 포함성 표현 없음 | `LEGACY_ADAPTER` |
| 8 | original authority ceiling | 🔴 **Approval Authority 전면 부재**(5-3-3-4·`authority_matrix`/`amount_band` grep 0) — 원본 상한 미정의 → 참조 대상 없음 | `BLOCKED_PREREQUISITE` |
| 9 | delegated ceiling | 🔴 원본 ceiling 부재 → 위임 상한 산출·검증 불가 | `BLOCKED_PREREQUISITE` |
| 10 | delegation reduction percentage | 🔴 원본 대비 축소율은 원본 ceiling 부재로 계산 불가 | `BLOCKED_PREREQUISITE` |
| 11 | cumulative limit policy | 위임 누적 한도 개념 0 · 금액 이력 저장계층 부재(인접 `AutoCampaign` 예산 페이싱은 마케팅 도메인·승인 아님·ⓑ §2) | `ABSENT` |
| 12 | utilization attribution policy | Delegator/Delegate 사용량 귀속 개념 0(§0 원문 "누구의 Utilization" 질문에 답할 계층 없음) | `ABSENT` |
| 13 | period limit reference | 기간별 금액 한도 참조 0 · Delegation Period(§20) 엔티티도 부재 | `ABSENT` |
| 14 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료 도메인·open-interval·`KrChannel.php:102`·ⓑ §2) — Monetary Binding 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 15 | valid_to | 🔴 `valid_to`/`effective_to` grep **0**(오탐 `Onsite.php` invalid_token 제외) → 폐구간 신규 | `ABSENT` |
| 16 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 17 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 17 / 17 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 8 · `BLOCKED_PREREQUISITE` 3 · `ABSENT` 4 · `NOT_APPLICABLE` 2.

> 🔴 **커버 0.** 금액축 저장계층과 Authority Ceiling 이 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 8건(amount basis~upper inclusive 5·valid_from·status·evidence)은 **확장 대상 인접 자산**(HIGH_VALUE_KRW 상수·kr_fee_rule.effective_from·SecurityAudit·상태전이)이지 커버가 아니다 — 이들 5개 amount 필드가 가리키는 실체는 **단일 boolean 임계**일 뿐 금액 밴드가 아니다. `BLOCKED_PREREQUISITE` 3건(original authority ceiling·delegated ceiling·delegation reduction percentage)은 **Approval Authority 신설이 선행**돼야 존재한다.

## 2. 규칙

- 🔴 **원문 §18 "Delegated Ceiling 은 Original Authority Ceiling 을 초과할 수 없다" — 그러나 현행에선 판정 자체가 불가하다.** 스펙은 위임 상한이 원본 권한 상한을 넘지 못하도록 규정하지만, 현행 레포에는 **Approval Authority 개념이 전면 부재**(5-3-3-4·`authority_matrix`/`amount_band` grep 0)하여 "Original Authority Ceiling" 이라는 비교 기준이 없다. 따라서 `original authority ceiling`·`delegated ceiling`·`delegation reduction percentage`=`BLOCKED_PREREQUISITE` — **Authority Foundation(§3.2)이 신설되기 전에는 이 재정 통제 게이트가 존재하지 않는다.** 부재를 "상한 초과 없음(준수)"으로 오독하지 마라(우연한 부재≠준수·§58 ⑦).
- 🔴 **`amount basis`~`upper inclusive` 5필드를 "금액 밴드 있음"으로 표기 금지** — 유일 실체는 `HIGH_VALUE_KRW = 5000000.0` **단일 상수**(`Catalog.php:1016`)이며 `$price >= self::HIGH_VALUE_KRW`(`:1103`)로 **승인 필요여부 boolean 만** 반환한다(밴드·상하한·포함성 스키마 0). Registry/Binding 플래그가 실제 능력(단일 임계)을 초과 선언하면 §65 "Amount 가 Delegated Limit 초과인데 위임 승인 성공"=`BLOCKED_FINANCIAL_CONTROL_RISK` gap 을 구조적으로 유발한다(우연한 임계≠금액 밴드).
- 🔴 **`cumulative limit`/`utilization attribution` 을 `AutoCampaign` 예산 페이싱으로 재구현하지 마라** — `AutoCampaign:843-889` 누적차감은 **마케팅 예산 도메인**이지 승인 위임 금액 귀속이 아니다(KEEP_SEPARATE·중복 엔진 금지). 위임 누적/귀속은 Authority Utilization 계층 신설 후에만 성립하며, 원문 §0 "Delegator 와 Delegate 중 누구의 Utilization 으로 계산되는가" 질문에 답할 저장계층부터 부재다.
- 🔴 **`evidence` 는 `SecurityAudit::verify()` 확장, `valid_to` 는 폐구간 신규** — evidence 정본은 `SecurityAudit::verify():56-68`이며 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]). `valid_to`/`effective_to` grep 0 → 폐구간 신규 도입. `valid_from` 은 `kr_fee_rule.effective_from` 질의계층을 참조하되 수수료 도메인과 혼용 금지.
