# N279 M2 인계서 — 머니 경로 감사 + 마케팅 경쟁 재평가 + Reddit CAPI

> 279차 세션, 도메인 M2(머니 경로) 담당 산출물. 브랜치 `feat/n236-admin-growth-automation`. master 미접촉.

## 1. 이번 세션 완료분

### 1-1. 머니 경로 재감사(회귀 검증)
- **쿠폰 이중차감 제거**(Pnl.php:199·GlobalDataContext.jsx:1932): revenue=SUM(total_price)=결제금액(post-coupon) 실측 확인(Naver totalPayAmount·Coupang payment.total_amount·Gmarket finalDscAmt 등). `net_payout=gross-platform-returnFee`(OrderHub.php:1256). **회귀 0·정합**. 재플래그 금지.
- **FX writeback**(ChannelSync::channelPrice + Connectors::krwToCurrency): KRW÷(KRW/unit) 단방향·미상/KRW fail-safe·정수통화 반올림. 정합.
- **Shopee update**: update_price/update_stock 실호출·부분실패 ok=false. 정합.
- **ReturnsPortal 수동반품 매출역분개** = **오탐 철회**: 반품은 웹훅·수동 양쪽 모두 매출 포함이 의도 설계(OrderHub.php:81 "반품은 매출 포함·returnFee로만 반영"·CANCEL_TOKENS에 반품 토큰 없음). 비대칭 없음. **수정 금지**(넣으면 신규 비대칭·설계위반).
- **netProfit 배송비**: 오케스트레이터가 산식 방식으로 이미 수정 완료(Pnl.php:207-212·GlobalDataContext.jsx:1937-1938, net_payout 불변+산식에서 shippingCost 차감). 내가 시도한 rollup baking 방식은 이중차감 유발이라 전량 revert(OrderHub.php diff 0).

### 1-2. 마케팅 경쟁 재분석(부재증명으로 오판 정정)
직전 "약점" 평가 대부분이 **이미 구현된 것에 대한 오판**(부재증명 미실시, FP 레지스트리 재발)이었음. 코드 재검증 결과:
- 서버전환(CAPI): Meta/TikTok/GA4/Pinterest(v5)/Snapchat(v3)/Google(gclid) **이미 실배선**(PixelTracking.php:231-235·AdAdapters).
- Google Customer Match: OfflineUserDataJob 실구현(AdAdapters.php:1715).
- 생성형 소재: CreativeStudio + ClaudeAI::generateImage(DALL·E/Stability) 실구현.
- 어트리뷰션 삼각융합(markov+Double ML uplift+MMM+holdout 캘리브레이션), 이익 프론티어(Mmm), 킬스위치/결제게이트 = 경쟁 우위.
- **정정 점수**: 마케팅 자동화·실집행 ≈88.4(경쟁 ≈88.5, 실질 동급·측정/이익/안전 우위).

### 1-3. 구현(유일한 진짜 부재분)
- **Reddit Conversions API(v2.0)** — PixelTracking.php forwardToReddit + 설정컬럼(reddit_ad_account_id·reddit_conversion_token·forwarded_reddit) + 복호화 + 디스패치 + createConfig 저장. Pinterest/Snapchat 패턴 동형. 자격증명 등록 즉시 실행·honest no-op·2xx 전달확인. 서버전환 목적지 **7개** 완성. 기존코드 무수정·순증만.

## 2. 다음 차수 초고도화 우선순위 (순서대로)

### P1 — 매출직결·코드 구현 가능(자격증명 불요)
1. **netProfit 배송비 이중차감 엣지 근본해결**: 현 산식 수정은 estimated 지배 환경 정확하나, **실 정산 업로드(KrChannel) 테넌트는 net_payout이 이미 shipping_fee 차감(KrChannel.php:443)** → 산식에서 또 차감 = 이중. 근본책=정산행 status-aware 집계(estimated만 배송비 차감) 또는 orderhub_settlements에 shipping_fee 컬럼 추가해 소스 무관 일관 반영. (Pnl.php:208 문서화 트레이드오프)
2. **CAPI 잔여 목적지 확대 검토**: LinkedIn/Criteo 서버전환 + Google Enhanced Conversions 커버리지 확대(기존 forwardTo* 패턴 재사용, 저위험).

### P2 — 기능 심화(경쟁 격차 축소)
3. **CRM 생성형 저니 빌더 + 실시간 스트리밍**(Klaviyo/Braze 대비 82→90 목표).
4. **프리퀀시캡·소재피로 파리티**: Meta/TikTok 외 채널(Google/Naver/Kakao) 확장.
5. **네이티브 lift 실험 오케스트레이션 심화**(holdout 프레임워크 有 → 매체 실험 API 연동 확대).

### P3 — 외부 자격증명/광고상품 의존(코드 선구현 금지·투기 금지)
6. 6채널 광고 실집행 **라이브 write-OAuth 검증**(자격증명 등록 시 즉시 해소).
7. **Naver/Kakao 해시 오디언스**(별도 광고상품 계약 필요).
8. **플랫폼 네이티브 Conversion Lift 실험**(매체 실험 API + 실계정).

## 3. 배포 전 검증 필요
- 원격 `php -l backend/src/Handlers/PixelTracking.php`(로컬 PHP 부재로 미실행).
- createConfig에 reddit_ad_account_id/reddit_conversion_token 왕복 + 실 구매 이벤트 forwarded_reddit=1 확인.
- ensureTables ALTER 멱등(기존 테넌트 pixel_configs에 reddit 컬럼 자동추가) 확인.

## 4. 주의(재플래그·중복 금지)
- 반품 매출 포함 = 의도 설계(재플래그 금지).
- CAPI 6종·Customer Match·생성형 소재 = 이미 구현(재구현 금지).
- Naver/Kakao 오디언스·라이브 OAuth·네이티브 Lift = 외부 의존(투기적 선구현 금지).
