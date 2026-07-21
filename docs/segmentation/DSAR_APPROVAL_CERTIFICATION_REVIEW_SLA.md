# DSAR — Review SLA: Response/Reminder/Escalation/Closure SLA (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §17(Review SLA)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §17은 접근권한 검토(Access Review)가 무기한 방치되지 않도록 4종 SLA를 정의한다: Response SLA(리뷰어가 할당 후 응답해야 하는 기한) · Reminder SLA(리마인더 발송 주기) · Escalation SLA(에스컬레이션 발동 기한) · Closure SLA(캠페인 종료 기한). 본 DSAR은 이 4종 SLA가 **접근권한 검토 맥락에서** 존재하는지를 판정한다. 유일한 근접 substrate는 GeniegoROI 코드에 실재하는 `SLA_DAYS` 상수이나, 이는 완전히 다른 규제 도메인(DSAR 정보주체 요청 응답기한)에 속하므로 KEEP_SEPARATE 원칙에 따라 형태만 참조하고 흡수하지 않는다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT (접근검토용)**

Ground-Truth ①·②의 공통 결론: **접근권한 검토를 대상으로 하는 SLA는 grep 0**다. Review Assignment(§8)·Review Queue(§9) 자체가 ABSENT이므로 그 위에 얹히는 Response/Reminder/Escalation/Closure SLA도 성립할 수 없다(구조적 필연 — 검토 대상이 없는데 검토 기한이 있을 수 없다). 유일하게 명명이 유사한 `SLA_DAYS` 상수는 `Dsar.php`에 실재하나, 이는 **개인정보보호법상 DSAR(Data Subject Access Request, 정보주체 열람·삭제 요청) 응답기한**(30일 규제기한)이며 role/access certification의 리뷰어 응답기한과 이름만 같을 뿐 도메인이 완전히 다르다.

### 2.2 하위항목 대조표

| SPEC §17 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Response SLA(리뷰어 응답기한) | **ABSENT** | Reviewer Assignment(§8) grep 0. 리뷰어에게 배정된 검토건의 응답기한 개념 자체 부재 |
| Reminder SLA(리마인더 주기) | **ABSENT** | 별도 DSAR `DSAR_APPROVAL_CERTIFICATION_REMINDER_ENGINE.md`(§18)에서 상술. 여기서는 SLA 카운트다운과 리마인더 발송 트리거의 연동만 다루며, 둘 다 grep 0 |
| Escalation SLA(에스컬레이션 발동기한) | **ABSENT** | 별도 DSAR `DSAR_APPROVAL_CERTIFICATION_ESCALATION_ENGINE.md`(§19)에서 상술. Reviewer→Manager→Security→Compliance→Executive 순서 자체가 grep 0 |
| Closure SLA(캠페인 종료기한) | **ABSENT** | Campaign(§3) `Due Date`·`Close Date` 속성 자체가 SPEC 명세일 뿐 대응 스키마·크론 없음 |

### 2.3 KEEP_SEPARATE (해당 시) — **형태만 유사, 흡수 금지**

- `Dsar.php:54`·`:288`·`:384`(`SLA_DAYS=30`) — 이는 **DSAR(정보주체 접근/삭제 요청)** 규제 응답기한이다. "SLA"라는 이름과 "기한 카운트다운"이라는 형태만 §17 Review SLA와 유사할 뿐, 대상이 (a) 정보주체의 개인정보 열람 요청 vs (b) 리뷰어의 권한검토 응답으로 전혀 다른 주체·목적을 갖는다. 두 SLA는 도메인 코드·저장 스키마·이벤트 트리거 어느 것도 공유하지 않으며, 개명·통합·흡수 절대 금지(가짜녹색 회피 — "SLA 엔진이 이미 있다"는 착시가 최고위험). Part 3-8의 Review SLA는 `Dsar.php`의 30일 상수 **패턴(카운트다운+기한초과 판정 구조)만 참조**할 수 있으나 코드·데이터를 공유하지 않는다.

## 3. Canonical 설계

Review SLA는 4종 독립 타이머로 정의하며, 각 타이머는 Review Queue(§9) 상태전이와 결합한다.

