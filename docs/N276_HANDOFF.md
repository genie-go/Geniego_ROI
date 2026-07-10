# 276차 세션 인계 — Admin 보안 하드닝 + 렌더루프/네이버 근본수정 + 상품등록 법정항목 (사용자 명시 승인)

> 이전: [`docs/N275_AUDIT_TWILIO_CHATBOT_LOGIN_HANDOFF.md`](N275_AUDIT_TWILIO_CHATBOT_LOGIN_HANDOFF.md). 본 세션 커밋 6건(feat/n236, master 미접촉). 운영(www.genieroi.com)+데모(demo.genieroi.com) 배포·브라우저 실검증 완료.

## 0. 개요
275차 잔여(2·5·6번) 착수 → deploy.ps1 유령호출 발견 → Admin 접근제어 전수감사 → 네이버 커머스 API 근본버그 연쇄(서명·상품매핑·권한) → 무한 렌더루프 전수감사 → 상품등록 법정항목. 매 건 **부재증명·PM재증명·브라우저/서버 실검증** 후 확정만 수정.

## 1. 확정 수정 (재플래그/재구현 금지)

### [d53c926] deploy.ps1 유령호출 + 로그인 401 + AuthPage 높이티어
- **deploy.ps1 1행에서 죽어있었음**: `inject_journey_ko.cjs`·`package_deploy.py`·`deploy_paramiko.py` 3개가 git 이력에 없는 유령호출 → 챗봇지식/i18n autofill 훅이 도달불가였음. 유령 제거·빌드까지 정상 완주(EXIT0). CLAUDE.md 26/139행 현실(수동 pscp/plink)로 정정. **UTF-8 BOM 저장 필수**(PS5.1 ANSI 오독).
- **로그인화면 미인증 401 7건**: GlobalDataContext 3 useEffect가 `_isDemo`만 보고 토큰 미확인 → orders/claims/settlements EP 호출. `authToken()` 가드 추가. 운영 실측 7→0.
- **AuthPage 높이티어 소스순서 버그**: `.gr-demo/.gr-avatar/.gr-footer` 기본규칙이 미디어쿼리보다 뒤라 275차 티어 선언 절반 죽어있었음. 티어 GR_CSS 끝으로 이동 + 1100/1020/860/740 재정비. 1280~1920 전 뷰포트 초과 0px.

### [1dd287e] Admin 접근제어 전수감사 + 확정3
- 6축 병렬감사 + 운영DB 실증. **지시서 전제 반증**: v423~426 admin 91라우트 91/91 서버게이트(requirePlan admin)·일반토큰 호출불가 / 운영DB tenant='demo' 오염 0 / `security_audit`는 유령 아님(실명 security_audit_log). URL 재구성(/secure-admin)은 헌법위반·불채택.
- **C** `/menu-access-manager` 유일 미가드(pathToMenuKey=null)→AdminRouteGuard 봉쇄. **A** 접속키 공개리터럴 `GENIEGO-ADMIN` 회전(운영+데모 DB `app_setting.admin_access_key_hash` bcrypt 시딩 → **새키 `GNRK-0E6BAED1D5DFDE1E7FC8`**, [[reference_session_credentials]] 보관) + AuthPage 오프라인 폴백 제거 + UserAuth env `ADMIN_ACCESS_KEY` 우선. **B** MFA정책 'admin' 실작동(미등록 관리자 강제) — 운영 이메일 실전달(smtp 250·인박스 실수신) 확인 후 활성. 상세 [`docs/security/N276_ADMIN_ACCESS_HARDENING.md`](security/N276_ADMIN_ACCESS_HARDENING.md).

### [4ece505] 네이버 커머스 API 전자서명 HMAC→bcrypt
- 연동허브 "입력한 데이터가 유효하지 않습니다"(토큰400) 근본원인. 서명=`base64(crypt("{appId}_{ts}", secret))`(secret=bcrypt salt). 검증1+실동기화4 = 5곳(ChannelSync::naverSign 공유헬퍼) 정정. 실키 200발급·8상품 확인.

### [3b43a03] 무한 렌더루프 근본수정 + 전수감사
- **/api/channel-sync/status 초당1072·누적171만회 429**(nginx api_limit). OmniChannel `const connectors = globalData.connectors || []`(매렌더 새 [])→hubChannels(useMemo)→loadStatus(useCallback)→useEffect([loadStatus]) 자가지속. connectors useMemo 안정화 + effect 원시값[length]+ref 분리. **실증(nginx로그)+정적(116페이지) 전수감사: 자가지속 루프는 OmniChannel 유일**. PixelTracking/CreativeStudioTab 방어적 안정화(루프 아님).

