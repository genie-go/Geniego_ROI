# DSAR — Authorization Control Plane: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> 본 문서는 Part 3-19 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`backend/bin/`·`backend/src/routes.php`·`deploy.*`·`.github/workflows/`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: app_setting/AdminPlans/SecurityAudit/Health/migrate/TeamPermissions/deploy 정독 + control_plane/orchestrator/scheduler/rollout/feature_flag grep. 2 Explore 스레드(55 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**Authorization Control Plane은 부재(grep 0)다.** 실재는 (a) flat 전역 KV(app_setting)·(b) product-config prod↔demo 미러·(c) CODE/asset deploy 파이프라인·(d) live-compute Data-Plane PDP/PEP·(e) SecurityAudit evidence 체인·(f) schema-only 버전/롤백뿐. Control Plane과 Data Plane이 **미분리**(단일 PHP/MySQL Slim 모놀리스·`composer.json:2-12`·`index.php:23`·`Db.php:18`).

- **★Config Registry(§17) PARTIAL = app_setting**(`Db.php:308-321`·flat skey/svalue·version/owner/approval 없음).
- **★Config Distribution(§6) proto = AdminPlans::mirrorPlanTablesToSibling**(`AdminPlans.php:53-72`·product plan config·authz 정책 아님·canary/ack/version 없음).
- **★Evidence(§23) PRESENT = SecurityAudit 해시체인**(`SecurityAudit.php:14-64`). Immutable Deployment History(§35)는 부재.
- **★Data-Plane PDP/PEP(§7) PRESENT = TeamPermissions/index.php**(`TeamPermissions.php:695-701`·`index.php:69-88`). Control-Plane 조율은 부재.
- **★Version/Rollback PARTIAL = migrate.php --rollback**(`migrate.php:9-15`·schema만·authz 정책 버전 아님).
- **★KEEP_SEPARATE**: 마케팅 orchestration(AutoCampaign/JourneyBuilder)·ML deploy(ModelMonitor)·code deploy(deploy.*)·커머스 cron·죽은 terraform(GT②).

## 2. 실존 substrate 카탈로그

### A. Config Registry / KV (PARTIAL — flat KV·§17 registry 아님)

| 파일:라인 | 심볼 | 설명 | Part3-19 매핑 |
|---|---|---|---|
| `Db.php:308-321` · `:315` · `:317` · `:444-445` | ensureAppSetting(app_setting skey/svalue/updated_at·MySQL/SQLite) | flat 전역 KV(version/owner/approval 없음) | Config Registry(§17·PARTIAL) |
| `WorkspaceState.php:9` | app_setting=전역·tenant 없음·cred_enc_key/admin_access_key_hash 시스템설정 | 시스템 시크릿/플래그 KV | Config Registry 의미 |
| `routes.php:127-129` · `:171-173` · `:502-503` · `:1582-1583` | 도메인-로컬 settings upsert(MFA policy 등) | 단일행 upsert(비버전) | Config(비거버넌스) |

### B. Config Distribution proto (PARTIAL — product-config 미러·authz 아님)

| 파일:라인 | 심볼 | 설명 | Part3-19 매핑 |
|---|---|---|---|
| `AdminPlans.php:53-72` · `:56-58` · `:56-62` | mirrorPlanTablesToSibling(plan_config/plan_period_pricing/plan_menu_access DELETE+INSERT·형제 스키마·idempotent·MySQL only·형제 부재 시 no-op) | product config prod→demo 미러(canary/ack/version 없음) | Config Distribution(§6·proto·authz 정책 아님) |
| `AdminPlans.php:157` · `:180` · `:209` · `:539` · `:717` | 미러 호출부 | 저장 시 반영 | Distribution 호출 |
| `AdminPlans.php:76` · `:163` | requirePlan('admin') 게이트 | 권한 | — |

### C. Evidence / Immutable (PARTIAL — SecurityAudit PRESENT·deploy history 부재)

| 파일:라인 | 심볼 | 설명 | Part3-19 매핑 |
|---|---|---|---|
| `SecurityAudit.php:14` · `:14-31` · `:27` · `:29-31` · `:35-38` · `:43-51` · `:56` · `:56-64` | 해시체인 log(sha256 prev\|tenant\|actor\|action\|details\|now)·lastHash·verify(tamper) | append-only evidence | Control Evidence(§23·PRESENT) |
| `Health.php:56-67` · `:102-103` | deployMarker(composer.lock mtime→last_deploy)·schema_migrations 최신 | 배포 마커 | Deploy 마커(§35·PARTIAL·authz deploy history 아님) |

