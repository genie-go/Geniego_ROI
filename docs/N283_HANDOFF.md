# 283차 세션 인계서 — 경쟁 재검증 + 약점 초고도화 + **적대적 재평가(R2)** + 운영/데모 배포

> 브랜치 `feat/n236-admin-growth-automation` · 커밋 **`03f3f8e87e6`(R1) → `8c65d4926ec`(R2) → `1eb469ff6da`(이력)** · push 완료 · **master 미접촉**(CI 자동배포 미트리거)
> 운영 `www.genieroi.com` + 데모 `demo.genieroi.com` **2회 배포·스모크 검증 완료**(사용자 명시 승인)

---

## ⚠️ 이 문서를 읽는 다음 세션에게 — 가장 먼저 읽을 것

**아래 §1~§6은 R1(초고도화) 시점 기록이고, 그 자평은 과대였다.** 초고도화 직후 **반증 전제로 적대적 재평가**를 돌렸더니 **283차가 스스로 재생산한 결함 8건**이 나왔다(§8). R1 자평 ≈86 → 적대적 재채점 ≈79 → **R2 수정 후 확정 ≈85**.

**따라서 §3(구현 내역)의 "완료" 표현을 그대로 믿지 말고, 반드시 §8과 함께 읽어라.** 특히 R1이 "루프 폐쇄", "판매문구 6건 정정"이라 적은 것은 **사실이 아니었다**(§8에서 정정·수정 완료).

**★다음 세션 필수 원칙: 자기 산출물을 반드시 적대적으로 재검증(반증 시도)하라. 자평은 신뢰하지 마라.**

---

## 0. 세션 개요

사용자 지시: ①경쟁사 대비 기능별 상세 재평가(글로벌 포함) ②**자격증명 미등록 = 감점 금지**(키만 넣으면 실행되는 코드는 구현됨) ③과거 "구현했는데 미구현으로 오판"한 사례를 정확히 짚을 것 ④약점 전부 초고도화 ⑤평가자료를 이력으로 남길 것 ⑥배포·push·인계서.

산출: `docs/COMPETITIVE_REVALIDATION_283.md`(재평가 정본) · `docs/COMPETITIVE_SCORE_HISTORY.md`(점수 이력·채점 방법론) · `docs/IMPLEMENTATION_STATUS.md §14`(구현 이력).

---

## 1. ★최대 교훈 — 다음 세션이 반드시 이어받을 것

### **"코드 존재" ≠ "구현 완료"**
283차 실결함의 **대부분이 "코드는 있는데 호출부가 0"인 미배선 클래스**였다. 과거 감사가 grep 으로 함수 존재만 확인하고 "구현됨"으로 계상해 왔기 때문에 오래 잠복했다.

**다음 감사 필수 절차**: 기능 판정 시 **호출부(배선)까지 확인**하라. `grep "function X"` 로 끝내지 말고 `grep "X("` 로 호출부를 세라. 호출부 0이면 그것은 **미구현과 같다**.

### 이 클래스로 발견된 것들 (전부 283차에 수정)
| 결함 | 실체 |
|---|---|
| 랜딩URL | `AdAdapters.php` 가 미지정 시 `https://www.genieroi.com`(자사 사이트)로 기본값 → 프론트 3경로 어디도 `landing_url` 미전송 → **고객 광고비로 산 클릭이 벤더 사이트로 유입** |
| 광고 소재 | `design_ids` 전송처가 PAUSED 경로 1곳뿐 → 라이브 경로는 미전송 → `loadDesign(0)` 기본값 **'GenieGo' 카피가 고객 광고로 게재** |
| 검색광고 | 키워드 생성 코드 **0건** → Google Search·Naver SA 영구 노출 0인데 `ok=true` 반환 → UI는 "라이브" |
| 토픽 옵트아웃 | 게이트는 있으나 발송 핸들러 5종 중 **아무도 `topic` 을 안 넘김** → 수신거부가 한 번도 강제된 적 없음(282차 자기회귀·법적 리스크) |
| 크로스디바이스 | `linkIdentity` 등의 유일 호출부가 **아무도 안 부르는 엔드포인트** → 아이덴티티 그래프 영구 0행 |
| 웹푸시 | `CURLOPT_POSTFIELDS => ''` → 제목·본문이 **한 글자도 전달 안 됨** |
| 재고 델타 | `Wms.php` 가 `Catalog::`/writeback 을 호출하는 코드 **0건** → 재고가 변해도 채널 가용재고 영구 stale |

