# DSAR — Approval Authority Effect (§9 · Effect 6)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0 · 문서만**
> ★분할 분모: **28(Definition 필수필드) + 6(Effect) + 13(Assignment Basis) = 47 = §9 측정기 정합**
>   (`node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=9` → **불릿 47**). 본 문서는 그 중 **Effect 6**을 전사한다. Definition 28 = [DSAR_APPROVAL_AUTHORITY_DEFINITION.md](DSAR_APPROVAL_AUTHORITY_DEFINITION.md) · Assignment Basis 13 = [DSAR_APPROVAL_AUTHORITY_ASSIGNMENT_BASIS.md](DSAR_APPROVAL_AUTHORITY_ASSIGNMENT_BASIS.md).
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §9(735-742) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `effect` 판별자 컬럼 | `approval.*effect`·`decision_effect` grep **0** — 승인 결과를 **6종 effect 로 분류·저장하는 축 부재**(ⓑ §2) | `ABSENT` |
| 실 결과 = 상태전이(ALLOW 방향) | 4경로 전부 `status`→`approved`/`queued` 단방향 전이(`Mapping::approve:238-294`·`Catalog::approveQueue:2341-2365`·`Alerting::decideAction:593`·`AdminGrowth::approvalDecide:1313-1344`) — effect 이름 없이 ALLOW 만 실현 | `LEGACY_ADAPTER`(ALLOW) |
| 🔴 explicit DENY | `acl_permission` **allow-only** — deny 비트/행 표현 자체가 없음(ⓑ §6·Registry 필드 15) → §65 explicit-deny 우선 위반이 "판정 자체 없음" | `ABSENT` |

★**effect 축이 부재하므로 6종 전량 신설.** 아래는 원문 전사이며 현행 대조는 "인접 실현/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **Effect 6**

| # | 원문 Effect | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | ALLOW | 인접 실재 = 승인 4경로의 상태전이(`Mapping::approve:238-294`·`Catalog::approveQueue:2350-2357`·`Alerting::decideAction:593`·`AdminGrowth::approvalDecide:1330`) — **effect 명명 없이 ALLOW 방향만 실현**(ⓑ §2) | `LEGACY_ADAPTER` |
| 2 | DENY | 🔴 **표현 자체 없음** — `acl_permission`=allow-only(ⓑ §6)·explicit-deny 우선(§4.9) 구조 부재 → §65 "Explicit Deny 우선 위반"이 gap 이 아니라 **미구현** | `ABSENT` |
| 3 | REQUIRE_ADDITIONAL_APPROVAL | 인접 = `required_approvals=2`(maker-checker 정족수 실집행 `Mapping.php:209-210`·`Db.php:634 DEFAULT 2`) — **단 리터럴 상수·금액/건종류 무관 고정 2**(ⓑ §1·§2) | `LEGACY_ADAPTER` |
| 4 | REQUIRE_MANUAL_REVIEW | 🔴 별도 "수동검토" effect 부재 — `high_value`(₩5M+)는 `requires_approval=true` 만 켜고(`Catalog.php:1103-1105`) `approveQueue:2350-2357`이 `approval_type` 무시·unregister 와 **동일 경로·동일 권한(requirePro)** 으로 붕괴(ⓑ §4) → 구별되는 manual-review effect 없음 | `NOT_APPLICABLE` |
| 5 | RESTRICT | 부재 — 부분허용/제약 effect 개념 0 | `NOT_APPLICABLE` |
| 6 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 6 / 6 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2(1·3) · `ABSENT` 1(2) · `NOT_APPLICABLE` 3(4·5·6).

> 🔴 **커버 0.** effect 판별 축이 통째로 부재하므로 `VALIDATED_LEGACY` 0. ALLOW·REQUIRE_ADDITIONAL_APPROVAL 의 `LEGACY_ADAPTER` 는 **명명 없는 상태전이 / 리터럴 정족수** 인접일 뿐 effect 커버가 아니다.

## 2. 규칙

- 🔴 **DENY 를 "나중에 추가" 로 미루지 마라** — explicit deny 부재는 `acl_permission` allow-only 라는 **저장계층 결함**이다(ⓑ §6). effect 를 ALLOW/REQUIRE_* 만으로 도입하면 §4.9 "explicit-deny > allow" 우선순위 규칙이 원천적으로 표현 불가해져 §65 Critical Gap 이 구조화된다. DENY 는 최초 스키마에 포함하라.
- 🔴 **`required_approvals=2` 를 REQUIRE_ADDITIONAL_APPROVAL 의 근거로 재사용하되 재구현 금지** — Mapping 의 4중 방어(신원 fail-closed `:247`·자기승인차단 `:268`·dedup `:278`·정족수 `:287`)는 레포 유일 실 정족수다(ⓑ §2). effect=REQUIRE_ADDITIONAL_APPROVAL 은 이 패턴을 **금액/건종류 요건에 바인딩**하도록 확장(고정 2 상수 은퇴)하되 별도 정족수 엔진을 새로 짜지 마라.
- 🔴 **REQUIRE_MANUAL_REVIEW 를 high_value 로 착각 금지** — high_value 는 저장·라우팅되지 않고 JSON 응답으로만 존재(`Catalog.php:1125`·`:2252`·ⓑ §4)하며 unregister 와 동일 경로로 결재된다. manual-review effect 를 신설할 때 이 collapse 를 상속하지 말고 approval_type 을 `approveQueue` 필터에 반영하라.
