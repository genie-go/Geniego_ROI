# DSAR — Authority Effective Dating (§57)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §57(2325-2342) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §5 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> **분모 측정기**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=57` = **9**(불릿 9 · 번호 0). 육안 계수 금지.

## 0. 현행 실측 (file:line)

★**§57 은 "Effective Dating 을 잘못 처리한다"가 아니라 "bitemporal 시간축 자체가 없다"**이다. 승인·권한 엔티티에 business/system 이중 시점축이 통째로 부재하며, **유일한 실 valid-from dating 은 수수료(fee) 도메인의 단일 시점축**이다(ⓑ §5).

| 시간축 | 현행 실측 | 판정 |
|---|---|---|
| **business valid (유효기간)** | 🔴 승인/권한 엔티티에 `valid_from`/`valid_to`/`effective_to` **grep 0**(오탐 `Onsite.php:396` invalid_token 제외) · **유일 실재 = `kr_fee_rule.effective_from`**(DDL `Db.php:898` `VARCHAR(32) NOT NULL`) — **수수료/VAT open-interval valid-from** · 읽기 4개소 전부 `ORDER BY effective_from DESC LIMIT 1` 최신승(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`)이며 **`<= NOW()` as-of 술어 없음**(ⓑ §5) | `LEGACY_ADAPTER`(fee 도메인 한정) |
| **system recorded (기록시점)** | 🔴 **bitemporal 부재** — 감사 로그의 `created_at`(예: `SecurityAudit.php:24` `gmdate`)는 단일 시각이며 **행 유효구간을 표현하는 system-time 컬럼이 아니다** · `system_recorded_*` 개념 grep 0 | `ABSENT` |
| **timezone** | `SecurityAudit.php:24` `gmdate('Y-m-d H:i:s')`·`:121` `gmdate(...)` = **UTC 고정 문자열**(전 도메인 관행) · 타임존 저장/변환 계층 없음 | `LEGACY_ADAPTER`(UTC 고정) |
| **as-of 재구성** | 🔴 **불가** — Actor Authorization Snapshot **ABSENT**(승인시점 권한/역할/플랜 미보존: `Mapping:285`{user,ts}·`Alerting:591`{actor,decision,ts}·admin_growth decided_by/decided_at 2컬럼 · ⓑ §5) | `ABSENT` |
| **버전축** | 🔴 불변 prev-링크 버전체인 선례 **0** — version 컬럼 6개(`menu_defaults.version`='baseline' 리터럴 등) **전부 하드코딩/서술 태그**(ⓑ §5) | `ABSENT` |

## 1. 원문 전사 + 판정 — **원문 9종**

원문(`:2327`): *"모든 Authority Entity에 다음을 적용하라."*

| # | 원문 항목명 | 현행 대조 (ⓑ §5) | 판정 |
|---|---|---|---|
| 1 | business_valid_from | 승인/권한 엔티티엔 없음 · 인접 = `kr_fee_rule.effective_from`(open-interval valid-from · 수수료 도메인 · `Db.php:898`) — **컬럼 有 · as-of 질의 無**(최신승 `Pnl.php:454`) | `LEGACY_ADAPTER` |
| 2 | business_valid_to | 🔴 `valid_to`/`effective_to` **grep 0**(오탐 `Onsite.php:396` 제외) → **폐구간 종료시점 표현 수단 0** | `ABSENT` |
| 3 | system_recorded_from | 🔴 **bitemporal 부재** — 행이 시스템에 기록된 유효구간 시작 개념 없음 | `ABSENT` |
| 4 | system_recorded_to | 🔴 **bitemporal 부재** — 정정 시 이전 행을 system-time 으로 폐구간화하는 계층 없음(정정=in-place 소거, §59 참조) | `ABSENT` |
| 5 | timezone | `SecurityAudit.php:24` `gmdate` = **UTC 고정** · 타임존 필드/변환 계층 없음 | `LEGACY_ADAPTER`(UTC 고정) |
| 6 | future_dated 여부 | 🔴 **미래 일자 예약 스케줄 0**(§58 참조) · 인접 `Paddle.php:291` next_billing 은 **외부 PSP 파라미터 위임**이지 로컬 미래 effective 예약이 아님(오탐 · ⓑ §5) | `ABSENT` |
| 7 | retroactive 여부 | 🔴 **소급 표식 컬럼 0** · 집행수단 부재(`migrations/` 172차 정지 · `ensureTables`=CREATE만 · 백필 0 · §59 참조) | `ABSENT` |
| 8 | correction 여부 | 🔴 **정정 표식 컬럼 0** · 유일 선례 = `AgencyPortal.php:304`,`:381` `revoked_at=NULL` **in-place 소거**(정정을 정정으로 기록하지 않고 원본을 덮어씀 · ⓑ §5) | `ABSENT` |
| 9 | source_effective_date | 🔴 외부 소스의 effective date 를 실어 오는 커넥터/컬럼 0 — Authority 를 공급하는 소스 자체가 부재 | `ABSENT` |

**실측 개수: 9 / 9 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2(business_valid_from·timezone) · `ABSENT` 7.

> 🔴 **커버 0.** bitemporal 시간축이 통째로 부재하므로 어떤 항목도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 2건(`kr_fee_rule.effective_from`·`gmdate` UTC)은 **확장 대상 인접 자산**이지 커버가 아니다 — 둘 다 승인/권한 엔티티가 아니고, `effective_from` 은 as-of 질의조차 없다.

## 2. 규칙

- 🔴 **★원문 종결문(`:2339`) "과거 Authority를 현재 Role·Position 기준으로 재해석하지 마라" = §65 Critical Gap "Current Matrix 로 과거 재해석"의 정의문**이다(ⓑ §8). 현행은 **Actor Authorization Snapshot 이 ABSENT**(승인시점 권한/역할/플랜 미보존 · ⓑ §5)이므로 **as-of 재구성이 원천 불가** → 과거 승인을 현재 매트릭스로 재판정하는 것 외에 방법이 없다. 이는 §57 의 정반대다. **business_valid_from + Actor Auth Snapshot 을 같은 설계로 묶어라 — 시점축만 넣고 스냅샷을 빠뜨리면 재해석 갭이 그대로 남는다.**
- 🔴 **`kr_fee_rule.effective_from` 에 미래·과거 날짜를 넣는 것으로 §57 를 닫지 마라.** 읽기 4개소 전부 `ORDER BY effective_from DESC LIMIT 1` 이며 **`WHERE effective_from <= NOW()` as-of 술어가 없다**(전역 grep 0 · ⓑ §5). 이 계층은 **valid-from 은 있으나 valid-to·system-time·as-of 질의가 없는 반쪽 dating** 이다 — Authority 엔티티에 그대로 상속하면 미래 행 즉시활성·정정 무기록을 물려받는다.
- 🔴 **`system_recorded_from/to` 를 "있음"으로 표기 금지** — 감사 로그의 `created_at`(단일 시각)을 bitemporal system-time 으로 오독하면 정정 이력이 없는데도 있는 것처럼 보인다. **행 유효구간(from/to) 을 표현하는 계층은 전 도메인 0**이다.
- 🔴 **timezone 을 컬럼으로 신설하되 `gmdate` UTC 고정 관행을 파괴하지 마라**(무후퇴) — 현행 저장은 전부 UTC 문자열이다. 타임존 필드는 **표시/해석 메타데이터**로 추가하고 저장 정규화는 UTC 유지.
- 🔴 **9종 "있다고 가정"하고 배선 금지** — 7종이 `ABSENT` 다.
