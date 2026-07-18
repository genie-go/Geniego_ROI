# DSAR — Approval Delegation Currency Binding (§19)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §19 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 인접 금액: [DSAR_APPROVAL_DELEGATION_MONETARY_BINDING.md](DSAR_APPROVAL_DELEGATION_MONETARY_BINDING.md) · 상위 스코프: [DSAR_APPROVAL_DELEGATION_SCOPE.md](DSAR_APPROVAL_DELEGATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=19` → **§19 = 13**(줄범위 1056-1077 · 불릿 13 · 번호 0). 분할 = **필수필드 13**(하위 ENUM 없음 · binding_id/version_id 2 + allowed currencies/prohibited currencies 2 + base currency/conversion policy/fx rate policy/missing rate policy/rounding policy 5 + valid_from/valid_to/status/evidence 4).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_CURRENCY_BINDING` 엔티티 | `delegation_currency_binding`·`currency_binding` grep **0** — 위임 통화 바인딩 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 통화 스코프(허용/차단 통화) | 🔴 위임 통화 화이트/블랙리스트 개념 **0** — 통화는 값 변환용 코드일 뿐 스코프 축이 아님(ⓑ §3.2) | `ABSENT` |
| 통화 변환 계층(인접) | `fxToKrw`(`Connectors.php:1749`·타통화→KRW 변환)·`krwToCurrency`(`:1763`·역방향 표기) — **변환 전용·환율 이력 없음**(KRW 내부 base SSOT) | `KEEP_SEPARATE_WITH_REASON`(변환 도메인·위임 통화 base 아님) |
| FX Rate 정책 | 인접 = `fxRates()` **24h TTL 캐시**(`Connectors.php:1780-1796`·`app_setting.fx_rates_krw`·`$age < 86400`→라이브 API→하드코딩 defaults) | `LEGACY_ADAPTER`(환율 캐시·위임 정책 아님) |
| Missing Rate 정책 | 🔴 미상 통화는 **무변환**(`krwToCurrency:1768` `rate>0 ? ... : $krwAmount`) — 환율 이력/누락 대응 **정책 계층 부재** | `ABSENT`(환율 이력 부재) |

★**통화 스코프 축과 환율 이력 계층이 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이/인접 자산"을 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 13종**(필수 필드 13 · 하위 ENUM 없음)

### 필수 필드 (13)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_currency_binding_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | Delegation Version(§10) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | allowed currencies | 🔴 허용 통화 스코프(화이트리스트) 개념 **0** — 통화는 변환용 코드일 뿐 위임 스코프 축이 아님(ⓑ §3.2) | `ABSENT` |
| 4 | prohibited currencies | 🔴 차단 통화 스코프(블랙리스트) 개념 **0** · `acl_permission`=allow-only(deny 표현 없음·ⓑ §3.4) | `ABSENT` |
| 5 | base currency | 인접 = **KRW 내부 base SSOT**(`fxToKrw`/`krwToCurrency`·`Connectors.php:1749,1763`) — 집계 base 이지 위임 통화 base 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 6 | conversion policy | 인접 = `fxToKrw` 변환 로직(`Connectors.php:1749`·타통화→KRW·이력無) — 위임 통화 변환 정책 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 7 | fx rate policy | 인접 = `fxRates()` **24h TTL 캐시**(`Connectors.php:1780-1796`·`$age < 86400`→라이브→defaults) — Currency Binding 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 8 | missing rate policy | 🔴 미상 통화 무변환(`krwToCurrency:1768`)만 존재 · 환율 **이력/누락 대응 정책 계층 부재** | `ABSENT` |
| 9 | rounding policy | 위임 통화 반올림 정책 표현 0(변환 결과 float 그대로) | `ABSENT` |
| 10 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료 도메인·open-interval·`KrChannel.php:102`·ⓑ §2) — Currency Binding 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 11 | valid_to | 🔴 `valid_to`/`effective_to` grep **0**(오탐 `Onsite.php` invalid_token 제외) → 폐구간 신규 | `ABSENT` |
| 12 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 13 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 13 / 13 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 4 · `KEEP_SEPARATE_WITH_REASON` 2 · `ABSENT` 5 · `NOT_APPLICABLE` 2.

> 🔴 **커버 0.** 통화 스코프 축(allowed/prohibited)과 환율 이력 계층이 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 4건(fx rate policy·valid_from·status·evidence)과 `KEEP_SEPARATE_WITH_REASON` 2건(base currency·conversion policy)은 **확장/참조 대상 인접 자산**(fxRates 캐시·fxToKrw 변환·SecurityAudit)이지 커버가 아니다. `fxToKrw`/`krwToCurrency` 는 **값 변환 전용**이며 위임 통화 스코프를 표현하지 않는다 — 통화를 스코프 축으로 다루려면 신설이 선행돼야 한다.

## 2. 규칙

- 🔴 **`base currency`/`conversion policy` 를 `fxToKrw` 로 대체하지 마라** — `fxToKrw`(`Connectors.php:1749`)·`krwToCurrency`(`:1763`)는 **KRW 내부 base SSOT 로의 값 변환 전용**이며 **환율 이력이 없다**(point-in-time 캐시). 위임 통화 base/변환 정책은 "위임 시점 어떤 환율로 어떤 통화 한도를 적용했는가"를 Snapshot(§41)으로 보존해야 하므로 변환 유틸(KEEP_SEPARATE)과 별개 계층이 필요하다(중복 엔진 금지).
- 🔴 **`allowed`/`prohibited currencies` 를 "통화 코드 존재=스코프 있음"으로 오독 금지** — 레포의 통화는 `fxRates()` defaults(`Connectors.php:1787`)의 **환산 대상 코드 목록**일 뿐 위임 허용/차단 **스코프 축이 아니다**(우연한 열거≠스코프·§58 ⑦·⑧). `prohibited currencies` 는 `acl_permission`=allow-only 라 deny 표현 계층부터 부재다.
- 🔴 **`fx rate policy`/`missing rate policy` — 24h 캐시는 있으나 이력·누락 정책은 없다.** `fxRates()` 는 `app_setting.fx_rates_krw` 를 `$age < 86400`(24h TTL)로 캐시하고 미상 통화는 **무변환**(`krwToCurrency:1768`)한다. 위임 금액 한도가 통화별로 걸릴 때 "환율 조회 실패 시 위임 집행을 어떻게 처리하는가(fail-closed)"를 결정할 `missing rate policy`=`ABSENT` 이므로, 이 게이트가 없는 상태에서 다통화 위임 한도를 신뢰하면 §65 재정 통제 gap 을 유발한다.
- 🔴 **`evidence` 는 `SecurityAudit::verify()` 확장, `valid_to` 는 폐구간 신규** — evidence 정본은 `SecurityAudit::verify():56-68`이며 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]). `valid_to`/`effective_to` grep 0 → 폐구간 신규 도입.
