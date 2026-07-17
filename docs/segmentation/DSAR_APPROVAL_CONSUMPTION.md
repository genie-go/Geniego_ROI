# DSAR — Approval Consumption (§41·필드 17·차단 9)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 질문(스펙 §4.10 "동일 승인으로 여러 실행을 무제한 허용하지 않는다") | 현행 | 분류 |
|---|---|---|
| **APPROVAL_CONSUMPTION** 엔티티 | **부재** — 승인 도메인 `consumption` grep **0**. (저장소 hit는 전부 `wms_lot_consumptions` = **FEFO COGS 원장**(`Handlers/Wms.php:226,1175`)으로 **승인 무관**) | **NOT_APPLICABLE(부재→신설)** |
| **잔여 실행 횟수** 개념 | **부재**(grep 0) — 승인 1건으로 몇 번 실행 가능한지 **제한하는 구조 없음** | **NOT_APPLICABLE** |
| **Single-use** 개념 | **부재**(`single.use` grep **0**) | **NOT_APPLICABLE** |
| **Validity**(승인 유효기간) | **부재**(grep 0) — `action_request`·`mapping_change_request` 모두 만료 컬럼 없음(`Db.php:592-600` · `:623-636`) | **NOT_APPLICABLE** |
| 재사용 실측 — `Alerting::executeAction` | `:601-660` — 실행 후 `status='executed'`로 UPDATE할 뿐(`:650`), **execute 재호출을 막는 검사 없음**. `executed` 건에 execute를 다시 쳐도 `AdAdapters::pause`(`:631`)가 **또 나간다** | **MIGRATION_REQUIRED**(단 **VACUOUS** — 생산자 grep 0) |
| 재사용 실측 — `Mapping::apply` | `:309` `status!=='approved'` 게이트 → 1회 apply 후 `applied` 전이(`:327`)이므로 **재호출 시 400 거부** = **사실상 single-use** | **★VALIDATED_LEGACY**(의도 여부 무관·효과는 정본) |

> **대조가 말하는 것**: `Mapping`은 **상태 전이의 부수효과로** 재사용을 막았고(`approved→applied`), `Alerting`은 **막지 못한다**. 즉 현행의 single-use는 **명시적 소비 원장이 아니라 우연한 상태 전이**에 의존한다 — 재사용 방지를 **설계로 승격**해야 §4.10을 만족한다.

## 1. Consumption = **승인이 실행에 의해 소모된 사실**의 Append-only 원장

Execution Binding(§40)이 **"무엇을 어디까지 허가했는가"**라면, Consumption은 **"그 허가가 얼마나 남았는가"**다. 둘은 다른 축이다.

**필드 17 · 차단 항목 9** — 스펙 §41 원문 항목명은 **저장소 미영속**(REQ §7은 개수 `17`/`9`만 고정).
→ 분류 **UNVERIFIED**. 항목명을 **지어내지 않는다**(REQ §15 역산 금지). 원문 수령 시 채운다. **현 시점 필드/차단 축 커버리지 주장 불가**.

영속된 요구(§4.10·§0 Q23·§61 "Consumption 기록"·§62 항목 33·34)에서 확정 가능한 구조 요구:
- Consumption은 **Append-only**(§4.9) — 잔여 횟수를 **카운터로 덮어쓰지 않고**, 소비 사건을 쌓아 **집계로 도출**한다(임의 숫자 금지 · SSOT 파생).
- 소비 기록은 **실행과 원자적**이어야 한다 — 기록 없이 집행되면 잔여가 늘어난 채로 남는다(288차 `CouponRedeem` TOCTOU 선례).
- 승인은 **무기한이 아니다** — Validity 없이는 "1년 전 승인으로 오늘 집행"이 §4.10 위반인지 **판정 불가**.

## 2. 규칙

- **`wms_lot_consumptions`를 승인 소비 원장으로 전용 금지** — 이름만 같은 **다른 도메인**(FEFO COGS)이다. 중복 인텔리전스가 아니라 **동음이의**임을 명시한다.
- **`Mapping`의 `approved→applied` 편도 전이를 재사용**한다 — 명시적 Consumption 원장이 생기기 전까지 **현행 유일한 재사용 방지**이므로, 이 전이를 되돌리는 변경 금지(무후퇴).
- **잔여 횟수를 하드코딩·기본값으로 채우지 않는다** — 소비 사건 집계에서 파생한다(임의 숫자 금지 원칙).
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤) — Consumption 원장이 없는 동안 UI/보고서에 "잔여 N회"를 표시하지 않는다(가짜녹색).
- 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.
