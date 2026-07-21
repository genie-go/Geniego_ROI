# MEA Part 036 — Canonical Entities Design & Judgment (§5~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Logistics/SmsMarketing/Reviews 재사용·자체 배송 실행/PoD 순신설·Part 031/026/025 상속·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | DELIVERY_ORDER | 주문(배송)·3PL | `OrderHub`·`Logistics` | PARTIAL |
| 2 | DELIVERY_TASK | 부재(자체 배송 작업) | — | ABSENT |
| 3 | DELIVERY_STOP | 부재(배송 정류) | — | ABSENT |
| 4 | DELIVERY_AGENT | 부재(배송원·Driver 부재) | — | ABSENT |
| 5 | DELIVERY_STATUS | 배송 상태 | `Logistics`(추적) | PARTIAL-strong |
| 6 | DELIVERY_SCHEDULE | 부재(배송 일정) | — | ABSENT |
| 7 | DELIVERY_WINDOW | 부재(배송 창) | — | ABSENT |
| 8 | PROOF_OF_DELIVERY | 부재(자체 PoD) | — | ABSENT |
| 9 | CUSTOMER_NOTIFICATION | 발송 게이트·알림 | `SmsMarketing`/`WebPush`/`CRM` | PARTIAL |
| 10 | DELIVERY_EXCEPTION | 범용 이상·escalation | `AnomalyDetection`·`Alerting` | PARTIAL |
| 11 | DELIVERY_FEEDBACK | 리뷰/피드백 | `Reviews.php` | PARTIAL-strong |
| 12 | DELIVERY_POLICY | 발송/게이트 정책 | `CRM`(발송 게이트) | PARTIAL |
| 13 | DELIVERY_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 14 | DELIVERY_SCORE | 만족도(리뷰) | `Reviews`·`CustomerAI` | PARTIAL |
| 15 | DELIVERY_EVENT | 추적 이벤트(3PL) | `Logistics` | PARTIAL |

## §6~§18 표준 판정
- **§6 Domain(10)**: Home Delivery=3PL(Logistics)·Reverse Pickup=OrderHub(반품). ★Same-Day/Express/Locker/Store Pickup/Contactless(자체)=부재.
- **§7 Lifecycle(10)**: Delivered/상태=Logistics·Feedback=Reviews. ★Driver Assigned/Loaded/Out for Delivery/Proof Confirmed(자체)=부재.
- **§8 Execution(8)**: ABSENT(자체 배송 실행 없음·Driver 부재)·OTP seed=UserAuth(계정 인증·배송 확인 아님·오흡수 금지).
- **§9 PoD(8)**: ABSENT(자체 PoD 없음·3PL 배송 완료 처리).
- **§10 Experience(8)**: Real-Time Tracking=Logistics·Notification=SmsMarketing/WebPush(발송 게이트)·Feedback=Reviews. ★Rescheduling/Driver Contact=부재.
- **§11 Exception(8)**: Delay/이상=AnomalyDetection·Failed/Return=OrderHub·Escalation=Alerting. ★Address Issue/Absence/Re-Delivery(자체)=부재.
- **§12 Analytics(8)**: Cost=Pnl(배송비)·Satisfaction=Reviews·On-Time seed=Logistics. ★First Attempt/Average Time/Productivity=부재.
- **§14 Security**: Tenant/RBAC/Encryption/★Customer Privacy(No-PII/Dsar)/Audit(Part 021 상속).
- **§18 AI**: 지연=AnomalyDetection·만족도=Reviews/CustomerAI·Explainability=헌법 V4·배송 완료 자동 승인/고객 응대 자동 확정 불가=헌법 V3+V5+CHANGE_GATE. 경로 재추천/생산성=순신설. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§5·§11·§13=상태/예외/감사·§11 Feedback) / PARTIAL(§1·§9 notif·§10·§12·§14·§15) / ABSENT(§2·§3·§4·§6·§7·§8 TASK/STOP/AGENT/SCHEDULE/WINDOW/PoD·자체 배송 실행).** 코드 0. ★추적(`Logistics`)·알림(`SmsMarketing`/발송 게이트)·피드백(`Reviews`) 재사용(★중복 추적/알림/피드백 절대 금지·발송 게이트 SSOT·정본 재구현 금지·OTP 오흡수 금지)·자체 배송 실행/PoD/Delivery Agent 순신설(자체 배송 운영 착수 시·과대주장 금지)·Part 031/026/025 상속·★AI 배송 완료 자동 승인/고객 응대 자동 확정 불가(V3+V5+CHANGE_GATE).
