# 283차 경쟁 재검증 — 기능별 경쟁사 vs GeniegoROI 점수 · 갭 · 과거 오판 정정

> 작성 2026-07-14 · 방법: 7도메인 병렬 코드감사(FP레지스트리 + IMPLEMENTATION_STATUS + 282차 인계서 주입) + 경쟁사 35벤더 웹조사(120+ 출처) + **PM 직접 코드 재증명**(모든 P0/P1)
>
> **평가 전제(사용자 지정)**: 어떤 채널에도 실 API 키가 등록돼 있지 않다. 따라서 **"자격증명 미등록"은 감점하지 않는다.** "키만 넣으면 실행되는 코드"가 있으면 구현됨(✅)으로 계상하고, **코드 자체의 부재만 갭**으로 본다.

---

## 0. 결론 요약

이번 재검증의 최대 발견은 기능의 유무가 아니다. **"자격증명만 넣으면 바로 실행된다"는 전제 자체를 코드로 검증했더니, 실행 준비는 되어 있으나 실행되는 순간 틀리는 지점이 마케팅 실집행 경로에 3곳 있었다.** 셋 다 `ok=true`/200으로 성공 보고되어 UI·감사로그·최적화 루프까지 정상으로 보이는 사일런트 실패다.

동시에, 과거 감사가 "미구현"으로 잘못 판정했던 사례들도 이번에 재확인했다. 특히 **뷰스루 어트리뷰션·에이전틱 코파일럿·DW 익스포트·리버스ETL·정산 대사·부가세 엔진·writeback 21채널**은 전부 실재하며, 이를 갭으로 재플래그하는 것은 중복 구현·자원 낭비를 부른다(§4).

| 도메인 | 경쟁사 최고 | GeniegoROI | 갭 해소 시 |
|---|:-:|:-:|:-:|
| 어트리뷰션·측정 | 100 (TW 92·Northbeam) | **84** | 95 |
| **마케팅 자동화·실집행** | 100 (Smartly 100) | **71** | 88 |
| CRM·CDP·옴니채널 | 100 (Braze 100) | **79** | 86 |
| 채널·커머스·WMS·정산 | 100 (Rithum·Linnworks) | **59** | 70 |
| 분석·BI·데이터플랫폼 | 100 (Looker+Funnel.io) | **84** | 90 |
| AI·최적화 | 100 (BrazeAI·Einstein) | **76** | 84 |
| 보안·엔터프라이즈(코드) | 100 (Salesforce Shield) | **80** | 88 |
| **가중 종합** | **100** | **약 76** | **약 87** |

**국내 경쟁사 최고는 52점(데이터라이즈)** — 국내 8개 벤더 중 "채널통합 + 광고 어트리뷰션 + CRM 자동화"를 하나로 제공하는 곳은 **0곳**이다. GeniegoROI의 76점은 국내 시장 기준으로는 압도적이고, 글로벌 단일 도메인 리더 대비로는 열세다. 이 구조가 제품의 실제 위치다.

---

## 1. 도메인별 기능 점수

### 1-1. 마케팅 자동화·실집행 — 경쟁 100 / **GeniegoROI 71** (사용자 최우선 도메인)

**구조(설계)만 보면 90점대다.** 아래는 전부 실코드로 확인됐고, 자격증명만 등록하면 동작한다 — 감점 대상 아님:

| 기능 | 근거 |
|---|---|
| 6채널 실집행(create/deliver/activate/pause) | `AdAdapters.php:191-236` (meta·google·tiktok·naver_sa·kakao_moment·line_ads) |
| tCPA/tROAS 스마트입찰 | `:552-562`(Google) `:1304-1311`(Meta) `:1399-1402`(TikTok) |
| 소재 실업로드 | Meta `/adimages`:1348 · TikTok `:1362` · Kakao 멀티파트 `:1494` · LINE `:1508` |
| 서버측 전환API 8종 | `:693,719,748` + 280차 GA4/Pinterest/Snap/Reddit/LinkedIn |
| 빈도캡·데이파팅 | `:573,1314,1404,1456` · `withinAdSchedule:878` |
| 포트폴리오 최적화(밴딧·포화곡선·water-filling) | `AutoRecommend.php:501-774` |
| **이익 프론티어 T\*** | `Mmm::frontier` — **경쟁사 7사 전원 미보유**(전부 ROAS/CPA 기준) |
| 킬스위치·결제게이트·DLQ | `AutoCampaign.php:497-528` · `bin/ad_dlq_cron.php` |
| 한국 5채널(Naver·Kakao·LINE·Coupang) | 글로벌 벤더 27곳 중 **네이버는 Funnel.io 1곳만**, 카카오·쿠팡은 **0곳** |

