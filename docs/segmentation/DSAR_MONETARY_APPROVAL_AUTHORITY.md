# DSAR — Monetary Approval Authority (§33)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §33(1587-1601) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §1·§4 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Monetary Authority 엔티티 | `monetary_limit`·`monetary_authority`·`approval_limit` grep **0**(ⓑ §1) — 금액축 승인권한 개념 부재 | `NOT_APPLICABLE`(부재→신설) |
| 유일 금액 조건 | `Catalog.php:1016` `HIGH_VALUE_KRW=5000000.0`(PHP 상수) · `:1103` `$price>=HIGH_VALUE_KRW`→`requires_approval=true` — **승인 필요여부 boolean 만 켠다**(ⓑ §1·§4) | `LEGACY_ADAPTER` |
| `required_approvals` 유일 생산자 | `Mapping.php:209` 리터럴 `2` + `Db.php:634` `DEFAULT 2` — 금액·건종류 무관 고정 2(요건모델 아님·상수) | `LEGACY_ADAPTER` |
| 금액 한도+누적차감 | 인접 실재 = `AutoCampaign.php:843-889`(`periodSpentToDate:855`→예산비교→`AdAdapters::pause:864`) — **마케팅 도메인 예산 페이싱 · 승인 워크플로 아님**(ⓑ §4 FLIP) | `LEGACY_ADAPTER` |

★**엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 11종**(측정기 `--sec=33` = 불릿 11 / 번호 0 / 합계 11)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | amount basis | 유일 금액기준 = `HIGH_VALUE_KRW` PHP 상수(`Catalog.php:1016`·`:1103`) — 테넌트 설정·버전·effective dating 원천 불가 · 필요여부 boolean 만 산출 | `LEGACY_ADAPTER` |
| 2 | currency policy | 🔴 `currency_scope`·`allowed_currency` grep **0**(ⓑ §4) · 통화는 변환 전용(`Connectors.php:1749` `fxToKrw`·`:1763` `krwToCurrency`)이며 **환율 저장 이력 부재**(`app_setting` KV 단일행 덮어쓰기 `:1790`) — 허용통화·통화별 승인 정책 없음 | `ABSENT` |
| 3 | per transaction limit | 🔴 `per_transaction`·`per_transaction_limit` grep **0**(ⓑ §1) — 건별 상한 표현 없음 | `ABSENT` |
| 4 | cumulative limit | 인접 실재 = `AutoCampaign.php:843-889` 기간 내 누적 지출(`periodSpentToDate:855`)→상한 도달 시 전 채널 정지(`:864`)+`optimization_log action='budget_cap_pause'`(`:879`) — **마케팅 예산 도메인 · 승인권한 아님**(ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 5 | legal entity | 🔴 Legal Entity 엔티티 0 — `biz_no`/`corp_reg`/`tax_id`/`legal_entity` grep **0**(ⓑ §12·재실증) | `ABSENT` |
| 6 | resource scope | 인접 = `acl_permission` `scopeSql` 데이터-행 필터(`TeamPermissions.php:286`) — 데이터 접근 스코프이지 Authority 리소스 스코프 아님(ⓑ §3) | `LEGACY_ADAPTER` |
| 7 | action scope | 인접 = `acl_permission.ACTIONS`의 `approve` 비트(`TeamPermissions.php:39`·seedOrg 시드) — 🔴 **소비처 0**(비트를 읽어 승인 가부를 판정하는 핸들러 없음 · 장식) · `$roleRank` 판정축은 HTTP 메서드(`index.php:568`)이지 승인 action 아님(ⓑ §3) | `LEGACY_ADAPTER` |
| 8 | effective period | 인접 = `kr_fee_rule.effective_from`(open-interval valid-from · `Db.php:898`) — **수수료/VAT 도메인 한정**(ⓑ §5 FLIP) · 승인/권한 엔티티엔 없음 · `valid_to`/`effective_to` grep 0(폐구간 부재) | `LEGACY_ADAPTER` |
| 9 | utilization policy | 인접 = `AutoCampaign` 누적사용량 대비 상한 집행(`periodSpentToDate:855`→`:856` 비교·§31 FLIP) — 마케팅 예산 소진율 · 승인권한 소진정책 아님 | `LEGACY_ADAPTER` |
| 10 | next approval level | 🔴 **승인 체인 부재** — 5-3-3-3 Approval Chain 커버리지 **0.00%**(BLOCKED_PREREQUISITE) · 다음 승인 단계를 반환하는 함수 0 · 승인 4경로는 전부 단일 상태전이(ⓑ §2·§3) | `BLOCKED_PREREQUISITE` |
| 11 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 포함 해시·`:63` 재계산·`:64` `hash_equals`+prev 교차 · ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]] · verify() 0·preimage ts 소실) | `LEGACY_ADAPTER` |

