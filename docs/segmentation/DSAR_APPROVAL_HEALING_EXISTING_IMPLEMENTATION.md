# DSAR — Self-Healing Authorization & Continuous Governance: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> 본 문서는 Part 3-20 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`backend/bin/`·`backend/src/routes.php`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: SystemMetrics/Health/Alerting/Mapping/AccessReview/SecurityAudit/migrate 정독 + self.heal/health/drift/anomaly/remediation/recovery/rollback grep. 2 Explore 스레드(49 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**authz self-healing 엔진(권한/정책 drift·authz anomaly·auto-remediation·recovery workflow·governance health score)은 부재(그린필드)다.** 실재는 (a) infra health-probe(SystemMetrics/Health·PRESENT baseline)·(b) maker-checker 정족수(recovery approval substrate)·(c) SecurityAudit 불변 evidence·(d) migrate schema rollback·(e) AccessReview EXPIRED/STALE 분류(expired detection)·(f) ClaudeAI LLM(AI advisor infra)·(g) Compliance readiness(governance health 인접). ★Alerting executeAction=**producer 없는 죽은 스켈레톤(광고 actuation·authz 아님)**·DB ensureTables self-heal는 동음이의(GT②).

- **★§3 Health Assessment PRESENT baseline = SystemMetrics/Health**(`SystemMetrics.php:60`·`Health.php:27`·infra probe·ok/degraded/down·authz-도메인 health 아님).
- **★§16 Recovery Approval substrate = maker-checker**(`Mapping.php:240`·self-approval 차단 `:268-271`·정족수 `:287`·producer `:209`).
- **★§19/§31 Evidence PRESENT = SecurityAudit 해시체인**(`SecurityAudit.php:14-68`).
- **★§17 Rollback PARTIAL = migrate schema rollback**(`Migrate.php:310`·`migrate.php:34-38`·schema만).
- **★§7 Expired detection PARTIAL = AccessReview classify**(`AccessReview.php:87`·EXPIRED/STALE·자동정리 없음)·inline session GC(`UserAuth.php:989`).
- **★§14 AI Advisor infra = ClaudeAI**(`ClaudeAI.php:70`·LLM·recovery advice 로직 없음).

## 2. 실존 substrate 카탈로그

### A. Health Assessment (PRESENT — infra baseline·§3·authz health 아님)

| 파일:라인 | 심볼 | 설명 | Part3-20 매핑 |
|---|---|---|---|
| `SystemMetrics.php:53-54` · `:60` · `:67-76` · `:127` · `:139` · `:155` · `:177` · `:183` · `:219` · `:261` · `:278` · `:292` · `:323` · `:334` · `:345` · `:353` | metrics()·8 self-probe(db/php/opcache/apcu/disk/tenants/migrations/self)·ok/degraded/down·`:53-54` schema drift 주석 | infra health probe | Health Assessment(§3·baseline) |
| `routes.php:1031-1041` · `:3453-3460` | `/health`·`/healthz`·`/v424/health` 라우트 | 공개 health 라우트 | Health Check(§2·§30 API) |
| `SystemMetrics.php:372` · `:402` · `:408` · `:417` | cronHealth(로그 mtime staleness·ok/stale/missing/unknown) | cron 신선도 | Health(§3) |
| `Health.php:27` · `:41-42` · `:47` · `:56` · `:72` · `:99` · `:13-25` | check()·dbProbe(SELECT 1·최신 migration)·deploy 마커·status ok/degraded·HTTP 200/503 | 공개 health 엔드포인트 | Health Check(§2·§3) |

★health 어휘=ok/degraded/down(모듈)·healthy/warning/critical/recovery-required(authz) 없음·권한 anomaly/policy drift/SoD posture 없음.

### B. Recovery Approval / Maker-checker (PRESENT — 재사용 substrate·비-authz 도메인)

| 파일:라인 | 심볼 | 설명 | Part3-20 매핑 |
|---|---|---|---|
| `Mapping.php:209` · `:240` · `:246-250` · `:262` · `:268-271` · `:278-283` · `:287` | INSERT mapping_change_request(producer)·approve(fail-closed actor·self-approval 차단·dedup·정족수 approved) | 정족수 maker-checker | Recovery Approval(§16·substrate) |
| `Db.php:592` · `:623-636` | action_request·mapping_change_request DDL(required_approvals) | 승인요청 테이블 | Approval(§16) |
| `AccessReview.php:180-242` · `:188-194` · `:210-215` · `:219-222` · `:225` · `:225-233` | decision(approve\|revoke·justification 필수·api_key is_active=0·SecurityAudit 증거) | 단일주체 결정+증거 | Approval/Evidence 선례 |

