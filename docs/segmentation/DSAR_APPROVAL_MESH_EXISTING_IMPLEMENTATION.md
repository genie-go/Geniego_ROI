# DSAR — Authorization Universal Governance Mesh: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> 본 문서는 Part 3-24 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`backend/composer.json`·`infra/`·`deploy.*`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: AdminPlans/Db/Alerting/Mapping/SecurityAudit/EnterpriseAuth/AgencyPortal/TeamPermissions/SystemMetrics 정독 + mesh/node/region/cluster/consensus/topology/routing/istio grep. 2 Explore 스레드(54 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**authz Universal Governance Mesh(mesh registry·controller·topology·distributed policy distribution·regional node/agent·policy sync bus·trust fabric·consensus/health/recovery·routing/federation gateway)는 전면 부재(그린필드·grep 0)다.** 라이브 stack=단일 PHP 8.1 Slim + MySQL PDO 모놀리스(`Db.php:9`·`composer.json:6-13`)·**메시지버스/Kafka/k8s/service-mesh(Istio/Envoy)/분산 consensus 전무**. 단일서버 proto-primitive만 존재. ★죽은 terraform/ECS/Postgres/Redis 스캐폴딩(`infra/`)은 라이브 무연결·PRESENT 오판 금지.

- **★§6 Policy Distribution proto = AdminPlans 미러**(`AdminPlans.php:53-72`·push-only 동일서버 크로스스키마 복사·delta/conflict 없음).
- **★§15 Consensus PARTIAL = maker-checker quorum**(`Alerting.php:644-650`·`Mapping.php:287`·인간 M-of-N 승인·BFT/분산 consensus 아님).
- **★§19 Evidence PARTIAL = SecurityAudit**(`SecurityAudit.php:27`·`:63-64`·해시체인·topology/sync history 없음).
- **★§11 Context Exchange PARTIAL = index.php 주입**(`index.php:116-121`·요청단위 in-process).
- **★§7/§8 Local PDP/PEP = TeamPermissions/index.php**(`TeamPermissions.php:695-700`·`index.php:69`·모놀리스 로컬).

## 2. 실존 substrate 카탈로그

### A. Policy Distribution / Multi-node (PARTIAL proto / ABSENT — 단일서버)

| 파일:라인 | 심볼 | 설명 | Part3-24 매핑 |
|---|---|---|---|
| `AdminPlans.php:53-72` · `:56` · `:58` · `:59-62` · `:66-67` · `:157` · `:180` · `:209` · `:539` · `:717` | mirrorPlanTablesToSibling(plan_config 등 push-only DELETE+INSERT·동일서버 prod↔demo·driver 가드) | product-config 미러(remote/delta/conflict 없음) | Policy Distribution(§6·proto) |
| `Db.php:9` · `:20-21` · `:27` · `:63-87` · `:120` · `:136-154` | PDO 싱글톤(prod/demo)·단일호스트 127.0.0.1·SQLite 폴백 | 단일노드(node registry/cluster/join 없음) | Topology(§5·ABSENT)·단일노드 |
| `deploy.sh:5-6` · `:19` · `composer.json:6-13` | 단일호스트 rsync·slim/php-di/illuminate/monolog(브로커/consensus/k8s 의존 전무) | 단일서버 배포 | 모놀리스 확정 |

### B. Consensus / Trust (PARTIAL — approval quorum·local trust·분산 아님)

| 파일:라인 | 심볼 | 설명 | Part3-24 매핑 |
|---|---|---|---|
| `Alerting.php:588` · `:598-657` · `:602` · `:634-640` · `:642` · `:644-650` · `Mapping.php:31` · `:238-291` · `:267` · `:269` · `:287` · `Db.php:634` | decideAction/approve(2 distinct approver·self-approval 차단·required_approvals) | 인간 maker-checker 정족수(BFT/분산 replicated state machine 아님) | Consensus(§15·PARTIAL·approval only) |
| `EnterpriseAuth.php:11` · `:20-24` · `:43-53` · `:57` · `AgencyPortal.php:20` · `:64-71` · `:86-89` | 테넌트 SSO(OIDC/SAML/SCIM)·agency_client_link(N:N 위임·scope_json·read-only default) | 로컬 테넌트/agency 신뢰(cross-region trust chain 없음) | Trust Fabric(§10·PARTIAL local) |

