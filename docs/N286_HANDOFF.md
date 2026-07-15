# 286차 세션 인계 — 값 동기화 초정밀 감사 + 플랜/권한 서버강제 + 11번가·WMS 완결 (운영+데모 배포)

> 작성 2026-07-15. 285차 당일 연속. feat/n236-admin-growth-automation(master 미접촉·미push). 전 작업 **운영(roi.geniego.com)+데모(roidemo.geniego.com) 배포·php -l·빌드·health 200 검증 완료**. 커밋 미기록(직접 pscp/plink 배포).

정본 메모리: `memory/project_n286_value_sync_audit.md` · `memory/reference_platform_growth_actas_tenant_hijack.md` · `memory/reference_st11_product_register_full_spec.md`(갱신).

---

## 0. 개요

사용자 지시가 세션 내내 다발적으로 확장됨: ①11번가 등록 오류 연속 해결 ②전역 값 동기화(SSOT) 초정밀 감사 ③fake-looks-real·경로/로직/파이프라인 결함 ④자격증명→즉시실행 완결성 ⑤채널별/플랜별 필수필드 ⑥구독자 노출 불필요 메뉴 ⑦회귀 없이 교차검증. 5+4 병렬 감사 에이전트를 FP레지스트리·구현이력·"코드존재≠배선" 주입해 가동, **확정 결함만** 근본수정·회귀검증·배포.

---

## 1. 11번가 상품 등록 완결 (실등록 성공 확인 · 상품번호 9495120048)

- **브랜드 재발 = 프론트 payload 미전송**: `handleApply`/`retryWithCategory`가 `...(prod._meta)`만 보냈는데 brand는 top-level(`r.brand`)이라 누락 → `catalog_listing.brand` 빈값 → elevenStWrite 거부. **`brand: prod.brand` 명시 전송** + `currentListing`에 동일 sku 타채널 brand 폴백(Catalog.php).
- **재고 "0개" 거부 = 필드명 오독**: 옵션개편 API가 `optionAllQty`를 0으로 읽음 → 단일상품 표준 재고필드는 **`<prdSelQty>`**(285차 학습 때 오독). 두 필드 병행 전송(ChannelSync.php:3958). **→ 등록 성공.**
- **성공을 "❌ 거부"로 오표시 = `elevenStFault`가 resultCode=0만 성공예외** → 200/210(상품등록 성공)을 fault로 판정. **200/210 예외 추가** + 성공응답 `<productNo>` 캡처(prdNo/ProductNo만 봐서 미캡처였음). ChannelSync.php:2148/3983.
- ★11번가 스펙 정본 = `memory/reference_st11_product_register_full_spec.md`. 재고필드 prdSelQty 정정 반영. **지어내기 금지·재학습 금지.**

## 2. ★platform_growth 전역 tenant 하이재킹 근본수정 (최고관리자 전 메뉴 빈 화면)

- **증상**: admin 최고관리자가 **창고·CRM·카탈로그·주문 등 모든 메뉴 빈 화면**(하위관리자는 정상). DB상 전원 acct_1인데도.
- **진짜 원인**: `AdminGrowthCenter.jsx` 진입만으로 `localStorage.gg_act_as_tenant='platform_growth'` **자동 ON+영구 고착** → apiClient가 전 API에 `X-Act-As-Tenant` 헤더 → `UserAuth::authedTenant`가 admin 계정 tenant를 **acct_1 대신 platform_growth(데이터0)로 반환** → 범용 tenant 소스라 **전 메뉴 전파**.
- **수정**: 진입 자동ON 제거(명시 토글만) + main.jsx 버전드 1회 리셋(`gg_actas_reset_v286`)으로 고착 브라우저 즉시 복구. 백엔드 무변경(AdminGrowth::TENANT 서버상수). 정본 = `memory/reference_platform_growth_actas_tenant_hijack.md`.
- **교훈**: 전역 컨텍스트 스위치를 mount 자동활성+localStorage 영구지속=사일런트 데이터 하이재킹. "특정 role 전메뉴 공백"→요청시점 tenant해석(X-Act-As/임퍼소네이션/JWT) 의심.

