# MEA Part 032 — Enterprise Transportation Management System (TMS) Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★부재증명 완료(과대주장 금지·Part 031 정합).

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART032_TMS_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§19 |
| 2 | ADR | `docs/architecture/ADR_MEA_TMS_ARCHITECTURE.md` | 결정 D-1~D-5 |
| 3 | GT① EXISTING | `docs/data/MEA_PART032_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART032_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART032_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§17 |
| 6 | GOVERNANCE | `docs/data/MEA_PART032_GOVERNANCE_MECHANISMS.md` | §7~§19 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART032_INDEX.md` | 본 문서 |

## 한 줄 판정
**ABSENT-heavy / PARTIAL-weak(seed만).** ★실재 seed=Carrier Registry(`Wms`·listCarriers/saveCarrier)·Route seed(`Wms::allocationPlan`·geoCentroid nearest warehouse·형식 최적화 아님)·Freight Cost seed(`Pnl`·shippingCost 채널별 정률·무료배송 기준)·Inter-Warehouse Transfer(`Wms::transferLotsFefo`)·배송 추적(`Logistics`·Part 031)·Exception(`AnomalyDetection`)·CCTV(`WmsCctv`)뿐이며, **TMS 핵심(운송 계획·배차·Fleet/Vehicle/Driver·운임율(Contract/Spot/Fuel/Toll)·GPS/ETA/Telematics)은 진짜 부재**(부재증명 완료·전용 handler·엔티티 grep 0·Part 031 정합·과대주장 금지). ★중복 창고/캐리어/배송비 절대 금지(값 분산=회귀·`Wms`/`Pnl` 정본 재구현 금지)·부재 도메인 라이브 검증(실제 차량/GPS 연동) 후 구현 권장·마케팅 AI KEEP_SEPARATE·★AI 운송 지시 자동 승인/배차 자동 확정 불가(V3+V5). 코드 변경 0.

## 상속·다음
- 상속: Logistics Platform Foundation(Part 031)+Commerce Platform(024 OMS·027 Inventory·029 Channel)+ROI Platform(016 Profit)+헌법 V3/V4/V5.
- 다음: **MEA Part 033 — Enterprise Warehouse Management System (WMS) Architecture**(본 TMS 상속·★WMS는 `Wms` 실 강함·Part 027 상세·ABSENT-heavy와 대조되는 PARTIAL-strong 예상).

## ★Logistics Platform 진행 (Part 031~032)
Part 031 Logistics Foundation(ABSENT-heavy) · **032 TMS(ABSENT-heavy·seed만)** → 다음 033 WMS(Wms 실 강함 예상).
