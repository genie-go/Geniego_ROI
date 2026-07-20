# DSAR — Unified Authorization Fabric: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`.
> (A) 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 동음이의(커머스 sync·죽은 terraform·false positive).

---

## 1. 핵심 판정 — **fabric 골격 전면 부재, 라이브 authz=단일 모놀리스**

`control.plane|data.plane|multi.region|service.mesh|istio|envoy|split.brain|policy.distribution|fabric.sync` **라이브 authz 매치 0건**. Fabric 골격은 그린필드. 유일 실체=멀티테넌트 격리(GT① §A). "fabric" grep 히트는 전부 **"fabricated numbers"**(`ClaudeAI.php:3691` LLM 프롬프트)·false positive.

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Authorization Fabric Registry / Control Plane / Data Plane 분리 | **ABSENT** | in-process PEP(`index.php:69-622`)+PDP(`TeamPermissions.php:695-701`) 동일 프로세스. stateless control plane·정책 배포 채널 없음 |
| Global Policy Distribution(versioned/canary/blue-green/rollback) | **ABSENT(라이브)** | 라이브 authz 정책 버전/카나리/롤백 전무. blue-green은 죽은 terraform(§5·default false·미완성) |
| Distributed Decision Engine(regional/federated/offline) | **ABSENT** | 단일노드 in-process 결정만. 분산/연합/오프라인 결정 substrate 없음 |
| Multi-Region / Multi-Cloud / Hybrid | **ABSENT** | 단일 호스트(`Db.php:120`)·단일 리전. terraform도 단일 리전(§5) |
| Service Mesh(Istio/Linkerd/Kuma/Envoy) | **ABSENT(grep 0)** | mesh 실 config 0. sidecar/gateway authz 없음 |
| Cross-Cluster Sync / Global Policy Federation | **ABSENT** | 노드간 정책/역할/권한 동기화 없음. sibling 미러(`AdminPlans.php:53-72`)는 product-config만 |
| Global Context Distribution | **ABSENT** | policy/identity/trust/risk context 노드간 배포 없음. 요청단위 in-process 주입(`index.php`) |
| Global Decision Cache(version-aware) | **ABSENT** | 인가 결정 캐시 전무(attribution_model_cache=마케팅 KEEP_SEPARATE) |
| Fabric Sync/Health(fabric)/Routing/Failover/Consistency | **ABSENT** | 노드간 sync·리전/geo routing·PDP/region failover·split-brain·강한/최종 일관성 없음. SystemMetrics(`:60-100`)=단일노드 헬스 |
| Fabric Snapshot/Evidence(native)/Digest/Analytics/Drift/Simulation | **ABSENT / PARTIAL** | SecurityAudit(`SecurityAudit.php:4-33`) 재활용 참고(fabric-native 아님). authz fabric 전용 전무 |
| Runtime Guard(split-brain/cache poisoning)/Static Lint(missing region replication) | **ABSENT** | fabric 가드·lint 전무 |
| Tenant Isolation | **PRESENT** | `index.php:614-619` 은행급 fail-closed(유일 실체) |
| Policy Distribution(proto) | **PARTIAL** | `AdminPlans.php:53-72` sibling 미러(product-config·버전/롤백 없음) |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 확장)

1. **멀티테넌트 격리** — `index.php:614-619`. Fabric multi-tenant isolation 유일 실체(재발명 금지·KEEP).
2. **sibling 미러** — `AdminPlans.php:53-72`. Policy Distribution의 proto(버전/카나리/롤백 신설 필요).
3. **in-process PEP+PDP** — `index.php:69-622`·`TeamPermissions.php:695-701`. Control/Data plane 분리 대상.
4. **단일노드 헬스** — `SystemMetrics.php:60-100`·`Health.php:13-26`. Fabric Health 확장 baseline.
5. **SecurityAudit** — `SecurityAudit.php:4-33`. Fabric Evidence 참고(노드간 배포증거 신설).
6. **배포 프로세스** — `deploy.ps1`·`deploy.sh`·`deploy.yml`. 정책 배포 파이프라인 확장 대상.

