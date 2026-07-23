# GeniegoROI Claude Code Implementation Specification

# CCIS Part024 — Multi-Tenant Architecture, Tenant Isolation & SaaS Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

멀티테넌트 아키텍처·Tenant Isolation·SaaS 표준을 수립한다.

> ★**성격(가장 강한 준수)**: 멀티테넌트는 이 저장소의 **최강 원칙**(헌법 "테넌트 격리 절대"·9원칙).
> 명세의 **Tenant First·Isolation by Design·Zero Tenant Leakage·Meter Everything·Audit Everything** 은
> **강하게 준수**한다. 실측 결과 격리는 **Row-Level(앱레벨 `WHERE tenant_id=?`·`tenant_id` 3094·
> `tenantOf` 688·`X-Tenant-Id`)** 이며(RLS/Schema/DB-level 아님), 크로스탭 격리는 **`tChannelName`(자체
> 채널) + 메시지레벨 tenant 필터(공유 채널·180차)** 두 패턴이다. ★본 차수에 **실 갭 2건(raw
> BroadcastChannel)을 발견·수정**했다(§6). Part001 §4 에 따라 실측 → 매핑 → 성문화 + 실 갭 수정.

---

## 2. 실측 — 현행 멀티테넌트 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Tenant 식별 | Subdomain/JWT/Header | **`X-Tenant-Id` 헤더(27·미들웨어 주입) + `tenantOf`(688) 해석** |
| 격리 레벨 | Row/Schema/DB-Level | ★**Row-Level 전용**(앱레벨 `WHERE tenant_id`·**3094**). RLS/Schema/DB 격리 **0**(Part009) |
| Zero Tenant Leakage | 절대 | ★**전 쿼리 tenant_id**·크로스탭=`tChannelName`+메시지 tenant 필터(180차) |
| 크로스탭 격리 | — | **① `tChannelName(base)`=`base::t=tenant`(자체 채널·Settlements/OmniChannel/OrderHub) ② 메시지 `tenant` 필터(공유 채널·GlobalDataContext handleSync 180차)** |
| Subscription | Free/Pro/Enterprise | ★**`PlanPolicy` + plan tier(free/growth/pro/enterprise·467)** |
| Billing | Stripe/Paddle | ★**Paddle/billing(973)**·`api_key`·PG 15종(비노출·289차후속) |
| Usage Metering | API/Token/Storage | ★**quota/limit(86)** — AI quota·product_limit·ad_design_limit |
| Tenant AI Config | Provider/Model/Token | ★**`ai_settings` BYO(111)** — 테넌트 자기 키(quota 비대상·Part021) |
| Tenant Config(프론트) | Branding/Locale | **`tenantStorage`/`currentTenant`(115·180차)** — 테넌트별 격리 영속 |
| Tenant Lifecycle | Provision/Suspend/Delete | **부분**(active/suspended/archived·81)·admin 콘솔 |
| ★act-as(platform_growth) | — | ★**트랩** — `gg_act_as_tenant`/`X-Act-As`(admin만·요청시점 tenant 해석에 전역상태 하이재킹 주의) |
| Tenant Backup/Restore/Migration | per-tenant | **부분** — DB 백업(수동)·per-tenant 전용 백업 부분 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Tenant First/Isolation by Design/Zero Leakage/Meter/Audit) | **★강하게 준수** | tenant_id 3094·전 쿼리 격리·quota·SecurityAudit |
| §4~§7 Architecture/식별/Resolver/Context | **★준수** | `X-Tenant-Id` 주입·`tenantOf` Resolver·tenant context(locale/plan) |
| §8~§9 Isolation/Row-Level | **★준수(Row-Level)** | 앱레벨 `WHERE tenant_id`. RLS 는 MySQL 미지원(Part009) |
| §10~§11 Schema/DB-Level 격리 | **미적용** | Row-Level 전용. 대형고객 물리격리 부재 |
| §12 Tenant Routing | **부분** | 단일 DB·GENIE_ENV(운영/데모). Region 라우팅 부재 |
| §13~§14 Subscription/Feature Flag | **★준수** | PlanPolicy·plan tier·메뉴/기능 게이팅(featurePlan) |
| §15~§16 Usage Metering/Billing | **★준수** | quota·limit·Paddle. Metering↔Billing 정합 |
| §17~§18 Tenant Config/AI Config | **★준수** | tenantStorage·ai_settings BYO(테넌트별 AI 정책) |
| §19~§21 Backup/Restore/Migration | **부분** | 수동 백업. per-tenant 전용은 부분 |
| §22 Tenant Security | **★강하게 준수** | RBAC/writeGuard/evaluatePolicy·**전 쿼리 격리**·SecurityAudit |
| §23~§24 Monitoring/Logging(tenant 포함) | **부분** | tenant별 대시보드·ai_call_log(tenant). traceId 부재(Part013) |
| §25~§26 Lifecycle/SaaS Admin | **부분 준수** | active/suspended·admin 콘솔(UserAdmin). 형식 lifecycle 부분 |
| §27 DR | **부분** | 수동 백업(Part015). Region Failover 부재 |
| §28 PHP(Tenant Middleware/Global Scope/Repository Filter) | **부분** | `X-Tenant-Id` 미들웨어·핸들러 tenantOf. Repository/Global Scope 는 없음(Part010·수동 WHERE) |
| §29 Claude(tenant_id 없는 저장/Filter 없는 조회/크로스 JOIN/Shared Cache Key 금지) | **★대체로 준수** | ★단 raw BroadcastChannel 2건=Shared Cache/Channel Key 위반(§6 수정). 크로스 JOIN 금지·격리 준수 |
| §30~§31 검증(tenant:list 등) | **대상 없음** | artisan 없음. tenant_id 격리·`make quality` |

