# DSAR — Certification Evidence Storage (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §27(Evidence — 저장)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §27은 §11(Evidence Collection)이 수집한 개별 증거들과 §12(Attestation)의 서명을 Review Decision 1건에 대한 **단일 불변 저장 레코드**로 묶는 절이다 — Decision Evidence·Attestation·Comments·Risk Evaluation·Policy Evaluation·Approval Chain 6종. §11이 "무엇을 수집하는가"의 원천 정의라면, §27은 "그 수집물을 어떻게 tamper-evident 하게 영구 보관하는가"의 저장 계약이다. 감사(SOX/SOC2)는 사후에 "이 결정이 왜 내려졌는지"를 완전하게 재구성할 수 있어야 하므로, 본 문서는 6종 하위항목의 실 substrate를 판정하고 SecurityAudit 해시체인을 저장 무결성 기반으로 참조하는 설계를 계약한다.

본 문서는 Part 3-8 5편 DSAR 중 최상단 취합 계층이다 — §11(Evidence Collection)·§12(Attestation)·§13(Recertification)·§14(Exception Management)가 각각 생산하는 산출물을 최종적으로 하나의 불변 레코드에 묶어야 사후 감사가 "이 결정 하나"를 완전하게 재구성할 수 있다. 취합 계층이 부실하면 개별 계층이 아무리 견고해도 감사 시점에 흩어진 조각을 다시 짜맞춰야 하는 실무적 실패로 이어진다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ①·②의 결론대로 Review Decision 단위의 통합 Evidence 저장 레코드는 **grep 0**다. 6종 하위항목 모두 전용 스키마가 존재하지 않는다. 그러나 "저장물이 사후 변조되지 않았음을 증명하는" tamper-evident 인프라 자체는 `SecurityAudit.php:12`(append-only)·`:56`(`verify()`)가 이미 제공하며, 이는 Ground-Truth ①이 확정한 **유일한 실 append-only 해시체인**이다. Certification Evidence Storage는 이 인프라를 참조·확장(D-2)해야 하며, 6종 하위항목 각각의 내용 자체는 신규 스키마가 필요하다.

### 2.2 하위항목 대조표

| SPEC §27 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Decision Evidence | ABSENT | Decision 자체(Approve/Reject/Revoke 등)를 기록하는 전용 스키마 grep 0 — Review Decision 개념 자체가 §2/§3 신규 항목(Ground-Truth ②) |
| Attestation | ABSENT | §12 DSAR(`DSAR_APPROVAL_CERTIFICATION_ATTESTATION.md`)과 동일 판정 — 5종 주체 서명 레코드 grep 0. 저장 시 SecurityAudit 이중기록 패턴만 참조 가능 |
| Comments | ABSENT | Reviewer/Manager 코멘트 저장 필드 grep 0(§11 Manager Comment와 동일 부재) |
| Risk Evaluation | ABSENT | Certification 맥락의 위험평가 저장 grep 0. `ModelMonitor.php`·`AnomalyDetection.php`는 KEEP_SEPARATE(성과/이상탐지 도메인) |
| Policy Evaluation | PARTIAL | `TeamPermissions.php:393`(`effectiveForUser`)의 산출 결과를 Decision 시점에 스냅샷 저장할 수 있음 — 단 "평가 결과를 Evidence로 영구 보관"하는 저장 로직 자체는 신규 |
| Approval Chain | ABSENT | 다단계 승인 이력(누가 몇 단계로 승인했는지)을 순서대로 저장하는 스키마 grep 0. `Alerting.php:571`(`approvals_json`)은 KEEP_SEPARATE(§2.3) |

### 2.3 KEEP_SEPARATE

