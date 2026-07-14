# 285차 세션 인계서 — 11번가 -997 오진 정정 · 주문/상품 연동 실경로 복구 · 502 근본치료 · 브랜드 관리 신설 · 챗봇/매뉴얼/15개국

> 브랜치 `feat/n236-admin-growth-automation` (master 미접촉 → CI 자동배포 없음). 운영=`www.genieroi.com`(/home/wwwroot/roi.geniego.com), 데모=`demo.genieroi.com`(/home/wwwroot/roidemo.geniego.com). 전 커밋 운영+데모 배포·검증 완료.

---

## 0. 285차 커밋 일람 (6, 전부 운영+데모 배포·검증)

| 커밋 | 내용 |
|---|---|
| `2a80c63ab13` | **11번가 -997 오진 정정 + 카테고리 스코프 버그 = 502 근본치료** |
| `53e37d99a8a` | 11번가 주문 동기화 복구 — 기간별 결제완료 목록조회 배선 |
| `16d931b8407` | 11번가 판매중지 허구경로 정직화 + selMthdCd 필수필드 + 오류메시지 추출 보강 |
| `58c3b3b8954` | 11번가 상품등록 필수필드 — selMthdCd=01(고정가) + brand 배선 |
| `b8b9df626ea` | **브랜드 관리 신설** — 상품별 브랜드 선택 + 11번가 API 연동 |
| `8322feb0024` | 카탈로그 목록 브랜드 지정 + 챗봇·발급매뉴얼·15개국 현지화 |

---

## 1. ★★ 최중요 발견 — 284차 "11번가 -997 = API 이용신청 미승인"은 오진이었다

**284차 인계서가 "다음 차수 최우선"으로 지목한 -997 진단은 근거가 무너졌다.** 사용자 주장("API 인증은 잘 되어 있다")이 처음부터 맞았다.

### -997의 진짜 의미 (운영 실측으로 확정)
`<AuthMessage><resultCode>-997</resultCode><resultMessage>등록된 API 정보가 존재하지 않습니다.</resultMessage></AuthMessage>` (HTTP 500)

이건 **인증 실패가 아니라, 요청한 (경로 + HTTP 메서드) 조합이 11번가에 등록된 API가 아니라는 뜻**이다. 한글 문구가 "등록된 API **정보**"라 마치 "네 키의 이용신청 정보가 없다"로 읽히지만 아니다.

**운영 서버(1.201.177.46) 실키로 직접 검증한 결과:**

| 호출 | 결과 | 의미 |
|---|---|---|
| 일반 API `ProductSearch` (openapi, `key=`) | 200 · 552,290건 | 키 유효·활성 |
| `GET /rest/ordservices/complete/{ordNo}` | 200 · result_code=0 | 셀러 API 인증 통과 |
| `POST /rest/prodservices/product` (깨진 바디) | JAXBException | 인증 통과·파싱 도달 |
| `GET /rest/cateservice/category` | 200 (★키 없이도) | 카테고리는 무인증 공개 API |
| `/rest/ordervice/orderList/202` (284차 코드) | **-997** | 서비스명 오타 `ordervice`, 메서드 `orderList` 부재, 쿼리스트링 방식 — **세 겹으로 틀린 허구 URL** |

→ **키·IP 등록·API 이용신청 승인 3개 전부 정상.** 284차 재현 테스트가 때린 URL이 우리 코드가 지어낸 허구였고, 거기서 나온 -997을 "이용신청 미승인"으로 오독했다. **다시 의심하지 말 것.**

### 정본 메모리
`reference_st11_openapi_997_and_paths` — -997 의미·실측 경로표·유효경로 판별 오라클.

---

## 2. 11번가 실연동 경로 — 코드에 박혀 있던 URL 상당수가 허구였다

인증이 통과하므로 **경로 유효 시 200 / 부재 시 -997** = **URL 유효성 오라클**을 확보. 이걸로 전수 판별:

