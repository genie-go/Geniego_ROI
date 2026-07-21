# MEA Part 015 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 015 SPEC/ADR.

## 전수조사 방법
Rollup/Pnl/Attribution/CRM/Mmm/Alerting/kpi-registry/kpi-hierarchy/kpi-dependency/certification/threshold 키워드로 `backend/src` 전수 grep + 판독.

## 실존 substrate (★KPI 값 SSOT·인증/모니터링)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| KPI 값(SSOT) | ★서버 계산·단일소스 | `Rollup.php`·`Pnl.php`·`Attribution.php`·`CRM.php`·`Mmm.php` | PARTIAL-strong(값) |
| KPI Domain | 실 핸들러 12도메인 | (Financial=Pnl·Marketing=Mmm/Attribution·ROI=Rollup) | PARTIAL |
| KPI Certification | Trust First·NOT_CERTIFIED | 헌법 V3·`IMPLEMENTATION_STATUS.md`(Part 006/008) | PARTIAL(원칙) |
| KPI Monitoring/Threshold | 알림 정책 | `Alerting.php`(alert_policy·threshold) | PARTIAL |
| KPI Hierarchy(집계) | Enterprise가 채널/기간 집계 | `Rollup.php`(GROUP BY) | PARTIAL(집계 seed) |
| KPI Dependency | 무후퇴 동기화·lineage | 무후퇴 value unification·`DataPlatform`(lineage·Part 007) | PARTIAL-informal |
| KPI Governance(단일정의) | 무후퇴·변경 게이트 | 무후퇴 원칙·`CHANGE_GATE.md` | PARTIAL-strong(원칙) |
| KPI Quality Score | DataTrust | `DataPlatform.php`(Part 006) | PARTIAL |
| KPI Audit/Explainable | 해시체인·근거/신뢰도 | `SecurityAudit.php`·헌법 V4 | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 KPI Registry (grep 0)
KPI Registry(형식 metadata-driven) · KPI Repository(형식) · KPI Governance Engine · **KPI Dependency Manager**(형식 그래프) · **KPI Version Manager** · **KPI Certification Manager**(형식 5등급) · **KPI Hierarchy Manager**(형식) · KPI Monitoring Engine(형식) · KPI Dashboard Service(형식) · KPI AI Recommendation Engine · Event 표준(KPIRegistered 등) · Owner 지정(Part 001 Ownership 부재).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★KPI **값**은 서버 SSOT(`Rollup`/`Pnl`/`Attribution`/`CRM`/`Mmm`·무후퇴 단일소스·제품 핵심)·Certification(Trust First)·Monitoring(`Alerting`)·Hierarchy 집계(`Rollup`)·Governance(무후퇴/CHANGE_GATE)는 실재하나, **형식 metadata-driven KPI Registry·KPI Repository·Dependency/Version/Certification/Hierarchy Manager는 전무**(KPI 정의=코드 내재·Part 003/013 동일 판정). 실행은 선행 Part 001~014 + 형식 KPI Registry 신설(값 재계산 없이) 종속.
