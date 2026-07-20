# DSAR — Runtime SoD Enforcement: 역할 상충 (APPROVAL_SOD_ROLE_CONFLICT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_ROLE_CONFLICT`은 SoD의 원형인 **Role vs Role 상충**(SPEC §3 첫 항목)을 판정하는 엔티티(SPEC §2 4번)다. "한 사용자가 상충하는 두 역할을 **동시에 보유**하는가"를 다룬다.

- **Role vs Role(SPEC §3)**: 상호배타적 역할 쌍(예: 생성 역할 ↔ 승인 역할)의 동시보유 금지.
- **Static SoD 평가시점(SPEC §4)**: Assignment 생성 · Assignment 수정 · Role 생성 · Permission 생성. 즉 부여 시점에 상충 조합을 사전 차단.
- Dynamic SoD(SPEC §5, 세션/JIT/임시역할)와 결합해 Runtime까지 상충을 지속 평가한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 개념 축 | 판정 | 근거(GT file:line) |
|---|---|---|
| Role vs Role 상충 판정(동시보유 차단) | **ABSENT(grep 0)** | GT② §2 "Role/Permission/Scope/Context Conflict Engine = ABSENT"; `roleConflict\|toxicPair\|incompatibleRoles` 0 |
| Static SoD(Assignment 시점 상충차단) | **ABSENT** | GT② §2 "`TeamPermissions.php:599-621`·`:642-658`는 위임상한 클램프뿐 — 상충 role 차단 로직 없음" |
| 다중 활성역할 데이터 기반(충돌 판정 전제) | **공백/부재** | 세션은 사용자당 단일 team_role `UserAuth.php:263-316`(:316 파생)·페이로드 plan+team_role만 `UserAuth.php:691`·`:1019`(GT① §D) |
| 역할표(상충규칙 삽입 후보) | PRESENT | `teamCanWrite`/`normTeamRole` owner>manager>member 3단 정적표 `UserAuth.php:1119-1131`(GT① §C) |
| Assignment 강제 삽입지점(PEP) | PRESENT | `guardTeamWrite` `UserAuth.php:1167-1186`·`requireTeamWrite` `:1134-1147`·`TEAM_OWNER_ONLY` `:1117`(GT① §C·ADR D-1) |

★핵심 제약: 세션이 **단일 team_role**만 실어(`UserAuth.php:263-316`) 다중 활성역할 충돌 개념의 데이터 기반 자체가 부재(GT① §D·GT② §2·ADR D-4). Role Conflict 실 구현 전 Conflict Snapshot(SPEC §23) 데이터 기반 신설이 선행.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **상충 쌍**: (Left Role, Right Role, Conflict Type=Role vs Role). Matrix(§14)에 Severity·Resolution 부여.
- **평가시점(SPEC §4 Static SoD)**: Assignment 생성/수정·Role 생성·Permission 생성 시 상충 사전 차단. PEP=`guardTeamWrite`(`UserAuth.php:1167-1186`) 계열에 삽입(ADR D-1).
- **데이터 선행(ADR D-4)**: 활성 역할/권한 스냅샷(SPEC §23 Conflict Snapshot) 신설 — 단일 team_role(`UserAuth.php:263-316`) 한계 극복.
- **불변버전·테넌트격리**: SPEC §36 Immutable Conflict Rule·Tenant Isolation · `index.php:614-619`(GT① §E).
- **에러(SPEC §33)**: 상충 부여 시 `SOD_CONFLICT_DETECTED`·`SOD_POLICY_VIOLATION`.
- **JIT 직교결합(ADR D-6)**: JIT(3-9)가 시한부 상승 발급 시에도 Role Conflict Evaluator가 상충 재평가(SPEC §5 Dynamic SoD). 엔진 분리(JIT=발급/만료, SoD=충돌평가).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **Maker-Checker ≠ Role Conflict**(GT② B-2): `Mapping.php:268-271` self-approval 차단은 "제안자≠승인자(2인 필요, dual-control)"이지 "한 사람이 상충역할 동시보유(SoD)"가 아니다. 인접 재활용하되 Role Conflict로 개명·흡수 금지.
- **위임상한 클램프**(GT② B-4): `TeamPermissions.php:599-621`·`:642-658` `assignable` 클램프 = 권한상승 방지이지 role-conflict SoD 아님(GT② §2가 Static SoD ABSENT 근거로 명시).
- **단일승인 게이트**(GT② B-5): `Catalog.php:2383-2407`(approveQueue)·`AdminGrowth.php:1294`·`:1313-1331`(requested_by 저장하나 self-approval 비교·정족수 없음→SoD 미성립).
- **AdminGrowth PARTIAL**(GT① §G): `AdminGrowth.php:1294`·`:1313-1331` decided_by만 기록·단일 admin=approved — 결재분리 미성립.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT(순신규)**. Role vs Role 상충·Static SoD grep 0(GT② §2). 코드 변경 0 · NOT_CERTIFIED.
- **재활용(Extend)**: 정적 역할표(`UserAuth.php:1119-1131`)·Assignment PEP(`guardTeamWrite`)에 상충 평가 삽입. 대체 아님(ADR D-1).
- **선행의존**: BLOCKED_PREREQUISITE(강함). 다중 활성역할 데이터 부재(`UserAuth.php:263-316`)로 Conflict Snapshot(SPEC §23) 신설이 **선행 필수**(ADR D-4). Effective Resolution(3-7)·JIT(3-9) 산출을 입력원으로 결합(ADR D-6). Part 1~3-9 인증 후 실 구현.