---

## 4. 확립된 표준 (신규 멀티테넌트 코드가 따를 정본)

- ★**전 쿼리 `WHERE tenant_id = ?`**(헌법 — 테넌트 격리 절대·누락=Critical). Row-Level 앱레벨. RLS/Schema/DB 격리 신설 금지.
- **Tenant 해석 = `tenantOf($req)`/`X-Tenant-Id`**. ★**요청시점 tenant 해석에 전역 상태 금지**(act-as 하이재킹 트랩·platform_growth 는 admin 전용).
- ★**크로스탭 격리(2 패턴)**:
  1. **자체 채널** → `new BroadcastChannel(tChannelName(NAME))`(`NAME::t=tenant`·Settlements/OmniChannel/OrderHub/Reconciliation).
  2. **공유 채널**(예 `geniego-roi-global-sync`) → 메시지에 `tenant` 실어 보내고 **수신측 `if (data.tenant !== currentTenant()) return`**(GlobalDataContext handleSync·AutoMarketing·180차).
  ★**둘 중 하나는 반드시** — raw 채널명 + 무필터 = 같은 브라우저 타 테넌트(대행사·act-as) 유입.
- **Subscription/Metering**: `PlanPolicy`·plan tier·quota(BYO 키=자기비용·quota 비대상). featurePlan 게이팅.
- **Tenant Config**: `tenantStorage`/`ai_settings`(BYO). 프론트 격리 영속.
- **Security**: RBAC/writeGuard/evaluatePolicy·SecurityAudit·`ai_call_log`(tenant 귀속·289차후속 P0).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **Schema-Level/Database-Level 격리·RLS** — 안 함. Row-Level(앱 WHERE)이 정본. MySQL RLS 미지원·물리격리=인프라 재설계.
2. **형식 Tenant Resolver 미들웨어/Global Scope/Repository Filter** — 안 함. `X-Tenant-Id` 주입 + 핸들러 tenantOf + 수동 WHERE(Part010).
3. **per-tenant Backup/Restore/Migration·Region Failover DR** — 부분. 수동 백업(Part015). 전용 도구 부분.
4. **형식 Tenant Lifecycle 상태머신** — 부분(active/suspended). admin 콘솔로 관리.

★**준수하는 실 원칙(최강)**: **Zero Tenant Leakage**(전 쿼리 격리·크로스탭 2패턴)·Subscription/Metering(PlanPolicy/quota)·Tenant AI(BYO)·Security(RBAC/writeGuard/evaluatePolicy)·Audit·요청시점 전역상태 금지.

---

## 6. ★실 갭 수정 (§29 — raw BroadcastChannel 2건)