| 기능 | 확정 경로 | 상태 |
|---|---|---|
| 상품등록 | `POST https://api.11st.co.kr/rest/prodservices/product` | ✅ 정상 |
| 상품수정 | `PUT .../rest/prodservices/product/{prdNo}` | ✅ 정상 |
| **주문 목록** | `GET .../rest/ordservices/complete/{startTime}/{endTime}` (YYYYMMDDhhmm·KST·최대7일·3000건) | ✅ **285차 복구** (종전 `ordervice/orderList/202?dateFrom=` = 허구) |
| 카테고리 | `GET http://api.11st.co.kr/rest/cateservice/category` | ✅ 무인증 |
| **판매중지** | `PUT .../prodservices/product/sellingStop/{cpid}` | ✗ **-997 허구 → 미배선 처리** |

**주의: 카테고리 수집 성공은 키 유효성의 증거가 아니다** — 그 호출엔 키가 안 실린다(284차가 이걸로 착시). 코드 위치 = `ChannelSync.php`:
- `ST11_ORDER_WINDOW_DAYS`(주문창 7일) · `elevenStFetch`(ns2 네임스페이스 파서: `<ns2:orders><ns2:order>` → 접두 제거 후 SimpleXML)
- `ST11_SELLING_STOP_PATH`(공백 — 공식 스펙 확정 전까지 가짜성공 금지)
- `elevenStFault()` — 11번가는 2xx 바디에도 거부코드를 싣는다. HTTP 코드만 보고 성공 처리 금지.

### 상품등록 필수 3종 (하나라도 없으면 등록 거부 — 운영 실등록으로 순차 확정)
1. **표시카테고리(dispCtgrNo)** — 카테고리 매핑/확정 패널에서 지정
2. **판매방식(selMthdCd)** — `01`(고정가판매) 자동 전송. 공식 코드표: 01=고정가·02/03=사용안함·04=예약·05=중고. **API는 고정가/예약/중고만 제공** (값 `0`은 "API로 이용할 수 없는 판매 방식" 거부)
3. **브랜드(`<brand>`)** — 브랜드코드(apiPrdAttrBrandCd) 미보유 시 브랜드명 필수

**★EUC-KR 변환 필수**: `elevenStWrite`가 XML 선언·Content-Type은 EUC-KR인데 바디를 UTF-8로 보내 한글 상품명이 깨지던 것 수정(`mb_convert_encoding`).

---

## 3. ★HTTP 502 근본치료 — max_children이 아니라 카탈로그 읽기 스코프 버그

284차는 502를 "php-fpm `[www] max_children=5` 워커 고갈"로 보고 5→12로 올렸다. **그건 증상 완화일 뿐 진짜 원인이 아니었다.**

**진짜 원인**: `Catalog::rankChannelCategories`가 11번가 카탈로그를 `tenant_id=<실테넌트>`로 읽었는데, 11번가 카탈로그는 공용 채널이라 **`__shared__` 스코프**에 적재된다.
→ COUNT 항상 0 → 매 호출마다 `syncChannelCategories()` → **11번가 3MB XML 재수집 + 15,295행 upsert** → 재조회도 잘못된 스코프라 0건 → 추천은 늘 빈 배열.
`pendingCategories`(상품 N건 루프)·`writeback`(상품마다 autoMatch)에서 상품 수만큼 반복 → `upstream timed out` → 워커 고갈 → 502.

**수정**: `Catalog::leafCategoryPool()` — 읽기 스코프를 쓰기 스코프(`__shared__`)와 일치시키고 **요청당 1회만** 조회(static 메모). 카탈로그가 실제로 빌 때만 1회 수집.

**검증(운영 실행)**: 미확정 11번가 10건 처리 **40초+ 타임아웃 → 0.25초**. 추천 후보 0건 → 정상 채움.

> 교훈: **공용 스코프로 쓰는 데이터는 읽을 때도 같은 스코프로 읽어야 한다.** 쓰기만 `__shared__`로 바꾸고 읽기를 안 바꾸면 "조회 0 → 재수집 → 여전히 0" 무한 재수집 루프가 되고, 에러 없이 조용히 느려진다. **max_children을 올리기 전에 nginx error.log의 `upstream timed out` 대상 엔드포인트부터 보라.**

