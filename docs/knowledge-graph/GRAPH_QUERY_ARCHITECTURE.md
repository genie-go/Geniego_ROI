# EPIC 02-D — Knowledge Graph Query, Traversal, Security & Validation Gate (정식 마스터)

> **근거**: 02-A(저장)·02-B(Node/Edge Schema)·02-C(Projection) + 기존 조회 자산 실코드(GraphScore GET API·Attribution·AutoRecommend·CRM·docs/registry). **비파괴**: 설계·Registry·게이트만. 코드변경 0. 운영 Query 전면 Graph 전환·기존 조회 삭제·검증없는 Multi-Hop 공개 없음(§39).
> **§40 통합**: 24개 파편 대신 본 마스터가 Query Architecture·Contract·Type Registry·Traversal Policy/Permission·Path/Property Security·Complexity/Limits·Freshness/Drift·AI/Automation Gate·Cache/Search·Audit/Observability/SLO·Benchmark·회귀·통합계획·Final Validation을 통합. ADR=[`../architecture/ADR_KNOWLEDGE_GRAPH_QUERY_SECURITY.md`](../architecture/ADR_KNOWLEDGE_GRAPH_QUERY_SECURITY.md).
> **★핵심 게이트(정직)**: 02-C에서 Graph는 아직 자동 인제스천 미배선(수동 API·실적재 UNVERIFIED). 따라서 어떤 Query도 **PRODUCTION 승인 불가** → 최대 `APPROVED_FOR_SHADOW`. 인제스천 라이브검증 통과가 운영 승인의 선결.

---

## 1. 기존 조회 자산 & 통합 분류 (§35)

| 기존 구현 | 성격 | 위치 | 통합 상태 |
|---|---|---|---|
| **GraphScore GET** /v419/graph/summary\|edges\|nodes\|score | 진짜 그래프 질의(3홉 paths+confidence) | GraphScore.php·routes:716 | **KEEP_AS_CANONICAL**(Query Layer 확장 기반) |
| Attribution markov/shapley 경로 | 귀속 경로(in-memory) | AttributionEngine.php:1468/965 | **KEEP_AS_CANONICAL**(분석 SoT)·근거 Query로 노출 |
| AutoRecommend 추천 근거 | 채널배분+truthRatio | AutoRecommend.php | **INTEGRATE**(KG 근거 피처 추가) |
| CRM Customer Journey | RDB 조인(crm_activities) | CRM.php | **KEEP_AS_FALLBACK**(Graph 장애 시 정본) |
| GlobalSearch | 엔티티 검색 | GlobalSearch.jsx:34 | **INTEGRATE**(Scope 격리 검증 필요·UNVERIFIED) |
| docs/registry 19 + Dependency | 엔지니어링 의존성 | docs/registry | **KEEP_SEPARATE**(문서 그래프) |
| DataPlatform dataLineage | 계보(비영속) | DataPlatform.php:316 | **INTEGRATE**(Lineage Query) |

**중복 Query Service 신설 금지**(§3.5) — GraphScore GET 확장이 Canonical Query Layer.

## 2. Canonical Graph Query 계층 (§4 — 13 Layer)
Auth → Tenant/Workspace Scope → Authorization → Query Validation → Complexity Estimation → Query Planning → **Graph Storage Adapter**(graph_node/edge) → Result Filtering → Sensitive Masking → Confidence/Freshness Annotation → Audit Logging → Metrics/Tracing → Response Contract. **UI/분석/자동화는 저장소 직접 호출 금지**(Layer 경유).

## 3. Query Type Matrix (§41)

