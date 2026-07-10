# 278차 인계서 — 전 채널 이미지 아키텍처 · 이중청구 근본차단 · 카탈로그 목록 사라짐

> 세션 성격: 277차 미배포 잔재 복구 → 사용자 신고 3건 근본수정 → **채널 이미지 전송 구조 결함** 해소.
> 커밋 3건(`e0f0d59a1c5`, `2e7f5ad9cf9`, `92917585710`), 브랜치 `feat/n236-admin-growth-automation`.
> **운영 + 데모 전부 배포·실서버 검증 완료.** master 미push(관례 유지).

---

## 0. 279차가 가장 먼저 알아야 할 것

| # | 사실 | 근거 |
|---|---|---|
| 1 | **운영 서버 루트 파일시스템이 100% 찼었다** (48G/48G). 180~278차 `dist.bak*` 826개 = 27G. | 사용자 승인 후 정리 → 현재 **22G 사용 / 27G 여유(45%)**. 오늘 롤백본 `dist.bak278`·`dist.bak278b`만 보존 |
| 2 | **배포 때마다 `cp -a dist dist.bak<차수>`를 남기면 또 찬다.** 백업은 1~2개만 유지할 것 | §6 |
| 3 | 실제 자격증명이 등록된 **판매채널은 `naver_smartstore`·`shopify` 둘뿐**(youtube=광고채널) | `SELECT channel FROM channel_credential` |
| 4 | 그래서 나머지 채널의 이미지 구현은 **라이브 검증 불가**. 보류 7채널은 의도적으로 이미지를 안 보낸다 | §3 |
| 5 | 사용자가 **자격증명 발급 신청 중**. 키가 오면 CC에게 알려주기로 함 → 그때 채널별 라이브 검증 | 사용자 발언 |
| 6 | `php` 가 **로컬(Windows)에 없다**. `php -l` 은 원격에서 돌린다(`plink -m`) | pre-commit G11 도 `[skip] php 미설치` |

---

## 1. 사용자 신고 3건 — 근본원인과 수정

### ① "동기화로 가져온 상품이 잠깐 보였다 사라진다" (P0)
- **근본원인**: `CatalogSync` 가 세 소스(등록상품 `po_products` · 채널수집 `channel_products` · 재고 `inventory`)를
  각자 도착하는 대로 `setProducts` 로 **통째 교체**했다. 늦게 온 `/v420/price/products` 응답이 먼저 그린 목록을 지웠다.
- **수정**: 원본을 `poRows`/`chRows` 에 담고 **한 곳에서만 SKU 합집합 병합**(경쟁 제거). 채널에만 있는 상품도 이제 보인다(`_channelOnly`).
- **★배포 전에 잡은 회귀**: 병합 effect 는 `inventory`/`channelProductPrices` 변경마다 재실행된다
  (엑셀 임포트 직후 `syncCatalogItem()` 이 inventory 를 갱신). 통째 교체하면 **임포트·수동추가 행과 미저장 가격편집이 사라진다.**
  → 교체가 아니라 **조정(reconcile)**: `delta` 걸린 행의 사용자 값 보존 + `_local` 행 보존.
- 연동/미연동 필터 추가(`channels` 는 `channel_products` 실원장에서만 채운다 — 추측 없음).

> **왜 안 고쳐져 있었나**: 277차에 코드는 워킹트리에 있었으나 **커밋·빌드·배포가 전부 미수행**이었다(전원 차단 지점).

### ② 광고비 카드 이중청구 (P0 · 돈)
`settleManagedSpend` 동시 실행 시 같은 금액을 두 번 청구 가능. 원인 3중:
1. `orderId` 를 `microtime` 으로 생성 → 같은 정산지점이 매번 다른 주문번호(Toss 멱등 무력화)
2. `mtdCharged` 가 진행중 청구를 누적에서 제외 → 경쟁 프로세스가 "미청구"로 오독
3. 크래시로 중단된 청구를 되찾는 경로 부재

