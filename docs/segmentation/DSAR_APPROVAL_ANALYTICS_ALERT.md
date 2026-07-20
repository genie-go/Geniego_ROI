# DSAR — RBAC Analytics & Governance Dashboard: 경보 엔진 (APPROVAL_ANALYTICS_ALERT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §24 Alert Engine은 authz analytics 지표가 조건을 위반할 때 **경보를 발화·통지**한다. 경보 6종: **Threshold Alert · Drift Alert · Compliance Alert · SLA Alert · Security Alert · Runtime Alert**. KPI(§20)·Drift(§31)·Compliance(§6)·Certification SLA(§16)·Runtime(§17) 지표를 metric 소스로 하며, 통지는 SPEC §25 Subscription 채널(Email/Slack/Teams/Webhook/SMS/Push)로 라우팅된다. Alert Latency ≤ 10초(§42) 요구.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

★**본 엔티티는 4편 중 유일하게 도메인중립 substrate가 실존(PRESENT)** — Alert 평가·통지 프레임은 재활용, **metric 소스만 authz로 교체**한다(ADR D-3).

| substrate | 판정 | 근거(파일:라인) |
|---|---|---|
| 조건평가 프레임(AND/OR 재귀·op) | **PRESENT(도메인중립)** | `Alerting.php:213` `evaluate`·`:236` runEvaluation·`:407` evalConditionTree·`:442` compareOp — GT① §G · GT② §2·§3 |
| 통지 dispatch(다채널) | **PRESENT** | `Alerting.php:471` dispatch·`:806` Slack(Block Kit)·`:880` Email(Mailer)·`:1007` Webhook(HMAC 서명)·`:786` SSRF fail-closed — GT① §G |
| 이벤트 라우터·채널 SSOT | **PRESENT(핵심 재사용)** | `Alerting.php:978` ensureNotifyTable·`:987` `pushEvent`(도메인 무관 이벤트 라우터)·`:1023-1042` notification_channel CRUD(min_severity·Crypto AES-256-GCM) — GT① §G · GT② §3-1 |
| Compliance/SLA Alert 원천 | **PARTIAL** | Compliance Alert=`Compliance.php:53-126`(control readiness%)·SLA=`AccessReview.php:141`·`:169-172`(needs_review·Reviewer SLA §16 부분) |
| authz metric 소스(threshold 대상) | **ABSENT(교체 대상)** | authz KPI/Drift 지표 grep 0(GT② §2). ★현 `Alerting.php` metric 소스는 마케팅(`:343`·`:388`) — authz로 교체 필요 |

★핵심: 평가·통지·라우팅 골격(`Alerting.php:213`/`:471`/`:987`)은 **도메인 중립**으로 실존하나, 현재 조건이 읽는 metric 소스(`:343`·`:388`)는 마케팅이다. 재사용은 metric 소스를 authz KPI/Drift/Compliance/SLA로 교체하는 데 한정하며 마케팅 metric 흡수 금지.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **alert_type**: `threshold|drift|compliance|sla|security|runtime`(SPEC §24).
- **조건**: `Alerting.php:407` evalConditionTree AND/OR 트리 + `:442` compareOp 재사용. metric_key는 authz 지표만(§20 KPI·§31 Drift·`Compliance.php:53-126` readiness·`AccessReview.php` SLA).
- **통지**: `Alerting.php:987` pushEvent 라우터 + `:1023-1042` notification_channel(min_severity) 재사용. 채널=Slack(`:806`)·Email(`:880`)·Webhook(`:1007` HMAC·`:786` SSRF 가드). SPEC §25 Subscription 공유.
- **에러/경고 계약**: `ANALYTICS_TIMEOUT`(§37)·Alert Latency ≤10초(§42). Drift Alert는 §31 KPI/Policy/Runtime Drift 소스.
- **증거**: 발화 이력은 `SecurityAudit.php:14-33`(해시체인) 기록(ADR D-4).
- **테넌트 격리 절대**: notification_channel 테넌트 스코프 + cross-tenant 격리(`index.php:614-619` — ADR D-6). 테넌트 간 경보 혼입 금지(§35).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

★Alert **프레임은 재사용하되 metric 소스는 마케팅 흡수 금지**(ADR D-3·GT② §4).

| 흡수 금지 대상 | 근거(파일:라인) | 분리 사유 |
|---|---|---|
| Alerting 마케팅 metric 소스 | `Alerting.php:343`·`:388` (GT① §G) | 현 조건평가의 metric은 마케팅 — authz로 교체할 뿐 흡수 아님 |
| 광고 SPC 이상감지 | `AnomalyDetection.php:22` (GT② §B-2) | ROAS/CPA/CTR/CVR 마케팅 경보 — Security Alert 아님 |
| 예약 발송 payload | `Reports.php:66`·`:183`·`:537` (GT① §G) | report_schedule cron 재사용하되 payload는 마케팅 KPI — authz로 교체 |

★ADR D-3 명시: Alert(§24)=`Alerting.php:213` 조건평가 + `:987` pushEvent 라우터 재사용, **metric 소스만 authz로 교체**. Subscription(§25)=`Reports.php:66`·`Alerting.php:1023-1042` 채널 CRUD 재사용. 마케팅 metric/dataset 계층 절대 흡수 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Alert **프레임 = PRESENT(도메인중립 재사용)** / authz metric 소스 = **ABSENT(교체 신설)**. 재활용 = `Alerting.php:213`·`:407`·`:442`(평가)·`:471`·`:806`·`:880`·`:1007`·`:786`(통지)·`:978`·`:987`·`:1023-1042`(라우터·채널 SSOT). Compliance/SLA 소스 = `Compliance.php:53-126`·`AccessReview.php:141`·`:169-172`.
- **선행 의존**: BLOCKED_PREREQUISITE. Threshold/Drift Alert는 authz KPI(§20)·Drift(§31) 지표가 선행이며, Security/Runtime Alert는 SoD(3-10)·JIT(3-9)·Runtime Analytics(§17) 산출을 소비(ADR D-7).
- **무후퇴**: Alerting 마케팅 경보·AnomalyDetection·Reports 마케팅 예약 병행 유지·흡수 0(ADR D-2·D-3·D-8). Extend-only(metric 교체·프레임 재사용). 코드 변경 0 · NOT_CERTIFIED.
