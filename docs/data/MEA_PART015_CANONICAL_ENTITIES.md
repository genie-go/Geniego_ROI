# MEA Part 015 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Rollup/Pnl/Attribution/CRM/Mmm 값·Alerting·Trust First·무후퇴 재사용·형식 KPI Registry greenfield(1회만)·Part 013/014 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | KPI | ★코드 내재 KPI(값 SSOT) | `Rollup`/`Pnl`/`Attribution`/`CRM` | PARTIAL-strong(값)·ABSENT(레지스트리) |
| 2 | KPI_CATEGORY | Part 001 DATA_DOMAIN 분류 | (Part 001·§6 도메인) | PARTIAL |
| 3 | KPI_GROUP | 부재(형식 그룹) | — | ABSENT |
| 4 | KPI_FORMULA | 코드 내재 계산식 | `Rollup`/`Pnl`(Part 014) | PARTIAL(형식 Formula 아님) |
| 5 | KPI_TARGET | 목표(부분·목표퍼널) | (objective 퍼널) | PARTIAL-informal |
| 6 | KPI_THRESHOLD | 알림 임계 | `Alerting.php`(alert_policy) | PARTIAL |
| 7 | KPI_BASELINE | 부재(형식 Baseline)·git | git | ABSENT-formal(seed) |
| 8 | KPI_DEPENDENCY | 무후퇴·lineage | 무후퇴·`DataPlatform`(lineage) | PARTIAL-informal |
| 9 | KPI_VERSION | git·API 버전 | git | PARTIAL-informal |
| 10 | KPI_CERTIFICATION | Trust First·NOT_CERTIFIED | 헌법 V3·`IMPLEMENTATION_STATUS.md` | PARTIAL(원칙) |
| 11 | KPI_OWNER | 부재(Part 001 Ownership) | — | ABSENT-formal |
| 12 | KPI_SCORE | DataTrust 품질/ROI 점수 | `DataPlatform`·`Attribution` | PARTIAL |
| 13 | KPI_STATUS | NOT_CERTIFIED 라벨·상태 | `DSAR_APPROVAL_*`·enum | PARTIAL-informal |
| 14 | KPI_AUDIT | 해시체인 감사 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | KPI_REPORT | 대시보드/PM 이력 | 프론트·`PM_CURRENT_STATUS.md` | PARTIAL-informal |

## §6~§16 표준 판정
- **§6 KPI Domain(12)**: 실 핸들러 매핑(Financial=Pnl·Marketing=Mmm/Attribution·ROI=Rollup). 형식 Domain 분류=순신설.
- **§7 Lifecycle(7)**: 변경 게이트+PM 승인·Published=Trust First. 형식 Lifecycle Manager=ABSENT.
- **§8 Hierarchy(5)**: Rollup 집계(Enterprise가 채널/기간 집계)·형식 Hierarchy Manager=ABSENT.
- **§9 Dependency(8)**: 무후퇴(KPI→Metric)+lineage(Part 007)·형식 Dependency Graph=ABSENT.
- **§10 Certification(5등급)**: NOT_CERTIFIED+Trust First(Enterprise Certified만 ROI)·형식 Manager=ABSENT.
- **§11 Monitoring(10)**: Current=Rollup/Pnl·Threshold/Alert=Alerting·Quality=DataTrust·Freshness=lineage·Forecast=Mmm·형식 Engine=부분.
- **§12 Security**: RBAC/tenant/Formula Protection(G2)/audit(Part 001~014 상속).
- **§16 AI**: KPI 이상=AnomalyDetection·Explainability=헌법 V4·Forecast=Mmm·직접생성/수정/승인 불가=헌법 V3+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§10·§14=KPI 값/Certification/Audit) / PARTIAL(§2·§4~6·§8·§9·§12·§13·§15) / ABSENT-formal(§3·§7·§11 owner=§11·형식 KPI Registry/Dependency/Version/Certification/Hierarchy Manager).** 코드 0. ★KPI 값 SSOT·Trust First·Alerting·무후퇴 재사용(★중복 KPI 계산/인증/알림 절대 금지)·형식 KPI Registry 1회만 신설(값 재계산 없이)·Part 013/014 상속·AI KPI 직접생성/수정/승인 불가(V3+CHANGE_GATE).
