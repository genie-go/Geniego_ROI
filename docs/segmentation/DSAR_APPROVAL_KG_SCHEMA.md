# DSAR — Authorization Knowledge Graph Schema Manager (Part 3-21 §1·§30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §1 Graph Schema Manager · §30 종속)

Graph Schema Manager는 인가 KG의 노드 유형(§3)·간선 유형(§4)·속성 제약·테넌트 스코프·버전을 선언·검증·진화(evolution)시키는 스키마 계층이다. 관계형 substrate 위에 그래프 스키마를 정의하되, 물리 저장은 순수 MySQL(`Db.php:126-127`)을 전제하며 별도 graph DB를 도입하지 않는다(§30 종속 — 저장/질의 계층 결정에 종속).

책임:
1. 노드/간선 유형 등록·검증(§3·§4 어휘와 정합).
2. 속성 스키마·제약(테넌트 필수·방향성·PARTIAL 표기) 강제.
3. 스키마 버전·진화 이력을 감사 원장(`SecurityAudit.php:25-31`)과 연동.
4. 마케팅 그래프 스키마와의 네임스페이스 격리 강제.

## 2. 실존 substrate 매핑

| 스키마 요소 | 실존 원천 | 근거(허용목록) | 판정 |
|---|---|---|---|
| 물리 저장(관계형) | 순수 MySQL PDO 싱글턴 | `Db.php:126-127` | PRESENT(no graph DB) |
| 테넌트 스코프 컬럼 | 테넌트 격리 스키마 | `Db.php:149` | PRESENT(SOURCE) |
| 정책 스키마 원천 | 정책 테이블 | `Db.php:942-955`·`:956` | PRESENT(SOURCE) |
| 어휘 정합(노드/간선) | MENU_CATALOG·ACTIONS | `TeamPermissions.php:55-82`·`:39` | PRESENT(SOURCE) |
| 스키마 진화 감사 | 감사 원장 append/verify | `SecurityAudit.php:25-31`·`:63-64` | PARTIAL |
| **그래프 스키마 매니저 엔진** | (부재) | grep 0 | **ABSENT-greenfield** |
| **스키마 버전·진화 자동화** | (부재) | grep 0 | **ABSENT-greenfield** |

★ **KEEP_SEPARATE / PRESENT 오판 금지**: `graph_node`/`graph_edge` 테이블 스키마(`Db.php:815-839`·`:816`·`:826`)는 **마케팅 GraphScore**(`GraphScore.php:12-30`·`:57`·`:70-97`) 스키마다. 인가 그래프 스키마로 계상 절대 금지·재사용 금지.

## 3. 설계 계약 (규칙)

- **R-SCH-1 관계형 전제**: graph DB 미도입. 노드/간선은 관계형 substrate(`Db.php:126-127`) 위 투영 스키마로 정의(§30 저장/질의 계층 결정에 종속).
- **R-SCH-2 어휘 정합**: 스키마 매니저는 §3 노드·§4 간선 정규 어휘만 승인하며 `TeamPermissions` MENU_CATALOG(`:55-82`)·ACTIONS(`:39`)와 불일치하는 유형 등록 거부.
- **R-SCH-3 테넌트 필수 제약**: 모든 노드/간선 스키마는 tenantId 컬럼을 필수 선언(`Db.php:149` 격리 스키마 정합).
- **R-SCH-4 진화 감사**: 스키마 버전 변경은 감사 원장(`SecurityAudit.php:35-38`·`:51`) append·verify(`:63-64`)로 tamper-evident 기록. append만 실재하는 PARTIAL 구간은 verify 대상 명시.
- **R-SCH-5 마케팅 격리**: 마케팅 `graph_node`/`graph_edge` 스키마와 물리·논리·네임스페이스 분리. 동일 DDL 겸용 금지.

## 4. KEEP_SEPARATE

`graph_node`(`Db.php:816`)·`graph_edge`(`Db.php:826`) 스키마(`Db.php:815-839`)는 마케팅 GraphScore(`GraphScore.php:12-30`·`:57`·`:70-97`) 소유. 인가 Schema Manager와 완전 분리.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** 저장 substrate는 SOURCE-PRESENT(순수 MySQL `Db.php:126-127`·테넌트 격리 `:149`·정책 스키마 `:942-955`)이나 그래프 스키마 매니저 엔진은 ABSENT-greenfield(grep 0)·순신설. §30 저장/질의 계층 결정에 종속하며, 해당 결정 미확정으로 스키마 계층 실행 인증 불가.
