# DSAR — Approval Scope Drift (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Drift · 스펙 §32)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scope Registry/Version(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변 · Cache는 Version 기반 · Default Intersection(Scope 자동확대 금지·ADR D-2) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §32 Scope Drift = 배포·확정된 Scope 상태(Assignment/Effective Scope)가 이후 발생한 **Organization · Project · Dataset · Resource · Policy** 변경과 불일치하는 조건을 정형 탐지하는 엔티티. Drift는 스스로 Scope를 수정하지 않으며(무후퇴), §33 Revalidation의 트리거 신호원으로만 작동한다.

- **순신규**: Scope Version/Registry 자체가 ABSENT(ADR §D-4·EXISTING_IMPLEMENTATION §9) → 배포 상태와 현재 상태를 비교할 대상 자체가 없음. effectiveScope는 매 요청 라이브 재계산(`TeamPermissions.php:236-265`)이라 "이전 상태"라는 개념이 성립하지 않음.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | drift id | Drift PK |
| 2 | scope id / scope definition id | 대상 Scope |
| 3 | scope version id | Drift가 관측된 Version |
| 4 | drift type | 아래 §3 열거형 |
| 5 | previous digest | 이전(배포/확정) 상태 다이제스트(§37) |
| 6 | current digest | 현재(재계산) 상태 다이제스트(§37) |
| 7 | affected subject | 영향받는 Subject |
| 8 | affected scope type | 영향받는 Scope Type |
| 9 | severity | 심각도 |
| 10 | runtime blocked | 런타임 인가 차단 여부 |
| 11 | revalidation required | 재검증 요구 여부(§33 트리거 연동) |
| 12 | detected at | 탐지 시각 |
| 13 | resolved at | 해소 시각 |
| 14 | status | Drift 상태 |
| 15 | evidence | 근거(§36 참조) |

## 3. 열거형 (Drift Type — 스펙 §32 원문 그대로)

`ORGANIZATION_DRIFT` · `PROJECT_DRIFT` · `DATASET_DRIFT` · `RESOURCE_DRIFT` · `POLICY_DRIFT`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Drift Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| ORGANIZATION_DRIFT(근접) | TEAM_TYPES 정의·ORG_PRESET 시드(조직 변경 지점) | `TeamPermissions.php:44-49,706-722` | 근접(조직 변경 이벤트 자체는 실재)이나 diff 계산·drift 탐지 로직 없음 |
| PROJECT_DRIFT | PM 모듈은 data_scope 미연동 | `PM/Shared.php:59-89`·`PM/Projects.php:30-143` | **ABSENT** — PM 프로젝트 변경이 scope 개념과 아예 연결되지 않아 drift 자체가 성립 불가 |
| DATASET_DRIFT | — | — | **ABSENT** — dataset scope 자체 grep 0(field/row/dataset scope 부재) |
| RESOURCE_DRIFT(근접) | acl_permission menu_key×action(리소스=메뉴 단위만) | `TeamPermissions.php:39,55-82,152-159` | 근접(리소스 scope 자체는 실재)이나 변경 이력 diff·drift 탐지 grep 0 |
| POLICY_DRIFT(근접) | HIGH_VALUE_KRW 단일 정적임계치·evaluatePolicy | `Catalog.php:1036,1104-1148` | 근접(policy 값 자체는 실재)이나 버전 관리·변경 추적 없이 상수 하나만 존재 |

## 5. 설계 원칙

- Drift는 비파괴 신호원 — Scope Assignment를 in-place 수정하지 않는다(§6 Version 불변 원칙과 동형).
- ORGANIZATION_DRIFT/RESOURCE_DRIFT의 근접 substrate(TEAM_TYPES/ORG_PRESET, menu acl)는 "scope가 저장되는 지점"을 보여줄 뿐 drift 탐지(구버전 vs 신버전 비교) 로직 자체가 아니다 — 오흡수 금지.
- PROJECT_DRIFT는 PM 모듈이 data_scope와 완전히 분리된 별개 체계이므로(`PM/Shared.php:59-89`), Scope Registry가 신설되어도 PM 프로젝트 변경을 감지하려면 먼저 PM↔Scope 연동 자체를 신설해야 한다(선행조건 이중).
- POLICY_DRIFT는 amount scope(HIGH_VALUE_KRW)가 역할/테넌트별 차등 없는 단일 상수이므로(`Catalog.php:1036`), "policy 버전"이라는 개념이 성립하려면 다단계·차등 정책 신설이 선행되어야 한다.

## 6. Gap / BLOCKED_PREREQUISITE

- DATASET_DRIFT = 완전 ABSENT(선행 substrate 자체 없음).
- ORGANIZATION_DRIFT/RESOURCE_DRIFT/POLICY_DRIFT = 근접 substrate 존재하나 diff/버전 비교 로직 ABSENT.
- PROJECT_DRIFT = PM↔Scope 연동 자체가 선행 신설 대상(이중 BLOCKED_PREREQUISITE).
- previous/current digest 비교(필드 5,6) = §37 Digest 선행 신설 대상.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Scope Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