### C. Immutable Evidence / Rollback (PRESENT — evidence·schema rollback)

| 파일:라인 | 심볼 | 설명 | Part3-20 매핑 |
|---|---|---|---|
| `SecurityAudit.php:8` · `:14` · `:25-31` · `:35` · `:39` · `:43-53` · `:56-68` · `:71` | 해시체인 log(prev→sha256)·lastHash(GENESIS)·verify(broken_at)·UPDATE/DELETE 경로 없음 | tamper-evident evidence | Recovery Evidence(§19)·Immutable History(§31·PRESENT) |
| `migrate.php:34-38` · `:95-125` · `Migrate.php:162-164` · `:310` · `:334` · `:365` · `:401` · `:412` · `:421-426` | --rollback[=N]·rollback/dryRunRollback·@rollback 블록·missing-marker 하드에러 | schema 마이그레이션 롤백 | Rollback Recovery(§17·schema만) |

### D. Expired Detection / Session Cleanup (PARTIAL — 탐지·inline GC·스케줄 없음)

| 파일:라인 | 심볼 | 설명 | Part3-20 매핑 |
|---|---|---|---|
| `AccessReview.php:13-24` · `:87` · `:102` · `:108` · `:141-171` · `:171` | classify(EXPIRED/STALE_UNUSED/DORMANT/EXPIRING_SOON·api_key·needs_review 집계) | 만료 탐지(자동정리 없음) | Auto-Remediation(§7·Expired Cleanup 탐지만) |
| `UserAuth.php:989` · `:4261` · `:2553` · `:2601` · `:1682` · `:1696` · `EnterpriseAuth.php:407` · `:420` | inline DELETE user_session/password_reset expired·deprovision 하드삭제 | 기회적 정리(스케줄 GC 없음) | Session Cleanup(§7·PARTIAL) |

### E. Governance Health Score / AI Advisor (인접/infra — authz score/advisor 로직 없음)

| 파일:라인 | 심볼 | 설명 | Part3-20 매핑 |
|---|---|---|---|
| `Compliance.php:50` · `:53` · `:120` · `:124` | posture()·readiness_pct=(impl+avail*0.5)/total | SOC2/ISO readiness(authz governance health 아님) | Governance Health Score(§22·인접·재사용 패턴) |
| `ClaudeAI.php:18` · `:21` · `:46` · `:61` · `:70` · `:82` | class ClaudeAI·complete/callClaude·aiKeyConfigured | generic LLM infra(recovery advice 로직 없음) | AI Recovery Advisor(§14·infra) |
| `index.php:610` | X-Tenant-Id 서버강제 | tenant 격리 | Tenant Isolation(§31·PRESENT) |

## 3. 종합 판정

**Self-Healing Authorization = ABSENT-greenfield(Self-Healing Registry·Health Assessment Engine(authz)·Continuous Governance Engine·Drift Detection(authz)·Anomaly Detection(authz)·Auto-Remediation·Safe Recovery Planner·Policy/Runtime/Integrity Consistency Validator·Configuration Healing·Compliance Recovery·Recovery Workflow(8단계)·Recovery Approval Manager(authz)·Rollback Recovery(authz state)·Recovery Snapshot/Digest/Analytics(MTTD/MTTR)/Simulation/Revalidation/Reconciliation·Governance Health Score(authz)·Runtime Guard/Static Lint 순신규) / PARTIAL(SystemMetrics/Health infra probe·AccessReview expired 탐지·inline session GC·migrate schema rollback) / PRESENT(SecurityAudit evidence·maker-checker 정족수·ClaudeAI LLM·tenant 격리) / 재사용-패턴(Compliance readiness).** 재활용(흡수 아님·확장): SystemMetrics/Health→Health Assessment baseline·maker-checker→Recovery Approval·SecurityAudit→Recovery Evidence·migrate rollback→Rollback(schema→authz)·AccessReview classify→Expired detection·ClaudeAI→AI Advisor infra·Compliance readiness→Governance Health Score 패턴. ★DB schema self-heal·AnomalyDetection SPC·ModelMonitor drift·Alerting 죽은 스켈레톤·재무 recovery·MFA recovery codes(GT②)는 **흡수·오판 금지**.
