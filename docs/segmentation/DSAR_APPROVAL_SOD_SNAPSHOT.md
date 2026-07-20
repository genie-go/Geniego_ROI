# DSAR — Runtime SoD Enforcement: 충돌 스냅샷 (APPROVAL_SOD_SNAPSHOT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_SNAPSHOT`은 Runtime 충돌평가 시점의 subject 상태를 불변 캡처한 스냅샷이다(SPEC §23). 저장 대상 6종:

| 필드 | SPEC §23 항목 | 목적 |
|---|---|---|
| Active Roles | 활성 역할 집합 | 동시보유 역할 충돌 판정 입력 |
| Active Permissions | 활성 권한 집합 | Permission Conflict 판정 입력 |
| Active Scope | 활성 스코프(Dataset/Org/Tenant/Resource) | Scope Conflict 판정 입력 |
| Session | 세션 식별·활성 컨텍스트 | Session Conflict(§9) 입력 |
| Runtime Context | Device/Region/Env/Risk(§8) | Context-aware SoD 입력 |
| Conflict State | 평가 결과 충돌 상태 | Evidence/Digest 연결 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Snapshot 필드 | 실존 근거 | 판정 |
|---|---|---|
| Active Roles | 세션은 사용자당 **단일 team_role**만 실음(`UserAuth.php:263-316`·`:691`·`:1019`) → 다중 활성역할 스냅샷 데이터 기반 부재 | **ABSENT(공백)** |
| 역할 표(참조) | owner>manager>member 3단 정적표 `UserAuth.php:1119-1131` | PARTIAL(정적표만) |
| Active Permissions | RBAC scope 게이트 `index.php:572-611`·보조 `:430-460` — 판정지점이지 조합 스냅샷 아님 | PARTIAL(게이트만) |
| Active Scope | 창고 ABAC 화이트리스트 `Wms.php:557-590`·팀쓰기 `UserAuth.php:1167-1186`·`:1134-1147` | PARTIAL(단축 ABAC) |
| Session | 세션 발급 `UserAuth.php:609`·`:990`, 페이로드 plan·team_role만 `:691`·`:1019` | PARTIAL(단일역할) |
| Runtime Context / Conflict State | SoD 전용 스냅샷 스키마 grep 0(GT② §2·ABSENT행) | **ABSENT(grep 0)** |
| 테넌트 격리 | X-Tenant-Id 서버도출 강제 `index.php:614-619`·auth_tenant 주입 `:608-612` | PRESENT(재활용) |
| 스냅샷 무결성(재활용) | SecurityAudit 해시체인 append-only `SecurityAudit.php:14-33`·verify `:56-69` | PRESENT(재활용) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **불변 캡처**: Snapshot은 평가 시점 subject 상태를 append-only로 기록(SPEC §36 Snapshot Integrity). 사후 변경 불가 — 무결성은 SecurityAudit 해시체인(`SecurityAudit.php:14-33`·`:56-69`) 재활용.
- **데이터 기반 선행 신설**: 세션 단일 team_role(`UserAuth.php:263-316`)로는 다중 활성역할 충돌 판정 불가 → 활성 역할/권한 스냅샷 신설이 **선행**(ADR D-4).
- **테넌트 격리 절대**: 스냅샷은 `index.php:614-619` 서버도출 tenant로 격리(SPEC §36 Tenant Isolation).
- **Digest 연결**: Snapshot은 Digest(§25)의 입력 필드이며 Evidence(§24)와 상호참조.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **위임상한 클램프 ≠ 활성역할 스냅샷**: `TeamPermissions.php:599-621`·`:642-658`는 privilege-escalation 방지 클램프(GT② B-4)이지 활성역할 충돌 스냅샷 아님.
- **menu_audit_log ≠ SoD 스냅샷**: `AdminMenu.php:123-140`·`:200`·`:216`는 메뉴 거버넌스 체인(GT② B-7)이지 subject 상태 스냅샷 아님.
- **acl_permission 매트릭스 ≠ Conflict Matrix**: menu×action 매트릭스이지 role×role 상충 스냅샷 아님(GT② §2).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **NOT_CERTIFIED · 코드 0**: Conflict State 스냅샷 스키마·다중 활성역할 캡처 = 순신규(grep 0).
- **재활용(Extend)**: 테넌트 격리(`index.php:614-619`)·SecurityAudit 무결성(`SecurityAudit.php:14-33`)·RBAC/ABAC 게이트(`index.php:572-611`·`Wms.php:557-590`) 위에 스냅샷층 신설.
- **선행 의존**: 세션 단일역할 → 다중 활성역할 데이터 기반 신설이 최우선 선행(ADR D-4). Effective Resolution(3-7)·JIT(3-9) 산출을 활성역할 입력원으로 결합(BLOCKED_PREREQUISITE).
