# ADR — Entity Foundation Approval (EPIC 01-D)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (검증·계획·게이트 확정. 비파괴 — 코드변경 0). 실 통합/마이그레이션은 후속 승인·회귀테스트 후.
- **근거**: [`../entities/ENTITY_FOUNDATION_VALIDATION_REPORT.md`](../entities/ENTITY_FOUNDATION_VALIDATION_REPORT.md) + 실코드 재검증 3건(Plan·ROAS/CAC/LTV·OrderItem/격리) + EPIC 01-A/B/C.

## 맥락
EPIC 01-A/B/C의 Entity·Relationship을 실 코드/DB/API/UI/분석/자동화/권한과 대조 최종 검증하고, 중복을 기능 후퇴 없이 통합할 실행계획과 회귀 게이트를 확정한다. Knowledge Graph(EPIC 02)의 신뢰 Foundation 완성이 목적.

## 결정 (핵심)
1. **핵심 SSOT 승인**: Customer=crm_customers · Order=channel_orders · Inventory=wms_stock · Plan=plan_config(정의)+app_user.plan/plans(상태) · CAC=Rollup · LTV=CRM(환불차감) — 전부 실코드 tenant fail-closed 검증(APPROVED_CANONICAL).
2. **선행 주장 2건 정정**(§3.5 정직):
   - "Plan 4중 중복" → **과장**. plan_config(SaaS티어 SSOT)·plan_pricing(레거시KRW폴백)·billing_plan(별도 B2B)·subscription_packages(메뉴번들)은 목적 상이. `plan_catalog`는 부재. → 레거시 미정리(MEDIUM)로 강등, plan_pricing만 DEPRECATE.
   - "ROAS/CAC/LTV 이원" → **실질 ROAS만 이원**(3술어 혼재·P&L ROAS는 프론트 파생). CAC/LTV=백엔드 SSOT.
3. **VERIFIED-DEFECT(계획 대상, 이번 미수정)**:
   - **OrderItem 부재**: 다품목 주문이 line_items[0]만 저장(ChannelSync:413/1266/1356)→COGS/귀속 첫 SKU 몰림(OrderHub:190/210). +TikTok qty=count 버그(BACKLOG).
   - **재고 이중차감**(wms+channel), **ROAS 술어 혼재** → DUAL_READ/공용헬퍼 계획.
4. **보안/격리=PASS**: 3정본 테이블 tenant fail-closed·누출 0·웹훅 교차주입 차단. Critical=0.
5. **비파괴 게이트**: 삭제 없이 전략(§7)+마이그레이션(비파괴·Backfill·Rollback)+Compat(Deprecated Field 유지)+회귀 Baseline. 분석 수치 변동은 Baseline diff로 설명 못 하면 BLOCKED.

## 무후퇴·영구 규칙(§25)
신규 Entity/Relationship 생성 전: CE Registry·REL Registry·Alias/충돌·중복·tenant/권한·분석/자동화 영향 확인 → 생성 게이트 → ADR/PM 기록. Canonical 변경 시 회귀 Baseline+Migration/Rollback 필수. 미검증 항목을 AI/자동화 근거로 사용 금지.

## 결과
Entity Foundation = **APPROVED(조건부)**. 통합 대상 전략·비파괴 계획 확정, Critical Security/Isolation 0, BLOCKED 4 명시. 다음 **EPIC 02-A — Enterprise Knowledge Graph Inventory & Architecture Baseline** 입력자료 승인 완료.