**그런데 실집행 종단이 3곳에서 끊겨 있다(전부 PM 직접 재증명 완료):**

- **P0-1. 모든 라이브 광고가 자사(GeniegoROI) 홈페이지로 랜딩한다.**
  `AdAdapters.php:1033` — `if ($landing === '') $landing = 'https://www.genieroi.com';`
  백엔드는 `AutoCampaign.php:190`에서 `$d['landing_url']`을 읽지만, **프론트 전역에 `landing_url`을 보내는 코드가 0건**(3개 런치 경로 `AutoCampaignLaunch.jsx:103`·`AutoMarketing.jsx:652`·`AIRecommendTab.jsx:451` 모두 미전송). 그 기본값이 6개 매체 페이로드(`finalUrls`/`link`/`landing_page_url`/`landingUrl`)에 그대로 실린다.
  → **고객이 실 광고비로 산 클릭이 고객 쇼핑몰이 아니라 SaaS 벤더 사이트로 유입된다.** `AutoMarketing.jsx:659`는 `activate:true`(승인 즉시 라이브)라 유예도 없다.

- **P0-2. 라이브 경로에 소재가 전달되지 않아 광고 카피가 "GenieGo"로 나간다.**
  `design_ids` 전송처는 `AutoCampaignLaunch.jsx:105` **단 1곳**인데 이 경로는 `activate` 미전송(PAUSED 생성에서 정지). 실제 라이브 경로 `AutoMarketing.jsx`는 `design_ids`를 **안 보낸다** → `loadDesign(pdo, tenant, 0)` → `AdAdapters.php:984` 기본값 `headline: 'GenieGo'`.
  → 부수효과로 채널별 소재매칭·A/B 분기·이미지 업로드가 라이브 경로에서 **전부 dead**.

- **P0-3. 검색광고(Google Search·Naver SA)는 키워드가 없어 영구 노출 0인데 UI는 "라이브"다.**
  부재증명: `adGroupCriteria|keywordInfo|negativeKeyword|searchTermView` → 백엔드 **0건**. 네이버 `/ncc/keywords`는 `Connectors.php:3274` **GET(리포팅)만** 존재, POST 생성 0건.
  `googleCreate` 기본 캠페인 유형은 `SEARCH`(`:543`), `googleDeliver`는 adGroup+RSA만 생성 → **키워드 없는 검색 광고그룹은 매칭 대상이 없다.** 그런데 `ok=true`+ad_id를 반환해 readiness 게이트를 통과하고 `activateDelivery`가 ENABLED로 만든다.

**진짜 코드 갭(부재증명 완료)**: ①랜딩URL 입력 UI(난이도 하) ②라이브 경로 design_ids 전송(하) ③검색 키워드 생성(중·매체API) ④네거티브 키워드·검색어 리포트(중) ⑤쇼핑/카탈로그 광고 DPA·PMax·Advantage+(상) ⑥입찰 조정계수(중).

> 참고: **Marin Software는 2025-07 Chapter 11 → 상장폐지**했고 공식 사인은 "Google·Meta 무료 자동화 툴에 의한 잠식"이다. **자동화 자체는 더 이상 차별점이 아니다** — 차별점은 이익 기준 최적화와 한국 채널이다.

---

### 1-2. 어트리뷰션·측정 — 경쟁 100 / **GeniegoROI 84**

**보유(실코드)**: 6모델 MTA + **Markov removal-effect**(`AttributionEngine.php:1314`) · **Shapley exact**(`:951`) · **MMM MCMC**(2체인·adstock+Hill·R-hat·ESS/MCSE·DECOMP.RSSD·OOS 백테스트·282차 계절성 통제) · geo-holdout 자동설계/자동종결 · lift test(z·CI·p) · 블렌디드 증분성 · **결정론적 뷰스루**(263차 오판 사례 — 재확인 완료) · CAPI 7종 + 매칭신호 · DW 익스포트.

