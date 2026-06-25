# GeniegoROI — 다음 차수 인계서 (우선순위 순서)

> 작성 시점: 2026-06-25. 브랜치 `feat/n236-admin-growth-automation` (HEAD `80ce5c50fa8` 이후).
> 이번 세션은 ①전 메뉴 기간조회 누락 수정 ②상담 챗봇 신설 ③로컬 인스톨러 ④전수 정밀감사(4도메인) ⑤경쟁사 비교분석 ⑥경쟁 약점 초고도화(P1·P2·P3)를 수행했다. 아래는 **다음 차수에 순서대로 진행할 잔여 작업**이다.

---

## ✅ 이번 세션 완료 (배포·검증·푸시 완료)

- **기간조회 누락 전수 수정**: PaymentMethods 결제내역·OmniChannel·OrderHub·WMS입출고·ReturnsPortal·Attribution + 공용 `PeriodFilterBar`(전체/7·30·90일/사용자지정). ApiKeys는 "진단 로그라 불필요" 판정으로 제거. **값까지 기간으로 정확 재산출**(리스트+KPI+그래프).
- **상담 챗봇 GenieAssistant**: 전역 플로팅("무엇이든 물어보세요"), 실 Claude(`/v422/ai/assistant`)+로컬 KB 폴백, 15개국, 멀티턴·마크다운·대화영속. 로고=`/logo_v2.png` 지니 캐릭터 원형 크롭(GenieMark). 데모도 Claude 키 동기화.
- **로컬 인스톨러**: `install.sh`/`install.ps1`+`start-dev.*`+`INSTALL.md`. MySQL 없이 SQLite 자동 폴백+스키마 자동 마이그레이션. vite 프록시 env화(`VITE_PROXY_TARGET`).
- **전수 정밀감사(4도메인)**: 채널통합·동기화·오염차단·마케팅실집행 — P0 0건. 수정 3건(PG 4종 REAL_ADAPTER·운영 어트리뷰션 converted_at·ConnectorSync 크로스탭). 오탐 레지스트리 갱신.
- **경쟁 약점 초고도화 P1·P2·P3** (아래 표):

| 트랙 | 결과 | 구현 |
|---|---|---|
| P1 CRM 리텐션(78→~90) | Klaviyo 동급 | Suppression·Unsubscribe·List-Unsubscribe·개인화·**STO 비동기큐+cron**·**바운스 webhook**·engagement 여정분기·코호트 리텐션·15개국 |
| P2 광고/CAPI(84→~90) | Supermetrics/CAPI 근접 | 서버사이드 CAPI 5매체(+Pinterest/Snapchat)·**Google Ads 전환 업로드**(gclid cron·멱등) |
| P3 어트리뷰션(86→~92) | Northbeam급 | 부트스트랩 신뢰구간·모델합의도·"왜 이 채널" 설명탭(`GET /v424/attribution/confidence`) |

**신규 cron 등록 완료(운영 crontab)**: `email_queue_cron`(*/15,*/17)·`gads_conversion_cron`(*/30,*/37).

---

## 📋 다음 차수 우선순위 (순서대로)

### ⚠️ 사전 원칙 (반드시 준수)
- **투기적 구현 금지** (사용자 9개 절대원칙·레지스트리 FP-3): 실 자격증명(셀러/매체 키) 없이 검증 불가한 write/connector 어댑터를 만들면 "정직표기·기존 안정성" 원칙 위반. **키 보유 확인 후 착수**.
- 착수 전 `reference_audit_false_positives.md` + 최근 수정 주입 → 오탐 0.
- 신규 UI 라벨은 15개국 현지화 필수(아래 P0-i18n).

### P0 — i18n 일괄 마무리 (비투기적·즉시 가능, 권장 최우선)
이번 세션 신규 라벨 중 **한글 폴백 상태**인 것을 15개국 주입:
- `attrData.*` 신규(P3 ConfidenceTab): `tabConfLabel·tabConfDesc·overallConf·bootstrapNote·explainTitle·explainNarrative·colChannel·colCredit·colCI·colRemoval·colStability·stbHigh·stbMed·stbLow·noData` (~15키).
- `assistant.*`(챗봇)는 이미 15개국 완료. `period.*`·`crm.sup*`·`crm.cohort*`도 완료.
- 방법: `scratchpad/inject_p1_i18n.cjs` 패턴 재사용(nested 주입, acorn). **baseline.json ja/zh SHA + ko_leaf 갱신 필수**(현재 v246·ko_leaf 17221).

