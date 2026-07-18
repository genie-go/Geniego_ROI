# DSAR — Availability Matching (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§36 AVAILABILITY_MATCHING — 승인자 가용성(Availability) 상태 기반 계약. Availability 상태 enum:

1. AVAILABLE
2. BUSY
3. FOCUS_TIME
4. OUT_OF_OFFICE
5. VACATION
6. LEAVE
7. SUSPENDED
8. TERMINATED
9. UNKNOWN
10. CUSTOM

원칙: **Calendar/Presence 만으로 권한 부여 금지** — 가용성 신호는 **우선순위/제외 신호로만** 사용하고, 가용하다는 사실이 권한·자격을 부여하지 않는다.

## 2. 기존 구현 대조

- **ABSENT.** 승인자 가용성 상태(AVAILABLE/BUSY/OUT_OF_OFFICE/VACATION/LEAVE 등)를 표현·소비하는 엔티티가 전무하다. §GROUND_TRUTH 개념별 판정에서 **Availability=ABSENT**.
- 현행 배정 관련 신호는 `PM/Assignees.php:14,32` 의 role(owner/contributor/reviewer/observer) 과 `PM/Enterprise.php:371-400` 의 capacity/workload(읽기전용)뿐 — **가용성·근태·부재(OOO/휴가/휴직) 차원 없음**.
- Calendar/Presence 연동, out-of-office·leave 상태를 배정 후보 제외/강등 신호로 소비하는 로직 부재.
- **"Calendar/Presence 만으로 권한 부여 금지" 원칙(대조)**: 애초에 가용성 판정 코드가 없고, 상위 권한축인 축2 Authority Matrix 도 **ABSENT** 이므로 "가용성이 권한을 부여"하는 위험은 Availability·Authority 신설 이후에 관리 대상이 된다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Availability Matching 은 순신규 축으로 관련 엔티티가 전혀 없다. TERMINATED/SUSPENDED 등 신분 종속 상태는 **축3 Identity/Org(`org_unit/reporting_line/incumbency` ABSENT)** 및 **축4 Security/Authz(PARTIAL)** 의 subject/employment active 판정을 전제로 하므로 그 신설이 선행이다. 가용성은 배정 **우선순위/제외 보조 신호**일 뿐 권한의 원천이 아니다.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규.** Availability 상태 enum(AVAILABLE…CUSTOM)·Calendar/Presence 신호원·상태 유효기간을 신규 도입한다. 기존 `pm_task_assignees` role 모델(`PM/Assignees.php:14,32`)은 role 이지 availability 가 아니므로 확장 대상이 아니며 KEEP_SEPARATE.
- **재사용 자산**: 가용성은 §38 Priority Scoring/§39 Tie-break 의 한 차원(Current Availability)과 Candidate Exclusion(§17 UNAVAILABLE/OUT_OF_OFFICE/LEAVE)으로만 편입 — 별도 배정 큐 신설 금지.
- **Mandatory Control**: **Availability 는 우선순위·제외 신호로만 사용**하고, "가용함"이 Mandatory Authority·SoD·Direct Assignment 검증을 우회하거나 권한을 부여하게 하지 않는다(fail-closed). UNKNOWN 은 가용으로 간주하지 않는다(fail-closed). Calendar/Email body 등 원문은 저장 금지(§63 저장금지 목록 준수).
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. 가용성 판정이 없는 동안 "가용 담당자 자동배정"을 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