## 3. WMS 재고 SSOT 일원화

- **`wh_id='default'` 오적재 근본원인**: `Wms::primaryWarehouse`가 활성창고 부재 시 리터럴 'default' 반환 → 상품/채널 등록(PriceOpt::reflectStockToWms)이 'default'에 적재. 수동입고(InOutTab)는 선택 창고 정상. 두 경로가 다른 창고키에 써서 영구 분산 → 창고목록 재고0·분포 은닉.
- **수정**: `Wms::consolidateOrphanStock`(''/default/NULL→primary 실창고 병합, listWarehouses/listStock에서 self-heal) + listWarehouses가 창고별 `stock`(SUM on_hand) 첨부 + 프론트 카드 w.stock 우선 + **상품 클릭 창고별 분포 팝업** + 헤더 총재고를 wms_stock SSOT로 통일.
- **창고 삭제**(신규): 카드에 🗑삭제 버튼. 백엔드 deleteWarehouse가 **SUM(on_hand)>0이면 409 거부**(재고 있으면 절대 삭제불가·이동/소진 안내). 임시중단=비활성화.
- **창고 조회/정렬**(신규): "창고목록" 옆 창고명 검색(🔍조회·Enter·✕) + 정렬 토글(창고명 ↑↓).

## 4. 멀티채널 실시간 재고 (판매·취소·반품) — 완결 확인 (코드변경 0)

- 판매 시 물리재고 차감(`reflectChannelSale`)+**전 채널** catalog_listing.inventory 동기갱신(`enqueueChannelStockSync`가 전 채널 순회)이 주문 훅에서 즉시·멱등. 취소/반품 역분개 팬아웃 견고.
- 외부 마켓 API 실전송만 cron(~10분) 준실시간(주문훅 비차단). `channelAvailable=floor(SUM on_hand−buffer)` 3경로 공유 SSOT.
- **잔여 edge(사용자: 현행유지)**: `channelAvailable`은 전창고 SUM인데 `allocationPlan`은 active=1만 차감 → 명시적 비활성창고 전용재고=유령가용(초과판매 소지). 고아('default')는 consolidate로 방어됨.

## 5. 값 SSOT 무결성 감사 — 확정 결함 수정

- **Attribution 취소제외 술어 불일치**: 전환집합(AttributionEngine.php:1163 event_type 1축) ≠ 매출맵(2축) → status토큰 취소가 전환수·CPA 과대·매출0. `observedExclusionInline('co')` 2축 통일.
- **배송비 취소필터 하드코딩 8토큰**(OrderHub.php:903·Pnl.php:134) → '취소완료'·웹훅취소 놓쳐 영업이익 과소. `cancelExclusion('co')` 2축(반품은 매출포함 규약과 대칭).
- **CRM productAffinity 1축**(CRM.php:1294) → `observedExclusionInline()` 2축.
- **WMS 헤더 KPI**가 그리드(wms_stock) 아닌 channel_inventory → 총재고를 wms_stock SSOT로 통일.
- 정상확인(재플래그금지): 롤업·COGS·FX·VAT·LTV·세그먼트·옵트아웃 SSOT 견고.

## 6. fake-looks-real 제거 (5에이전트 감사)

- **godomall** writeback 폴백이 2xx면 무조건 ok:true → 실패 은폐. CREATE와 동일 정직 ok:false(ChannelSync.php:3480).
- **grip(그립 라이브커머스)** 백엔드 소비처 0건 완전 dead-end("연결됨" 가짜) → SNS_LIVE_SOURCES 배선+`fetchGripStats`(정직 pending·★실 파트너 API 스펙 확정 후 완성—사용자 "실 어댑터 구축" 선택).
- **라우트 무결성**: 1005개 Class::method 전수 대조 → 팬텀500·죽은핸들러·미배선 **0건**(클린).

## 7. 보안 — 노출 차단 + 플랜/권한 서버강제

