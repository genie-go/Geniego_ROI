# MEA Part 027 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Inventory 신설이 기존 재고(`Wms`)·Part 021/024와 중복 재정의하지 않도록 경계 확정. ★재고=앱 최강 도메인으로 중복 위험 최상.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| INVENTORY/Stock | ★MEA Part 021 Commerce·Part 024 OMS·`Wms` | ★재정의 금지·재사용 |
| Replenishment Forecast | ★MEA Part 017 Forecast·`DemandForecast` | ★재정의 금지·재사용 |
| FEFO COGS/Inventory ROI | ★MEA Part 016 Profit·`Wms`(fefoCogsForRef)/`Pnl` | ★재정의 금지·재사용 |
| Inventory Metadata | MEA Part 004 Metadata | 참조·재사용 |
| Marketplace Inventory | ★데이터 헌법(채널)·`ChannelSync` | 참조·재정의 금지 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 재고/LOT/FEFO/COGS 도메인 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| 재고 마스터(on_hand) | wms_stock SSOT | `Wms.php`(wms_stock) | ★재사용(★중복 재고 신설 절대 금지·값 분산=회귀) |
| LOT/FEFO | 유효기간 출고 | `Wms.php`(consumeLotsFefo) | ★재사용(★중복 FEFO 금지) |
| FEFO COGS | 원가 산출 | `Wms.php`(fefoCogsForRef) | ★재사용(★중복 원가 계산 절대 금지·P&L 연계) |
| 할당/이동 | allocate·movements | `Wms.php` | ★재사용(중복 할당/이동 금지) |
| Replenishment | 수요예측 | `DemandForecast`·`RuleEngine`(reorder) | 재사용(중복 예측/보충 금지) |
| Warehouse Access | 가드 | `Wms.php`(guardWarehouse) | 재사용 |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: 재고/COGS 단일 정의·값 무후퇴=★중복 재고/LOT/FEFO/COGS 도메인 절대 금지(값 분산=회귀).
- ★`Wms` wms_stock SSOT·재고 필드 정본(286차 prdSelQty·wh_id 폴백 병합)·재고 델타 자동 푸시(283차)=정본·재구현 금지.
- ★FEFO COGS(fefoCogsForRef)=P&L COGS 연계 Financial 정본(Part 016·재구현 금지).
- ★Replenishment=`DemandForecast`(Part 017)+`RuleEngine`(reorder) 재사용·중복 예측/보충 엔진 금지.
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant Inventory Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: Inventory Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- 재고=`Wms`(wms_stock) 승격(재고 재구현 금지·Inventory Master Repository SSOT). LOT/FEFO/COGS=`Wms`. Replenishment=`DemandForecast`/`RuleEngine`. Audit=`SecurityAudit`+wms_movements.

## 판정
**중복 위험 최상(재고=앱 최강 도메인·전 재고 실재).** ★핵심=`Wms`(wms_stock SSOT·LOT/FEFO·FEFO COGS·할당·이동·Bin·조정·orphan 병합)·`DemandForecast`(Replenishment)·`RuleEngine`(reorder)·`SecurityAudit`는 **재사용/승격**(★중복 재고/LOT/FEFO/COGS 도메인 신설 절대 금지=값 분산=무후퇴 위반·재고 SSOT/FEFO COGS 정본 재구현 금지). Part 021 Commerce·Part 024 OMS·Part 017 Forecast·Part 016 Profit·데이터 헌법·헌법 **재정의 금지**. 본 Part 고유 순신설=형식 Stock Reservation Engine(Expiration/Release/Backorder)·Replenishment Engine(Safety Stock/Reorder Point/Min-Max)·Serial Number 추적·형식 Inventory Analytics·Cycle Count/Physical Inventory·Event 표준뿐. 마케팅 AI KEEP_SEPARATE·★AI 재고 수량 직접 변경/자동 승인 불가(V3+V5+CHANGE_GATE).
