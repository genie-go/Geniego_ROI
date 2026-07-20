# DSAR — Self-Healing Authorization & Continuous Governance: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`.
> (A) self-healing 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 동음이의(DB 스키마 self-heal·마케팅 SPC·ML drift·죽은 스켈레톤·재무 recovery·MFA codes).

---

## 1. 핵심 판정 — **authz self-healing 골격 전면 부재(그린필드)**

`self-heal|selfHeal|remediat|auto.?heal|continuous.?governance|GovernanceHealth|recovery.?workflow|recovery.?plan|MTTD|MTTR|snapshot.?tamper|recovery.?loop` **authz 매치 0건**. 모든 self-heal/health/drift/anomaly/recovery/remediation/rollback 히트는 KEEP_SEPARATE 동음이의(스키마 DDL·ML·마케팅 SPC·infra health·커머스 정산/재고·메시징 retry·MFA 백업코드·마이그레이션 롤백). 최근접 authz=AccessReview(`AccessReview.php:13-24`·탐지/리뷰만·self-healing 없음).

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Self-Healing Registry / Health Assessment Engine(authz) | **ABSENT(grep 0)** | infra probe만(`SystemMetrics.php:60`·`Health.php:27`·ok/degraded/down·authz health 아님) |
| Continuous Governance Engine(policy compliance/runtime consistency/least priv/zero trust/SoD/JIT/audit readiness/evidence integrity) | **ABSENT(grep 0)** | continuous_governance/GovernanceHealth/zero-trust/least-privilege/SoD/audit-readiness grep 0 |
| Drift Detection Coordinator(authz) | **ABSENT(grep 0)** | drift=ML(`ModelMonitor.php:221`)·마케팅(`AutoCampaign.php:917`)만(§B) |
| Anomaly Detection Engine(authz) | **ABSENT(grep 0)** | anomaly=마케팅 SPC(`AnomalyDetection.php:3`·`:49`)만·권한 anomaly 없음 |
| Auto-Remediation Engine | **ABSENT** | remediat/auto-heal grep 0·Alerting executeAction=광고 actuation·producer 없음(§B) |
| Safe Recovery Planner / Recovery Workflow(8단계) / Recovery Approval Manager(authz) / Rollback Recovery(authz state) | **ABSENT(grep 0)** | recovery plan/workflow grep 0·maker-checker(`Mapping.php:240`)=비-authz 도메인 |
| Policy/Runtime/Integrity Consistency Validator·Config Healing·Compliance Recovery | **ABSENT(grep 0)** | — |
| AI-Assisted Recovery Advisor | **ABSENT(infra만)** | ClaudeAI LLM(`ClaudeAI.php:70`)·recovery advice 로직 없음 |
| Recovery Snapshot/Digest/Analytics(MTTD/MTTR)/Simulation/Revalidation/Reconciliation·Governance Health Score(authz) | **ABSENT** | MTTD/MTTR grep 0·Compliance readiness(`Compliance.php:120`)=인접·authz score 아님 |
| Runtime Guard / Static Lint | **ABSENT(grep 0)** | recovery loop/snapshot tamper grep 0 |
| Immutable Evidence | **PRESENT** | SecurityAudit 해시체인(`SecurityAudit.php:14-68`) |
| Health probe(infra) | **PRESENT** | `SystemMetrics.php:60`·`Health.php:27` |
| Expired detection / session GC | **PARTIAL** | `AccessReview.php:87`·inline `UserAuth.php:989` |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 확장)

1. **SystemMetrics/Health infra probe** — `SystemMetrics.php:60`·`Health.php:27`. Health Assessment(§3) baseline.
2. **maker-checker 정족수** — `Mapping.php:240`·`:268-271`. Recovery Approval(§16).
3. **SecurityAudit 해시체인** — `SecurityAudit.php:14-68`. Recovery Evidence(§19)·Immutable History(§31).
4. **migrate schema rollback** — `Migrate.php:310`·`migrate.php:34-38`. Rollback(§17·schema→authz).
5. **AccessReview classify** — `AccessReview.php:87`. Expired detection(§7).
6. **ClaudeAI LLM·Compliance readiness** — `ClaudeAI.php:70`·`Compliance.php:120`. AI Advisor(§14)·Governance Health Score(§22) 패턴.

## 4. ★KEEP_SEPARATE — authz self-healing 아님 (스키마·ML·SPC·죽은 스켈레톤·재무·MFA)

### B-1. DB 스키마 self-healing (★self-healing 최대 혼동 — 스키마 DDL·authz 아님)
- `Db.php:308`·`:315`·`:317`·`:330`·`:365`·`:387`·`:414`·`:585-590`·`:585-600`(ensureTables·CREATE IF NOT EXISTS·idempotent ALTER drift-heal). 스키마 부트스트랩·authz health/recovery 아님.
- `AdminPlans.php:95`·`:661-663`(seat_tier 스키마 드리프트 self-heal)·`Wms.php:859`(고아 재고 병합 self-heal). 스키마/데이터 정리·authz drift 아님.