**3중 방어**:
- 결정적 `orderId` = `sha256(tenant|ym|campaign|target)` → Toss 자체 멱등이 최후 방어선
- `UNIQUE(tenant_id, order_id)` 로 카드 긁기 **전에** `'charging'` 행 선점 → 경쟁자는 INSERT 충돌로 탈락
  (별도 락 인프라 불필요 · MySQL/SQLite 공통)
- `reconcileStaleClaims`: Toss 주문조회로 "실제로 돈이 나갔는가"를 매입사 원장에서 확인 후 정정. **우리 DB 를 신뢰하지 않는다.**

**전제 검증**: `Db.php:130/150` `ERRMODE_EXCEPTION` — `claimLedger` 가 UNIQUE 충돌을 예외로 잡는 전제가 성립.
**피해 없음**: `ad_spend_ledger` 운영·데모 **0행** = 실 카드청구가 한 번도 실행된 적 없다. 인덱스도 충돌 없이 생성.
**실측**: 같은 `(tenant, order_id)` 두 번 INSERT → `Duplicate entry` 로 차단 확인(데모 DB, 테스트 행 즉시 삭제).

### ③ `/api/health` 401 (P2)
- **진단 정정**: `/health` 200 은 API 가 아니라 **nginx SPA HTML 폴백**이었다(착시). 실제 라우트는 `/v424/health` 뿐.
  `index.php` 는 `"API Key required for all routes (except / and /health)"` 라고 **거짓 자기문서화**하고 있었다.
- **수정**: 비버전 헬스 라우트 등록(맵 + `$register` **양쪽**) + 인증 우회 추가 + 자기문서화 문자열 정정.
- **★맨 `/health` 는 nginx vhost 가 백엔드로 보내지 않는다**(`/auth|/vNNN|/api` 만). **백엔드 헬스 정본 = `/api/health[z]`.**
- 회귀 0: `/api/v424/orderhub/claims` 는 여전히 401.

---

## 2. 채널 이미지 — 구조 결함과 해소 (이번 차수 핵심)

### 결함의 실체
277차까지 이미지를 실제로 전송하는 어댑터는 **naver·shopify 둘뿐**. 나머지 17개는 이미지를 **아예 보내지 않았다.**
개별 버그가 아니라 **이미지 호스팅 부재**라는 구조 결함:

> 상품등록 폼은 이미지를 **base64 dataURL** 로 보관한다. 그런데 채널 상품 API 는 거의 전부 **공개 URL** 을 요구한다.
> 네이버만 자체 업로드 API 가 있어 동작했고, `uploadImagesForChannel` 은 나머지 채널의 dataURL 을 **그냥 버렸다**(`dropped`).
> 즉 어댑터에는 애초에 보낼 이미지가 없었다.

### 해법 — 3개 신규 클래스

| 클래스 | 역할 | 핵심 |
|---|---|---|
| `MediaHost` | **우리가 공개 URL 을 발급한다** | dataURL → 내용주소(sha256) 파일 → `{publicBase}/api/media/{sha}.{ext}`. 채널 서버가 무인증으로 가져간다. 채널별 업로드 API 를 추측할 필요가 사라진다 |
| `ChannelImage` | 채널 이미지 **능력 레지스트리**(확장점) | `MODE_URL` / `MODE_BLOB` / `MODE_ID` / `MODE_SPEC_REQUIRED` 를 어댑터 **밖에서 선언**. 새 채널 = 한 줄 |
| `ChannelContract` | 전송 전 **계약검사(preflight)** | 누락 필수항목을 **한 번에 전부** 알려준다 |

