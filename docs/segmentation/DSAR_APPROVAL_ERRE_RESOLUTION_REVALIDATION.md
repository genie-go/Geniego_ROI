# DSAR — ERRE Resolution Revalidation (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §24 Revalidation
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
> **반날조**: 모든 `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 인용. 그 밖은 `ABSENT`. **★근접물 `reclampTeamMembers`(TeamPermissions.php:809)는 영속 재계산이나 트리거 기반 재검증이 아님.** 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

**ERRE Resolution Revalidation**(SPEC §24)은 권한 입력이 변경될 때 관련 주체의 effective 권한을 **트리거 기반으로 능동 재검증**하는 축이다. 무효화(§22)가 캐시를 stale 마킹한다면, Revalidation은 한 걸음 더 나아가 **실효 권한을 실제로 재산출·재검증**해 정책 변경이 즉시·정확히 반영되도록 보장한다(access review·정책 준수의 실시간 강제).

SPEC §24가 규정하는 Revalidation 트리거는 5종이다.

- **Policy Update** — RBAC/ABAC/plan 정책 변경
- **Role Update** — role 정의·권한 매핑 변경
- **Assignment Update** — grant 부여·회수
- **Organization Update** — 조직/부서/계층 변경
- **Runtime Update** — 런타임 컨텍스트 변경

## 2. Ground-Truth 판정 (전수조사 기반 · ABSENT-dominant)

### 2.1 판정 = **ABSENT** (트리거 기반 재검증 부재)

Drift/Revalidation/Reconciliation은 Ground-Truth ② 판정표 #5에서 **ABSENT**로 확정된다.

- **핵심 근거**: effective 권한 재검증 로직 grep 0(Ground-Truth ② §2 #5).
- **트리거 시스템 부재**: 정책/role/assignment/org 변경을 이벤트로 감지해 관련 주체 권한을 재산출하는 트리거 파이프라인이 없다. 변경 write는 in-place UPDATE로 끝나고(Ground-Truth ② §5) 재검증을 촉발하지 않음.

### 2.2 실존 substrate (PARTIAL·유일 근접물 = 영속 재계산·단 트리거 아님)

★본 편의 판정 정밀도 핵심: **가장 근접한 실체가 존재하나 "트리거 기반 재검증"과는 다르다.**

- **`reclampTeamMembers`(`TeamPermissions.php:809`)** = 팀권한 축소 시 멤버 권한을 **영속 재계산(재클램프)** 하는 실재 로직. effective 권한을 재산출해 DB에 다시 쓰는 유일한 근접물(Ground-Truth ① §2).
- **그러나 Revalidation이 아니다**: 이는 **팀권한 축소라는 특정 write에 인라인 결합된 한 방향 재클램프**이지, ① Policy/Role/Org/Runtime Update 등 다축 트리거로 촉발되지 않으며 ② 이벤트 기반 능동 재검증 파이프라인이 아니며 ③ 재검증 결과의 확정·경고·감사가 없다. 즉 "member 권한이 팀 상한을 넘지 않도록 잘라내는 유지보수 write"일 뿐, "정책 변경에 따른 전방위 access revalidation"이 아니다.
- `putMemberPermissions`(`TeamPermissions.php:641`)의 assignable 초과 검증(→403 `DELEGATION_EXCEEDED`)도 **write 시점 검증**이지 사후 트리거 재검증이 아니다.

### 2.3 ★KEEP_SEPARATE 오흡수 경고

- `ModelMonitor`(model 재검증/재학습)·`Risk`(policy ML 재예측)의 revalidation/재계산은 ML 도메인 — 권한 재검증 아님(Ground-Truth ② §4).
- `SecurityAudit.php:25`~`:31` 해시체인 verify는 **감사 무결성 검증**이지 권한 실효 재검증이 아님 — 오흡수 금지.

## 3. Canonical 설계 (`ERRE_RESOLUTION_REVALIDATION` · 전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | revalidation_id | 재검증 이벤트 식별자 |
| 2 | tenant | 테넌트 스코프(격리 필수) |
| 3 | trigger_type | 5종 트리거(③) |
| 4 | affected_subject_ref | 재검증 대상 주체(단건/집합) |
| 5 | prev_snapshot_ref | 재검증 전 Snapshot(§18) |
| 6 | new_snapshot_ref | 재검증 후 새 Snapshot |
| 7 | changed | 실효 변화 여부·상세 |
| 8 | triggered_by | 재검증을 촉발한 변경 참조 |
| 9 | revalidated_at | 재검증 시각 |
| 10 | drift_ref | 재검증 중 발견된 Drift(§23) 연결 |

### 3.1 열거형 / 타입

- **trigger_type**: POLICY_UPDATE · ROLE_UPDATE · ASSIGNMENT_UPDATE · ORGANIZATION_UPDATE · RUNTIME_UPDATE (SPEC §24)

### 3.2 설계 원칙

- **트리거 기반 능동 재산출**: 무효화(§22)의 lazy 재계산과 달리, Revalidation은 변경 즉시 관련 주체 Pipeline을 재실행해 새 Snapshot을 확정.
- **`reclampTeamMembers` 승격 대상**: 기존 `:809` 재클램프를 Revalidation의 **Assignment Update 트리거 구현체**로 승격·일반화(ADR D-1 Extend). 팀권한 축소 외 정책/role/org 축으로 트리거 확장.
- **재검증-정합화 분리**: Revalidation은 재산출까지, 발견된 편차 정합화는 Reconciliation(§25).
- **경고 계약**: Policy Updated·Scope Narrowed(SPEC §31) 경고 방출.
- **Tenant 격리**: 재검증 전파는 tenant 경계 내.

### 3.3 Error / Warning 계약 (SPEC §30·§31 중 본 축 해당분)

- **Policy Updated 경고**(SPEC §31): Policy Update 트리거 재검증 시 방출 — 정책 변경의 실효 반영 확정.
- **Scope Narrowed 경고**(SPEC §31): 재검증 결과 scope 축소 시 방출(정상 축소이나 감사 필요).
- **POLICY_EVALUATION_FAILED**(SPEC §30): 재검증 중 판정 실패 시 fail-secure(DENY) 귀결.

### 3.4 API · 인덱스 · 성능 (SPEC §32·§34·§35)

- **API**: 재검증은 트리거 hook 주도. Validate Resolution(SPEC §32)으로 재검증 결과·변화 여부 조회.
- **인덱스**: affected_subject·Version·Snapshot 인덱스(SPEC §34)로 대상 집합 조회.
- **성능**: 집합 재검증(조직 변경 시 다수 주체)은 Incremental Recalculation(SPEC §35)으로 델타만 재산출 — 전량 재계산 회피.

## 4. Kernel 매핑 (트리거별 재검증 소스)

| Trigger(SPEC §24) | 재검증 소스 | 최근접 substrate | 판정 |
|---|---|---|---|
| Policy Update | plan/정책 변경 | `PlanPolicy.php:19`·`UserAuth.php:364` | **ABSENT**(변경 이벤트·재검증 없음) |
| Role Update | role 정의 변경 | `Keys.php:88`·`AdminMenu.php:323` | **ABSENT** |
| Assignment Update | grant 부여/회수 후 재클램프 | `TeamPermissions.php:809`·`:641` | **PARTIAL**(영속 재계산·트리거 아님) |
| Organization Update | 조직/계층 변경 | `UserAuth.php:409`(tenant 상속) | **ABSENT** |
| Runtime Update | 컨텍스트 변경 | `index.php:608` | **ABSENT** |
| **트리거 파이프라인 자체** | Revalidation(§24) | — | **ABSENT** |

> ★`reclampTeamMembers`(`:809`)만 PARTIAL — 영속 재계산이라는 점에서 Revalidation의 씨앗이나, 트리거 기반·다축·확정/경고/감사 완비 재검증은 순신규.

## 5. 무후퇴 · Extend

- **Golden Rule(Extend)**: `reclampTeamMembers`(`TeamPermissions.php:809`)·`putMemberPermissions`(`:641`)의 재계산·검증 로직을 파괴하지 않고, 이를 Revalidation Assignment Update 트리거의 **구현체로 승격**. 다축 트리거(Policy/Role/Org/Runtime)는 추가 신설(ADR D-1).
- **실재 과신 회피**: `:809`를 "이미 Revalidation이 있다"로 오판 금지(ADR D-7). 팀권한 축소 인라인 재클램프 ≠ 트리거 기반 access revalidation.
- **KEEP_SEPARATE**: ModelMonitor/Risk/SecurityAudit verify의 재검증(§2.3)을 재사용·개명 금지.
- **병행 유지**: 재검증 파이프라인 도입 전까지 매 요청 재계산이 사실상 즉시 반영을 보장 — 미구현이 회귀 유발하지 않음.
- **부재 과장 회피(ADR D-7)**: revalidation grep 0은 실측 부재. 단 `reclampTeamMembers`(`:809`)라는 영속 재계산 씨앗은 실재 — "전혀 없다"로 과장 금지, "이미 있다"로 과신도 금지(양방향 정직).

### 5.1 점진 수렴 로드맵 (무후퇴)

1. **씨앗 승격**: `reclampTeamMembers`(`:809`)를 Assignment Update 트리거 구현체로 일반화(팀권한 축소 외 축으로 확장), 기존 동작 무회귀.
2. **다축 트리거**: Policy/Role/Organization/Runtime Update 트리거 신설, 변경 즉시 관련 주체 Snapshot(§18) 재확정.
3. **연계·감사**: Drift(§23) 연계·access review 감사 결합, Policy Updated/Scope Narrowed 경고(SPEC §31).
- 각 단계는 기존 재클램프·게이트를 유지한 채 트리거 범위만 확장.

## 6. 완료 게이트

- Revalidation 5종 트리거(Policy/Role/Assignment/Organization/Runtime Update) 능동 재검증 구축.
- `reclampTeamMembers` 재클램프가 Assignment Update 트리거 구현체로 승격·일반화(무회귀).
- 변경 즉시 관련 주체 Snapshot(§18) 재확정 · Drift(§23) 연계 · Policy Updated/Scope Narrowed 경고(SPEC §31).
- 재검증-정합화(§25) 계층 분리 유지.
- Tenant 격리 회귀 0 · access review 시나리오 회귀 테스트 통과(SPEC §36).
- **선행 의존**: 재검증 결과 = Snapshot(§18), 편차 = Drift(§23) 선행. 본 편 **코드/DB 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.

### 6.1 테스트 전략 (SPEC §36 중 본 축 해당분)

- **Integration(access review)**: 5종 트리거 각각이 관련 주체를 정확히 재검증하는지 · Organization Update 시 집합 재검증이 누락 없는지.
- **Security**: 정책 강화 후 재검증이 즉시 실효를 좁히는지(권한 미회수 0) · `DELEGATION_EXCEEDED` 상한이 재검증 후에도 유지되는지.
- **Performance(Incremental)**: 집합 재검증이 델타만 재산출하는지(전량 재계산 회피).
- **Regression**: `reclampTeamMembers`(`:809`) 승격이 기존 팀권한 축소 동작을 바꾸지 않는지(무회귀).

### 6.2 인접 엔진 경계

Revalidation(eager 재산출)은 Cache Invalidation(§22 lazy 마킹)의 능동판이며, 재검증 결과는 Snapshot(§18)으로 확정되고 편차는 Drift(§23)로, 정합은 Reconciliation(§25)으로 넘어간다. `ModelMonitor`/`Risk` ML 재검증·`SecurityAudit` verify(감사 무결성)와 구분(§2.3). 근접물 `reclampTeamMembers`는 씨앗이지 완성형이 아님.

## 7. 반날조 인용 출처

- `backend/src/Handlers/TeamPermissions.php:641`·`:809` — 재클램프·assignable 검증 substrate(Ground-Truth ①)
- `backend/src/Handlers/UserAuth.php:364`·`:409` — plan 게이트·tenant 상속(Ground-Truth ①)
- `backend/src/PlanPolicy.php:19` — 정책 상수(Ground-Truth ①)
- `backend/src/Handlers/Keys.php:88` · `backend/src/Handlers/AdminMenu.php:323` — role/메뉴 정의(Ground-Truth ①)
- `backend/public/index.php:608` — runtime context 주입(Ground-Truth ①)
- `backend/src/Handlers/SecurityAudit.php:25`~`:31` — 해시체인 verify **KEEP_SEPARATE**(Ground-Truth ②)
- `ModelMonitor` · `Risk` — ML 재검증 **KEEP_SEPARATE**(Ground-Truth ②)

그 밖의 모든 Revalidation 거버넌스 로직은 **ABSENT**(grep 0). 실 엔진은 별도 승인세션(RP-track).
