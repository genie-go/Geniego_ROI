# DSAR — Approval Role Assignment Reviewer (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Reviewer)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Approval Reference를 Version에 고정 · Effective는 version 기준 · 반날조

## 1. 목적

스펙 §1 핵심범위 목록 항목21 "Assignment Reviewer"는 **목록 나열에만 등장**하며 전용 섹션 본문이 없다. §10 Assignment Request 필드 나열에 "Reviewer · Approver · Decision"이 병기되어(§10 원문), 스펙이 Review와 Approval을 **별개 단계/별개 actor**로 구분하고 있음을 시사한다(Reviewer=검토, Approver=최종 승인). 본 문서는 이 구분 하나만 확정 근거로 삼고, Reviewer의 세부 스키마는 §10 필드 이상으로 확정하지 않는다.

## 2. Canonical 필드

★스펙 미상세 — §10 필드 공존("Reviewer" 단일 필드)만이 원문 근거이며, 아래는 그 위에 최소 유추한 후보 구조(비확정).

| 필드 | 의미 |
|---|---|
| `reviewer_id` | 검토자 식별자 |
| `assignment_request_id` | 검토 대상 Assignment Request(§10) 참조 |
| `review_decision` | 검토 결과(통과/반려/보완요청 — §10 "Decision"과는 별개 단계) |
| `review_notes` | 검토 의견 |
| `reviewed_at` | 검토 시각 |

## 3. 열거형 / 타입

- **스펙 미정의**: Reviewer의 세부 유형(단일 검토자/복수 검토자/도메인별 검토자 등)은 스펙 §10·§1 어디에도 열거되어 있지 않다. §9 Assignment Approval의 `SINGLE`/`DUAL`/`MULTI_STAGE` 패턴을 Review 단계에 유추 적용할 수 있다는 가능성만 표기하며, 확정하지 않는다(비확정).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| Reviewer라는 별도 Subject/Actor 유형 | **ABSENT** | 전수조사 §4 Subject 유형표 — 실재 유형은 Human(app_user)·API Client(api_key)·pm_task_assignees 4역할·acl_permission subject(`'team'`\|`'member'`만, `TeamPermissions.php:154,162`)뿐. "검토자"로 분리된 별도 역할 없음 |
| 검토 프로세스(Review→Approval 2단계 분리) | **ABSENT** | 승인 workflow 자체가 부재(전수조사 §3) — 그 앞 단계인 Review는 더욱 부재 |
| team_role `manager`를 Reviewer로 오인 | **오인 금지(근접 아님)** | `manager`는 Assignment의 **Subject**(role을 부여받는 대상)이지, 타인의 assignment 요청을 검토하는 역할이 아니다(ADR §D-4 Subject 축과 §1항목21 Reviewer 축은 서로 다른 개념). `assignableMap`(`TeamPermissions.php:354-360,644-647`)의 manager 팀 acl맵은 acl_permission 위임상한이지 Assignment Reviewer가 아니다(ADR §D-5) |

★근접 substrate 없음. 반날조 원칙 — 지어내지 않음.

## 5. 설계 원칙

1. **Reviewer ≠ Approver 구분 유지** — §10 원문이 두 필드를 병기하므로 동일 actor로 통합하지 않는다. 단 현재 둘 다 ABSENT.
2. **Reviewer ≠ team_role `manager`** — 기존 `manager` team_role 값(Subject 축, ADR §D-4)을 그대로 Reviewer 역할로 오흡수하지 않는다. Reviewer는 "타인의 assignment 요청을 검토하는 별개 actor 자격"이며 team_role 값 자체와는 독립된 축이어야 한다.
3. **Subject Type 신설 시 함께 설계** — 전수조사 §4가 확인한 대로 acl_permission subject는 `'team'`\|`'member'`뿐이다. Reviewer를 1급 actor로 도입하려면 Subject Type 확장이 선행되어야 한다(ADR §D-4).
4. **비확정 필드는 사용자 확인 전 구현 금지** — §2/§3 후보 구조는 스펙 원문 이상으로 확정하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: 상위 Assignment Request(§10, ABSENT)·Assignment Approval(§9, ABSENT)이 선행 미구현 — Reviewer가 소속될 프로세스 자체가 없다.
- **Gap-1**: 스펙이 Reviewer 전용 섹션 본문을 제공하지 않음 — §1 목록 항목21 라벨과 §10 필드 병기가 유일 원문 근거.
- **Gap-2**: Subject Type 축에 Reviewer에 대응하는 유형이 없음(전수조사 §4) — Reviewer 도입 전 Subject Type 확장이 선행 과제.
- **정직 부재**: team_role `manager`를 Reviewer로 대체하지 않음(ADR §D-4 Subject 축과의 개념 혼동 방지).
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