### [f1cec75] 네이버 카탈로그 상품 매핑 + 백그라운드 + 알림
- "동기화 성공인데 상품0": naverProducts가 존재않는 `content.originProduct` 읽음(실제=`content.channelProducts[0]`)→이름/가격/재고 빈값. channelProducts[0] 매핑 정정(실키 8상품 정상). 대량=`catalog_sync_job`+commerce_sync_cron 분할수집+완료 시 user_notification 알림(기존 벨 재사용). 강제오버플로 테스트 통과.

### [e07c7eb] 상품등록 저장버그 + 상품정보제공고시 + 배송/반품
- **저장버튼 안보임**: 폼 1700px 아래+`.btn` 흐림 → sticky 하단고정+강조. **저장 500**: priceopt.sqlite `www:www`인데 데모FPM=www-data(www그룹아님)=readonly → **서버조치(비코드): usermod -aG www www-data + data/ setgid·그룹쓰기 + php8.1-fpm 재시작**. 운영·데모 쓰기검증 OK.
- **상품정보제공고시(법정)** `frontend/src/constants/productNoticeTemplates.js` 24품목(2024개정: 화장품 사용기한·가공식품 용량/소비자안전·생활화학/살생물). 품목선택 동적표시+일괄'상품상세참조'. **플랫폼 필수**: KC인증·미성년자·제조/유효일·반품/교환배송비. **배송/반품**: 계정공통(po_fulfillment, GET/POST /v420/price/fulfillment)+상품별예외. po_products 13컬럼 ALTER. 배포본 검증(품목29·화장품10항목·일괄10·13컬럼·fulfillment 저장조회).

## 2. 배포/브랜치
- 운영+데모: dist 클린스왑(rsync --delete·데모플래그 게이트) + 백엔드 파일카피·php-fpm reload. 백업 `/root/_bak_*`. **master 미접촉·feat/n236만**(CI inert).

## 3. ★다음 차수 우선순위
1. **[★사용자 액션] TOTP 앱 등록 미완** — 관리자 로그인 TOTP 전환 시도 5회 실패. **서버 TOTP=RFC6238 표준 정상 확인**(독립검증). 원인=앱에 잘못된 시크릿 등록(수동입력 오타/유형오류). 보류 시크릿 `BA3E2MWUC4GRSACZPZZLEBVFHUHOAKI4` 재시드됨(app_user ceo@ociell.com mfa_enabled=0). QR/키 재등록(기존 항목 삭제 후) 시 `/auth/mfa/enable` 또는 서버 reflection으로 활성화. QR 아티팩트 발급됨. 미완 상태로 **로그인은 이메일 OTP 유지**(정상작동).
2. **[운영] Twilio 발신번호** — SMS 2FA는 sid+token만 있고 `from`/`msg_sid` 미설정 → 관리자콘솔서 발신번호 입력 시 활성.
3. **[i18n] 신규 UI 키 13개국** — productNotice/priceOpt.notice*·adminSms·authHero·wms.cctv 등 ko/en 외 13국. `$env:CLAUDE_API_KEY` 설정 후 `node tools/i18n_autofill.mjs`(AUTOFILL_ONLY 스코프).
4. **[선택] 상품 편집 로드** — 등록 상품 재편집 시 notice_json→noticeItems 역매핑 폼주입(현재 저장O·편집로드 미배선).

## 4. 오탐방지 메모 (다음 감사 주입)
- deploy.ps1=빌드전용(업로드는 수동 pscp/plink). 마이그레이션은 원격 실행(Db.php GENIE_DB_HOST=127.0.0.1 → 로컬훅=로컬DB).
- admin 91라우트 서버게이트 완비·URL재구성 불채택(헌법). 렌더루프 자가지속 OmniChannel 유일(수정완료).
- priceopt.sqlite/supplychain.sqlite/genie.sqlite = 전용 SQLite, www그룹 쓰기권한 의존(FPM 2풀 www/www-data).

(★276차 인계서 = 사용자 명시 승인. 자격증명 평문노출: 접속키는 [[reference_session_credentials]] 정본에만.)