### B-2. 마케팅 anomaly SPC / ML drift (anomaly/drift 동음이의)
- `AnomalyDetection.php:3`·`:49`(광고지표 SPC μ±kσ·Western Electric). 광고 이상감지·권한 anomaly 아님.
- `ModelMonitor.php:42-43`·`:221`·`:244`·`:273`(ML drift_score/auto_retrain·ok/warning/critical=모델정확도). ML ops·authz policy drift 아님.
- `AutoCampaign.php:892`·`:917`·`:930-933`(ROAS driftFromSeries)·`JourneyBuilder.php:1185`(Thompson forgetting). 마케팅 성과 추세.
- `ClaudeAI.php:3692`·`:3737`·`:3753`(anomaly_hint=광고 ROAS 서사). 마케팅 LLM.

### B-3. ★Alerting 죽은 스켈레톤 (auto-remediation 오판 금지 — producer 없음)
- `Alerting.php:572`·`:591`·`:610-657`·`:614`·`:623`·`:634-640`·`:642-650`·`:660`·`:672-675`·`:676`·`:685`·`:698`·`:701`·`:704`·`:714-720`(executeAction=광고 pause/budget actuation·decideAction 정족수). ★**action_request producer 없음**(`INSERT INTO action_request` 0건·`Db.php:592` DDL·`routes.php:443-452` dangle)=consume-only 죽은 스켈레톤. rollback_plan(`:591`)=echo만·미집행. authz auto-remediation 아님(광고 actuation)·작동 remediation으로 취급 금지.

### B-4. 커머스/WMS/정산 recovery·reconciliation (recovery/reconciliation 동음이의)
- `Wms.php:2160`·`:2181`(reconcileChannelStock)·`PgSettlement.php:215`·`:294-301`·`:743`(정산 대사)·`KrChannel.php:415-419`·`Connectors.php:896-902`(ROAS reconciliation)·`BillingMethod.php:445-589`(reconcileStaleClaims)·`WhatsApp.php:501`·`:510`(cart_recovery 템플릿명). 재무/재고/마케팅·authz recovery 아님.

### B-5. infra/data-plane health · MFA recovery codes · backup (health/recovery 동음이의)
- `Db.php:469`(connector_health)·`routes.php:140`(deliverabilityHealth)·`GraphScore.php`(데이터 score). data-plane/마케팅 health·authz governance health 아님.
- `UserAuth.php:961`·`:975`·`:2501-2530`·`:3533`·`:3598-3661`·`:3914-4151`(mfa_recovery/genRecoveryCodes/consumeRecoveryCode). 2FA 백업코드 로그인·authz self-healing recovery 아님.
- `DbAdmin.php:53`·`:93`·`:125`·`:193`·`:251`·`:269`(tables/tableStructure/runQuery). backup/restore 함수 부재(279차 무인증 db_restore 제거·grep 0). 매핑 대상 없음.

### B-6. 마이그레이션/트랜잭션 롤백 (rollback 동음이의)
- `Migrate.php:162-164`·`:310`·`:421-426`(@rollback DDL)·`AdminPlans.php:536`·`:714`·`TeamPermissions.php:618`·`:689`·`:781`(pdo rollBack 트랜잭션). SQL 롤백·authz state recovery 아님.

## 5. 종합

**authz self-healing 거버넌스 = ABSENT-greenfield(Self-Healing Registry·Health Assessment(authz)·Continuous Governance·Drift/Anomaly(authz)·Auto-Remediation·Safe Recovery Planner·Consistency Validator·Config Healing·Compliance Recovery·Recovery Workflow/Approval(authz)/Rollback(authz)·Snapshot/Digest/Analytics/Simulation/Revalidation/Reconciliation·Governance Health Score(authz)·Guard/Lint 순신규) / PARTIAL(infra probe·expired 탐지·inline session GC·schema rollback) / PRESENT(SecurityAudit evidence·maker-checker·ClaudeAI·tenant 격리).** 재활용(흡수 아님·확장): SystemMetrics/Health→Health Assessment·maker-checker→Recovery Approval·SecurityAudit→Evidence·migrate rollback→Rollback(schema→authz)·AccessReview→Expired detection·ClaudeAI→AI Advisor·Compliance readiness→Governance Health Score 패턴. **★KEEP_SEPARATE=DB 스키마 self-heal·AnomalyDetection SPC·ModelMonitor/AutoCampaign drift·Alerting 죽은 스켈레톤(광고 actuation·producer 없음)·커머스/재무 recovery·reconciliation·MFA recovery codes·connector_health·마이그레이션/트랜잭션 rollback.** authz self-healing≠스키마 DDL/ML/SPC/광고 actuation/재무/MFA/SQL 롤백.
