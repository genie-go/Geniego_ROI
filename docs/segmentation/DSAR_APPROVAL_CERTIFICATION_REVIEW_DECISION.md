# DSAR — Review Decision: Approve/Reject/Revoke/Reduce Scope/Reduce Permission/Escalate/Request Evidence/Request Revalidation (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §10(Review Decision)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §10은 §9 Review Queue의 IN_REVIEW/WAITING_EVIDENCE 상태에서 리뷰어(§6)가 내릴 수 있는 **판정(Decision) 종류**와 그 판정이 실제 시스템에 어떻게 집행(Remediation)되는지를 정의한다. 8종 Decision:

- **Approve** — 현 접근권한을 그대로 유지.
- **Reject** — 최초 배정 자체를 무효화(§New 트리거 대상에 한함).
- **Revoke** — 기존 접근권한을 회수.
- **Reduce Scope** — 접근 가능한 데이터/리소스 범위를 축소.
- **Reduce Permission** — 수행 가능한 액션(읽기/쓰기 등)을 축소.
- **Escalate** — 스스로 판정하지 않고 상위자에게 결정을 위임(§9 ESCALATED와 연동).
- **Request Evidence** — 판정 보류 후 추가 증빙 요청(§9 WAITING_EVIDENCE와 연동).
- **Request Revalidation** — 일정 기간 후 재검토를 예약(즉시 판정 대신 지연 확인).

본 문서는 이 8종 Decision 자체의 실 substrate 부재를 확인하고, Decision이 실제로 시스템 상태를 바꾸는 **실행(Remediation) 단계**에서 재활용 가능한 기존 액션(회수·범위축소 API)을 매핑하며, Decision 기록의 불변성 요구(ADR D-4)를 명시한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**(Decision 개념·기록 자체), 실행 수단은 **PARTIAL** 재활용 가능

Ground-Truth ①에 "access certification review의 8종 판정을 내리고 기록하는" substrate는 전무하다(grep 0). 그러나 판정이 실제로 **집행**될 때 호출할 실행 수단(회수 API, 권한 축소 API)은 이미 다른 목적(수동 관리자 조작)으로 존재한다. 즉 "판정을 내리는 계층(Decision)"은 순신규이지만 "판정을 실행에 옮기는 계층(Remediation)"은 기존 API를 **재사용**할 수 있다 — 이는 289차 후속 원칙(재구현 금지·기존 확장)에 부합하는 설계 방향이다. Decision 자체의 기록은 `SecurityAudit`에 append하며 대체 엔진을 신설하지 않는다(ADR D-4, D-2).

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Approve(판정 자체) | ABSENT | grep 0. "검토 결과 유지 승인"을 기록하는 구조 없음 |
| Reject(최초배정 무효화) | ABSENT | grep 0 |
| Revoke(판정 자체) | ABSENT(판정) / PARTIAL(실행수단) | 판정 개념은 grep 0. 실행 수단은 `Keys.php:135`(revoke)·`UserAdmin.php:338`(is_active 비활성화)·`:342`(세션 revoke) — 전부 관리자 수동 조작이며 review decision에서 자동 호출되지 않음 |
| Reduce Scope(범위축소) | ABSENT(판정) / PARTIAL(실행수단) | 판정 개념은 grep 0. 실행 수단은 `TeamPermissions.php:356`(scopeWithinCap) — scope 상한 교집합 계산 로직이나, review decision의 "축소 집행"용으로 호출되는 배선은 없음 |
| Reduce Permission(액션축소) | ABSENT(판정) / PARTIAL(실행수단) | 판정 개념은 grep 0. 실행 수단은 `TeamPermissions.php:423`(clampActions) — 액션 목록 클램프 로직이나 마찬가지로 review decision 배선 없음 |
| Escalate | ABSENT | grep 0. §9 ESCALATED 상태 자체가 ABSENT이므로 연쇄 부재 |
| Request Evidence | ABSENT | grep 0 |
| Request Revalidation(재검토 예약) | ABSENT | grep 0 |
| Decision 불변 기록 | ABSENT(판정 기록) / PARTIAL(기록 인프라) | 판정을 기록할 구조는 grep 0이나, 기록 인프라 자체(append-only 해시체인)는 `SecurityAudit.php:12`(클래스)·`:56`(verify)·`:27`(prev_hash)·`:63`(hash_chain)로 이미 존재 — ADR D-4가 이를 참조하도록 지정 |
| Decision→Remediation 자동집행 배선 | ABSENT | grep 0. 실행 수단(Keys.php:135 등)은 존재하나 Decision으로부터 자동 트리거되는 배선은 없음 |

