# ADMIN GROWTH — FEATURE MAP

스펙 요구 → 구현 위치 매핑. (✅ 구현 / 🔁 기존 재사용 / 🧭 경로 마련)

| # | 요구 | 상태 | 위치 |
|---|---|---|---|
| 1 | Admin 전용 Growth 메뉴(기존 Admin 메뉴 통합) | ✅ | `sidebarManifest.ADMIN_MENU` → `/admin/growth` |
| 1 | 운영 테스트/실제 실행 모드 | ✅ | `settings`/`campaignLaunch` (test=시뮬, live=승인+실행) |
| 2 | 마케팅 퍼널 추적 (방문→…→업셀) | ✅ | `admin_growth_event` + `computeFunnel` |
| 2 | KPI(리드/데모/체험/유료/전환율/CAC/ROAS/Trial-to-Paid/Activation/Retention/LTV/Payback/순이익ROI) | ✅ | `dashboard` cards + `funnel` |
| 3 | 타겟 세그먼트(17종, Pain/메시지/채널/추정 CAC·LTV) | ✅ | `segmentSeed` (`defaultSegments` 17) |
| 4 | AI 캠페인 콘텐츠 자동 생성(광고카피/랜딩/이메일/SMS/알림톡/LINE/블로그/SNS/유튜브/제안서/영업메시지) | ✅🔁 | `campaignGenerate` → `ClaudeAI::complete` (폴백 포함, 허위수치 금지 프롬프트) |
| 4 | 한국어/영어/일본어, AI 생성물 승인 후 사용 | ✅ | `lang` 파라미터 + `pending_approval` → 승인 큐 |
| 5 | 채널별 자동화(광고/콘텐츠/메시징/영업) | ✅🔁 | `AdAdapters`/메시징 핸들러 재사용 + `channel_credential`(platform_growth) |
| 5 | Connector 설정·Mock/Test·Vault·Sync/Error Log | ✅🔁 | Test 모드 시뮬레이션 + `channel_credential` + `audit_log` |
| 6 | Workflow Builder(데모후/체험후/리드스코어/광고최적화) | 🧭🔁 | 이벤트 기반 스코어링 구현 + `JourneyBuilder` 연계 경로 |
| 7 | Lead Scoring / 등급(Cold~Expansion) | ✅ | `SCORE_WEIGHTS` + `rescore` + `gradeFor` |
| 8 | Attribution & ROI(채널/세그먼트별 CAC, Trial-to-Paid, LTV, Payback, 순이익) | ✅ | `computeFunnel` (실측 이벤트·캠페인 spend 기반) |
| 9 | Test Mode / Live Mode 분리 | ✅ | `mode` 설정, 실행 분기 |
| 10 | 승인 & Audit(누가/언제/채널/예산/성과/실패사유) | ✅ | `admin_growth_approval` + `audit_log (growth.*)` |
| 11 | Admin Dashboard(카드+차트) | ✅ | `DashboardTab` (16 카드 + 퍼널 차트) |
| 12 | 고객/Admin 데이터·권한 분리 | ✅ | tenant `platform_growth` + admin-only menuKey |
| 13 | 보안/권한(백엔드 검증) | ✅ | `requirePlan('admin')` 전 엔드포인트 |
| 14 | 기존 자산 탐색·확장 | ✅ | DUPLICATE_AUDIT 참조 |
| 15 | Backward-compatible 마이그레이션(DROP 금지) | ✅ | `ensureTables` CREATE IF NOT EXISTS, 기존 테이블 무변경 |
| 16 | 표준 API 응답 봉투 | ✅ | `AdminGrowth::json` `{success,data,message,error,meta}` |
| 17 | 모바일 대응 | ✅ | flex-wrap 카드/가로스크롤 테이블 |
| 18 | 최종 검증 체크리스트 | ✅ | TEST_RESULTS 참조 |

## 세부 권한 역할(스펙 §13)
백엔드는 `requirePlan('admin')` 단일 게이트 + 서브어드민 메뉴 권한(`admin_menus`)으로 강제. 세분 역할(Growth Manager/Marketing/Sales/Finance/Viewer)은 서브어드민 메뉴 권한 매트릭스로 `/admin/growth` 부여/회수하여 운영(기존 SubAdminManager 재사용).
