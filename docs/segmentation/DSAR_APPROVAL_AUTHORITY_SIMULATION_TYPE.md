# DSAR — Approval Authority Simulation Type (§61 Simulation Type 12)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §61(2435-2493) Simulation Type · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §5·§6 · 본체 필드축(§61 33) = [DSAR_APPROVAL_AUTHORITY_SIMULATION.md](DSAR_APPROVAL_AUTHORITY_SIMULATION.md)

## 0. 현행 실측 (file:line)

### ★대전제 — `Authority Simulation Engine` = **`ABSENT`**(엔티티 전무)

**Authority 를 실집행 없이 시뮬레이션하는 코드가 0건이다.** `APPROVAL_AUTHORITY_SIMULATION` grep 0 · what-if 평가기 0. 승인 4경로(ⓑ §2)는 전부 **실 상태전이**이지 dry-run 시뮬레이션이 아니며, 시뮬레이션 Type 을 분기할 대상 Authority 자체가 부재하다.

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_SIMULATION` Type 분기 | grep **0** — 시뮬레이션 엔진·Type 열거 부재 | `NOT_APPLICABLE`(부재→신설) |
| as-of 재구성 수단 | 🔴 환율 KV 덮어쓰기(`rate_date` 없음·`Connectors:1790`)·`Actor Auth Snapshot` 부재(ⓑ §5) → 과거 시점 replay 불가 | `ABSENT` |

★**시뮬레이션 엔진 자체가 부재하므로 Type 별 능력은 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 부재 깊이를 기록한다.

## 1. 원문 전사 + 판정 — **원문 12종**(Simulation Type)

> ★분모 주의: **측정기 `--sec=61` 총 = 45**(불릿 45) = 필수 필드 **33** + Simulation Type **12**. 본 편은 **Type 12** 담당 · 필드 33 은 [본체 SIMULATION 편](DSAR_APPROVAL_AUTHORITY_SIMULATION.md). **33 + 12 = 45 로 측정기와 정합.**

| # | 원문 Simulation Type | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | SINGLE_ACTOR | 단일 행위자 권한 평가기 부재 — 자격 판정 정본 축 자체가 없음(ⓑ §3) | `NOT_APPLICABLE` |
| 2 | SINGLE_REQUEST | 단건 요청 dry-run 부재 — 인접 `mapping_change_request`(`Mapping:209`)는 **실 요청**이지 시뮬레이션 아님 | `NOT_APPLICABLE` |
| 3 | BATCH_REQUEST | 배치 시뮬레이션 부재 | `NOT_APPLICABLE` |
| 4 | MATRIX_VERSION_COMPARISON | 🔴 Authority Matrix Version 엔티티 미구축·불변 prev-링크 버전체인 선례 0(version 6컬럼 전부 하드코딩 태그·ⓑ §5) → 버전 간 비교 대상 없음 | `NOT_APPLICABLE` |
| 5 | FUTURE_EFFECTIVE | 🔴 Future-Dated(§58) ABSENT — 로컬 미래 effective 예약 0(ⓑ §5) | `NOT_APPLICABLE` |
| 6 | LIMIT_CHANGE_IMPACT | 🔴 도메인 authority 한도 0(인접 `AutoCampaign:843-889` 마케팅 예산·승인 아님·ⓑ §4) → 한도 변경 시뮬레이션 무발동 | `NOT_APPLICABLE` |
| 7 | CURRENCY_CHANGE_IMPACT | 🔴 통화 스코프 0(`currency_scope`/`allowed_currency` 0)·환율 저장계층 부재(ⓑ §4) | `NOT_APPLICABLE` |
| 8 | LEGAL_ENTITY_CHANGE_IMPACT | 🔴 Legal Entity 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §4) | `NOT_APPLICABLE` |
| 9 | ROLE_CHANGE_IMPACT | 🔴 권한 축 2벌 분열(`roleRank` api-key 등급 ⟂ `team_role`·양방향 매핑 0·ⓑ §3)·시점 미동결 → role 변경 파급 시뮬레이션 무발동 | `NOT_APPLICABLE` |
| 10 | POSITION_CHANGE_IMPACT | 🔴 Position 전역 0(ⓑ §3) | `NOT_APPLICABLE` |
| 11 | HISTORICAL_REPLAY | 🔴 **as-of 조회 수단 부재** — 과거환율 조회 불가(`rate_date` 없음·`Connectors:1790`)·`Actor Auth Snapshot` 부재(ⓑ §5)·`AgencyPortal revoked_at=NULL` 이력 물리소멸(ⓑ §5) → 과거 시점 재현 원천 불가 | `ABSENT` |
| 12 | CUSTOM | 사용자 정의 시뮬레이션 확장점 부재 | `NOT_APPLICABLE` |

**실측 개수: 12 / 12 전사.** (측정기 §61 총 45 − 필드 33 = Type **12** · 전사 **12** — 분해 후 정합)

커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 11 · `ABSENT` 1(#11 HISTORICAL_REPLAY).

> 🔴 **커버 0.** 시뮬레이션 엔진이 통째로 부재하므로 어떤 Type 도 `VALIDATED_LEGACY` 가 아니다. 11종은 **분기할 시뮬레이터·대상 Authority 부재**로 `NOT_APPLICABLE`(신설). `HISTORICAL_REPLAY` 만 `ABSENT` 로 격상 — 다른 Type 은 "엔진만 세우면 되는" 반면, replay 는 **as-of 조회 인프라(rate_date·Actor Snapshot·이력보존)가 저장계층부터 부재**해 엔진 신설만으로는 불가하기 때문이다.

## 2. 규칙

- 🔴 **Type 12종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 확장 가능 카탈로그로.
- 🔴 **`HISTORICAL_REPLAY`(#11)를 "엔진 신설로 해결된다"로 오표기 금지** — 나머지 11종과 부재 깊이가 다르다. replay 는 as-of 환율(`rate_date` 신설)·`Actor Authorization Snapshot`(§55)·이력 불변보존(`revoked_at=NULL` 반례 제거)이 **저장계층부터 선행**돼야 성립한다.
- 🔴 **시뮬레이션은 실 Authority Utilization/Task/Decision 을 생성하지 않아야 한다**(원문 `:2490`) — [본체 SIMULATION 편](DSAR_APPROVAL_AUTHORITY_SIMULATION.md) §2 부작용 금지 원칙과 일체. Type 별 what-if 는 순수 계산이며 승인 4경로의 실 상태전이(`Catalog::approveQueue` 등)를 재사용해선 안 된다.
- 🔴 **코드 변경 0 유지** — 시뮬레이션 엔진 신설은 Authority Matrix/Version/Snapshot 선행 구축 후 **별도 승인세션**.