---

## 2. 신규 트랩 (영구 기록 — 반드시 읽을 것)

| 트랩 | 내용 |
|---|---|
| **raw NUL = grep 실명(失明)** | `ReportBuilder.jsx` 에 생 NUL 바이트가 있어 **ripgrep 이 바이너리로 분류 → 모든 grep 교차감사가 이 파일을 통째로 스킵**. viz 화이트리스트 드리프트가 3회 재발한 구조적 원인. `` 이스케이프로 정정, repo 전역 NUL **0건** 확인. → **감사 루틴에 NUL 스캔을 넣을 것.** |
| **서버 php -l 전수검증 롤백** | 데모에 **기존 백업 디렉터리**(`Handlers.bak.20260416.../Alerting.php`)의 문법오류가 있어, `find` 로 전 PHP 를 린트하면 우리 코드와 무관하게 롤백된다. → **배포한 파일 목록(`tar -tzf`)만** 검증할 것. |
| **PowerShell 안전가드** | 원격 스크립트 문자열 속 `rm -rf` 를 `Remove-Item` 으로 오인해 차단. 파괴적 명령 대신 `mv` 롤백 사용. |
| **`grep \| head` 종료코드** | head 기준이라 매치 0에도 참 → 격리검증 false positive 발생. `grep -rlF ... \| wc -l` 로 판정할 것. |
| **로컬 PHP 존재** | `C:\project\GeniegoROI\_tmp_php81\php.exe` (8.1) — 종전 "php 미설치" 전제는 틀렸다. 커밋 전 `php -l` 로컬 가능. |

---

## 3. 구현 내역 (재구현/재플래그 금지 — 상세는 IMPLEMENTATION_STATUS §14)

6개 워크스트림 병렬. 파일 47개 변경/신규.

1. **마케팅 실집행(A)** — 랜딩URL fail-closed(`landing_url_required`, 테넌트 `tenant_business_profile.website` 폴백) · 라이브 경로 `design_ids`(소재 0개면 집행 차단) · `updateBudget` → `logExecution('budget_change')` · 검색광고 키워드 생성(Google `adGroupCriteria` / Naver `POST /ncc/keywords`, `deriveKeywords` 는 캠페인명·카테고리·소재에서 도출, 키워드 0개면 광고 미생성 → 기존 readiness 게이트가 활성화 자동 차단).
2. **CRM(B)** — 토픽 게이트 `CRM::sendOptions` 단일 변환점 + 5발송처 배선(큐 드레인 재검증 포함) · **웹푸시 RFC8291**(ECDH P-256+HKDF+AES-128-GCM, **공식 테스트벡터 26/26 PASS**, 실패 시 payload-less graceful fallback) · `push_subscription.customer_id` · `push_sent` 빈도캡 개통 · 개인별 STO(Email/Journey/Omni) · 옴니 워터폴 SMS·push 편입 · SMS 세그먼트 최신화 대칭 · 저니 push 노드 실발송.
3. **BI/AI(C)** — viz SSOT(무음강등 → **422 거부**) · PnL 실 XLSX + print-to-PDF · `DataExport` 예외 삼킴 제거(성공 위장 → failed) + 커서 페이징 · **코파일럿 도구 1→6종**(crm/pnl/inventory/orders/review, 취소정의는 `OrderHub::cancelExclusion()` SSOT 재사용) + 대화 메모리.
4. **커머스(D)** — 재고 델타 자동 푸시(`Wms::recordMovement` 커밋 후 훅 → 기존 `catalog_writeback_job` 재사용·신규 큐 0·디바운스·safety buffer·초과판매 `wms_oversell_alert` 승격) · 출고 → 채널 발송처리(**실구현 4채널**: shopify/woocommerce/magento/ebay, 나머지 **honest pending**) · cron 2종 신설·**crontab 등재 완료**.
5. **어트리뷰션(E)** — 크로스디바이스 픽셀 실배선 · 캠페인/소재 단위 MTA(`granularity`, 기본 channel = 무회귀·캐시키 하위호환).
6. **보안(F)** — `Dsar.php` 신설 · `tenant_security_policy`(미설정 시 전역 폴백) · `security-scan.yml` + `dependabot.yml`(**deploy.yml 무변경**) · 판매문구 6건 정정.