- **admin 4페이지 라우트가드**(/db-admin·/user-management·/system-monitor·/pg-config) — 미가드 노출 봉쇄(285차 클래스).
- **ApiKeys "채널 추가(관리자)" 버튼** 무가드 노출 → admin plan 게이트.
- **플랜 게이팅 전면 강제**(사용자 승인): PriceOpt/WmsCctv requirePro→requirePlan('pro'), Pnl/Mmm/AutoRecommend/Attribution대시보드/Reports → growth, PlanPolicy FEATURE_MIN_PLAN 프론트 정합(report_builder/pnl_analytics/ai_insights/marketing_advanced=growth). ★데모백엔드(env='demo')·데모테넌트 게이트 면제(쇼케이스 보존). ★prod/demo 모두 starter/growth 유저 0명(free/pro/admin)이라 현 회귀 0.
- **sub-admin 서버 권한 스코프 강제**(사용자 승인):
  - `UserAuth::requireMasterAdmin2`(public) — master전용: AdminPlans upsert/delete/menuAccessUpsert/periodPricingUpsert/paddleSync/dbStats + AdminMenu patch/reorder/reset + CouponAdmin updateRule/issue/revoke. ★메뉴트리편집·메뉴부여=권한상승 벡터.
  - `UserAuth::requireSubAdminMenu($req,$res,$menuPath,$needEdit)` — 부여경로만: AdminGrowth→'/admin/growth', SiteIntro→'/admin/site-intro', LegalDoc→'/admin/legal-docs', CouponAdmin조회→'/admin/plan-pricing'. ★키=프론트 ADMIN_MENU it.to 경로 동일 SSOT라 오차단 없음. 최고관리자(admin_level='') 전체통과.

## 8. 무음 유실 종결 — 예약 발송 드레인 워커 신설

- **SMS**: `SmsMarketing::dispatchCampaign`→`dispatchCampaignCore`(request비의존) 추출 + `runScheduledQueue` + `bin/sms_queue_cron.php` + crontab(*/5,*/6).
- **Kakao**: `KakaoChannel::sendCampaign`→`sendCampaignCore` 추출 + `runScheduledQueue` + `bin/kakao_queue_cron.php` + crontab. SMS와 대칭.
- 종전 두 채널 다 예약큐만 쌓이고 드레인 워커 부재로 시각 도래해도 영구 미발송이었음(개발자 자인 주석 확인). dry-run 무오류.

## 9. Paddle 동적 상품/가격 관리 (285차 백엔드 + 286차 프론트 완결)

- 백엔드(AdminPlans::paddleSync/paddleStatus, Paddle::syncPlanProduct 자동 Product+월/연 Price 생성)는 285차. **286차 프론트 배선**: PlanPricing.jsx에 상태 패널(env·구성여부·플랜별 Product/Price ID·동기화상태) + "🔁 Paddle 재동기화" 버튼(전체/플랜별). 통화 필드는 Paddle MoR USD 자동현지화라 보류.
- **라이브 활성화 = 운영 .env에 PADDLE_SECRET_KEY(apikey_…) 등록 후 재동기화. 웹훅 서명시크릿(pdch_) 별도 필요.**

## 10. CCTV (METEK ME5208) — 웹연동 불가 최종확정

- 실측: 외부 554(RTSP) 닫힘·8601만 열림(HCMSActiveX). LAN .11:8601(DVR·RTSP無)·.28:554(비표준RTSP·admin:1234 스트림無). HTTP 스냅샷 전 경로 404.
- CCTV-1 캡처 = **JWC Powerful CMS 데스크톱**만 8601 독자프로토콜 재생. 휴대폰=**EZNetViewer 앱**(P2P). RTSP·ONVIF·스냅샷 전무.
- **결론**: 현 장비로 GenieROI 웹연동 불가. **ONVIF/RTSP IP카메라 추가 또는 NVR 교체**만이 방법. 재도전 금지. (274차 브리지/데모구현은 존재하나 이 DVR엔 무용.)

---

## 11. 남은 백로그 (외부 입력 필요 · 지어내기 금지)

