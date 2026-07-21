# MEA Part 035 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Route Optimization 신설이 기존 warehouse selection(`Wms`)·배송비(`Pnl`)·추적(`Logistics`)과 오흡수/중복하지 않도록 경계 확정. ★중복 위험 국소(warehouse selection seed만·Route 핵심 순신설).

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| Warehouse Selection | ★MEA Part 027/033·`Wms`(allocationPlan) | ★재정의 금지·재사용(route optimization 아님) |
| Dispatch | ★MEA Part 032 TMS·Part 034 Fleet(부재) | 참조·순신설 |
| Route Cost/배송비 | ★MEA Part 016 Profit·`Pnl`(shippingCost) | ★재정의 금지·재사용 |
| 배송 추적/ETA 표시 | ★MEA Part 031 Logistics·`Logistics` | ★재정의 금지·재사용 |
| 좌표/geo | ★`Wms`(geoCentroid/haversine) | 참조·재사용 |

## ★동음이의(코드베이스) — 오흡수 금지 (★warehouse selection≠route optimization)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Warehouse Selection | haversine nearest | `Wms::allocationPlan`(:1014) | 재사용·★오흡수 금지(single-hop·multi-stop route 아님) |
| Route Cost | 배송비 | `Pnl`(shippingCost) | ★재사용(중복 배송비 금지) |
| 배송 추적/ETA 표시 | 택배사 추적 | `Logistics.php` | 재사용·★오흡수 금지(자체 ETA 예측 아님) |
| SLA/지연 잠재 | 범용 이상 | `AnomalyDetection` | 대상 부재·직접 미적용 |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- ★[[feedback_competitive_gap_verify]]: 갭 주장 전 부재증명·★Route Optimization/Dispatch/ETA/Traffic 부재=부재증명 완료(grep 0·과대주장 금지).
- ★"코드 존재≠구현 완료"(283차)·★역방향: `Wms::allocationPlan`(warehouse selection)을 route optimization으로 오흡수 금지(single-hop≠multi-stop sequencing).
- ★비즈니스 모델: 3PL 택배사 사용→경로 최적화는 택배사 담당·현 범위 밖(Part 031/032/034 정합).
- ★`Wms::allocationPlan`(창고 선택)·`Pnl`(배송비)·`Logistics`(추적)=정본·재구현/오흡수 금지.
- [[reference_platform_growth_actas_tenant_hijack]]: (신설 시)Cross-Tenant Route Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: Route Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지 / 순신설)
- Warehouse Selection=`Wms` 재사용(route optimization 아님). 배송비=`Pnl`. 추적=`Logistics`. ★Route Optimization(multi-stop)/Dispatch/ETA Prediction/Traffic Intelligence/Load Planning=전부 순신설(부재·자체 배송 운영+External Map API 후).

## 판정
**중복 위험 국소(warehouse selection seed만·Route 핵심 순신설).** ★핵심=`Wms::allocationPlan`(창고 선택·haversine)·`Pnl`(배송비)·`Logistics`(추적)·`SecurityAudit`는 **재사용하되 Route Optimization 도메인이 아님(오흡수 금지·warehouse selection≠route optimization·택배사 추적≠자체 ETA 예측)**. Part 027/033 Warehouse·Part 032 TMS·Part 034 Fleet·Part 016 Profit·Part 031 Logistics·헌법 **재정의 금지**. 본 Part 고유 순신설=★Route Optimization Engine(Shortest Path/multi-stop sequencing)·Dispatch Intelligence·ETA Prediction Engine·Traffic Intelligence·Load Planning·Delivery Sequence(전부 부재·부재증명 완료)뿐. ★★자체 배송/Fleet 운영 + External Map API/GPS 연동 후에만 구현(3PL 사용 현 범위 밖·과대주장 금지)·마케팅 AI KEEP_SEPARATE·★AI 차량 운행 직접 제어/배차 자동 확정 불가(V3+V5+CHANGE_GATE).
