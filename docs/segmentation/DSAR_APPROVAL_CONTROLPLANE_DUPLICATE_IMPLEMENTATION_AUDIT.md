# DSAR — Authorization Control Plane: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`.
> (A) control-plane 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 동음이의(마케팅 orchestration·ML deploy·code deploy·커머스 cron·죽은 terraform).

---

## 1. 핵심 판정 — **control plane 골격 전면 부재, 라이브 authz=단일 모놀리스**

`control_plane|orchestrator|coordinator|service discovery|feature_flag|rollout|canary|blue-green|policy_publish` **authz 매치 0건**. control plane 골격은 그린필드. "orchestrator" 유일 히트=`deploy.ps1:1` 빌드 오케스트레이터(frontend). "killswitch"=광고 캠페인 pause(`AutoCampaign.php:473`·`ClaudeAI.php:953`)·"reconcil*"=재무/재고(§B)·"drift"=ML(`ModelMonitor.php`). 라이브 authz=inline PHP/MySQL 모놀리스(`index.php:69-88`).

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Control Plane Registry / Global Orchestrator(authz) | **ABSENT(grep 0)** | orchestrator=`deploy.ps1:1` 빌드용·authz 전무 |
| Authorization Scheduler(policy activation/expiration/JIT cleanup/cert rotation) | **ABSENT(grep 0)** | authz 스케줄 cron 없음·`alerts_cron.php:43`·`:48` alert_policy=모니터링(authz 아님) |
| Policy Publisher(draft/review/approve/publish/canary/blue-green/rollback·authz) | **ABSENT(grep 0)** | 선례=FeedTemplate publish(`routes.php:757`·`:764`·product)·AccessReview decision(`AccessReview.php:176-225`·request-driven)·authz policy publish 없음 |
| Configuration Distribution Engine(authz) | **ABSENT / proto** | `AdminPlans.php:53-72` 미러=product config(canary/version 없음)·authz 분배 아님 |
| Runtime/Decision Coordination(PDP/PEP/PIP/consensus) | **ABSENT(조율)** | Data-Plane PDP/PEP 실재(`TeamPermissions.php:695-701`·`index.php:69-88`)·조율 계층 없음·"PIP"=`WmsCctv.php:634-638` pipe·"PDP"=`Dsar.php` GDPR 법문 |
| Fabric/Federation/Compliance/AI Gov/Zero Trust/Multi-Region/DR Coordinator | **ABSENT(grep 0)** | coordinator/zero_trust/multi_region 전무 |
| Service Discovery(K8s/Consul/DNS/mesh) | **ABSENT(grep 0)** | 없음 |
| Configuration Registry(governed)/Version Coordinator(authz) | **ABSENT / PARTIAL** | app_setting flat KV(`Db.php:308-321`)·schema 버전(`Db.php:157-162`·`migrate.php:9-15`)만·authz governed registry 없음 |
| Rollout Manager / Rollback Manager(authz) | **ABSENT / schema만** | `migrate.php:9-15` --rollback=schema만·authz config rollout/rollback 없음·code deploy(`deploy.sh`)만 |
| Feature Flag Manager / kill switch(authz) | **ABSENT(grep 0)** | per-entity toggle 라우트만·flag 플랫폼 없음·killswitch=광고(`AutoCampaign.php:473`·`:602`) |
| Control Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation | **ABSENT** | reconcil*=재무/재고(§B)·drift=ML·authz control 전무 |
| Runtime Guard / Static Lint | **ABSENT(grep 0)** | control plane 가드·lint 없음 |
| Immutable Evidence | **PRESENT** | SecurityAudit 해시체인(`SecurityAudit.php:14-64`) |
| Tenant Isolation | **PRESENT** | `index.php:610` |
| Data-Plane PDP/PEP | **PRESENT** | `TeamPermissions.php:695-701`·`index.php:69-88` |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 확장)

1. **app_setting KV** — `Db.php:308-321`. Config Registry(§17) governed 확장.
2. **AdminPlans 미러** — `AdminPlans.php:53-72`. Config Distribution(§6) proto(product→authz 신설).
3. **SecurityAudit 해시체인** — `SecurityAudit.php:14-64`. Control Evidence(§23)·Immutable Deployment History(§35).
4. **migrate --rollback** — `migrate.php:9-15`. Rollback(§20·schema→authz 확장).
5. **FeedTemplate publish/AccessReview decision** — `routes.php:757`·`AccessReview.php:176-225`. Publisher(§5) 선례.
6. **TeamPermissions/index.php** — `TeamPermissions.php:695-701`·`index.php:69-88`. Runtime Coordination(§7) 대상.

