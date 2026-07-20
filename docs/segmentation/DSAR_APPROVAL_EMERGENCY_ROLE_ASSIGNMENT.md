# DSAR — Emergency Role Assignment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity 설계 · 스펙 §12)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Role Hierarchy(Part 3-2) 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **불변**: Delegated Assignment ≤ 원 Assignment Scope · **Emergency Assignment = Auto Expiration + Mandatory Audit**(스펙 §12) · 과거 Version 수정 금지(ADR §D-2)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. ★**break-glass(`UserAuth.php:790-801`)는 인증우회(MFA 우회)지 임시 role 부여가 아니다** — Emergency Role Assignment(role 발급/자동만료)와 혼동 금지. break-glass MFA 우회 자체는 289차 BLOCKED_SECURITY 등재분(재플래그 금지·별개 트랙).

---

## 1. 목적

Emergency Role Assignment = 인시던트 대응을 위해 한시적으로 상승된 Role을 부여하는 Assignment 유형으로, Incident Reference·Break Glass Reason·Approver·Maximum Duration·Auto Expiration·Mandatory Audit·Mandatory Review·Mandatory Evidence를 필수 수반한다(스펙 §12 원문 그대로). Break Glass(스펙 §13, 별도 편)와 밀접하나, Emergency Assignment는 "**role을 발급**"하는 축이고 Break Glass는 "**허용 트리거 조건**" 축으로 스펙상 분리되어 있다.

- **순신규**: Incident Reference·Max Duration·Auto Expiration·Mandatory Audit/Review/Evidence를 결합한 임시 role 발급 개념 자체가 부재(ADR §D-5).

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT`(Emergency 하위유형 · 스펙 §12 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | assignment id | Assignment 식별자 |
| 2 | incident reference | 인시던트 식별자/티켓 참조 |
| 3 | break glass reason | 긴급 사유 |
| 4 | approver | 승인자 |
| 5 | maximum duration | 최대 허용 기간(상한) |
| 6 | auto expiration | 자동 만료(Mandatory Control) |
| 7 | mandatory audit | 필수 감사 기록 |
| 8 | mandatory review | 필수 사후 검토 |
| 9 | mandatory evidence | 필수 근거자료 |
| 10 | assignment lifecycle | Requested~Archived(스펙 §7) |

## 3. 열거형 / 타입

Assignment Revocation 유형(스펙 §23) 중 `Emergency`·`Incident Based`가 Emergency Assignment 종료축과 대응. Assignment Approval 유형(스펙 §9) 중 `Emergency Approval`이 승인축과 대응. Assignment Suspension 유형(스펙 §24) 중 `Incident`가 정지축과 대응.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Emergency 요소 | 최근접 substrate | file:line | 판정 |
|---|---|---|---|
| Incident Reference / Break Glass Reason(role 발급 결합) | — | ABSENT | 임시 role 발급과 결합된 인시던트 참조 필드 grep 0 |
| ★근접이나 별개 축: 인증우회 break-glass | `GENIE_BREAKGLASS_*` 환경변수 기반 MFA 우회 | `UserAuth.php:790-801,929-935,995-999` | **role 부여 아님** — 로그인 인증 절차 우회이며, 임시 role 발급·자동만료와 무관(ADR §D-5·289차 BLOCKED_SECURITY 등재분) |
| Mandatory Audit(근접 substrate) | break-glass 이벤트가 SecurityAudit에 기록 | `UserAuth.php:790-801,929-935,995-999`(auth.breakglass→SecurityAudit) | 근접 — **인증우회 이벤트**는 감사되나, Emergency Role Assignment(role 발급) 이벤트 자체가 없으므로 소비 대상 부재 |
| Mandatory Audit 인프라(승격 대상) | tamper-evident 해시체인 | `SecurityAudit.php:56-68` | 유일 실 tamper-evident 체인(ADR §3 "SecurityAudit tamper-evident 체인으로 승격") — Emergency Assignment 이벤트 기록 대상으로 확장 가능하나 현재 role assignment 미기록 |
| Auto Expiration | api_key expires_at(다른 목적) | `Keys.php:119,170`·`index.php:518-520` | 근접 패턴(시간 기반 실효 게이트)이나 Emergency Role Assignment에 적용된 사례 아님 |
| Maximum Duration / Mandatory Review / Approver(Emergency Approval) | — | ABSENT | 승인 workflow 자체 부재(EXISTING §3 "승인 workflow 부재(전수 grep 0)") |

## 5. 설계 원칙

- **Emergency ≠ Break Glass 재상표**: 스펙은 두 엔티티를 §12(Emergency Assignment)·§13(Break Glass)로 분리 — Emergency Assignment는 "role 발급 레코드"이고 Break Glass(별도 편)는 "허용 트리거·인시던트 카테고리"다. 기존 인증우회 break-glass 코드를 Emergency Role Assignment의 실 구현으로 오인·재상표 금지.
- **Auto Expiration은 Mandatory Control**(스펙 §12) — 고객 설정으로 비활성화 불가. 신설 시 Temporary Assignment(§11)의 자동 제거 워커와 공유 인프라로 설계(중복 워커 신설 금지).
- **Mandatory Audit는 SecurityAudit 확장**: 신규 audit 테이블 신설 금지 — `SecurityAudit::verify` 체인(`SecurityAudit.php:56-68`)에 Emergency Assignment 이벤트를 편입(ADR §3 승격 방향과 일치).
- **289차 BLOCKED_SECURITY 재플래그 금지**: break-glass MFA 우회는 이미 별도 트랙에 등재된 보안 항목이며, 본 설계 거버넌스 문서는 이를 재진단·재플래그하지 않고 "Emergency Role Assignment와 구분되는 근접 substrate"로만 인용한다.

## 6. Gap / BLOCKED_PREREQUISITE

- Emergency Role 발급(role 값 자체를 부여) = **전 구간 ABSENT** — 현 break-glass는 인증우회이지 role grant가 아님(정직 판정, 근접 substrate로만 인용).
- Incident Reference·Maximum Duration·Mandatory Review·Mandatory Evidence 결합 구조 = **ABSENT**.
- 승인 workflow(Emergency Approval) = **ABSENT**(EXISTING §3 전수 grep 0).
- Assignment Lifecycle/Version(스펙 §6·§7) = **BLOCKED_PREREQUISITE**(ADR §D-2 코드 0) — Emergency 상태 전이를 담을 그릇 부재.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
