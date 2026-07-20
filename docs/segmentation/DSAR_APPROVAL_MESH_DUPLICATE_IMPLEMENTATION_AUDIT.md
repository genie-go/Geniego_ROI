# DSAR — Authorization Universal Governance Mesh: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`.
> (A) mesh 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 동음이의(죽은 terraform/k8s·마케팅 sync/node·geo region·ML consensus·approval quorum·HTTP routing·agent).

---

## 1. 핵심 판정 — **authz governance mesh 골격 전면 부재, 단일 모놀리스**

`governance.?mesh|mesh.?topology|mesh.?consensus|policy.?distribution|trust.?fabric|bft|byzantine|raft|paxos|gossip|auto.?discovery|node.?join|istio|envoy|kafka|rabbitmq|nats|sqs` **authz 매치 0건**. 라이브=단일 PHP/MySQL 모놀리스(`Db.php:9`·`composer.json:6-13`)·메시지버스/k8s/service-mesh/분산 consensus 전무. 모든 mesh-adjacent 히트는 죽은 infra·마케팅/ML/geo/approval/HTTP/menu 동음이의.

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Universal Governance Registry / Mesh Controller / Topology Manager | **ABSENT(grep 0)** | node registry/cluster/join/topology 전무·단일노드(`Db.php:63-87`) |
| Distributed Policy Distribution(remote push/pull/hybrid) | **ABSENT / proto** | AdminPlans 미러(`AdminPlans.php:53-72`)=동일서버 복사·remote/delta 없음 |
| Regional Governance Node / Local Governance Agent(VM/Container/K8s/Edge) | **ABSENT(grep 0)** | governance node/agent 전무·로컬 PDP(`TeamPermissions.php:695-700`)만 |
| Policy Synchronization Bus(streaming/delta/conflict) | **ABSENT** | 브로커 부재(`composer.json:6-13`)·enqueue=DB 잡(`Db.php:519-527`)·SSE(`PM/Events.php:50`)만 |
| Global Trust Fabric / Universal Context Exchange(cross-node) / Cross-Domain Coordination | **PARTIAL local / ABSENT cross** | 테넌트 SSO(`EnterpriseAuth.php:43-53`)·agency 위임(`AgencyPortal.php:64-71`)·index.php 주입(`:116-121`)만·cross-region 없음 |
| Mesh Health/Recovery/Consensus(majority/weighted/BFT) | **PARTIAL / ABSENT** | 단일노드 health(`SystemMetrics.php:32`)·maker-checker approval(`Mapping.php:287`·BFT 아님)·recovery coordinator 없음 |
| Governance Routing / Federation Gateway | **ABSENT(grep 0)** | 정적 HTTP 라우트(`routes.php:759-764`)·service mesh 없음 |
| Mesh Snapshot/Evidence(native)/Digest/Analytics/Drift/Revalidation/Reconciliation | **ABSENT / PARTIAL** | SecurityAudit(`SecurityAudit.php:27`)=generic·topology/sync ledger 없음 |
| Runtime Guard / Static Lint | **ABSENT(grep 0)** | rogue node/consensus manipulation 가드 없음 |
| Local PDP/PEP·Context·Evidence·Health | **PARTIAL** | 단일노드 substrate(GT① §C) |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 확장)

1. **AdminPlans 미러** — `AdminPlans.php:53-72`. Policy Distribution(§6) proto.
2. **maker-checker quorum** — `Alerting.php:644-650`·`Mapping.php:287`. Consensus(§15·approval).
3. **SecurityAudit 해시체인** — `SecurityAudit.php:27`·`:63-64`. Mesh Evidence(§19).
4. **index.php context 주입** — `index.php:116-121`. Context Exchange(§11).
5. **TeamPermissions/index.php** — `TeamPermissions.php:695-700`·`index.php:69`. Regional Node/Local Agent(§7·§8).
6. **SystemMetrics/SSO/agency** — `SystemMetrics.php:32`·`EnterpriseAuth.php:43-53`·`AgencyPortal.php:64-71`. Health/Trust.

## 4. ★KEEP_SEPARATE — authz mesh 아님 (죽은 infra·마케팅·geo·ML·approval·HTTP·agent)

