# MEA Part 039 — Canonical Entities Design & Judgment (§5~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Logistics/ChannelSync/Catalog/Pnl seed 재사용(통관 아님·오흡수 금지)·통관 핵심 순신설·Part 031/029/016 상속·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | IMPORT_ORDER | 부재(수입 오더) | — | ABSENT |
| 2 | EXPORT_ORDER | 부재(수출 오더) | — | ABSENT |
| 3 | CUSTOMS_DECLARATION | 부재(통관 신고) | — | ABSENT |
| 4 | CUSTOMS_DOCUMENT | 원산지 seed(형식 서류 부재) | `Catalog`/st11(원산지) | PARTIAL-weak |
| 5 | HS_CODE | 부재(HS 코드) | — | ABSENT |
| 6 | COUNTRY_RULE | 부재(국가별 규정) | — | ABSENT |
| 7 | DUTY | 부재(관세·VAT≠관세) | — | ABSENT |
| 8 | TAX | VAT(관세 아님) | `Pnl`(VAT) | PARTIAL-weak(VAT만) |
| 9 | INTERNATIONAL_SHIPMENT | DHL 국제 추적 | `Logistics`(DHL·INTL) | PARTIAL(seed) |
| 10 | BORDER_CHECKPOINT | 부재(국경 검문) | — | ABSENT |
| 11 | TRADE_LICENSE | 부재(무역 라이선스) | — | ABSENT |
| 12 | CUSTOMS_STATUS | 부재(통관 상태) | — | ABSENT |
| 13 | COMPLIANCE_POLICY | 범용 컴플라이언스(무역 아님) | `Compliance` | PARTIAL-weak |
| 14 | CUSTOMS_AUDIT | 해시체인(신설 시) | `SecurityAudit.php` | PARTIAL(범용) |
| 15 | CUSTOMS_EXCEPTION | 범용 이상(대상 부재) | `AnomalyDetection` | ABSENT(대상 없음) |

## §6~§18 표준 판정
- **§6 Domain(10)**: International Parcel=Logistics(DHL)·글로벌 판매=ChannelSync. ★Customs Clearance/Bonded/FTA/International Warehouse=ABSENT.
- **§7 Lifecycle(10)**: International Transportation=Logistics(DHL)·Domestic Delivery=Logistics. ★Export/Import Declaration/Clearance/Documentation=ABSENT.
- **§8 Customs(8)**: Tax=Pnl(VAT·관세 아님). ★Customs Declaration/HS Code/Duty Calculation/Electronic Filing=ABSENT.
- **§9 Import/Export(8)**: Certificate of Origin seed=Catalog/st11(원산지). ★Commercial Invoice/Packing List/Export License=ABSENT.
- **§10 Trade Compliance(8)**: ABSENT(무역 규정 없음)·Compliance seed=Compliance(범용).
- **§11 International Carrier(8)**: Tracking=Logistics(DHL·INTL)·Registration=Wms/ChannelRegistry. ★Rate/Transit Time/SLA=ABSENT.
- **§12 Analytics(8)**: Freight Cost=Pnl(배송비)·ROI=Rollup/Pnl. ★Customs Clearance Time/Duty Cost/Compliance Rate=ABSENT.
- **§14 Security**: Tenant/RBAC/Encryption/Audit(신설 시 상속).
- **§18 AI**: 지연=AnomalyDetection·Explainability=헌법 V4·통관 신고 자동 제출/정부 승인 자동 수행 불가=헌법 V3+V5+CHANGE_GATE. HS Code 추천/관세 예측(통관 부재)=순신설. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§14 범용 AUDIT) / PARTIAL-weak(§4·§8·§9·§13 seed) / PARTIAL(§9 INTERNATIONAL_SHIPMENT) / ABSENT(§1·§2·§3·§5·§6·§7·§10~12·§15 IMPORT/EXPORT/CUSTOMS/HS_CODE/DUTY/COUNTRY_RULE·통관 전 계층).** 코드 0. ★국제 추적(`Logistics` DHL)·글로벌 판매(`ChannelSync`)·원산지(`Catalog`/st11)·VAT(`Pnl`·관세 아님) 재사용(통관 아님·오흡수 금지·★VAT≠관세)·Customs/HS Code/Duty/Trade Compliance 전부 순신설(부재·자체 통관 운영+통관/정부 API 후·과대주장 금지)·Part 031/029/016 상속·★AI 통관 신고 자동 제출/정부 승인 자동 수행 불가(V3+V5+CHANGE_GATE).