## 4. ★KEEP_SEPARATE — authz fabric 아님 (커머스 sync·데이터 export·false positive)

### B-1. 커머스 다채널 sync (sync 동음이의 — authz 아님)
- `ChannelSync.php:12-25`(네이버/쿠팡/Shopee 주문/재고 sync·`index.php:281-284` bypass·`Db.php:414-427` channel_orders). 커머스 데이터 sync이지 authz 정책/권한 동기화 아님.
- `commerce_sync_cron.php`·`stock_sync_cron.php`·connector sync(`Db.php:469-517` connector_health/config). authz fabric sync 아님.

### B-2. 데이터 export 클라우드 목적지 (multi-cloud 동음이의 — authz 아님)
- `DataExport.php:11`·`:26`·`:131-133`·`:154-156`+`bin/data_export_cron.php`(BigQuery/Snowflake/S3/Sheets/HTTP). 클라우드 자격증명은 **데이터 export 대상**이지 authz 정책 분배·multi-cloud authz 아님.

### B-3. 계산결과 캐시·스로틀 (cache 동음이의 — authz 아님)
- `AttributionEngine.php:1754-1791`(attribution_model_cache=어트리뷰션 계산결과 캐시)·api rate_limit(엔드포인트 스로틀). authz decision cache 아님.

### B-4. ★죽은 terraform/ECS 스택 (blue-green/autoscaling/multi-az — 라이브 무연결·PRESENT 오판 금지)
- `infra/aws/terraform/*`(Postgres `main.tf:185`·Python `:306`·`/v379/health` `:395`·ALB+ECS `:378`·`:418`)+`infra/docker-compose.yml:2-37`. 라이브(MySQL/PHP v419-431)와 **엔진·언어·리전·배포경로 전부 불일치=미연결 죽은 스캐폴딩**. blue-green(`codedeploy_bluegreen.tf:7-61`·default false `:8`·미완성 `:49-50`)·autoscaling(`autoscaling.tf:2-38`·`:6`)·db_multi_az(`main.tf:194` 단일리전 HA)는 여기 국한. ★**라이브 authz fabric의 Control Plane/Distribution/Multi-Region PRESENT 근거로 인용 절대 금지**(오판 방지·legacy_v338_pkg 마이크로서비스 아카이브와 동류).

### B-5. false positive
- `fabric` grep 히트=전부 "fabricated numbers"(`ClaudeAI.php:3691` LLM 프롬프트)·`Mapping.php`. authz fabric 아님. `consistency/snapshot/drift` 히트=ModelMonitor/PriceOpt/AbTesting/AutoCampaign(ML/가격/실험).

## 5. 종합

**Fabric 거버넌스 = ABSENT 골격(Control/Data Plane 분리·Global Distribution·Distributed Decision·Multi-Region/Cloud/Hybrid·Service Mesh·Cross-Cluster Sync·Global Context Distribution·Decision Cache·Fabric Sync/Health/Routing/Failover/Consistency·Snapshot/Evidence/Digest/Analytics/Drift/Simulation·Guard/Lint 순신규) / PARTIAL(멀티테넌트 격리·sibling 미러·단일노드 헬스·배포) / KEEP_SEPARATE(커머스 sync·데이터 export·계산캐시·죽은 terraform).** 재활용(흡수 아님·확장): 멀티테넌트 격리(유일 실체)·sibling 미러(proto distribution)·in-process PEP+PDP(분리 대상)·단일노드 헬스·SecurityAudit·배포 프로세스. **★KEEP_SEPARATE=ChannelSync/커머스 sync·DataExport 클라우드 목적지·attribution 캐시·죽은 terraform/ECS 스택(blue-green/autoscaling PRESENT 오판 금지)·"fabricated" false positive.** authz fabric≠커머스 sync/데이터 export/미연결 인프라 스캐폴딩.
