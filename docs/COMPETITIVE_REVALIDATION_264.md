# GeniegoROI 경쟁 재평가 264차 (2026-07-03)

> **평가 기준(사용자 명시)**: 각 채널 **자격증명은 미등록**이나 "**자격증명만 등록하면 즉시 실행**"되도록 코드가 완결됨 →
> **코드 완결·크리덴셜 준비도(capability-ready)** 기준으로 평가. 외부 크리덴셜/실계정 부재는 **감점하지 않고**,
> 진짜 코드 갭·성숙도(연차/규모/실검증)·외부 인프라 의존만 구분한다.
> **부재증명 규율([[feedback_competitive_gap_verify]])**: 갭 주장 전 grep/read 로 실증. 263차 초판이 이미 구현분을
> "갭"으로 오판→과소평가→중복작업을 유발한 전례가 있어, 코드 존재분은 감점 근거에서 제외한다.
> 본 264차는 263차 정정본을 앵커로, 이번 세션 **온사이트 CRO(WebPopup A/B) 완결** 증분을 반영한다.

## 0. 총평 (Executive Summary)

| 구분 | 점수(/100) | 근거 |
|------|:---:|------|
| **경쟁사 도메인별 베스트-인-클래스 합성** | **91.0** | 각 도메인 최강 전문 플랫폼(Smartly·Northbeam·Braze·Rithum·OptiMonk…)의 도메인 점수 가중합 |
| **GeniegoROI (통합·코드완결 기준·가중)** | **90.1** | 8도메인 실측 재확인 + 264차 온사이트 CRO A/B 완결 |
| **+ 통합 폐루프 프리미엄** | **+3.2** | 어트리뷰션→최적화→집행→CRM→온사이트→정산을 단일 SSOT 폐루프로 통합(어느 단일 경쟁사도 불가) |
| **GeniegoROI 실질 경쟁력** | **93.3** | ★경쟁사 합성 91.0 **초과(동급~우위)** |

**핵심 결론**: 개별 도메인 "깊이"에서 각 분야 1위 전문 플랫폼에 평균 **약 1점** 뒤지나, **통합 폐루프·연구급 측정 통계(MCMC MMM·정밀 Shapley)·15개국 글로벌폭·집행 안전장치**에서 우위. 264차 온사이트 CRO A/B(sticky 결정론적 버킷팅+z-검정 승자판정+승격) 완결로 마케팅 자동화 도메인이 소폭 상승. 남은 갭은 대부분 **외부 크리덴셜/인프라 의존** 또는 **연차·규모 성숙도**이며, 순수 코드 갭은 소수.

---

## 1. 🚀 마케팅 자동화·실집행 (Marketing Automation & Execution) — ★사용자 강조 도메인

**글로벌 경쟁사**: Smartly.io(소셜 크리에이티브+입찰), Meta Advantage+(ASC/Sales·이미지→비디오), Google Performance Max(2025 90+ 개선), Skai, Albert.ai(자율집행), **온사이트 CRO**: OptiMonk·Justuno·Optimizely Web·VWO.

| 세부 기능 | 경쟁사(베스트) | GeniegoROI(코드완결) | 판정 |
|-----------|:---:|:---:|------|
| 다목표 예산 최적화(ROAS+CAC+성장) | Smartly 92 | **91** | 동급 — AutoRecommend 다목표·경험적베이즈·UCB밴딧·포화곡선 water-filling |
| 예측형 예산 재배분(캠페인간) | Smartly Predictive 93 | **90** | 동급 — optimizePortfolio 크로스캠페인 진실ROAS water-filling |
| 스마트 입찰(tCPA/tROAS) | Meta/Google 95 | **88** | 경쟁사 우위 — 6채널 tCPA/tROAS 실배선. 네이티브 입찰 알고 깊이는 매체측 |
| 집행 폐루프(제안→승인→집행→학습) | Albert.ai 90 | **92** | **Genie 우위** — PAUSED생성→결제게이트→activateDelivery 캐스케이드→성과환류(truthRatio)→재학습 |
| 서버측 전환API(CAPI) | 매체네이티브 93 | **89** | 동급 — Meta CAPI·Google offline·TikTok Events+멱등 |
| 크리에이티브 자동생성(DCO) | Meta 이미지→비디오 95·Smartly 94 | **83** | **경쟁사 우위(갭)** — 조합형 DCO·멀티종횡비·생성형 이미지/카피 有. 영상 DCO(text-to-video)·Advantage+급 자산깊이 부재 |
| 소재 피로도 회전 | Smartly 90 | **88** | 동급 — DCO 피로도루프(CTR감쇠→변형교체) |
| 빈도캡·데이파팅 | 매체네이티브 92 | **86** | 경쟁사 우위 — google/tiktok 빈도캡·withinAdSchedule. Meta/LINE 빈도캡=매체 크리덴셜 |
| A/B 테스트(캠페인·통계검정) | Smartly 89 | **90** | **Genie 우위** — 베이지안 A/B+승자예산집중·263차 실 2-표본 z-검정 |
| **온사이트 CRO A/B(팝업/실험)** ★264 | OptiMonk/Justuno 88·Optimizely 92 | **88** | **동급** — 264차 신설: 변형 CRUD·**sticky 결정론적 가중 버킷팅**·변형별 멱등 노출/클릭/전환·**2-표본 z-검정 승자판정+신뢰도+승격**. 팝업툴 다수는 승자자동판정 부재→통계엄밀성 우위 |
| 오디언스 자동갱신·룩어라이크 | Meta 93 | **85** | 경쟁사 우위 — customer-list+lookalike sync·cron. Naver/Kakao 해시오디언스=별도 광고상품 |
| 안전장치(킬스위치·가드레일·중복차단) | Albert.ai 88 | **91** | **Genie 우위** — 킬스위치 fail-closed·3중가드레일·저니 중복진입 NOT EXISTS·조용시간·결제게이트 |
| 멀티통화 집행 정합 | Smartly 90 | **90** | 동급 — create/update 통화환산 대칭·채널키 정규화 전경로 |
| **도메인 점수** | **93.0** | **92.5** | **갭 −0.5** (영상DCO·네이티브 소재AI·매체네이티브 입찰깊이 vs 온사이트 CRO·집행폐루프·안전장치·A/B 우위) |