### `MediaHost` 설계 제약(전부 이유가 있다)
- **dist 바깥 저장** (`repo-루트 data/media`): dist 는 배포마다 `rsync --delete` 로 교체된다. 거기 두면 배포마다 이미지가 사라진다.
- **무인증 공개 서빙**: 채널 서버가 토큰 없이 가져가야 상품에 이미지가 붙는다. 어차피 채널에 공개될 자산.
- **내용주소**: 같은 이미지 = 같은 URL(중복 저장 0 · 큐 재시도 시 URL 안정) · 파일명 추측 불가.
- **바이트 검증**(`getimagesizefromstring`): 확장자를 신뢰하지 않는다 → 위장 파일 차단. 8MB 상한. 원자적 `rename`.
- **★`Db::envLabel()` 을 쓴다, `Db::env()` 가 아니다.** `env()` 는 `GENIE_ENV` 를 보는데 **운영·데모 어느 `.env` 에도 없어**
  데모가 **운영 도메인 URL** 을 발급했다(환경 혼입 — 실측 발견·수정). 실제 구분자는 DB명 `geniego_roi_demo`.
- **★`data/` 는 `root:root` 였다** → `data/media` 를 **`www-data`**(FPM 사용자) 소유로. **273차 `priceopt.sqlite` 와 동일 결함 클래스.**
  (주의: 코드 파일은 `www:www`, **쓰기 대상 디렉터리는 `www-data`**)

### `ChannelImage` — 새 채널 추가 규율
```
① CAPS 에 한 줄 선언한다.
② 어댑터는 필요한 형태만 요청한다: urls() / blobs() / ids().
```
**선언을 잊으면 조용한 누락 대신 경고가 뜬다**(미선언 → `spec_required` → 결과에 사유 노출). 실제 미존재 채널명으로 검증함.

| 상태 | 채널 | 방식 |
|---|---|---|
| **라이브 검증됨** | naver, naver_smartstore | 자체 업로드 API → URL |
| **구현 완료(문서기준·스모크 대기)** | coupang, cafe24, woocommerce, ebay, 11st/st11, qoo10, godomall, amazon(_spapi), lazada, shopify, magento, shopee, etsy | URL 직접 / base64 본문 / 선업로드 후 id |
| **보류 7 — 의도적 미전송** | tiktok(_shop), walmart, rakuten, yahoo_jp, gmarket, auction, lotteon | 규격 미확정 |

**보류 7의 판단 근거(반드시 유지할 것)**: 필드명을 추측해 보내면 채널이 등록을 거부한다.
그러면 **자격증명을 넣는 순간 "오류→수정→재시도" 사이클이 7개 채널에서 시작된다** — 네이버에서 겪은 바로 그 일.
그래서 이미지를 **빼고 등록하되 사유를 결과에 실어 노출**한다. 이것은 "미구현"이 아니라 **의도된 안전 상태**다.

채널별 실제 구현 위치(어댑터 payload 키):
- coupang `items[].images[{imageOrder,imageType,vendorPath}]` · cafe24 `detail/list/tiny/small_image` + `additional_image[]`
- woocommerce `images[].src` · ebay `product.imageUrls[]`(https만) · 11st `prdImage01..10`
- amazon `main_product_image_locator` + `other_product_image_locator_1..8`
- lazada: 외부 URL 거부 → `/image/migrate` 로 Lazada CDN 복사 후 `<Images><Image>`
- magento: URL 불가 → `media_gallery_entries[].content.base64_encoded_data`(로컬 파일에서 읽음)
- shopee: `media_space/upload_image` → `image.image_id_list`
- etsy: 상품 payload 에 이미지 불가 → 초안 등록 후 `uploadListingImage(listing_id, rank)` **2단계**

### `ChannelContract` — 왜 만들었나 (네이버에서 배운 것)
채널은 오류를 **한 번에 하나씩** 알려준다:
`리프카테고리 → 고시정보 → 배송비 → AS → 원산지 → 대표이미지 …` 채널당 6회 왕복 × 17채널 = 100회.
**이것이 수정이 반복된 구조적 원인이다.**

