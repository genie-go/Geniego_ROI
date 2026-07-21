# DSAR — Exception Management (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §14(Exception Management)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §14는 정책상 불허되어야 할 배정을 **명시적 예외**로 등록해 일시적으로 허용하는 절차를 정의한다 — Exception ID·Exception Reason·Business Justification·Compensating Control·Expiration·Reviewer·Approver 7개 필드다. Exception Management가 없으면 Reviewer는 "정책 위반이지만 업무상 불가피한 배정"을 발견했을 때 (a) 정책을 영구히 완화하거나 (b) 무단으로 방치하는 양자택일에 몰린다. 본 문서는 7개 필드 각각의 실 substrate 유무를 정직하게 판정하고, 예외는 반드시 만료(Expiration)와 보상통제(Compensating Control)를 동반해야 한다는 fail-secure 원칙을 계약한다.

Exception Management는 정책 엔진의 "예/아니오" 이분법을 깨지 않으면서도 현실의 예외적 필요를 흡수하는 안전판이다. 안전판이 없으면 조직은 암묵적으로 정책을 우회(비공식 승인·문서화 없는 방치)하게 되고, 이는 감사 시점에 "왜 정책 위반 배정이 방치되었는가"라는 더 큰 리스크로 돌아온다. 따라서 Exception은 정책 위반을 없애는 것이 아니라 **가시화하고 시한을 부여**하는 것이 목적이다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(grep 0)**

Ground-Truth ①·②가 확정한 대로 "정책 위반 배정을 시한부로 승인하고 만료·보상통제를 강제하는" Exception Management 개념은 **grep 0**다. `exception`(정책예외)·`waiver`·`compensating control` 계열 매칭은 코드베이스에 존재하지 않는다. 근접해 보이는 유일한 후보는 `Alerting.php:571`의 `action_request` 결재 흐름이나, 이는 §2.3에서 설명하듯 마케팅 자동화 액션의 승인/거부이지 접근권한 정책 예외가 아니므로 재활용 가능한 substrate가 전혀 없는 **완전 그린필드**다.

### 2.2 하위항목 대조표

| SPEC §14 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Exception ID | ABSENT | 예외 레코드 식별자 스키마 grep 0 |
| Exception Reason | ABSENT | 예외 사유 분류(코드값) grep 0 |
| Business Justification | ABSENT | 사유 자유텍스트 필드 grep 0(§11 Evidence Collection의 Business Justification과 동일하게 부재 — 두 SPEC 절이 서로 다른 맥락에서 각각 신규 요구) |
| Compensating Control | ABSENT | 예외 승인 시 대체 통제(예: 추가 모니터링·단축 재인증 주기)를 강제하는 필드/로직 grep 0 |
| Expiration | ABSENT | 예외 자동 만료 필드 grep 0. `index.php:518`(api_key expires_at)·`UserAuth.php:141`(결제만료)은 자격증명/구독의 만료이지 "정책 예외"의 만료가 아니므로 대체 불가 |
| Reviewer | ABSENT | 예외를 심사하는 검토자 지정 필드 grep 0 |
| Approver | ABSENT | 예외를 최종 승인하는 승인자 지정 필드 grep 0. `Alerting.php:571`의 결재자는 마케팅 액션 승인자이지 정책예외 승인자가 아님(§2.3) |

### 2.3 KEEP_SEPARATE

- `Alerting.php:571`~`:723`(`action_request` decideAction/executeAction/approvals_json, 라우트 `routes.php:432`~`:434`)는 마케팅 자동화 캠페인 액션(예: 예산 조정·광고 중지)을 관리자가 결재하는 워크플로다. 승인/거부라는 형식만 유사할 뿐, 대상이 "접근권한 정책 위반의 시한부 허용"이 아니라 "마케팅 실행 액션"이므로 Exception Management로 흡수·개명하지 않는다.

### 2.4 판정 근거 상세 — 왜 Expiration이 자격증명 만료로 대체 불가한가

`index.php:518`(api_key expires_at)·`UserAuth.php:141`(결제만료)은 각각 "이 키/구독이 유효한 기간"을 관리하는 만료이며, 만료되면 해당 자격증명 전체가 무효화된다. 반면 Exception의 Expiration은 "이 특정 정책 위반이 허용되는 기간"이라는 훨씬 좁고 다른 축이다 — 배정 자체는 만료되지 않고 계속 유효하되, 그 배정이 정책 위반 상태로 남아있을 수 있는 기간만 제한된다. 두 개념을 같은 필드로 취급하면 정상 자격증명 만료와 정책예외 만료가 뒤섞여 감사 추적이 불가능해지므로 명확히 분리한다.

## 3. Canonical 설계

### 3.1 레코드 구조·신청 차단 규칙

Exception 레코드는 `{exception_id, assignment_id, reason_code, business_justification, compensating_control, expires_at, reviewer_id, approver_id, created_at}`로 구성된다. 정책 엔진이 배정을 위반으로 판정했을 때, Reviewer는 즉시 회수하는 대신 Exception을 신청할 수 있으나 **Compensating Control과 Expiration 없이는 신청 자체가 거부**된다(fail-secure — 보상통제·만료 없는 예외는 정책 무력화와 동일하므로 시스템이 차단).

### 3.2 승인 상한·만료 후 처리

