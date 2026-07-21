# MEA Part 033 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = WMS 신설이 기존 창고(`Wms`)·Part 027 Inventory와 중복 재정의하지 않도록 경계 확정. ★★Part 027(Inventory)와 Part 033(WMS)은 동일 `Wms` handler=관점 분리 필수(중복 위험 최상).

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| ★재고 SSOT/FEFO | ★MEA Part 027 Inventory·`Wms`(wms_stock/FEFO) | ★재정의 금지·재사용(관점 분리) |
| Warehouse/Fulfillment | ★MEA Part 024 OMS·`Wms`/`OrderHub` | ★재정의 금지·재사용 |
| Warehouse ROI | ★MEA Part 016 Profit·`Rollup`/`Pnl`(FEFO COGS) | ★재정의 금지·재사용 |
| Carrier | ★MEA Part 032 TMS·`Wms`(wms_carriers) | 참조·재사용 |
| Warehouse geo routing | ★MEA Part 031 Logistics·`Wms`(allocationPlan) | 참조·재사용 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 창고/재고/Bin/FEFO 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| 창고 운영(입고/적치/피킹) | wms_movements/putAway/picking | `Wms.php` | ★재사용(★중복 창고 운영 신설 절대 금지) |
| 재고 SSOT | on_hand | `Wms.php`(wms_stock) | ★재사용(★중복 재고 절대 금지·Part 027) |
| Bin/Location | zone/aisle/rack | `Wms.php`(wms_bins) | ★재사용(중복 bin 금지) |
| FEFO/LOT | 유효기간 | `Wms.php`(consumeLotsFefo) | ★재사용(★중복 FEFO/COGS 절대 금지) |
| 창고 RBAC | warehouse별 role | `Wms.php`(wms_permissions) | 재사용 |
| CCTV/IoT | 온프렘 브리지 | `WmsCctv.php`(274차) | 재사용 |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: 창고/재고/Bin/FEFO 단일 정의·값 무후퇴=★중복 절대 금지(값 분산=회귀).
- ★★Part 027(Inventory)=재고 관점·Part 033(WMS)=창고 운영 관점·동일 `Wms` handler=관점 분리(중복 정의 금지·같은 테이블 재정의 금지).
- ★`Wms` 재고 SSOT(wms_stock·286차)·FEFO COGS(Part 027·P&L 연계)=정본·재구현 금지.
- ★[[feedback_competitive_gap_verify]]: 고급 기능(ASN/RFID/Wave Picking/IoT/Robotics) 부재=부재증명(과대주장 금지·라이브 장비 연동 후 구현).
- ★WMS 발주 원가₩0(287차)·priceopt/wms sqlite 소유권(273차)=수정 이력·재발 방지.
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant Warehouse Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: Warehouse Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- 창고 운영=`Wms` 승격(창고 재구현 금지·관점 분리). 재고/FEFO=`Wms`(Part 027). Bin=`Wms`. ★ASN/RFID/Wave Picking/Packing 워크플로우/Dock Scheduling/IoT=순신설(고급·라이브 검증 후).

## 판정
**중복 위험 최상(★Part 027과 동일 `Wms`·창고 운영 실재).** ★핵심=`Wms`(창고 운영·재고 SSOT·Bin·FEFO·창고 RBAC)·`WmsCctv`(CCTV)·`Rollup`/`Pnl`(Warehouse ROI)·`SecurityAudit`는 **재사용/승격**(★중복 창고/재고/Bin/FEFO 신설 절대 금지=값 분산=무후퇴 위반·재고 SSOT/FEFO COGS 정본 재구현 금지·Part 027 관점 분리). Part 027 Inventory·Part 024 OMS·Part 016 Profit·Part 032 TMS·Part 031 Logistics·헌법 **재정의 금지**. 본 Part 고유 순신설=고급 WMS 기능(ASN/RFID/형식 QC/Wave·Batch·Zone·Cluster Picking/Pick-to-Light·Voice/Packing 워크플로우/Dock Scheduling/Cold Storage·Bonded·Automated 유형/Cross-Dock/IoT·Robotics/형식 Cycle Count)뿐. ★과대주장 금지·마케팅 AI KEEP_SEPARATE·★AI 창고 작업 자동 승인/재고 직접 이동 불가(V3+V5+CHANGE_GATE).