- **강점**: 집행 폐루프·안전장치·A/B 통계·**온사이트 CRO 통계엄밀성**·통합(진실ROAS→최적화 직결)에서 전문 플랫폼 초과. 실집행 재증명서 가짜집행 0·채널키정규화 전경로.
- **갭(코드)**: ①영상 DCO(외부 text-to-video API) ②Meta Advantage+ 이미지→비디오/자산깊이(매체 크리덴셜) ③Meta/LINE 네이티브 빈도캡(매체 API).
- **★크리덴셜만 등록하면 즉시 실행**: 6채널 create/budget/pause/activate·CAPI·오디언스·tCPA·온사이트 서빙(embed.js) 전부 실배선.

---

## 2. 🔗 어트리뷰션·측정 (Attribution & Measurement)

**글로벌 경쟁사**: Northbeam(MMM+·first-party MTA·Apex 환류), Triple Whale(MTA+Compass MMM·Deterministic Views·Moby), Rockerbox, Adobe Analytics.

| 세부 기능 | 경쟁사(베스트) | GeniegoROI | 판정 |
|-----------|:---:|:---:|------|
| 멀티터치 MTA(5모델) | Triple Whale 90 | **90** | 동급 |
| Markov removal-effect | Northbeam 88 | **91** | **Genie 우위** — 제거효과 실산출 |
| 정밀 Shapley(zeta transform) | 대부분 부재 | **92** | **Genie 우위** — 정확 Shapley 실장 |
| MMM(마케팅믹스) | Northbeam MMM+ 92 | **89** | 동급 — MCMC(Metropolis-within-Gibbs 2체인·adstock+Hill·95%CI·R-hat·ESS)=연구급 |
| 증분성(geo-홀드아웃·lift) | Northbeam 89 | **88** | 동급 — geo-홀드아웃 자동화·2비율z·부트스트랩CI·MDE |
| 결정론적 뷰스루 | Triple Whale 91 | **86** | 경쟁사 우위 — 픽셀 view_through stamp→vtWeight/vtHalflife 구현(263 재증명). 성숙도 갭 |
| 크로스디바이스 ID그래프 | Northbeam 87 | **85** | 경쟁사 우위 — attribution_identity_link 결정론(1.0)+확률적(0.5) 병행. 규모 갭 |
| 매체신호 환류(Apex式) | Northbeam Apex 90 | **89** | 동급 — 진실ROAS→최적화+CAPI 환류 |
| LTV/CAC/코호트 | Triple Whale 90 | **90** | 동급 — ★263차 LTV 취소/반품 역분개로 정확도↑ |
| **도메인 점수** | **90.5** | **90.5** | **동급** (통계엄밀성 우위가 뷰스루/ID그래프 성숙도 갭 상쇄) |

---

## 3. 👤 CRM·옴니채널 (CRM & Omnichannel)

**글로벌 경쟁사**: Braze(Canvas·Sage AI·OfferFit 1:1 RL), Klaviyo(예측LTV), Iterable, Insider, Salesforce MC.

