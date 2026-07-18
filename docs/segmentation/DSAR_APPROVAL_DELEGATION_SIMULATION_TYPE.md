# DSAR — Approval Delegation Simulation Type (§48 Simulation Type 17)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §48(1937-1999) Simulation Type(1978-1994) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) §1·§2·§3 · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)
> 본체 필드축(§48 필수 필드 32) = [DSAR_APPROVAL_DELEGATION_SIMULATION.md](DSAR_APPROVAL_DELEGATION_SIMULATION.md)

## 0. 현행 실측 (file:line)

### ★대전제 — `Delegation Simulation Engine` = **`ABSENT`**(엔티티 전무)

**위임을 실 Activation/Task/Decision 생성 없이 평가하는 what-if 시뮬레이터가 0건이다.** `APPROVAL_DELEGATION_SIMULATION` grep 0 · dry-run 위임 평가기 0. 애초에 시뮬레이션 Type 을 분기할 **Delegation Definition 자체가 부재**(ⓑ §1 — "Approval Delegation" 개념 전무·유일 이름히트 `DELEGATION_EXCEEDED`는 RBAC 부여상한 오탐 `TeamPermissions.php:645`)하고, Type 이 분기하는 상위 축(Authority·Chain·Period·Legal Entity·Redelegation)이 §3 선행조건 4축과 함께 전부 ABSENT(ⓑ §3)다.

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_SIMULATION` Type 분기 | grep **0** — 시뮬레이션 엔진·Type 열거 부재 | `NOT_APPLICABLE`(부재→신설) |
| 분기 대상 Delegation Definition | 🔴 Delegation Definition/Version/Scope/Period 엔티티 0(ⓑ §1·§2.1) — 분기할 위임 자체가 없음 | `ABSENT` |
| as-of 재구성 수단(HISTORICAL_REPLAY 전제) | 🔴 환율 KV 덮어쓰기(`rate_date` 없음·`Connectors.php:1790`)·`Actor Auth Snapshot` 부재(ⓑ §3.4)·`AgencyPortal revoked_at=NULL` 이력 물리소멸(ⓑ §2.5) → 과거 시점 replay 불가 | `ABSENT` |

★**시뮬레이션 엔진 자체가 부재하므로 Type 별 능력은 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 부재 깊이를 기록한다.

## 1. 원문 전사 + 판정 — **원문 17종**(Simulation Type)

> ★분모 주의: **측정기 `--sec=48` 총 = 49**(불릿 49) = 필수 필드 **32**(1943-1974) + Simulation Type **17**(1978-1994). 본 편은 **Type 17** 담당 · 필드 32 는 [본체 SIMULATION 편](DSAR_APPROVAL_DELEGATION_SIMULATION.md). **32 + 17 = 49 로 측정기와 정합.**

| # | 원문 Simulation Type | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | SINGLE_DELEGATION | 단일 위임 dry-run 부재 — Delegation Definition 자체 0(ⓑ §1)·분기할 위임 없음 | `NOT_APPLICABLE` |
| 2 | SINGLE_REQUEST | 단건 승인요청 시뮬레이션 부재 — 인접 `mapping_change_request`(`Mapping.php:209`)는 **실 요청**이지 dry-run 아님(ⓑ §2.2) | `NOT_APPLICABLE` |
| 3 | SINGLE_CHAIN_LEVEL | 🔴 Chain/level 개념 0(`approval_chain` grep 0·§3.1 Approval ABSENT·ⓑ §3) → 분기할 체인 레벨 없음 | `NOT_APPLICABLE` |
| 4 | BATCH_REQUEST | 배치 위임 시뮬레이션 부재 | `NOT_APPLICABLE` |
| 5 | FUTURE_ACTIVATION | 🔴 미래 활성화 예약 시뮬레이션 부재 — Schedule/Activate 라이프사이클 0(ⓑ §2.1) | `NOT_APPLICABLE` |
| 6 | FUTURE_EXPIRATION | 🔴 미래 만료 시뮬레이션 부재 — `acl_permission` 위임상한에 **expiry 컬럼 자체 부재**(영구·ⓑ §2.1) | `NOT_APPLICABLE` |
| 7 | DELEGATE_CHANGE | 대리자 변경 파급 시뮬레이션 부재 — Delegate subject 관계 엔티티 0(ⓑ §2.1) | `NOT_APPLICABLE` |
| 8 | PERIOD_CHANGE | 🔴 기간 변경 시뮬레이션 부재 — Delegation Period(시작·종료·유효기간) 0(ⓑ §2.1 표) | `NOT_APPLICABLE` |
| 9 | SCOPE_CHANGE | 범위 변경 시뮬레이션 부재 — Delegation Scope 엔티티 0 | `NOT_APPLICABLE` |
| 10 | MONETARY_LIMIT_CHANGE | 🔴 금액 한도 변경 시뮬레이션 부재 — 금액축 부재(유일 `HIGH_VALUE_KRW` 상수 `Catalog.php:1016`·boolean 만·ⓑ §3.2) | `NOT_APPLICABLE` |
| 11 | LEGAL_ENTITY_CHANGE | 🔴 Legal Entity 0(`biz_no`/`corp_reg`/`tax_id` grep 0·회사프로필 단일 문자열·ⓑ §3.3) | `NOT_APPLICABLE` |
| 12 | REDELEGATION | 🔴 재위임 시뮬레이션 부재 — member 재부여/재위임 경로 0·Cycle/Depth 검출 Delegation 도메인 0(ⓑ §2.1·§2.4) | `NOT_APPLICABLE` |
| 13 | EMERGENCY_ACTIVATION | 🔴 긴급 활성화 시뮬레이션 부재 — Break-glass 프레임워크 grep 0(ⓑ §3.4) | `NOT_APPLICABLE` |
| 14 | REVOCATION_IMPACT | 철회 파급 시뮬레이션 부재 — Revoke 라이프사이클·영향 재계산 0 | `NOT_APPLICABLE` |
| 15 | AUTHORITY_CHANGE_IMPACT | 🔴 Authority 개념 부재(`authority_matrix`/`approval_authority` grep 0·5-3-3-4·ⓑ §3.2) → 권한 변경 파급 무발동 | `NOT_APPLICABLE` |
| 16 | HISTORICAL_REPLAY | 🔴 **as-of 조회 수단 부재** — 과거환율 조회 불가(`rate_date` 없음·`Connectors.php:1790`)·`Actor Auth Snapshot` 부재(ⓑ §3.4)·`AgencyPortal revoked_at=NULL` 이력 물리소멸(ⓑ §2.5) → 과거 시점 재현 원천 불가 | `ABSENT` |
| 17 | CUSTOM | 사용자 정의 시뮬레이션 확장점 부재 | `NOT_APPLICABLE` |

**실측 개수: 17 / 17 전사.** (측정기 §48 총 49 − 필드 32 = Type **17** · 전사 **17** — 분해 후 정합)

커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 16 · `ABSENT` 1(#16 HISTORICAL_REPLAY).

> 🔴 **커버 0.** 시뮬레이션 엔진이 통째로 부재하므로 어떤 Type 도 `VALIDATED_LEGACY` 가 아니다. 16종은 **분기할 시뮬레이터·대상 Delegation 부재**로 `NOT_APPLICABLE`(신설). `HISTORICAL_REPLAY` 만 `ABSENT` 로 격상 — 다른 Type 은 "엔진·선행 엔티티만 세우면 되는" 반면, replay 는 **as-of 조회 인프라(rate_date·Actor Snapshot·이력 불변보존)가 저장계층부터 부재**해 엔진 신설만으로는 불가하기 때문이다.

## 2. 규칙

- 🔴 **Type 17종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 확장 가능 카탈로그로.
- 🔴 **`HISTORICAL_REPLAY`(#16)를 "엔진 신설로 해결된다"로 오표기 금지** — 나머지 16종과 부재 깊이가 다르다. replay 는 as-of 환율(`rate_date` 신설)·`Actor Authorization Snapshot`·이력 불변보존(`AgencyPortal revoked_at=NULL` 반례 제거)이 **저장계층부터 선행**돼야 성립한다.
- 🔴 **Simulation 은 실 Delegation Activation / Task Assignment / Decision 을 생성하지 않아야 한다**(원문 `:1996`) — [본체 SIMULATION 편](DSAR_APPROVAL_DELEGATION_SIMULATION.md) §2 부작용 금지 원칙과 일체. Type 별 what-if 는 순수 계산이며 승인 4경로의 실 상태전이(`Mapping::approve:238-291` 등)를 재사용해선 안 된다.
- 🔴 **코드 변경 0 유지** — 시뮬레이션 엔진 신설은 §3 선행조건(Authority/Chain/Org/Legal Entity/Position·ⓑ §3) 및 Delegation Definition/Version/Snapshot 선행 구축 후 **별도 승인세션**(Golden Rule + verify + 배포승인).