1. **Response SLA**: `Assigned` 상태 진입 시각 기준 카운트다운. 초과 시 Reminder SLA 및 Escalation SLA 동시 발동 후보.
2. **Reminder SLA**: Response SLA 잔여시간의 일정 비율(예: 50%/80%/100%) 지점마다 리마인더 발송 트리거(§18 별도 DSAR 담당).
3. **Escalation SLA**: Response SLA 완전 초과 시 Escalation Engine(§19 별도 DSAR 담당) 발동, Reviewer→Manager 순서 진입.
4. **Closure SLA**: Campaign 전체 `Due Date` 초과 시 미완료 검토건은 Auto Revocation(§16, 별도 DSAR)의 `Certification Expired` 트리거로 전달되며, fail-secure 원칙에 따라 회수 우선.
5. 모든 SLA 위반 이벤트는 Certification Analytics(§20)의 `Overdue Reviews`/`SLA Impact` 지표로 집계된다.

### 3.1 4종 타이머의 관계

4개 SLA는 병렬이 아니라 **중첩(nested) 관계**다 — Response SLA가 가장 안쪽 타이머이고, Reminder SLA는 그 안에서 발생하는 부속 이벤트이며, Escalation SLA는 Response SLA 만료의 결과이고, Closure SLA는 Campaign 전체 수준에서 개별 Response SLA들을 감싸는 최상위 타이머다. 설계 시 이 계층 구조를 단일 스케줄러가 아니라 **4개의 독립 관찰자(observer)** 로 구현해, 하나의 타이머 로직 오류가 나머지에 전파되지 않도록 격리한다.

### 3.2 정책 파라미터화 (임의 숫자 금지)

Response/Reminder/Escalation/Closure 각 기한은 SPEC에 고정 일수로 명시되어 있지 않다 — 조직 규모·규제 요구(SOX/HIPAA 등)에 따라 테넌트별로 달라야 한다. 실 구현 시 하드코딩된 기한 상수를 두지 않고, Certification Policy(§5)의 일부로 테넌트가 조정 가능한 정책값으로 관리해야 한다(SSOT·실측값 자동산출 원칙과 정합).

### 3.3 SLA 위반과 Auto Revocation의 관계 명확화

Response SLA 위반 자체는 즉시 회수를 의미하지 않는다 — 위반은 먼저 Reminder(§18)와 Escalation(§19)의 연쇄를 발동시키며, 오직 **Closure SLA**(Campaign 전체 마감)까지 미해결로 남는 경우에만 Auto Revocation(§16)의 `Certification Expired` 조건으로 전달된다. 이 단계적 완충(Response → Reminder → Escalation → Closure)이 없으면 리뷰어의 단순 응답 지연만으로 정당한 권한이 즉시 박탈되는 과잉 조치가 발생하므로, SLA 4종의 순차 완충 관계는 Auto Revocation의 fail-secure 원칙(§D-7)과 상충하지 않는 범위에서 설계되어야 한다.

## 4. Kernel/substrate 매핑

| SPEC §17 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Response SLA 타이머 | (substrate 없음. `Dsar.php:54`는 KEEP_SEPARATE — 패턴만 참고) | 신규 |
| Reminder SLA 발동 | (substrate 없음) | 신규 — §18 DSAR과 연동 |
| Escalation SLA 발동 | (substrate 없음) | 신규 — §19 DSAR과 연동 |
| Closure SLA 판정 | (substrate 없음) | 신규 — §16 Auto Revocation과 연동 |
| Overdue 집계 | Certification Analytics(§20, 전체 ABSENT — 형제 DSAR 범위) | 신규 |
| 정책 파라미터 저장 | Certification Policy(§5, 전체 ABSENT — 형제 DSAR 범위) | 신규 |

이 표에서 알 수 있듯 Review SLA의 5개 하위요소 중 **재활용 가능한 실 코드 substrate는 0건**이다 — `Dsar.php`의 SLA_DAYS는 유일한 근접물이지만 KEEP_SEPARATE 판정(§2.3)에 따라 코드 재사용 대상에서 명시적으로 제외된다. 이는 Part 3-8의 다른 엔티티(예: Remediation Workflow)가 관리자 수동 프리미티브를 다수 재활용하는 것과 대비되는, Review SLA 고유의 "순도 100% 그린필드" 특성이다.

## 5. 무후퇴 · Extend

Golden Rule(Wrap): `Dsar.php:54`·`:288`·`:384`의 `SLA_DAYS` 정본은 **절대 수정·재사용 금지** — DSAR 규제 응답기한은 독립 도메인으로 그대로 유지한다(무후퇴). Review SLA는 이름과 "기한 카운트다운" 구조 패턴만 참조하는 **완전 별개의 신규 타이머 시스템**으로 설계한다. 이는 ADR D-6(KEEP_SEPARATE — 마케팅/승인/데이터/KYC 도메인 오흡수 금지) 원칙의 연장 적용이다.