→ 필수 항목을 선언해 두고 **전송 전에 전부 모아 한 번에** 한국어로 알려준다. 채널 API 는 **부르지도 않는다**
(실패 카운트·페널티·중복 등록 방지). 기존 어댑터 honest-gate 는 **제거하지 않고** 앞단에 그물을 하나 더 놓았다(확장 우선).

**★수정(update)에는 공통 필수를 걸지 않는다** — 가격만 바꾸는 리프라이서 writeback 은 `name` 을 싣지 않는다. 걸면 회귀.

### 조용한 실패 제거
`jobResultById` 가 `warning`/`missing`/`images_uploaded` 를 끌어올린다.
종전엔 잡 결과 JSON 에만 남고 버려져 **`ok=true` 로 보이는 등록의 이미지 누락을 사용자가 알 수 없었다.**
누락 항목은 **목록**으로 표시(한 줄로 뭉치면 무엇부터 채울지 안 보여 왕복이 다시 늘어난다).
자격증명이 없어도 이미지는 호스팅한다(`awaiting_credentials` 경로의 이미지 유실 방지).

---

## 3. `media_gc_cron` — 저장소 무한증가 차단

`MediaHost` 는 상품 등록마다 커지는데 삭제 경로가 없었다. **이 서버가 오늘 누적 dist 백업으로 루트 100% 가 된 것과 동일 실패 유형.**

- **참조된 파일은 절대 삭제 안 함**: `catalog_listing` · `channel_products` 의 `image_url`/`images_json`
  + **미소비 큐(`queued`/`awaiting_credentials`/`running`) payload**(전송 전에 파일이 사라지면 이미지 없이 등록된다)
- **유예 7일**: 방금 저장됐지만 아직 어느 테이블에도 반영 안 된 파일 보호
- 기본 **dry-run**, `--apply` 로만 삭제
- crontab 등록됨(주 1회): 운영 `17 4 * * 0`, 데모 `37 4 * * 0` → `/var/log/genie_media_gc*.log`

**실서버 3케이스 검증**: 참조→보존(삭제 후에도 서빙 200) · 최근 고아→보존 · 오래된 고아→삭제.

---

## 4. 검증 로그 (실서버)

| 항목 | 결과 |
|---|---|
| MediaHost 저장(www-data) → 무인증 공개 GET | 200 · `Content-Type: image/png` · 실제 PNG 바이트 |
| 멱등(같은 바이트 → 같은 URL) | `SAME_URL_OK` |
| 위장 이미지(확장자만 png) | 거부(`NULL`) |
| 경로조작 `..%2f` / `--path-as-is` | 누출 0 (200 은 전부 SPA HTML · `/etc/passwd` 내용 없음) |
| 운영/데모 URL 분리 | prod→`www.genieroi.com` · demo→`demo.genieroi.com` · 파일도 각자 저장 |
| ChannelContract: 빈 상품 | 누락 **5건 일괄** 표기 |
| ChannelContract: 완전 상품 | 20채널 전부 통과 |
| ChannelContract: 리프라이서 update | 통과(무회귀) |
| 어댑터 dataURL 유출 | `NO_DATAURL_LEAK` |
| `php -l` (6파일) | 전건 OK · fpm fatal 0 |
| 운영/데모 스모크 | `/` 200 · `/api/health` 200 · `/api/media/{sha}.png` 200 |

**★검증 중 잡은 거짓 통과 2건(교훈)**
1. GC 첫 테스트의 "고아 삭제 OK" 는 **파일이 애초에 안 만들어진** 거짓 통과였다(1×1 GIF 43B < 64B 하한에 걸림).
   → 유효한 16×16 PNG(79B)를 만들어 삭제 경로를 실제로 태웠다. **"통과"를 봤으면 그 경로가 실행됐는지 확인할 것.**