멀티테넌트 최강 원칙 감사 중, **tenant 스코프도 메시지 필터도 없는 raw BroadcastChannel 2건**을 발견·수정했다(같은 브라우저 타 테넌트 탭 유입 = §29 Shared Cache/Channel Key 위반):

| 파일 | 문제 | 조치 |
|------|------|------|
| `Reconciliation.jsx` | 자체 채널 `RECON_SYNC_CH` raw(tChannelName 미경유) → 타 테넌트 정산 sync 유입 | **`tChannelName(RECON_SYNC_CH)`** 스코프(OmniChannel/OrderHub 패턴 정합) |
| `AutoMarketing.jsx` | 공유 채널 `geniego-roi-global-sync`(GlobalDataContext 와 동일) 수신 시 tenant 무필터 → 타 테넌트 `CAMPAIGNS_UPDATE` 로 draft 리셋 | **메시지 `tenant` 필터**(`if data.tenant!==currentTenant() return`·GlobalDataContext handleSync 180차 정합·★tChannelName 감싸면 공유채널 어긋나 sync 파괴이므로 필터가 정답) |

- ★**정직 판정(오탐 방지)**: `GlobalDataContext`(raw 채널)는 **이미 handleSync 가 tenant 필터**(180차·line 640)라 **안전**(초기 "누출" 판단 정정). `Marketing`(raw)은 **핸들러 no-op** → 무해. 즉 **데이터-운반 채널은 안전**했고, 남은 2건은 spurious 신호(정산 sync·draft 리셋) 수준.
- 검증: ESLint 618/131 **베이스라인 불변** · 빌드 exit 0. ★**미배포**(프론트 dist swap 승인 대기).

---

## 7. Claude Code 구현 규칙

1. ★**전 쿼리 `tenant_id` 격리**(헌법·누락=Critical). 크로스 JOIN·Subscription 우회 금지.
2. Tenant=`tenantOf`/`X-Tenant-Id`. ★**요청시점 전역상태 tenant 해석 금지**(act-as 하이재킹). platform_growth=admin 전용.
3. ★**크로스탭 BroadcastChannel 은 반드시 tenant 격리** — 자체채널=`tChannelName()`·공유채널=메시지 `tenant` 필터. raw+무필터 금지.
4. Subscription=PlanPolicy·quota(BYO=자기비용). Config=tenantStorage/ai_settings. AI 호출=tenant 귀속(quota 격리·289차후속).
5. Security=writeGuard/evaluatePolicy·SecurityAudit. 로그/캐시/큐/파일/AI 모두 tenant context 포함.
6. Schema/DB-Level 격리·RLS·Repository Global Scope 를 "명세에 있다"는 이유로 이식하지 않는다(Row-Level 유지).

---

## 8. Completion Criteria

- [x] 멀티테넌트 **실측**(tenant_id 3094·tenantOf 688·Row-Level·RLS 0·quota·ai_settings BYO·tenantStorage)
- [x] 명세 §3~§31 **섹션별 매핑·판정**(강하게 준수 + Schema/DB격리/RLS 미적용 사유)
- [x] 실 격리(Row-Level·크로스탭 2패턴)·Subscription/Metering/AI Config 성문화(§4)
- [x] ★**실 갭 2건 수정**(Reconciliation tChannelName·AutoMarketing 메시지 필터)(§6)
- [x] Zero Tenant Leakage·Subscription·Security·act-as 트랩 준수/경고 명시
- [x] Claude Code 규칙(§7) · ESLint 618/131 불변·빌드 exit 0

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 Row-Level 멀티테넌트(전 쿼리 격리·크로스탭 2패턴·PlanPolicy·BYO)의 성문화 + 실 갭 2건 수정이지 Schema/DB격리·RLS 이식이 아니다.

---

## 다음 Part

**CCIS Part025 — API Gateway, Service Mesh & Microservice** — ★사전 경고: 마이크로서비스 아님 — **단일 Slim 4 모놀리스**(Part007). Service Mesh(Istio/Linkerd)·gRPC·Service Discovery·Sidecar·mTLS **전부 부재**(Part016). "API Gateway"=nginx + index.php 미들웨어(CORS·API-key·tenant 주입)·`/v{NNN}` 라우팅. Part025 도 실측→마이크로서비스 부재증명→모놀리스+nginx 성문화(Service Mesh 이식 금지).
