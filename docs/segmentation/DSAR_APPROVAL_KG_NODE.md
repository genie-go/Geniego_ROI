# DSAR — Authorization Knowledge Graph Node Model (Part 3-21 §3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §3 — APPROVAL_GRAPH_NODE)

Node Model은 인가 KG의 정점(vertex) 어휘를 정규화한다. 노드는 원천을 복제하지 않고 실존 substrate에서 투영되는 식별자·유형·테넌트 스코프·속성 집합을 가진다. 정규 노드 유형:

User · Group · Org · Dept · Role · Permission · Policy · Scope · Resource · Session · Device · Trust · Risk · Compliance Control · Regulation · Workflow · Approval · AI Recommendation · Region · Tenant.

각 노드는 (nodeType, nodeId, tenantId, sourceRef, attributes) 튜플로 표현하며 sourceRef는 substrate file:line 투영 근거를 보유한다.

## 2. 실존 substrate 매핑

| 노드 유형 | 실존 원천 어휘 | 근거(허용목록) | 판정 |
|---|---|---|---|
| Role | RBAC 역할·정책 판별 | `TeamPermissions.php:393-421`·`:152-159` | PRESENT(SOURCE) |
| Permission | ACTIONS 액션 어휘 | `TeamPermissions.php:39` | PRESENT(SOURCE) |
| Resource(메뉴) | MENU_CATALOG | `TeamPermissions.php:55-82` | PRESENT(SOURCE) |
| Policy | 정책 테이블 | `Db.php:942-955`·`:948` | PRESENT(SOURCE) |
| User | 사용자·상속 원천 | `UserAuth.php:186-188`·`:54` | PRESENT(SOURCE) |
| Group/Dept | SSO group 매핑 | `EnterpriseAuth.php:70`·`:72` | PARTIAL(부분배선) |
| Org/Tenant | 테넌트 스코프 속성 | `Db.php:149` | PRESENT(SOURCE) |
| Session/Device | 인증 세션 컨텍스트 | `UserAuth.php:216-243` | PARTIAL |
| Approval/Workflow | 승인 큐(선행 Part) | ①②/ADR 참조 | PARTIAL |
| Compliance Control/Regulation | 감사 원장 | `SecurityAudit.php:25-31` | PARTIAL |
| Scope/Trust/Risk/AI Rec/Region | 그래프 어휘 정규화 대상 | grep 0 | ABSENT |
| **노드 스토어 엔진** | (부재) | grep 0 | **ABSENT-엔진** |

★ **KEEP_SEPARATE**: `graph_node`(`Db.php:816`) 테이블은 **마케팅 GraphScore** 노드이며(`GraphScore.php:12-30`) 인가 노드 스토어가 아니다. PRESENT 오판 금지·재사용 금지.

## 3. 설계 계약 (규칙)

- **R-NODE-1 투영 불변**: 노드는 substrate 원천을 write하지 않는다. sourceRef 참조만 보유(무후퇴).
- **R-NODE-2 어휘 SSOT**: Role/Permission/Resource 어휘는 `TeamPermissions` MENU_CATALOG(`:55-82`)·ACTIONS(`:39`)를 유일 원천으로 삼는다. 중복 어휘 정의 금지.
- **R-NODE-3 테넌트 필수**: 모든 노드는 tenantId를 필수 속성으로 가지며 크로스테넌트 정점 병합 금지(격리 절대).
- **R-NODE-4 PARTIAL 표기**: Group/Session/Approval/Compliance 노드는 substrate가 부분배선(PARTIAL)임을 노드 메타에 명시하고, 미배선 속성은 Unknown으로 fail-closed 처리.
- **R-NODE-5 마케팅 격리**: 마케팅 `graph_node` 스키마·커넥터를 인가 노드 스토어로 겸용 금지.

## 4. KEEP_SEPARATE

`graph_node`(`Db.php:816`)는 마케팅 GraphScore(`GraphScore.php:12-30`·`:57`·`:70-97`) 소유. 인가 Node Model과 물리·논리·명명 완전 분리.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** 노드 어휘 원천은 SOURCE-PRESENT(`TeamPermissions.php:55-82`·`:39`·`Db.php:942-955`)이나 노드 스토어 엔진은 ABSENT-엔진(grep 0)·순신설. Scope/Trust/Risk/AI Rec/Region 유형은 substrate 부재. 선행 스키마 매니저(§30) 미착수로 실행 인증 불가.