**+ 사용자 보고 버그 2건**: 대량등록 판매가(평균원가 기반 채널당 단일가 → 상품×채널 `priceMap` + 상품별 편집표) · 11번가 카테고리 오류("자격증명 확인" **오안내** → 미지원/무자격/실패 3분기 + **카테고리 코드 직접입력** 경로 신설).

---

## 4. 배포 상태 (완료)

- **백엔드** 26파일 tar → 운영+데모. **서버 `php -l` 게이트 통과 후에만 반영**(실패 시 자동 롤백 스크립트) → `chown www:www` → `php8.1-fpm reload`.
- **프론트** 운영 `npm run build` / 데모 `--mode demo` → 각 docroot **`rsync -a --delete`** 클린 스왑(고아 청크 0) → `nginx -s reload`.
- **격리 검증**: 운영 `MODE:"production"`·데모플래그 **0건** / 데모 `MODE:"demo"`.
- **스모크**: 운영·데모 홈 200 · `/api/health` 200 · 신규 EP(DSAR·attribution·코파일럿) **401**(=살아있음) · **500 = 0건** · php-fpm fatal 0.
- **cron 등재**: `stock_sync_cron`(운영 10분 간격/데모 20분) · `shipment_confirm_cron`(운영 */10 / 데모 */14) — 총 61줄.
- **검증**: PHP 27건 `php -l` PASS · vite build EXIT 0 · pre-commit 게이트 전부 통과(라우트 `$custom↔$register` 정합·cron SSOT·no-undef·sacred SHA).

---

## 5. 잔여 백로그 (우선순위)

