# DSAR — Authorization Knowledge Graph Test Matrix (Part 3-21 §33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Authorization Knowledge Graph의 **테스트 매트릭스**를 정의한다. 6계열: Unit / Integration / Performance / Security / Compliance / Regression. 각 계열은 KG의 빌드·온톨로지·관계발견·추론·영향분석·시맨틱검색을 대상으로 하며, 격리·불변·추론권한을 검증한다.

## 2. Substrate 매핑(테스트 앵커)

| 테스트 계열 | 대표 케이스 | 앵커 substrate | 근거 file:line | 판정 |
|---|---|---|---|---|
| Unit | Graph Builder/Ontology/Relationship Discovery/Impact/Reasoning | — | — | 미구현 |
| Integration | RBAC 연동 | acl_permission SOURCE | `TeamPermissions.php:393-421` | 앵커만 |
| Integration | Fabric/Federation/AI Gov/Compliance/Observability | — | — | 미구현 |
| Performance | 1B Nodes·10B Edges·100M Q/day·1M Search/day | — | — | 미구현 |
| Security | Cross-Tenant | acl_permission tenant_id | `TeamPermissions.php:152-159` | 앵커 존재 |
| Security | Relationship Forgery | SecurityAudit verify | `SecurityAudit.php:63-64` | 라이브 표적 |
| Security | Graph Poisoning/Ontology Tampering/Unauthorized Reasoning | — | — | 미구현 |
| Compliance | ISO27001/NIST 800-53/SOC2/GDPR/ISO42001 | — | — | 미구현 |
| Regression | 무후퇴 전수 | AdminMenu 가드 | `AdminMenu.php:107-117` | 앵커만 |

## 3. 설계 계약
- **Unit**: Graph Builder(노드/엣지 파생), Ontology(버전 단조), Relationship Discovery(관계 추론), Impact(하류 순회), Reasoning(추론 정확)을 각각 격리 검증 — 대상 코드 부재로 전 케이스 미구현.
- **Integration**: RBAC 연동은 acl_permission SOURCE(`TeamPermissions.php:393-421`)를 KG 원천으로 삼아 검증. Fabric/Federation/AI Governance/Compliance/Observability 연동은 순신설 대상.
- **Performance**: 1B 노드·10B 엣지·100M 질의/일·1M 검색/일 부하 — §32 SLO와 정합. 측정 대상 부재로 미구현.
- **Security**: Cross-Tenant 격리는 tenant_id(`TeamPermissions.php:152-159`)로 앵커. Relationship Forgery는 SecurityAudit verify(`SecurityAudit.php:63-64`)를 라이브 표적으로 위조 탐지 검증. Graph Poisoning/Ontology Tampering/Unauthorized Reasoning은 신설.
- **Compliance**: ISO27001/NIST 800-53/SOC2/GDPR/ISO42001 매핑 — 표준별 증적 항목화, KG 구축 후 수행.
- **Regression**: 무후퇴 — 기존 admin 가드(`AdminMenu.php:107-117`) 회귀 없음 확인 포함.

## 4. KEEP_SEPARATE
- 마케팅 GraphScore(`GraphScore.php:12-30`) 테스트는 authz 테스트 매트릭스와 별도 — 커버리지 합산·상호 대체 금지.

## 5. 판정
**미구현**. graph 대상 부재로 Unit/Performance/Compliance 전 계열 미구현. 유효 앵커는 Cross-Tenant=tenant_id(`TeamPermissions.php:152-159`)·Relationship Forgery=SecurityAudit verify(`SecurityAudit.php:63-64`) 라이브 표적·RBAC Integration=SOURCE(`TeamPermissions.php:393-421`)·Regression=admin 가드(`AdminMenu.php:107-117`)에 국한. 전면 매트릭스는 KG 실현 후 **RP-track 조건부**. **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.
