# DSAR — Approval Assignment Candidate Exclusion Reason (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`CANDIDATE_EXCLUSION_REASON` enum (§17) — 도출된 후보가 **왜 자격에서 제외됐는지**의 정본 사유. 원문 37종.

1. SUBJECT_INACTIVE
2. EMPLOYMENT_INACTIVE
3. ROLE_INACTIVE
4. POSITION_INACTIVE
5. QUEUE_MEMBERSHIP_INACTIVE
6. WRONG_TENANT
7. WRONG_LEGAL_ENTITY
8. WRONG_ORGANIZATION
9. WRONG_GEOGRAPHY
10. WRONG_RESOURCE
11. WRONG_ACTION
12. AUTHORITY_MISSING
13. AUTHORITY_INACTIVE
14. DELEGATION_NOT_APPLICABLE
15. DELEGATION_EXPIRED
16. DELEGATION_REVOKED
17. DELEGATION_SUSPENDED
18. AMOUNT_ABOVE_LIMIT
19. CURRENCY_MISMATCH
20. CAPACITY_EXHAUSTED
21. WORKLOAD_EXCEEDED
22. UNAVAILABLE
23. OUT_OF_OFFICE
24. LEAVE
25. SECURITY_SUSPENDED
26. SOD_FAILED
27. CONFLICT_OF_INTEREST
28. SKILL_MISMATCH
29. LANGUAGE_MISMATCH
30. COUNTRY_MISMATCH
31. QUEUE_NOT_ELIGIBLE
32. DUPLICATE_CANDIDATE
33. CURRENT_ASSIGNEE_EXCLUDED
34. PREVIOUSLY_REJECTED_ASSIGNMENT
35. MANUAL_EXCLUSION
36. OTHER
37. (사유는 후보별 다중 부여 가능 — `exclusion reasons` 는 CANDIDATE(§15) 필드에서 배열)

## 2. 기존 구현 대조

상위 Candidate 파이프라인이 **ABSENT**(개념별 판정)이므로 제외 사유를 계산·부여하는 로직이 통째로 부재하다. 후보 도출이 없으면 제외 판정도 없다.

| 제외 사유군 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| SUBJECT/EMPLOYMENT/ROLE/POSITION_INACTIVE | 신원 상태 판정 = team_role flat 3값(`UserAuth.php:1225-1227`)뿐 · employment/position 상태축 ABSENT(축3) | BLOCKED_PREREQUISITE |
| WRONG_TENANT | 인접 = tenant 격리(분산·§GROUND_TRUTH 축4) — 후보 제외 사유 계산 아님 | PARTIAL(격리 분산) |
| WRONG_LEGAL_ENTITY/ORGANIZATION/GEOGRAPHY | 축3 legal_entity/org_unit **ABSENT** | BLOCKED_PREREQUISITE |
| AUTHORITY_MISSING/INACTIVE | 축2 Authority Matrix **ABSENT** | BLOCKED_PREREQUISITE |
| DELEGATION_* (4종) | 위임 정본 부재 · `TeamPermissions.php:627-647` DELEGATION_EXCEEDED=ACL 부여상한(인접상이) | BLOCKED_PREREQUISITE |
| AMOUNT_ABOVE_LIMIT/CURRENCY_MISMATCH | amount_band 0(축2 ABSENT) | BLOCKED_PREREQUISITE |
| CAPACITY_EXHAUSTED/WORKLOAD_EXCEEDED | 인접 = `PM/Enterprise.php:371-400` capacity/workload(읽기전용·미환류) — 제외 판정 미연결 | PARTIAL(읽기전용) |
| UNAVAILABLE/OUT_OF_OFFICE/LEAVE | Availability 축 ABSENT(개념별 판정) | ABSENT |
| SECURITY_SUSPENDED | 인접 = break-glass(`UserAuth.php:773-778`)·`SecurityAudit.php:56-68` — 정지 제외 판정 미연결 | PARTIAL |
| SOD_FAILED/CONFLICT_OF_INTEREST | 축4 SoD hook·CoI foundation **부재** | BLOCKED_PREREQUISITE |
| SKILL/LANGUAGE/COUNTRY_MISMATCH | Skill/Affinity 축 ABSENT(개념별 판정) | ABSENT |
| QUEUE_NOT_ELIGIBLE | Queue Eligibility=PARTIAL(RBAC만) — 후보 제외 사유로 미환류 | PARTIAL |
| DUPLICATE_CANDIDATE/CURRENT_ASSIGNEE_EXCLUDED/PREVIOUSLY_REJECTED | 후보 파이프라인 부재 → 중복/기배정/기거절 판정 원천 불가 | ABSENT |
| MANUAL_EXCLUSION/OTHER | 부재 | ABSENT |

## 3. 판정

- Verdict: **ABSENT** — 제외 사유 계산 로직 통째 부재(Candidate 파이프라인 ABSENT의 하위).
- 선행 의존: Authority/Delegation/LegalEntity/Org/SoD/CoI 관련 사유(약 절반)는 **선행 4축 부재**로 `BLOCKED_PREREQUISITE`. Capacity/Workload/Security/Queue 관련은 `PARTIAL`(읽기전용·미환류).
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Exclusion Reason 카탈로그는 순신설이나 **후보 도출 파이프라인(§15)이 선행**되어야 사유를 부여할 대상이 생긴다. 후보 없이 제외 사유만 정의하면 dead enum.
- Authority/Delegation/SoD/CoI 관련 사유는 **선행 4축이 세워진 뒤에만** 실제 판정 가능 — 그 전엔 상수로 채우지 마라(§58 "Mandatory Control 제거"·"SoD/CoI 우회" gap 재현).
- Capacity/Workload 사유는 `PM/Enterprise.php:371-400` 읽기 지표를 **제외 판정으로 환류**하도록 확장(현재 미환류).
- 다중 사유 배열을 지원하라 — 한 후보가 여러 사유로 동시 제외될 수 있고, 감사·Reconciliation(§56)이 전 사유를 요구한다.
- CURRENT_ASSIGNEE_EXCLUDED/PREVIOUSLY_REJECTED 는 Reassignment(§47)·History(§14) 정본 위에서만 판정 — 자기반복 배정 방지(§48)와 결선.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
