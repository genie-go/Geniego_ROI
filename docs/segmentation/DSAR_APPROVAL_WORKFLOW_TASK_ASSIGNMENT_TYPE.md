# DSAR — Task Assignment Type (§37 Type 축)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §37 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Assignment Type 축 | `assignment_type` **grep 0** — 배정 유형 개념 전무 | `NOT_APPLICABLE`(부재 → 신설) |
| 배정 자체 | 현행 승인 4종 전부 **후보 지정 없음** — 아무 유효 행위자나 승인 가능(`Mapping::approve` 는 자기승인·중복승인만 차단하고 **후보 검증 없음** Mapping.php:238-294) | `NOT_APPLICABLE` |
| 역할 기반 해석 | `team_role` owner/manager/member(TeamPermissions.php:13) · API 키 `viewer<connector<analyst<admin`(index.php) — **인가 판정용이지 배정용 아님** | `LEGACY_ADAPTER`(해석 소스) |
| 그룹 기반 해석 | `team` 테이블(TeamPermissions.php:145,168) + `app_user.team_id`(:22) | `LEGACY_ADAPTER` |
| 조직 기반 해석 | `TEAM_TYPES` 17종(TeamPermissions.php:43-48) | `LEGACY_ADAPTER` |
| 라운드로빈 | `round_robin`·`round-robin` **grep 0** | `NOT_APPLICABLE` |
| 부하분산 | `load_balanc` **grep 0** | `NOT_APPLICABLE` |
| 위임(Delegation) | `DELEGATION_EXCEEDED`(TeamPermissions.php:645) + `assignableMap` 교집합 검증(:354,604,628-637) — **권한 위임 상한 강제**이지 Task 대결(代決) 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 대결자(Substitute) | `substitute` **grep 0** | `NOT_APPLICABLE` |

**★축 주의 — `delegation` 이름 일치의 함정.** `TeamPermissions` 의 "위임"은 **관리자가 팀원에게 권한을 부여할 때 자기 권한을 초과하지 못하게 하는 상한 강제**다(TeamPermissions.php:21-25). 원문 `DELEGATION_REFERENCE` 는 **배정된 Task 를 다른 사람이 대신 처리하도록 넘기는 것**이다. **이름이 같고 의미가 다르다** — 8회차에 BPMN grep 0 을 "워크플로 엔진 부재"로 확대 해석했다가 JourneyBuilder 로 뒤집힌 것의 **정반대 실수**(이름 일치를 능력 일치로 오독)에 해당한다. 커버로 계산 금지.

**★후보 검증 부재의 실증.** 원문 §37 이 14종 배정 유형으로 "누가 후보인가"를 정의하려는 이유가 현행에 실재한다: `Mapping::approve` 는 **위조불가 신원 → 자기승인 차단 → dedup → 비-pending 409 → 정족수** 5단을 갖추었으나(Mapping.php:245-290), **"이 사람이 이 건의 승인 후보인가"는 어디서도 묻지 않는다.** 즉 **테넌트 내 유효 신원이면 누구나 승인 가능**하다. 정족수는 REAL 이지만 후보군은 열려 있다.

