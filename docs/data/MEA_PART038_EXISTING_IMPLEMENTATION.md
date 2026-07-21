# MEA Part 038 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 038 SPEC/ADR. ★부재증명 완료·과대주장 금지.

## 전수조사 방법
return/restock/refund/claim/exchange/disposition/refurbish/rma/pickup 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★반품/교환/환불 상태·회계 실재·물리 워크플로우 부재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| 반품 상태(SSOT) | RETURN_TOKENS·정규화 | `OrderHub.php`(RETURN_TOKENS:86·claimType·219 하드닝) | PARTIAL-strong |
| 교환(매출중립) | EXCHANGE_TOKENS·스왑 | `OrderHub.php`(EXCHANGE_TOKENS:89) | PARTIAL-strong |
| 환불 | 환불완료·역분개 | `OrderHub`(268차)·`Payment`(cancel) | PARTIAL-strong |
| 재입고(Restock) | 반품 재입고 | `Wms`(reflectChannelRestock·Part 024/027) | PARTIAL-strong |
| Reverse Cost(returnFee) | 반품비·operatingProfit 차감 | `Pnl.php`(returnFee:24·return_fee:123·rfee:208) | PARTIAL-strong |
| Return Tracking | 택배사 추적 | `Logistics.php` | PARTIAL |
| Return Rate | 반품률 | `OrderHub`(RETURN_TOKENS·Rollup) | PARTIAL |
| Return Reason | 리뷰/사유 | `Reviews.php` | PARTIAL |
| 사기성 반품 | 이상 탐지 | `AnomalyDetection.php` | PARTIAL |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·전용 handler/워크플로우 grep 0)
★**형식 RMA 워크플로우**(Return Authorization/Label Generation/Window Validation/Policy Validation Engine)·**Pickup Scheduling/Driver Assignment**(Driver 부재·Part 034·3PL 회수)·**Claims Management**(Damage/Lost/Warranty/Insurance Claim·Repair Request·Claim Settlement)·**Repair/Refurbishment**·**Disposition Management**(Refurbishment/Recycle/Disposal/Vendor Return/Donation/Salvage·Restock 외)·RETURN_ORDER/PICKUP_TASK/CLAIM/REPAIR_ORDER 형식 엔티티·Event 표준(PickupScheduled/ClaimCreated 등).

## 판정
**PARTIAL / ABSENT-formal(RMA·Pickup·Claims·Repair·Disposition).** ★실재=반품/교환/환불 상태·회계(`OrderHub`·RETURN_TOKENS/EXCHANGE_TOKENS·claimType 정규화 SSOT·219 하드닝·매출포함+returnFee·교환 매출중립·268차 역분개)·재입고(`Wms::reflectChannelRestock`)·Reverse Cost(`Pnl` returnFee 정본)·Return Tracking(`Logistics`)·Return Rate(`OrderHub`)·사유(`Reviews`)이나, **형식 RMA 워크플로우·Pickup 배차·Claims·Repair/Refurbishment·Disposition은 부재**(부재증명 완료·grep 0). ★★핵심=**반품/교환/환불은 회계·상태 정합 SSOT로 실재이나 물리적 reverse logistics 워크플로우는 부재**(3PL 회수·자체 배차 부재·Part 034/036 정합·과대주장 금지). 실행은 형식 RMA/Claims 워크플로우 신설 종속.
