# DSAR — Document Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-4)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **스펙 근거**: [`EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC.md) §18 Document Scope(Folder · Document · Category)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실구현 후 별도 승인세션.
- **불변**: Default Intersection(§9 Scope Policy 기본) · envLabel≠Scope(배포라벨을 데이터 scope로 오분류 금지) · 반날조(부재 날조·실재 과신 양방향 금지) · 289차 P1~P4 재플래그 금지.

---

## 1. 목적

**문서/폴더/카테고리 단위의 접근범위**를 정형화한다. GeniegoROI는 CRM/KPI/Operations/P&L 도메인 REST API로, 파일시스템형 문서 저장소(Folder→Document→Category 위계)가 존재하지 않는다. 이 스펙 §18은 향후 문서형 자산(정책 문서·감사 증적·계약서 등)이 도입될 경우를 대비한 순신규 Scope Type 정형화다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `document_scope_code` | Document Scope 식별자 |
| `folder_ref` | 대상 Folder 참조 |
| `document_ref` | 대상 Document 참조 |
| `category_ref` | 대상 Category 참조 |
| `access_level` | READ / WRITE / DENY |
| `scope_level` | FOLDER / DOCUMENT / CATEGORY(§3) |

## 3. 열거형 / 타입

- **scope_level**: `FOLDER` · `DOCUMENT` · `CATEGORY`(스펙 §18 열거 그대로).
- **access_level**: `READ` · `WRITE` · `DENY`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Folder/Document/Category 단위 scope | — | **ABSENT** | grep 0(EXISTING §10 요약표 "field/row/dataset/document"=ABSENT) |
| 가장 근접한 리소스 단위 개념(비동형) | acl_permission menu_key(메뉴 단위) | **PARTIAL(비동형·리소스타입 분류 아님)** | `TeamPermissions.php:39,55-82,152-159`(EXISTING §6 "menu_key가 근접이나 리소스타입 분류 아님") |
| menu_tree.parent_id(UI 위계) | AdminMenu.php | **NOT_SCOPE(배제)** | `AdminMenu.php:107-117`(DUPLICATE §D-1 #7 "scope 아니나 위계 명칭 공유·혼동") |

★menu_tree.parent_id는 Document Scope의 Folder 위계와 **명칭만 유사**(둘 다 "위계")할 뿐, UI 네비게이션 트리이며 문서 접근범위가 아니다(ADR D-1 표 "menu_tree.parent_id | NOT_SCOPE(배제)"). Document Scope 신설 시 이 UI 위계를 Folder 위계로 오흡수하지 않는다.

## 5. 설계 원칙

- Document Scope는 **현 시점 substrate가 전무한 순신규 계층**이므로, 도입 시점까지는 Canonical Interface(Reference)만 유지하고 실제 스키마·핸들러는 만들지 않는다(Golden Rule — 사용처 없는 엔진 선제 구현 금지).
- 향후 문서형 자산이 실제로 생기면 acl_permission(menu 단위)과 동일한 Resource Scope 패턴(§16)을 재사용해 Folder/Document/Category를 Resource Instance의 하위 분류로 편입 — 별도 독립 Document Registry 신설 금지.
- menu_tree(UI 위계)·PM 프로젝트 문서(PM/Projects.php)는 각각 별개 체계로 경계 보존 — Document Scope로 오흡수 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 전 필드 순신규 ABSENT — substrate 자체가 없음(문서 저장소 미보유).
- **BLOCKED_PREREQUISITE**: 실 문서형 자산 도입 여부 자체가 별도 제품 결정 선행 + Canonical Scope Registry 및 선행 Permission/Role 계열 실구현 후 — **RP-002**.
- 289차 P1~P4 재플래그 금지.
