# MEA Part 034 — Enterprise Fleet, Vehicle & Driver Management Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★부재증명 완료·과대주장 금지·ABSENT(near-total).

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART034_FLEET_VEHICLE_DRIVER_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§21 |
| 2 | ADR | `docs/architecture/ADR_MEA_FLEET_VEHICLE_DRIVER_ARCHITECTURE.md` | 결정 D-1~D-5 |
| 3 | GT① EXISTING | `docs/data/MEA_PART034_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART034_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART034_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§19 |
| 6 | GOVERNANCE | `docs/data/MEA_PART034_GOVERNANCE_MECHANISMS.md` | §7~§21 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART034_INDEX.md` | 본 문서 |

## 한 줄 판정
**ABSENT (near-total) / seed 극소.** ★현행 substrate=**거의 전무**: Fleet/Vehicle/Driver/Maintenance/Fuel/Telematics 전용 테이블·함수 부재(부재증명 완료·grep 0). 극소 seed=Partner Fleet(3PL 택배사·`Logistics`/`Wms` wms_carriers·소유 차량 아님)·Operating Cost(`Pnl` 배송비·연료비 아님)·Asset/Device(`WmsCctv` 창고 CCTV·차량 아님)뿐이며 **전부 Fleet 도메인이 아님(오흡수 금지)**. ★★핵심=**GeniegoROI는 3PL 택배사를 사용하는 e-커머스 ROI 플랫폼이지 자체 차량/기사 운영 물류사가 아니므로 Fleet/Vehicle/Driver 관리는 현 비즈니스 범위 밖**(과대주장 금지). ★도메인 전부 순신설(자체 Fleet 운영 착수 시·라이브 차량/GPS/기사 연동 필수)·마케팅 AI KEEP_SEPARATE·★AI 차량 자동 배정/운전자 자동 승인 불가(V3+V5). 코드 변경 0.

## 상속·다음
- 상속: Logistics Platform Foundation(Part 031)+TMS(Part 032)+WMS(Part 033)+ROI Platform(016 Profit)+헌법 V3/V4/V5.
- 다음: **MEA Part 035 — Enterprise Route Optimization & Dispatch Intelligence Architecture**(본 Fleet 상속·★Route Optimization 부재·`Wms::allocationPlan` geo seed만).

## ★Logistics Platform 진행 (Part 031~034)
Part 031 Logistics Foundation(ABSENT-heavy) · 032 TMS(ABSENT-heavy) · 033 WMS(★PARTIAL-strong) · **034 Fleet/Vehicle/Driver(ABSENT near-total·현 범위 밖)** → 다음 035 Route Optimization & Dispatch.
