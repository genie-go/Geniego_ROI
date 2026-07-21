# MEA Part 016 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Pnl(P&L 값)·Mmm(이익 최적화)·Attribution·CRM 재사용·형식 Profit Intelligence Engine greenfield·Part 013/014/015 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | PROFIT_MODEL | 코드 내재 P&L 조립식 | `Pnl.php`(components:89) | PARTIAL(형식 Model 아님) |
| 2 | PROFIT_RESULT | grossProfit/operatingProfit/netProfit | `Pnl.php`(:23~25) | PARTIAL-strong(값) |
| 3 | PROFIT_FACTOR | 비용 컴포넌트 | `Pnl.php`(:24) | PARTIAL |
| 4 | REVENUE_SOURCE | 주문/정산/구독 | `OrderHub`·`Pnl`·`Paddle` | PARTIAL |
| 5 | COST_CENTER | 부재(형식 Cost Center) | — | ABSENT-formal |
| 6 | COST_ELEMENT | 비용 컴포넌트(조립) | `Pnl.php`(:24) | PARTIAL(형식 Element 아님) |
| 7 | MARGIN | P&L 마진 | `Pnl.php` | PARTIAL |
| 8 | CONTRIBUTION_MARGIN | 부재(형식 공헌이익) | — | ABSENT |
| 9 | GROSS_PROFIT | revenue−cogs | `Pnl.php`(:23) | PARTIAL-strong |
| 10 | OPERATING_PROFIT | −광고/수수료/쿠폰/... | `Pnl.php`(:24) | PARTIAL-strong |
| 11 | NET_PROFIT | netPayout−cogs−... | `Pnl.php`(:25) | PARTIAL-strong |
| 12 | PROFIT_FORECAST | 이익곡선 PROFIT(T) | `Mmm.php`(frontier:349~352) | PARTIAL(seed) |
| 13 | PROFIT_SCENARIO | 부재(형식 What-if) | — | ABSENT-formal |
| 14 | PROFIT_ALERT | Margin Threshold | `Alerting.php` | PARTIAL |
| 15 | PROFIT_AUDIT | 해시체인 감사 | `SecurityAudit.php` | PARTIAL-strong |

## §6~§16 표준 판정
- **§6 Profit Domain(12)**: 실 핸들러 매핑(Enterprise/Product/Channel=Pnl/Rollup·Campaign=Attribution/Mmm·Customer=CRM LTV·모든 Profit 동일 계산기준=무후퇴). 형식 Domain 분류=순신설.
- **§7 분석 모델(10)**: Revenue/Cost/Margin/Trend=Pnl/Rollup 실재·Break-even/Variance/Sensitivity(형식)=ABSENT.
- **§8 Cost Intelligence(10)**: 비용=Pnl 컴포넌트 조립·CAC=Rollup·형식 Cost Center/Cost Element 테이블=ABSENT.
- **§9 Revenue Intelligence(10)**: Gross/Net=Pnl·Subscription=Paddle·채널별=Rollup/ChannelSync·Recurring/Commission 분해(형식)=부분.
- **§10 Attribution(8)**: Attribution(UTM/Coupon/Deeplink)·Channel/Campaign=Rollup/Mmm·형식 Profit Attribution(비용/이익 원인)=순신설.
- **§11 Forecast/Scenario(10)**: Mmm frontier(PROFIT(T)·T*·이익 예측 seed)·형식 Scenario/What-if/Best-Worst/Budget Comparison=ABSENT.
- **§12 Security**: Financial Encryption=Crypto·Tenant/RBAC/audit/Formula Protection(Part 001~015 상속).
- **§16 AI**: 이익 최적화=Mmm·비용 이상=AnomalyDetection·Profit OS=231차·Explainability=헌법 V4·AI Profit 직접변경/승인 불가=헌법 V3+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§2·§9·§10·§11 GROSS/OPERATING/NET_PROFIT·§15=이익 값/감사) / PARTIAL(§1·§3·§4·§6·§7·§12·§14) / ABSENT-formal(§5 COST_CENTER·§8 CONTRIBUTION_MARGIN·§13 PROFIT_SCENARIO·형식 Profit Intelligence Engine/Cost Center/Scenario/Forecast Engine).** 코드 0. ★P&L 값(`Pnl`)·이익 최적화(`Mmm`)·Attribution·CRM LTV 재사용(★중복 이익/비용/매출 계산 절대 금지)·형식 Profit Intelligence Engine 신설(값 재계산 없이)·Part 013/014/015 상속·AI Profit 직접변경/승인 불가(V3+CHANGE_GATE).