| Query Type ID | Purpose | Start Node | Allowed Edges | Target | Max Depth | Max Results | Freshness | Permission | SLO | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| QT-NODE | USER_DASHBOARD | 임의 CE | — | — | 0 | 1 | 최근동기화 | Node Read | <200ms | APPROVED_FOR_SHADOW |
| QT-EDGE | ANALYTICS | 임의 | 1 | — | 1 | N | 최근 | Edge Read | <300ms | APPROVED_FOR_SHADOW |
| QT-NEIGHBOR | USER_DASHBOARD | 임의 | allowlist | allowlist | 1 | 100 | 최근 | 1-Hop | <500ms | APPROVED_FOR_SHADOW |
| QT-PATH | ATTRIBUTION | Order/Conversion | allowlist | Campaign | 3 | 50 | 기간정합 | Multi-Hop 승인 | <1s | BLOCKED_PENDING_VALIDATION |
| QT-TRAVERSE | ANALYTICS | 임의 | allowlist | allowlist | 3 | 200 | 최근 | Multi-Hop 승인 | <2s | BLOCKED_PENDING_VALIDATION |
| QT-AGG | ANALYTICS | 그룹 | allowlist | — | 2 | 그룹제한 | 최근 | Aggregate | <2s | APPROVED_FOR_SHADOW |
| QT-TEMPORAL | ANALYTICS | 임의 | allowlist | — | 2 | N | 시점 | Multi-Hop | <2s | BLOCKED_PENDING_VALIDATION |
| QT-LINEAGE | DATA_LINEAGE | Metric/Insight | DERIVED/NORMALIZED | Source | 5(제한) | N | 이력 | Lineage | <3s | BLOCKED(normalized 고아) |
| QT-IMPACT | ENGINEERING_IMPACT | Feature/API | 의존 | — | 4 | N | — | Admin | <3s | KEEP_SEPARATE(문서) |
| QT-REC-EVID | RECOMMENDATION | Recommendation | SUPPORTED_BY/BASED_ON | Insight/Metric | 3 | N | 엄격 | Analytics Svc | <1s | BLOCKED_PENDING_VALIDATION |
| QT-AUTO-EVID | AUTOMATION_EXECUTION | AutomationRun | 근거 | Insight/Target | 3 | N | 엄격 | Automation Svc | <1s | BLOCKED_PENDING_VALIDATION |

## 4. Query Contract (§6/§7)
필수: query_type·tenant_id·workspace_id·actor_user_id·actor_role·start_node·allowed_edge_types·allowed_target_types·max_depth·max_results·time_range·freshness_requirement·min_quality/trust/confidence·include_properties·exclude_sensitive·pagination·sort·**purpose**·request_id. **클라이언트 tenant_id/role/permission 불신 — 서버 세션 재확인**(01-D fail-closed 승계). 목적(USER_DASHBOARD/ANALYTICS/ATTRIBUTION/RECOMMENDATION/AUTOMATION_PREVIEW/EXECUTION/DATA_LINEAGE/SECURITY_AUDIT/ADMIN_AUDIT/ENGINEERING_IMPACT/SUPPORT)별 허용 Node/Edge/Depth/속성/Freshness 차등.

## 5. Traversal Policy & Permission Matrix (§8/§11/§42)
- **1-Hop 기본 허용·Multi-Hop 명시 승인·목적별 Max Depth**(대시보드 저·분석 중·Lineage 제한고·자동화 최소). Edge Type Allowlist. **각 Hop마다 Edge Read+Target Node Read+Property+Sensitive+Tenant+Classification 재검증**(§3.2).

| Permission ID | Role | Purpose | Source | Edge | Target | Depth | Properties | Scope | Decision | Audit |
|---|---|---|---|---|---|---|---|---|---|---|
| TP-MKT-1 | analyst | ANALYTICS | Customer | PURCHASED | Order | 1 | 비PII | Tenant | ALLOW | Y |
| TP-ATT-1 | analyst | ATTRIBUTION | Order | ATTRIBUTED_TO | Campaign | 3 | 집계 | Tenant | ALLOW | Y |
| TP-CRED-DENY | * | * | Customer/User | *→Credential/Secret | Credential | * | — | * | **DENY** | Y |
| TP-XTENANT-DENY | * | * | * | * | 他Tenant | * | — | * | **DENY** | Y |
| TP-ADMIN-AUDIT | admin | SECURITY_AUDIT | Admin/Session | * | Credential(ref) | 2 | masked | Tenant | ALLOW+Approval | Y |
| TP-AUTO | automation svc | AUTOMATION_EXECUTION | VERIFIED만 | 승인 Edge | Target | 3 | 비PII | Tenant | ALLOW+게이트 | Y |

**Denied Paths**(§8.5): Customer→Credential·User→Secret·일반유저→AdminAction·Demo→Production·TenantA→TenantB.

