# DSAR — Auto Revocation: Review Rejected/Certification Expired/Attestation Missing/Risk Threshold Exceeded (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §16(Auto Revocation)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §16은 Remediation Workflow(§15)와 달리 **사람 개입 없이 조건 충족 즉시 실행되는 자동 회수**를 정의한다. 4개 트리거 조건: Review Rejected(리뷰어가 거부) · Certification Expired(캠페인 마감 후 미검토) · Attestation Missing(전자서명 미제출) · Risk Threshold Exceeded(위험점수 임계 초과). 본 DSAR은 "검토 결과와 연동되어 자동으로 발동하는 회수" 가 GeniegoROI 현행 코드에 존재하는지를 정직 판정하고, 존재한다면 무엇을, 없다면 무엇이 없는지 fail-secure 원칙 하에 명세한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT (자동 회수 부재)**

Ground-Truth ①·②의 공통 결론: **검토연동 자동실행(Auto Revocation)은 grep 0·완전 부재**다. 현행 revoke 경로는 예외 없이 (a) 관리자 수동 액션이거나 (b) 결제 만료라는 **단일·고정 조건**에 의한 자동 강등뿐이다. §16이 요구하는 4개 트리거(Review Rejected/Certification Expired/Attestation Missing/Risk Threshold) 중 어느 것도 회수를 발동시키는 코드 경로가 없다. 이는 Certification 엔진 자체(Registry·Campaign·Review·Attestation)가 ABSENT이므로 그 산출물(Rejected/Expired/Missing/Risk)도 존재할 수 없다는 구조적 필연 — "결과가 없으니 그 결과에 반응하는 자동화도 없다."

### 2.2 하위항목 대조표

| SPEC §16 트리거 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Review Rejected → 자동 회수 | **ABSENT** | Review(§9·§10) 자체가 ABSENT(Ground-Truth ②)이므로 "거부" 이벤트 자체가 존재하지 않음. 현행 회수는 `Keys.php:135`·`UserAdmin.php:338`처럼 관리자가 리뷰 없이 **직접** 트리거 |
| Certification Expired → 자동 회수 | **ABSENT** | Campaign 만료 개념 자체가 ABSENT. 유일한 만료 기반 자동 강등은 **결제 만료**: `UserAuth.php:141`(`subscription_expires_at < now` → plan free 자동 다운그레이드) — 이는 인증검토 만료가 아니라 **결제 만료**로 트리거 조건이 다름 |
| Attestation Missing → 자동 회수 | **ABSENT** | 전자서명 attestation grep 0(§12 자체가 ABSENT) |
| Risk Threshold Exceeded → 자동 회수 | **ABSENT** | access risk score 산정 로직 grep 0. `TeamPermissions.php:686`·`:722`(`member_permissions_set` risk=high 태깅)는 위임 이벤트를 감사로그에 `risk='high'`로 **기록만** 할 뿐, 임계 초과 시 자동 회수를 트리거하지 않음(PARTIAL-신호, ABSENT-액션) |

### 2.3 KEEP_SEPARATE (해당 시)

- `AgencyPortal.php:390`(agency_client_link revoke) — 대행사 링크 상태전이의 수동 회수이며 review-triggered auto revocation이 아니다. 회수라는 단어만 공유.
- `UserAuth.php:141`(결제만료 강등)은 §D-7이 명시적으로 정직 분리를 요구하는 사례 — "만료 기반 자동조치가 이미 있다"로 과장하면 안 된다. 트리거는 **구독 결제 주기**이지 **인증검토 주기**가 아니다.

## 3. Canonical 설계

Auto Revocation은 4개 트리거를 조건-액션(condition-action) 규칙으로 정의하며, 각 트리거는 Remediation Workflow(§15, 별도 DSAR)의 실행 프리미티브를 **호출**한다(자체 실행 로직을 재구현하지 않음).

1. **Review Rejected**: Decision(§10)이 `Reject`/`Revoke`로 확정되는 순간 동기 실행. 유예 없음.
2. **Certification Expired**: Campaign(§3) `Due Date` 경과 + 미검토(Pending) 상태 배정 → SLA(§17) 위반 판정 후 자동 회수. Fail-secure: 애매하면 회수(access 유지가 아니라 차단이 기본값).
3. **Attestation Missing**: Decision은 있으나 Attestation(§12) 전자서명이 마감 전 미제출 → Approve 무효화, 자동 회수로 강등.
4. **Risk Threshold Exceeded**: Certification Risk(§21) 점수가 정책 임계 초과 시, 검토 대기 중이라도 **선제적** 자동 회수(risk-based override).
5. 모든 트리거는 Remediation Workflow §15 Role Revocation/Account Disable/Scope Reduction 액션을 호출하고, 실행 결과를 SecurityAudit(참조 ADR D-2)에 append한다.