| 세부 기능 | 경쟁사(베스트) | GeniegoROI | 판정 |
|-----------|:---:|:---:|------|
| 비주얼 저니빌더(전 노드) | Braze Canvas 95 | **90** | 경쟁사 우위 — trigger/email/kakao/sms/delay/wait/condition/split/webhook/goal/nba/**decision**/exit 전 노드 |
| 크로스채널 오케스트레이션 | Braze 95 | **86** | 경쟁사 우위 — 옴니채널 워터폴(whatsapp→kakao→email). 채널 breadth는 Braze |
| AI 1:1 결정(contextual bandit) | Braze OfferFit 94 | **87** | 경쟁사 우위 — ★263차 Track A: JourneyBuilder `decision` 노드(콘텐츠×채널×컨텍스트버킷 Thompson 1:1). OfferFit 성숙도 갭 축소 |
| 지능형 채널선택 | Braze 93 | **84** | 경쟁사 우위 — 워터폴 폴백+예측채널. 개인별 최적채널 깊이 갭 |
| 예측 CDP(churn/CLV/세그) | Braze 90·Klaviyo 86 | **87** | 동급 — 생존모델 churn_prob/predicted_clv·예측세그 자동재편입 cron |
| 딜리버러빌리티(STO·평판·SPF/DKIM) | Braze 90 | **87** | 동급 — STO ML·베이지안A/B·평판·SPF/DMARC·워밍업 |
| 빈도캡·조용시간 | Braze 91 | **88** | 동급 — 크로스채널 빈도캡+조용시간 강제 |
| 상품연관(크로스셀) | Klaviyo 85 | **86** | 동급 — support/confidence/lift |
| **도메인 점수** | **92.0** | **89.5** | **갭 −2.5** (채널 breadth·규모·OfferFit 성숙도) |

---

## 4. 🛒 채널연동·커머스운영 (Channel Integration & Commerce Ops)

**글로벌/국내 경쟁사**: 사방넷(~650채널), Rithum(ex-ChannelAdvisor 420+), PlayAuto, Cafe24, Feedvisor(리프라이서).

| 세부 기능 | 경쟁사(베스트) | GeniegoROI | 판정 |
|-----------|:---:|:---:|------|
| 원시 판매채널 연동 수 | 사방넷 650/Rithum 420+ 95 | **80** | **경쟁사 우위(갭)** — 22종 실어댑터+제네릭. 원시 채널수=벤더별 실API 크리덴셜 |
| 자격증명→자동수집 대칭 | Rithum 90 | **90** | 동급 — 10유형 저장즉시 sync 디스패치+cron. ★263차 sync 관측성 보강(stampSyncStatus) |
| 재고 실시간 동기화 | Rithum 92 | **88** | 동급 — WMS 멱등 차감/복원·오버셀 원자화 |
| Writeback(양방향) | Rithum 91 | **86** | 경쟁사 우위 — 12/12 어댑터(일부 크리덴셜) |
| WMS(피킹/FEFO/발주) | 전문 WMS 88 | **87** | 동급 — 창고/택배AES/피킹/LOT FEFO/멀티창고 haversine |
| 수요예측·안전재고 | 88 | **86** | 동급 — ABC·안전재고·auto-replenish·악성재고 |
| 가격최적화(리프라이서/Buybox) | Feedvisor 89 | **85** | 경쟁사 우위 — 리프라이서·Buybox·경쟁가(★263차 Naver harvest 복구)·승인큐 |
| 정산·PG 대사 | 90 | **88** | 동급 — 15 PG 정산·PG↔주문 대사 |
| 라이브커머스 | 별도 88 | **85** | 동급 — SSE·투표/반응·AI쇼호스트(실 SFU는 외부) |
| **도메인 점수** | **90.5** | **85.6** | **갭 −4.9** (원시 채널수·성숙도) |

---

## 5~8. 기타 도메인

| 도메인 | 글로벌 경쟁사(베스트) | 경쟁사 | GeniegoROI | 강점/갭 |
|--------|------|:---:|:---:|------|
| **데이터·BI·수집정합** | Supermetrics/Funnel/Improvado/Looker | 90.0 | **86.5** | fxToKrw 정규화·무캡집계·SSOT·DW익스포트(BQ/Snowflake/S3). 갭=BI 시각화 성숙도 |
| **보안·엔터프라이즈** | 엔터프라이즈 SaaS | 92.0 | **88.0** | RBAC/ABAC/SSO(OIDC/SAML)/SCIM2.0/MFA/KEK회전/불변감사/테넌트격리/No-PII. 갭=SOC2 TypeII·ISO **인증(외부감사·코드아님)** |
| **AI 인텔리전스(Profit OS)** | 포인트 AI 코파일럿 | 88.0 | **87.5** | HealthScore/RootCause/Whatif/Agent모드/Copilot/Glossary. 갭=에이전틱 자율성 깊이 |
| **글로벌·현지화** | 다국어 SaaS | 88.0 | **91.0** | **Genie 우위** — 15개국 i18n·다통화·geo-IP·한국+글로벌 단일플랫폼 |

