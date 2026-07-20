# DSAR — Runtime SoD Enforcement: 범위 충돌 (APPROVAL_SOD_SCOPE_CONFLICT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_SCOPE_CONFLICT`(SPEC §2·§12)는 **동일한 데이터 범위(Scope) 안에서 상충 직무가 겹치는지**를 판정하는 SoD 하위 엔티티다. SPEC §12가 열거하는 탐지 대상 범위:

- 동일 Dataset
- 동일 Organization
- 동일 Tenant
- 동일 Project
- 동일 Resource

즉 "같은 자원/조직/테넌트 위에서 생성자와 승인자, 또는 상충 역할이 동일인인지"를 범위 경계(Scope vs Scope, §3)로 평가한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 상태 | 근거(파일:라인) |
|---|---|---|
| Scope Conflict Engine | **ABSENT** | `roleConflict\|conflictMatrix\|toxicPair` grep 0 (GT② §2) |
| Cross-Tenant 격리 (Scope/Cross-System SoD 인접) | PRESENT | `index.php:614-619` X-Tenant-Id 서버도출 강제(헤더위조 차단)·`:608-612` auth_tenant 주입 (GT① §E) |
| 창고(Resource) ABAC 게이트 | PRESENT | `Wms.php:557-590` `guardWarehouse` 화이트리스트 fail-closed(12개소 `:598,:603,:638,:1329,:1374,:1409,:1591,:1720,:1749,:1777,:1830,:1884`) (GT① §C) |
| 중앙 스코프 인가 | PRESENT | `index.php:572-611` scope(`admin:keys`/`write:*`) 검사 (GT① §C) |

판정: Scope 상충평가 **ABSENT(그린필드)**. Cross-Tenant/창고 게이트는 **격리·범위 강제**지 "동일 범위 내 상충직무 동시보유" 판정이 아니다(인접 substrate).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**: `scope_type`(Dataset/Org/Tenant/Project/Resource·§12)·`left_entity`·`right_entity`·`conflict_type`(Scope vs Scope §3)·`severity`(§15)·`resolution_strategy`(§16).
- **평가 계약**: 동일 scope 키(테넌트/자원)로 활성 역할·권한 스냅샷(§23)을 그룹핑, 그 안에서 상충쌍을 Runtime Evaluator가 평가(ADR D-1).
- **제약**: Tenant Isolation은 절대(§36)·`index.php:614-619` 서버도출 tenant를 scope 키의 상위 경계로 재활용(ADR D-1). Immutable Rule.
- **증거**: SecurityAudit 체인(`SecurityAudit.php:14-33`) 기록.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **Cross-Tenant 격리** `index.php:614-619` — 테넌트 경계 강제(isolation)지 scope-conflict SoD 아님. Cross-System SoD 인접이나 개명·흡수 금지(GT① §E·GT② §3-6).
- **`guardWarehouse` ABAC** `Wms.php:557-590` — 창고 접근제어지 범위내 상충직무 평가 아님.
- **위임상한 클램프** `TeamPermissions.php:599-621`·`:642-658` — privilege-escalation 통제(GT② §B-4).
- **HTTP 409/sync "conflict"** — 데이터 sync conflict decoy(GT② §B-1).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**NOT_CERTIFIED · 코드 0.** Scope Conflict Engine = **순신규(ABSENT·grep 0)**. 재활용(Extend) = cross-tenant(`index.php:614-619`)를 scope 상위경계로·`guardWarehouse`/중앙게이트를 PEP 삽입지점으로·SecurityAudit 증거. 선행의존: Conflict Snapshot(활성역할, ADR D-4)·Conflict Matrix 신설 + Part 1~3-9 인증 후 실 구현(BLOCKED_PREREQUISITE). 무후퇴: 격리·ABAC 게이트 유지·병행.
