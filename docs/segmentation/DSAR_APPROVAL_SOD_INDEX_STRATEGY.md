# DSAR — Runtime SoD Enforcement: 인덱스 전략 (Index Strategy) (Part 3-10 §37)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §37은 SoD Runtime Evaluation(§22)·Lookup(§38)이 성능 목표를 만족하기 위한 8개 인덱스 축을 규정한다.

| 축 | 대상 조회 | SPEC §37 |
|---|---|---|
| Conflict Rule | Rule Registry 룩업 | §37·§1 |
| Role | Role vs Role 충돌(§3) | §37 |
| Permission | Permission vs Permission(§13) | §37 |
| Scope | Scope vs Scope(§12) | §37 |
| Transaction | Transaction Conflict(§10) | §37 |
| Workflow | Workflow Step 충돌(§11) | §37 |
| Severity | Low~Regulatory 필터(§15) | §37 |
| Status | 규칙/예외 상태 필터 | §37 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

**SoD 전용 인덱스는 전 축 ABSENT.** 각 축의 컬럼 출처(재활용 삽입지점)만 substrate로 실존한다.

| 축 | 판정 | 근거(GT/ADR) |
|---|---|---|
| Conflict Rule | **ABSENT** | Rule Registry 테이블 0(GT② §2). 인덱스 대상 자체 부재 |
| Role | **ABSENT(출처만 실존)** | 역할 출처=`UserAuth.php:1119-1131`(owner>manager>member 3단 정적표)·세션 단일 team_role `:263-316`. role×role 충돌 구조 0(GT② §2) |
| Permission | **ABSENT(출처만 실존)** | 권한 게이트=`index.php:572-611`(scope `admin:keys`/`write:*`). acl_permission=menu×action(SoD 매트릭스 아님·GT② §2 Static SoD行) |
| Scope | **ABSENT(출처만 실존)** | 스코프 ABAC=`Wms.php:557-590`(guardWarehouse). scope×scope 충돌 0 |
| Transaction | **ABSENT(출처만 실존)** | maker-checker 선례=`Mapping.php:268-271`(self-approval)·`Db.php:632-634`(mapping_change_request). Transaction Conflict 전용 0 |
| Workflow | **ABSENT** | Invoice/Payment/Vendor 결재분리 grep 0(GT② §2 Transaction/Workflow行) |
| Severity | **ABSENT** | Severity 등급(Low~Regulatory) 저장구조 0(GT② §2 Matrix行) |
| Status | **ABSENT(출처만 실존)** | 상태 필터 선례=`Alerting.php:684-688`(status!=='approved' 차단). SoD 규칙 status 0 |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **테넌트 프리픽스**: 모든 SoD 인덱스는 (tenant_id, …) 복합 선두 — 서버도출 tenant(`index.php:614-619`) 기준 격리 스캔(ADR D-2 테넌트 격리).
- **Conflict Rule/Matrix 룩업**: (tenant, left_entity, right_entity, conflict_type) 커버링 인덱스 → §38 Conflict Lookup ≤5ms 지원.
- **Runtime Evaluation 핫패스**: subject 활성 역할집합 → 상충쌍 조회가 §38 ≤10ms 예산 내여야 하므로 Role/Permission/Scope 축 인덱스가 PEP(`index.php:572-611`) 삽입지점에서 O(log n) 룩업 보장(ADR D-1).
- **Severity/Status 필터**: Analytics(§26 Top Violated Rules)·Guard(§31) 조회용 보조 인덱스.

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: `acl_permission`(menu×action)은 인가 매트릭스지 SoD 상충 매트릭스 아님(GT② §2). `TeamPermissions.php:599-621`·`:642-658` 위임상한 클램프는 권한상승 방지 인덱스 대상이지 role-conflict 아님(GT② B-4). "conflict" 409/sync 인덱스와 무관(GT② B-1).
- **선행의존**: 인덱스 대상 테이블(Rule/Matrix/Snapshot)이 전부 §36 순신규 → 인덱스도 순신규. Part 1~3-9 인증 후 RP-track.

## 5. 판정

**NOT_CERTIFIED · 코드 0.** SoD 전용 인덱스 8축 전부 ABSENT. 각 축 컬럼 출처(role=`UserAuth.php:1119-1131`·permission=`index.php:572-611`·scope=`Wms.php:557-590`·transaction=`Mapping.php:268-271`·status=`Alerting.php:684-688`)는 재활용 substrate로 실존하나 상충 인덱스 대상은 부재. Index=SoD 전용 ABSENT. 인덱스 설계·구축은 §36 테이블 신설에 종속 → **RP-track 실 구현 조건**·선행 Decision Core Part 1~3-9 인증 후. Extend-only.