**왜 이 분리가 중요한가**: 두 SLA를 하나의 상수·테이블로 통합하면, DSAR 규제 응답기한(정보주체 권리 — 개인정보보호법 강행규정, 임의 변경 불가)과 Review SLA(조직 내부 운영 정책, 테넌트가 자유롭게 조정 가능)가 뒤섞여 규제 준수 사고로 이어질 수 있다 — 예를 들어 Certification Policy 화면에서 관리자가 Review SLA를 60일로 늘렸는데 그 변경이 실수로 `Dsar.php`의 `SLA_DAYS`에도 영향을 준다면 이는 법정 대응기한 위반이 된다. 두 도메인은 코드뿐 아니라 **정책 편집 UI와 저장 스키마 레벨에서도 완전 분리**되어야 한다.

## 5.1 규제 프레임워크와의 정합

SOX/SOC2/ISO27001/HIPAA/PCI DSS/NIST 800-53(SPEC §0)는 저마다 다른 access-review 주기 요구를 갖는다(예: SOX는 분기 단위, PCI DSS는 특정 role에 대해 더 엄격). Review SLA가 단일 고정값이 아니라 §3.2에서 정의한 대로 Certification Policy 기반 파라미터여야 하는 이유가 여기에 있다 — 동일 조직 내에서도 규제 대상 role과 비규제 role의 SLA가 달라야 하며, Certification Scope(§4 SPEC)의 Role/Permission 단위로 SLA 정책을 오버라이드할 수 있어야 한다.

## 6. 완료 게이트

- [ ] Response SLA 타이머 신설(Review Assignment §8 완료 후행)
- [ ] Reminder SLA ↔ Reminder Engine(§18) 연동 확정
- [ ] Escalation SLA ↔ Escalation Engine(§19) 연동 확정
- [ ] Closure SLA ↔ Auto Revocation(§16) `Certification Expired` 연동 확정
- [ ] `Dsar.php` SLA_DAYS와의 코드/스키마 비공유 검증(혼동 방지 회귀 테스트)
- [ ] Certification Analytics `Overdue Reviews`/`SLA Impact` 지표 연결
- [ ] 4종 타이머의 독립 관찰자(observer) 격리 구조 검증
- [ ] Certification Policy(§5) 테넌트별 기한 파라미터화(하드코딩 금지) 검증
- [ ] `Dsar.php` SLA_DAYS와 정책 편집 UI·저장 스키마 완전 분리 검증
- [ ] 규제 프레임워크별(SOX/PCI DSS 등) Scope 단위 SLA 오버라이드 지원 검증
- [ ] SLA 위반→Reminder→Escalation→Closure 단계적 완충 관계 회귀 테스트
- [ ] BLOCKED_PREREQUISITE 해소 — Review Queue(§9)·Campaign(§3) 선행 완료 필요
- [ ] 코드 0 유지

## 6.1 판정 요약 재확인

Review SLA = **ABSENT(4종 전부) + KEEP_SEPARATE(`Dsar.php` SLA_DAYS, 흡수 불가).** 다른 Part 3-8 엔티티가 관리자 수동 프리미티브(revoke·disable 등)를 재활용 substrate로 갖는 것과 달리, Review SLA는 재활용할 실행 프리미티브 자체가 없는 **순수 정책·타이머 계층**이다. 실 구현 착수 시점에도 "참고할 기존 코드가 없다"는 점을 전제로 처음부터 신규 설계해야 한다.

## 7. 반날조 인용 출처

- SPEC §17(Review SLA: Response/Reminder/Escalation/Closure SLA)
- ADR D-6(KEEP_SEPARATE 오흡수 금지) · D-7(정직분리)
- Ground-Truth ②(허용목록 KEEP_SEPARATE): `Dsar.php:54`·`:288`·`:384`(`SLA_DAYS=30`, DSAR 규제기한) — **형태만 참조, 흡수 금지**
- 형제 DSAR 상호참조(자체 인용 아님, 연동 설계 근거): `DSAR_APPROVAL_CERTIFICATION_REMINDER_ENGINE.md`(§18) · `DSAR_APPROVAL_CERTIFICATION_ESCALATION_ENGINE.md`(§19) · `DSAR_APPROVAL_CERTIFICATION_AUTO_REVOCATION.md`(§16)
- (ABSENT 항목: Response/Reminder/Escalation/Closure SLA 전부 — grep 0 실측. `Dsar.php` SLA_DAYS를 "이미 SLA 엔진이 있다"로 과장하지 않음)
