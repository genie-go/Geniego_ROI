# DSAR — Escalation Engine: Reviewer → Manager → Security → Compliance → Executive (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §19(Escalation Engine)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §19는 Review SLA(§17)의 Escalation SLA가 초과되었을 때, 미해결 검토건을 고정된 5단계 조직 위계로 순차 상향 이관하는 엔진을 정의한다: Reviewer → Manager → Security → Compliance → Executive. 본 DSAR은 "권한검토 미해결 건을 조직 위계로 상향 이관하는" 이 5단계 순서가 GeniegoROI 현행 코드에 존재하는지를 판정하고, 이름이 유사한 다른 도메인의 에스컬레이션(상품리뷰·마케팅 결재)과 명확히 분리한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ①·②의 공통 결론: **접근권한 검토 에스컬레이션은 grep 0**다. Review Queue(§9)·Reviewer Governance(§6)·Review SLA(§17) 자체가 ABSENT이므로 "미해결 검토건"이라는 대상 자체가 존재하지 않는다(구조적 필연). Reviewer→Manager→Security→Compliance→Executive라는 5단계 고정 위계 이관 로직은 어떤 도메인에서도 발견되지 않는다 — 유일하게 이름이 겹치는 두 코드 지점(`Reviews.php:179`의 `escalateNegatives`, `action_request` 결재)은 전혀 다른 목적을 가진다.

### 2.2 하위항목 대조표

| SPEC §19 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| 1단계 Reviewer(초기 담당) | **ABSENT** | Review Assignment(§8)·Queue(§9) grep 0 — 담당 리뷰어 개념 자체 부재 |
| 2단계 Manager 이관 | **ABSENT** | 조직 위계 기반 자동 이관 grep 0. `TeamPermissions.php`의 manager/owner 개념은 권한 위임 상한 계산용이지(§2.3 참조) 에스컬레이션 수신자 결정 로직이 아님 |
| 3단계 Security 이관 | **ABSENT** | grep 0 |
| 4단계 Compliance 이관 | **ABSENT** | grep 0 |
| 5단계 Executive 이관 | **ABSENT** | grep 0 |
| 순차 고정 위계(1→2→3→4→5) 구조 자체 | **ABSENT** | 5단계 고정 시퀀스를 표현하는 상태머신·설정 테이블 grep 0 |

### 2.3 KEEP_SEPARATE (해당 시)

- `Reviews.php:179`(`escalateNegatives`, 부정 상품리뷰 자동 에스컬레이션) — "escalate"라는 함수명만 동일할 뿐, 대상이 **고객이 남긴 부정적 상품 리뷰**를 운영팀에 통지하는 로직이며, 5단계 조직 위계 이관 구조가 없다(1단계뿐). 권한검토 에스컬레이션이 아니다. 흡수·개명 금지(가짜녹색 회피 최고위험 — "에스컬레이션 엔진이 이미 있다"는 착시).
- `action_request` 결재(마케팅 자동집행 정족수 승인, `Alerting.php` 계열) — 상태전이(pending→approved)가 있으나 이는 **마케팅 액션 집행 승인**이며 Reviewer→Manager→Security→Compliance→Executive의 고정 조직위계 순서가 아니다. 승인자 수·유형이 다르고, "미해결 시 상급자로 자동 이관"하는 에스컬레이션 개념 자체가 결재와는 다르다(결재는 승인 대기, 에스컬레이션은 무응답에 대한 강제 상향).

## 3. Canonical 설계

Escalation Engine은 Review SLA(§17)의 Escalation SLA 타이머가 만료될 때 검토건을 다음 위계로 강제 이관하는 상태머신을 정의한다.

