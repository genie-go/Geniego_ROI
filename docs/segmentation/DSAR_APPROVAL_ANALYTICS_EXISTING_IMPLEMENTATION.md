# DSAR — RBAC Analytics & Governance Dashboard: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> 본 문서는 Part 3-11 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`frontend/src/pages/`. 읽기 전용. 배제: `_be_*/`(빌드 백업)·`clean_src/`·`backup/`.
- 방법: analytics/dashboard/kpi/widget/forecast/recommendation/trend/alert/export/cache 다중 grep + authz 거버넌스 화면(SystemMonitor/AccessReview/Audit/Compliance) 정독. 2 Explore 스레드(50 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**인가/RBAC 거버넌스를 통합 분석·운영하는 Control Tower(통합 Governance Dashboard + authz KPI + forecast/recommendation/trend)는 부재(ABSENT)다.** 그러나 그린필드는 아니며 — (a) 부분 authz analytics 화면(운영헬스·접근검토·감사·컴플라이언스 posture)과 (b) 도메인 중립 재사용 인프라(Alert 평가·pushEvent 통지 라우터·Export 엔진·TTL 캐시 패턴·감사 해시체인)가 실존한다.

- **★최대 원칙**: 저장소 analytics/KPI/dashboard/forecast/recommendation의 **거의 전부가 마케팅·커머스 도메인**(GT② §KEEP_SEPARATE)이며 `performance_metrics`/`channel_orders`/`attribution_*`에 강결합. RBAC 거버넌스 analytics는 `acl_permission`/`access_review_item`/`security_audit_log`/`api_key`/`auth_audit_log` 를 소스로 하는 **별개 축**이다.
- **재활용 substrate**: 실 엔진은 아래 도메인중립 인프라 위에 authz 지표층을 **신설(Extend)** 한다.

## 2. 실존 substrate 카탈로그

### A. 운영/시스템 헬스 Dashboard (인프라 — RBAC 지표 아님·PARTIAL)

| 파일:라인 | 심볼 | 설명 | Part3-11 매핑 |
|---|---|---|---|
| `backend/src/Handlers/SystemMetrics.php:60` | `metrics()` | 8모듈 프로브(db/php/opcache/apcu/disk/tenants/migrations/api) | Operations Dashboard 근접 |
| `backend/src/Handlers/SystemMetrics.php:96-102` · `:372-419` | summary·cronHealth | ok_count/total/avg_latency/error_rate + cron 12종 stale 판정 | Runtime/Operations 지표 |
| `backend/src/Handlers/SystemMetrics.php:50-58` · `:107-117` | `isAdmin` 게이트 | 민감 인프라 admin 세션만 | Runtime Guard(dashboard 접근) |
| `backend/src/routes.php:1049-1050` · `:3465-3466` | `GET /v424/system/metrics`(+/api) | 라우트 | API |
| `frontend/src/pages/SystemMonitor.jsx:209-212` · `:9-21` | 로드·카드 매핑 | 프론트 대시보드 렌더 패턴 | Dashboard 위젯 선례 |

### B. 접근 검토 Analytics (Part 3-8 슬라이스 — api_key 축 한정·PRESENT)

| 파일:라인 | 심볼 | 설명 | Part3-11 매핑 |
|---|---|---|---|
| `backend/src/Handlers/AccessReview.php:36` · `:19-22` | 클래스·범위 | 휴면/만료 api_key 검토(★api_key 축만·사람계정 미커버) | JIT/Service Identity Analytics 부분 |
| `backend/src/Handlers/AccessReview.php:87-122` | `classify` | EXPIRED>STALE_UNUSED>DORMANT>EXPIRING_SOON>OK 파생 | Metric 파생 선례 |
| `backend/src/Handlers/AccessReview.php:141` · `:158` · `:169-172` | summary·needs_review | 상태별 카운트 집계 | KPI/Metric 집계 |
| `backend/src/Handlers/AccessReview.php:62-81` · `:218-233` | `access_review_item`·증거 | 추가전용 이력 + SecurityAudit 기록(`:225`) | Evidence 저장 substrate |
| `backend/src/Handlers/AccessReview.php:177-242` · `:245` | decision·history | 회수+증거·이력 조회 | Audit Analytics |
| `frontend/src/pages/AccessReview.jsx:65` · `:75` · `:95` | keys/history/decision 소비 | 프론트 | Dashboard 화면 선례 |

### C. 감사 Analytics (PRESENT — 유일 tamper-evident evidence)

| 파일:라인 | 심볼 | 설명 | Part3-11 매핑 |
|---|---|---|---|
| `backend/src/SecurityAudit.php:14-33` · `:27` | `log()`·hash_chain | append-only prev_hash→hash_chain | Evidence/Digest 무결성 substrate |
| `backend/src/SecurityAudit.php:35-41` · `:56-68` | `lastHash`·`verify` | 무결성 재계산·broken_at | Immutable Record Validation(§19) |
| `backend/src/SecurityAudit.php:71-83` · `:93-110` | `recent`·`recentByType` | 테넌트 스코프 조회(demo/subscriber/all) | Audit Analytics 조회 |
| `backend/src/SecurityAudit.php:118-153` | `acquisitionSummary` | signup/login·일자별 trend 집계 | Trend Engine 선례(인증축) |
| `backend/src/Handlers/AdminMenu.php:123` · `:200` · `:216` · `:696-716` | `menu_audit_log`·조회 | 메뉴 거버넌스 해시체인+페이지네이션 | Audit Coverage |
| `backend/src/Handlers/AdminGrowth.php:1411-1431` | `securityAudit()` | recentByType+acquisition+integrity 통합 반환 | 감사 대시보드 API 선례 |
| `frontend/src/pages/Audit.jsx:371` · `:522-536` · `:441-479` | 감사로그·KPI·posture 카드 | 총/오늘/high-risk/admin KPI + 컴플라이언스 준비도 | Security/Compliance Dashboard 선례 |

### D. 컴플라이언스 Posture (RBAC를 control 1행으로 취급·PARTIAL)

| 파일:라인 | 심볼 | 설명 | Part3-11 매핑 |
|---|---|---|---|
| `backend/src/Handlers/Compliance.php:53-126` · `:93` | posture·`access-rbac` control | RBAC를 SOC2 control 1행(readiness%)으로 | Compliance Dashboard 프레임(확장 대상) |
| `frontend/src/pages/Audit.jsx:383-388` | `/v424/compliance/posture` 소비 | 프론트 | Compliance Dashboard 선례 |

### E. Admin 거버넌스 콘솔 (RBAC 집계 얕음·PARTIAL)

| 파일:라인 | 심볼 | 설명 | Part3-11 매핑 |
|---|---|---|---|
| `backend/src/Handlers/UserAdmin.php:87` · `:127-135` · `:528-576` · `:550-552` | listUsers·stats·active_sessions | plan GROUP BY·30d 신규·활성세션 | Executive/Security 지표 부분 |
| `backend/src/Handlers/UserAdmin.php:150-188` | `expiringSoon` | expired/within7/within30 | Assignment Analytics 부분 |
| `backend/src/Handlers/TeamPermissions.php:454-478` · `:469` · `:470` | listTeams·member/permission count | acl_permission COUNT 집계 | Role/Permission Analytics 원천 |
| `backend/src/Handlers/TeamPermissions.php:715-731` | `teamAudit` | auth_audit_log team% 조회 | Audit Analytics |
| `frontend/src/pages/UserManagement.jsx:523` · `:533` | security-audit 재사용 | 프론트 | 콘솔 선례 |

### F. RBAC 데이터 소스 정본 (analytics 소스 — 집계 대상)

| 파일:라인 | 심볼 | 설명 | Part3-11 매핑 |
|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:10` · `:56` · `:738-750` | acl_permission 매트릭스·`data_scope`·`scopeSqlNamed` | 메뉴×8동작 RBAC/ABAC 정본("dashboard"=메뉴 권한키) | Role/Permission/Scope Analytics 데이터 소스 |
| `backend/src/Handlers/EnterpriseAuth.php:11` | SSO/SCIM | OIDC/SAML/SCIM 프로비저닝 | Service Identity/Assignment 소스 |
| `backend/src/Handlers/UserAuth.php:2039` | subscription_ledger·auth_audit_log SSOT | 인증 감사 원장 | Audit/Assignment 소스 |

### G. 도메인 중립 재사용 인프라 (엔진 substrate — Extend 대상)

| 파일:라인 | 심볼 | 설명 | Part3-11 매핑 |
|---|---|---|---|
| `backend/src/Handlers/Alerting.php:213` · `:236` · `:407` · `:442` | evaluate·runEvaluation·evalConditionTree·compareOp | AND/OR 재귀 조건평가 프레임(도메인 중립·단 metric 소스는 마케팅 `:343`·`:388`) | Alert Engine(§24) 평가 substrate |
| `backend/src/Handlers/Alerting.php:471` · `:806` · `:880` · `:1007` · `:786` | dispatch·Slack·Email·Webhook·SSRF가드 | Block Kit·Mailer·HMAC 서명·SSRF fail-closed | Alert 통지(§24) |
| `backend/src/Handlers/Alerting.php:978` · `:987` · `:1023-1042` | ensureNotifyTable·`pushEvent`·채널 CRUD | `notification_channel` SSOT·min_severity·**도메인 무관 이벤트 라우터**·Crypto AES-256-GCM | Alert/Subscription(§24·§25) 핵심 재사용 |
| `backend/src/Handlers/Reports.php:66` · `:88` · `:183` · `:199` · `:537` · `:35` · `:116` | report_schedule·CRUD·due-drain cron·VIZ_TYPES·generateKpiSummary | frequency 예약 이메일 발송(payload는 마케팅 KPI) | Subscription(§25) 예약발송 substrate |
| `backend/src/Handlers/DataExport.php:24` · `:266` · `:383` · `:607` · `:625` · `:646` · `:93` | 클래스·runDestination·pushDataset·httpSend·SSRF·runDue·암호화 | HTTP/Sheets/BigQuery/Snowflake/S3(NDJSON/JSON·★CSV/Excel/PDF 없음)·frequency·커서페이징 | Export 엔진(§26) — 데이터셋 계층은 KEEP_SEPARATE |
| `backend/src/Handlers/AttributionEngine.php:1754` · `:1765` · `:1748` | ensureCacheTable·cacheGet·ckey | ckey+computed_at+ttl 만료(테이블은 attribution 전용) | Cache 패턴(§30) — 패턴 차용·테이블 신설 |
| `backend/src/Handlers/WebPush.php:305` · `:307` · `:299` | `api_rate_limit`·GC | key_id/window_min/cnt 범용 카운터 | Cache/rate 재사용 |
| `backend/src/Handlers/NotifyEngine.php:25` · `:51` · `:92` · `:123` | 쿠폰 알림 email/SMS/kakao | Mailer/SMS/kakao 위임(트리거=쿠폰·범용성 낮음) | Subscription 채널 위임 패턴(부분) |

## 3. 종합 판정

**RBAC Analytics Dashboard = ABSENT-governance(통합 Control Tower) / PARTIAL-substrate(분산 authz 화면) / 대량-KEEP_SEPARATE(마케팅 analytics).** 통합 Governance Dashboard·10 Dashboard 유형·authz 전용 KPI(Least Privilege/ZSP/SoD%/Cert%/MTTR·§20)·Forecast/Recommendation/Trend(authz축)·Widget 레지스트리·authz Snapshot/Digest·Drift/Simulation/Revalidation/Reconciliation·Runtime Guard/Static Lint 전부 순신규. 재활용: 운영헬스(§A)·접근검토(§B)·감사체인(§C)·컴플라이언스 posture(§D)·admin 콘솔·RBAC 데이터소스(§F)·도메인중립 인프라(§G, Alert 평가·pushEvent·Export·Cache·Reports 예약). 실 엔진은 이 substrate를 **대체가 아닌 재활용·확장(Extend)** 하며, 마케팅 metric/dataset 계층은 **절대 흡수 금지**(GT②).
