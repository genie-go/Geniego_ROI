# DSAR — Approval Role Runtime Guards (EPIC 06-A-03-02-03-04 Part 3-1 · Role Registry Foundation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

§59는 Role 해석(resolve)·Assignment·Permission 결합 **런타임 시점에 발동하는 강제 가드** 목록이다. static lint(저장 시점·§58)와 달리 가드는 실제 authz 요청·assignment 처리 순간에 판정한다. 이 저장소의 **현행 최근접 런타임 가드**는 ⓐ `index.php` RBAC 미들웨어(api_key role rank), ⓑ `requireTeamWrite`(team_role 쓰기가드), ⓒ `resolveAdminByToken`(admin SSOT)이나, 이들은 **Registry/Version/Namespace/Lifecycle/Snapshot을 알지 못하는 flat 가드**다. 본 문서는 각 §59 가드를 현행 최근접과 대조한다.

★**`VALIDATED_LEGACY` 미사용(cover 0)** — Registry 없이 동작하는 flat 가드는 §59가 요구하는 정밀 판정을 수행하지 못한다.

## 2. 열거 / 항목 (§59 Runtime Guard 목록 + 판정)

| # | §59 런타임 가드 | 현행 최근접 (substrate file:line) | 판정 |
|---|---|---|---|
| 1 | Registry/Namespace/Definition/Active Version Missing → 차단 | Registry/Version/Namespace 부재 | ABSENT |
| 2 | Invalid Role Code → 차단 | validRoles(`Keys.php:95`)·roleOf fail-closed(`TeamPermissions.php:120-131`)=코드검증 유사이나 Canonical Code 부재 | PARTIAL |
| 3 | Inactive/Suspended/Deprecated 신규 Assignment 차단 | Role Lifecycle 상태 부재 | ABSENT |
| 4 | Retired Role 런타임 차단 | Retire 개념 부재 | ABSENT |
| 5 | Tenant Mismatch 차단 | tenant 격리 실재(X-Tenant-Id `index.php` 주입)이나 Role 정의 tenant 대조 부재 | PARTIAL |
| 6 | Actor Type Ineligible 차단 | api_key role(API_CLIENT축 `Keys.php:95`)/team_role(HUMAN축 `UserAuth.php:188`) 분리 실재이나 eligibility 강제 부재 | PARTIAL |
| 7 | Service/System/API Client 제한 | api_key role rank(`index.php:573`) 존재이나 Service/System actor 형식화 부재 | PARTIAL |
| 8 | Permission Missing/Version Mismatch/Retired 차단 | Permission Version 결합 부재(Part 2 BLOCKED) | BLOCKED_PREREQUISITE |
| 9 | Group/Bundle Version Missing 차단 | Composite/Bundle 개념 부재(Part 3-2) | ABSENT |
| 10 | Scope Requirement/Assignment Policy/Owner Missing 차단 | Scope=PARTIAL(scopes_json·`Keys.php:189-194`) · Policy/Owner 부재 | PARTIAL |
| 11 | Review/Certification Overdue 차단 | Review/Certification 개념 부재 | ABSENT |
| 12 | Risk/Criticality Missing 차단 | Risk/Criticality 컬럼 부재 | ABSENT |
| 13 | Duplicate Code 차단 | Role Code 유일성 런타임 검사 부재 · 값 'admin' 3중복 | ABSENT |
| 14 | Ambiguity 차단 | 모호 단독 Role 자동활성 방지 부재 | ABSENT |
| 15 | Digest Mismatch 차단 | Definition digest 부재 | ABSENT |
| 16 | Snapshot/Evidence Missing 차단 | Snapshot 부재 · Evidence=auth_audit_log 변경로그만(PARTIAL) | PARTIAL |
| 17 | Drift 차단 | Drift/Revalidation 개념 부재 | ABSENT |
| 18 | Cross-Tenant 차단 | (=#5) Role 정의 교차테넌트 재검증 전용 가드 부재 | PARTIAL |
| 19 | Bypass 차단 | **plan god flag가 전역 bypass**(`TeamPermissions.php:132`·`AuthContext.jsx:720`) → 차단 아닌 우회 실재 | ANTI_PATTERN(§6.5) |
| 20 | Tamper 차단 | Definition tamper-evident 무결성(digest/해시체인) 부재 | ABSENT |

**전사 20항.** 커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 6(#2·5·6·7·10·16·18 중) · `BLOCKED_PREREQUISITE` 1(#8) · `ANTI_PATTERN` 1(#19) · `ABSENT` 나머지.

## 3. substrate 매핑 (§5.2) — 현행 최근접 가드

| Canonical 가드축 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| api_key role RBAC 미들웨어 | **CANONICAL(별개 actor·API_CLIENT)** | roleRank `index.php:573` · validRoles/scopes `Keys.php:95,189-194` |
| team_role 쓰기가드 | **CANONICAL_ROLE_REGISTRY_CANDIDATE** | `requireTeamWrite`(`UserAuth.php:1134`)·`teamCanWrite`(`:1125`)·`TEAM_OWNER_ONLY`(`:1117`)·roleOf(`TeamPermissions.php:120-131`) |
| admin 판정 SSOT | **정합 기반(289차 P4)** | `resolveAdminByToken`(plan\|plans='admin'+is_active+admin_level 폴백) · isMaster `UserAdmin.php:43-46` |
| AdminMenu 게이트 | **CONSOLIDATION_REQUIRED(반쯤 死)** | required_role 검증 `AdminMenu.php:247,401` · rank 불일치 `AdminMenu.php:74` |
| plan god flag bypass | **ANTI_PATTERN(§6.5)** | `TeamPermissions.php:132`·`AuthContext.jsx:720`·`AdminMenu.php:57` |
| Version/Lifecycle/Digest/Snapshot 가드 | **ABSENT → 신설** | 없음 |

## 4. 설계 원칙

1. **Registry 미도입 상태의 flat 가드는 §59를 충족하지 못한다** — `index.php` RBAC·`requireTeamWrite`·`resolveAdminByToken`은 실동작 가드이나 Version/Namespace/Lifecycle/Snapshot을 모른다. 실 가드는 **Registry 데이터층 신설 후** 이들 위에 얹는다(무후퇴·기존 가드 삭제 금지).
2. **admin SSOT는 확장 기반** — `resolveAdminByToken`(289차 P4)이 이미 admin 판정을 단일화 → Canonical Role 가드의 정합 진입점. 재플래그 금지.
3. **plan god flag bypass(#19)는 후속 정합** — §6.5 위반이나 광범위 영향(설계 등재·자립 quick-fix 아님).
4. **Retire/Deprecated/Suspended 런타임 차단(#3·4)은 Lifecycle 컬럼 신설이 선행** — 상태 없는 현행에서는 차단 대상이 없다.
5. **Permission Version Mismatch 가드(#8)는 BLOCKED_PREREQUISITE** — Part 2 실 구현 후.
6. **Tamper/Digest 가드(#15·20)는 무결성 정본에 결합** — 새 해시엔진 남립 금지(무결성 정본은 append-only 감사체인으로 위임, 본 Part 코드 0).

## 5. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Permission Missing/Version Mismatch/Retired 가드(#8)는 Part 2 이후.
- **PARTIAL(최근접 존재·불충분)**: Role Code 검증(#2)·Tenant(#5·18)·Actor Type(#6·7)·Scope(#10)·Evidence(#16) — flat 가드가 존재하나 Registry 미인지.
- **ANTI_PATTERN(§6.5)**: plan god flag bypass(#19) — 후속 정합.
- **ABSENT(순신규)**: Lifecycle/Review/Risk/Duplicate/Ambiguity/Digest/Drift/Snapshot/Tamper 가드.
- **판정**: NOT_CERTIFIED · 실 가드 = Registry 신설 + Part 2 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_STATIC_LINT]] · [[DSAR_APPROVAL_ROLE_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]]
