# DSAR — Approval Role Critical Gap Policy (EPIC 06-A-03-02-03-04 Part 3-1 · Role Registry Foundation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule(Extend not Replace) · 폐기 admin_roles/user_roles 재부활 금지 · 289차 P1~P4(writeGuard 서버측·requireFeaturePlan·admin_roles 폐기·admin SSOT `resolveAdminByToken`) 재플래그 금지 · 반날조(substrate file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

§57은 Role Registry에서 **High/Critical로 처리해야 하는 위험 후보 목록**이다. 본 문서는 각 후보를 이 저장소의 실측 substrate와 대조해 **두 부류로 분류**한다. Role Registry 관점에서 gap은 다음 두 종류로 갈린다.

| 부류 | 의미 | 판정 어휘 |
|---|---|---|
| 🔴 **실재(순신규 High)** | Canonical Role Registry 계약 자체가 부재해 위험을 방지할 통제가 없음 → 지금 열려있는 구조적 위험 | `HIGH_UNPREVENTED` |
| ⚪ **정직 부재(해당없음)** | 대상 개념(JobTitle/isManager/isApprover 등)이 레포에 전무하여 안티패턴을 수행할 코드조차 없음 → 결함으로 날조 금지 | `NOT_APPLICABLE_ABSENT` |

★**`VALIDATED_LEGACY` 미사용(cover 0)** — Canonical Role Registry가 통째 부재하므로 어떤 gap도 "기존 구현이 이미 막는다"가 아니다. 단 **예외 두 축**: ⓐ `plan god flag`는 §6.5 위반이 **실재**(후속 정합 대상)이고, ⓑ `admin_roles/user_roles`는 289차 폐기분(재플래그 금지)이다.

## 2. 열거 / 항목 (§57 Critical Gap 후보 전사 + 판정)

| # | §57 gap 후보 | 부류 | 현행 대조 (substrate file:line) | 판정 |
|---|---|---|---|---|
| 1 | Canonical Role Registry 없음 | 🔴순신규 | 통합 Registry 테이블/개념 전무 — 5 어휘 산재 | HIGH_UNPREVENTED |
| 2 | Role Code 표준(Namespace) 없음 | 🔴순신규 | flat 문자열 · 값충돌('admin' 3체계) `TeamPermissions.php:132`·`AdminMenu.php:247`·`Keys.php:95` | HIGH_UNPREVENTED |
| 3 | Role Version 없음 | 🔴순신규 | 버전 컬럼/개념 없음 | HIGH_UNPREVENTED |
| 4 | Role Owner 없음 | 🔴순신규 | Business/Technical/Security Owner 개념 전무 | HIGH_UNPREVENTED |
| 5 | Role Purpose 없음 | 🔴순신규 | 역할 목적/근거 필드 전무 | HIGH_UNPREVENTED |
| 6 | Permission Mapping 없음(단일) | 🔴순신규/선행 | 3분산(acl_permission `TeamPermissions.php:39,152-159`·roleRank `index.php:573`·admin_menus) · 단일 매핑 함수 부재 | HIGH_UNPREVENTED · BLOCKED_PREREQUISITE(RP-002) |
| 7 | Role↔Permission 혼용 | 🔴순신규 | Role 문자열이 곧 Permission 묶음으로 소비(`TeamPermissions.php:120-131`) · 분리계약 부재 | HIGH_UNPREVENTED |
| 8 | Role↔JobTitle 혼용 | ⚪정직 부재 | job_title/jobTitle 0건 · position=비-HR | NOT_APPLICABLE_ABSENT |
| 9 | Role↔Authority 혼용 | 🔴순신규 | Approval Authority(Part 5) 개념 부재 · Role=쓰기위계로만 소비 | HIGH_UNPREVENTED |
| 10 | Role↔Feature Flag/Plan 혼용 | 🔴실재(§6.5) | **plan 'admin' god flag 이중사용** `TeamPermissions.php:132`·`AuthContext.jsx:720`·`AdminMenu.php:57` | HIGH_UNPREVENTED(후속 정합) |
| 11 | isAdmin Boolean이 Role 대체 | 🔴실재 | `isAdmin`(`TeamPermissions.php:132`)·`isOwnerAdmin`(`:134`)·`isManagerAdmin`(`:136`) Boolean 파생이 Role 판정 대체 | HIGH_UNPREVENTED |
| 12 | Cross-Tenant Role | 🔴순신규 | Registry tenant 격리 계약 부재(team=`TeamPermissions.php:145-151`은 데이터격리이나 Role 정의 격리 아님) | HIGH_UNPREVENTED |
| 13 | Human Role을 Service Account에 | 🔴순신규 | actor type eligibility 개념 부재 · api_key role(`Keys.php:95`)과 team_role 분리축 미형식화 | HIGH_UNPREVENTED |
| 14 | Retired Permission 포함 | 🔴순신규/선행 | Permission Version/Retire 개념 부재(Part 2 BLOCKED) | BLOCKED_PREREQUISITE |
| 15 | Deprecated/Suspended/Retired Role Runtime | 🔴순신규 | Role Lifecycle 개념 부재(하드코딩 enum) | HIGH_UNPREVENTED |
| 16 | Snapshot/Evidence 없음 | 🔴순신규 | 역할 스냅샷/이력 없음 · Evidence=auth_audit_log 변경로그만(PARTIAL) | HIGH_UNPREVENTED |
| 17 | In-place Update | 🔴순신규 | 불변 버전체인 부재 → 정의 덮어쓰기 방지 0 | HIGH_UNPREVENTED |
| 18 | Permission Version 미고정 | 🔴선행 | Permission Version 결합 대상 부재(Part 2) | BLOCKED_PREREQUISITE |
| 19 | Scope Requirement/Assignment Policy 없음 | 🔴순신규 | Scope Requirement=PARTIAL(api_key scopes_json·admin:menu_super) · Assignment Policy 부재 | HIGH_UNPREVENTED |
| 20 | Temp 만료 없음 | 🔴순신규 | Temporary Role 템플릿·만료 개념 부재 | HIGH_UNPREVENTED |
| 21 | Emergency 없음 | 🔴순신규 | Break-glass/Emergency Role 개념 부재 | HIGH_UNPREVENTED |
| 22 | Review/Certification 없음 | 🔴순신규 | 주기 Review/인증 개념 부재 | HIGH_UNPREVENTED |
| 23 | Cache Version/Tenant 없음 | 🔴순신규 | Role 해석 캐시 버전/테넌트 키 계약 부재 | HIGH_UNPREVENTED |
| 24 | Duplicate Role | 🔴순신규 | Role Code 유일성 제약 부재 · 값 'admin' 3중복 | HIGH_UNPREVENTED |
| 25 | Legacy 자동활성 | ⚪정직 부재/폐기 | admin_roles/user_roles=289차 폐기·고아(`routes.php:1670`·`UserAdmin.php:596-599`) — 재부활 금지 | NOT_APPLICABLE_ABSENT |
| 26 | Alias Runtime | 🔴순신규 | Legacy Alias→Canonical 매핑 개념 부재(신규 정규화 시 필요) | HIGH_UNPREVENTED |
| 27 | 고객설정 비활성 | 🔴순신규(§6.17) | Mandatory Control lock 개념 0 → 필수 통제를 끌 수 없게 하는 장치 부재 | HIGH_UNPREVENTED |

