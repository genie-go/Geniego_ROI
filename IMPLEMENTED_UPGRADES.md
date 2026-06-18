# IMPLEMENTED_UPGRADES.md

## 231차 완료(운영/데모 배포·헤드리스 검증·커밋)
1. DB DDL SSOT 일원화(app_setting·쿠폰·ai_settings·wms_supply_orders·channel_orders) — 분산정의 제거.
2. `Db::audit()` 감사 SSOT + 고가치 mutation 5곳 적용(ChannelSync 자격증명·Catalog·Wms).
3. 중복 컨트롤러 `PerformanceController` 제거(AdPerformance 이관) + composer 오토로더 정리.
4. 고아 페이지 2개 + `pages_backup/` 42파일 제거 + 루트 임시 144개 정리 + .gitignore.
5. `DemandForecast` 메뉴 노출(완성기능 surface, 15개국 라벨).
6. **Phase4 Logistics 배송비 순이익 정합**(kr_fee_rule.free_ship_threshold·무료배송기준·operatingProfit 가산·netProfit 불변).
7. AI 디자인 상세 매뉴얼(9스텝·15개국).
8. 멤버/파트너/관리자 사진 등록·조회(AvatarField·photo 컬럼).
9. 하위관리자 ADMIN 메뉴 열람/수정 2단계 권한(admin_menus 맵·adminMenuLevel).

★감사 오탐 5건 정정(tenant_id격리·응답포맷·알림디스패처·COGS·배송비). 전부 무후퇴.

## OS 디렉티브 예정(REMAINING_GAPS 순서)
Profit Health Score → Root Cause 처방 → What-if Scenario → Agent 권한모드 → Executive Copilot → 거버넌스 → 보안보강 → 역할별 View. 전부 기존 확장.
