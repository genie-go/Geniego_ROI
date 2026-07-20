# DSAR — EAPEF Ground-Truth ① Existing Implementation (Part 3-30)

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 상위 SPEC/ADR: Part 3-30 계보. 본 문서는 하위 DSAR file:line 인용의 허용 근거지(GROUND_TRUTH).

## 전수조사 방법
health/metrics/reliability/sre/slo/sla/incident/capacity/mttr/runbook/postmortem/error-budget 키워드로 `backend/src`·`tools`·`.github`·`docs`·infra 전수 grep + 판독.

## 실존 substrate (형식 SRE 아님·근접 운영 자산)
| EAPEF 개념 | 실존 substrate | 인용 | 성격 |
|---|---|---|---|
| Availability/Health | health/metrics probe(ok/degraded/down) | `Handlers/Health.php`·`SystemMetrics.php` | PARTIAL(형식 SLI/SLO 부재) |
| Incident/Alert | alert_policy·action_request·maker-checker | `Handlers/Alerting.php` | PARTIAL(P0~P4 분류·RCA/Postmortem 부재) |
| Capacity/Reliability 실지식 | php-fpm pool 튜닝·502 방어·CONNECTTIMEOUT | `[[reference_phpfpm_pool_tuning_502]]`·`ChannelSync.php` | PARTIAL(비형식·Forecast 부재) |
| Release/Change | 배포 파이프라인 | `deploy.ps1`·`deploy.sh`·`.github/workflows/deploy.yml` | PARTIAL(Canary/Blue-Green/Feature Flag 부재·죽은 terraform=KEEP_SEPARATE) |
| Operational Knowledge | 세션 인계·문서 | `NEXT_SESSION.md`·`docs/` | 비형식 runbook |
| Evidence Integrity | append-only 해시체인 | `SecurityAudit.php`(verify) | 실재(정본) |
| Tenant Isolation | 격리 술어 | `Db.php` | 실재 |

## 부재(ABSENT) — 형식 EAPEF 엔티티 (grep 0)
Production Excellence Registry · SRE Framework(Error Budget/Toil) · Service Level Management(SLI/SLO/SLA) · Reliability Score Engine · Availability/Capacity/Performance Management(형식) · Operational Intelligence · Incident Excellence(P0~P4/RCA/Postmortem) · Problem Management(Known Error DB) · Change/Release Excellence(형식) · Continuous Improvement Engine · Production Health Index(Bronze~Elite) · Executive Ops Dashboard · Snapshot/Digest · Production Analytics(MTTR/MTBF).

## 판정
**PARTIAL / ABSENT-formal.** Health/metrics·Alerting·fpm튜닝·deploy·runbook·SecurityAudit·Db 격리는 실재(운영 자산)하나, 형식 SRE(SLO/Error Budget/Reliability Score·Capacity Forecast·Incident Excellence·Production Health Index)는 전무. 실행은 선행 Part 인증 종속.