### B-1. ★죽은 terraform/k8s/Postgres/Redis 스캐폴딩 (mesh/cluster/consensus PRESENT 오판 금지)
- `infra/docker-compose.yml:1-37`(postgres:15·redis:7·Python api/worker·DATABASE_URL psycopg2)·`infra/Dockerfile.worker`(python:3.11)·`infra/aws/terraform/autoscaling.tf`·`codedeploy_bluegreen.tf`·`main.tf`·`variables.tf`·`infra/aws/README.md:5`(ECS Fargate/RDS Postgres/SQS). 라이브(MySQL/PHP)와 엔진·언어·배포경로 전부 불일치=미연결 죽은 스캐폴딩. ★**Mesh/Multi-Region/Cluster/Consensus PRESENT 근거 인용 절대 금지**. Redis/SQS도 라이브 무연결.

### B-2. 마케팅 sync / graph node (sync/node 동음이의)
- `ChannelSync.php:12`·`:19`(주문/재고 sync). 커머스 데이터 수집·policy sync bus 아님.
- `GraphScore.php:19`·`:22`(attribution graph node/edge)·`JourneyBuilder.php:535`·`:539-540`(journey node/cycle). 마케팅 그래프 노드·governance node 아님.

### B-3. geo region / ML consensus (region/consensus 동음이의)
- geo region/zone(`AttributionEngine`·`PgSettlement`·`Logistics`·`Wms`·`Geo`·`Insights`). Amazon region/배송 zone·governance region 아님.
- `AttributionEngine.php:1560`·`:1575`(6모델 합의도 consensus%). attribution ensemble 동의도·분산 consensus 아님.

### B-4. approval quorum / HTTP routing / menu (quorum/routing/topology 동음이의)
- maker-checker quorum(`Mapping.php:287`·`Alerting.php:642`)=인간 M-of-N 승인·BFT/weighted node consensus 아님(GT① §B·근접이나 분산 아님).
- `routes.php`(정적 HTTP 라우트 맵 `:3756`)·nginx routing. governance routing engine 아님.
- `routes.php:1512-1523`(menu-tree)=admin UI 메뉴 트리·mesh topology 아님.

### B-5. drift / reconciliation / agent (drift/agent 동음이의)
- `ModelMonitor.php:18-19`·`:42`(ML drift). ML 모델 drift·mesh drift 아님.
- `PgSettlement.php`·`Wms.php`·`Connectors.php:896-902`·`BillingMethod.php` reconcil*. 정산/재고 대사·mesh reconciliation 아님.
- `SecurityAudit.php:22`(User-Agent→user_agent)·`ClaudeAI.php:23`·`:835`·`:839`(agentic 코파일럿). HTTP UA·AI 에이전트·governance agent 아님.
- SSE(`PM/Events.php:50`·`LiveCommerce.php:1205` text/event-stream). 브라우저 SSE·policy sync bus 아님.

## 5. 종합

**Universal Governance Mesh = ABSENT-greenfield(Governance Registry·Mesh Controller·Topology Manager·Distributed Policy Distribution(remote)·Regional Node·Local Agent·Policy Sync Bus·Global Trust Fabric·Universal Context Exchange(cross-node)·Cross-Domain Coordination·Mesh Health/Recovery/Consensus(BFT)·Governance Routing·Federation Gateway·Snapshot/Evidence/Digest/Analytics/Drift/Revalidation/Reconciliation·Guard/Lint 순신규) / PARTIAL(AdminPlans 미러·maker-checker quorum·SecurityAudit evidence·index.php context·local PDP/PEP·SystemMetrics health·SSO/agency local trust) / DEAD-infra(terraform/ECS/Postgres/Redis).** 재활용(흡수 아님·확장): AdminPlans 미러→Policy Distribution·maker-checker→Consensus(approval)·SecurityAudit→Mesh Evidence·index.php→Context Exchange·PDP/PEP→Regional Node/Local Agent·SystemMetrics→Health·SSO/agency→Trust. **★KEEP_SEPARATE=죽은 terraform/k8s/Postgres/Redis(Mesh/Multi-Region/Consensus PRESENT 금지)·마케팅 ChannelSync sync·GraphScore/JourneyBuilder node·geo region/zone·ML consensus(AttributionEngine)·approval quorum(≠BFT)·HTTP routing·menu-tree·ModelMonitor drift·정산 reconciliation·user-agent/AI-agent·SSE.** authz mesh≠죽은 infra/마케팅 sync·node/geo region/ML consensus/approval quorum/HTTP routing/menu/agent.