### D. Version / Rollback (PARTIAL — schema만·authz 정책 아님)

| 파일:라인 | 심볼 | 설명 | Part3-19 매핑 |
|---|---|---|---|
| `Db.php:157` · `:157-162` · `:159` | v426 마이그레이션 락(genie_roi_v426_migrated_{name}.lock·v424→v425→v426) | schema 버전 락 | Version Coordinator(§18·schema만) |
| `migrate.php:9-15` · `:10` · `:48` | --rollback[=N](-- @rollback SQL·schema_migrations 삭제)·filename/applied_at/checksum | schema 마이그레이션 롤백 | Rollback Manager(§20·schema만·authz 정책 아님) |

### E. Data-Plane PDP/PEP (PRESENT — live-compute·Control-Plane 조율 부재)

| 파일:라인 | 심볼 | 설명 | Part3-19 매핑 |
|---|---|---|---|
| `TeamPermissions.php:33` · `:120` · `:122-124` · `:132` · `:202` · `:236` · `:286` · `:599` · `:695-701` · `:704-712` | effectivePermissions(PDP·live effectiveForUser 재계산·캐시/버전 없음)·assignablePermissions(위임상한)·fail-closed least-privilege·subjectPerms/effectiveScope/scopeSql | Data-Plane 결정(요청마다 app_user 재계산) | Runtime Coordination 대상(§7·PDP) |
| `index.php:23` · `:45` · `:68-80` · `:69-88` · `:426-438` · `:610` | 단일 Slim front controller·CORS·guardTeamWrite 전역 write 가드(403 TEAM_READ_ONLY·inlined RBAC)·api_key 주입 | Data-Plane 집행(PEP) | Runtime Coordination 대상(§7·PEP) |
| `composer.json:2-12` · `Db.php:18` · `:20-21` · `:27` | 단일 프로젝트(Slim+illuminate/db+monolog)·단일 MySQL PDO 싱글톤 | 모놀리스 확정(Control/Data Plane 미분리) | 단일노드 |

### F. Publish/Decision Precedent (재사용 참고 — product/access·authz control plane 아님)

| 파일:라인 | 심볼 | 설명 | Part3-19 매핑 |
|---|---|---|---|
| `routes.php:757` · `:764` | FeedTemplate versions·drafts/{id}/publish | draft→publish 라이프사이클 선례(product catalog config) | Policy Publisher(§5·선례·authz 아님) |
| `AccessReview.php:176-225` · `:188` · `:225` | decision(approve\|revoke·SecurityAudit::log 증거) | 승인/증거 선례(request-driven·비스케줄) | Scheduler(§4)·Publisher(§5) 선례 |
| `EnterpriseAuth.php:24` · `:43` · `:49` · `:51` | SSO(OIDC/SAML)+SCIM·sso_config | 도메인 config(authz config registry 아님) | KEEP-adjacent |

## 3. 종합 판정

**Authorization Control Plane = ABSENT-controlplane(단일 모놀리스·Control/Data Plane 미분리) / PARTIAL(app_setting KV·AdminPlans 미러·SecurityAudit evidence·Health deploy 마커·schema 버전/롤백) / PRESENT-dataplane(TeamPermissions PDP·index.php PEP) / ABSENT(Control Plane Registry·Global Orchestrator·Authorization Scheduler·Policy Publisher·Config Distribution Engine(authz)·Runtime/Decision Coordination·Fabric/Federation/Compliance/AI Gov/Zero Trust/Multi-Region/DR Coordinator·Service Discovery·Config Registry(governed)·Version Coordinator(authz)·Rollout Manager·Rollback Manager(authz)·Feature Flag Manager·Control Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Runtime Guard/Static Lint 순신규).** 재활용(흡수 아님·확장): app_setting→governed Config Registry·AdminPlans 미러→Config Distribution proto·SecurityAudit→Control Evidence/Immutable Deployment History·migrate --rollback→Rollback(schema→authz 확장)·FeedTemplate publish/AccessReview decision→Publisher 선례·TeamPermissions/index.php→Runtime Coordination 대상. ★마케팅 orchestration·ML deploy·code deploy·커머스 cron·죽은 terraform(GT②)은 **흡수·오판 금지**.
