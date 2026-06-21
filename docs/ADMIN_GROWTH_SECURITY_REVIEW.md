# ADMIN GROWTH — SECURITY REVIEW

## 인증/인가 (백엔드 강제)
- 전 18 엔드포인트 **`UserAuth::requirePlan($req,$res,'admin')`** 1차 게이트 → 미인증 401, 비-admin 403. **프론트 숨김에 의존하지 않음.**
- 라우트는 `/v424/admin/*` (index.php 세션 admin bypass) → api_key 우회 불가, 세션 토큰 필수.
- 프론트 2중: `system||growth` ∈ `ADMIN_ONLY_MENU_KEYS` + `MENU_MIN_PLAN.admin` → 사이드바 비노출 + `MenuAccessGuard` 딥링크 차단(`/admin/growth`).
- 서브어드민: `admin_menus` 매트릭스로 `/admin/growth` 부여/회수(세분 역할 운영).

## 테넌트 격리
- Growth 데이터 = 예약 테넌트 `platform_growth`. 고객 테넌트와 키 충돌 불가(접두 `platform_`).
- 자격증명 조회/사용은 `tenant_id='platform_growth' AND is_active=1` 조건 → 고객 자격증명 접근 불가.

## 실행 안전 (오발송/오집행 차단)
- 기본 **Test 모드**: 실제 발송·광고 집행 0(시뮬레이션만).
- **Live 다단계 게이트**: ① Live 전환 승인 → ② 캠페인 실행 승인(`campaign_launch`) → ③ 채널 자격증명 존재 → ④ 실행+감사. 누락 시 202/409 로 중단.
- AI 생성 콘텐츠는 `pending_approval` → 승인 전 사용 불가.

## 입력 검증
- 필수값 검증(email, event_type, decision 화이트리스트) → 422.
- 모든 쿼리 **PDO prepared statement** 바인딩(SQL 인젝션 차단). 동적 WHERE 도 placeholder.
- LIMIT 은 상수 리터럴(바인딩 이슈 회피).

## 감사 추적성
- 모든 변경(segment/lead/event/campaign/generate/launch/approval/mode)이 `audit_log` 에 `growth.*` + actor(인증 이메일) + details_json + UTC 시각 기록.
- 감사 실패가 본 작업을 막지 않도록 try/catch(가용성 우선) — 단, 정상 경로는 항상 기록.

## 데이터 보호
- AI 시스템 프롬프트에 **허위 성과 수치 생성 금지** 명시. 대시보드 실측치는 실제 이벤트/캠페인 spend 에서만 산출(세그먼트 추정치는 '예상'으로 명시 분리).
- PII 최소: 리드는 영업 접점 정보(email/company)만. 결제/민감정보 저장 없음.

## 남은 권고
- Live 실제 매체 push 시 `AdAdapters` 의 월 예산 cap·kill-switch(`AD_EXECUTION_DISABLED`) 동반 운영.
- 운영 반영 후 admin 세션으로 e2e 401/403 회귀 스모크 권장(서버 적용 단계).
