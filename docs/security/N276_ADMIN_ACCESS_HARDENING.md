# 276차 — Admin/운영/데모 접근제어 전수감사 + 확정 3건 하드닝

> 상위 정본: 라우팅/인증/데모격리 SSOT = [`docs/registry/ArchitectureRegistry.md`](../registry/ArchitectureRegistry.md) · [`docs/registry/APIRegistry.md`](../registry/APIRegistry.md).
> 본 문서는 그 위에서 276차에 **실측·확정한 감사 결과와 수정 3건**만 기록한다(중복 SSOT 신설 아님).

## 0. 트리거
"운영/데모/Admin 경로·인증·세션·데이터·로그 완전분리" 요구. 착수 전 6축 병렬 전수감사(프론트 라우트·백엔드 Admin API·데모격리·기존 문서/레지스트리) + PM 직접 재증명 + 운영 DB 읽기전용 실증.

## 1. 감사로 확정한 사실 (지시서 전제 반증 포함)
- **Admin API는 일반 토큰으로 호출 불가**: `/v423~v426/admin/*` 91개 라우트를 핸들러 메서드까지 정적 전수검사 → **91/91 서버측 게이트**(`UserAuth::requirePlan(...,'admin')` 또는 `AdminMenu::gate()`/`UserAdmin::requireAdmin()`). index.php 미들웨어가 admin 경로를 bypass하지만 각 핸들러가 self-gate. (최초 검사 스크립트가 `requirePlan` 인자 위치를 오판해 58건 오탐 → 코드 재증명으로 전량 정상 확인. 오탐 교훈 기록.)
- **데모/운영 격리 = 물리 분리**(다른 호스트 + 다른 MySQL DB `geniego_roi` / `geniego_roi_demo`). 데모 토큰의 운영 API 차단은 전용 코드가 아니라 "데모 세션이 운영 DB에 없음 → 401" 부수효과.
- **운영 DB `tenant_id='demo'` 오염 = 0행**(channel_orders·wms_bins·wms_supply_orders 실측). 격리 비대칭(OrderHub·Pnl만 env↔tenant 교차검증)은 이론적 경로일 뿐 실오염 없음.
- **`security_audit`는 유령 아님**: 실 테이블명 `security_audit_log`(해시체인 append-only, 운영 132행). 275차 "유령" 지적은 명명(하이픈 슬러그 `security-audit`) 불일치일 뿐 감사기능 정상.
- **URL 전면 재구성(`/secure-admin`·`/api/admin/*`·`/app`·`/dashboard`)은 헌법 위반**(§2 Extend·§3 라이브 라우트 삭제금지). 116 lazy 라우트+외부연동(SSO/OAuth/Paddle 웹훅)+챗봇 지식맵 파괴. **불채택.** 대신 실제 갭만 Extend로 수정.

## 2. 확정 3건 수정 (배포·검증 완료)

### C. Admin UI 노출 갭 — `/menu-access-manager` 미가드
- **근거**: 전 라우트에 실제 `pathToMenuKey`/`isAdminOnlyMenu`를 적용 → admin 의미 라우트 중 **`/menu-access-manager`만** 매니페스트 미등재로 `pathToMenuKey=null` → `MenuAccessGuard` 통과 + `AdminRouteGuard` 부재. 일반 로그인 사용자가 관리자 UI를 렌더 가능(백엔드 `/v424/admin/*`는 admin 게이트로 데이터 차단 = UI 노출만).
- **수정**(`frontend/src/App.jsx`): 기존 `/admin/*` 와 동일한 `<AdminRouteGuard>` 로 래핑. `/me/menu`는 사용자 본인 메뉴 설정이라 대상 아님(정상).
- **검증**: 데모에서 비관리자(enterprise) 세션이 `/menu-access-manager` → `/dashboard` 리다이렉트 실측. 운영 배포 후 비인증 → `/login` 실측.

