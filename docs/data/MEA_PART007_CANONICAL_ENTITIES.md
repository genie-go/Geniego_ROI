# MEA Part 007 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★DataPlatform data_source/lineage·SecurityAudit·CHANGE_GATE 재사용·형식 그래프/Impact 엔진 greenfield·Part 001~006 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | DATA_LINEAGE | ★분석→원천 계보 | `DataPlatform.php:316`(data-lineage) | PARTIAL-strong |
| 2 | LINEAGE_NODE | 소스/분석 노드 | `DataPlatform`(data_source·분석도메인) | PARTIAL |
| 3 | LINEAGE_EDGE | 원천↔분석 관계 | `DataPlatform`(lineage) | PARTIAL(형식 그래프 아님) |
| 4 | DATA_TRANSFORMATION | 정규화규칙 | `DataPlatform`·`ChannelSync`(정규화) | PARTIAL |
| 5 | DATA_PROVENANCE | ★출처 카탈로그 | `DataPlatform.php:61`(data_source·source/credential/priority) | PARTIAL-strong |
| 6 | DATA_DEPENDENCY | KPI→Metric(Rollup) | `Rollup`/`Pnl`(Part 003) | PARTIAL(형식 그래프 아님) |
| 7 | IMPACT_ANALYSIS | 변경 게이트+무후퇴 인식 | `CHANGE_GATE.md`·무후퇴 동기화 | PARTIAL-informal(자동 엔진 아님) |
| 8 | CHANGE_REQUEST | 변경 게이트·PM 승인 | `CHANGE_GATE.md`·`/v423/approvals` | PARTIAL |
| 9 | ROOT_CAUSE | 이상탐지·오탐 레지스트리 | `AnomalyDetection.php`·감사 오탐 레지스트리 | PARTIAL(형식 Analyzer 아님) |
| 10 | LINEAGE_VERSION | git·신선도 | git·`DataPlatform`(freshness) | PARTIAL |
| 11 | LINEAGE_GRAPH | 부재(형식 그래프) | — | ABSENT |
| 12 | EXECUTION_PATH | 부재 | — | ABSENT |
| 13 | DATA_FLOW | lineage 흐름(비형식) | `DataPlatform` | PARTIAL(형식 아님) |
| 14 | IMPACT_REPORT | 부재(형식 Report) | — | ABSENT |
| 15 | CHANGE_APPROVAL | CHANGE_GATE+PM 승인 | `CHANGE_GATE.md`·`AgencyPortal` | PARTIAL |

## §6~§16 표준 판정
- **§6 Lineage 대상(12)**: Source System=`DataPlatform` data_source·KPI/ROI=`Rollup`/`Attribution`(Part 003)·API=routes. Data Lake/Feature Store/Event Bus=Part 002 미래.
- **§7 Dependency(10)**: DataPlatform lineage(분석→원천)·KPI→Metric(Rollup). Column/API/Event 그래프=ABSENT.
- **§8 Impact Analysis**: `CHANGE_GATE`+무후퇴 value unification(변경-영향 인식 원칙). 형식 자동 Impact Engine=ABSENT.
- **§9 Root Cause**: `AnomalyDetection`+감사 오탐 레지스트리 seed·형식 Analyzer=ABSENT.
- **§10 Provenance(10)**: ★`DataPlatform` data_source registry(source/credential/priority)+`SecurityAudit`(Approval/변경 이력)+헌법 출처 기록.
- **§11 Visualization**: **ABSENT**(프론트 신설).
- **§12 Security**: Read-Only/삭제금지=`SecurityAudit`(append-only)·Part 001~006 상속.
- **§16 AI**: 이상 경로=`AnomalyDetection`·Explainability=헌법 V4·Lineage 변경/삭제 불가=SecurityAudit+헌법 V3. Dependency 탐지/영향도 예측=순신설. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§5=DataPlatform lineage/data_source·불변) / PARTIAL(§2~4·§6~10·§13·§15) / ABSENT-formal(§11·§12·§14=Lineage Graph/Execution Path/Impact Report·Visualization).** 코드 0. ★DataPlatform(data_source/lineage)·SecurityAudit·CHANGE_GATE+무후퇴 재사용(중복 신설 절대 금지)·형식 그래프/Impact/Root Cause 엔진 신설·Part 001~006 상속·AI Lineage 변경/삭제 불가(헌법 V3).