- `menu_audit_log`(`AdminMenu.php:123`)는 메뉴 권한 변경에 대한 **별개의 감사 로그**로, `hash_chain` 컬럼을 자체 보유하지만 통합 무결성 검증(`verify()`)의 정본은 아니다(ADR D-8 — menu_audit_log 이중 해시체인 부수발견, SSOT는 SecurityAudit). Certification Evidence Storage의 tamper-evident 기반은 `SecurityAudit`로 단일화하며, `menu_audit_log`를 Certification Evidence 스키마로 흡수·통합하지 않는다(두 로그는 각자 도메인에서 병존).
- `Alerting.php:571`(`approvals_json`)은 마케팅 액션 결재 이력이며, Certification의 Approval Chain(접근권한 다단계 승인 이력)과 이름만 유사할 뿐 도메인이 다르므로 흡수하지 않는다.

### 2.4 판정 근거 상세 — 이중 해시체인의 실무적 함의

`menu_audit_log`(`AdminMenu.php:123`)가 자체 `hash_chain` 컬럼을 가지고 있다는 사실은 얼핏 "이미 tamper-evident 저장소가 하나 더 있다"는 착시를 준다. 그러나 Ground-Truth ①·ADR D-8이 확정한 대로 통합 무결성 검증(`verify()`)의 정본은 `SecurityAudit`뿐이며, `menu_audit_log`의 해시체인은 AdminMenu 내부에서만 참조되고 외부 통합검증 경로가 없다. Certification Evidence Storage가 이 이중구조를 그대로 답습해 별도 해시체인을 또 만들면 감사 시점에 "어느 체인이 정본인가"라는 혼란이 재발하므로, 반드시 SecurityAudit 하나로 단일화한다.

## 3. Canonical 설계

### 3.1 레코드 구조

Certification Evidence Storage 레코드는 Review Decision 1건당 1개 생성되며 `{decision_id, evidence_ref(§11 Evidence 레코드 FK), attestation_refs(§12 Attestation 레코드 FK 배열), comments[], risk_evaluation, policy_evaluation_snapshot, approval_chain[]}`로 구성된다. 저장과 동시에 `SecurityAudit::log()`로 레코드의 해시가 append-only 기록되며(D-2, 참조이지 SecurityAudit 자체를 개명하지 않음), 이후 `SecurityAudit::verify()`로 저장 시점 이후 변조 여부를 재계산 가능하다.

### 3.2 불변·정정 규칙

Comments·Risk Evaluation은 자유 입력 필드이므로 저장 후 수정 불가(D-4 불변)하고 정정이 필요하면 새 Comment를 추가하는 append-only 규칙을 따른다. 이는 §14(Exception Management)의 연장(Extension) 처리 방식과 동형 원칙이며, Part 3-8 전체가 "수정"이 아니라 "추가"로만 상태를 변경하는 일관된 불변성 철학을 공유함을 보여준다.

### 3.3 Approval Chain 순서 보존

Approval Chain은 다단계 승인이 있는 배정(예: High Risk → Manager+Security+Compliance 순차 승인)에서 각 단계의 승인자·시각·Decision을 배열로 순서 보존 저장한다. 순서가 뒤바뀌면 "누가 먼저 검토했는가"라는 인과관계가 소실되므로, 저장 계층은 배열 인덱스가 아니라 각 항목에 독립적인 시퀀스 번호를 부여해 재정렬 공격(reorder tampering)에도 견고하게 설계되어야 한다.

## 4. Kernel/substrate 매핑

| SPEC §27 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| 저장 무결성(tamper-evident) | `SecurityAudit.php:12`·`:56`(verify) | 승격(참조·이중기록, D-2) |
| Policy Evaluation 스냅샷 | `TeamPermissions.php:393`(effectiveForUser) | 승격(결과값 스냅샷화) |
| Decision Evidence·Attestation·Comments·Risk Evaluation·Approval Chain 저장 스키마 | 없음 | 완전 신규 |

