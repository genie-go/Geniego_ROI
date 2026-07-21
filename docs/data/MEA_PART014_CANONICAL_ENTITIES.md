# MEA Part 014 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Rollup/Pnl/Attribution/Mmm/CRM 계산 엔진·CurrencyContext·SecurityAudit 재사용·형식 Formula 엔진 greenfield·Part 013/Data Platform 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | ROI_FORMULA | 코드 내재 계산식 | `Rollup`/`Pnl`/`Attribution` | PARTIAL(형식 Formula 아님) |
| 2 | ROI_FORMULA_VERSION | git·API 버전 | git | PARTIAL-informal |
| 3 | ROI_CALCULATION_JOB | 롤업/집계 잡·cron | `Rollup.php`·cron | PARTIAL |
| 4 | ROI_CALCULATION_RESULT | 계산 결과(결정론적) | `Rollup`/`Attribution` | PARTIAL-strong |
| 5 | ROI_INPUT_PARAMETER | 기간/필터 파라미터 | 핸들러·PeriodFilterBar | PARTIAL |
| 6 | ROI_OUTPUT_RESULT | ROI/ROAS/Profit 출력 | `Rollup`/`Pnl` | PARTIAL-strong |
| 7 | ROI_METRIC_VALUE | 지표 값 | `Rollup`/`Pnl`/`Attribution` | PARTIAL-strong |
| 8 | ROI_FINANCIAL_VALUE | Revenue/Profit/Margin | `Pnl.php`(VAT/역분개) | PARTIAL-strong |
| 9 | ROI_SCENARIO | Mmm frontier(부분) | `Mmm.php` | PARTIAL-informal |
| 10 | ROI_CURRENCY_RATE | 통화 변환(FX 부분) | `CurrencyContext`·`Pnl` | PARTIAL |
| 11 | ROI_EXECUTION_LOG | sync/계산 로그·감사 | `SecurityAudit.php` | PARTIAL |
| 12 | ROI_CALCULATION_AUDIT | append-only 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 13 | ROI_ERROR | 오류(try/catch)·이상 | `AnomalyDetection.php` | PARTIAL |
| 14 | ROI_THRESHOLD | 임계(Alerting·부분) | `Alerting.php` | PARTIAL |
| 15 | ROI_VALIDATION_RESULT | DQM/인라인 검증 | Part 006 | PARTIAL |

## §6~§16 표준 판정
- **§6 계산 유형(10)**: 실 핸들러 계산(Marketing=Mmm/Attribution·Financial=Pnl·Commerce/Enterprise=Rollup). 동일 Runtime=순신설(형식 Single Engine).
- **§7 Formula 관리**: 계산식=코드 내재·버전=git·Approval=CHANGE_GATE. 형식 Formula Repository/Formula-as-Code/Version Manager=ABSENT.
- **§8 Workflow(10단계)**: 입력검증(Part 006)·Financial/ROI 계산(Pnl/Rollup)·Currency(CurrencyContext)·Audit(SecurityAudit). Formula 선택/Event=ABSENT.
- **§9 Currency**: Multi-Currency/Base Conversion=CurrencyContext/Pnl·Daily/Historical FX versioning/Exchange Rate Audit=순신설.
- **§10 Validation**: Part 006 DQM·Financial/KPI 검증. Formula/Scenario/Version Validation=순신설.
- **§11·§12 Audit/Security**: Immutable Calculation History=SecurityAudit·Formula Protection=git+G2. Part 001~013 상속.
- **§16 AI**: 입력/Financial 이상=AnomalyDetection·Explainable=헌법 V4·Scenario=Mmm·Formula 직접수정/승인 불가=헌법 V3+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§4·§6~8·§12=계산 결과/Metric/Financial 값/불변 감사) / PARTIAL(§1~3·§5·§9~11·§13~15) / ABSENT-formal(형식 Formula Repository/Formula-as-Code/Version Manager·Scenario/Currency Conversion Engine).** 코드 0. ★계산 엔진(Rollup/Pnl/Attribution)·결정론 SSOT·CurrencyContext·SecurityAudit 재사용(★중복 계산/집계/감사 절대 금지)·형식 Formula-as-Code 엔진 신설(값 재계산 없이)·Part 013/Data Platform 상속·AI Formula 직접수정/승인 불가(V3+CHANGE_GATE).