### 2.3 KEEP_SEPARATE

해당 없음 — 본 SPEC의 재활용 후보(Keys.php:135, UserAdmin.php:338, TeamPermissions.php:356/:423)는 이름 충돌형 오탐이 아니라 §4에서 **의도적으로 재사용을 설계**하는 실행 수단이다. 다만 이들은 현재 "관리자가 수동으로 호출"하는 용도로 존재하며, Decision 계층이 이를 **대체**하는 것이 아니라 **호출자**가 되는 관계임을 명확히 한다(원 API 자체는 무수정).

## 2.4 Decision 8종 요약

| Decision | §9 큐 결과상태 | 실행(Remediation) 필요 여부 |
|---|---|---|
| Approve | APPROVED | 없음 |
| Reject | REVOKED(신규배정 무효화로 처리) | 있음(§Revoke와 동일 경로) |
| Revoke | REVOKED | 있음(Keys.php/UserAdmin.php) |
| Reduce Scope | APPROVED(축소조건부) | 있음(TeamPermissions.php:356) |
| Reduce Permission | APPROVED(축소조건부) | 있음(TeamPermissions.php:423) |
| Escalate | ESCALATED(상태 유지, 판정 아님) | 없음 |
| Request Evidence | WAITING_EVIDENCE(상태 유지) | 없음 |
| Request Revalidation | CLOSED + 신규 트리거 예약 | 없음(직접), 있음(예약된 재검토 시점에) |

## 3. Canonical 설계

- **Decision 테이블**(신규): `role_certification_decision` — `queue_id`(§9 연동), `decision_type`(APPROVE/REJECT/REVOKE/REDUCE_SCOPE/REDUCE_PERMISSION/ESCALATE/REQUEST_EVIDENCE/REQUEST_REVALIDATION), `decided_by`(§6 Reviewer), `decided_at`, `rationale`(사유, Officer override 시 필수), `remediation_ref`(집행 API 호출 결과 참조), `revalidation_due_at`(REQUEST_REVALIDATION 전용).
- **Decision→Remediation 매핑(신규 배선, 기존 API 재사용)**:
  - REVOKE → `Keys.php:135`(키 회수) 또는 `UserAdmin.php:338`(계정 비활성화)·`:342`(세션 강제 종료) 호출.
  - REDUCE_SCOPE → `TeamPermissions.php:356`(scopeWithinCap) 재계산 후 축소된 scope 적용.
  - REDUCE_PERMISSION → `TeamPermissions.php:423`(clampActions) 재계산 후 축소된 액션 목록 적용.
  - APPROVE/REJECT/ESCALATE/REQUEST_EVIDENCE/REQUEST_REVALIDATION → 실행 API 호출 없음(순수 상태 기록, §9 큐 상태 전이만 유발).
- **불변 기록(ADR D-4)**: 모든 Decision은 `SecurityAudit`에 append하며, 사후 수정·삭제 불가(append-only). Decision 정정이 필요한 경우 새 Decision(REQUEST_REVALIDATION 등)을 추가로 기록하는 방식으로만 허용.
- **fail-secure**: Remediation 호출이 실패(API 오류)할 경우 Decision을 CLOSED로 전이시키지 않고 §9 큐를 IN_REVIEW로 되돌려 재시도를 강제한다 — 판정은 기록되었으나 미집행 상태로 방치되는 것을 방지.
- **Reject 특수 취급**: Reject는 §New 트리거로 생성된 신규 배정에만 적용 가능하며, 이미 오래 사용된 기존 권한에는 Revoke를 사용한다(Reject는 "배정 자체가 잘못됨", Revoke는 "정당했으나 이제 회수").
- **Request Revalidation의 기본 재검토 주기**: 명시적 기간이 없으면 테넌트 기본 정책(예: 90일)을 따르며, 재검토 예약은 §8 Review Assignment의 신규 트리거로 다시 진입한다(무한루프 방지를 위해 재검토 자체가 새 Modified류 트리거로 취급됨).
- **Officer override 표시**: Security/Compliance Officer가 Reviewer 원 판정을 override하는 경우 `decision_type`은 override 결과를 반영하되 원 판정 레코드는 삭제하지 않고 별도 레코드로 append(불변성 보존, D-4).

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Revoke 실행 | `Keys.php:135`(revoke)·`:155`(rotate)·`:119`(스키마)·`UserAdmin.php:338`(is_active)·`:342`(세션 revoke) | 승격(호출자 신설, 원 API 무수정) |
| Reduce Scope 실행 | `TeamPermissions.php:356`(scopeWithinCap) | 승격(호출자 신설) |
| Reduce Permission 실행 | `TeamPermissions.php:423`(clampActions) | 승격(호출자 신설) |
| Decision 불변 기록 | `SecurityAudit.php:12`·`:56`(verify)·`:27`(prev_hash)·`:63`(hash_chain)·`:68`(broken_at) | 참조전용(흡수 아님, D-2·D-4) |
| Decision 판정 자체(8종 타입) | 없음 | 신규 |
| Decision→Remediation 배선 | 없음 | 신규 |