정본 메모리: `reference_phpfpm_pool_tuning_502`(285차 정정) · `project_n285_st11_997_and_502_rootfix`.

---

## 4. 브랜드 관리 신설 (사용자 요청) — 브랜드를 1급 데이터로 승격

브랜드는 상품 폼 자유입력 1곳뿐이었고 `catalog_listing`에 컬럼조차 없어(writeback payload로만 운반) 수집 상품(네이버 등)은 브랜드가 영원히 비어 11번가 등록이 원천 거부됐다.

### 백엔드 (Catalog.php · routes.php)
- `catalog_listing.brand VARCHAR(190)` 컬럼 승격(멱등 ALTER). currentListing/mergeWithExisting/upsert 전 경로 배선(빈값 보존 COALESCE(NULLIF)).
- `catalog_brand` 테이블 신설(tenant_id, name, code, UNIQUE(tenant,name)) — 테넌트 브랜드 정본.
- 엔드포인트 4종: `GET/POST /catalog/brands` · `DELETE /catalog/brands/{id}` · `POST /catalog/assign-brand` (맵+$register 두 곳).
- `ensureBrand()`: 상품 저장 시 새 브랜드 자동 등록 → 목록이 항상 실사용값 정본.
- `assignBrand`: 정본 목록 값만 허용(자유입력 우회 차단). channel 생략=전채널(상품단위·전송안함) vs 명시=즉시전송.
- `deleteBrand`: 사용 중 브랜드 409 거부.
- `pendingCategories` 확장: **브랜드 미지정도 "확정 필요"**로 잡음(BRAND_REQUIRED_CHANNELS=11st/st11).

### 프론트 (CatalogSync.jsx · PriceOpt.jsx)
- 🏷️ **브랜드 관리 탭** 신설(CRUD·사용상품 수).
- **카탈로그 목록 테이블에 브랜드 컬럼** — datalist 인라인 입력(자동완성+신규 자동등록), 빈값 주황 경고. 선택상품 **일괄지정** 드롭다운. 지정 시 상품 마스터(`PUT /v420/price/products`)+전 채널 리스팅 동시 갱신.
- 확정 필요 패널에 브랜드 셀렉트+즉석 신규 추가.
- PriceOpt 상품정보: 브랜드 자유입력 → datalist 선택형. ★i18n 버그 동반 수정(`priceOpt.brand`/`manufacturer` 키가 전 로케일 부재 → 화면에 키 문자열 노출되던 것).

---

## 5. 챗봇 자동인지 + 발급 매뉴얼 + 15개국 (사용자 요청)

### ★i18n 함정 (다음 차수 필독)
ko.js에 `catalogSync` 블록이 **3곳**: `topbar.pg`(라벨), **루트(정본, ~10028행)**, `crm.email.catalogSync`(약 12503행 = **죽은 블록·도달불가**). **신규 키는 반드시 루트 블록에**. 처음 12503에 넣었다가 도달 불가라 되돌림. (`priceOpt`도 루트 ~2827행 vs `pages.priceOpt` ~17677행.)

### 챗봇 ("무엇이든 물어보세요")
- 브랜드 UI를 **3-세그먼트 ns `catalogSync.brand.*`**로 작성 → 생성기가 **독립 feature**로 인식(MIN_KEYS≥4·title 일반명사 아님·라우트 도달).
- 결과: `chatbot_feature_details.json`에 `catalogSync.brand`(브랜드 관리) 생성 — 경로 /catalog-sync, 행동6·입력8·상태4·주의2, **15개국 기능명 별칭**(base 로케일 `title` 주입 — 생성기가 base에서만 별칭을 읽음).
- `GeniegoKnowledge::menuGuides()`에 `catalogSync` 초보자 따라하기 신설. `issuance()` 11번가·네이버 항목 대폭 보강(셀러 전환·IP=승인전제·이용신청 승인·-997 의미·필수 3종).
- `chatbot_feature_curated.md` 반영. `npm run chatbot:kb`로 KB 2파일 재생성·배포.

