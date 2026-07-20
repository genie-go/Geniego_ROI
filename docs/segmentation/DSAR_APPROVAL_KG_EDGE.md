# DSAR — Authorization Knowledge Graph Edge Model (Part 3-21 §4)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §4 — APPROVAL_GRAPH_EDGE)

Edge Model은 인가 KG의 간선(edge) 어휘를 정규화한다. 간선은 실존 관계 원천에서 투영되는 방향성 관계로, (edgeType, srcNodeRef, dstNodeRef, tenantId, sourceRef, attributes) 튜플로 표현한다. 정규 간선 유형:

ASSIGNED_TO · MEMBER_OF · HAS_ROLE · HAS_PERMISSION · INHERITS · APPROVES · DEPENDS_ON · CONSTRAINS · GOVERNS · TRUSTS · FEDERATES_WITH · OWNS · REVIEWED_BY · AUDITED_BY.

## 2. 실존 substrate 매핑

| 간선 유형 | 실존 관계 원천 | 근거(허용목록) | 판정 |
|---|---|---|---|
| HAS_PERMISSION | acl_permission 부여 | `TeamPermissions.php:152-159` | PRESENT(SOURCE) |
| HAS_ROLE/ASSIGNED_TO | RBAC 역할 배정 | `TeamPermissions.php:393-421`·`:145-151` | PRESENT(SOURCE) |
| INHERITS/MEMBER_OF | parent_user_id 상속 | `UserAuth.php:186-188` | PRESENT(SOURCE) |
| FEDERATES_WITH | agency_client_link | `AgencyPortal.php:64` | PRESENT(SOURCE) |
| GOVERNS(SSO group→role) | sso_group_role_map | `EnterpriseAuth.php:70`·`:72` | PARTIAL(부분배선) |
| APPROVES | 승인 큐(선행 Part) | ①②/ADR 참조 | PARTIAL |
| AUDITED_BY | 감사 원장 append | `SecurityAudit.php:35-38`·`:51` | PARTIAL |
| OWNS/CONSTRAINS/Scope | 스코프 제약 | `TeamPermissions.php:160-166` | PARTIAL |
| DEPENDS_ON/TRUSTS/REVIEWED_BY | 그래프 어휘 정규화 대상 | grep 0 | ABSENT |
| **엣지 스토어/순회 엔진** | (부재) | grep 0 | **ABSENT-엔진** |

★ **KEEP_SEPARATE**: `graph_edge`(`Db.php:826`) 테이블은 **마케팅 GraphScore** 간선이며(`GraphScore.php:12-30`) 인가 엣지 스토어가 아니다. PRESENT 오판 금지·재사용 금지.

## 3. 설계 계약 (규칙)

- **R-EDGE-1 투영 불변**: 간선은 관계 원천을 write하지 않는다. sourceRef 참조만 보유(무후퇴). 인가 판별의 SSOT는 여전히 `TeamPermissions` 정책(`:393-421`)이며 그래프는 읽기 투영.
- **R-EDGE-2 방향성·유형 고정**: 14개 정규 간선 유형만 허용. 임의 관계 신설 금지·기존 원천 매핑으로만 편입.
- **R-EDGE-3 테넌트 필수**: 모든 간선은 tenantId를 보유하며 크로스테넌트 간선 금지(격리 절대). FEDERATES_WITH(`AgencyPortal.php:64`)만 명시 승인된 대행-클라이언트 링크로 예외 허용.
- **R-EDGE-4 PARTIAL fail-closed**: GOVERNS(SSO 부분배선)·APPROVES·AUDITED_BY 간선은 미배선 구간을 Unknown으로 두고 인가 확정에 사용 금지(fail-closed).
- **R-EDGE-5 마케팅 격리**: `graph_edge` 스키마·커넥터를 인가 엣지 스토어로 겸용 금지.

## 4. KEEP_SEPARATE

`graph_edge`(`Db.php:826`)는 마케팅 GraphScore(`GraphScore.php:12-30`·`:57`·`:70-97`) 소유. 인가 Edge Model과 물리·논리·명명 완전 분리.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** 간선 원천은 SOURCE-PRESENT(HAS_PERMISSION `:152-159`·INHERITS `UserAuth.php:186-188`·FEDERATES_WITH `AgencyPortal.php:64`)이나 엣지 스토어·순회 엔진은 ABSENT-엔진(grep 0)·순신설. DEPENDS_ON/TRUSTS/REVIEWED_BY는 substrate 부재. 선행 스키마 매니저(§30) 미착수로 실행 인증 불가.