## 1. 원문 전사 + 판정 — **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | DIRECT | 부재 — 특정 주체 직접 배정 없음 | `NOT_APPLICABLE` |
| 2 | ROLE_BASED | 부재(배정) · 해석 소스 = `team_role`(TeamPermissions.php:13) · API 키 role(index.php RBAC) | `LEGACY_ADAPTER` |
| 3 | GROUP_BASED | 부재(배정) · 해석 소스 = `team` + `app_user.team_id`(TeamPermissions.php:145,22) | `LEGACY_ADAPTER` |
| 4 | ORGANIZATION_BASED | 부재(배정) · 해석 소스 = `TEAM_TYPES` 17종(TeamPermissions.php:43-48) | `LEGACY_ADAPTER` |
| 5 | RESOURCE_OWNER | 부재 · 인접 = `DATA_SCOPES` 의 `own`(TeamPermissions.php:41) — **데이터 필터이지 배정 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 6 | REQUESTER_MANAGER_REFERENCE | 부재 · 인접 = `team.manager_user_id`(TeamPermissions.php:145,22) — **관리자 지정은 있으나 요청자→관리자 도출 경로 없음** | `LEGACY_ADAPTER`(참조 유형) |
| 7 | CASE_OWNER | 부재 — Case 개념 자체 부재(§36 `approval_case_id` 참조) | `NOT_APPLICABLE` |
| 8 | ROUND_ROBIN_REFERENCE | **grep 0** | `NOT_APPLICABLE` |
| 9 | LOAD_BALANCED_REFERENCE | **grep 0** | `NOT_APPLICABLE` |
| 10 | POLICY_RESOLVED | 부재 — 정책 해석 배정 없음. 현행은 **코드 상수**(`required_approvals` 리터럴 `2` Mapping.php:209 · `Alerting:562` 응답 리터럴 `2`) | `NOT_APPLICABLE` |
| 11 | MANUAL | 부재 | `NOT_APPLICABLE` |
| 12 | DELEGATION_REFERENCE | 부재(Task 대결) · **이름만 일치** = `DELEGATION_EXCEEDED`(TeamPermissions.php:645)는 **권한 부여 상한**(§0 축 주의 참조) | `KEEP_SEPARATE_WITH_REASON` |
| 13 | SUBSTITUTE_REFERENCE | **grep 0** | `NOT_APPLICABLE` |
| 14 | SYSTEM | 부재(배정) · 인접 = 워커 자동 선점(`Omnichannel::claimBatch` Omnichannel.php:394-423 · `claim_id`) — **잡 선점이지 Human Task 배정 아님** | `KEEP_SEPARATE_WITH_REASON` |

**실측 개수: 14 / 14 전사.** 커버리지 = 부재(`NOT_APPLICABLE`) 6 · 인접 위임(`LEGACY_ADAPTER`) 5 · 도메인 분리(`KEEP_SEPARATE_WITH_REASON`) 3 · **현행 충족 0**.

## 2. 규칙

- 🔴 **`DELEGATION_REFERENCE` 를 `TeamPermissions` 위임으로 매핑 금지.** 이름 일치 ≠ 능력 일치. 권한 부여 상한(TeamPermissions.php:645)과 Task 대결은 다른 능력이다. **부재증명은 이름이 아니라 능력으로 한다** — 능력으로 대조한 결과 **부재**다.
- 🔴 **`SYSTEM` 을 워커 `claim_id` 로 매핑 금지.** `Omnichannel::claimBatch`(Omnichannel.php:394-423)는 **워커가 메시지를 집는 것**이지 **시스템이 사람에게 Task 를 배정하는 것**이 아니다. 형태 유사를 커버로 계산하면 역산이다.
- 🔴 **`ROLE_BASED`/`GROUP_BASED`/`ORGANIZATION_BASED` 3종의 해석은 `TeamPermissions` 에 위임하고 재구현 금지.** 승인 도메인이 자체 역할·그룹·조직 테이블을 만들면 **권한 모델 2벌** = AL-19 위반. Assignment 는 `team_role`/`team.id`/`team_type` 을 **참조 키로만** 보유한다.
- **`*_REFERENCE` 접미 5종**(`REQUESTER_MANAGER_REFERENCE`·`ROUND_ROBIN_REFERENCE`·`LOAD_BALANCED_REFERENCE`·`DELEGATION_REFERENCE`·`SUBSTITUTE_REFERENCE`)은 **참조 유형** — §37 원문이 `상세 계층·Delegation은 후속 단계에서 확장한다` 라고 명시하므로 **본 단계에서 상세 구현 금지·참조만 확정**한다. 지금 구현하면 후속 단계와 충돌한다.
- **`POLICY_RESOLVED` 는 §37 의 핵심 결번이다.** 현행 4종 전부 "누가·몇 명·어떤 순서"가 **코드 상수**이므로(Mapping.php:209 · Alerting.php:562 · AdminGrowth 단일결재 암묵) 정책 해석 배정은 **진짜 신설**이다 — 인접 자산으로 대체 불가.
- 🔴 **6종 "있다고 가정"하고 배선 금지.**
- ⚠️ **후보 검증 부재를 잊지 마라.** 14종 중 무엇을 구현하든, 그 결과가 **`Mapping::approve` 의 승인 경로에 실제로 질의되지 않으면** 배정은 장식이 된다 — `acl_permission` 의 `approve` 동작이 부여되고도 판독 0인 것(§37 본문 `authorization precheck` `CONTRACT_ONLY`)과 **같은 실패 형태**다.
