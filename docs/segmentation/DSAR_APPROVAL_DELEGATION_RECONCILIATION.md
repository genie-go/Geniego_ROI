# DSAR — Approval Delegation Reconciliation (§49 비교 24 + 필수 필드 21 병합)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §49(2000-2056 비교 2006-2029 · 필수 필드 2033-2053) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) §1·§2·§3·§4 · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)
> Reconciliation 상태 enum(§50 27종) = [DSAR_APPROVAL_DELEGATION_RECONCILIATION_STATUS.md](DSAR_APPROVAL_DELEGATION_RECONCILIATION_STATUS.md)

## 0. 현행 실측 (file:line)

### ★대전제 — `Delegation Reconciliation Engine` = **`ABSENT`**(대사 대상·기준 양측 부재)

**위임 대사(Reconciliation) 엔진이 0건이다.** `APPROVAL_DELEGATION_RECONCILIATION` grep 0. 대사는 **① 외부 소스 상태 vs ② Canonical Delegation 상태**를 비교하는데, 🔴**양측이 모두 부재**하다:

- **① 대사 대상 외부 소스 5개 전부 ABSENT** — HRIS Leave·Calendar Out-of-office·ERP Delegate·Workflow Delegate·Tenant Setting 어느 것도 존재하지 않는다(ⓑ §1·§4 — `calendar`=콘텐츠 캘린더 오탐·`hris`=`hig`hRis`k` 헤더 오탐·Vacation Delegate Setting grep 0). 대사할 소스 상태 자체가 없다.
- **② Canonical 기준(Delegation) 부재** — Delegation Definition/Snapshot 이 없어(ⓑ §1·§2.5) 비교의 기준(canonical state)을 세울 수 없다. 게다가 🔴**Tenant 마스터 테이블 부재**(`api_key.tenant_id`=FK 없는 VARCHAR·`SELECT DISTINCT` 역추론)로 대사의 격리 축조차 권위 기준이 없다.

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_RECONCILIATION` 엔티티 | grep **0** | `ABSENT` |
| 외부 소스 5개(HRIS/Calendar/ERP/Workflow/Tenant Setting) | 🔴 전부 부재(ⓑ §1·§4) — 대사할 소스 상태 없음 | `ABSENT` |
| Canonical Delegation 기준 | 🔴 Delegation Definition/Snapshot 0(ⓑ §1·§2.5) → 비교 기준 자체 미결정 | `BLOCKED_PREREQUISITE` |
| Delegator Authority vs Delegated Scope | 🔴 Authority 개념 부재(`authority_matrix`/`approval_authority` grep 0·5-3-3-4·ⓑ §3.2) → 이양권한 vs 위임범위 비교 대상 부재 | `BLOCKED_PREREQUISITE` |
| resolved_by / evidence | ★정본 = `app_user` actor(해소자 신원)·`SecurityAudit::verify():56-68`(ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

★**대사 엔진 자체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이/선행조건"을 기록한다.

## 1-a. 원문 전사 + 판정 — **비교 목록 24**(2006-2029)

> ★분모 주의: **측정기 `--sec=49` 총 = 45**(불릿 45) = 비교 목록 **24**(2006-2029) + 필수 필드 **21**(2033-2053). 본 편이 **양쪽 다** 전사한다(45 전체). **24 + 21 = 45 로 측정기와 정합.**

| # | 원문 비교 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | HRIS Leave Delegate vs Canonical Delegation | 🔴 HRIS 소스 부재(`hris`=`hig`hRis`k` 오탐·ⓑ §1) + Canonical 부재 | `ABSENT` |
| 2 | Calendar Out-of-office vs Canonical Delegation | 🔴 Calendar OOO 소스 부재(`calendar`=콘텐츠 캘린더 오탐·ⓑ §1) | `ABSENT` |
| 3 | ERP Delegate vs Canonical Delegation | 🔴 ERP Delegate 소스 부재(ⓑ §1·§4) | `ABSENT` |
| 4 | Workflow Delegate vs Canonical Delegation | 🔴 Workflow Delegate 소스 부재(ⓑ §1·§4 — 외부소스 5개 전부 ABSENT) | `ABSENT` |
| 5 | Tenant Setting vs Canonical Delegation | 🔴 Tenant Setting(Vacation Delegate) 부재(grep 0·ⓑ §4) | `ABSENT` |
| 6 | Delegator Authority vs Delegated Scope | 🔴 Authority 개념 부재(5-3-3-4·ⓑ §3.2) → 이양권한 단위 미정의 | `BLOCKED_PREREQUISITE` |
| 7 | Delegate Eligibility vs Active Delegation | 🔴 Eligibility Profile(§26)·Active Delegation 선행 미구축(ⓑ §1) | `BLOCKED_PREREQUISITE` |
| 8 | Role Assignment vs Delegation | 인접 `team_role` flat enum(owner>manager>member 실재)이나 대사할 Canonical Delegation 선행 부재(ⓑ §1·§3.3) | `BLOCKED_PREREQUISITE` |
| 9 | Position Incumbency vs Delegation | 🔴 Position 전역 0(`position_idx`=Gantt 정렬 오탐·ⓑ §3.3) | `ABSENT` |
| 10 | Legal Entity Membership vs Delegation | 🔴 Legal Entity 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §3.3) | `ABSENT` |
| 11 | Organization Membership vs Delegation | 🔴 Org 엔티티 0(`ORGANIZATION_*` grep 0·ⓑ §3.3) | `ABSENT` |
| 12 | Active Period vs Current Time | 🔴 Delegation Period(시작·종료·유효기간) 선행 미구축(ⓑ §2.1 표) | `BLOCKED_PREREQUISITE` |
| 13 | Acceptance vs Active Status | 🔴 Delegate 수락(§23) 개념 선행 미구축 — 승인 4경로는 일방 치환(`Mapping.php:652`·ⓑ §2.1) | `BLOCKED_PREREQUISITE` |
| 14 | Approval vs Active Status | 🔴 위임 승인(§24)·범용 Approval(§3.1) 선행 미구축(ⓑ §3) | `BLOCKED_PREREQUISITE` |
| 15 | Re-delegation Chain vs Policy | 🔴 재위임 체인·정책 선행 미구축 — 재부여 경로 0(ⓑ §2.1·§2.4) | `BLOCKED_PREREQUISITE` |
| 16 | Task Assignee vs Winning Delegation | 🔴 Task 모델 부재 + Resolution(우선순위 판정) 부재(ⓑ §2.2) | `ABSENT` |
| 17 | Decision Actor vs Delegation Snapshot | 🔴 Delegation Snapshot 엔티티 grep 0(ⓑ §2.5) → 결정 시점 스냅샷 비교 불가 | `ABSENT` |
| 18 | Decision Time vs Delegation Period | 🔴 Decision 모델·Delegation Period 부재 | `ABSENT` |
| 19 | Decision Amount vs Delegated Ceiling | 🔴 금액축 부재(HIGH_VALUE_KRW boolean 상수·ⓑ §3.2) → 위임 한도 비교 불가 | `ABSENT` |
| 20 | Decision Currency vs Delegated Currency | 🔴 통화 스코프 0·환율 저장계층 부재(ⓑ §3.2) | `ABSENT` |
| 21 | Current Version vs Case Snapshot | 🔴 불변 버전체인·Case Snapshot 부재(ⓑ §2.1·§2.5) | `ABSENT` |
| 22 | Revoked Delegation vs Pending Task | 🔴 Revoke 라이프사이클·Task 모델 부재(ⓑ §2.1) | `ABSENT` |
| 23 | Expired Delegation vs Claimed Task | 🔴 expiry 컬럼 자체 부재(영구·ⓑ §2.1)·Task 모델 부재 | `ABSENT` |
| 24 | Suspended Delegation vs Decision Attempt | 🔴 Suspension=로그인 스로틀(`login_attempt.locked_until`·권한정지 아님·ⓑ §3.4)·Decision 모델 부재 | `ABSENT` |

**비교 실측: 24 / 24 전사.**

## 1-b. 원문 전사 + 판정 — **필수 필드 21**(2033-2053)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_reconciliation_id | 엔티티 부재 → PK 없음 | `ABSENT` |
| 2 | approval_request_id | 🔴 범용 승인 Request 0(§3.1 Approval ABSENT·ⓑ §3) 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 3 | approval_case_id | 🔴 Approval Case 0(§3.1·ⓑ §3) 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 4 | approval_item_id | 🔴 Approval Item 0(§3.1·ⓑ §3) 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 5 | delegation definition id | 🔴 Delegation Definition 엔티티 0(ⓑ §1) 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 6 | delegation version id | 🔴 불변 버전체인 선례 0(ⓑ §2.1) 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 7 | delegator subject id | ★**인접** — `app_user.id`(신원 실재)이나 Delegator→Delegate 관계 엔티티 부재(ⓑ §2.1) | `LEGACY_ADAPTER` |
| 8 | delegate subject id | ★**인접** — `app_user.id` 실재이나 Delegate 관계·수락(§23) 부재 | `LEGACY_ADAPTER` |
| 9 | comparison type | 🔴 대사 비교유형 축 0(엔진 부재)·[별편 상태](DSAR_APPROVAL_DELEGATION_RECONCILIATION_STATUS.md) enum 미시드 | `ABSENT` |
| 10 | source state | 🔴 외부 소스 5개 전부 부재(ⓑ §1·§4) → 소스 상태 없음 | `ABSENT` |
| 11 | canonical state | 🔴 Canonical Delegation 기준 부재(ⓑ §1) 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 12 | difference | 🔴 대사 diff 산출 축 0(엔진 부재) | `ABSENT` |
| 13 | affected task | 🔴 Task 모델 부재 | `ABSENT` |
| 14 | affected decision | 🔴 Decision 모델 부재 | `ABSENT` |
| 15 | severity | 🔴 대사 심각도 축 0(엔진 부재) | `ABSENT` |
| 16 | detected_at | 🔴 대사 탐지 시각 축 0(엔진 부재) | `ABSENT` |
| 17 | resolution | 🔴 대사 해소 축 0(엔진 부재)·[별편 상태](DSAR_APPROVAL_DELEGATION_RECONCILIATION_STATUS.md) 참조 | `ABSENT` |
| 18 | resolved_by | ★**인접** — `app_user` actor(해소자 신원 실재)이나 대사 해소 워크플로 미배선 | `LEGACY_ADAPTER` |
| 19 | resolved_at | 🔴 대사 해소 시각 축 0(엔진 부재) | `ABSENT` |
| 20 | status | 🔴 [별편](DSAR_APPROVAL_DELEGATION_RECONCILIATION_STATUS.md) §50 27종 enum 미시드(대사 상태머신 부재) | `ABSENT` |
| 21 | evidence | ★정본 = `SecurityAudit::verify():56-68`(ⓑ §2.5)·인접 `pm_audit_log.diff_json` append-only — 🔴`menu_audit_log` 인용 금지(§0) | `LEGACY_ADAPTER` |

**필드 실측: 21 / 21 전사.** 원문 필수 필드가 `evidence` 로 **끝난다**(`:2053`) → "목록 끝 항목 누락" 편향 회피 확인.

---

**본 편 합계: 비교 24 + 필드 21 = 45 종 전사.** (측정기 `--sec=49` 분모 **45** · 전사 **45** — 정합)
커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 4(필드 7·8·18·21) · `BLOCKED_PREREQUISITE` 13(비교 6·7·8·12·13·14·15 + 필드 2·3·4·5·6·11) · `ABSENT` 28.

> 🔴 **커버 0.** 대사 엔진이 통째로 부재하고, 대사의 **양측(외부 소스·Canonical 기준)이 모두 부재**하므로 어떤 비교·필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 4건은 **확장 대상 인접 자산**(delegator/delegate subject·resolved_by=`app_user`·evidence=`SecurityAudit`)이지 커버가 아니다. `BLOCKED_PREREQUISITE` 13건은 **Authority·Approval·Eligibility·Period·Redelegation·Canonical Delegation 선행 구축이 전제**. 외부 소스 5개(HRIS/Calendar/ERP/Workflow/Tenant Setting)와 Task/Decision/Snapshot 축 28건은 존재조차 하지 않아 `ABSENT`.

## 2. 규칙

- 🔴 **Canonical 기준 부재 — Tenant 마스터부터 선행 신설**: 대사는 Canonical Delegation 을 기준(canonical state)으로 소스를 비교하는데, Delegation Definition/Snapshot(ⓑ §1·§2.5)과 **권위 Tenant 마스터**(`api_key.tenant_id`=FK 없는 VARCHAR·`SELECT DISTINCT` 역추론)가 모두 부재하다. 대사 엔진 신설 전에 **canonical 기준과 테넌트 권위 참조가 선결**돼야 하며, strict fail-closed 기본 ON 권장(`index.php:585` strict 기본 OFF 상속 금지).
- 🔴 **외부 소스 5개(HRIS/Calendar/ERP/Workflow/Tenant Setting)를 "연동 가능"으로 오표기 금지** — 5개 전부 소스 커넥터가 **존재조차 하지 않는다**(ⓑ §1·§4). 대사가 이 소스들을 검증하려면 각 소스 어댑터가 선행 구축돼야 하며, `calendar`/`hris`/`presence` 이름 히트(콘텐츠 캘린더·highRisk 헤더·LiveCommerce 하트비트)를 소스로 오인하지 마라.
- 🔴 **`Decision Actor vs Delegation Snapshot`(#17)·`Current Version vs Case Snapshot`(#21)를 `menu_audit_log` 로 구현하지 마라** — Snapshot 정본은 `SecurityAudit::verify():56-68`(`hash_equals`+prev·검증 가능)이고, `menu_audit_log.hash_chain` 은 tenant_id 없음·검증기 없음의 장식이다([[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **`resolved_by`(필드 18)·`evidence`(필드 21)는 인접 자산이나 미배선** — `app_user` actor·`SecurityAudit` 를 확장 대상으로 삼되, 대사 해소 워크플로 자체가 신설이므로 "구현됨" 표기 금지.
- 🔴 **코드 변경 0 유지** — 대사 엔진 신설은 §3 선행조건 4축(Approval·Authority·Reporting-Line Resolver·Authorization Safety·ⓑ §3) + 외부 소스 어댑터 + Canonical Delegation/Tenant 마스터 선행 구축 후 **별도 승인세션**(Golden Rule + verify + 배포승인).