**진짜 갭**:
- **P1. 크로스디바이스 아이덴티티 그래프가 픽셀과 미배선**(부재 아님 — **미배선**). `Attribution::linkIdentity`/`recordDeviceSigAndStitch`의 유일 호출부는 `Attribution::recordTouch`(POST `/v419/attribution/touch`)인데 **픽셀도 프론트도 이 엔드포인트를 호출하지 않는다**(PM 재증명 완료). → `identityCoverage` 영구 0, 모바일 클릭→데스크톱 구매 여정의 상단 터치 소실.
- P2. ad/creative-level MTA 부재(채널 단위 크레딧만). `attribution_touch`에 utm_campaign/content가 **이미 적재**돼 있어 엔진 group-by 확장만으로 가능.
- P3. Consent Mode v2·sGTM·데이터 클린룸·모바일 MMP(전부 grep 0건).

> **인크리멘탈리티는 리더조차 초기 단계다** — Northbeam(2026-04 출시)은 US Meta 단일, Triple Whale도 Meta만. 통념보다 격차가 작다.

---

### 1-3. CRM·CDP·옴니채널 — 경쟁 100(Braze) / **GeniegoROI 79**

**보유**: 저니빌더 14노드(NBA Thompson 밴딧·exit·attr 포함)·발송 멱등 선점·이메일 딜리버러빌리티 풀스택(suppression/bounce/워밍업/라이브 SPF·DMARC/베이지안 A/B)·예측 CDP(BG/NBD·churn·CLV)·확률적 아이덴티티(승인·unmerge)·**리버스ETL 보유**(DW 5종 + Meta/Google/TikTok Customer Match).

**진짜 갭**:
- **P0. 토픽 옵트아웃 게이트가 한 번도 호출되지 않는다(282차 자기회귀).** `CRM.php:1096-1100`은 `$contact['topic']`이 있을 때만 평가하는데, **발송 핸들러 5종(Email/Kakao/SMS/Omni/Journey) 어디도 `topic`을 넘기지 않는다**(grep 0건 — PM 재증명 완료). 수집(공개 선호센터)은 라이브다. → **고객이 "프로모션 수신거부"를 눌러도 프로모션이 발송된다.** 정보통신망법·GDPR 리스크.
- **P1. 웹푸시가 캠페인 내용을 한 글자도 싣지 못한다.** `WebPush.php:164` `CURLOPT_POSTFIELDS => ''`, `Content-Length: 0`(RFC8291 미구현) → `push-sw.js:11-17`이 항상 "GeniegoROI / 새 알림이 도착했습니다"로 폴백.
- P1. 개인별 STO(`bestSendHour`) 산출만 되고 발송 적용 0. P2. 옴니 워터폴 SMS 분기 도달 불가·SMS 캠페인만 세그먼트 미최신화·저니 팔레트의 push/line 노드가 조용히 폐기.
- P2. 이벤트/불리언 세그먼트 빌더 부재(현재 **AND-only 7필드**)·필드별 survivorship 골든레코드 부재·DSAR 부재.

> **Braze는 2026-04 카카오 친구톡 네이티브 GA + 한국 데이터센터**를 확보했다(글로벌 유일). 반면 **Klaviyo는 한국 SMS·카카오 모두 미지원**이라 한국에선 사실상 이메일 전용이다.

---

### 1-4. 채널연동·커머스·WMS·정산 — 경쟁 100 / **GeniegoROI 59** (최저점)

**보유(깊이는 경쟁 우위)**: 커머스 21채널 실 fetch + **writeback 21채널 100%** · PG 15 정산 어댑터 · fxToKrw 단일 정규화 · 정산 서버집계 SSOT · **부가세 엔진**(`Pnl::vat:435`) · **이중축 정산 대사** · LOT-FEFO 실원가 · WMS 43라우트 · 리프라이서/Buybox/경쟁가 자동수집 · 282차 피드 변환엔진(24 op).