### C. Health / Context / Local PDP·PEP / Evidence (PARTIAL — 단일노드)

| 파일:라인 | 심볼 | 설명 | Part3-24 매핑 |
|---|---|---|---|
| `Health.php:27` · `:47` · `:56` · `:72` · `:81` · `:99` · `SystemMetrics.php:14-30` · `:16-19` · `:32` · `:36-47` · `:50-55` | check()·모듈 status/latency(단일 프로세스·미측정 null·게이트) | 단일노드 health(mesh aggregation/heartbeat/failover 없음) | Mesh Health(§13·PARTIAL) |
| `index.php:45` · `:69` · `:98` · `:116-121` · `:157-437` · `:436-437` | CORS/auth 미들웨어·auth_tenant/role/agency_id 주입·X-Tenant-Id 서버도출 | 요청단위 context 주입(cross-node exchange 아님) | Context Exchange(§11·PARTIAL)·PEP |
| `TeamPermissions.php:10` · `:41` · `:695-700` · `:704-711` · `:707` | effectivePermissions(로컬 PDP·effectiveForUser)·assignablePermissions(위임상한) | 모놀리스 로컬 결정 | Regional Node(§7)·Local Agent(§8) 대상 |
| `SecurityAudit.php:22` · `:27` · `:29-31` · `:38` · `:50` · `:51` · `:63-64` · `Db.php:434-440` | 해시체인 log(sha256 prev\|tenant\|actor\|action\|details\|now)·verify·audit_log(비체인) | tamper-evident 감사(topology/sync ledger 아님) | Mesh Evidence(§19·PARTIAL)·Immutable History(§30) |
| `routes.php:759-764` · `:1896` · `:1906` · `:1916` · `:1922` · `:3756` · `Db.php:519-527` · `Wms.php:2071` | 정적 HTTP 라우트 맵·writeback_job enqueue(DB 잡)·in-process debounce | HTTP 라우팅·DB 잡(governance routing/message bus 아님) | Routing(§16·ABSENT)·Sync Bus(§9·ABSENT) |

### D. 죽은 infra (PRESENT 오판 금지)

| 파일:라인 | 심볼 | 설명 | Part3-24 매핑 |
|---|---|---|---|
| `infra/docker-compose.yml:1-37` · `:2-3` · `:10-11` · `:19` · `:32` · `infra/aws/terraform/autoscaling.tf` · `codedeploy_bluegreen.tf` · `main.tf` · `variables.tf` · `infra/aws/README.md:5` | postgres:15/redis:7/Python api·worker·ECS/blue-green/autoscaling(라이브 MySQL/PHP와 무연결·SQS 미사용) | 죽은 스캐폴딩 | KEEP_SEPARATE(§B·PRESENT 금지) |

## 3. 종합 판정

**Universal Governance Mesh = ABSENT-greenfield(Universal Governance Registry·Mesh Controller·Topology Manager·Distributed Policy Distribution(remote)·Regional Governance Node·Local Governance Agent·Policy Sync Bus·Global Trust Fabric·Universal Context Exchange(cross-node)·Cross-Domain Coordination·Mesh Health/Recovery/Consensus(BFT)·Governance Routing·Federation Gateway·Mesh Snapshot/Evidence(native)/Digest/Analytics/Drift/Revalidation/Reconciliation·Runtime Guard/Static Lint 순신규) / PARTIAL(AdminPlans 미러 policy distribution proto·maker-checker quorum·SecurityAudit evidence·index.php context injection·local PDP/PEP·SystemMetrics health·SSO/agency local trust) / DEAD-infra(terraform/ECS/Postgres/Redis·PRESENT 금지).** 재활용(흡수 아님·확장): AdminPlans 미러→Policy Distribution·maker-checker→Consensus(approval)·SecurityAudit→Mesh Evidence·index.php→Context Exchange·TeamPermissions/index.php→Regional Node/Local Agent·SystemMetrics→Mesh Health·SSO/agency→Trust Fabric. ★죽은 terraform/k8s·마케팅 ChannelSync·GraphScore node/edge·geo region·ML consensus·HTTP routing·menu_tree·user-agent(GT②)은 **흡수·오판 금지**.
