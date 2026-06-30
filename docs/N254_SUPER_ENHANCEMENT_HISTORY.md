# 254차 초고도화 이력 (경쟁 약점 보강) — ★재검증/재평가 시 필독

> **목적**: 다음 차수 전수감사·경쟁 재평가 시 **이미 완료한 초고도화를 "갭"으로 재플래그하거나 재구현하지 않도록** 하는 정본 이력.
> 254차에 글로벌 경쟁사(Northbeam/Triple Whale/Adobe·Rithum/사방넷/Channable·Meta Advantage+/Skai/Smartly·Linnworks/Brightpearl/Extensiv/Prisync·Klaviyo/Braze/Iterable·Sensei/Einstein/Bambuser/Looker) 대비 6도메인 기능별 평가 → 약점 순차 초고도화.
> 브랜치 `feat/n236-admin-growth-automation`(master 미접촉). 전부 운영/데모 라이브·항목별 deploy-verify-commit.

## ✅ 완료한 초고도화 (DONE — 갭 아님, 재구현 금지)

| # | 항목 | 커밋 | 구현 핵심 | 위치 |
|---|------|------|----------|------|
| ① | PG↔주문 결제대사 | `a309d3b` | 정산↔주문 매칭(order_ref·금액버킷±1·일자윈도 퍼지) → 미정산주문·고아정산·수수료불일치(>8%) 탐지 | `PgSettlement::reconcile`·`GET /v427/pg/reconciliation`·Settlements.jsx 카드 |
| ③ | 마케팅 고급 집행 UI | `e3c85ba` | 백엔드 REAL(입찰tCPA/tROAS·프리퀀시캡·오디언스retarget/lookalike/prospect·A/B·데이파팅·Google유형)를 AutoMarketing 패널로 노출 | AutoMarketing.jsx `고급 집행 설정`·launch 페이로드 |
| ⑤ | 서버측 Shapley 어트리뷰션 | `a480de2` | 협조게임 한계기여 평균(zeta transform·O(n·2^n)·n>12 top12+other). 프론트 mlAttribution 대체 권위엔진 | `AttributionEngine::shapleyAttribution`·`GET /v424/attribution/shapley` |
| ⑩ | BI S3/SigV4 + DW autocreate | `6ec9cd0` | Amazon S3 SigV4 서명 PUT(NDJSON 일자파티션) + BigQuery 타입추론 autocreate + Snowflake VARIANT autocreate | `DataExport::pushS3`/`ensureBqTable`·snowflake DDL |
| — | 실시간 SIEM 포워딩 | `3fe4cae` | high 심각도 보안이벤트 즉시 push(CEF/NDJSON/Splunk HEC). opt-in `siem_config.realtime`(기본off) | `Compliance::forwardEvent`·`UserAuth::audit` 훅 |
| — | 메시징 개인화 | `40db3c8` | LINE 본문=캠페인 템플릿(line_templates.content) 연결 + 카카오 templateParameter 실명 바인딩 | `Line::sendCampaign`·`KakaoChannel::callKakaoAPI($vars)` |
| — | 확률적 cross-device | `b6dab9f` | ip+ua 디바이스 시그니처(PII미저장)·14일·confidence 0.5. opt-in `attribution_prob_stitch@tenant`(기본off) | `Attribution::recordDeviceSigAndStitch`·`GET/POST /v424/attribution/probabilistic` |
| — | 메시징 전환기반 A/B + Liquid 개인화 | `f8be02c` | abResult metric=open/click/conversion(매출 집계) + renderTemplate Liquid-라이트({% if %}/default 필터·머지변수 확장) | `EmailMarketing::abResult`/`renderTemplate` |
| ⑥ | 생성형 DCO 자동연결 | `0c6466f` | 소재 피로 소진 시 ClaudeAI 신소재 자동생성·ad_design 영속. opt-in `dco_auto_generate@tenant`(기본off). ★서버 e2e 검증 | `ClaudeAI::autoGenerateAdDesign`·`AbTesting::dcoEvaluate` |
| — | i18n 배치(신규 라벨 15국) | `74a2097` | marketing.adv* 23키 15국 + 결제대사 카드 현지화(한글누출 방지) | locales 15·`tools/inject_n254_adv_i18n.cjs`·Settlements.jsx |

## ⛔ 오탐(FP) — 이미 구현됨, 차후 재플래그·재구현 금지

| 항목 | FP 사유 | 실제 위치 |
|------|---------|----------|
| **다통화 P&L(OMS)** | 분석이 "rollup raw total_price 합산"으로 오판. 실제는 **228차 S5에서 saveOrders가 ingestion 시 total_price를 KRW 정규화**(글로벌 USD/JPY/EUR→`Connectors::fxToKrw`, orig_currency는 raw_json). channel_orders.total_price=이미 KRW → 집계는 KRW 정확. 추가 보정 시 **이중환산 오류**. | `ChannelSync::saveOrders`(228차 S5) |
| **엣지 레이트리밋** | 분석이 코드만 보고 "nginx limit_req 부재"로 오판. 실제 nginx에 `login_limit`(30r/m)·`api_limit`(30r/s)·`limit_conn perip 50`·burst·429가 로그인/API 로케이션에 적용 중. | `/usr/local/nginx/conf/nginx.conf`+vhost |

## 🔄 잔여 — 외부자산/인프라 의존(코드 완결 불가·등록 시 활성·재플래그 금지)

- **⑨ geo-exclusion 배선**(인과 holdout — control 지역 매체 타겟 제외): 매체별 지역→geo-ID 맵(Meta region key·Google geoTargetConstant·TikTok location_id) 필요. **253차 #2에서 의도적 로드맵 보류**(추정 geo-ID 주입은 실광고비 오집행=기존안정성 위배). geo-ID 맵 등록+실광고계정 검증 시 인과 활성.
- **발송 인프라 DNS**(SPF/DKIM/DMARC): Postfix/OpenDKIM은 구성(203차)·DNS 레코드 미완. DNS 설정 사안(코드 아님).
- **광고집행 매체확대**(Snapchat/LinkedIn/Criteo/Pinterest 등): 수집은 REAL, 집행은 실 광고계정+매체별 API 검증 필요.
- **라이브 SFU 자체호스팅**: 표준 WHIP/WHEP 시그널링 REAL, 미디어평면은 외부 SRS/MediaMTX 위임(인프라).

> ★위 4건은 코드만으로 완결·검증 불가(외부 계정/맵/DNS/인프라 선행). "부재"가 아니라 "배선완료·활성대기". 재플래그 금지.

## 📌 재평가 원칙
1. 위 ✅/⛔ 항목은 **DONE**으로 간주 — 재구현·재플래그 금지.
2. 신규 감사 시 본 문서 + `reference_audit_false_positives` 메모리 우선 참조.
3. 코드 분석만으로 "부재" 단정 금지 — **인프라(nginx/DNS)·ingestion 정규화(228차 S5)·opt-in 게이트**는 코드 grep으로 안 보일 수 있음. PM 재증명 후만 갭 단정.