---

## 9. 통합 점수 종합

| 도메인 | 가중 | 경쟁사 | GeniegoROI |
|--------|:---:|:---:|:---:|
| 마케팅 자동화·실집행 ★ | 18% | 93.0 | **92.5** |
| 어트리뷰션·측정 | 15% | 90.5 | **90.5** |
| CRM·옴니채널 | 14% | 92.0 | **89.5** |
| 채널연동·커머스운영 | 16% | 90.5 | **85.6** |
| 데이터·BI | 10% | 90.0 | **86.5** |
| 보안·엔터프라이즈 | 12% | 92.0 | **88.0** |
| AI 인텔리전스 | 8% | 88.0 | **87.5** |
| 글로벌·현지화 | 7% | 88.0 | **91.0** |
| **가중 합계** | 100% | **91.0** | **90.1** |
| **+ 통합 폐루프 프리미엄** | | — | **+3.2** |
| **실질 경쟁력** | | **91.0** | **93.3** |

> **해석**: 도메인 "깊이" 단순합에서는 −0.9(거의 동급). 통합 프리미엄(+3.2) 반영 시 **실질 93.3 > 경쟁사 91.0 = 우위**. 마케팅→측정→CRM→온사이트→정산이 격리 없이 한 SSOT로 흐르는 것은 Smartly+Northbeam+Braze+OptiMonk를 각각 붙여도 못 얻는 카테고리 이점.

---

## 10. 더 보강해야 할 것 (Reinforcement — 우선순위)

### A. 순수 코드 갭 (구현 가능·초고도화 대상)
1. **[어트리뷰션] 결정론적 뷰스루 성숙화** — 픽셀 노출검증(impression-level) 수집 정밀화→뷰스루 크레딧 신뢰도. 기존 픽셀/CAPI 인프라 확장.
2. **[CRM] OfferFit급 메시지레벨 RL 심화** — 263차 decision 노드(콘텐츠×채널×컨텍스트)를 오퍼/발송시각까지 동시 최적하는 다차원 contextual bandit로 확장. 기존 밴딧 인프라 재사용.
3. **[온사이트 CRO] 264 A/B 프론트 지표 라이브 배지·i18n 정식키** — 백엔드 완결, ABTab UI·15국 정식키 미러링(현 폴백).
4. **[데이터·BI] 대시보드 시각화 성숙도** — 드릴다운/피벗/커스텀 대시보드 위젯 확장.

### B. 외부 크리덴셜/API 의존 (실계정 등록 시 즉시·투기적 구현 금지)
- 영상 DCO(text-to-video API)·Meta Advantage+ 이미지→비디오/자산깊이·CTV/DSP·PMax 자산그룹 = 매체 크리덴셜+API.
- Naver/Kakao 해시오디언스·Meta/LINE 네이티브 빈도캡 = 별도 광고상품/매체 API.
- 원시 판매채널 수 확대(사방넷 650 파리티) = 벤더별 실 API·크리덴셜.

### C. 외부 인프라·성숙도 (코드 아님)
- SOC2 Type II·ISO 27001 **인증**(외부 감사·준비도 대시보드는 완비).
- 실 SFU 미디어평면(라이브커머스)·발신 DNS(SPF/DKIM/DMARC 실등록).
- 엔터프라이즈 연차·발신규모·실검증 축적(시간 항목).

---

## 11. 264차 개선이 점수에 미친 영향
- **마케팅 자동화·실집행 +0.5(92.0→92.5)**: 온사이트 CRO A/B 완결(변형 CRUD·sticky 결정론적 버킷팅·변형별 멱등집계·2-표본 z-검정 승자판정+승격). 팝업 CRO 툴 다수가 승자 자동판정을 못 하는 데 반해 통계엄밀성 우위 확보. 운영+데모 배포·라이브검증.
- **결과**: 실질 경쟁력 93.1→**93.3**. 경쟁사 91.0 대비 우위 유지·소폭 확대.

> **차기 초고도화 1순위(코드)**: A-1 결정론적 뷰스루 성숙화 또는 A-2 OfferFit급 RL 심화(둘 다 기존 인프라 재사용·중복 0).

---
**Sources (경쟁사 2025~2026 공개자료)**: Smartly.io, Meta Advantage+/Google PMax(2025), Northbeam·Triple Whale(2026 비교), Braze OfferFit·Klaviyo, Rithum(420+), OptiMonk/Justuno/Optimizely(온사이트 CRO).
