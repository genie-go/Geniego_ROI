# MEA Part 014 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 014 SPEC/ADR.

## 전수조사 방법
Rollup/Pnl/Attribution/Mmm/CRM/currency/exchange-rate/formula-engine/formula-repository/scenario/expression-evaluat 키워드로 `backend/src`·`frontend` 전수 grep + 판독.

## 실존 substrate (★계산 엔진·결정론적 SSOT)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| ROI Calculation Engine(결정론) | ★명령형 계산·SSOT | `Rollup.php`·`Pnl.php`·`Attribution.php`·`Mmm.php`·`CRM.php` | PARTIAL-strong(엔진·값) |
| Metric Aggregation | GROUP BY 집계 | `Rollup.php`(Part 003) | PARTIAL-strong |
| Financial Calculation | VAT/gross·net profit/margin | `Pnl.php`(267차·역분개 263차) | PARTIAL-strong |
| Multi-Currency/Base Conversion | 통화 처리·변환 | `Pnl.php`·`CurrencyContext.jsx` | PARTIAL |
| Formula(코드 내재)/버전 | PHP 계산·git | `Rollup`/`Pnl`·git | PARTIAL(형식 Formula 아님) |
| Immutable Calculation History | append-only 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| Validation | DQM/Trust First·인라인 | Part 006·bounds | PARTIAL |
| Explainable Calculation | 근거/신뢰도 강제 | 헌법 V4 | PARTIAL |
| Scenario(부분) | Mmm frontier | `Mmm.php` | PARTIAL-informal |

## 부재(ABSENT-formal) — 형식 Formula 엔진 (grep 0)
ROI Calculation Engine(형식 단일 엔진) · **Formula Repository** · **Formula Execution Engine**(선언적 Expression) · **Formula Version Manager** · **Scenario Calculation Engine**(형식) · **Currency Conversion Engine**(Daily/Historical FX rate versioning·Exchange Rate Audit) · Formula Validation(형식)·Trace ID · Event 표준(CalculationStarted 등) · AI Optimization Engine(형식).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★ROI 계산 엔진(`Rollup`/`Pnl`/`Attribution`/`Mmm`/`CRM`·명령형·결정론적 SSOT·제품 핵심)·Financial(Pnl VAT/역분개)·Currency(CurrencyContext)·Aggregation(Rollup)·Immutable Calculation History(`SecurityAudit`)는 실재하나, **"Formula as Code" 선언적 Formula Engine·Formula Repository·Formula Version Manager·Scenario Calculation Engine·형식 Currency Conversion Engine(FX versioning)은 전무**(계산식 코드 내재·Part 013/003 동일 판정). 실행은 선행 Part 001~013 + 형식 Formula 엔진 신설(값 재계산 없이) 종속.
