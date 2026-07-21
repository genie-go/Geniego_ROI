# MEA Part 031 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Wms/Logistics/ChannelRegistry 재사용·물류 도메인 대부분 순신설(부재증명)·Commerce Platform 상속·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | LOGISTICS_ORDER | 부재(형식 물류 오더) | — | ABSENT |
| 2 | SHIPMENT | 배송/출고 | `Wms`·`OrderHub`·`Logistics` | PARTIAL |
| 3 | DELIVERY | 배송추적 | `Logistics.php` | PARTIAL |
| 4 | TRANSPORT | 부재(운송 TMS) | — | ABSENT |
| 5 | ROUTE | geo routing seed(형식 부재) | `Wms.php`(allocationPlan/geoCentroid:974) | PARTIAL-weak(seed) |
| 6 | VEHICLE | 부재(Fleet) | — | ABSENT |
| 7 | DRIVER | 부재(Driver) | — | ABSENT |
| 8 | WAREHOUSE | 창고 | `Wms.php`(Part 027) | PARTIAL-strong |
| 9 | HUB | 부재(Hub) | — | ABSENT |
| 10 | CUSTOMER | 고객(Commerce 상속) | `CRM`(Part 025) | PARTIAL |
| 11 | PARTNER | 파트너 | `PartnerPortal` | PARTIAL |
| 12 | CARGO | 화물(창고 재고 준함) | `Wms`(wms_stock) | PARTIAL-weak |
| 13 | TRACKING_EVENT | 추적 이벤트 | `Logistics.php`(track) | PARTIAL-strong |
| 14 | LOGISTICS_POLICY | 부재(형식 정책) | — | ABSENT |
| 15 | LOGISTICS_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## §6~§16 표준 판정
- **§6 Domain(10)**: Warehouse=Wms·Distribution=Wms(allocationPlan)·배송추적=Logistics. ★Transportation/Fleet/Route/Cross Border/Reverse/Same Day/Last Mile=ABSENT(부재증명).
- **§7 Layer(8)**: API=index.php·Data=Db·Integration=ChannelRegistry(logistics)·형식 계층 분리(물류 전용)=부분.
- **§8 Core Services(8)**: Warehouse=Wms·Tracking=Logistics·Notification=Mailer/Sms·Order=OrderHub. ★Route/Fleet/Driver Service=ABSENT.
- **§9 Integration(8)**: REST=index.php·OMS/Commerce=OrderHub/Wms·물류 채널=ChannelRegistry·GraphQL/Kafka=부재.
- **§10 Runtime(8)**: 인프라 nginx/php-fpm·Cache=Rollup·★Service Discovery/Circuit Breaker/Failover=부재(모놀리식).
- **§12 Security**: Tenant/RBAC/Encryption/Secret/Audit(Commerce 상속)·Zero Trust=부분.
- **§16 AI**: 이상=AnomalyDetection·물류 KPI=Rollup/Pnl(배송비)·Explainability=헌법 V4·운영 정책 자동 변경/자동 배포 불가=헌법 V3+V5+CHANGE_GATE. 리소스/자동 확장(인프라)=부재. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§8 WAREHOUSE·§13 TRACKING·§15 AUDIT) / PARTIAL(§2·§3·§5·§10~12) / ABSENT(§1·§4·§6·§7·§9·§14 LOGISTICS_ORDER/TRANSPORT/VEHICLE/DRIVER/HUB/POLICY·형식 통합 Logistics Foundation).** 코드 0. ★창고(`Wms`)·배송추적(`Logistics`) 재사용(★중복 창고/추적 절대 금지·재고 SSOT/추적 정본 재구현 금지)·물류 도메인 대부분(TMS/Fleet/Driver/Route/Hub) 순신설(부재증명·과대주장 금지·라이브 검증 후)·Commerce Platform 상속·★AI 운영 정책 자동 변경/서비스 자동 배포 불가(V3+V5+CHANGE_GATE).
