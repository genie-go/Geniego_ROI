# 284차 세션 인계서 — 자동새로고침 데이터손실 근본수정 · 11번가 카테고리(표시+기본) 완성 · 예산 하드상한 · 전수감사 · **11번가 등록 502 근본치료** · 11번가 -997 진단

> 브랜치 `feat/n236-admin-growth-automation` (master 미접촉 → CI 자동배포 없음). 운영=`www.genieroi.com`(/home/wwwroot/roi.geniego.com), 데모=`demo.genieroi.com`(/home/wwwroot/roidemo.geniego.com). 전 커밋 운영+데모 배포·검증 완료.

## 0. 284차 커밋 일람 (6, 전부 운영+데모 배포·검증)

| 커밋 | 내용 |
|---|---|
| `d81055066f4` | 예산 하드상한·11번가 카테고리 확인팝업·취소제외 SSOT·가짜성공 제거·회귀수정 |
| `9828d8a2dd6` | WMS 유령창고·LINE/카카오 자격증명 managedPage·11번가 표시카테고리 |
| `1b6ca369556` | Pro 요금제 서버 강제·11번가 상품별 매핑/표시카테고리 개별화 |
| `0e859cedd01` | 11번가 기본+표시 이중 카테고리 매핑·AiDesignEngine 가짜AI 제거·Naver SA channel_id |
| `43adceb9219` | 11번가 기본카테고리 전송 배선 — resolveBaseChannelCategory + `<ctgrNo>` |
| `1608063bd93` | **11번가 등록 502 근본치료(php-fpm 풀)** + P2 자격증명 필드 정리 |

## 1. 핵심 성과

### ① 자동 새로고침 데이터손실 근본수정 (사용자 최우선 지시)
- 저장 중 페이지가 자동 새로고침되며 입력자료가 삭제되던 문제. `frontend/src/services/unsavedGuard.js`(신규) — markDirty/clearDirty/isDirty/safeReload/forceReload/allowNavigation + beforeunload 가드.
- 5개 소스 제거/게이팅: App.jsx·main.jsx·public/sw.js(`c.navigate()` 강제 탭 새로고침 제거)·index.html(서킷브레이커). PriceOpt.jsx 상품폼 draft 자동저장(`tScopedKey('genie_product_draft_v1')`).

### ② 11번가 카테고리 — 표시+기본 완성
- **모델(사용자 확정)**: 매핑카테고리=내 그룹핑(`category`), 표시카테고리=11번가 dispCtgrNo(`category_code`). **상품 하나당 표시 1개·매핑 1개 개별 설정**(공용 기본값 제거).
- **카테고리 확인 팝업**: 11번가는 자동조회 API가 있으나(문서엔 없다더니 실존) `elevenStCategoryCatalog()`(XMLReader 스트리밍·3MB EUC-KR·15,295건, SimpleXML 풀DOM은 OOM). 공용 카탈로그를 `channel_category_catalog` tenant_id=`__shared__`에 시딩(15,295행 운영/데모 완료) → 피커는 DB 읽기.
- **이중 카테고리 매핑**: 카탈로그 동기화>카테고리 매핑에서 채널=11Street 선택 시 변경 버튼이 기본카테고리+표시카테고리 2슬롯 지정(CatalogSync.jsx dualCat). `channel_category_map`에 base_code/base_label 컬럼 추가.
- **기본카테고리 전송 배선**: `Catalog.resolveBaseChannelCategory()`가 매핑카테고리로 base_code 조회 → payload `base_category_code` → `ChannelSync.elevenStWrite`가 값 있을 때만 `<ctgrNo>`로 dispCtgrNo와 동반 전송. **★`<ctgrNo>` 태그명은 미확정 추정**(11번가 상품등록 스펙이 JS렌더 SPA라 추출불가, 사용자 승인하 우선 적용). 실등록 시 거부되면 한 줄 교체.

### ③ 예산 하드상한 (사용자 P0·2회 강조)
- 배정예산 초과 광고비 집행 절대금지. `AutoCampaign.enforceBudgetCaps($pdo,$allowActuate)` — 매 cron 틱마다 전 활성캠페인 점검, 97%(AD_BUDGET_CAP_MARGIN)에서 cadence/기간/카드 무관 일시정지. periodSpentToDate/periodWindowStart가 전 기간(월/분기/반기/연)으로 일반화. launch가 `array_sum(alloc)<=budget`(422) 검증. **캠페인별 배정예산을 기간한도 내 개별 집행**.