2. 배포 가드가 운영 dist 스왑 직전 중단시켰다 — **운영 번들엔 `VITE_DEMO_MODE` 토큰이 아예 없다**
   (데모만 `VITE_DEMO_MODE:"true"` 인라인). 가드 조건이 틀렸던 것이나 **dist 손상 전에 멈춰서 무해**.
   판정식: prod = `VITE_DEMO_MODE:"true"` **부재** / demo = **존재**.

---

## 5. 새로 알게 된 트랩 (메모리 반영 대상)

| 트랩 | 내용 |
|---|---|
| `Db::env()` vs `envLabel()` | `env()` 는 `GENIE_ENV` 의존인데 **운영·데모 .env 어디에도 없다** → 데모에서도 `production`. 호스트 정체성 판별은 **반드시 `envLabel()`**(DB명 `_demo` 접미) |
| 쓰기 디렉터리 소유권 | 코드=`www:www`, **쓰기 대상=`www-data`**(FPM 사용자). `data/` 는 `root:root` 기본 → 273차 `priceopt.sqlite` 500 과 동일 클래스 |
| `/health` 200 은 API 가 아니다 | nginx SPA 폴백. 백엔드 헬스 정본 = `/api/health[z]`. vhost 는 `/auth\|/vNNN\|/api` 만 백엔드로 보낸다 |
| ko.js `catalogSync` 이중 존재 | top-level `"catalogSync":`(9980행)과 **중첩 depth-2**(12455행). 중첩에 넣으면 `t()` 가 못 읽는다. **삽입 후 ESM import 로 값 확인 필수** |
| PowerShell → plink | `$(...)`·`\$f` 가 로컬에서 전개돼 깨진다. **복잡한 원격명령은 `.sh` 작성 후 `plink -m`**(기존 트랩 재확인) |
| dist 백업 누적 | `cp -a dist dist.bak<차수>` 를 매 배포마다 남기면 루트가 찬다. **1~2개만 유지** |

---

## 6. 배포 상태

- **운영** `www.genieroi.com`: 프론트 `index-ZJtg0xN8.js` · 백엔드 전 파일 반영 · 200
- **데모** `demo.genieroi.com`: 데모 플래그 확인(`VITE_DEMO_MODE:"true"`) · 200
- 백업: 프론트 `dist.bak278`/`dist.bak278b`, 백엔드 `*.bak.278`/`*.bak.278m`/`*.bak.278h`/`*.bak.278c`
- 디스크: **22G / 48G (45%)**
- crontab: 총 62줄 · `writeback_cron` 2 생존 · `media_gc` 2(중복 0)
- 커밋 3건, 브랜치 `feat/n236-admin-growth-automation` push. **master 미push**(관례).

---

## 7. 279차 할 일

1. **[대기] 자격증명 발급** — 사용자가 신청 중. 키가 오면 채널별로:
   연결테스트 → `ChannelContract` preflight 로 누락 일괄 확인 → 실제 상품 등록 → 이미지 첨부 확인 → 판매중지.
   **preflight 덕분에 왕복이 6번이 아니라 1번**이어야 한다. 안 그러면 계약 선언이 틀린 것이니 `ChannelContract::REQUIRED` 를 고칠 것.
2. **보류 7채널 완성** — 자격증명 또는 API 문서 확보 시. `ChannelImage::CAPS` 를 채우고 어댑터에 emit + `live=>true` 로 승격.
   **문서 없이 필드명을 지어내지 말 것**(§2 판단 근거).
3. **shopify 자격증명 보강** — `shop_domain` 이 없고 `access_token` 만 있어 어댑터가 즉시 정직 실패. 이미지 경로 미검증 상태.
4. 구현 12채널은 자격증명이 오는 대로 **첫 등록에서 스모크**(payload 가 실제로 채널에 받아들여지는지).
5. dist 백업 정리 정책을 `deploy` 스크립트에 넣을지 검토(§5 마지막 트랩).