## 4. ★KEEP_SEPARATE — authz control plane 아님 (마케팅·ML·code deploy·cron·죽은 infra)

### B-1. 마케팅 캠페인/여정 orchestration (orchestration 동음이의)
- `AutoCampaign.php:17`·`:45`·`:473`·`:602`(auto_campaign·guardrail/killswitch=광고 pause). 캠페인 자동화·authz control plane 아님.
- `JourneyBuilder.php:14`(journeys·runDue resume 스케줄러). 고객여정 orchestration.
- `Decisioning.php:12`·`:307`(decisioning score=performance×audience). 마케팅 결정.
- `RuleEngine.php:12`·`:20`·`:24`(generic IF-THEN 마케팅). authz policy publish 아님.

### B-2. ML 모델 배포/드리프트 (Model Deployment/drift 동음이의)
- `ModelMonitor.php:17-19`·`:21`·`:42-44`(retrain/drift-report/drift-check·ml_models/drift_score/auto_retrain). ML ops·authz config rollout/drift 아님.

### B-3. CODE 배포 (deploy 동음이의 — authz config rollout 아님)
- `deploy.ps1:1-39`·`:1`·`:3`(빌드 오케스트레이터·frontend dist)·`deploy.sh:1-21`·`:6`·`:18`(rsync dist)·`.github/workflows/deploy.yml:77-160`·`:80`·`:101-113`·`:112`·`:115-124`(SCP dist·nginx reload·master push). CODE/asset deploy·authz 정책 rollout 아님.

### B-4. 커머스/데이터/메시징 cron (scheduler 동음이의 — authz scheduler 아님)
- `commerce_sync_cron.php`·`stock_sync_cron.php`·`data_export_cron.php`·`media_gc_cron.php`·`rule_engine_cron.php`·`journey_cron.php`·`oauth_refresh_cron.php`·`sms_queue_cron.php`·`email_queue_cron.php`·`kakao_queue_cron.php`·`alerts_cron.php:43`·`:48`. 커머스/데이터/메시징 스케줄·authz JIT/policy 스케줄러 아님.

### B-5. 재무/재고 reconciliation (reconciliation 동음이의)
- `PgSettlement.php:215`·`:295`·`Connectors.php:902`(ROAS)·`Wms.php:2160`·`KrChannel.php:419`·`BillingMethod.php:551`. 정산/재고 대사·authz control reconciliation 아님.

### B-6. ★죽은 terraform/ECS 스택 (blue-green/autoscaling — 라이브 무연결·PRESENT 금지)
- `infra/aws/terraform/codedeploy_bluegreen.tf:2-8`(enable_blue_green default-off·`variables.tf:94-95`)·`autoscaling.tf`·`infra/docker-compose.yml`·azure bicep. 라이브(단일 호스트 `deploy.sh:6` 1.201.177.46)와 무연결 죽은 스캐폴딩. ★**Control Plane/Multi-Region/Rollout PRESENT 근거 인용 절대 금지**(legacy 아카이브 동류).

### B-7. 도메인 config (config 동음이의)
- `EnterpriseAuth.php:43`·`:49`·`:51`(sso_config)·ai_settings·channel config·siem config. 도메인 설정·governed authz config registry 아님.

## 5. 종합

**Authorization Control Plane = ABSENT 골격(Control Plane Registry·Global Orchestrator·Authorization Scheduler·Policy Publisher·Config Distribution(authz)·Runtime/Decision Coordination·Fabric/Federation/Compliance/AI Gov/Zero Trust/Multi-Region/DR Coordinator·Service Discovery·Config Registry(governed)·Version Coordinator(authz)·Rollout/Rollback Manager(authz)·Feature Flag Manager·Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Runtime Guard/Static Lint 순신규) / PARTIAL(app_setting KV·AdminPlans 미러·SecurityAudit evidence·Health deploy 마커·schema 버전/롤백) / PRESENT-dataplane(TeamPermissions PDP·index.php PEP).** 재활용(흡수 아님·확장): app_setting→governed Config Registry·AdminPlans 미러→Config Distribution proto·SecurityAudit→Control Evidence·migrate --rollback→Rollback(schema→authz)·FeedTemplate/AccessReview→Publisher 선례·PDP/PEP→Runtime Coordination 대상. **★KEEP_SEPARATE=마케팅 orchestration(AutoCampaign/JourneyBuilder/Decisioning/RuleEngine)·ML deploy(ModelMonitor)·code deploy(deploy.*)·커머스/메시징 cron·재무 reconciliation·죽은 terraform(blue-green/autoscaling PRESENT 금지)·도메인 config(sso_config 등).** authz control plane≠마케팅/ML/code deploy/커머스 cron/미연결 인프라.