1. **고정 시퀀스**: Reviewer → Manager → Security → Compliance → Executive. 각 단계는 자체 SLA를 가지며(§17 Escalation SLA), 해당 단계 SLA도 초과 시 다음 단계로 자동 진행.
2. **이관 트리거**: (a) Review SLA 초과, (b) 리뷰어 명시적 `Escalate` Decision(§10), (c) Risk Threshold(§21)에 의한 즉시 최상위 이관(예: Executive 직행) 중 하나.
3. **수신자 해석**: 각 단계의 수신자는 조직도(Manager)·역할(Security/Compliance Officer, SPEC §6 Reviewer Governance)에서 결정되며 이는 신규 Reviewer Registry(§7) 개념에 의존한다.
4. **Reminder 연동**: 각 이관 시점에 Reminder Engine(§18, 별도 DSAR)이 신규 수신자에게 통지.
5. **종단 처리**: Executive 단계까지 미해결이면 Auto Revocation(§16, 별도 DSAR)의 fail-secure 원칙에 따라 자동 회수(access 유지가 기본값이 아님).
6. **감사**: 모든 이관 이벤트는 Certification Evidence(§27)에 append-only 기록.

### 3.1 단계 건너뛰기(skip) 규칙

일반 경로는 5단계를 순차 통과하지만, Risk Threshold Exceeded(§21)처럼 위험도가 이미 최고 수준으로 판정된 경우 Reviewer/Manager 단계를 건너뛰고 Security 또는 Executive로 직행할 수 있다. 이 직행 규칙은 예외이지 기본 경로가 아니며, 직행 시에도 건너뛴 단계에 통지는 발송한다(가시성 유지 — 건너뛴 단계 담당자가 "왜 나를 거치지 않았는가"를 사후에 확인할 수 있어야 함).

### 3.2 각 단계의 권한 범위

Reviewer는 원 검토건의 Decision(§10) 전체 옵션을 행사할 수 있으나, Manager 이상 단계는 원칙적으로 **Revoke 또는 Escalate만** 가능하도록 제한한다 — 상위 단계로 갈수록 세부 맥락(대상자의 실제 업무 필요성) 파악이 어려워지므로, Approve 권한을 상위 단계에서 남발하면 오히려 통제가 약화된다. 이는 Reviewer Delegation의 fail-closed 규칙(ADR D-5)과 같은 방향의 설계 철학이다.

### 3.3 종단 이후(Executive 단계) 처리

Executive 단계에서도 응답이 없으면 §16 Auto Revocation의 `Certification Expired` 조건이 최종적으로 발동한다 — Escalation Engine 스스로는 회수를 실행하지 않고, "5단계를 모두 소진했다"는 사실만 Auto Revocation에 신호로 전달한다(책임 분리, §3.2 Reminder Engine과 동일한 설계 철학). 이는 SPEC이 Escalation(§19)과 Auto Revocation(§16)을 별개 장으로 분리한 이유이기도 하다 — 이관(escalate)과 회수(revoke)는 서로 다른 결정이며, 이관 소진이 곧 자동 회수 사유가 되는 것은 정책적 선택(fail-secure)이지 구조적 필연이 아니다.

## 4. Kernel/substrate 매핑

| SPEC §19 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Reviewer→Manager 이관 | (허용목록 내 access-review 맥락 substrate 없음) | 신규 |
| Manager→Security 이관 | (substrate 없음) | 신규 |
| Security→Compliance 이관 | (substrate 없음) | 신규 |
| Compliance→Executive 이관 | (substrate 없음) | 신규 |
| 이관 트리거(SLA 연동) | Review SLA(§17, 전체 ABSENT — 형제 DSAR 범위) | 신규 |
| 통지 연동 | Reminder Engine(§18, 전체 ABSENT — 형제 DSAR 범위) | 신규 |
| 종단 회수 연동 | Auto Revocation(§16, 전체 ABSENT — 형제 DSAR 범위) | 신규 |

## 5. 무후퇴 · Extend

Golden Rule(Wrap): `Reviews.php:179`(`escalateNegatives`)와 `action_request` 결재 상태머신은 **절대 수정·재사용(코드 레벨) 금지** — 완전히 다른 도메인(상품리뷰 운영 통지·마케팅 집행 승인)이므로 그대로 유지한다(무후퇴). Escalation Engine은 이들의 **이름·상태전이 형태만 참고**하되 독립 신규 5단계 위계 엔진으로 설계한다. 이는 ADR D-6(KEEP_SEPARATE)의 직접 적용이며, "이관"이라는 개념이 두 도메인 모두 존재한다고 해서 하나로 통합하지 않는다(도메인 경계 보존).