### 3.1 fail-secure 우선순위 규칙

4개 트리거가 동시에 성립하는 경우(예: SLA도 초과했고 attestation도 없는 경우) 어느 하나만 실행해도 결과는 동일(회수)하므로 우선순위 자체보다 **중복 실행 방지(idempotency)** 가 핵심 설계 제약이다. 트리거 판정이 서로 다른 시각에 독립적으로 발생하더라도(예: 크론 vs 이벤트 훅) 동일 배정에 대한 두 번째 트리거는 "이미 회수됨" 상태를 확인하고 no-op으로 종료해야 한다.

### 3.2 신호와 결정의 분리

`TeamPermissions.php:686`·`:722`이 기록하는 `risk='high'` 태깅은 **결정이 아니라 신호**다. Auto Revocation은 이 신호를 그대로 회수 트리거로 승격하지 않는다 — 신호 → 정책 임계값과의 비교 → 정책 통과 시에만 회수라는 **중간 판정 단계(Risk Threshold 정책 엔진, §21)** 를 반드시 거친다. 신호를 결정으로 직결하면 오탐(false positive)에 의한 과잉 회수가 발생할 수 있으므로, 감사 태깅과 자동집행 사이에는 반드시 정책 평가 계층이 존재해야 한다.

### 3.3 Attestation Missing의 경계 조건

"미제출"과 "제출했으나 아직 검토 전"을 혼동하면 안 된다. Attestation Missing 트리거는 리뷰어가 Decision을 `Approve`로 확정했음에도 불구하고 필수 전자서명(§12)이 마감 시각까지 첨부되지 않은 경우에만 발동한다 — Decision 자체가 아직 `Pending`인 배정은 Certification Expired(§16 별도 조건)의 관할이지 Attestation Missing의 관할이 아니다. 두 조건의 경계를 명확히 분리하지 않으면 동일 배정이 두 트리거에 동시 매칭되어 중복 회수 이벤트가 발생할 수 있다.

## 4. Kernel/substrate 매핑

| SPEC §16 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Review Rejected 트리거 | (substrate 없음 — Review Queue 자체가 신규) | 신규 |
| Certification Expired 트리거 | `UserAuth.php:141`(만료 기반 강등 **패턴**만 참조. 트리거 조건은 재정의) | 신규(패턴 참조만) |
| Attestation Missing 트리거 | (substrate 없음) | 신규 |
| Risk Threshold 트리거 | `TeamPermissions.php:686`·`:722`(`risk='high'` 감사 태깅 — 신호 소재로만 재활용) | 승격(신호) + 신규(임계 판정·자동집행) |
| 실행 위임 | `Keys.php:135`·`UserAdmin.php:338`(Remediation §15 경유 재사용) | 승격(간접, §15 문서 참조) |

## 5. 무후퇴 · Extend

Golden Rule(Wrap): `UserAuth.php:141`의 결제만료 강등 로직은 **대체하지 않는다** — 결제 만료와 인증검토 만료는 별개 트리거로 병행 유지(무후퇴). `TeamPermissions.php:686`·`:722`의 `risk='high'` 감사 태깅은 그대로 존치하고 Risk Threshold 트리거의 **입력 신호**로만 참조(Extend). fail-secure 원칙: Certification 대상 여부·검토 상태가 판정 불가한 배정은 "허용 유지"가 아니라 "회수 우선"을 기본값으로 한다(ADR §D-7 재확인). KEEP_SEPARATE(`AgencyPortal.php:390`)는 흡수하지 않는다.

두 트리거 체계(결제 도메인의 `UserAuth.php:141` vs 인증검토 도메인의 신규 Certification Expired)가 우연히 같은 사용자·같은 시점에 겹칠 수 있다(예: 구독 만료와 검토 만료가 같은 주에 발생). 이 경우도 각 트리거는 **독립적으로 판정·실행**되며 하나가 다른 하나를 대체하거나 억제하지 않는다 — 두 원인 모두 회수라는 동일 결과로 수렴하더라도 감사 로그에는 두 개의 별도 근거(reason code)가 남아야 한다(Explainable Review, Certification Evidence §27과 연동). 이는 "왜 이 배정이 회수되었는가"를 사후 감사관이 정확히 재구성할 수 있어야 한다는 SPEC §0 Explainable Review 요구를 충족하기 위함이다.

