# DSAR — Authorization Knowledge Graph 중앙 레지스트리 (Part 3-21 §1·§2)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §1 — APPROVAL_GRAPH_REGISTRY)

APPROVAL_GRAPH_REGISTRY는 인가(authorization) 도메인의 노드·엣지·스키마·질의계약을 단일 진실원천(SSOT)으로 등록·판별하는 중앙 카탈로그다. 목적은 세 가지다.

1. **중복 방지 게이트** — 어떤 노드/엣지 유형이 그래프 어휘로 신규 편입될 때, 기존 substrate(RBAC/ABAC/위계 관계 원천)에 이미 존재하는 사실을 재수집·재정의하지 않도록 등록 전 판별한다. 착수 전 grep 전수 원칙과 동일 계약.
2. **substrate 매핑 SSOT** — 각 그래프 노드/엣지가 어떤 실존 관계 원천에서 투영(projection)되는지를 file:line 근거와 함께 고정한다. 그래프는 원천이 아니라 **읽기 투영**이다(SOURCE-PRESENT·GRAPH ABSENT).
3. **경계 격리** — 마케팅 도메인 그래프(`graph_node`/`graph_edge`)와 인가 그래프의 물리·논리 분리를 레지스트리 수준에서 강제한다.

## 2. 실존 substrate 매핑 (§2)

| 레지스트리 항목 | 실존 원천 | 근거(허용목록) | 판정 |
|---|---|---|---|
| RBAC 관계 원천 | acl_permission 정책 판별 | `TeamPermissions.php:152-159`·`:393-421` | PRESENT(SOURCE) |
| ABAC/위계 원천 | parent_user_id 상속 | `UserAuth.php:186-188` | PRESENT(SOURCE) |
| 메뉴 어휘 카탈로그 | MENU_CATALOG | `TeamPermissions.php:55-82` | PRESENT(SOURCE) |
| 액션 어휘 | ACTIONS | `TeamPermissions.php:39` | PRESENT(SOURCE) |
| 정책 저장 | 정책 테이블 | `Db.php:942-955` | PRESENT(SOURCE) |
| 저장소 유형 | 순수 MySQL(PDO) | `Db.php:126-127` | PRESENT(no graph DB) |
| **그래프 노드 레지스트리 엔진** | (부재) | grep 0 | **ABSENT-greenfield** |
| **그래프 엣지 레지스트리 엔진** | (부재) | grep 0 | **ABSENT-greenfield** |
| **레지스트리 질의계약** | (부재) | grep 0 | **ABSENT-greenfield** |

★ **PRESENT 오판 절대 금지**: `graph_node`/`graph_edge` 테이블(`Db.php:815-839`)은 **마케팅 GraphScore**(`GraphScore.php:12-30`) 소유이며 인가 그래프가 아니다. 레지스트리는 이를 authz 노드/엣지로 절대 계상하지 않는다(§4 KEEP_SEPARATE).

## 3. 설계 계약 (규칙)

- **R-REG-1 등록 선판별**: 신규 노드/엣지 유형은 레지스트리 조회로 substrate 존재 여부를 먼저 판별한다. 존재 시 신설 금지·기존 원천 투영으로만 편입.
- **R-REG-2 투영 불변**: 레지스트리 항목은 원천을 복제하지 않고 file:line 참조만 보유한다. 그래프는 원천을 쓰지(write) 않는다(읽기 투영·무후퇴).
- **R-REG-3 경계 강제**: 마케팅 `graph_node`/`graph_edge` 네임스페이스는 인가 레지스트리에 등재 불가. 물리 테이블 공유 금지.
- **R-REG-4 테넌트 격리**: 모든 레지스트리 항목은 테넌트 스코프를 필수 속성으로 보유(격리 절대).
- **R-REG-5 NOT_CERTIFIED 게이트**: 엔진 부재(ABSENT-greenfield) 상태에서 레지스트리는 설계 계약만 고정하며 실행 코드 인증 불가.

## 4. KEEP_SEPARATE

`graph_node`(`Db.php:816`)·`graph_edge`(`Db.php:826`)는 마케팅 GraphScore 도메인(`GraphScore.php:12-30`·`:57`·`:70-97`) 전용이다. 인가 KG 레지스트리와 물리·논리·명명 완전 분리하며, 동일 테이블·동일 커넥터 재사용 금지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** substrate=SOURCE-PRESENT(RBAC/ABAC/위계 원천 실존)이나 레지스트리 엔진 자체는 ABSENT-greenfield(grep 0)·순신설. 저장소는 순수 MySQL(`Db.php:126-127`)로 graph DB 부재. 선행(§30 스키마 매니저·§3 노드·§4 엣지) 미착수로 실행 인증 불가.
