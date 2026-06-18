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

## AI Profit OS 구현(진행)
- ✅ **#1 Profit Health Score**(PnLDashboard 신규 🩺 탭): 순이익 건강점수(0-100)+Green/Yellow/Red 판정 7지표(매출총이익률·영업이익률·원가율·광고비율·배송비율·반품비율·수수료율)+개선 우선순위 힌트. 순수 pnlStats 파생(스키마변경0·무위험). 운영/데모 배포·헤드리스 검증.

- ✅ **#2 Root Cause**(PnLDashboard 🚨 탭 실연결): 순이익 워터폴 분해(원가·광고·수수료·배송·반품·쿠폰 큰순 잠식 진단)+채널 이상신호(AnomalyDetection scan best-effort)+권장조치 딥링크(가격최적화·자동마케팅·연동허브·반품포털). ActionTab→/approvals 승인센터 연결. 스텁→실분석 전환. 무위험(live 파생). 배포·검증.

- ✅ **#3 What-if Scenario**(PnLDashboard ForecastTab): 실제 워터폴(live) 기반 시나리오 빌더 — 매출/판매량±·광고비±·원가±·배송비±·반품비± 레버 → 현재 대비 순이익 영향(Δ금액·Δ%·마진) 즉시 계산. 매출변동=변동비 비례 모델. 기본0=baseline 일치(무서프라이즈). 무위험(live 파생). 배포·검증.

- ✅ **#4 Agent 권한모드**: app_user.agent_mode(ALTER·양DB·기본 approval) + 로그인페이로드·AuthContext 노출 + PATCH /auth/profile(owner/master-admin 게이트·감사) + AdAdapters.agentMode/agentAutoAllowed(owner행·기본 approval=자율차단) + AgentModeCard UI(recommend/approval/auto·auto 경고확인·소유자전용). 기본 approval=현행 안전동작(무후퇴). 배포·검증.

- ✅ **#5 Executive AI Copilot**(AIInsights 확장): Executive Briefing 카드(순이익·마진·매출·ROAS 근거 KPI + 최대 잠식비용 Root Cause + 개선페이지 딥링크) + 경영진 프리셋(CEO/CFO/CMO/COO 5문항) + ClaudeAI analyze에 실 pnlStats grounding(기존 빈data→실 워터폴 전달). 신규 AI메뉴 X. 무위험(live 파생+기존 ClaudeAI). 배포·검증.

- ✅ **#11 역할별 Dashboard View 통합**(RoleViewBar, Dashboard 상단): CEO/CFO/CMO/COO/마케팅/커머스/물류/라이브/AIAgent/거버넌스 10관점을 기존 최적 페이지(rollup/pnl/performance/operations/auto-marketing/omni-channel/supply-chain/live-commerce/ai-insights/data-trust)로 큐레이션 진입. 신규 대시보드 0(동일 순이익 SSOT·관점만 전환). 무위험. 배포·검증.

## OS 디렉티브 잔여(REMAINING_GAPS 순서)
Profit Health Score → Root Cause 처방 → What-if Scenario → Agent 권한모드 → Executive Copilot → 거버넌스 → 보안보강 → 역할별 View. 전부 기존 확장.