## 5. 무후퇴 · Extend

- `Keys.php`의 revoke/rotate, `UserAdmin.php`의 계정 비활성화·세션 종료, `TeamPermissions`의 scopeWithinCap/clampActions는 **원 API 그대로 무수정 보존**한다. Decision 계층은 이 API들의 새로운 **호출 경로**를 추가할 뿐, 기존 관리자 수동 조작 경로를 대체하지 않는다(양쪽 다 공존).
- `SecurityAudit`은 대체하지 않고 Decision의 기록처로만 참조한다(D-2). "메뉴 감사로그 hash_chain은 tamper-evident가 아니다"(289차 확정, `AdminMenu.php:123` 계열과는 무관 — 이는 verify() 실 구현이 있는 `SecurityAudit::verify()` 경로만 사용).
- 289차 후속 실결함(manager scope 위임상한 미구현 봉인, 평문 토큰 5종 at-rest 해시화)은 본 Decision 설계와 독립적으로 이미 조치되었으며 재작업하지 않는다.
- P1~P5 무후퇴 유지. §6·§9가 CERTIFIED 되기 전까지 Decision은 호출될 큐 항목 자체가 없으므로 설계만 유효.

## 6. 완료 게이트

- [ ] §6 Reviewer Governance, §9 Review Queue 선행 CERTIFIED (Decision은 이 둘의 산출물을 소비)
- [ ] `role_certification_decision` 스키마 + Decision→Remediation 배선 계약(ADR D-3) 리뷰 승인
- [ ] Remediation 실패 시 fail-secure 재시도 규칙 확정
- [ ] SecurityAudit append-only 기록 경로(D-4) 재검증 — verify() 실 구현 경로만 사용, 장식적 hash_chain과 혼동 금지
- [ ] Keys.php/UserAdmin.php/TeamPermissions.php 기존 API 호출 계약(파라미터·권한) 재확인
- [ ] Reject/Revoke 구분 기준 및 Request Revalidation 기본 재검토 주기 확정
- [ ] Officer override의 불변 기록 방식(원 판정 보존 + 별도 append) 재검증
- [ ] 코드 변경 0 유지 확인
- [ ] 사용자 명시 승인 없이 구현 착수 금지

## 7. 반날조 인용 출처

- SPEC §10(Review Decision) / ADR D-1(Extend-Wrap) · D-2(SecurityAudit 참조) · D-3(상태전이/Decision 배선 계약) · D-4(Attestation/Evidence 불변)
- Ground-Truth ① — 8종 review decision 판정·기록 substrate 없음(grep 0). 실행 수단은 `Keys.php:135`, `UserAdmin.php:338`·`:342`, `TeamPermissions.php:356`·`:423`로 재활용 가능
- Ground-Truth ② — 해당 없음(이름 충돌형 KEEP_SEPARATE 없음, 전부 의도적 재사용 대상)
- ABSENT 판정 항목(8종 Decision 타입 자체, Decision→Remediation 자동배선)은 grep 0 실측이며, 기존 실행 API(Keys.php, TeamPermissions.php)의 존재를 "Decision 계층이 이미 구현됨"으로 과장하지 않았음을 명시