Approver는 원 정책을 설정한 권한(또는 그 이상)을 가진 자여야 하며(D-5와 동형 — 예외 승인이 원 정책 상한을 넘는 권한을 창출할 수 없음), Expiration 도래 시 자동으로 재평가 큐(§13 Recertification)에 삽입되어 연장하지 않으면 원 정책대로 회수(Remediation §15)된다. 연장(Extension)은 신규 Exception 레코드 생성으로만 처리하며 기존 레코드의 `expires_at`을 직접 수정하지 않는다(D-4 불변성과 동형 원칙 적용).

### 3.3 감사 연동

Exception은 SecurityAudit에 생성·연장·만료 각 이벤트가 append-only 기록된다(D-2 참조). 이는 "언제 예외가 신청·승인·연장·소멸했는지"를 사후에 변조 없이 재구성 가능하게 하며, Compliance 감사 시 Exception 목록 자체가 정책 위반 노출 지도(map) 역할을 한다.

## 4. Kernel/substrate 매핑

| SPEC §14 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Exception ID·Reason·Justification·Compensating Control·Reviewer·Approver | 없음 | 완전 신규 |
| Expiration 집행(만료 도래 시 회수) | `Keys.php:135`(revoke)·`UserAdmin.php:338`(is_active) | 참조만(예외 만료 시 최종 집행 액션으로 재사용, 예외 스키마 자체는 신규) |
| 감사 기록 | `SecurityAudit.php:12` | 승격(참조·이중기록, D-2) |
| 승인 상한 규칙 | `TeamPermissions.php:641`(assignable 교집합·403 차단 패턴) | 참조(동형 fail-closed 규칙, D-5) |

7개 필드 중 5개(ID·Reason·Justification·Compensating Control·Reviewer)가 완전 신규이고, 나머지 2개(Expiration·Approver)조차 형태만 참조 가능한 수준이므로 Exception Management는 §11~§27 Part 3-8 하위 DSAR 5편 중에서도 재활용 가능 substrate가 가장 적은 축에 속한다. 이는 예외관리가 본질적으로 "정상 배정 상태"가 아니라 "위반의 시한부 관리"라는, 현재 시스템 어디에도 대응 개념이 없는 새로운 상태 공간을 다루기 때문이다.

## 5. 무후퇴 · Extend

`Alerting.php:571`의 `action_request` 결재 워크플로는 마케팅 자동화 도메인에서 원래 목적대로 변경 없이 유지되며, Exception Management 설계·구현 어느 단계에서도 흡수·개명되지 않는다(D-6 KEEP_SEPARATE). `Keys.php:135`·`UserAdmin.php:338`의 수동 revoke 액션은 Exception 만료 시의 최종 집행 수단으로 **참조만** 되며 함수 시그니처나 호출 계약이 변경되지 않는다. `TeamPermissions.php:641`의 위임 상한 검증 패턴(assignable 교집합 초과 시 403)은 Approver 상한 규칙 설계에 참조되나 TeamPermissions 자체의 동작은 그대로 유지된다.

## 6. 완료 게이트

- [ ] Part 1~3-7 선행 계보 CERTIFIED 완료 — 현재 BLOCKED_PREREQUISITE
- [ ] Exception 레코드 스키마(7필드) 신규 설계·구현
- [ ] Compensating Control·Expiration 필수 입력 검증(누락 시 신청 거부) 구현
- [ ] Approver 상한 규칙(D-5 동형 fail-closed) 구현
- [ ] Expiration 도래 시 Recertification 큐 자동 삽입 + Remediation 연동 구현
- [ ] SecurityAudit 이중 기록(생성/연장/만료 이벤트) 연동
- [ ] 연장(Extension)을 신규 레코드 생성으로 처리하는 불변성 규칙 구현(기존 레코드 직접수정 금지)
- [ ] Exception Expiration ≠ 자격증명 만료(index.php:518·UserAuth.php:141) 개념 분리 문서화·구현 검증
- [ ] 코드 변경 0 유지 확인(본 문서는 설계 명세만)
- [ ] 코드 배포·인증(CERTIFIED) 전환 없음 확인

## 7. 반날조 인용 출처

- SPEC §14(Exception Management: Exception ID/Reason/Justification/Compensating Control/Expiration/Reviewer/Approver)
- ADR D-2(SecurityAudit 참조·흡수아님) · D-5(위임 상한 fail-closed) · D-6(KEEP_SEPARATE) · D-7(정직분리)
- Ground-Truth ① §2-B(회수 수동: `Keys.php:135`·`UserAdmin.php:338`) · §2-D(위임: `TeamPermissions.php:641`)
- Ground-Truth ② §4(KEEP_SEPARATE — 마케팅 approval: `Alerting.php:571`)
- ABSENT 항목(Exception ID·Reason·Justification·Compensating Control·Expiration·Reviewer·Approver 전체)은 grep 0 실측 — `Alerting.php` action_request로 채우지 않음(마케팅 결재이지 정책예외 아님)
- 본 문서는 §13(Recertification)·§27(Certification Evidence Storage) DSAR과 인접하며, Exception 만료 시 Recertification 큐로 분기하고 Exception 이벤트는 §27 Approval Chain의 일부로 저장될 수 있으나 세 문서는 각자 별도 상태머신이다(교차 재인용 시에도 신규 파일:라인 창작 금지)