### 발급 매뉴얼 (11번가) 15개국
- `issuanceGuide` 15개국 st11 → **8단계 통일**(배열길이 1:1 규약). Seller 전환·IP 승인전제·이용신청 승인·필수 3종·-997 오해방지.
- `manual_rich/st11.json` 15개 언어에 "상품등록 전 준비물" 섹션(체크리스트+오류표+경고) 추가.
- `node tools/gen_rich_manuals.mjs --only st11 --include-ko`로 `public/api_manuals/{15개국}/st11.html` 재생성. **★deploy.ps1에 매뉴얼 생성기 훅 없음 → 수동 실행 후 커밋 필수.**

### 15개국 현지어
- `catalogSync.brand.*` + `priceOpt.brand/brandPh/manufacturer`를 ko.js 루트 + `autofill.json` 14개국 **현지어 490건 직접 작성**(CLAUDE_API_KEY 미설정 시 autofill 스킵→영어폴백 방지).
- **ja/zh sacred SHA 동반 갱신**(`catalogSync.brand.title` 별칭 주입=의도적 신규키). `.githooks/baseline.json` 285 버전.

---

## 6. 검증 결과

- 11번가 실호출: 주문목록 200·result_code=0, ns2 파서 주문 추출 정상, 상품등록 필수필드 순차 확정.
- 502: 미확정 10건 40초+ → **0.25초**, 추천 정상 채움.
- 브랜드 KB: feature `catalogSync.brand` 생성·14개국 별칭·행동6/입력8.
- 매뉴얼: 운영·데모 `/api_manuals/ko/st11.html` HTTP 200, "브랜드 관리/상품등록 전 준비물/-997" 포함.
- 라우트: `/catalog/brands` 401 · `assign-brand` 405 · 통제군 404 · 챗봇 `/api/v422/ai/assistant` 401.
- 빌드 통과·php -l 통과·pre-commit 게이트 전부 통과(sacred SHA·충돌0·triage 3종 PASS).
- 운영+데모 동등 배포(데모혼입 0)·fpm reload 완료.

---

## 7. 다음 차수 잔여 (하위·선택)

1. **11번가 실등록 완주** — 브랜드까지 채운 뒤 등록 시 다음 필수 필드(배송정보·출고지·반품지 등) 나올 수 있음. 오류가 이제 진짜 사유로 보이므로(`elevenStFault`) 순차로 채우면 됨. 사용자가 재시도 캡쳐 제공 시 이어감.
2. **11번가 기본카테고리 `<ctgrNo>` 태그명** — 여전히 미검증 추정(`ChannelSync.php`). 실등록 응답으로 확정.
3. **11번가 주문 "발송처리"(송장 전송)** — 공식 스펙(개발가이드 로그인)에서 URL 확정 필요. 절대 지어내지 말 것.
4. **판매중지 URL** — `ST11_SELLING_STOP_PATH` 공백. 공식 스펙 확정 시 `{cpid}` 포함 전체 URL 넣으면 됨.
5. **priceOpt 필수정보 섹션 i18n** — `reqFieldsTitle`·`taxType` 등 다수 키가 전 로케일 부재(263키). 브랜드·제조사만 이번에 해소. 나머지는 화면에 키 문자열 노출 상태.
6. **운영 로그 로테이션** — `error.log` 194MB(로테이션 부재). `POST /api/ai/generate/ad-copy` → Slim Not found(미배선 라우트).
7. **브라우저 실검증 미완** — 헤드리스 로그인 403(레포 알려진 트랩). 배포본 UI 문자열·API·매뉴얼 서빙은 확인. **실제 화면 동작은 사용자 확인 필요.**

---

## 8. 배포/브랜치

- 브랜치 `feat/n236-admin-growth-automation` (master 미접촉·CI 자동배포 없음).
- 전 커밋 운영+데모 수동 배포(pscp/plink)·fpm reload·검증 완료.
- **★11번가 인증 문제 없음 확정. 284차의 "이용신청 미승인" 가설은 폐기.** 재의심 금지.