**실측 개수: 11 / 11 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 7(amount basis·cumulative limit·resource scope·action scope·effective period·utilization policy·evidence) · `ABSENT` 3(currency policy·per transaction limit·legal entity) · `BLOCKED_PREREQUISITE` 1(next approval level).

> 🔴 **커버 0.00%.** Monetary Authority 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 7건은 **확장 대상 인접 자산**(amount basis=HIGH_VALUE_KRW 상수·cumulative/utilization=AutoCampaign 페이싱·effective period=kr_fee_rule·evidence=SecurityAudit)이지 커버가 아니다.

## 2. 규칙

- 🔴 **`amount basis` 를 "구현됨"으로 표기 금지** — `HIGH_VALUE_KRW` 는 **승인 필요여부 boolean 만** 켜는 단일 상수다(`Catalog.php:1103`). Amount Band(§24)로 승격하되 상수를 재사용·복제하지 말고 테넌트별 effective-dated 금액기준으로 신설하라. Registry 플래그가 실제 능력을 초과 선언하면 §65 "Amount가 Limit 초과인데 승인 성공" gap 을 구조적으로 유발한다.
- 🔴 **`currency policy` 를 "있음"으로 표기 금지** — 통화 스코프·과거환율 이력이 저장계층부터 부재다(`fxToKrw` 변환 전용 · `app_setting` KV 덮어쓰기 `Connectors.php:1790`). 통화별 승인 정책을 신설하려면 환율 as-of 저장계층을 선결하라(균질화 금지: 세율 `kr_fee_rule` 은 저장계층 존재·질의계층만 부재이나, 환율은 저장계층부터 부재 — ⓑ §57).
- 🔴 **`cumulative limit`/`utilization policy` 를 `AutoCampaign` 로 재구현하지 마라** — 누적차감·기간 페이싱 패턴(`periodSpentToDate:855`)은 **참조**하되, 마케팅 예산 도메인 로직을 승인권한 축으로 복제하면 중복 엔진이다(§73). 승인 도메인 누적 한도는 별도 Authority Type Policy 로 관리.
- 🔴 **`next approval level` 을 상수로 채우지 마라** — `required_approvals` 는 `Mapping.php:209` 리터럴 `2` + `Db.php:634` `DEFAULT 2` 로 금액·건종류 무관 고정이다. 승인 체인(5-3-3-3 · 커버 0)이 선결되기 전까지 이 필드는 `BLOCKED_PREREQUISITE` 이며, 체인 없이 다음 단계를 산출하면 fake-looks-real 이다(§72-25 `IMPLEMENTATION_STATUS.md:130` 거짓기록 인용 금지).
- 🔴 **`evidence` 는 `SecurityAudit::verify()` 확장** — `menu_audit_log.hash_chain` 은 verify() 부재·preimage ts 소실로 변조증명 불가능한 장식이다([[reference_menu_audit_log_not_tamper_evident]]). 정본 검증기만 인용하라.
