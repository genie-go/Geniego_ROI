# 282차 세션 인계서 — 경쟁약점 초고도화 R3 + 피드 변환엔진 실배선 + P2 빠른승리 3건 + 운영/데모 배포

> 브랜치 `feat/n236-admin-growth-automation` · master 미접촉(CI inert). 운영 `www.genieroi.com` + 데모 `demo.genieroi.com` **배포·스모크 검증 완료**(사용자 명시 승인). 격리 PHP 테스트 하니스 3종 총 57/57 PASS.

## 0. 개요
사용자 지시: (1) 추천인 제도 신설, (2) 전면 경쟁 재평가(자격증명-준비 기준·과거 오탐 정정), (3) "경쟁사 대비 조금이라도 약점인 것 전부 초고도화", (4) 확률 아이덴티티 별도 정밀검증, (5) P0 피드 변환엔진 실배선 + 약점 이외 추가 초고도화, (6) 종결 배포+인계서+커밋/푸시+재평가. 전 작업 로컬 누적 후 종결 시 일괄 배포.

## 1. 초고도화 구현 (전부 배포 완료 — 재구현/재플래그 금지)

### 경쟁 순수코드 갭 (7건)
1. **에이전틱 코파일럿 UI 배선** — `AIInsights.jsx` AIAssistantTab: agent모드·`/v422/ai/agentic`(ClaudeAI::agenticAsk 실 tool-use: bi_query 읽기 + propose_* 액션)·승인 후 `/agentic/execute`. 백엔드 엔진은 255차부터 존재·UI만 부재였음(과거 오탐).
2. **MMM 계절성 통제** — `Mmm.php` buildControlMatrix(intercept/trend/주간·연간 sin·cos)+solveOLS(ridge). `seasonality_controlled` 플래그. 합성검증 β편향 제거.
3. **상품추천 협업필터** — `CRM.php::productAffinity` item-item 코사인 `co/√(|A|·|B|)` + SKU별 top-K recommendations. `CRM.jsx` 패널.
4. **전역 레이트리밋** — `index.php` api_key 검증 직후 `api_rate_limit` 1분 고정윈도우(기본 1200/min·`GENIE_RATE_LIMIT_PER_MIN=0` 비활성·fail-open·429+Retry-After). SPA/세션 트래픽 미도달(상단 게이트 return).
5. **토픽 레벨 선호센터** — `PreferenceCenter.php` TOPICS(promo/newsletter/product/event)·isTopicAllowed·발송게이트 `topic_opt_out`(12채널 전부 강제)·publicCenter/admin/summary. 스키마변경0(channel='topic:{k}' 재사용).
6. **확률적 아이덴티티 매칭** — `CRM.php` identityCandidates(read-only 스코어링·블로킹·강신호≥0.7 or 2신호)·scoreIdentityPair(순수·테스트가능)·mergeIdentities(관리자승인·`crm_identity_merge_link` 영속)·identityUnmerge(되돌리기)·**resolveIdentitiesForTenant에 merge_link 시드**(재해석이 확률병합 덮어쓰던 상호작용 차단). 결정적(phone/kakao exact) 위 레이어. 자동병합0. `CRM.jsx` 후보검토 패널+360 unmerge. **테스트 25/25**.
7. **★P0 피드 변환엔진 실배선** — 경쟁평가 G1 "FeedTemplate 저장/승인만·실적용0(inert)" 근본해소.
   - 신설 `FeedTransform.php`(순수엔진·24 op·eval無·정규식 검증후실행·script내용 제거).
   - `FeedTemplate.php`: parseSpec(JSON fields / mapping+transforms / 레거시YAML 3형식)·resolvePublished(요청캐시)·transformProduct(canonical 오버레이=실전송 반영)·CHANNELS 4→23 확장·preview(dry-run) 엔드포인트.
   - ★배선지점 = `Catalog.php::processWritebackQueue` L1138 `normalizeAdapterPayload` 직후(전채널 단일 정규화점) → 발행스펙 적용. 신규등록(register/publish) 필수필드 미충족 시 전송차단(오피드 방지). **무발행/오류 원본유지=회귀0.** preview/prepare도 반영.
   - 프론트 `RulesEditorV2.jsx` 전면재작성(리치 규칙빌더=source/value/template + 변환 파이프라인 UI + 라이브 dry-run 프리뷰·JSON스펙 저장·기존 승인/배포 워크플로우 보존).
   - **테스트 21/21**.

