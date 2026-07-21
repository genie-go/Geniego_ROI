# MEA Part 013 — Canonical Entities Design & Judgment (§5~§15)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Rollup/Pnl/Attribution/Mmm/CRM 값 SSOT 재사용·형식 ROI/KPI 레지스트리 greenfield·Data Platform(Part 001~012) 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | ROI_DOMAIN | 실 도메인 핸들러 | `Mmm`/`OrderHub`/`Pnl`/`CRM`/`Wms` | PARTIAL(도메인 실재) |
| 2 | ROI_MODEL | 계산 로직(코드 내재) | `Rollup`/`Attribution`/`Mmm` | PARTIAL(형식 Model 아님) |
| 3 | ROI_METRIC | ROI/ROAS/Profit 지표 | `Rollup`/`Pnl`/`Attribution` | PARTIAL-strong(값) |
| 4 | ROI_KPI | ★코드 내재 KPI(값 SSOT) | `Rollup`/`Pnl`/`CRM` | PARTIAL-strong(값)·ABSENT(정의 레지스트리) |
| 5 | ROI_POLICY | 무후퇴·RBAC 정책 | 무후퇴 원칙·`index.php` | PARTIAL |
| 6 | ROI_CALCULATION | 집계/계산 | `Rollup`(GROUP BY)·`Pnl` | PARTIAL-strong |
| 7 | ROI_PERIOD | 기간필터 | PeriodFilterBar·기간 술어 | PARTIAL |
| 8 | ROI_TARGET | 목표(부분·목표퍼널) | (objective 퍼널) | PARTIAL-informal |
| 9 | ROI_RESULT | 계산 결과 | `Rollup`/`Attribution` | PARTIAL-strong |
| 10 | ROI_BASELINE | 부재(형식 Baseline)·env/git | git | ABSENT-formal(seed) |
| 11 | ROI_FORECAST | Mmm 예측(부분) | `Mmm.php`(frontier) | PARTIAL |
| 12 | ROI_AUDIT | 해시체인 감사 | `SecurityAudit.php` | PARTIAL-strong |
| 13 | ROI_DASHBOARD | 대시보드(값 표시·형식 Foundation 아님) | 프론트 대시보드 | PARTIAL |
| 14 | ROI_SCORE | ROI/DataTrust 점수 | `Attribution`·`DataPlatform` | PARTIAL |
| 15 | ROI_STATUS | 상태(부분) | 핸들러 상태 | PARTIAL-informal |

## §6~§15 표준 판정
- **§6 ROI Domain(12)**: 실 핸들러 매핑(Marketing=Mmm/Attribution·Commerce=OrderHub/Rollup·Financial=Pnl·Customer=CRM·Logistics=Wms·Enterprise=Rollup). 형식 Domain Registry=ABSENT.
- **§7 측정 원칙(8)**: Revenue/Profit/VAT/Cost/Investment/Period/Currency 실재(`Pnl`/`Rollup`/CurrencyContext). 추적=`DataPlatform` lineage.
- **§8 KPI 표준**: 값=SSOT·정의(Formula/Version)=코드 내재(metadata-driven Registry=ABSENT). Owner=신설.
- **§9 Governance**: KPI 단일 정의=무후퇴·계산식 변경 승인=CHANGE_GATE·이력=SecurityAudit. Formula Version/Baseline Manager=순신설.
- **§10 Financial(10)**: Revenue/Gross/Operating/Net Profit/Margin/Cost/Investment=`Pnl`(VAT·역분개). Cash Flow/Budget/Forecast=부분/ABSENT. 형식 Registry=순신설.
- **§15 AI**: KPI 이상=`AnomalyDetection`·ROI Explainability=헌법 V4·ROI 최적화=`Mmm`·계산식 직접변경/승인 불가=헌법 V3+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§3·§4·§6·§9·§12=ROI/KPI 값 SSOT·거버넌스·감사) / PARTIAL(§1·§2·§5·§7·§8·§11·§13·§14) / ABSENT-formal(§10 baseline·형식 ROI/KPI/Financial Metric Registry·Formula Version/Baseline Manager).** 코드 0. ★ROI/KPI 값 SSOT 재사용(★중복 계산 절대 금지)·형식 metric 정의 레지스트리/Formula Version/Baseline 신설(값 재계산 없이)·Data Platform(Part 001~012) 상속·AI 계산식 직접변경/승인 불가(V3+CHANGE_GATE).