**그런데 outbound 루프가 닫혀 있지 않다:**
- **P0. 재고 델타 자동 푸시 부재.** `Wms.php`가 `Catalog::`/writeback을 호출하는 코드 **0건**(PM 재증명). 현재는 pull-at-push — writeback을 호출할 때만 `wms_stock`을 읽어간다. 입고·조정·오프라인 판매로 재고가 바뀌어도 **채널 가용재고는 그대로**. 초과판매 방어도 `error_log` 로깅뿐(`Wms.php:661`).
- **P0. 채널 발송처리(송장 전송) 부재.** `waybill|shipping_label|발송처리` → 백엔드 **0건**. WMS 피킹으로 출고가 끝나도 채널로 돌아가지 않아 **채널은 영원히 "배송준비중"**.
- P1. 합포장/분할배송·주문 라우팅 0 · 회계/ERP·전자세금계산서 0 · 3PL 연동 0 · EDI 0.

**핵심 판정: "폭"이 아니라 "루프"가 문제다.** 채널 650개(사방넷)보다 **채널 21개라도 재고·출고가 닫히는 것**이 실사용 제품의 조건이다. GAP-1·2만 해소하면 59 → 약 70.

---

### 1-5. 분석·BI — 경쟁 100 / **GeniegoROI 84**

**보유**: 셀프서비스 지표×차원 쿼리·계산필드·피벗·드릴다운·viz 10종·예약 이메일 리포트·**DW 익스포트(BigQuery/Snowflake/S3/Sheets)**·이상탐지·알림·데이터 카탈로그/리니지.
**차별점**: 광고+주문+**정산 순이익**을 한 쿼리로 묶는 벤더는 사실상 없다.

**진짜 갭 / 자기회귀**:
- **P1(282차 자기회귀). 산점도·트리맵이 저장 시 조용히 `table`로 강등된다.** `Reports.php:576` 백엔드 화이트리스트가 8종뿐인데 R3에서 프론트에 scatter/treemap을 추가했다. **바로 위 주석(`:574-575`)이 R2에서 같은 버그를 고쳤다고 적어둔 자리에서 재발**했다(PM 재증명).
- **P1. PnL PDF/Excel 내보내기가 가짜다.** `PnLDashboard.jsx:1071` — P&L 행이 아니라 `{format,date,dateRange,live}` 스냅샷 JSON을 `.pdf` 확장자로 저장(열리지 않는 파일).
- P1. `DataExport` SQL 실패가 "성공(0행)"으로 보고됨 · 5,000행 무경고 절삭.
- P2. 드래그드롭 피벗·LookML급 시맨틱(조인/관계)·임베디드 애널리틱스 부재.

---

### 1-6. AI·최적화 — 경쟁 100 / **GeniegoROI 76**

**보유**: 에이전틱 코파일럿(실 tool-use → propose → 승인 → **실 매체 집행**) — Triple Whale Willy(읽기전용)를 앞선다. 생성형 이미지 + **영상 DCO 실배선**(`ClaudeAI.php:2801` Replicate).
**진짜 갭**:
- **P1. AI 승인 예산변경이 감사로그에 안 남는다.** `AdAdapters::updateBudget`이 `logExecution` 미호출(create/pause/activate는 전부 기록) — PM 재증명. 1줄 수정.
- **P1(최대 갭). 코파일럿이 볼 수 있는 데이터가 `performance_metrics` 1테이블·3차원뿐**(`ClaudeAI.php:664-670`). CRM·P&L·재고·리뷰를 **조회할 수 없다** → "VIP 재구매율은?" 류 질의 불가.
- P2. RAG/벡터 0 · MLOps(드리프트 파이프라인·ModelMonitor 고아·피처스토어) · 코파일럿 단일턴(대화 메모리 0).

---

### 1-7. 보안·엔터프라이즈 — 경쟁 100 / **GeniegoROI 80(코드) · 35(인증서 성숙도)**

**보유**: SSO(OIDC/SAML)·**SCIM 2.0**(Looker 우위)·MFA·9차원 ABAC·테넌트 격리 airtight·**불변 감사 해시체인**·SIEM(CEF/LEEF/Syslog)·AES-256-GCM+KEK 회전·레이트리밋·SOC2/ISO posture 15통제.

**진짜 갭**: 테넌트별 보안정책 평면 부재(MFA/SIEM/감사내보내기가 **플랫폼 전역 단일설정**) · **DSAR/삭제권 부재** · **CRM PII 평문 저장**(`CRM.php:51` email/name/phone/kakao_id — `Crypto::encrypt`는 자격증명 계열만) · BYOK/CMK · IP 허용목록 · **의존성 취약점 스캔 CI 0**(`.github/workflows/`에 `deploy.yml` 하나뿐).

