# ADR — Rebate Delegation Foundation Governance (EPIC 06-A-01)

> 289차 12회차(2026-07-18) · **비파괴 설계 결정 — 코드변경 0** · 상태: **Accepted(설계정본)**
> 근거: [ⓑ 전수조사](../segmentation/DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · [스펙 원문](../segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) · [§65 58편 per-entity](../segmentation/) (전 엔티티 전사·측정기 커버 0)

## Context

EPIC 06-A-01은 승인 권한/업무를 다른 Actor에게 **시간제한·범위제한 이양**하는 Canonical Delegation Foundation을 요구한다(Delegator/Delegate·기간·수락·승인·Scope·Cycle·Snapshot·Reconciliation). 3클러스터 병렬 능력기반 전수조사(ⓑ) 결과:

**★레포에 Approval Delegation 개념이 없다.** §4 기존 구현 44+항목 능력기준 전량 ABSENT(유일 이름 히트 `DELEGATION_EXCEEDED`는 RBAC 부여상한 오탐). 게다가 Delegation이 올라앉을 **§3 선행조건 4축이 모두 부재**. §72 Canonical Entity 28종 + §65 58편 = 측정기 커버리지 **0**(VALIDATED_LEGACY 0/전 블록).

## Decision

### D-1. Delegation SoT = **신설**(선례 0 · "중복이 아니라 부재")
- §59 중복 감사: 여러 Delegation Table / Substitute Approver / Acting Manager / Vacation Delegate = **전부 0**. HRIS/Calendar/ERP 이중 위임 = 소스 0이라 발생 불가. 통합할 "동일 목적 Delegation"이 없다 → 신규 Canonical이 §59 "중복 생성" 위반 아님.

### D-2. ★선행조건 4축 신설이 **선행**돼야 실 Delegation 구현 가능 (BLOCKED_PREREQUISITE)
| 축 | 부재 내용 | Delegation 영향 |
|---|---|---|
| **Approval Foundation**(§3.1) | 범용 Request/Case/Chain/Stage/Level/Resolution 0(단발 승인 플래그 3종만·5-3-2/5-3-3-3 커버0) | 위임할 "승인 경로" 자체가 없음 |
| **Authority Foundation**(§3.2) | Authority Matrix/Binding/amount_band 0(5-3-3-4 "Authority 개념 부재") | 이양할 권한 단위·Ceiling 미정의 → §12 Authority Binding·§18 Monetary 전부 BLOCKED_PREREQUISITE |
| **Reporting-Line Resolver**(§3.3) | `parent_user_id`가 최상위 owner로 붕괴(`UserAuth.php:156-157,1225-1227`)·Org/Legal Entity/Position/Employment 엔티티 0 | "관리자→위임대상" 관계 산출 불가·Acting Manager 불가 |
| **Authorization Safety**(§3.4) | SoD/CoI Hook·Break-glass·Actor Auth Snapshot ABSENT·`acl_permission` allow-only(deny 없음) | 위임 무결성 게이트 부재 |

### D-3. 재구현 금지 · **확장 대상 인접 자산**(Golden Rule = Extend)
| 축 | 정본 인접 자산 | file:line |
|---|---|---|
| Evidence / immutable_hash / Snapshot | **`SecurityAudit::verify():56-68`**(preimage ts 저장·hash_equals·prev_hash·tenant) | `backend/src/SecurityAudit.php:27,31,56-68` · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) |
| 부여 상한(monotonicity) 참조 | `acl_permission` 위임상한(부여자가 자기 없는 권한 못 줌) — **패턴 참조**(재구현 금지) | `TeamPermissions.php:615-647`(`DELEGATION_EXCEEDED:645`) |
| Cycle 검출 알고리즘 참조 | `PM/Dependencies::validateDependency` DFS·tenant 매홉·쓰기 전 차단 | `PM/Dependencies.php:79-100`(+`AdminMenu::wouldCycle:540-555`·`PM/Gantt` Kahn) |
| Tenant 격리 | `index.php:600` 무조건 tenant 덮어쓰기(단 strict 기본 OFF `:585`) | Cross-Tenant Delegation 차단(§5.4) |
| Effective dating(질의계층) | `kr_fee_rule.effective_from` open-interval | `Db.php:898` |

### D-4. 핵심 원칙 (코드화 시)
- **Delegation ≠ Authority**(§5.1): 새 영구 Authority 생성 금지.
- **Delegation ≤ Original Authority**(§5.2): Delegated Ceiling ≤ Original Ceiling(§18) — 현행 Authority ceiling 부재로 판정 불가.
- **Cross-Tenant/Self/Cycle 차단**(§5.4/§5.9/§5.8), **Effective-dated**(§5.3·종료일 없는 Temporary 금지), **재위임 기본 금지**(§5.7).
- **Explicit Deny 우선** — `acl_permission`은 allow-only(deny 표현 자체 0) → 신설 필수.

## Consequences

### ★실 위험/결함 (별도 승인세션)
1. 🔴 **Cross-Tenant Delegation 잔여 위험** — Tenant Guard REAL이나 **strict fail-closed 기본 OFF**(`index.php:585`).
2. 🔴 **acl 위임상한이 유일 monotonicity 방어** — 기간/수락/재위임/Cycle 없음. 시간제한 위임과 다른 도메인.
3. 🔴 **위임 무결성 게이트 부재** — SoD/CoI/Break-glass/Actor Auth Snapshot 전무.
4. 🔴 **AgencyPortal `revoked_at=NULL` in-place 소거**(`:304,381`) — Snapshot 불변성 반례. Delegation Revocation 신설 시 복제 금지(BLOCKED_HISTORICAL_INTEGRITY_RISK).

### 후속 EPIC
- 실 Delegation 엔진 = **선행 4축(Approval·Authority·Org/Legal Entity/Position·SoD) 신설 → Delegation Registry/Definition/Version/Binding/Eligibility/Candidate/Resolution/Conflict/Chain/Snapshot/Simulation/Reconciliation** 구현. **별도 승인세션**(Golden Rule + verify + 배포 승인). 본 세션 코드 변경 0.
- **EPIC 06-A-02 — Approval Assignment Engine**: 본 Delegation Foundation의 "자격 판정"을 입력으로 실제 Queue Assignment/Claim/Release/Reassign 구현.

## Status of coverage
전 엔티티 **VALIDATED_LEGACY 0 = 커버 0**. LEGACY_ADAPTER/KEEP_SEPARATE는 확장 대상 인접 자산이지 커버가 아니다. BLOCKED_PREREQUISITE는 선행 4축 부재로 차단된 축.
