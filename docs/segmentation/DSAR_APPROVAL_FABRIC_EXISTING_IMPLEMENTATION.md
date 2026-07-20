# DSAR — Unified Authorization Fabric: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> 본 문서는 Part 3-16 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`deploy.*`·`.github/workflows/`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: control.plane/data.plane/region/cluster/mesh/istio/envoy/failover/split.brain/consistency/distribution/sync 다중 grep + 배포 코어(Db/index.php/deploy/AdminPlans/SystemMetrics) 정독. 2 Explore 스레드(45 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**라이브 Unified Authorization Fabric = 단일 PHP/MySQL 모놀리스(in-process PEP+PDP)다.** Control/Data Plane 분리·정책 배포(versioned/canary/blue-green/rollback)·Multi-Region·Multi-Cloud·Service Mesh·Distributed Decision·Fabric Sync/Failover/Consistency·Decision Cache·Global Context Distribution 전부 부재(ABSENT).

- **★유일 실 substrate = 멀티테넌트 격리**(`index.php:614-619`·은행급 fail-closed). Fabric multi-tenant isolation의 유일 실체(재발명 금지·KEEP).
- **★유일 PARTIAL 정책배포 유사물 = `AdminPlans::mirrorPlanTablesToSibling`**(운영↔데모 product-config 풀테이블 미러·버전/카나리/롤백 없음·authz 정책엔진 아님).
- **★2스택 주의**: `infra/aws/terraform/*`(Postgres/ECS/Python·blue-green/autoscaling)는 **라이브(MySQL/PHP)와 무연결 죽은 스캐폴딩** — PRESENT 근거로 인용 금지(GT② §5).
- 실 엔진은 단일노드 PEP+PDP를 Control/Data plane으로 분리하고 fabric 층(distribution/sync/failover/consistency)을 **신설(Extend)** 한다.

## 2. 실존 substrate 카탈로그

### A. 멀티테넌트 격리 (Fabric 유일 실체 — PRESENT·은행급)

| 파일:라인 | 심볼 | 설명 | Part3-16 매핑 |
|---|---|---|---|
| `backend/public/index.php:614-619` · `:619` | X-Tenant-Id 서버도출 강제 | 인증키 tenant_id로 **무조건 덮어쓰기**(위조 원천차단·188차 P0) | Tenant Isolation(§31)·유일 실체 |
| `backend/public/index.php:608-612` · `:600-606` · `:604-605` | auth_tenant 주입·strict 무-테넌트 fail-closed 403 | 서버도출·모호 시 deny | Cross-Tenant Validation |
| `backend/public/index.php:423-461` · `:448-461` · `:99-122` · `:116-121` | 세션→auth_tenant 권위주입·agency 링크 tenant 서버바인딩 | 다경로 tenant 격리 | Tenant Isolation |

### B. 배포 토폴로지 (단일 모놀리스 확정 — PRESENT)

| 파일:라인 | 심볼 | 설명 | Part3-16 매핑 |
|---|---|---|---|
| `backend/src/Db.php:63-87` · `:116-166` · `:127` · `:120` | MySQL PDO 싱글톤(prod/demo 2스키마·동일 호스트 127.0.0.1) | 단일 DB 노드 | Data Plane(단일노드) |
| `backend/public/index.php:23` · `:686` | 단일 Slim `$app`·`$app->run()` | 단일 진입 프로세스 | 단일노드 |
| `backend/composer.json:5-13` | Slim·PDO·illuminate/db·monolog(클러스터/큐/mesh 의존 전무) | 모놀리스 확정 | — |

### C. Control Plane / Data Plane (미분리 — in-process PEP+PDP·ABSENT 분리)

| 파일:라인 | 심볼 | 설명 | Part3-16 매핑 |
|---|---|---|---|
| `backend/public/index.php:69-622` · `:573` · `:583-598` | 인증/RBAC 미들웨어(PEP)·랭크·스코프 게이트 | 정책 집행(단일노드) | Data Plane(§4)·PEP |
| `backend/src/Handlers/TeamPermissions.php:695-701` | `effectivePermissions`→`effectiveForUser` | 정책 결정(PDP) | Control/Data 미분리(§3·§4) |

