# DSAR — Reviewer Delegation: Temporary/Permanent/OOO/Escalated Delegation (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §7(Reviewer Delegation)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §7은 §6에서 배정된 Reviewer가 검토 의무를 타인에게 위임하는 절차를 정의한다. 다루는 하위항목:

- **Temporary Delegation** — 기한이 명시된 일시 위임(예: 출장·휴가 기간).
- **Permanent Delegation** — 조직개편 등으로 검토 책임 자체가 영구 이전되는 경우.
- **OOO(Out-of-Office) Delegation** — 부재중 자동 위임 트리거(캘린더 연동 등).
- **Escalated Delegation** — Reviewer가 응답하지 않아 상위자에게 강제 위임되는 경우(SLA 미준수 대응).
- **핵심 제약**: 위임받은 자(delegate)는 **원 Reviewer의 권한을 초과할 수 없다** — 위임은 권한의 복제이지 확장이 아니다.

본 문서는 이 위임 체계의 실 substrate 부재를 확인하고, 기존 "권한 위임 상한(permission delegation cap)" 로직과의 개념적 근접성 및 차이를 명확히 구분한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(검토위임)**, 재활용 가능 동형 패턴 **PARTIAL** 존재

Ground-Truth ①에 "검토 책임(review duty)을 타인에게 위임"하는 substrate는 전무하다(grep 0). 다만 **개념적으로 동형인** 패턴이 별개 도메인(팀 멤버 권한 위임)에 존재한다: `TeamPermissions.php`의 권한 위임 상한 fail-closed 로직이다. 이는 "위임자가 자기 권한을 초과해 위임할 수 없다"는 동일한 수학적 제약(교집합/상한)을 이미 구현하고 있으나, **대상이 다르다** — TeamPermissions는 "업무 권한(write:*, scope 등)의 위임"이고 본 SPEC은 "검토 의무·검토 권한의 위임"이다. 두 개념은 구조적으로 유사하나 도메인이 다르므로 그대로 흡수하지 않고 **동형 규칙만 참고**한다(289차 후속에서 확정한 실결함 수정 — manager scope 위임상한 미구현 봉인 커밋과 동일 계열의 fail-closed 사고방식).

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Temporary Delegation(기한부) | ABSENT | grep 0. 기한부 위임 레코드 없음 |
| Permanent Delegation | ABSENT | grep 0 |
| OOO 자동위임(캘린더 트리거) | ABSENT | grep 0. 캘린더 연동 substrate 자체 없음 |
| Escalated Delegation(SLA 미응답) | ABSENT | grep 0. §9 Review Queue의 ESCALATED 상태 자체가 ABSENT이므로 연쇄 부재 |
| 위임 상한 fail-closed(원 권한 초과 금지) | PARTIAL(동형 패턴) | `TeamPermissions.php:641`(putMemberPermissions — assignable 교집합 계산 후 위반 시 403)·`:356`(scopeWithinCap) — 단 대상이 "업무 권한"이며 "검토 권한"이 아님. 그대로 재사용 불가, 계산 패턴만 참고 |
| 위임 이력 기록 | ABSENT | grep 0. 위임 자체가 없으므로 이력도 없음. 감사기록 인프라는 `SecurityAudit.php:12`가 존재하나 위임 이벤트를 기록한 적 없음 |
| 위임 철회(revoke) | ABSENT | grep 0. `TeamPermissions.php:517`(팀 status)·`:557`은 팀 멤버 상태전이이며 검토위임 철회가 아님 |

### 2.3 KEEP_SEPARATE

해당 없음 — 근접물(TeamPermissions 위임상한)은 이름 충돌형 KEEP_SEPARATE가 아니라 **재활용 가능한 동형 규칙**으로 §4·ADR D-5에서 명시적으로 참고 대상으로 지정한다. 단, "권한 위임(permission delegation)"과 "검토 위임(review delegation)"이라는 **개념 자체는 분리 유지**하며 동일 테이블·동일 API로 병합하지 않는다.

## 2.4 위임과 §6 Reviewer Governance의 관계

위임은 §6에서 이미 배정된 Reviewer/Owner/Officer 역할이 존재함을 전제한다. §6이 ABSENT(순신규)이므로 §7 위임 역시 배정할 원 역할 자체가 없어 논리적으로 선행 종속(BLOCKED_PREREQUISITE)이다. 이는 EPIC 06-A 전반의 계층 구조(Part 1→Part 3-7까지 전부 NOT_CERTIFIED)와 동일한 패턴이며, Part 3-8 내부에서도 §6→§7→§8→§9→§10 순으로 종속 사슬이 이어진다.

## 3. Canonical 설계