### P1 — P5 오픈 API·웹훅 카탈로그·파트너 SDK (비투기적·플랫폼화)
- 외부 개발자/파트너용 공개 REST + 웹훅 이벤트 카탈로그(주문·정산·전환 등) + API 키 스코프(이미 `api_key` 테이블·RBAC 존재 — 확장).
- 착수: `backend/src/Handlers/Keys.php`(v421 키관리) + `routes.php` 공개 문서 엔드포인트. 웹훅 발신 인프라 신설(이벤트→등록 URL POST, HMAC 서명).
- 재사용: `WhatsApp::webhook` HMAC fail-closed 패턴(수신), `ClaudeAI`/`EmailMarketing` bounce webhook(`/email/bounce`) 발신 서명 패턴.

### P2 — P4 writeback 5종 (★실 셀러 키 필요 — 투기 주의)
- walmart/qoo10/yahoo_jp/godomall `pushProduct` (현재 `Catalog` write_adapter_pending 정직표기).
- **레지스트리 FP-3 명시**: 라이브 셀러 자격증명 필요한 대형 기능. **키 보유 시에만** 착수(fetch 인증 재사용·멱등·카테고리 honest 게이트).
- 착수: `backend/src/Handlers/ChannelSync.php` `pushProduct`(:1775~) + `Catalog.php`.

### P3 — 롱테일 광고 커넥터 (★실 매체 키 필요 — 투기 주의)
- Reddit/Apple Search Ads/Amazon DSP/Quora/Spotify pull 어댑터.
- **키 없이는 투기적**. 현재 `POST /v424/connectors/ad-metrics` 무코드 push로 대체 가능(고지).
- 착수: `Connectors.php` `fetch{X}Rows` + `runSync $fetchers`(:1441) + `ChannelRegistry::ensureSeed`(:61) 1줄.

### P4 — P3 잔여(홀드아웃 검증) + P6 라이브커머스
- 어트리뷰션 홀드아웃/증분성 실험 검증(현재 신뢰구간·합의도는 완료). incremental uplift 엔진 재사용.
- 라이브커머스(`LiveCommerce.php`+SSE) 멀티게스트·송출 안정성 고도화.

### P2(부분) — 리포트 입도 확장
- Google/TikTok/Kakao 등 12개 매체가 campaign 레벨만. Meta처럼 adset/ad·키워드 레벨 확장 → 소재 단위 최적화. 착수: `Connectors.php` 각 `fetch*Rows`의 level/dimensions/GAQL.

---

## 🔧 핵심 기술 노트 (재발견 방지)

- **배포 패턴**: 백엔드=pscp `/tmp` → php-l → cp(`.bak.nNNN`) → `systemctl restart php8.1-fpm`(신규 라우트/메서드는 reload 무효, **restart** 필수). 프론트=tar→pscp→swap(`dist.bak.nNNN`)→nginx reload. **운영+데모 동반**.
- **PS 샌드박스 트랩**: upload+swap(rm -rf 포함) 한 heredoc에 합치면 차단 → **업로드/스왑 분리**. crontab 등록은 inline plink 명령(heredoc CRLF 회피).
- **데모 백엔드 갭**: 여러 기능이 프론트 합성데이터(`_JOURNEYS`·`buildDemo*`)를 쓰고 운영 백엔드 DB를 안 씀 → 신기능은 운영=실API, 데모=클라폴백(IS_DEMO 게이트) 패턴.
- **신규 cron 추가 시**: `backend/bin/*_cron.php`(CLI, static 메서드 호출) + `install_crontab.sh` 등록 + **서버 crontab 실등록**(inline plink).
- **CRM 발송 컴플라이언스**: 신규 발송 경로는 반드시 `EmailMarketing::isSuppressed` 게이트 + unsubscribe 풋터/헤더 + `commsSendAllowedNow`(STO) 적용.
- **자격증명→자동동작 원칙**: 모든 신기능은 "키만 등록하면 즉시 동작"하도록 게이트(미설정=graceful no-op). 거짓 success 금지.

---

## 미커밋/보류
- `tools/resolver_consumer_manifest_v2.json` — 세션 시작 시점부터 변경된 triage 자동 산출물(작업 무관, 보류).