★정책 집행(PEP)과 결정(PDP)이 **같은 PHP 요청 프로세스 in-process** — stateless control plane·정책 배포 채널·PAP/PIP 분리 없음.

### D. 정책 배포 유사물 (product-config 미러 — PARTIAL)

| 파일:라인 | 심볼 | 설명 | Part3-16 매핑 |
|---|---|---|---|
| `backend/src/Handlers/AdminPlans.php:53-72` · `:64-70` · `:68` | `mirrorPlanTablesToSibling`(형제 스키마 풀테이블 DELETE+INSERT 미러·테이블별 try/catch best-effort) | plan_config/plan_period_pricing/plan_menu_access 전파(버전/카나리/롤백 없음) | Policy Distribution(§5·proto·authz 정책엔진 아님) |
| `backend/src/Handlers/AdminPlans.php:157` · `:180` · `:209` · `:539` · `:717` | 미러 호출부 | 저장 시 형제 반영 | Distribution 호출 |

### E. 단일노드 헬스·배포 (PRESENT·fabric health 아님)

| 파일:라인 | 심볼 | 설명 | Part3-16 매핑 |
|---|---|---|---|
| `backend/src/Handlers/SystemMetrics.php:32` · `:60-100` · `:67-76` | 단일노드 인프라 헬스(db/php/opcache/apcu/disk/tenants/migrations self probe) | 리전/클러스터/geo routing 없음 | Fabric Health(§14·단일노드만) |
| `backend/src/Handlers/Health.php:13-26` · `:14-24` | 단일노드 헬스(DB ping·PHP·deploy marker·migrations) | 단일노드 | Health(단일노드) |
| `deploy.ps1:1-39` · `:3-8` · `:38` · `deploy.sh:1-21` · `:5-7` · `:18` | 빌드 전용·rsync 단일호스트(수동 pscp) | 코드 배포(정책 배포 파이프라인 없음) | 배포 프로세스 |
| `.github/workflows/deploy.yml:77-159` · `:6-7` · `:102` · `:112` · `:116` · `:124` | CI(SCP/SSH inert·시크릿 미등록)·master push→단일 docroot+nginx reload | 코드 배포만 | 배포(inert CI) |

### F. Fabric Evidence 재활용 참고 (SecurityAudit·PARTIAL·fabric-native 아님)

| 파일:라인 | 심볼 | 설명 | Part3-16 매핑 |
|---|---|---|---|
| `backend/src/SecurityAudit.php:4-33` · `:8` · `:27` · `:35-40` | tamper-evident 해시체인(prev_hash→hash_chain append-only) | 단일노드 감사(노드간 동기화·배포증거 없음) | Fabric Evidence(§20·재활용 참고만) |

## 3. 종합 판정

**Unified Authorization Fabric = ABSENT-fabric(단일노드 모놀리스) / PARTIAL-substrate(멀티테넌트 격리·sibling 미러·단일노드 헬스·배포) / KEEP_SEPARATE(커머스 sync·죽은 terraform).** Authorization Fabric Registry·Control/Data Plane 분리·Global Policy Distribution(versioned/canary/blue-green/rollback)·Distributed Decision·Multi-Region·Multi-Cloud·Hybrid·Service Mesh·Cross-Cluster Sync·Global Policy Federation·Global Context Distribution·Global Decision Cache·Fabric Sync/Health(fabric)/Routing/Failover/Consistency·Fabric Snapshot/Evidence(native)/Digest/Analytics/Drift/Simulation·Runtime Guard(split-brain)/Static Lint 전부 순신규. 재활용: 멀티테넌트 격리(§A·KEEP)·AdminPlans sibling 미러(§D·proto distribution)·in-process PEP+PDP(§C·분리 대상)·단일노드 헬스(§E·fabric health 확장 baseline)·SecurityAudit(§F·evidence 참고). 실 엔진은 단일노드 in-process를 Control/Data plane으로 분리하고 fabric 층을 신설(Extend). 커머스 sync·죽은 terraform(GT②)은 **흡수·오판 금지**.
