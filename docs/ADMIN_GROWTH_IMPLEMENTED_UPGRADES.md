# ADMIN GROWTH — IMPLEMENTED UPGRADES (236차)

## 신규 파일
- `backend/src/Handlers/AdminGrowth.php` — Growth 오케스트레이션 핸들러(18 엔드포인트, 6테이블 ensureTables, 스코어링/퍼널/시뮬레이션 엔진).
- `frontend/src/pages/AdminGrowthCenter.jsx` — admin 전용 콘솔(대시보드/세그먼트/리드/캠페인/승인/설정·감사 6탭).
- `docs/ADMIN_GROWTH_*.md` — 산출물 9종.

## 수정 파일 (최소 침습)
| 파일 | 변경 |
|---|---|
| `backend/src/routes.php` | `$custom` 맵 18라우트(+/api) + `$register` 루프 추가. 기존 라우트 무변경 |
| `frontend/src/App.jsx` | lazy import 1줄 + `<Route path="/admin/growth">` 1줄 |
| `frontend/src/layout/sidebarManifest.js` | `ADMIN_MENU` 항목 1 + `ADMIN_ONLY_MENU_KEYS` 1키 |
| `frontend/src/auth/planMenuPolicy.js` | `MENU_MIN_PLAN["system||growth"]="admin"` 1줄 |
| `frontend/src/i18n/locales/ko.js`, `en.js` | `gNav.growthCenterLabel` 1키(13개국 EN 폴백) |
| `backend/public/index.php` | **무수정** (기존 admin bypass 재사용) |

## 핵심 업그레이드 내용
1. **리드 스코어링 엔진**: 18 행동 가중치 → 점수(0~100) → 등급(cold/warm/hot/sql/trial/paid/expansion), 단계 자동 승급.
2. **퍼널 분석**: 10단계 누적·전환율 + CAC/LTV/ROAS/Payback/순이익ROI 실측 산출.
3. **AI 콘텐츠**: `ClaudeAI::complete` 재사용, 12종 카피(광고/랜딩/이메일/SMS/알림톡/LINE/블로그/SNS/유튜브/제안/영업) + 허위수치 금지 + 결정적 폴백.
4. **Test/Live 분리**: Test=시뮬레이션, Live=다단계 승인+자격증명 게이트.
5. **승인·감사**: Growth 승인 큐 + `audit_log` growth.* 추적성.
6. **타겟 세그먼트 17종 시드**: 이커머스셀러~총판/대리점, Pain/메시지/채널/추정 CAC·LTV.

## 배포 상태
- 로컬 빌드/리프트 검증 완료. **미배포·미push** (배포는 사용자 승인 필요 — `.clinerules`/CLAUDE.md).
- 운영/데모 반영 시: backend(`AdminGrowth.php`+`routes.php`) rsync + php-fpm reload, frontend dist swap(운영+데모 동반).
