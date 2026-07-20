# DSAR — Runtime SoD Enforcement: 데이터베이스 제약 (Database Constraint) (Part 3-10 §36)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §36은 SoD 데이터층이 강제해야 할 5대 무결성 제약을 규정한다.

| # | 제약 | SPEC §36 |
|---|---|---|
| C1 | **Immutable Conflict Rule** — Conflict Rule은 갱신불가(불변 버전) | §36 |
| C2 | **Matrix Integrity** — Conflict Matrix(Left/Right/Type/Severity/Strategy) 참조·유일성 무결성 | §36·§14 |
| C3 | **Snapshot Integrity** — Conflict Snapshot(활성 역할/권한/스코프/세션/런타임/충돌상태) 불변 | §36·§23 |
| C4 | **Tenant Isolation** — SoD Rule/Matrix/Snapshot 테넌트 격리 | §36 |
| C5 | **Digest Validation** — Conflict Digest(Subject/Runtime/Conflict/Resolution/Snapshot) 무결성 검증 | §36·§25 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 제약 | 판정 | 근거(GT/ADR) |
|---|---|---|
| C1 Immutable Conflict Rule 전용 테이블 | **ABSENT** | SoD 전용 immutable conflict rule 테이블 grep 0(GT② §2). 불변버전 **재활용 선례**=`Db.php:632-634` mapping_change_request(`required_approvals INT DEFAULT 2`·`requested_by NOT NULL`)·append-only=`SecurityAudit.php:14-33`(GT① §A·§F) |
| C2 Matrix Integrity | **ABSENT** | Conflict Matrix 전용 구조 0(GT② §2 "role×role/perm×perm 상충 전용 구조 0") |
| C3 Snapshot Integrity | **ABSENT(데이터기반 부재)** | 세션 사용자당 단일 team_role(`UserAuth.php:263-316`)→다중 활성역할 스냅샷 데이터 기반 자체 없음(ADR D-4·GT① §D) |
| C4 Tenant Isolation | **PARTIAL(재활용 substrate)** | 요청단 격리=`index.php:614-619`(X-Tenant-Id 서버도출 강제)·`index.php:608-612`(auth_tenant 주입). SoD 테이블 자체는 ABSENT |
| C5 Digest Validation | **PARTIAL(재활용)** | 무결성 검증 선례=`SecurityAudit.php:56-69`(`verify`·hash_equals 변조탐지)·`:35-41`(lastHash). SoD Digest 전용 스키마 0(GT② §2) |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **C1**: Conflict Rule row는 생성 후 UPDATE 금지 — `SecurityAudit.php:14-33` prev_hash→hash 체인(append-only) 패턴을 신규 SoD Rule 테이블에 적용(ADR D-2 불변버전). 개정은 신 버전 행 추가(supersede).
- **C2**: Matrix는 (tenant, left_entity, right_entity, conflict_type) 유일 제약 + Severity(Low/Medium/High/Critical/Regulatory §15) enum + Resolution Strategy(Block/Challenge/Approval/Escalation/Override/Break-Glass §16) 참조 무결성(ADR D-2).
- **C3**: Snapshot은 평가 시점 활성 역할·권한·스코프·세션·런타임 컨텍스트를 불변 캡처(§23). 선행=Conflict Snapshot 데이터 기반 신설(ADR D-4).
- **C4**: 모든 SoD 테이블 tenant_id NOT NULL + 서버도출 tenant(`index.php:614-619`)만 신뢰. 헤더위조 차단 계보(188차 P0) 재활용.
- **C5**: Digest는 저장 시 해시 산출·검증 시 `SecurityAudit.php:56-69` hash_equals 재활용(ADR D-5 증거 재활용).

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: `menu_audit_log`(`AdminMenu.php:123-140`·migration `20260526_168_102_create_menu_audit_log.sql:6-24`)는 메뉴 거버넌스 체인이지 SoD 충돌증거 아님(GT② B-7). "conflict" 409/sync 41파일 decoy(GT② B-1). `Db.php:592-600` action_request(maker 부재·VACUOUS)는 재플래그 아님(GT② §5).
- **선행의존**: C1·C2·C3 테이블 전량 순신규 → Part 1~3-9 인증 후 RP-track. Snapshot(C3)은 다중 활성역할 데이터 기반 신설이 선행(ADR D-4).

## 5. 판정

**NOT_CERTIFIED · 코드 0.** SoD 전용 immutable conflict rule 테이블·Matrix·Snapshot·Digest 스키마 전부 ABSENT(그린필드). Index=SoD 전용 ABSENT. 재활용 substrate=`Db.php:632-634` 불변버전·`SecurityAudit.php:14-33`/`:56-69` append-only·검증·`index.php:614-619` 테넌트격리. DB Constraint 실 강제는 **RP-track 실 구현 조건**(선행 Decision Core Part 1~3-9 인증 후). 무후퇴·Extend-only.
