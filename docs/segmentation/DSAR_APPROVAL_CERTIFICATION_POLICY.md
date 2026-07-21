# DSAR — Certification Policy (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §5(Mandatory/Optional/Risk-based/Compliance/Critical Role/High Risk Perm/All)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §5가 정의하는 Certification Policy는 "어떤 Assignment가 왜 검토 대상이 되어야 하는가"를 결정하는 상위 원칙 계층이다. Policy는 Campaign(§3)이 개시될 때 그 범위·강제성을 규정하는 규범이며, 이후 §5의 Rule(정책→룰 파생, 별도 문서)로 구체화된다. SPEC §5는 Policy를 7유형으로 분류한다: Mandatory(의무 검토 — 예외 없음), Optional(선택적 검토), Risk-based(위험도 기반 우선순위), Compliance(법규 대응 필수), Critical Role(핵심 역할 전용), High Risk Permission(고위험 권한 전용), All(전사 일괄). 각 Policy는 적용 대상 Scope(§4)·발동 Schedule(§3)·강제 수준(강제/권고)을 속성으로 가진다. 본 문서는 이 정책 계층이 실 코드베이스에 존재하는지 검증한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(순신규 그린필드)**

Ground-Truth ①/②의 실측 결론: 접근 검토를 "의무/선택/위험기반/컴플라이언스/핵심역할/고위험권한/전사" 7유형으로 분류해 강제하는 Policy 엔티티는 grep 0 — 순신규이다. 근접 substrate로는 fail-secure 강등 로직(`UserAuth.php:141` 결제만료 시 권한 강등)이 있으나, 이는 결제 상태에 따른 자동 강등 로직이지 접근 검토 정책이 아니다 — "검토가 이뤄져야 하는가"를 판정하는 것이 아니라 "결제가 끊기면 무조건 강등한다"는 단일 규칙이므로 Policy 개념과는 강제성의 성격이 다르다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Mandatory Policy(의무 검토) | ABSENT | grep 0 |
| Optional Policy(선택적 검토) | ABSENT | grep 0 |
| Risk-based Policy(위험도 기반) | ABSENT | grep 0 — `TeamPermissions.php:722`(risk=high) 필드가 신호로 존재하나 이를 정책 분기 기준으로 소비하는 로직 부재 |
| Compliance Policy(법규 대응 필수) | ABSENT | grep 0 |
| Critical Role Policy(핵심 역할 전용) | ABSENT | grep 0 |
| High Risk Permission Policy(고위험 권한 전용) | ABSENT | grep 0 |
| All Policy(전사 일괄) | ABSENT | grep 0 |
| 정책 강제 수준(강제/권고) 속성 | ABSENT | grep 0 — 근접물로 `UserAuth.php:141`(결제만료 시 강제 강등)이 있으나 이는 fail-secure 단일 규칙이지 정책 강제 수준 분류 체계가 아님 |

### 2.3 KEEP_SEPARATE

없음 — Policy는 이름이 일반적이라 직접적 명칭 충돌 근접물은 확인되지 않았다. 다만 개념 혼동 방지를 위해 명시한다: 데이터 certification 정책(`DataPlatform.php:281`, `GeniegoKnowledge.php:574` dataTrust)은 데이터 신뢰도 임계값 정책이며 사람의 접근 검토 정책과 도메인이 다르다.

## 3. Canonical 설계

Policy는 다음 개념 계약으로 설계된다(코드 미구현, 설계 명세 단계):

- **Policy 엔티티**: `type`(mandatory/optional/risk_based/compliance/critical_role/high_risk_permission/all) × `applies_to_scope`(§4 Scope 참조) × `triggers_via`(§3 Schedule 참조) × `enforcement_level`(강제/권고) × `derives_rules`(§5 Rule로 파생, 별도 문서).
- **우선순위 결정**: 동일 Assignment가 복수 Policy에 해당할 경우, Mandatory > Compliance > Critical Role > High Risk Permission > Risk-based > All > Optional 순으로 강제 수준이 높은 Policy가 우선한다(fail-secure — 더 엄격한 쪽 채택).
- **Risk-based 소비 계약**: `TeamPermissions.php:722`(risk=high)를 Risk-based Policy 발동 신호로 읽기 전용 소비한다.
- **fail-secure 상속**: Policy 판정 불가(모호) 시 Mandatory로 기본 취급한다(느슨한 쪽으로 기본값을 두지 않는다).

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Risk-based 발동 신호 | `TeamPermissions.php:722`(risk=high) | 승격(신호 소비, Policy 로직 자체는 신규) |
| fail-secure 강등 참고 패턴(강제성 설계 참조) | `UserAuth.php:141` | 참조만(패턴 참고, 흡수 아님) — 승격 아님 |
| 7유형 Policy 엔티티 전체 | 없음 — 신규 | 신규 |
| 강제 수준(enforcement_level) 속성 | 없음 — 신규 | 신규 |
| 우선순위 결정 규칙 | 없음 — 신규 | 신규 |

## 5. 무후퇴 · Extend

Policy 신규 설계는 `UserAuth.php:141`의 결제만료 강등 로직을 재구현하거나 대체하지 않는다 — 이는 여전히 독립적인 fail-secure 규칙으로 그대로 유지되며, Policy 계층은 이를 "설계 패턴 참조"로만 삼고 흡수하지 않는다(D-2 유사 원칙 — 참조이지 흡수 아님). `TeamPermissions.php:722`의 risk=high 필드 계산 로직도 변경하지 않고 읽기 전용으로만 소비한다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: Scope(§4)·Schedule(§3) 및 선행 Part 3-1~3-7 완결 확인
- [ ] 7유형 Policy 엔티티 스키마 확정(코드 0 유지)
- [ ] Policy 우선순위 결정 규칙 확정(fail-secure 원칙 반영)
- [ ] Risk-based 발동 신호(`TeamPermissions.php:722`) 소비 계약 확정
- [ ] Rule(§5 별도 문서)로의 파생 계약 인터페이스 확정
- [ ] `UserAuth.php:141` 참조 패턴이 흡수로 오인되지 않도록 재검증
- [ ] NOT_CERTIFIED 상태에서 실제 코드 구현 착수 승인 획득

## 7. 반날조 인용 출처

- SPEC §5(Mandatory/Optional/Risk-based/Compliance/Critical Role/High Risk Perm/All) / ADR D-1(Extend-Wrap) · D-2(참조·흡수아님 원칙 준용)
- Ground-Truth ① §(risk=high 신호·결제만료 강등 패턴) · ② §(데이터 certification 정책 KEEP_SEPARATE 근거)
- ABSENT 항목(7유형 Policy 엔티티 전체·강제수준·우선순위 규칙)은 grep 0 실측 — 결제만료 강등을 "이미 구현된 정책"으로 과장하지 않음