## 6. 완료 게이트

- [ ] Review Rejected 즉시 회수 로직 신설(Decision §10 완료 후행)
- [ ] Certification Expired SLA 판정 로직 신설(§17 Review SLA와 연동)
- [ ] Attestation Missing 검증 로직 신설(§12 Attestation 완료 후행)
- [ ] Risk Threshold 임계값 정책·자동판정 로직 신설(§21 Certification Risk 완료 후행)
- [ ] `TeamPermissions.php:686/722` risk 신호 → 임계판정 파이프라인 연결 검증
- [ ] `UserAuth.php:141`과의 트리거 조건 분리 회귀 테스트(결제만료 ≠ 인증검토만료 혼동 방지)
- [ ] Attestation Missing과 Certification Expired 경계조건 분리(중복 트리거 방지) 검증
- [ ] 이중 근거(reason code) 감사로그 설계 — 결제만료 vs 인증검토만료 동시발생 시 개별 근거 보존
- [ ] BLOCKED_PREREQUISITE 해소 — Review Queue(§9)·Decision(§10)·Attestation(§12)·Risk(§21) 선행 완료 필요
- [ ] 코드 0 유지

## 6.1 위험 인지 (구현 시 주의)

Auto Revocation은 정의상 사람 개입 없이 즉시 실행되므로, 오탐(false positive)의 파급력이 Remediation Workflow(§15, 사람이 결정 후 실행)보다 크다. 실 구현 세션은 다음을 반드시 준수해야 한다 — (a) 각 트리거는 최초 배포 시 "실행"이 아닌 "경고만"(dry-run) 모드로 먼저 가동해 오탐률을 측정한다, (b) Risk Threshold 임계값은 하드코딩이 아니라 테넌트별 정책으로 조정 가능해야 한다(임의 숫자 금지·SSOT 원칙), (c) 4개 트리거 각각의 오탐률·회수건수는 Certification Analytics(§20)에 노출되어 운영자가 임계값을 조정할 수 있어야 한다.

## 6.2 4개 트리거의 상호 독립성 요약표

| 트리거 | 선행 의존 SPEC | 판정 근거 성격 |
|---|---|---|
| Review Rejected | Decision(§10) | 리뷰어 명시적 판단 |
| Certification Expired | Campaign(§3)·Review SLA(§17) | 시간 경과(무응답) |
| Attestation Missing | Attestation(§12) | 절차 미이행(서명 부재) |
| Risk Threshold Exceeded | Certification Risk(§21) | 위험도 정량평가 |

4개 트리거는 판정 근거 성격이 서로 다르므로(사람 판단/시간경과/절차이행/정량평가) 하나의 통합 조건식으로 압축하지 않고 **개별 규칙 엔진 항목**으로 유지한다 — 이는 향후 특정 트리거만 온/오프 하거나 트리거별 예외정책을 두어야 하는 컴플라이언스 요구(예: HIPAA 규제 대상 role만 Risk Threshold 트리거 활성화)에 대응하기 위함이다.

## 7. 반날조 인용 출처

- SPEC §16(Auto Revocation: Review Rejected/Certification Expired/Attestation Missing/Risk Threshold Exceeded)
- ADR D-3(Review Queue 상태머신·Auto Revocation 연동) · D-7(정직분리 — 결제만료≠인증검토만료)
- Ground-Truth ① §2.B: `Keys.php:135`(revoke)·`UserAdmin.php:338`(is_active)·`UserAuth.php:141`(결제만료 강등)
- Ground-Truth ① §2.A: `TeamPermissions.php:686`·`:722`(`member_permissions_set` risk=high 감사 태깅)
- Ground-Truth ② §4 B-5(대행사 revoke, KEEP_SEPARATE): `AgencyPortal.php:390`
- (ABSENT 항목: Review Rejected/Certification Expired/Attestation Missing/Risk Threshold 자동실행 — grep 0 실측. `UserAuth.php:141`을 "이미 자동회수 있음"으로 과장하지 않음)