| # | 항목 | 사유·계획 |
|---|---|---|
| 1 | **CRM PII 필드암호화** | **정직한 보류.** `phone` 이 SQL 술어(`REPLACE(phone,'-','')=?` — `SmsMarketing.php:51`·`JourneyBuilder.php:972`)이자 발송 경로(`SmsMarketing.php:241`·`KakaoChannel.php:294`)에 쓰여, 그대로 암호화하면 **암호문으로 문자가 발송**된다. **5단계 이행계획**: ①`email_hash`(결정적 sha256) 추가·조인 전환 → ②`phone_e164_hash` 추가·`customerIdByPhone`/Journey 해시조회 전환(SQL REPLACE 제거) → ③발송경로 decrypt-on-read → ④`phone`/`kakao_id` 암호문 전환 → ⑤`email`(LIKE 검색은 별도 인덱스 필요). 각 단계 독립 배포 가능·무회귀. |
| 2 | **SMS/Kakao 단독 캠페인 STO** | 큐/워커(cron 드레인) 부재 → defer 하면 **무음 유실**. 큐 테이블 + cron 워커 신설이 선행돼야 함. |
| 3 | **발송처리 honest pending 채널** | coupang/naver/cafe24 등 — API 스펙 확신 부족으로 **추측 구현하지 않음**(가짜 성공 금지). 송장은 큐에 보존되고 pending 은 매 틱 재평가되므로 **어댑터 추가 즉시 자동 전송**. |
| 4 | 쇼핑/카탈로그 광고(Meta DPA·Advantage+ / Google PMax) | 매체 API + Merchant Center 크리덴셜 필요 |
| 5 | 드래그드롭 피벗 · LookML급 시맨틱(조인/관계) · 임베디드 애널리틱스(서명 JWT iframe) | BI 탐색 UX·확장성 |
| 6 | MLOps 드리프트 파이프라인 | `ModelMonitor` 는 **운영 no-op + 프론트 소비 0 + `ml_models` writer 0** = 고아. "드리프트 모니터링 보유"로 계상 **금지**. |
| 7 | 11번가 카테고리 **자동조회** | 현재는 코드 직접입력으로 우회. 공개 문서에서 엔드포인트 스펙 확정 실패 → **자격증명이 등록됐으므로 서버에서 실호출로 검증하며 구현** 권장(추측 구현 금지). |
| 8 | ad-level MTA 성능 | `granularity=creative` 는 markov 상태공간을 80키로 상한. 키 수백 개 테넌트에서 응답 지연 가능 → 필요 시 상한 조정. |

---

## 6. 경쟁 위치 (요약 — 정본은 `COMPETITIVE_SCORE_HISTORY.md`)

- **채점 방법론이 283차에 바뀌었다.** 282차(89점)와 283차(76→86점)를 **직접 비교하면 오판**이다. 신기준 = 경쟁사 최고 100 · **배선까지 확인** · 자격증명 미등록 무감점 · 가짜 성공/판매문구 불일치 감점.
- **경쟁사 사실(35벤더 웹조사)**: 글로벌 27곳 중 **카카오·쿠팡 광고 커넥터 0곳**, 네이버는 Funnel.io 1곳. 국내 8곳 중 "채널통합+어트리뷰션+CRM"을 하나로 주는 곳 **0곳**(국내 최고 52점). **"이익 기준 최적화"를 내세운 벤더 0곳**. **Marin Software 2025-07 파산**(사인: Google·Meta 무료 자동화 툴에 잠식) → **자동화 자체는 더 이상 차별점이 아니다.**
- **차별점**: 이익 프론티어(T\*) · 한국 5채널 실집행 · 광고+주문+**정산 순이익** 통합 쿼리 · 부가세 엔진 · 정산 이중축 대사. 이 조합을 가진 벤더는 국내외 통틀어 없다.

---

## 7. 다음 세션 시작 시 필수 절차

1. `docs/IMPLEMENTATION_STATUS.md`(§14 포함) + 자동메모리 FP 레지스트리를 **감사 에이전트 프롬프트에 주입**.
2. `docs/COMPETITIVE_REVALIDATION_283.md` **§4 과거 오판 16건** 주입 — 재플래그 금지.
3. 갭 주장 전 **grep/read 부재증명**, P0/P1 은 **PM 직접 재증명**.
4. **호출부(배선)까지 확인** — "코드 존재 ≠ 구현 완료".
5. 자격증명 미등록은 **감점하지 않는다**.
6. **★자기 산출물을 적대적으로 재검증하라**(§8 — R1 자평이 과대했던 이유).

---

# 8. ★R2 — 적대적 재평가와 자기 결함 8건 수정 (커밋 `8c65d4926ec`)

R1 초고도화 직후, 재평가 에이전트에 **"반증을 시도하라"**(정말 배선됐나·회귀는 없나)를 전제로 주고 5개 도메인을 재감사했다. 결과: **283차가 스스로 경계한 결함 클래스를 자신이 재생산**했다.

## 8-1. 검출·수정된 자기 결함 8건 (전부 배포 완료)

