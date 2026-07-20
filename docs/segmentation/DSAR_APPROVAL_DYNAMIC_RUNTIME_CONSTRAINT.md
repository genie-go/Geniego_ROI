# DSAR — Dynamic Runtime Constraint 승인 (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Runtime Constraint · 스펙 §16)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · PEP≠PDP(§19와 혼동 금지) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §16 Runtime Constraint는 §14 Runtime Permission Projection(Static Permission·Dynamic Permission·Runtime Constraint·Runtime Scope)의 하위 요소로서, Policy Decision(§18)이 Permit을 내릴 때 **함께 부착되는 제약**(예: "쓰기 가능하나 Read Only로 제한"·"승인 가능하나 금액 상한 이하만")을 표현한다. 유형: Read Only · Amount · Time · Device · Network · Session.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | constraint id | Runtime Constraint 식별자 |
| 2 | subject id / role binding | 제약이 적용되는 Subject 또는 활성 Dynamic Role |
| 3 | constraint type | 아래 §3 열거형 |
| 4 | value / threshold | 제약값(예: Amount 상한, Time 윈도) |
| 5 | scope binding | 제약이 유효한 Scope(§15 Runtime Scope Projection과 결합) |
| 6 | source policy decision | 이 제약을 부착한 Policy Decision(§18) 참조 |
| 7 | evaluated at | 산출 시각 |
| 8 | status | 활성/만료 |

## 3. 열거형 / 타입

**Constraint Type**(스펙 §16 원문): `READ_ONLY` · `AMOUNT` · `TIME` · `DEVICE` · `NETWORK` · `SESSION`

## 4. 실 substrate 매핑 (ABSENT)

| Constraint Type | 근접 substrate 탐색 | 판정 |
|---|---|---|
| READ_ONLY | grep 0 — "role/permission에 부착된 읽기전용 제약"은 EXISTING_IMPLEMENTATION 어디에도 등장하지 않음 | **ABSENT** |
| AMOUNT | 없음. ★반날조 준수 — 이번 Part 3-5 ground-truth 2편에는 금액 임계치(예: 고액 승인 게이트) file:line 인용이 등장하지 않는다. `Catalog.php:1000`은 EXISTING_IMPLEMENTATION §3에 ABAC data_scope 소비처로만 인용되어 있으며(`TeamPermissions.php:236-322` 행필터의 소비 도메인), 금액 임계치 게이트로서 인용된 바 없다 — 지어내지 않고 ABSENT로 판정 | **ABSENT** |
| TIME | 스펙 §7 예시("BusinessHours=TRUE")는 Rule Expression 예시 문구일 뿐 실 구현 아님. `auth_audit_log.at`(EXISTING_IMPLEMENTATION §4 table·`UserAuth.php:4165`)은 로그인 타임스탬프 **기록**이지 "제약으로서의 Time"이 아님(role/permission 미연결) | **ABSENT** |
| DEVICE | EXISTING_IMPLEMENTATION §4 table: "device/network 부재(컬럼 없음·`user_session.ip/ua`만 표시용)" | **ABSENT** |
| NETWORK | 동일 — `user_session.ip/ua`는 표시용(§5 `listSessions`·`UserAuth.php:4254-4281`)이며 네트워크 기반 제약 로직 없음 | **ABSENT** |
| SESSION | `user_session`(EXISTING_IMPLEMENTATION §5 `Db.php:1111-1117`)은 세션 레코드 자체이지 "세션 범위로 한정된 권한 제약"이 아님. Session Role(§12) 자체가 ABSENT(EXISTING_IMPLEMENTATION §1: dynamic/session/conditional role grep 0)이므로 Session Constraint도 결합 대상 부재 | **ABSENT** |

## 5. 설계 원칙

- Runtime Constraint는 Policy Decision(§18)의 **산출물 부속물**이지 독립 판정 로직이 아니다 — §18이 ABSENT(EXISTING_IMPLEMENTATION §6·§10)인 이상 이를 소비하는 §16도 선행 없이는 의미를 갖지 못한다(설계만 가능·평가 불가).
- MFA/session/risk/env 속성 필드가 "존재하나 role 활성 입력 아님"(ADR D-1 ATTRIBUTE_SOURCE 분류·EXISTING_IMPLEMENTATION §4)과 동일한 원칙이 Constraint에도 적용된다 — 컬럼 존재 ≠ 제약 결합. 신설 시 §14 Dynamic Permission Projection과 함께 Policy Decision(§18) 산출물에 결합해야 하며, 개별 컬럼을 제약으로 오인해 즉흥 결합 금지.
- Amount 제약은 향후 조립 시에도 **이번 ground-truth에 근거가 없는 임계치를 임의로 지어내지 않는다** — 실 구현 세션에서 Catalog/고액승인 도메인을 별도 grep 재실증한 뒤에만 근접 substrate로 승격 가능.

## 6. Gap / BLOCKED_PREREQUISITE

- 6개 Constraint Type 전부 ABSENT(근접 substrate조차 인용 불가 — 컬럼 존재분도 role/permission 미연결).
- 상위 §14 Runtime Permission Projection·§18 Policy Decision이 모두 ABSENT라 Constraint 부착 대상 자체가 부재(BLOCKED_PREREQUISITE 이중).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