### P2 빠른승리 (3건)
8. **BI 산점도·트리맵** — `dashboards/ChartUtils.jsx` ScatterChart(최소제곱 추세선)+Treemap(구성비) 신설(의존성없는 SVG). `ReportBuilder.jsx` viz 레지스트리 배선(scatter=지표2개·treemap=단일지표). 지오맵은 기존재(오탐).
9. **SIEM LEEF/Syslog** — `Compliance.php` toLeef(QRadar 2.0)·toSyslog(RFC5424 PRI/STRUCTURED-DATA)·serializeEvents 공용. auditExport·siemConfig·siemPush(실시간+배치) 배선. **테스트 11/11**(STO 포함).
10. **개인별 예측 발송시간(STO)** — `CRM.php::bestSendHour`(과거 오픈/클릭/구매 최빈 KST시각·데이터<3 null)·발송게이트 `sto_defer`(opt-in `$contact['sto']`=회귀0)·`PreferenceCenter::getPreferences`에 best_send_hour 노출.

### 추천인 제도 (신설)
- `Referral.php` 신설(referral_code/signup·UNIQUE referred_user_id=중복0·자기추천 차단·구독회원만 자격·+365d 유효·+30d usable_from 락). `CouponRedeem.php` 만료/락/리텐션 게이트·rank 다운그레이드 방지. `UserAuth::register` 캡처. 프론트 `AuthPage`(코드입력+검증)·`MyCoupons`(내코드/통계)·`ReferralPromo.jsx`(15개국·라이트카드 WCAG AA)·Landing/PricingPublic 홍보. **데모 E2E 실증**(락 코드 403 coupon_locked).

## 2. 배포 상태 (완료)
- **백엔드** 28개 PHP(신규 FeedTransform/Referral 포함) → 운영+데모 `backend/` tar추출·php -l 검증·chown www:www·php8.1-fpm reload.
- **프론트** 운영=`npm run build`, 데모=`--mode demo`(VITE_DEMO_MODE true 검증) → 각 docroot `rsync -a --delete` 클린스왑(고아청크 방지)·chown.
- **스모크**: 운영 home 200·login API 401·feed_preview(/api/v395/…) 401·identity/candidates(/api) 401·referral(/api/v423/creds) 200. 데모 home 200. 무500.

## 3. 경쟁 재평가 결과 (7도메인 병렬·코드검증)
| 도메인 | 경쟁사 | GeniegoROI |
|---|:-:|:-:|
| 어트리뷰션·측정 | 88 | 87 |
| 마케팅 자동화 | 94 | 90→(STO보강) |
| CRM·CDP | 91 | 89 |
| 채널·커머스·WMS | 87 | 88→(피드엔진보강) |
| 분석·BI | 88 | 90→(산점도/트리맵보강) |
| AI·최적화 | 88 | 90 |
| 보안·엔터프라이즈 | 90 | 87→(SIEM보강) |
- 종합 ≈ 89(가중). 3도메인 앞섬. 단일 경쟁사가 7도메인 동시 커버 불가=통합 폭이 차별점.

## 4. 잔여 백로그 (P2~, 우선순위)
- **필드별 survivorship 골든레코드**(Amperity 핵심·병합은 클러스터 단위)·**ML 학습형 아이덴티티 매칭**(현재 규칙 스코어).
- **재고 델타→채널 자동 푸시 루프**(현재 product update시에만 전파).
- **DSAR/삭제권 워크플로우**(현재 soft opt-out·IP/UA 잔존).
- **딜리버러빌리티/인박스 평판 모니터링**.
- **프로덕션 모델 드리프트 파이프라인**(스캐폴드·정직-공백, 데모만 시뮬).
- **드래그드롭 피벗/시맨틱 레이어**(Looker LookML급).
- **SOC2/ISO 리포트 아티팩트 생성**.

## 5. 함정·주의
- 신규 실배선 API는 **/api 접두 필수**(nginx가 접두없는 /crm·/v395를 SPA HTML 폴백=200 착시). 프론트는 전부 /api 사용.
- 라우트 신설 시 `routes.php` 맵 + `$register` **둘 다** 필수.
- 데모/운영 빌드 혼용금지(운영=`npm run build`·데모=`--mode demo`). dist 스왑은 `rsync -a --delete`(tar추출은 고아청크 잔존).
- 자격증명 = 메모리 `reference_session_credentials`(평문 노출 금지).
- 피드 변환엔진: 무발행 채널은 완전 무영향(회귀0). 신규등록 필수필드 미충족만 차단(update/price_update는 오버레이만).
