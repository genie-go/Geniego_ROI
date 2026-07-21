# MEA Part 013 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 013 SPEC/ADR.

## 전수조사 방법
Rollup/Pnl/Attribution/Mmm/CRM/OrderHub/roi/roas/profit/margin/investment/kpi/financial-registry/formula-version 키워드로 `backend/src` 전수 grep + 판독.

## 실존 substrate (★ROI/KPI 값 SSOT 실재·제품 핵심)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| ROI/KPI 값 산출(SSOT) | ★서버 P&L SSOT+집계 | `Rollup.php`·`Pnl.php`(VAT/gross·net/operating) | PARTIAL-strong(값 SSOT) |
| Marketing ROI/ROAS | 어트리뷰션·마케팅믹스 | `Attribution.php`·`Mmm.php`(ROI frontier) | PARTIAL-strong |
| Customer ROI(LTV/CAC) | CRM(취소/반품 역분개) | `CRM.php` | PARTIAL-strong |
| Commerce/Enterprise ROI | 주문·P&L 롤업 | `OrderHub.php`·`Rollup.php` | PARTIAL |
| Financial Metric | Revenue/Profit/Margin/Cost/Investment | `Pnl.php`(VAT·해외광고비 VAT제외)·`PgSettlement.php` | PARTIAL-strong |
| ROI Governance(KPI 단일정의) | 무후퇴 value unification | `CONSTITUTION.md`·무후퇴 원칙 | PARTIAL-strong(원칙) |
| 계산식 변경 승인/이력 | 변경 게이트·감사 | `CHANGE_GATE.md`·`SecurityAudit.php` | PARTIAL-strong |
| Explainable ROI | 근거/신뢰도 강제 | 헌법 V4 | PARTIAL |
| Currency/Period | 통화·기간필터 | `CurrencyContext`·PeriodFilterBar | PARTIAL |

## 부재(ABSENT-formal) — 형식 ROI/KPI/Financial Registry (grep 0)
Enterprise ROI Platform(형식) · ROI Registry(형식) · **metadata-driven KPI Registry**(현행 KPI 정의=코드 내재) · **Financial Metric Registry**(형식) · ROI Metadata Repository(형식) · ROI Policy Manager(형식) · **Formula Version Manager** · **Baseline Manager** · ROI Dashboard Foundation(형식) · ROI AI Foundation(형식) · Event 표준(ROIModelRegistered 등). Cash Flow/Budget/Forecast Metric=부분/ABSENT.

## 판정
**PARTIAL-strong / ABSENT-formal.** ★ROI/KPI **값** 산출은 서버 SSOT로 실재·광범위 감사됨(`Rollup`/`Pnl`/`Attribution`/`Mmm`/`CRM`·값 무후퇴 단일소스·VAT/역분개=제품 핵심)하나, **형식 metadata-driven ROI/KPI/Financial Metric Registry·Formula Version/Baseline Manager는 전무**(값은 코드 내재 계산·Part 003 EDW 동일 판정). 실행은 선행 Part 001~012 + metric 정의 레지스트리 신설(값 재계산 없이) 종속.
