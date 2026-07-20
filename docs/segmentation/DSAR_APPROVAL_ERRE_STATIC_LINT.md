# DSAR — ERRE Static Lint (Hardcoded Authz Detection) (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §29(Static Lint · 하드코딩 authz 탐지)
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md) D-6
> **Ground-Truth**: ①[`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md) §3
> **불변 원칙**: 점진 수렴·무후퇴(급진 삭제 금지) · **반날조**: `파일:라인`·개소 수치는 상위 SPEC·ADR·Ground-Truth ①② 등장분만 · 289차 확정분 재플래그 금지

---

## 1. 목적

**Static Lint**(SPEC §29)는 코드 전반에 산재한 **하드코딩 authorization·resolution 우회를 정적으로 탐지**하는 도구·룰이다. SPEC §29 원문이 정의하는 탐지 대상은 다음 8종이다.

1. **Direct Permission Lookup** — 직접 권한 조회
2. **Hardcoded Authorization** — 하드코딩 authz(`=== 'admin'` 등)
3. **Bypass Resolution Engine** — resolution 엔진 우회
4. **Missing Explain** — 설명 누락
5. **Missing Snapshot** — 스냅샷 미참조
6. **Missing Audit** — 감사 누락
7. **Runtime Override** — 런타임 오버라이드
8. **Cache Poisoning Risk** — 캐시 오염 위험

본 편의 핵심은 ADR D-6이 확정한 **실 대상 233개소(BE 106/FE 127)**를 Static Lint 대상으로 등록하는 것이다. 이 233개소는 중앙 게이트를 거치지 않는 god-role 산재로, ERRE 단일 PDP·PEP를 우회하는 최대 아키텍처 부채다. Static Lint는 이를 정적 탐지·점진 수렴하고, 신규 우회 유입을 CI 단계에서 차단하는 것이 목적이다.

## 2. Ground-Truth (Static Lint substrate / ABSENT + 실 대상 233개소)

### 2.1 판정 요약 — **도구·룰 ABSENT / 실 대상 PRESENT(233개소 산재)**

Ground-Truth ② §2 표 #10: **"Runtime Guard / Static Lint = PARTIAL (Guard만). Static Lint(하드코딩 authz 정적탐지) ABSENT — 도구·룰 0."** 즉 탐지 대상(하드코딩 authz)은 대량 실재하나(§2 #11 PRESENT), 이를 탐지하는 정적 분석 도구·룰은 전무하다.

### 2.2 실 대상 233개소 — Ground-Truth ② §3 정본

패턴: `=== 'admin'`·`=== 'owner'`·`role == '...'`·`isAdmin/isOwner`.

**백엔드 106건 / 19파일**:

| 파일 | 개소 | 예시(근거) |
|---|---|---|
| `UserAuth.php` | 46 | 최다 산재 |
| `AdminMenu.php` | 12 | `gate()`(`:38`)·rank(`:74`) 이중 vocabulary |
| `UserAdmin.php` | 9 | — |
| `TeamPermissions.php` | 9 | `:132`(`($c['plan']??'')==='admin'`)·`:134`(`roleOf($c)==='owner'`) |
| `Keys.php` | 6 | — |
| `Payment.php` | 4 | — |
| `AgencyPortal.php` | 3 | — |
| `EnterpriseAuth.php` | 3 | — |
| `SystemMetrics.php` | 2 | — |
| `Wms.php` | 2 | — |
| `routes.php` | 2 | — |

**프론트 127건 / 36파일**:

| 파일 | 개소 |
|---|---|
| `pages/TeamMembers.jsx` | 19 |
| `auth/AuthContext.jsx` | 16 |
| `layout/Topbar.jsx` | 8 |
| `layout/Sidebar.jsx` | 7 |
| `components/GenieAssistant.jsx` | 7 |
| `pages/UserManagement.jsx` | 5 |
| `pages/PnLDashboard.jsx` | 5 |
| `auth/planMenuPolicy.js` | 5 |
| `auth/useVisibleTabs.js` | 3 |
| `pages/SubAdminManager.jsx` | 3 |
| `pages/AdminMenuManager.jsx` | 3 |

총 **233개소**가 `admin`/`owner` 문자열을 직접 비교 — resolution 우회·god-role 판정이 코드 전반에 흩어져 중앙 게이트로 강제되지 않음(Ground-Truth ② §3).

### 2.3 8 탐지 대상 substrate 대조

| # | §29 탐지 대상 | 실 대상 실재 | 근거 |
|---|---|---|---|
| 1 | Direct Permission Lookup | PRESENT(233개소 일부) | Ground-Truth ② §3 |
| 2 | Hardcoded Authorization | **PRESENT(233개소 핵심)** | Ground-Truth ② §3·§2 #11 |
| 3 | Bypass Resolution Engine | PRESENT(233개소=PEP 우회) | ADR D-6 |
| 4 | Missing Explain | 대상 발생 예정(Explain ABSENT) | Ground-Truth ② §2 #6 |
| 5 | Missing Snapshot | 대상 발생 예정(Snapshot ABSENT) | Ground-Truth ② §2 #3 |
| 6 | Missing Audit | 부분(감사 산재) | — |
| 7 | Runtime Override | 대상 발생 예정 | — |
| 8 | Cache Poisoning Risk | 대상 발생 예정(Cache ABSENT) | Ground-Truth ② §2 #4 |
| — | **Static Lint 도구·룰 자체** | **ABSENT(grep 0)** | Ground-Truth ② §2 #10 |

### 2.4 정직 주의 — 일부는 정당한 substrate (오탐 방지)

`TeamPermissions.php:132`(`isAdmin`)·`:134`(`isOwnerAdmin`) 등 일부 하드코딩은 **kernel substrate 자체**(Ground-Truth ① §2-A PRESENT)다. Static Lint는 이를 "제거 대상"이 아니라 "중앙 게이트로 수렴 대상"으로 분류해야 한다 — kernel 정의부와 산재 우회를 구분(급진 삭제 금지·ADR 무후퇴).

### 2.5 KEEP_SEPARATE

- `EnterpriseAuth.php:314`(SAML SPSSODescriptor) — SoD grep 유일매치이나 **오탐**(SAML 메타데이터). Static Lint 대상 아님(Ground-Truth ② §2 #9).
- 마케팅/CRM 도메인의 role 문자열(RuleEngine 등)은 권한 authz 아님 — Lint 대상 아님.

## 3. Canonical 설계

### 3.1 Static Lint 도구·룰

- **정적 스캐너**: BE(PHP)·FE(JS/JSX) AST/정규식 스캔으로 `=== 'admin'`·`role == 'owner'`·`isAdmin(` 등 패턴 탐지.
- **룰 분류**: 8 탐지 대상(§29)별 룰. 각 매치를 (파일·라인·패턴·심각도)로 리포트.
- **화이트리스트**: kernel 정의부(`TeamPermissions.php:132`·`:134` 등 §2.4)는 allowlist 등록 — 우회가 아닌 정의부는 통과.
- **CI 게이트**: 신규 하드코딩 authz 유입 시 CI 경고/차단(무후퇴 수렴 — 총량이 늘지 않도록).

### 3.2 수렴 계약(ADR D-6)

233개소를 급진 삭제하지 않고, ERRE PEP(§27·별편) 위임으로 **점진 전환**. Static Lint는 (a) 현 233개소 baseline 등록, (b) 신규 유입 차단, (c) 전환 진척 추적을 담당.

## 4. Kernel 매핑 (Lint→ERRE 수렴)

| §29 탐지 | 수렴 방향 | 대상 |
|---|---|---|
| Hardcoded Authorization(#2) | PEP(§27) 위임으로 전환 | 233개소 |
| Bypass Resolution Engine(#3) | 단일 PDP 통과로 전환 | 233개소 |
| Missing Explain(#4) | Explain(§17) 배선 강제 | 신규 |
| Missing Snapshot(#5) | Snapshot(§18) 참조 강제 | 신규 |
| Cache Poisoning(#8) | Cache(§21) version 검증 강제 | 신규 |

## 5. 무후퇴 · Extend

- **점진 수렴(ADR D-6·무후퇴)**: 233개소를 즉시 삭제하지 않는다 — 개별 게이트의 현행 안전성은 ERRE PEP 전환 완료까지 유지. Static Lint는 baseline 고정+신규 유입 차단으로 **총량 무증가**를 강제.
- **kernel 정의부 보존(§2.4)**: `isAdmin`/`isOwnerAdmin` 등 substrate 정의부는 화이트리스트 — Extend 대상이지 삭제 대상이 아님.
- **오탐 배제**: `EnterpriseAuth.php:314`(SAML) 등 문자열 우연 일치는 Lint 대상에서 제외(Ground-Truth ② §2 #9 오탐).
- **CI 통합**: Static Lint를 CI Phase로 추가하되, 기존 CI(EN locale guard·build)를 대체하지 않고 병행.

## 6. 완료 게이트

- [ ] Static Lint 정적 스캐너(BE PHP + FE JS/JSX) 실 구현·8 탐지 룰
- [ ] 233개소 baseline 등록·kernel 정의부 화이트리스트
- [ ] 신규 하드코딩 authz 유입 CI 차단(총량 무증가)
- [ ] 233개소 → ERRE PEP(§27) 위임 점진 전환 추적
- [ ] 오탐(`EnterpriseAuth.php:314` SAML 등) 제외 검증
- [ ] Missing Explain/Snapshot/Cache Poisoning 룰 = 선행 Explain/Snapshot/Cache 실구현 후 활성
- [ ] **BLOCKED_PREREQUISITE 해소**: 선행 foundation(Part 1~3-6)·PEP 실구현 후 별도 승인세션(RP-track)
- [ ] 본 편 코드/DB 변경 **0** 유지 · NOT_CERTIFIED

## 7. 반날조 인용 출처

- SPEC §29(Static Lint 8종)·§17(Explain)·§18(Snapshot)·§21(Cache)·§27(Projection/PEP)
- ADR D-6(Static Lint 233개소 수렴)·무후퇴(급진 삭제 금지)·D-7(정직 분리)
- Ground-Truth ① §2-A(`TeamPermissions.php:132`·`:134` = kernel 정의부·화이트리스트)
- Ground-Truth ② §3(233개소 정본: BE 106/19파일 — `UserAuth.php`46·`AdminMenu.php`12·`UserAdmin.php`9·`TeamPermissions.php`9·`Keys.php`6·`Payment.php`4·`AgencyPortal.php`3·`EnterpriseAuth.php`3·`SystemMetrics.php`2·`Wms.php`2·`routes.php`2; FE 127/36파일 — `TeamMembers.jsx`19·`AuthContext.jsx`16·`Topbar.jsx`8·`Sidebar.jsx`7·`GenieAssistant.jsx`7·`UserManagement.jsx`5·`PnLDashboard.jsx`5·`planMenuPolicy.js`5·`useVisibleTabs.js`3·`SubAdminManager.jsx`3·`AdminMenuManager.jsx`3)·§2 #10(Static Lint 도구 ABSENT)·#11(하드코딩 authz PRESENT)·#9(`EnterpriseAuth.php:314` SoD 오탐)
- 개소 수치·파일명은 Ground-Truth ② §3 실측만 인용 — 임의 증감 금지.
