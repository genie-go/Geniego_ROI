# MEA Part 012 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 012 SPEC/ADR.

## 전수조사 방법
CHANGE_GATE/registry(ChangeHistory/DecisionLog/AuditHistory)/BUGS_TRACKING/Alerting/AnomalyDetection/php-fpm/deploy/health/itil 키워드로 `docs`·`backend/src`·운영 절차 전수 grep + 판독.

## 실존 substrate (운영/변경/거버넌스 프로세스·비형식 ITIL)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| Change Management(프로세스) | ★변경 게이트+배포 승인+안전배포 패턴 | `CHANGE_GATE.md`·배포 승인·안전배포(out-of-band SHA/backup/pscp/post-deploy SHA/fpm reload/health/fatal) | PARTIAL-strong |
| Operational/Data Governance | 헌법·게이트·registry | `CONSTITUTION.md`·`CHANGE_GATE.md`·`docs/registry/`(ChangeHistory/DecisionLog/AuditHistory) | PARTIAL-strong |
| Incident Management | 알림·이상탐지·버그 트래커 | `Alerting.php`·`AnomalyDetection.php`·`docs/BUGS_TRACKING.md`·`PM_CURRENT_STATUS.md` | PARTIAL |
| Capacity Management | php-fpm pool 튜닝 | php-fpm(max_children·별도 pool·502 튜닝) | PARTIAL-informal |
| SLA/Monitoring | health check·알림 | health·`Alerting.php` | PARTIAL |
| 무중단 배포 | dist swap·fpm reload | rsync -a --delete·fpm reload | PARTIAL |
| Backup | 배포 백업 | `.bak.n289*`·db backup | PARTIAL-informal |
| Security(MFA/RBAC/암호) | 인증·격리·암호 | `UserAuth`(OTP)·`index.php`·`Crypto` | 실재(재사용) |
| Audit | 해시체인 | `SecurityAudit.php` | 실재 |
| Continuous Improvement | 세션 로그·경쟁 이력·감사 순환 | `NEXT_SESSION.md`·`COMPETITIVE_SCORE_HISTORY.md` | PARTIAL-informal |

## 부재(ABSENT-formal) — 형식 ITIL 운영 도구 (grep 0)
Data Operations Center(형식) · Governance Center(형식) · **SLA Manager**(측정/보고) · **Capacity Manager**(예측 확장) · **Change Manager**(형식 ITIL 도구) · **Incident/Problem Manager**(형식) · Performance Manager · Operational Dashboard · Continuous Improvement Manager(형식) · Maintenance Window 관리 · Event 표준(OperationStarted 등).

## 판정
**PARTIAL / ABSENT-formal.** ★운영/변경/거버넌스 **프로세스**(`CHANGE_GATE`+배포 승인+안전배포 패턴·`CONSTITUTION`/registry·`Alerting`/`AnomalyDetection`·php-fpm 튜닝·`SecurityAudit`·무중단 배포)는 실 강하나(본 세션 워크플로우와 대응), **형식 ITIL Data Operations Center·SLA/Capacity/Change/Incident/Problem/Performance Manager·Operational Dashboard는 전무**. 실행은 선행 Part 001~011 + 형식 ITIL 운영 도구 신설 종속.
