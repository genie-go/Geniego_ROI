# MEA Part 031 — Logistics Platform Foundation Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★신규 Logistics Platform 계열(Part 031~) 착수·Baseline. ★부재증명 완료(과대주장 금지).

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART031_LOGISTICS_PLATFORM_FOUNDATION_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§18 |
| 2 | ADR | `docs/architecture/ADR_MEA_LOGISTICS_PLATFORM_FOUNDATION_ARCHITECTURE.md` | 결정 D-1~D-5 |
| 3 | GT① EXISTING | `docs/data/MEA_PART031_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART031_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART031_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§16 |
| 6 | GOVERNANCE | `docs/data/MEA_PART031_GOVERNANCE_MECHANISMS.md` | §7~§18 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART031_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL-weak / ABSENT-heavy.** ★실재=Warehouse(`Wms`·205차·창고/할당/FEFO·Part 027)·Shipment Tracking(`Logistics`·스마트택배 CJ/롯데/한진/로젠/우체국·DHL Unified Tracking·shipment_tracking)·Warehouse geo routing seed(`Wms::allocationPlan`·geoCentroid)·물류 채널 통합(`ChannelRegistry` sync_kind='logistics')·배송비(`Pnl`)뿐이며, **물류 도메인 대부분(TMS/Fleet/Driver/Route Optimization/Hub/Cross Border/Reverse/Last Mile/Same Day)은 진짜 부재**(부재증명 완료·전용 handler grep 0·Commerce Platform과 대조·과대주장 금지). 형식 통합 Logistics Foundation(Service Registry/Event Bus/API Gateway)도 부재(모놀리식·Commerce Foundation Part 021 동형). ★중복 창고/배송추적 절대 금지(값 분산=회귀·재고 SSOT/추적 정본 재구현 금지)·부재 도메인 라이브 검증 후 구현 권장·마케팅 AI KEEP_SEPARATE·★AI 운영 정책 자동 변경/서비스 자동 배포 불가(V3+V5). 코드 변경 0.

## 상속·다음
- 상속: Commerce Platform(Part 021~030·Part 027 Inventory·024 OMS·029 Channel)+ROI Platform(013~020)+Data Platform(001~012)+헌법 V3/V4/V5.
- 다음: **MEA Part 032 — Enterprise Transportation Management System (TMS) Architecture**(본 Logistics Foundation 상속·대부분 신설·TMS 부재).

## ★MEA 계열 진행
Data Platform(001~012) → ROI Intelligence Platform(013~020 완료) → Commerce Platform(021~030 완료) → **Logistics Platform(031~ 착수·물류 도메인 대부분 신설 필요)**.
