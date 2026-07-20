# DSAR — Approval Dynamic Role Revalidation (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Revalidation · 스펙 §25)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role Registry/Rule Engine·참조 편 `DSAR_APPROVAL_DYNAMIC_ROLE_DRIFT` 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · Revalidation은 재평가만 수행(무단 role 확대 금지) · 마케팅 automation 오흡수 금지(KEEP_SEPARATE·ADR D-4) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §25(Revalidation) = "Rule Update · User Attribute 변경 · Organization 변경 · Session 변경 · Policy 변경" 5종 트리거 발생 시 이미 활성화된 Dynamic/Runtime/Session Role을 재평가하는 절차. §24 Drift가 탐지하면 §25가 재검증을 실행한다(§31 Warning Contract "Runtime Review Required").

- **순신규 총평**: 재평가할 Dynamic Role 자체가 ABSENT(EXISTING_IMPLEMENTATION §1). "변경 발생 지점"은 일부 실재하나(팀배정/MFA enroll/세션 갱신), 그 변경이 role 재평가로 이어지는 배선은 grep 0.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | revalidation id | Revalidation PK |
| 2 | trigger type | §3 열거형(스펙 §25 원문) |
| 3 | subject id / session id | 대상 |
| 4 | drift id | 참조 편 §24 트리거 연동(있는 경우) |
| 5 | rule version id / policy version id | 재평가 기준 Version |
| 6 | previous decision | 이전 Rule Evaluation/Policy Decision(§9/§18) |
| 7 | new decision | 재평가 결과 |
| 8 | triggered at | 트리거 시각 |
| 9 | status | Revalidation 상태 |

## 3. 열거형 (Trigger Type — 스펙 §25 원문 그대로)

`Rule Update` · `User Attribute 변경` · `Organization 변경` · `Session 변경` · `Policy 변경`

## 4. 실 substrate 매핑 (ABSENT/근접)

| Trigger Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Rule Update | RBAC Rule Engine 자체 ABSENT | — | **ABSENT** |
| User Attribute 변경(근접) | data_scope 배정 변경(팀배정 관리작업)·MFA enroll 강제 | `TeamPermissions.php:774`·`UserAuth.php:1029-1036` | 근접(속성 변경 이벤트 자체는 실재)이나 변경 시 활성 role/decision을 재평가하는 로직 grep 0 — Dynamic Role 자체가 ABSENT하므로 재검증 대상 없음 |
| Organization 변경(근접) | team_role 배정 변경(관리작업) | `TeamPermissions.php:774` | 근접(팀 배정 변경 이벤트 실재)이나 재평가 트리거 로직 없음 |
| Session 변경(근접) | `user_session` 갱신(`recordSessionMeta`) — 세션 종료 시 role 재계산 없음 | `Db.php:1111-1119`·`UserAuth.php:4237,4243-4251` | 근접(세션 메타 갱신 실재)이나 Session Role(§12) 자체 ABSENT → 재검증할 대상 없음 |
| Policy 변경(근접) | 정적 rank 4곳 값(코드 배포로만 변경, 런타임 트리거 없음) | `TeamPermissions.php:236-322`·`index.php:572-598`·`PlanPolicy.php:19-22`·`AdminMenu.php:337-356` | 근접(정책값 자체는 실재)이나 값 변경을 감지해 재검증을 트리거하는 로직 grep 0 |

## 5. 설계 원칙

- Revalidation은 §24 Drift의 소비자로 설계(트리거 계약 공유) — Drift가 먼저 신설되어야 Revalidation의 트리거 신호원이 생긴다(참조 편 BLOCKED_PREREQUISITE와 연동).
- User Attribute/Organization 변경 이벤트(`TeamPermissions.php:774`·`UserAuth.php:1029-1036`)는 이미 실재하는 "변경 발생 지점"이므로, Revalidation 신설 시 이 지점에 재평가 훅을 추가한다(Extend). 단 재평가할 Dynamic Role 자체가 아직 없어 실제 결합은 후행.
- §10 Dynamic Role Activation Trigger(Login·MFA Success·Session Created·Organization Changed·Context Changed·Project Changed·Risk Changed·Manual Refresh)와 본 §25 트리거는 중복이 아니라 "최초 활성화"(§10) vs "이미 활성화된 role의 재검증"(§25)으로 역할이 분리된다 — 혼동 시 오설계.

## 6. Gap / BLOCKED_PREREQUISITE

- Rule Update 트리거 = 완전 ABSENT(Rule Engine 부재).
- User Attribute/Organization/Session/Policy 변경 = 근접 변경 이벤트 존재하나 재평가 로직·재평가 대상(Dynamic Role) ABSENT.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Dynamic Role Registry/Rule Engine·참조 편 Drift 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