---

## 2. 판매 문구 vs 코드 불일치 (정직성 — 즉시 조치 필요)

| 위치 | 판매 문구 | 코드 |
|---|---|---|
| `Landing.jsx:758` (공개 랜딩) | "세금계산서·전자 정산·**ERP 연동**" | VAT **산출**은 있음. 세금계산서 발행·ERP 전기(轉記) grep **0건** |
| `PlanPricing.jsx:131` (요금제) | "**합배송 관리**, 국제 특송 **상업 송장 자동 생성**" | 합포장·상업송장 grep **0건** |

문구 수정 또는 구현 중 택일이 필요하다(현 상태는 사실과 다른 판매 주장).

---

## 3. 정본 문서 정정 (향후 감사 오도 방지)

`docs/IMPLEMENTATION_STATUS.md:93`의 **"No-PII"** 표기는 **v418.1 decisioning 집계 엔드포인트 한정** 설계인데 플랫폼 전체 주장으로 읽힌다. 이 문구가 DSAR·필드암호화 갭을 "해당없음"으로 오분류시키는 원인이므로 다음으로 정정 필요:
> `No-PII (v418.1 decisioning 집계 한정 — CRM은 PII 보유, 필드암호화 미적용)`

---

## 4. ★ 과거 오판 사례 — "구현됐는데 미구현으로 판정했던 것" (사용자 특별 지시)

오판의 폐해는 점수 왜곡이 아니라 **중복 초고도화 → 빌드/배포/토큰 낭비**다. 아래는 이번 재검증에서 **실코드로 재확인**한 것들이며, **갭으로 재플래그 금지**다.

| # | 과거 오판 | 실제 (재확인 file:line) |
|---|---|---|
| 1 | **결정론적 뷰스루 어트리뷰션 "부재"** (263차 대표 오판) | 완전 구현. `PixelTracking.php:396` → `AttributionEngine.php:1083 isViewThrough` → `:1134-1149` vtWeight/vtHalflife → 엔드포인트 `:70-71` |
| 2 | **에이전틱 코파일럿 "미구현"** | 백엔드 엔진은 255차부터 존재(`ClaudeAI.php:684` `agenticAsk` 실 tool-use). **UI만 부재**였고 282차에 배선 완료 |
| 3 | **writeback "pending 5종"**(FP-3 표기) | **stale — 21채널 100% 구현.** walmart `:3075` · qoo10 · yahoo_jp `:3181` · godomall `:3218` · etsy `:2505`. pending은 default arm뿐 |
| 4 | **DW 익스포트 "Funnel.io/Supermetrics 갭"** | 완전 구현. BigQuery insertAll `DataExport.php:432` · Snowflake 키페어JWT `:457` · S3 SigV4 `:363` |
| 5 | **리버스ETL "없음"** | 보유. `AdAdapters.php:1602` Customer Match(Meta/Google/TikTok) + DW 5종 |
| 6 | **정산 대사 "미구현"** | `PgSettlement::reconcile:215`(order_ref+금액±1·7일 퍼지) · `KrChannel::runRecon:421` + 티켓 워크플로 |
| 7 | **부가세 "미구현"** | `Pnl::vat:435`(매출/매입세액·납부세액·한국 분기·Paddle MoR·`pnl_vat_summary` 영속). **신고 전송만** 부재 |
| 8 | **FIFO 원가 "미구현"** | FIFO 문자열은 0건이나 **FEFO lot-layer 실원가**가 SSOT(`OrderHub::aggregateCogs:144-186`) + WAC 폴백 |
| 9 | **예약 리포트 배포 "부재"** | `Reports.php:485-530` + `reports_cron.php` + crontab 정본 등록 + UI 탭 |
| 10 | **BI 지오맵 "부재"** (282차 감사 오탐) | 기존재 |
| 11 | **amazon_ads/microsoft_ads/x_ads "스텁"** | 240차에 실 fetch 완성(LWA OAuth2·MS-Identity·OAuth1.0a) |
| 12 | **PG정산 netProfit 미합산 "결함"** (FP-1) | **의도적 설계** — 이중계산 방지, 별도 수령액 KPI로 de-silo |
| 13 | **channel_orders currency 컬럼 부재 "결함"** (FP-2) | `saveOrders`가 fxToKrw로 KRW 정규화 후 적재(원통화는 raw_json 보존) |
| 14 | **Paddle 스키마 드리프트** (265차) | 라이브 SHOW COLUMNS로 오탐 회피 — 덤프 맹신 금지 |
| 15 | **Kakao/LINE `partial` 반환 "미구현"** | 실 스키마 확정 대기용 graceful degrade. 코드는 완비 |
| 16 | **`AdAdapters`가 routes.php에 0건 → "미배선"** | 서비스 계층이 정상. cron·Connectors·AutoCampaign 경유 도달 |