### ④ 전수감사 확정 수정 (배선진위·가짜성공)
- 취소/반품 제외 SSOT: `OrderHub::observedExclusionInline($alias)`(무파라미터 SQL) → Mmm/AdAdapters/AttributionEngine/AttributionMetrics/EmailMarketing/PgSettlement/PriceOpt 등 10곳 인라인 중복 통일.
- Pro 요금제 서버 강제: `UserAuth::requirePlan` rank맵→`\Genie\PlanPolicy::RANK`. requirePro()→requirePlan('starter'). Wms/SupplyChain/DemandForecast/LiveCommerce/RuleEngine의 Pro 핸들러→requirePlan('pro'). **검증: starter 403·admin 200**.
- CampaignManager/InstagramDM 가짜성공 제거(응답검증·실패 시 롤백). Risk.php 6 admin 메서드 requirePlan('admin'). CommandPalette hasMenuAccess 필터. AiDesignEngine 정직 라벨(🤖 AI생성 vs 🖼️ 로컬템플릿). routes.php 10개 `/api` 라우트 basePath strip 404 수정.

### ⑤ ★11번가 등록 HTTP 502 근본치료 (`1608063bd93` + 서버 인프라)
- **근본원인**: php-fpm 운영 풀 `[www] pm.max_children=5` 워커 고갈. 등록 버스트/cron 동시부하가 5워커 포화 → nginx 502. (제 코드 회귀 아님. fpm 로그 `server reached pm.max_children setting (5)` 확증.)
- **인프라 튜닝(git 밖·서버 설정, 백업 `*.conf.bak.284`)**: 운영 `[www]` max_children **5→12**·start_servers 2→4·min_spare 1→2·max_spare 3→8·max_requests=500·`php_admin_value[memory_limit]=384M` 신설. 데모 `[demo]` 10→12·memory_limit 384M. **데모·운영 별도 pool+소켓 완전격리**(데모 `/run/php/php-fpm-demo.sock`).
- **코드**: ChannelSync curl 헬퍼 5종 `CURLOPT_CONNECTTIMEOUT=8` — 불통 외부 API가 워커 최대 20~40s 점유하던 것을 8s 상한.
- ★트랩: www.conf에 주석 `;php_admin_value[memory_limit] = 32M`이 있어 `grep -q memory_limit` append가 스킵됨 → 주석/기존 라인 삭제 후 재append 해야 실적용. `memory_limit=-1`(무제한) 기본이라 상한 필수. (메모리 `reference_phpfpm_pool_tuning_502` 정본)
- **검증**: config test 성공·운영/데모 health 200·워커 12까지 스케일·브라우저 콘솔에러 0.

### ⑥ P2 자격증명 필드 정리 (`1608063bd93`)
- rakuten `shop_url`: 어댑터(ESA 인증=service_secret+license_key)가 안 읽는 죽은 필수필드 → 선택(opt).
- taboola/outbrain `currency`: 라벨 정규식('선택') 의존 → 명시 `opt:true` 견고화.

## 2. ★★ 다음 차수 최우선 — 11번가 -997 (API 이용신청 승인 확인)

- **현 상태**: 사용자가 11번가 오픈API 접속권한에 **상용서버 IP `1.201.177.46` 등록(하루+ 경과)**. 그럼에도 운영에서 **복호화된 실키(acct_1/st11, 32자)로 주문조회 API 직접호출 → 여전히 -997** 재현. **★메시지="등록된 API 정보가 존재하지 않습니다"**(미허가 IP 아님).
- **판단**: IP 문제보다 **키의 API 이용신청(구독) 미승인** 쪽. 11번가 오픈API는 IP 등록과 별개로 API 종류별(상품/주문/정산) 이용신청·승인이 필요.
- **다음 차수 확인**: ①11번가 오픈API센터 마이페이지 → API 이용신청 현황에서 **상품·주문 API "승인완료"** 여부 ②openapikey 유효/활성 여부(재발급 필요성) ③IP 등록 셀러 ↔ 저장 키 셀러 일치. 승인 확인 후 실등록 1건으로 `dispCtgrNo`/`<ctgrNo>` 인증·전송 검증(사용자 승인하).
- **재현 도구**: 복호화는 `\Genie\Crypto::decrypt()`(enc:v1: 봉투). 검증 스크립트 패턴=인증 읽기 `GET http://api.11st.co.kr/rest/ordervice/orderList/202`.

## 3. 잔여 백로그 (하위·선택)
- 11번가 `<ctgrNo>` 태그명 실등록 응답으로 최종 확정(현재 추정).
- rakuten shop_url 완전 제거 여부(현재 선택으로 완화만).
- 기타 P2/P3는 사용자 요청 시.

## 4. 배포/브랜치
- pscp/plink 파일카피. 운영+데모 docroot. **★master 미push·feat/n236만**(CI inert — 시크릿 미등록으로 CI는 빌드만). 데모=`npx vite build --mode demo`(VITE_DEMO_MODE:"true" 플래그=1)·운영=`npm run build`(플래그=0) 혼용금지. dist swap=`rsync -a --delete`.