6개 하위항목 중 승격 대상은 저장 무결성(tamper-evident)과 Policy Evaluation 스냅샷 2건뿐이며, 나머지 4건(Decision Evidence·Attestation·Comments·Risk Evaluation·Approval Chain 중 4개)은 완전 신규다. 이는 §11·§12·§13·§14 DSAR 각각의 판정을 취합한 결과와 일관된다 — 하위 계층이 대부분 ABSENT이므로 그것을 저장하는 상위 계층 역시 저장 스키마 자체는 대부분 신규일 수밖에 없다.

## 5. 무후퇴 · Extend

`SecurityAudit.php`의 `log`/`verify`/해시체인 계약은 원래의 범용 보안감사 목적대로 변경 없이 유지되며, Certification Evidence Storage는 이를 **참조해 신규 레코드를 이중 기록**할 뿐 SecurityAudit의 스키마·API를 변경하지 않는다(D-1 Extend·Wrap, D-2 흡수아님). `menu_audit_log`(`AdminMenu.php:123`)는 메뉴 권한 감사라는 원래 목적대로 존치되며, Certification Evidence로 통합·개명되지 않는다(D-8 — SSOT 재확인은 별도 정리 대상이지 본 설계의 흡수 대상이 아님). `Alerting.php:571`(approvals_json)은 마케팅 결재 도메인 그대로 유지되며 Approval Chain 스키마 설계에 참조되지 않는다.

`TeamPermissions.php:393`(effectiveForUser)의 즉시계산 특성 또한 변경되지 않는다 — Policy Evaluation 스냅샷은 그 결과값을 Decision 시점에 "복사해 고정"할 뿐이며, 함수 자체를 캐싱·영속화 방식으로 재구현하지 않는다. 원 함수의 실시간성(호출 즉시 최신 상태 반영)은 런타임 권한산정이라는 본래 목적에 필수적이므로 그대로 보존한다.

## 6. 완료 게이트

- [ ] Part 1~3-7 선행 계보 CERTIFIED 완료 — 현재 BLOCKED_PREREQUISITE
- [ ] §11 Evidence 레코드·§12 Attestation 레코드 신규 구현 선행(FK 참조 대상)
- [ ] Certification Evidence Storage 레코드 스키마(6종 하위항목) 신규 설계·구현
- [ ] SecurityAudit 이중 기록(append-only·verify 연동) 구현
- [ ] Approval Chain 다단계 순서 보존 저장 로직 구현
- [ ] Comments/Risk Evaluation append-only 정정 규칙 구현
- [ ] Approval Chain 재정렬 방지(독립 시퀀스 번호) 구현
- [ ] SecurityAudit 단일화 원칙 재확인(menu_audit_log와 중복 해시체인 생성 금지) 설계 리뷰
- [ ] 코드 변경 0 유지 확인(본 문서는 설계 명세만)
- [ ] 코드 배포·인증(CERTIFIED) 전환 없음 확인

## 7. 반날조 인용 출처

- SPEC §27(Evidence — 저장: Decision Evidence/Attestation/Comments/Risk Evaluation/Policy Evaluation/Approval Chain)
- ADR D-2(SecurityAudit 참조·흡수아님) · D-4(Attestation/Evidence 불변) · D-6(KEEP_SEPARATE) · D-8(부수발견 — menu_audit_log 이중 해시체인)
- Ground-Truth ① §2-A(`SecurityAudit.php:12`·`:56` verify)·(`AdminMenu.php:123` menu_audit_log) · §2-D(위임: `TeamPermissions.php:393`)
- Ground-Truth ② §4(KEEP_SEPARATE — 마케팅 approval: `Alerting.php:571`)
- ABSENT 항목(Decision Evidence·Attestation·Comments·Risk Evaluation·Approval Chain 저장 스키마)은 grep 0 실측 — menu_audit_log·approvals_json으로 채우지 않음(별개 도메인 감사)
- 본 문서는 §11(Evidence Collection)·§12(Attestation)·§14(Exception Management) DSAR의 상위 취합 계층이며, 네 문서 모두 동일 허용목록만 인용한다(교차 재인용 시에도 신규 파일:라인 창작 금지)
