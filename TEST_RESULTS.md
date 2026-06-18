# TEST_RESULTS.md

## 231차 검증(반복 통과)
- **PHP 문법**: 변경 전 핸들러 서버 `php -l` 전건 "No syntax errors"(PHP 8.1.34).
- **무결성**: 로컬 LF ↔ 업로드 ↔ 운영 ↔ 데모 md5 일치. diffstat=편집분만(드리프트 0).
- **기능(실DB)**: `Db::ensureAppSetting/ensureCouponTables/ensureAiSettings/ensureWmsSupplyOrders/ensureChannelOrders` helpers_ok·데이터 무손실. 배송비 쿼리 실행(규칙없음→0=무후퇴). `Db::audit` wrote+read=1→정리. `AdPerformance::summary` callable=true·PerformanceController 제거 경고0. photo 컬럼·admin_menus 맵 round-trip.
- **HTTP 스모크**: 운영/데모 `/api/auth/login` 정상 JSON 401(500 0). re-pointed summary 라우트 비500.
- **프론트 빌드**: `npm run build` 전건 성공(~46s).
- **헤드리스(puppeteer, U-170-A)**: 운영/데모 화이트스크린 NO·렌더정상(rootChildren=3·body 4044/4070)·pageerror 0.
- **배포**: api_manuals 보존·nginx -t·reload·롤백 백업(/tmp/bak_*) 보존.

## OS 디렉티브 예정 검증 항목
- ROI 계산 샘플(배송비·COGS 포함 순이익) · Agent 승인 플로우(action_request 2단계→실행→audit) · 모바일 Capacitor 영향 · 표준 응답 봉투 · 역할별 View 접근.
