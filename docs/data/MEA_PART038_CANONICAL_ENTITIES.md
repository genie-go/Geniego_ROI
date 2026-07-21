# MEA Part 038 — Canonical Entities Design & Judgment (§5~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★OrderHub/Wms/Pnl 재사용·RMA 워크플로우/Pickup/Claims 순신설·Part 024/027/016 상속·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | RETURN_ORDER | 반품 상태(주문 기반) | `OrderHub`(RETURN_TOKENS:86) | PARTIAL-strong |
| 2 | RETURN_REQUEST | 반품요청 상태 | `OrderHub`(RETURN_TOKENS) | PARTIAL-strong |
| 3 | RETURN_ITEM | 반품 라인(주문 기반) | `OrderHub` | PARTIAL |
| 4 | PICKUP_REQUEST | 부재(회수 요청) | — | ABSENT |
| 5 | PICKUP_TASK | 부재(회수 배차·Driver 부재) | — | ABSENT |
| 6 | RETURN_REASON | 반품 사유(리뷰) | `Reviews.php` | PARTIAL |
| 7 | EXCHANGE_ORDER | 교환(매출중립 스왑) | `OrderHub`(EXCHANGE_TOKENS:89) | PARTIAL-strong |
| 8 | CLAIM | 부재(클레임) | — | ABSENT |
| 9 | REPAIR_ORDER | 부재(수리) | — | ABSENT |
| 10 | REFURBISHMENT_ORDER | 부재(리퍼) | — | ABSENT |
| 11 | DISPOSAL_ORDER | 부재(폐기·재입고만) | `Wms`(reflectChannelRestock) | PARTIAL-weak(Restock만) |
| 12 | RETURN_STATUS | 반품 상태 정규화 | `OrderHub`(claimType) | PARTIAL-strong |
| 13 | REVERSE_POLICY | 반품 정책(부분) | `OrderHub`·admin | PARTIAL |
| 14 | REVERSE_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | REVERSE_EXCEPTION | 사기성 반품·이상 | `AnomalyDetection` | PARTIAL |

## §6~§18 표준 판정
- **§6 Domain(10)**: Customer/Marketplace Return=OrderHub·Exchange=OrderHub(EXCHANGE). ★Warranty/Repair/Refurbishment/Recycling/Disposal=ABSENT.
- **§7 Lifecycle(10)**: Return Requested/상태=OrderHub·Warehouse Receiving=Wms(reflectChannelRestock)·Refund=OrderHub/Payment·Exchange=OrderHub. ★Pickup Scheduled/Inspection/Disposition=ABSENT.
- **§8 Returns(8)**: Return Request/상태=OrderHub(claimType SSOT)·Tracking=Logistics·returnFee=Pnl. ★형식 RMA(Authorization/Label/Window/Policy)=ABSENT.
- **§9 Pickup&Exchange(8)**: Exchange=OrderHub(EXCHANGE 스왑). ★Pickup Scheduling/Driver Assignment(Part 034)=ABSENT.
- **§10 Claims&Repair(8)**: ABSENT(형식 Claims/Repair 없음)·Claim Settlement seed=OrderHub/Payment(환불).
- **§11 Disposition(8)**: Restock=Wms(reflectChannelRestock). ★Refurbishment/Repair/Recycle/Disposal/Vendor Return/Donation/Salvage=ABSENT.
- **§12 Analytics(8)**: Return Rate=OrderHub·Reverse Cost=Pnl(returnFee)·ROI=Rollup/Pnl·Reason=Reviews. ★Refund Cycle Time/Recovery Rate=ABSENT.
- **§14 Security**: Tenant/RBAC/Customer Data(No-PII)/Encryption/Audit(Part 021 상속).
- **§18 AI**: 반품 가능성=CustomerAI·사기성=AnomalyDetection·사유=Reviews·Reverse Cost=Pnl·Explainability=헌법 V4·반품/환불/클레임 승인 자동 수행 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§2·§7·§12·§14=반품/교환/환불 상태/감사) / PARTIAL(§3·§6·§11 Restock·§13·§15) / ABSENT(§4·§5·§8·§9·§10 PICKUP/CLAIM/REPAIR/REFURBISHMENT·물리 RMA 워크플로우).** 코드 0. ★반품/교환/환불(`OrderHub` 매출 정합 SSOT)·재입고(`Wms`)·Reverse Cost(`Pnl` returnFee) 재사용(★중복 반품/교환/환불/returnFee 절대 금지·정본 재구현 금지)·RMA 워크플로우/Pickup 배차/Claims/Repair/Disposition 순신설(부재·자체 배차 운영 착수 시·과대주장 금지)·Part 024/027/016 상속·★AI 반품/환불/클레임 승인 자동 수행 불가(V3+V5+CHANGE_GATE).
