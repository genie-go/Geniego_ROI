# DSAR — RBAC Analytics & Governance Dashboard: 구독/배포 채널 (APPROVAL_ANALYTICS_SUBSCRIPTION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ANALYTICS_SUBSCRIPTION`(SPEC §2 Canonical Entity)은 RBAC 거버넌스 대시보드/KPI/경보 산출물을 구독자에게 **정기·이벤트 기반으로 배포**하는 계약이다. SPEC §25(Subscription)는 지원 채널을 **Email·Slack·Teams·Webhook·SMS·Push Notification** 6종으로 규정한다. 배포 대상 payload는 §27 Snapshot·§26 Export 산출물이며, 트리거는 §24 Alert Engine(Threshold/Drift/Compliance/SLA/Security/Runtime Alert) 및 §21 Trend Engine의 주기(Daily/Weekly/Monthly/Quarterly/Annual)이다. 본 엔티티는 **authz 거버넌스 지표 전용** 구독이며 마케팅 리포트 구독과 분리된다(§4).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 채널/기능 | 판정 | 근거(파일:라인) |
|---|---|---|
| 도메인중립 이벤트 라우터(구독 코어) | **PARTIAL(재사용)** | `Alerting.php:987`(`pushEvent`)·`:978`(ensureNotifyTable)·`:1023-1042`(notification_channel SSOT·min_severity·Crypto AES-256-GCM) — 도메인 무관 이벤트 라우터(GT① §G) |
| Email 채널 | **PARTIAL(재사용)** | `Alerting.php:880`(Email dispatch·Mailer) · `Reports.php:66`·`:183`·`:537`(report_schedule frequency 예약 이메일 발송·cron due-drain) |
| Slack 채널 | **PARTIAL(재사용)** | `Alerting.php:806`(Slack Block Kit) · `:1023-1042`(채널 CRUD) |
| Webhook 채널 | **PARTIAL(재사용)** | `Alerting.php:1007`(Webhook HMAC 서명) · SSRF fail-closed `:786` |
| dispatch 통지 프레임 | **PARTIAL(재사용)** | `Alerting.php:471`(dispatch) |
| SMS 채널 | **PARTIAL(위임 패턴만)** | `NotifyEngine.php:51`(SMS 위임) — 단 트리거=쿠폰·범용성 낮음(GT① §G) |
| Email/SMS/kakao 위임 선례 | **PARTIAL** | `NotifyEngine.php:25`·`:92`·`:123`(email/SMS/kakao 위임) |
| Teams 채널 | **ABSENT** | GT①②/ADR 인용 substrate 없음 — 순신규 |
| Push Notification 채널 | **ABSENT** | 배포 substrate 인용 없음(WebPush는 api_rate_limit 카운터로만 등장 — §Cache) — 순신규 |
| authz 전용 구독 레지스트리(구독자×지표×주기) | **ABSENT** | authz 지표 구독 정의·스케줄 grep 0(GT② §2·§3) — 순신규 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **구독 레코드**: subscription_id · tenant_id(격리 필수) · subscriber(role/user) · channel(6종 enum §25) · dashboard_ref(§27 Snapshot) · trigger(§24 Alert / §21 Trend 주기) · min_severity · status(active/paused) · created_by.
- **배포 코어**: `Alerting.php:987` pushEvent 이벤트 라우터 + `:1023-1042` notification_channel SSOT를 **재사용(Extend)** 하고 metric/이벤트 소스만 authz(§20 KPI·§24 Alert)로 교체(ADR D-3).
- **예약 발송**: `Reports.php:66`·`:183`·`:537` report_schedule cron을 재사용하되 payload를 authz Snapshot/Digest(§27·§29)로 교체(ADR D-3).
- **보안 제약**: Webhook은 `Alerting.php:786` SSRF fail-closed 가드 유지, 채널 자격은 `:1023-1042` AES-256-GCM 암호화 유지. 구독 배포는 테넌트 스코프 밖 지표 유출 금지(SPEC §35 Data Leakage·ADR D-6).
- **신규 필요**: Teams·Push 배포 어댑터, authz 구독 레지스트리/스케줄러(현 예약은 마케팅 payload 결합).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

- `Reports.php`의 report_schedule 예약 발송은 재사용하되, 그 **payload(마케팅 KPI generateKpiSummary·`Reports.php:35` VIZ_TYPES·`:27`/`:141`/`:336` DataExport DATASETS=orders/ad_metrics/attribution/kpi_summary)는 흡수·개명 절대 금지**(GT② §B-5·§4). authz 구독은 별도 데이터 소스(`acl_permission`/`security_audit_log`).
- `NotifyEngine.php`(쿠폰 알림)의 SMS/kakao 위임 패턴만 참조하고 쿠폰 트리거 로직은 미흡수(GT① §G).
- 마케팅 Alerting metric 소스(`Alerting.php:343`·`:388`)는 흡수 금지 — 평가 프레임(`:213`/`:407`/`:442`)만 authz metric으로 교체(ADR D-2·D-3).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: PARTIAL-substrate(Email/Slack/Webhook/pushEvent 라우터·예약발송 재사용) / ABSENT-governance(Teams·Push 어댑터·authz 구독 레지스트리 순신규).
- **재활용(Extend, 대체 아님)**: `Alerting.php:987`/`:1023-1042`(라우터·채널) · `:806`/`:880`/`:1007`/`:786`(Slack/Email/Webhook/SSRF) · `Reports.php:66`/`:183`/`:537`(예약) · `NotifyEngine.php:51`(SMS 위임 패턴).
- **선행의존**: BLOCKED_PREREQUISITE — 구독 payload인 §24 Alert·§27 Snapshot·§20 KPI가 실 구현(Part 1~3-10 인증)된 후 배포 가능(ADR D-7). 코드 변경 0·NOT_CERTIFIED.