`action_request`(`Alerting.php:571`~`:723`)의 pending→approved→executed 상태전이는 Escalation Engine 설계 시 **참고할 만한 상태머신 패턴**(정족수 결재·상태 전이·실행 분리)을 제공하지만, 결재자 집합이 고정 5단계 조직위계가 아니라 가변 승인자 목록이라는 점에서 구조적으로 다르다. 실 구현 세션은 이 패턴을 코드 레벨에서 상속·확장하지 말고, 설계 아이디어 수준에서만 참고해야 한다 — 특히 `approvals_json` 같은 자유형 승인자 목록 구조를 그대로 가져오면 Escalation의 고정 위계 보장(반드시 Reviewer→Manager→Security→Compliance→Executive 순서)이 깨질 수 있다.

## 5.1 조직도 부재 시의 폴백

3장·4장에서 밝힌 대로 Manager/Security/Compliance/Executive 각 단계의 수신자 해석은 Reviewer Registry(§7 SPEC, 신규)에 의존하는데, 소규모 테넌트는 이런 5단계 조직위계가 아예 존재하지 않을 수 있다(예: 1인 관리자 테넌트). 이 경우 Escalation Engine은 존재하지 않는 단계를 자동으로 스킵하되, 최소 1인(테넌트 admin)에게는 반드시 도달해야 한다는 fail-secure 하한선을 둔다 — 이관할 상위 단계가 없다고 해서 검토건이 영원히 미해결로 남는 것은 허용되지 않는다(§16 Auto Revocation의 `Certification Expired`가 최종 안전망으로 작동).

## 6. 완료 게이트

- [ ] 5단계 고정 위계 상태머신 신설(Reviewer→Manager→Security→Compliance→Executive)
- [ ] Reviewer Registry(§7)·조직도 기반 수신자 해석 로직 신설(선행 필요)
- [ ] Escalation SLA(§17) 연동
- [ ] Reminder Engine(§18) 연동
- [ ] 종단 Auto Revocation(§16) fail-secure 연동
- [ ] Risk Threshold(§21) 기반 즉시 최상위 이관(직행) 로직
- [ ] `Reviews.php:179`·`action_request`와의 코드/데이터 비공유 검증(오흡수 회귀 테스트)
- [ ] 단계 건너뛰기(skip) 규칙 및 건너뛴 단계 통지 로직 신설
- [ ] 단계별 권한범위 제한(Manager 이상 Revoke/Escalate 한정) 검증
- [ ] `action_request` 자유형 승인자 목록과 고정 5단계 위계의 구조적 차이 회귀 테스트(패턴 오차용 방지)
- [ ] BLOCKED_PREREQUISITE 해소 — Review Queue(§9)·Reviewer Governance(§6)·Review SLA(§17) 선행 완료 필요
- [ ] 코드 0 유지

## 7. 반날조 인용 출처

- SPEC §19(Escalation Engine: Reviewer→Manager→Security→Compliance→Executive)
- ADR D-5(Reviewer Delegation 상한 fail-closed) · D-6(KEEP_SEPARATE 오흡수 금지) · D-7(정직분리)
- Ground-Truth ②(허용목록 KEEP_SEPARATE): `Reviews.php:179`(`escalateNegatives` 부정 상품리뷰) · `action_request` 결재(`Alerting.php:571`~`:723`, 마케팅 자동집행 정족수 — 권한검토 에스컬레이션 아님)
- 형제 DSAR 상호참조(자체 인용 아님, 연동 설계 근거): `DSAR_APPROVAL_CERTIFICATION_REVIEW_SLA.md`(§17) · `DSAR_APPROVAL_CERTIFICATION_REMINDER_ENGINE.md`(§18) · `DSAR_APPROVAL_CERTIFICATION_AUTO_REVOCATION.md`(§16)
- (ABSENT 항목: 5단계 고정 위계 이관 전부 — grep 0 실측. `Reviews.php:179`·`action_request`를 "에스컬레이션 엔진이 이미 있다"로 과장하지 않음)