**전사 27항.** 커버리지 = **`VALIDATED_LEGACY` 0** · `HIGH_UNPREVENTED` 대다수(순신규) · `BLOCKED_PREREQUISITE` 3(#6·14·18) · `NOT_APPLICABLE_ABSENT` 2(#8 JobTitle 혼용·#25 Legacy 자동활성) · #10은 실재 안티패턴(§6.5·후속 정합).

## 3. substrate 매핑 (§5.2)

| Canonical 방지대상 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Registry/Version/Namespace/Owner/Purpose | **ABSENT → 신설** | 없음(순신규) |
| Permission Mapping(단일) | **PARTIAL(3분산)** | `TeamPermissions.php:39,152-159`(acl_permission) · roleRank `index.php:573` · admin_menus |
| plan god flag(§6.5 실재) | **ANTI_PATTERN(후속 정합)** | `TeamPermissions.php:132`·`AuthContext.jsx:720`·`AdminMenu.php:57` |
| isAdmin Boolean 대체 | **실재(정형화 대상)** | `TeamPermissions.php:132,134,136` |
| JobTitle/isManager/isApprover 혼용 | **정직 부재(ABSENT)** | job_title/jobTitle/isManager/isApprover grep 0건 |
| admin_roles/user_roles Legacy | **DEPRECATED(289차 폐기)** | `routes.php:1670`·`UserAdmin.php:596-599`(고아 유지) |

## 4. 설계 원칙

1. **두 부류 분리가 정직의 핵심** — 순신규 High는 "구조적으로 열려있는 위험"으로 등재하되, JobTitle/isManager/isApprover 혼용(#8)은 **레포에 존재하지 않으므로 결함으로 날조 금지**(ADR D-3).
2. **plan god flag(#10)만 유일한 실재 안티패턴** — §6.5 위반이나 광범위 실코드 영향이라 자립 quick-fix가 아닌 **후속 enforcement Part**로 등재(ADR D-2). admin 판정 SSOT `resolveAdminByToken`(289차 P4)이 정합 기반 확보.
3. **폐기 admin_roles 재부활 금지(#25)** — DORMANT 제거 판정 역행 금지. Canonical Role은 team_role/TeamPermissions 위에 신설.
4. **Golden Rule** — 5 role 어휘·acl_permission·api_key role·admin_level·SSO map을 삭제·재구현 없이 Registry 밑 substrate로 정형화(회귀 0).
5. **선행 전제 명문화(#6·14·18)** — Permission Version 결합 gap은 Part 2 Permission Engine 실 구현 이후 닫힌다(BLOCKED_PREREQUISITE·RP-002).

## 5. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Permission Mapping/Version 고정(#6·14·18)은 선행 Part 2 실 구현(코드 0) 이후 가능. 본 차수 코드 0.
- **Gap-대다수(순신규 High)**: Registry/Namespace/Version/Owner/Purpose/Lifecycle/Snapshot/Evidence/Scope Requirement/Temp/Emergency/Review/Cache/Duplicate/Alias/Mandatory Control 계약 전무.
- **Gap-실재(§6.5 후속 정합)**: plan 'admin' god flag(#10)·isAdmin Boolean 대체(#11).
- **정직 부재**: JobTitle/isManager/isApprover 혼용(#8) NOT_APPLICABLE_ABSENT · Legacy 자동활성(#25) 289차 폐기.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine 실 구현 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_STATIC_LINT]] · [[DSAR_APPROVAL_ROLE_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]]
