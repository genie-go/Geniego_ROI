# DSAR — Approval Scope Revalidation (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Revalidation · 스펙 §33)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scope Registry/Version(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변 · Cache는 Version 기반 · Default Intersection(Scope 자동확대 금지·ADR D-2) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §33 Scope Revalidation = **Organization · Project · Policy · Role · Assignment** 5개 트리거가 발생했을 때 기존 Effective Scope를 강제로 재평가하는 절차. §32 Drift가 탐지 신호원이라면 Revalidation은 그 신호를 소비해 실제 재계산을 강제하는 소비자다.

- **순신규**: 소비할 Drift 신호 자체가 ABSENT(§32 DSAR 파일 참조)·Revalidation을 강제하는 별도 워크플로우 grep 0. effectiveScope가 매 요청 라이브 재계산되므로(`TeamPermissions.php:236-265`) "결과적으로 항상 최신"인 부작용이 있으나, 이는 트리거 기반 revalidation이 아니라 **캐시 부재로 인한 우연한 최신성**이다(§38 Cache 파일 참조).

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | revalidation id | Revalidation PK |
| 2 | scope id / assignment id | 대상 Scope/Assignment |
| 3 | trigger type | 아래 §3 열거형 |
| 4 | triggered at | 트리거 발생 시각 |
| 5 | triggered by | 발생 주체/이벤트 |
| 6 | previous scope version id | 재검증 전 Version |
| 7 | new scope version id | 재검증 후 Version |
| 8 | result | 재확인 / 변경 / 거부 |
| 9 | runtime blocked during revalidation | 재검증 중 런타임 차단 여부 |
| 10 | completed at | 완료 시각 |
| 11 | status | Revalidation 상태 |
| 12 | evidence | 근거(§36 참조) |

## 3. 열거형 (Trigger Type — 스펙 §33 원문 그대로)

`ORGANIZATION_CHANGED` · `PROJECT_CHANGED` · `POLICY_CHANGED` · `ROLE_CHANGED` · `ASSIGNMENT_CHANGED`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Trigger Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| ORGANIZATION_CHANGED(근접) | ORG_PRESET `seedOrg` 실행(idempotent) | `TeamPermissions.php:706-722` | 근접(조직 변경 이벤트는 실재)이나 이 이벤트를 소비해 기존 scope 배정을 강제 재평가하는 로직 grep 0 — 오히려 재무팀 프리셋은 즉시 company(무제한) 적용(DUPLICATE_AUDIT §D-5 위험 지점) |
| PROJECT_CHANGED | — | — | **ABSENT** — PM 프로젝트 변경 이벤트는 scope와 미연동(`PM/Shared.php:59-89`) |
| POLICY_CHANGED(근접) | HIGH_VALUE_KRW 상수 변경 시나리오 | `Catalog.php:1036,1104-1148` | 근접이나 상수 변경을 감지·재평가하는 트리거 로직 grep 0 |
| ROLE_CHANGED | — | — | **ABSENT** — Role Registry/Version 자체 코드 0(Part 3-1) |
| ASSIGNMENT_CHANGED(근접) | `replaceScope` DELETE→INSERT 직접 교체 | `TeamPermissions.php:337-346` | 근접(assignment 변경 이벤트 자체는 실재)이나 교체가 즉시 반영되어 "이전 버전 대비 재검증" 절차가 개입할 지점이 없음(교체=재검증 없는 즉시 확정) |

## 5. 설계 원칙

- Revalidation은 Drift 신호를 소비하는 소비자(§32) — Drift가 ABSENT이므로 현재는 5개 트리거 전부 "이벤트는 발생하나 소비자가 없는" 상태.
- ORGANIZATION_CHANGED의 근접 위험 사례(ORG_PRESET 재무팀 company 즉시적용)는 Revalidation이 아니라 "승인 없는 즉시 확대"에 해당 — Scope Expansion Guard(스펙 §29, ADR §3) 신설 시 이 지점에 정지 훅이 필요.
- ASSIGNMENT_CHANGED는 `replaceScope`가 "교체 후 재검증" 순서가 아니라 "교체=확정"이므로, revalidation 개념이 성립하려면 Version 도입(불변 이력)이 먼저 선행되어야 한다.
- manager scope 위임상한 실결함(`TeamPermissions.php:648-653`·DUPLICATE_AUDIT §D-5)은 ASSIGNMENT_CHANGED 트리거가 있었다면 재검증에서 걸러질 사안이나, 현재 트리거 소비자 부재로 실행 시점에 그대로 통과된다.

## 6. Gap / BLOCKED_PREREQUISITE

- ROLE_CHANGED = Part 3-1 Role Registry 코드 0로 BLOCKED_PREREQUISITE.
- PROJECT_CHANGED = PM↔Scope 연동 자체 미신설.
- ORGANIZATION_CHANGED/POLICY_CHANGED/ASSIGNMENT_CHANGED = 이벤트 발생 지점은 실재하나 소비자(Revalidation 로직) ABSENT.
- §32 Drift 선행 신호원 자체가 ABSENT → Revalidation은 이중 BLOCKED_PREREQUISITE.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Scope Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
