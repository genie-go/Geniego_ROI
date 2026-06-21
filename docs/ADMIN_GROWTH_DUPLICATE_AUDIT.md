# ADMIN GROWTH — 중복 감사 (DUPLICATE AUDIT)

236차 착수 시 백엔드/프론트/라우트·DB·RBAC 3축 전수 탐색 결과. **최우선 원칙 = 중복 구현 0.**

## 결론: 신규는 "오케스트레이션 1핸들러 + admin_growth_* 6테이블 + admin 페이지 1개"뿐. 엔진은 전부 재사용.

## 재사용 (신규 생성 금지 → 그대로 호출/격리)

| 요구 기능 | 기존 자산 | 재사용 방식 |
|---|---|---|
| AI 콘텐츠 생성(카피/이메일/SMS/SNS…) | `ClaudeAI::complete()` (정적 헬퍼, 쿼터·폴백 내장) | 직접 호출, tenant=`platform_growth` |
| 광고 집행 어댑터 | `AdAdapters` (Meta/Google/TikTok/Naver/Kakao/LINE, PAUSED 기본) | Live 실행 경로로 위임 |
| 캠페인 자동최적화 | `AutoCampaign::optimize*`, `optimization_log` | Live 캠페인에 적용 |
| 어트리뷰션/ROI | `Attribution` / `AttributionEngine` (6모델) | CAC/LTV 산출 개념 계승 |
| 자격증명 Vault | `channel_credential` (AES, test/sync status) | tenant=`platform_growth` 행으로 분리 |
| 감사 로그 | `audit_log (actor,action,details_json)` | `action='growth.*'` prefix 로 기록·조회 |
| Admin 인증 | `UserAuth::requirePlan('admin')` + 세션 admin bypass | 전 엔드포인트 게이트 |
| 메뉴 admin-only 격리 | `ADMIN_ONLY_MENU_KEYS`, `MENU_MIN_PLAN`, `MenuAccessGuard` | `system||growth` 추가 |
| 메시징 | `EmailMarketing`/`SmsMarketing`/Kakao/LINE | Live 발송 경로 |
| 워크플로우 | `JourneyBuilder` | 향후 Growth 워크플로우 트리거 연계 |

## 신규 (진짜 부재 확인 후 최소 신설)

| 신규 | 사유 (탐색 근거) |
|---|---|
| `AdminGrowth.php` | GeniegoROI **자체** 성장 오케스트레이션 핸들러 부재 |
| `admin_growth_segment` | 자체 영업 타겟 세그먼트 라이브러리 부재 |
| `admin_growth_lead` | GeniegoROI 자체 리드(고객사 리드 아님) 부재 |
| `admin_growth_event` | 자체 퍼널/터치포인트 이벤트 부재 |
| `admin_growth_campaign` | 자체 홍보 캠페인 + test/live 모드 부재 |
| `admin_growth_approval` | Growth 전용 승인 큐(콘텐츠/실행/Live전환) 부재 |
| `admin_growth_setting` | Growth 모드 설정 부재 |
| `AdminGrowthCenter.jsx` | 자체 성장 admin UI 부재 |

## 의도적 비-중복 결정

- **승인**: 기존 `action_request` 는 alert_policy 종속 → Growth 승인 큐는 형상이 달라 `admin_growth_approval` 신설(중복 아님).
- **감사**: 별도 테이블 신설하지 않고 `audit_log` **재사용**.
- **메뉴**: 고객용 마케팅 메뉴(auto-marketing/campaign-manager 등) 무수정. ADMIN_MENU 에 1개만 추가.
- **라우트 prefix**: 신규 버전 prefix 만들지 않고 `/v424/admin/*`(기존 bypass) 재사용 → index.php 무수정.

## 중복 부재 검증
- 핸들러: `backend/src/Handlers/` 내 growth 파일 = `AdminGrowth.php` 1개
- 라우트: `AdminGrowth::` 36엔트리 = 18라우트 × (기본+/api), 중복 키 없음
- 사이드바: `/admin/growth` 1엔트리 + `system||growth` 1키
- App.jsx: `/admin/growth` 라우트 1개
