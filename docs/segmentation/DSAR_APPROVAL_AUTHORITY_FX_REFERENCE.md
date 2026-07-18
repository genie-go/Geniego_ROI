# DSAR — Approval Authority FX Reference (§27 반드시 기록할 항목)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §27(1378-1396) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모 분할(§27 측정기 정합)**: §27 은 두 목록으로 구성 — **반드시 기록할 항목 13(본 문서3) + Missing Rate Policy 6([문서4 `DSAR_APPROVAL_AUTHORITY_FX_MISSING_RATE_POLICY.md`](DSAR_APPROVAL_AUTHORITY_FX_MISSING_RATE_POLICY.md)) = 19**. `measure_spec_denominator.mjs --sec=27` 실측 **19**(불릿 19·번호 0)과 정합. 본 문서는 **반드시 기록할 항목 13**만 전사한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Canonical FX Rate Service | 인접 = `fxToKrw`(`Connectors.php:1749`)·`krwToCurrency`(`:1763`) — 전 통화→KRW 변환 유틸(ⓑ §4:54) | `LEGACY_ADAPTER` |
| 환율 저장계층 | 🔴 `app_setting` KV **단일행 덮어쓰기**(`Connectors.php:1790`,`:1804-1805`)·`rate_date`/`business_day` 컬럼 **0**(ⓑ §4:55) → 과거환율/as-of 조회 원천 불가 | `ABSENT` |
| 신선도 가드 | ⚠️**FLIP**: `Connectors.php:1794-1796` **24h TTL**(`$age<86400` 만료 시 라이브 재조회) 실재 — "완전 무방비" 아님(ⓑ §4:55·§9:109) · 단 과거환율 조회는 여전 불가 | `LEGACY_ADAPTER`(부분) |
| conversion hash 앵커 | 해시 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·검증기·ⓑ §5:70) · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

★**FX Reference 레코드(변환 1건당 감사 기록) 엔티티가 부재하므로 필드 단위 커버는 원천 불가.** 변환 **행위**는 `fxToKrw`로 실재하나(입력 통화·rate·금액이 런타임에 존재), 이를 **영속 레코드로 남기는 계층이 없다.** 아래는 원문 전사이며 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **§27 반드시 기록할 항목 13**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | source currency | 인접 = `fxToKrw` 입력 통화(`Connectors.php:1749`) — 변환 입력은 실재·미영속(ⓑ §4:54) | `LEGACY_ADAPTER` |
| 2 | target currency | 인접 = **KRW 고정**(`fxToKrw`가 전 통화→KRW·`:1749`) — 대상통화 설정축은 아님 | `LEGACY_ADAPTER` |
| 3 | rate | 인접 = `fxToKrw`가 적용하는 환율값(`app_setting` KV·`:1790`) — 변환은 됨·이력無 | `LEGACY_ADAPTER` |
| 4 | rate type | 🔴 spot/forward/contract 구분 0 — 단일 환율값만 저장(ⓑ §4:55) | `ABSENT` |
| 5 | rate source | 🔴 변환 1건당 출처(provider) 메타 미기록 — KV 단일행에 값만(`:1804-1805`) | `ABSENT` |
| 6 | rate date | 🔴 `rate_date`/`business_day` 컬럼 **0** — 저장계층 부재로 기록 원천 불가(`Connectors.php:1790`·ⓑ §4:55) | `ABSENT` |
| 7 | retrieval timestamp | 🔴 변환 1건당 조회 시각 미기록 — 24h TTL age는 **캐시 갱신용 단일행**(덮어쓰기·`:1794-1796`)이지 per-conversion 기록 아님 | `ABSENT` |
| 8 | rounding | 🔴 반올림 규칙/자릿수 미기록 — PHP 기본 부동소수 변환(ⓑ §4:54) | `ABSENT` |
| 9 | original amount | 인접 = `fxToKrw` 입력 금액 — 런타임 실재·미영속(변환 감사 레코드 없음) | `LEGACY_ADAPTER` |
| 10 | converted amount | 인접 = `fxToKrw` 반환 KRW 값 — 런타임 실재·미영속 | `LEGACY_ADAPTER` |
| 11 | conversion hash | 인접 = 해시 정본 `SecurityAudit::verify():56-68`(ⓑ §5:70) — 🔴`menu_audit_log.hash_chain` 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |
| 12 | stale rate 여부 | ⚠️인접 = 24h TTL 신선도 가드(`Connectors.php:1794-1796`·부분)·만료 시 라이브 재조회 — stale **플래그로 기록**은 안 함(ⓑ §4:55·§9:109) | `LEGACY_ADAPTER` |
| 13 | fallback 여부 | 🔴 fallback(과거환율·전영업일 대체) 플래그 미기록 — 환율 이력 부재로 fallback 대상 자체 없음(ⓑ §4:55) | `ABSENT` |

**실측 개수: 13 / 13 전사** (§27 반드시 기록할 항목). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 7 · `ABSENT` 6.

> 🔴 **커버 0.** FX Reference 레코드 엔티티 부재로 어떤 항목도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 7건(source/target/rate·original/converted amount·conversion hash·stale 여부)은 **변환 행위·해시 정본·TTL 가드가 실재**하나 **per-conversion 감사 레코드로 영속되지 않는다**. `ABSENT` 6건(rate type·rate source·rate date·retrieval timestamp·rounding·fallback)은 **저장계층부터 신설** 대상이다.

## 2. 규칙

- 🔴 **FX Provider 를 신설하지 마라** — 원문(§27:1380) "이번 단계에서는 FX Provider 자체를 구축하지 말고 기존 Canonical FX Rate Service를 참조한다." 정본 = `fxToKrw`(`Connectors.php:1749`) 확장. **중복 환율 엔진 금지.**
- 🔴 **rate date 신설이 선행이다** — `rate_date`/`business_day` 저장계층이 부재(`Connectors.php:1790`·ⓑ §4:55)하므로 as-of 환율·전영업일 정책은 **스키마 신설 없이는 구현 불가**. FX Reference 레코드 테이블(변환 1건당 append)을 먼저 세운 뒤 필드를 채워라. `app_setting` KV 덮어쓰기(`:1804-1805`)를 이력계층으로 오용 금지.
- 🔴 **conversion hash 를 `menu_audit_log.hash_chain` 로 채우지 마라** — verify() 0·preimage ts 소실로 검증 불가한 장식이다([[reference_menu_audit_log_not_tamper_evident]]). 정본은 `SecurityAudit::verify()` 확장(ⓑ §5:70).
- 🔴 **stale rate 여부 를 "완전 무방비"로도, "완비"로도 서술 금지** — 24h TTL 가드(`:1794-1796`)는 **부분** 신선도만 보장(만료 시 라이브 재조회)하며 **과거환율 조회·stale 플래그 기록은 못한다**(ⓑ §9:109 FLIP). 균질화 금지.