- **위임 테이블**(신규): `role_certification_reviewer_delegation` — `delegation_type`(TEMPORARY/PERMANENT/OOO/ESCALATED), `delegator_user_id`(원 Reviewer), `delegate_user_id`(위임받는 자), `scope_ref`(§6 reviewer_role의 scope 상속), `starts_at`, `ends_at`(TEMPORARY/OOO 필수), `created_by`, `revoked_at`.
- **상한 강제 규칙(fail-closed)**: `delegate_user_id`가 이미 보유한 역할 권한과 `delegator`의 검토 권한 범위의 **교집합만** 유효 위임 범위로 인정한다 — `TeamPermissions.php:356`(scopeWithinCap)의 계산 패턴을 참고하되 별도 함수로 신규 구현.
- **OOO 자동 트리거**: 외부 캘린더 연동이 부재하므로 1단계는 수동 등록(사용자가 부재 기간을 직접 입력)으로 시작하고, 자동화는 후속 범위로 명시(현 단계 미설계).
- **Escalated Delegation**: §9 Review Queue의 SLA 타이머 만료 시 자동 발동. 원 Reviewer 권한을 초과하지 않고, 에스컬레이션 대상은 조직상 상위자로 한정.
- **위임 체인 제한**: 위임의 재위임(A→B→C)은 최대 1단계로 제한(fail-secure, 무한 체인 방지).
- **위임 알림·확인**: 위임이 생성되면 delegate에게 통지되어야 하며, delegate가 명시적으로 수락하기 전까지는 PENDING 상태로 유효하지 않다(묵시적 위임 금지 — fail-secure).
- **Permanent Delegation과 §6 재배정의 관계**: Permanent Delegation은 사실상 §6 Reviewer Governance의 역할 재배정과 동일한 효과를 가지므로, 구현 시 별도 위임 레코드 대신 §6 `role_certification_reviewer_role`의 갱신으로 정규화할지 여부를 후속 설계 리뷰에서 결정한다(현 단계는 위임 레코드로 잠정 모델링).
- **위임 중 원 Reviewer 책임**: 위임 기간 중에도 원 Reviewer는 delegate의 판정에 대한 최종 책임을 진다(권한 이전이지 책임 이전이 아님) — 이는 SPEC §7의 핵심 제약(위임=권한 복제, 확장 아님)과 동일한 축이다.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| 위임 상한 계산 로직 패턴 | `TeamPermissions.php:641`(putMemberPermissions)·`:356`(scopeWithinCap)·`:423`(clampActions) | 승격 후보(패턴 참고, 코드 공유 아님) — ADR D-5 |
| 위임 레코드 신원 | `UserAuth.php:54`(app_user) | 승격 후보 |
| 위임 이력 기록처 | `SecurityAudit.php:12`·`:56`(verify) | 참조전용(흡수 아님, D-2) |
| 위임 테이블 자체 | 없음 | 신규 |
| OOO 트리거 | 없음 | 신규(1단계 수동, 자동화 미설계) |

## 4.1 위임 유형별 데이터 신선도 요구

| 위임 유형 | 갱신 주기 요구 | 근거 |
|---|---|---|
| Temporary | 종료일(ends_at) 도달 시 자동 만료 | `index.php:518` 계열 fail-secure 만료 패턴 참고 |
| Permanent | §6 역할 재배정 시점에 동기 갱신 | 위 2.4 참조 |
| OOO | 부재 종료 시 자동 만료(수동입력 1단계) | 신규 |
| Escalated | §9 Review Queue 종결 시 자동 소멸 | §9 문서 연동 |

## 5. 무후퇴 · Extend

- `TeamPermissions`의 상한 fail-closed 로직(289차 후속에서 실결함으로 봉인 완료된 manager scope 위임상한)은 무수정 보존한다. 본 설계는 그 로직을 **복사**하지 않고 **동일 원칙(교집합 상한)** 만 신규 도메인에 재적용한다.
- P1~P5(writeGuard 서버전역·featurePlan fail-secure·admin_roles 폐기·admin SSOT·세션토큰 hash-only)는 위임 신설과 무관하게 무후퇴 유지.
- 개념 분리 원칙(D-5): "권한 위임"과 "검토 위임"을 같은 API/테이블로 병합하는 리팩터링은 금지 — 두 도메인이 우연히 같은 수학적 제약(상한 교집합)을 공유할 뿐, 대상 리소스가 다르다.

## 6. 완료 게이트

- [ ] §6 Reviewer Governance CERTIFIED 선행 완료 (위임은 원 역할 존재를 전제)
- [ ] `role_certification_reviewer_delegation` 스키마 리뷰 승인
- [ ] 위임 상한 fail-closed 계산 규칙이 TeamPermissions와 동일 원칙임을 재검증(단, 코드 공유 아님)
- [ ] 위임 체인 1단계 제한 규칙 확정
- [ ] 위임 수락(명시적 확인) 절차 확정 — 묵시적 위임 금지 재검증
- [ ] Permanent Delegation과 §6 역할 재배정 간 정규화 방식 결정
- [ ] OOO 자동화는 별도 후속 범위로 명시적 분리(현 설계에 포함 안 함)
- [ ] 코드 변경 0 유지 확인
- [ ] 사용자 명시 승인 없이 구현 착수 금지

## 7. 반날조 인용 출처

- SPEC §7(Reviewer Delegation) / ADR D-1(Extend-Wrap) · D-2(SecurityAudit 참조) · D-5(Reviewer Delegation 상한 — 권한위임과 개념분리)
- Ground-Truth ① — 검토위임 substrate 없음(grep 0). 유일한 재활용 신호는 `TeamPermissions.php:641`/`:356`/`:423`(권한위임 상한, 289차 후속 실결함 봉인 대상)
- Ground-Truth ② — 해당 없음(이름 충돌형 KEEP_SEPARATE 없음)
- ABSENT 항목(Temporary/Permanent/OOO/Escalated Delegation, 위임 이력, 위임 철회)은 grep 0 실측이며, TeamPermissions 근접물을 "이미 구현됨"으로 과장하지 않았음을 명시. PARTIAL 판정은 오직 "위임 상한 계산 패턴"에 한정