| # | R1이 주장한 것 | 실제 (적대적 검증 결과) | R2 수정 |
|---|---|---|---|
| 1 | "소재 0개면 집행 차단" | **UI 3경로만** 차단. `buildDelivery` 서버 계약엔 게이트 없음 → API 직접호출·에이전트 auto 는 `design_ids=[]` 통과 → `loadDesign(0)` 기본값 **`'GenieGo'` 카피가 고객 예산으로 라이브** | `buildDelivery` 진입부 `creative_required` fail-closed(랜딩과 대칭) |
| 2 | (미인지) | **Google RSA 가 벤더 문구를 강제 주입** — 헤드라인 3번 `'GenieGo ROI'`, 설명 `'데이터 기반 마케팅 자동화'`, 패딩 `'GenieGo N'`. 소재를 넣어도 **고객 검색광고에 우리 브랜드가 게재** | 고객 자산(소재·캠페인명·카테고리)에서만 생성. RSA 최소요건 미달 시 **honest partial**(임의 문구로 메우지 않음). 네이버 설명·이미지 alt 폴백도 제거 |
| 3 | "재고 델타 자동푸시로 outbound 루프 폐쇄" | **가짜 성공.** `stock_sync` 전용 어댑터 **0건** → 재고 델타가 **상품 전체 upsert** 로 나감. Shopify `inventory_quantity` 는 **read-only**(재고는 `inventory_levels/set`), Cafe24 payload 엔 **재고 필드 자체가 없음** → HTTP 200 → `done` 기록인데 **채널 재고 불변** | 재고 전용 경로 신설. **실구현 3채널**(Shopify `inventory_levels/set`·WooCommerce·Walmart), 나머지 **`no-live-stock-adapter` honest pending**(큐 보존·어댑터 추가 시 자동 전송) |
| 4 | (미인지) | **Shopify variant 파괴 위험** — 상품 PUT 이 **variant id 없이** `variants` 전송 → 옵션상품 variant 대체. R1 이 이를 **"수동 1회" → "재고이동마다 자동"으로 승격**시킴 | PUT 에서 `variants` **완전 제거** + 가격/재고 전용 엔드포인트(variant id 포함) |
| 5 | (미인지) | **0원 가격 가드 전무** — `mergeWithExisting` 이 body 의 0 으로 **기존 정상가를 덮어씀**. 11번가/쿠팡/ESM 에 0원 도달 | `ChannelContract`·`mergeWithExisting`·`bulkPrice`·어댑터 **4중 가드** |
| 6 | "테넌트 보안정책(무회귀)" | **권한 상승 유입.** 정책 쓰기가 **plan 만 검사** → 엔터프라이즈 **팀 말단 멤버가 조직 MFA 를 끄고 SIEM 을 공격자 엔드포인트로** 돌리고 감사로그를 내보낼 수 있었음(R1 이전엔 플랫폼 admin 전용) + 테넌트 `off` 가 **전역 `all` 무력화** | `TEAM_OWNER_ONLY` 게이트(기존 체계 재사용) + `mfaPolicy` = **max(global, tenant)**(테넌트는 강화만 가능) |
| 7 | "웹푸시 RFC8291 + 개인 타겟팅" | 암호화는 정확(26/26 PASS)하나 **`customer_id` 결속이 실제로 안 일어남** — 유일 구독 호출부가 `customer_id` 미전송 + `subscribe` 가 `requirePro`(구독자=대시보드 사용자≠고객) → 행별 동의게이트·`push_sent` 빈도캡·저니 push·옴니 push **전부 도달 불가** | **스토어프론트 공개 구독 경로 신설**(`/api/pixel/push/{config,subscribe}` — `pixel_id` HMAC 로 테넌트 도출·요청 tenant_id 미신뢰·**푸시서비스 호스트 화이트리스트=저장형 SSRF 방어**·레이트리밋). Kakao/SMS 캠페인 **토픽 셀렉트 UI** 추가(백엔드는 이미 수용 중이었음) |
| 8 | "판매문구 6건 정정" | **양방향 오판.** ①`Landing.jsx`·`PlanPricing.jsx` 하드코딩만 고쳤고 **실제 렌더되는 `PricingPublic.jsx`·`AuthPage.jsx`·i18n 15개국 로케일에 허위문구 잔존**(SLA 99.9%=**측정 부재**+약관 99.5% 모순·On-premise·Custom AI model training·ERP·세금계산서) ②반대로 **참인 기능을 허위로 오판해 삭제** | 잔존 허위문구 15개국 정정(**로케일은 인덱스 고정 in-place 교체** — 항목 삭제 시 번역이 밀림) + **상업송장 복구** |