**새로 추가되는 오판 방지 항목**:
- **크로스디바이스 아이덴티티** — "부재"가 아니라 **미배선**이다(코드 존재). 정확히 구분할 것.
- **ModelMonitor** — 이전엔 "스캐폴드 보유"로 계상했으나 **운영 no-op + 프론트 소비 0 + `ml_models` writer 0** → "드리프트 모니터링 보유"로 계상 금지(하향 정정).
- **`Omnichannel`** — 이름 때문에 "재고 동기화"로 오인되지만 **메시징 워터폴**이다. 재고 fan-out은 실제로 부재(§1-4 P0).

---

## 5. 보강 우선순위 (권장)

### 즉시 (P0 — 실 광고비·법적 리스크·자기회귀)
1. **랜딩 URL 입력 UI + payload 배선** — 프론트 필드 1개. **실 광고비가 벤더 사이트로 흐르는 것을 막는다.**
2. **라이브 경로 `design_ids` 전송** — 페이로드 1줄. "GenieGo" 카피 게재 차단.
3. **토픽 옵트아웃 게이트 배선** — 발송처가 `$contact['topic']`만 넘기면 됨. 수신거부 무시 = 법적 리스크.
4. **BI viz 화이트리스트에 `scatter`,`treemap` 추가** — `Reports.php:576`, 2단어.
5. **`updateBudget`에 `logExecution` 추가** — 1줄, 감사 무결성.

### 단기 (P1)
6. **검색광고 키워드 생성**(Google `adGroupCriteria` + Naver `POST /ncc/keywords`) — 이게 없으면 검색 2채널은 영구 노출 0.
7. **재고 델타 → 채널 자동 푸시 루프** — 커머스 도메인 최대 갭(초과판매 방지).
8. **채널 발송처리(송장 전송)** — 출고 루프 폐쇄.
9. **크로스디바이스 픽셀 배선** — `collect` 부수효과에 `linkIdentity`/`recordDeviceSigAndStitch` 호출 추가(수 줄).
10. **코파일럿 `bi_query` 도구 확장**(CRM·P&L·재고 읽기전용) — 신규 엔드포인트 0, AI 도메인 점수 기여 최대.
11. **웹푸시 RFC8291 payload 암호화** · **PnL 내보내기 실 XLSX/PDF** · **DataExport 무음실패 제거**.

### 중기 (P2)
12. DSAR/삭제권 · CRM PII 필드암호화 · 테넌트별 보안정책 평면 · 의존성 스캔 CI(반나절·SOC2 CC7.1 증적).
13. 이벤트/불리언 세그먼트 빌더 · ad-level MTA(데이터는 이미 적재) · 쇼핑/카탈로그 광고(DPA·PMax).

---

## 6. 전략적 판단

- **강점(경쟁사 미보유)**: 이익 기준 최적화(T\*) · 한국 5채널 실집행 · 광고+주문+**정산 순이익** 통합 쿼리 · 부가세 엔진 · 관리형 지출 월렛 · 정산 이중축 대사. 이 조합을 가진 벤더는 **국내외 통틀어 없다**.
- **약점의 성격**: 대부분 "기능이 없다"가 아니라 **"만든 기능이 마지막 1cm에서 안 불린다"**(랜딩URL·소재·토픽게이트·STO·크로스디바이스·viz 화이트리스트). 즉 **신규 구현이 아니라 배선 수정**으로 회복 가능하며, 그래서 76 → 87이 현실적이다.
- **채널 수(21 vs 650)는 최우선이 아니다.** 재고·출고 루프가 닫히지 않은 채널 650개는 초과판매 사고 기계일 뿐이다.