### A. 관리자 2차 접속키 — 공개 리터럴 `GENIEGO-ADMIN` 하드코딩
- **근거**: 운영 `app_setting.admin_access_key_hash` 미설정(실측) → `verifyAdminAccessKey` 하위호환 분기가 번들 노출 리터럴 `GENIEGO-ADMIN`을 수용. 프론트도 서버 미응답 시 동일 리터럴로 클라측 통과.
- **수정**:
  - (운영/데모 DB) `admin_access_key_hash` 를 신규 강키 bcrypt 해시로 **시딩=회전**. 기존 코드가 해시 존재 시 엄격검증 → 공개 리터럴 즉시 403. **코드 배포 불요**(기존 경로 활용).
  - (`frontend/src/pages/AuthPage.jsx`) 오프라인 catch에서 공개 리터럴 자동통과 제거 → **fail-closed**. `ADMIN_GATE` 상수 삭제.
  - (`backend/src/Handlers/UserAuth.php`) 미회전 폴백을 env `ADMIN_ACCESS_KEY`(‑번들) 우선 + `hash_equals` 상수시간 비교로 강화(방어심화). env 미설정 시 기존 하위호환 유지=무회귀.
- **검증**: 운영·데모 라이브 — 리터럴 403 / 신키 `ok:true` 실측. 신키는 세션 자격증명 메모리에 보관(평문 서버파일 삭제).

### B. MFA 정책 `admin` 무동작 — 미등록 관리자 사실상 MFA 없음
- **근거**(`backend/src/Handlers/UserAuth.php`): `$enforced = ($mfaPol==='all')`. 기본정책 `admin`은 강제 미발동 → 등록 사용자만 검증. 운영 `mfa_policy` 미설정(=기본 admin) 실측.
- **수정**: `$enforced = ($mfaPol==='all' || ($mfaPol==='admin' && $planForMfa==='admin'))` — 정책 `admin`이 관리자 계정에 실제 MFA 강제. 기존 락아웃 방지(발송채널 전무 시 통과+감사 high) 유지 = 무채널 환경 무회귀.
- **락아웃 위험 실증 해소**: 운영 이메일 전달 사전검증 — OTP와 동일 경로(`Mailer::send(...,['pdo'=>$pdo])`) `ok:true mode:smtp`, maillog `status=sent(250 ok)` via mailplug, **사용자 인박스 실수신 확인**. 이후 활성화.
- **검증**: 데모 admin 로그인 → `mfa_required(email)` → dev코드 입력 → `ok:true`·토큰발급(락아웃 0). 운영 admin 로그인 → `mfa_required:true·otp_sent:true·dev미노출·토큰없음` 실측(비관리자 우회 불가).

## 3. 배포/브랜치
- 프론트(C·A-front): 운영(www.genieroi.com)+데모(demo.genieroi.com) dist 클린스왑(`rsync -a --delete`)·데모플래그 격리검증.
- 백엔드(A-back·B): `UserAuth.php` 교체·php -l·php-fpm reload. A 회전은 DB 시딩(코드무관).
- **master 미접촉·feat/n236만.** 배포=수동 pscp/plink(CI inert).
- 롤백: 운영 `_bak_prod_dist_*` / `_bak_prod_UserAuth_*`, 데모 `_bak_demo_*`.

## 4. 잔여/후속 (결함 아님·선택)
- MFA 정책 UI(`mfa_policy=all` 전원강제)·TOTP 등록 유도는 별도.
- env↔tenant 교차검증(현재 OrderHub·Pnl) 확장은 예방적(실오염 0이라 저순위).
- admin IP allowlist·CSRF 토큰: Bearer 토큰 인증이라 CSRF 표면 작음. 필요시 후속.
- 지시서의 `/secure-admin` 등 URL 재구성은 **불채택**(헌법 위반·파괴적). Admin 은닉은 로고클릭+회전된 접속키+`AdminRouteGuard`+서버 `requirePlan('admin')` 다층으로 유지.
