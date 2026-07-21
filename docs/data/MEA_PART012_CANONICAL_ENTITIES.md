# MEA Part 012 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정(캡스톤) · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★CHANGE_GATE/registry/Alerting/AnomalyDetection/php-fpm/SecurityAudit 재사용·형식 ITIL 도구 greenfield·Part 001~011 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | DATA_OPERATION | 운영 절차(배포/sync/gc) | 배포 절차·cron | PARTIAL |
| 2 | OPERATION_POLICY | 운영 원칙·헌법 | `CONSTITUTION.md`·`CHANGE_GATE.md` | PARTIAL |
| 3 | GOVERNANCE_POLICY | 헌법·게이트 | `CONSTITUTION.md`·데이터 헌법 6볼륨 | PARTIAL-strong |
| 4 | SLA_POLICY | 부재(형식)·health | health check | PARTIAL-informal |
| 5 | INCIDENT | 알림·이상·버그 | `Alerting`·`AnomalyDetection`·`BUGS_TRACKING.md` | PARTIAL |
| 6 | PROBLEM | 근본원인·오탐 레지스트리 | 감사 오탐 레지스트리 | PARTIAL-informal |
| 7 | CHANGE_REQUEST | 변경 게이트+PM 승인 | `CHANGE_GATE.md`·`/v423/approvals` | PARTIAL-strong |
| 8 | RELEASE | 배포(안전배포 패턴) | git·배포 절차 | PARTIAL-strong |
| 9 | MAINTENANCE_WINDOW | 부재(형식) | — | ABSENT |
| 10 | PERFORMANCE_METRIC | KPI·health | `Rollup`·health | PARTIAL |
| 11 | CAPACITY_PLAN | php-fpm 튜닝 | php-fpm pool | PARTIAL-informal |
| 12 | OPERATION_AUDIT | 해시체인 감사 | `SecurityAudit.php` | PARTIAL-strong |
| 13 | OPERATION_REPORT | 세션 로그·PM 이력 | `NEXT_SESSION.md`·`PM_CURRENT_STATUS.md` | PARTIAL-informal |
| 14 | OPERATION_ALERT | 알림 | `Alerting.php` | PARTIAL |
| 15 | IMPROVEMENT_PLAN | 세션 계획·감사 순환 | `NEXT_SESSION.md`·`PM_PRIORITY_PLAN.md` | PARTIAL-informal |

## §6~§16 표준 판정
- **§6 운영 대상(14)**: MEA Part 002~011 전체 운영 통합. 각 Part 운영 정책 상속(재정의 금지).
- **§7 운영 정책**: 무중단 배포·변경 승인 필수·이력 보존(`SecurityAudit`/`ChangeHistory`)·장애 감지(`Alerting`) 실재.
- **§9 Change Management**: ★CHANGE_GATE+배포 승인+안전배포(php -l/post-deploy SHA/health/fatal/롤백)=세션 프로세스 대응·형식 Change Manager=ABSENT.
- **§10 Incident**: `Alerting`/`AnomalyDetection`/`BUGS_TRACKING`·형식 Incident/Problem Manager=ABSENT.
- **§11 Capacity**: php-fpm pool 튜닝(★502 오진 정정)·형식 Capacity Manager=ABSENT.
- **§8 SLA**: health/Data Freshness·형식 SLA Manager=ABSENT.
- **§12 Security**: MFA/RBAC/Crypto/writeGuard/SecurityAudit(Part 001~011 상속).
- **§16 AI**: 이상 패턴=`AnomalyDetection`·운영 정책 직접변경/승인 불가=헌법 V3+배포 승인. 예측/보고서=순신설. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§3·§7·§8 change·§12=Governance/Change Request/Release/Audit) / PARTIAL(§1·§2·§4~6·§10·§13~15) / ABSENT-formal(§9 Maintenance Window·형식 ITIL Ops Center/SLA/Incident/Capacity Manager).** 코드 0. ★CHANGE_GATE/registry/Alerting/AnomalyDetection/php-fpm/SecurityAudit 재사용(중복 변경관리/거버넌스/알림/감사 절대 금지)·형식 ITIL 운영 도구 신설·Part 001~011 상속·AI 운영 정책 직접변경/승인 불가(V3+배포 승인).
