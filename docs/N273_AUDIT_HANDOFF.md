# 273차 세션 인계서 — 6도메인 전수 초정밀 감사 + SMS OTP/2FA + P0~P3 전량 수정

작성일: 2026-07-09 · 브랜치: `feat/n236-admin-growth-automation`

## 1. 세션 개요
사용자 요청: ①하위관리자 로그인 분석 ②아이디/비번찾기·회원가입 휴대폰 SMS OTP ③최고관리자 접속키찾기 ④Twilio 연동 + "모든 로그인 2FA" ⑤**GeniegoROI 전체 전수 초정밀 감사**(누락·오류·동기화실패·기능후퇴·목데이터·데이터오염·채널연동미완·마케팅자동화미완·분석산출오류) → 근본원인까지 전량 수정.

결과: **P0/P1 19건 + P2/P3 전량 + 잔여 5건**을 근본원인 기준으로 수정하고 **데모+운영 배포·무회귀 검증** 완료.

## 2. 인증/계정 체계 (신규)
- **SMS OTP**: `UserAuth::phoneSendCode/phoneVerifyCode` + `phone_verification` 테이블. 가입인증·아이디/비번찾기.
- **최고관리자 접속키 복구**: `UserAuth::adminRecoverAccessKey`.
- **국가코드+언어 연동 15개국**: AuthPage `PhoneVerifyField`(국가선택→다이얼코드 자동·언어→국가 디폴트).
- **통합 발신기**: `NaverSms`(SENS) + `Twilio`(신규 `backend/src/Twilio.php`) 이중화. `smsSend`/`smsProviderConfigured`.
- **2FA**: `mfa_policy`(off/admin/all) + `issueLoginOtp`. `login()`에 2FA-all 분기. 채널 부재 시 fail-open 안전밸브 + break-glass.

### ★SMS 실발송 활성화 (미완 — 자원 확보 대기)
- **Twilio**: 코드 완료. 그러나 계정이 **Trial·발신번호 0개**(Account SID ACdf2367…). From 번호 없음 + Trial은 검증번호에만 발송 → 운영 실발송 불가. 유료 전환+번호 구매 필요.
- **결정: 한국 운영 SMS는 NaverSMS(SENS) 채널 사용**(도달률·규제 적합). 운영 `app_setting` SENS 자격증명 **전부 미설정**.
- **다음 세션 액션**: 사용자에게 SENS 4값 수령 → `app_setting` 저장(secret Crypto 암호화)→`sms_provider=naver`·`mfa_policy=all` 설정→실발송 테스트→검증.
  - 필요값: `sms_service_id`(ncp:sms:kr:…), `sms_access_key`, `sms_secret_key`, `sms_from`(SENS 사전등록 발신번호).
- Twilio Auth Token은 노출됐으므로 사용자 회전(재발급) 권장(활성화 무관하게).

## 3. 감사 확정 수정 (배포 완료 — 근본원인)
### 보안
- UserAuth 정지계정 로그인만으로 무인증 재활성화 우회 → 비번검증 後·최고관리자 한정.
- Payment PG설정/요금/메뉴/구독 저장 **checkMaster**(하위관리자 sub 차단).
- UserAuth `verifyAdminKey`·AgencyPortal 로그인 **레이트리밋**(무차별 대입 차단).

### i18n
- en.js 한글 base값 8개 영어화 → clean()과 결합해 15개국 누출 근원차단.

### 커머스/물류
- CatalogSync writeback 하드코딩 가격오프셋 제거. OrderHub 부분클레임 LTV min. WMS whId 유령창고→whs[0] 가드. PgSettlement 외화대사 fxToKrw. LiveCommerce 품절 오버셀 차단·전환율 peak분모. DemandForecast 모델분기 비영관측수·**현재고 wms_stock SSOT**(라이브판매 반영). ChannelSync incInventory ref멱등·refund dedup·등급자동파생·testChannel stored정직·naverWrite leaf등록한정·6채널 자격증명 화이트리스트·coupang op/cpid분기·walmart 고유키. **Wms FEFO lot 창고이관**. **Catalog bulkPrice '*' 전채널 팬아웃**. **OrderHub COGS 부분출고 WAC보전**.

### 마케팅/CRM/어트리뷰션
- AutoMarketing/CampaignManager 킬스위치(backendId 정수 status). AttributionEngine loadJourneys 매출 JOIN·**time_decay 이중감쇠**·**Shapley 'other' 연합플레이어**·**Markov 전환세션 전체제외**. CRM 100캡→page페이지네이션+stats()서버집계. SmsMarketing 템플릿본문. JourneyBuilder 간편폼 노드그래프 컴파일. Mmm **organic baseline 절편**. CustomerAI 재구매주기 tenure·**crm_auto_action 큐 소비부(list/dispatch)**. WebPopup **embed.js settings소비(빈도캡/모바일/조용시간)**·CTA전환날조 제거·**A/B Bonferroni**. Line sent_count. EmailMarketing 실이메일 필터.

### 분석
- Pnl 광고비 기간정합. AccountPerformance 팀ROAS 지출가중. AIInsights 과거3점 게이트·주문 max(이중합산). PnLDashboard Forecast COGS·influencer·기간건수 별도계수. Rollup 반품률 분모=orders. PerformanceHub 원천징수 3.3%·0나눗셈. ChannelKPI CTR blended. rollupDemoDerive ROAS 광고기여.

### 데이터/채널
- DataTrustDashboard 계보탭 `/api/data-lineage` 실배선. **DataTrust 컴플라이언스 정직화**(audit=security_audit 실측·verified 배지). Connectors Yandex/YahooJP live:false(데이터보존). seed-gate 정본 IS_DEMO(SupplyChain/BudgetTracker/MenuAccessManager). GlobalDataContext INVENTORY 크로스탭 송신부. OrderHub 낙관적 롤백. Reviews 키워드 추세(기간대비). OAuth naver 로그인≠커머스 가드.

## 4. ★배포 트랩 (교훈)
- **데모빌드 운영혼입**: `--mode demo` dist를 운영에 ~2분 노출 실수 → 즉시 프로덕션빌드 교체. **운영 DB 법의학 검증: demo테넌트 0행·최근삽입 0·시드시그 0**(유입 전무). tar 미삭제로 데모청크 고아잔존 → **rsync -a --delete 클린재배포**로 근절. 판정법: 번들 `VITE_DEMO_MODE:"true"` 청크수(0)·`demo_genie_token` 문자열은 증거 아님.
- 운영=`npm run build`, 데모=`--mode demo` 절대 혼용 금지.

## 5. 배포 상태
- 데모(roidemo.geniego.com)·운영(roi.geniego.com) 백엔드 다수 핸들러+routes+dist 전량 반영. php-l 전통과. fpm 정식재시작(php8.1-fpm). 운영 dist 클린(데모플래그 0).
- 스모크: 로그인2FA·crm/stats·pnl·data-lineage·data-quality·auto-actions·embed.js settings·naver가드 정상. 무회귀.
- **master 미push**(CI 자동배포 방지). 수동 pscp/plink 배포.

## 6. 다음 세션 우선순위
1. SENS 자격증명 수령→운영 2FA-all 실발송 활성화(§2).
2. Twilio Auth Token 회전 확인.
3. 잔여 저가치: LiveCommerce channel_inventory↔forecast 완전 SSOT 통일(현재 reorder만 wms_stock), WebPopup 편집 플로우(현 생성전용).
