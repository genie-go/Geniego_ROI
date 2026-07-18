# DSAR — Approval Authority FX Missing Rate Policy (§27 Missing Rate Policy)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §27(1398-1407) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4·§8 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모 분할(§27 측정기 정합)**: §27 은 두 목록으로 구성 — **반드시 기록할 항목 13([문서3 `DSAR_APPROVAL_AUTHORITY_FX_REFERENCE.md`](DSAR_APPROVAL_AUTHORITY_FX_REFERENCE.md)) + Missing Rate Policy 6(본 문서4) = 19**. `measure_spec_denominator.mjs --sec=27` 실측 **19**(불릿 19·번호 0)과 정합. 본 문서는 **Missing Rate Policy 6**만 전사한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Missing Rate Policy 축 | 🔴 `missing_rate_policy`·환율 결측 처리 분기 grep **0**(ⓑ §4) | `NOT_APPLICABLE`(부재→신설) |
| 환율 이력 저장계층 | 🔴 `app_setting` KV **단일행 덮어쓰기**·`rate_date`/`business_day` 컬럼 0(`Connectors.php:1790`,`:1804-1805`·ⓑ §4:55) → 전영업일/과거환율 대체 **구현 불가** | `ABSENT` |
| 유일 결측 대응 | ⚠️24h TTL 만료 시 **라이브 재조회**(`Connectors.php:1794-1796`·부분) — "최신값 재취득"이지 정책 분기 아님 | `LEGACY_ADAPTER`(부분) |
| §65 Critical Gap | 🔴 "Stale FX Rate로 고액 승인" 실재 프로파일(ⓑ §8:98·high_value 한도 미집행) | `BLOCKED_FINANCIAL_CONTROL_RISK` |

★**Missing Rate Policy 는 환율 결측 시 승인 파이프라인의 분기 규칙이나, 환율 이력계층 자체가 부재하므로 대부분 정책이 구현 원천 불가.** 아래는 원문 전사이며 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **§27 Missing Rate Policy 6**

| # | 원문 정책 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | BLOCK | 부재 — **신규 안전기본값** 후보(결측 시 승인 차단·fail-closed). 현행에 결측 분기 자체 0(ⓑ §4) | `NOT_APPLICABLE` |
| 2 | USE_PREVIOUS_BUSINESS_DAY | 🔴 **구현 불가** — 환율 이력/`rate_date` 컬럼 부재로 "전영업일 환율"을 조회할 저장계층이 없음(`Connectors.php:1790`·ⓑ §4:55) | `ABSENT` |
| 3 | USE_LATEST_AVAILABLE_WITH_WARNING | ⚠️인접 = 24h TTL 재조회(`Connectors.php:1794-1796`·부분)이나, **history-less·latest-wins** 환율 위에서 이 정책을 그대로 켜면 오래된 KV값으로 고액 승인이 자동통과 → §65 "Stale FX Rate로 고액 승인" 직결(ⓑ §8:98) | `BLOCKED_FINANCIAL_CONTROL_RISK` |
| 4 | MANUAL_REVIEW | 부재 — 결측 시 수동검토 라우팅 0(승인 4경로 어디에도 FX 결측 분기 없음·ⓑ §4) | `NOT_APPLICABLE` |
| 5 | FIXED_CONTRACT_RATE_REFERENCE | 부재 — 계약 고정환율 참조축 0(Legal Entity·contract authority 부재·ⓑ §4:53) | `NOT_APPLICABLE` |
| 6 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 6 / 6 전사** (§27 Missing Rate Policy). 커버리지 = **`VALIDATED_LEGACY` 0** · `BLOCKED_FINANCIAL_CONTROL_RISK` 1 · `LEGACY_ADAPTER` 0 · `ABSENT` 1 · `NOT_APPLICABLE` 4.

> 🔴 **커버 0.** Missing Rate Policy 축 부재로 어떤 정책도 `VALIDATED_LEGACY` 가 아니다. USE_PREVIOUS_BUSINESS_DAY 는 환율 이력 부재로 **구현 자체가 불가**(`ABSENT`)하고, USE_LATEST_AVAILABLE_WITH_WARNING 은 현행 latest-wins KV 위에서 **금융통제 리스크**(`BLOCKED_FINANCIAL_CONTROL_RISK` 1건)다.

## 2. 규칙

- 🔴 **원문 준수: "오래된 FX Rate로 고액 Approval을 자동 통과시키지 마라"**(§27:1407) — 이는 §65 "Stale FX Rate로 고액 승인" gap 과 동일 위험이며 현행에 실재한다(ⓑ §8:98). high_value(₩5M+)가 필요여부만 켜고 한도·환율 신선도를 집행하지 않으므로(ⓑ §4:53), USE_LATEST_AVAILABLE_WITH_WARNING 을 **stale 검증 없이** 채택하면 `BLOCKED_FINANCIAL_CONTROL_RISK` 를 구조화한다.
- 🔴 **USE_PREVIOUS_BUSINESS_DAY 를 "구현 예정"으로 표기하지 마라** — 환율 이력 저장계층이 선행 부재(`Connectors.php:1790`·ⓑ §4:55)다. `rate_date`/`business_day` 스키마 신설 없이는 전영업일 조회가 원천 불가이므로, [문서3 §2](DSAR_APPROVAL_AUTHORITY_FX_REFERENCE.md) 의 FX Reference 저장계층 신설이 선결이다.
- 🔴 **24h TTL 재조회를 Missing Rate Policy 로 등치하지 마라** — `Connectors.php:1794-1796` 은 **캐시 신선도 갱신**(최신값 재취득)이지 "결측 시 무엇을 할지"의 정책 분기가 아니다. 부분 능력을 정책 인스턴스로 흡수 금지(fake-looks-real).
- 🔴 **BLOCK 을 신규 안전기본값으로** — 결측·stale 시 기본 fail-closed(차단) 후 MANUAL_REVIEW 승격이 §65 위험을 막는 최소 안전선. 새 임계상수 하드코딩(HIGH_VALUE_KRW 재현·ⓑ §4:53) 금지·확장 가능 정책 카탈로그로.