| 항목 | 필요한 것 |
|---|---|
| esm(G마켓/옥션)·lotteon 2xx-only 성공판정 | 실 셀러계정 등록 응답형식 검증 후 바디검사 추가(성급수정=false-negative 위험, 사용자 보류) |
| grip 파트너 API 실 배선 | 그립 파트너 API base URL·인증·엔드포인트(현재 정직 pending) |
| braintree PG 정산 어댑터 | Braintree 실 API(현재 live=false honest no-op) |
| 물류 tnt/ems/cj_intl/ocl/fulfillment 추적 | 각 실 추적 API 스펙 |
| ModelMonitor 재학습 큐 | 학습 파이프라인 연결(honest stub·미완 고지됨) |
| CCTV 실시간 | ONVIF/RTSP 신규 장비 |
| admin_menus 전 엔드포인트 정밀강제 | 나머지 grantable 핸들러 있으면 동일 패턴 확장(현재 grantable admin 주요 5핸들러 완료) |

---

## 12. 트랩·교훈 (286차 신규)

- **전역 폴백 리터럴('default')이 SSOT 분산**(WMS wh_id) · **전역 컨텍스트 플래그 mount 자동ON+localStorage 영구=사일런트 하이재킹**(platform_growth).
- **동일 함수 내 취소제외 술어가 항목마다 갈림**(Attribution 전환집합 vs 매출) · **KPI가 그리드와 다른 원천 테이블**(WMS 헤더).
- **가짜성공 폴백**(godomall 2xx→ok:true) · **성공코드 예외 누락**(elevenStFault 0만) · **채널 노출인데 백엔드 소비처 0건**(grip).
- **플랜게이팅**: requirePro=starter(pro아님)·서버 growth 티어 미강제·PlanPolicy 사문화(호출 1곳)였음. 게이트 상향 시 **데모(env='demo') 반드시 면제**(쇼케이스). prod/demo 플랜분포 실측(starter/growth 0명) 후 회귀판정.
- **sub-admin**: plan='admin'이라 requirePlan('admin') 통과 → admin_level='sub' 별도 확인 필요. admin_menus={프론트경로:'view'|'edit'} 맵(키=ADMIN_MENU it.to).
- **PowerShell→plink**: 인라인 `$()`·`\"`·`2>$null` 불안정 → SQL/스크립트는 파일로 pscp 후 실행. `rm -f` 인라인이 안전휴리스틱 오탐 유발.
- **11번가**: prdSelQty(NOT optionAllQty)·selPrc(NOT sellPrc)·성공=resultCode 0/200/210. -997=경로미등록(인증실패 아님).

## 13. 자격증명·배포

- credentials = `memory/reference_session_credentials`(사용자 "삭제" 명시까지 유지·평문노출 금지). SSH root@1.201.177.46, MySQL geniego_roi(운영)/geniego_roi_demo(데모), DB비번은 각 .env GENIE_DB_PASS.
- 배포 = **수동 pscp/plink**(CI inert). 백엔드=파일 pscp+`php -l`+`chown www:www`+`systemctl reload php8.1-fpm`. 프론트=운영 `npm run build`·데모 `npx vite build --mode demo`(혼입금지·번들 `DEMO_MODE:"true"` 검증)→tar→rsync -a --delete→chown. **모든 배포 사용자 승인 의무.** cron 등록=live crontab에 멱등 추가.
- 11번가 셀러계정=[[reference_st11_product_register_full_spec]] 정책(사용자 명시 승인 시 문서열람만). Paddle 자격=사용자 제공분(운영만 라이브·데모 sandbox).

## 14. 현재 라이브 상태

- 운영+데모 프론트 최신 빌드 배포됨(WmsManager·PlanPricing·ApiKeys·App·AdminGrowthCenter·CatalogSync 등). 백엔드 다수 핸들러 배포(ChannelSync·Catalog·Wms·AttributionEngine·OrderHub·Pnl·CRM·Mmm·AutoRecommend·Attribution·Reports·Connectors·SmsMarketing·KakaoChannel·UserAuth·AdminPlans·AdminMenu·AdminGrowth·SiteIntro·LegalDoc·CouponAdmin·PlanPolicy).
- crontab: sms_queue_cron·kakao_queue_cron 등록(*/5 운영·*/6 데모).
- master 미push. feat/n236.