## 6. Path & Property Security (§9/§10)
- **경로 전체 검증**: Cross-Tenant/Workspace·Unauthorized Node/Edge·Sensitive Property 노출·Restricted Type·Blocked Relationship·Stale Critical·Security Restricted 중 하나라도 위반 시 경로 제거/Query 차단.
- **Property-Level**: Customer Node — 마케팅 허용(segment·lifecycle·ltv_band·churn_risk) vs Masking(email·phone·address·external_customer_id·PII). Admin/승인 역할만 민감속성.

## 7. Complexity & Limits (§12/§13/§14/§15/§16)
- **Complexity 사전계산**(Depth·시작Node수·Fanout·Edge Type수·시간범위·Aggregation·Sort·Property·Temporal·예상결과·비용) → LOW/MEDIUM/HIGH/**REJECTED**(실행 안 함).
- **안전 한도**(목적별): Max Depth·Start Nodes·Results·Edges·Execution Time·Memory·Aggregation Groups·Export Rows·Concurrent·Rate Limit. **Admin도 무제한 금지**.
- **Pagination**=Cursor+Stable Sort(Offset 대안). **Timeout+Cancellation**(연결종료/취소 시 실행중단). **Rate Limit/Quota**=User/Tenant/Workspace/Token/ServiceAccount/QueryType/Purpose/Export/Admin(타 테넌트 성능 보호).

## 8. Result Status·Freshness·Drift (§17/§18/§19)
- 결과 메타: graph_schema_version·projection_version·data_freshness·last_reconciled_at·quality/trust/confidence·**drift_status·partial_result·truncated·warning_codes·lineage_reference**. 단순 결과만 반환 금지.
- **Freshness 미충족** → 경고/Partial/Source 직접조회/Reconciliation 요청/차단.
- **Drift**: MINOR(경고+Confidence조정)·MAJOR(중요 분석/추천 제한)·CRITICAL(자동화·고위험 차단)·RECONCILING(부분결과 표시).

## 9. AI / 추천 / 자동화 안전 게이트 (§20/§21/§22 — 기존 Vol3/4/5 승계)
- **AI Usage Gate**: 목적·허용 Type·Tenant·Freshness·Quality/Trust/Confidence·Drift·민감제거·Explainability·근거 Lineage 확인. **Graph 전체 Dump 금지 — 최소 Subgraph만**.
- **추천 게이트**: 대상 존재·근거 Edge 검증·최소 데이터량·Confidence·최신성·Source 다양성·봇/허위 제외·Tenant·설명가능성. 낮은 신뢰=`SUGGESTION_ONLY`.
- **자동화 실행 게이트**(모두 충족): Node/Edge VERIFIED·Freshness·Drift 非Critical·Tenant/Workspace 일치·Target 권한·Policy 승인·**Dry Run/Preview 성공**·빈도제한·중복방지·예산/대상/채널 안전한도·감사로그·**Rollback 정의**. 하나라도 실패=자동실행 차단+사유기록(AutoCampaign adj_roas·isMarketingSendAllowed 안전장치 승계).

## 10. Cache / Search / Audit / Observability (§23~27)
- **Cache Key**=tenant_id+workspace_id+actor_permission_version+query_type+normalized_query+schema_version+projection_version+freshness_bucket. **타 테넌트 공유 금지**·민감 결과 no-cache/짧은TTL.
- **Search Index**: Tenant Partition·Workspace Filter·Classification·Tombstone 반영·Projection Version·Reindex·Sensitive 제외·Alias·Duplicate 방지.
- **Query Audit**: request_id·actor·tenant·purpose·query_type·requested/actual_depth·edge_types·result_count·truncated·exec_time·complexity·authz_result·masked_properties·warning·success/failure. **PII/전체쿼리 무분별 기록 금지**.
- **Metrics**: Count·Success/Failure·P50/95/99 Latency·Timeout·Cancellation·Complexity Rejection·**Cross-Tenant Block·Permission Deny·Sensitive Path Block**·Cache Hit·Stale·Drift Warning·Automation Block·Truncation·Storage Error·Cost.
- **SLO**(§27): 목적별 차등(Dashboard·Exploration·Attribution·Lineage·Automation Preview/Execution·Admin Audit·Batch) — 동일 목표 금지.

## 11. Benchmark & 정확성 (§28/§29)
- Benchmark 시나리오: 단일Node·1-Hop·2~3Hop·고Fanout·Temporal·Lineage·Path·Aggregation·Tenant 대량·동시사용자·자동화 검증 Query. 측정=Latency·Throughput·CPU·Mem·I/O·Cost·Cache·Projection Lag 영향·Tenant 간섭.
- **정확성 대조**: Node/Edge Count·관계 존재·Tenant Scope·Temporal·삭제반영·Alias/ER·Property·Lineage·Aggregation vs SoT(channel_orders 등).

## 12. 회귀 & Fallback (§30~34)
- **보안 테스트**: 비로그인 차단·타 Tenant Node ID 직접조회 차단·타 Workspace Traversal 차단·Admin Node 차단·민감 Masking·Forbidden Edge 차단·Cross-Tenant Cache 오염 차단·Search Scope·Injection 방지·과도 Depth/Fanout 차단·Export 제한·Demo/Prod 혼합 차단.
- **정합성**: Orphan Edge 반환 차단·Tombstone/Deleted 처리·Projection Version 불일치·Duplicate·Late Event·Stale·Reconciling 중 Query·Partial 표시.
- **분석 회귀**: Journey/Funnel/Attribution/ROAS/CAC/LTV/Cohort/Affinity/Creator/Campaign/Lineage/Rec Evidence 전후 비교(변경=근거 기록).
- **자동화 회귀**: 대상수/제외수/Trigger/Segment/채널/예산/중복/FreqCap/Suppression/Approval/Rollback 전후(달라지면 설명+승인).
- **Fallback**(Graph 장애): **Canonical RDB 조회**(기존 조인 정본)·최근 검증 Snapshot·Read-Only Cache·Partial·기능 일시제한·자동화 차단·경고. **오래된 Cache를 최신인 척 표시 금지**. → Graph 장애가 핵심기능 전체중단 유발 안 함(RDB가 SoT).

## 13. Query Explain (§37)
운영자/승인 사용자에게: 시작 Node·탐색 Edge·적용 권한 필터·제외 데이터·잘림 사유·Projection Version·Freshness·Drift/품질 경고·파생 Source 설명.

## 14. Final Validation & 운영 승인 (§43/§46)
- **현 상태**: Query Layer 설계·권한·게이트 확정. **그러나 Graph 실적재 전이라 SECURITY/PERFORMANCE/DATA/REGRESSION Verified 불가** → 대부분 `APPROVED_FOR_SHADOW` 또는 `BLOCKED_PENDING_VALIDATION`. **PRODUCTION 승인 0**(인제스천 라이브검증 선결).
- Fallback=RDB SoT라 무후퇴 보장. Cross-Tenant/Sensitive 차단 설계는 01-D fail-closed 승계로 근거 있음.

## 15. §45 완료 보고 수치
조사 기존 Query 구현 7(GraphScore GET·Attribution·AutoRecommend·CRM Journey·GlobalSearch·docs/registry·dataLineage) · Canonical Query Type 11(QT-*) · Traversal Permission 6(TP-*, DENY 2 포함) · Security Verified 0(설계만·데이터 전) · Performance Verified 0 · Data Verified 0 · Regression Verified 0 · **Shadow 승인 4**(QT-NODE/EDGE/NEIGHBOR/AGG) · **Production 승인 0** · Blocked Security 0 · Blocked Tenant Isolation 0(설계상 차단) · Blocked Performance 0 · Blocked Data Quality: QT-PATH/TRAVERSE/TEMPORAL/LINEAGE/REC-EVID/AUTO-EVID 6(실적재·OrderItem/normalized 선결) · P95/P99=Benchmark 계획(데이터 후) · Cross-Tenant 차단=설계 검증(01-D 승계)·라이브 테스트 대기 · 분석/자동화 회귀=Shadow Compare 계획 · 문서=본 마스터+ADR+PM · 남은리스크=Graph 실적재·웹훅 HMAC(02-C)·볼륨노드·OrderItem/normalized BLOCKED · **EPIC02 완료(설계 Foundation)·라이브 배선은 자격증명 등록 후**. 코드변경 0.