### ★8-2. 라이브 P0 2건 (R1 이전부터 존재 — R2 에서 검출·수정)
- **픽셀 스니펫 `identify` 부재**: 스니펫 stub 이 `track` 만 정의하는데 안내 코드가 `GeniePixel.identify()` 를 **먼저** 호출 → `pixel.js` 는 `async` 로드라 **콜드캐시(=첫 구매자)에서 TypeError** → **purchase 비콘 통째 유실**(아이덴티티·CAPI purchase·`syncToCRM` 동반 사망). → stub + `dispatch` 배선.
- **DataExport 무음 데이터 오염**: R1 이 `MAX_ROWS` 절삭을 OFFSET 페이징으로 바꿨으나 **정렬키가 비유일**(`ordered_at`/`date`/`period`) → 페이지 간 **행 중복·누락**(종전 "절삭"보다 나쁜 "오염"). → `id` tiebreaker 로 전순서화.

## 8-3. ★영구 교훈 (다음 세션이 반드시 이어받을 것)

1. **자평은 신뢰하지 마라.** 초고도화 직후 **반증 전제**의 적대적 재검증을 반드시 거쳐라. R1 자평 ≈86 → 실제 ≈79.
2. **양방향 오판을 경계하라.** 허위를 못 잡는 것만 오판이 아니다 — **참인 기능을 허위로 오판해 삭제**하는 것도 오판이다. **클라이언트 사이드 기능은 backend grep 으로 부재증명이 불가능하다**(상업송장 = `WmsManager.jsx:1289` InvoiceTab·INCOTERMS 10종·HS코드·인쇄 출력. 실재).
3. **"가짜 성공"은 코드 리뷰로 안 잡힌다** — 채널 API 가 200 을 주는데 실제 반영이 안 되는 경우(read-only 필드·payload 누락). **외부 API 의 필드 시맨틱**까지 확인해야 한다.
4. **i18n 로케일은 별도 렌더 경로다.** 하드코딩 JSX 만 고치면 **비-ko/en 언어에 문구가 살아남는다**(grep 이 번역된 형태를 못 잡음).

## 8-4. R2 검증
PHP 19건 `php -l` PASS · vite build EXIT 0 · 운영/데모 **재배포** · 격리 정상(운영 `MODE:"production"`·데모플래그 0 / 데모 `MODE:"demo"`) · 스모크 **500=0** · 신규 공개 EP **실 JSON 반환**(SPA 폴백 아님) · pre-commit 게이트 전건 통과(sacred SHA baseline 갱신=허위문구 15개국 제거는 의도적 변경 · `check_static_refs` 가드 정밀화로 외부 API 경로 오탐 제거하되 **280차 팬텀 픽셀 탐지력 유지**).

## 8-5. R2 이후 잔여
§5 백로그 + **재고/발송처리 국내 3사 어댑터**(쿠팡·네이버·카페24 — 스펙 확신 부족으로 honest pending 유지, 추측 구현 금지) · ad-level 증분성(현재 granularity 는 결정론 6모델만 분해) · 코파일럿에 attribution/mmm/anomaly 도구 미배선(보유 알고리즘 대비 최대 ROI).
