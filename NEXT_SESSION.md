# 208차+209차 세션 인계서 — **라이브커머스 신설·동기화체인·WMS재고·OAuth·연동허브 전채널 + 209차 전수검수 10건**

> **작성일**: 2026-06-10 (사용자 명시 승인 후)
> **이전 세션**: 207차 → 208차 → 209차 (단일 연속 세션)
> **종결 상태**: ~38 커밋 운영/데모 수동 배포·검증·push 완료. 전 항목 라이브 검증(e2e/헤드리스/Crypto roundtrip/단위테스트). 본 인계서와 함께 커밋·push(사용자 승인).
> **운영** roi.genie-go.com / **데모** roidemo.genie-go.com. 메모리 `reference_session_credentials`·`project_n208_live_commerce`·`project_n209_audit`.

---

## ✅ 208차 — 라이브 커머스 ~ 연동허브 전채널

### A. 라이브 커머스 신설 (이전 배치, 본 세션 후속)
- 신규 `LiveCommerce.php`(5엔터티+SSE /v425/live) + `LiveCommerce.jsx`(8탭) + sidebar(catalog-sync 아래). RTMP 멀티송출 destinations. ClaudeAI::liveAssist. 15개국 i18n(`live`→`liveCommerce` ns 충돌수정).

### B. 모바일 데모/운영 로그인 불가 수정 (27e000e68a1)
- 원인=AuthPage 세로중앙정렬+260px 대형로고가 제출버튼을 모바일 폴드(844px) 밖 y=895로 밀어냄(폼 정상). @media 상단정렬+로고104px+카드높이해제. 헤드리스 검증 y=763 폴드안·탭가능.

### C. ★동기화 구조적 체인 (88cc7024bec · 62cfaf3bfea · c9ca5eb83a3)
- **주문 ingest → 실재고 차감**(ChannelSync.saveOrders/webhook, 멱등·단일행·음수방지) → **CRM 구매이력 자동기록**(crm_customers LTV누적+crm_activities purchase) → **취소/반품 → 재고복원+claim 적재**(orderhub_claims) → **정산 롤업 자동반영**(returnFee). 정산 cron 자동 롤업(OrderHub.rollupSettlementsCore 추출). 홈 대시보드 30초 폴링(GlobalDataContext).
- **단위테스트 PASS**: 재고10→주문3=7→재동기화 멱등→취소복원10+claim600→정산 gross30000/platform3000/return_fee600/net26400.

### D. WMS↔재고 통합 (7c665753f69 · 50b364d0ada · 5b47589774a)
- `wms_stock` 물리재고 신설(창고별·채널무관). createMovement 유형별 반영(입고/출고/이고/조정/폐기·한글라벨). GET /wms/stock. **InventoryTab 운영에서 wms_stock 표시**(입출고/CSV/수동조정 전 경로 반영). e2e 입고50→출고20 on_hand=30.

### E. OAuth 프레임워크 + admin UI (108f89a3378 · 266ab02e815)
- 신규 `OAuth.php`(/v425/oauth/*): authorize(state CSRF)/callback(code→token 암호화저장)/status/admin config. 6 provider(google/meta/facebook/tiktok/kakao/naver). 미설정 inert. **Topbar admin 접속키탭 OAuth 패널**(client_id/secret 등록+연결버튼) → 자가 활성화 가능. 검증 PASS.

### F. ★연동허브 전채널 자격증명 등록 + 국제특송 + PG (d94a903fc09 · 01323ae532a)
- ApiKeys.jsx CHANNELS/CHANNEL_FIELDS 광범위(SNS라이브·국내/글로벌마켓·D2C·물류). **국제특송 신설**(DHL/FedEx/UPS/EMS/TNT/CJ국제). rakuten/qoo10 필드. **PG 신설**(이니시스/토스/KCP/카카오페이/네이버페이/PayPal/Stripe). **저장 직후 커머스 즉시동기화**(POST /api/channel-sync/{ch}/sync).
- **★타테넌트 격리 e2e 증명**: ChannelCreds.tenantId=세션(authedTenant/Bearer/cookie)만, 위조 X-Tenant-Id 무시(184차 P0)+AES-256-GCM. 위조헤더저장→세션GET 노출(=세션테넌트 저장·헤더무시 증명).

### G. i18n 위생 (9143d30f8c5 · 546b94c5c55 · 54efe93346e)
- en collision 21→0(omniChannel/crm 가이드 stub회귀·dataTrust dead·onboarding.role*·wms.tabGuideDesc). **t('x')||'fb' 안티패턴 261건→t(key,fb)**(단어경계 lookbehind, 14파일). zh 66 collision=후행승리 무해(sacred SHA+1MB 보류).

### H. 기타 (788381761c0 · 4585e0e7fbb)
- ChannelSync.denyAnon junk Bearer 차단(실세션만)·AiGenerate/ModelMonitor tenant키 raw user_id→authedTenant. **★products/orders LIMIT ? 바인딩 MySQL 500 발견·수정**. Settlements import 죽은 /v382→/v424 롤업 재배선.

---

## ✅ 209차 — 전수 정밀검수 (5도메인 병렬감사 → Sprint 10건)

| 심각도 | 항목 | 커밋 |
|---|---|---|
| P0 | PaymentSuccess 크래시(`lang` 미선언→흰화면) | ac650b50657 |
| P0 | Insights 타테넌트 격리(dormant: 테이블 미존재) | ac650b50657 |
| P1 | LIMIT ? 바인딩 MySQL 500 ×5(EventNorm/Attribution/KrChannel/CouponAdmin/Decisioning) | 97f0a7f5b59 |
| P1 | secret-at-rest 암호화 ×5(Pixel/WhatsApp/SMS/InstagramDM/Kakao 평문토큰→AES) | e3a5c45e998 |
| P1 | CatalogSync/PriceOpt 영속(새로고침 데이터손실) | 4caefa66c6f |
| P1 | SMS Templates·Campaigns 백엔드 신설(탭 무음실패→작동, e2e PASS) | cc21e81e2b5 |
| P1 | 공개 회원가입 i18n 가능화(AuthPage 5문구) | 14e179a25f3 |

- **보안 P0 없음**(208차까지 견고). Insights=정적상 P0였으나 운영 MySQL에 테이블 미존재라 실 누출 없던 dormant→격리코드+테이블생성 하드닝.

---

## 🚀 배포·검증
- 백엔드: 운영·데모 pscp+php-l+chown+php-fpm restart(신규핸들러 필수). 드리프트 가드.
- 프론트: 이중빌드(VITE_DEMO_MODE) dist swap 다회(dist.o*). 헤드리스/e2e/단위테스트/Crypto roundtrip 검증.

## ⏭️ 다음 작업 (잔여 백로그)
- **#7 잔여**: LicenseActivation·HelpCenter·PaymentSuccess 한글 하드코딩 동형 래핑 + **14개국 번역**(i18n 워크플로우=사용자 확정 필요).
- **P2**: GdprConsent UA 익명식별자 충돌(FE consent_id 발급)·ko.js 중복키 2건(무해)·AdStatusAnalysis 라이트테마(미검증).
- **Insights dormant**: ingest POST 405 라우팅·upsertCreativeSkuMap ON CONFLICT(SQLite전용) MySQL 비호환(기능 부활 시).
- **외부 자격증명 의존**: RTMP 멀티송출 실송출·PG 실결제·택배 실추적·OAuth 실연동(각 사 OAuth앱/계약 입수 시 즉시 작동 — UI/프레임워크 완비).

## 📌 정본 패턴 (208~209차)
- **★LIMIT ? 바인딩 MySQL 500**: execute([...,$limit]) 배열바인딩=LIMIT 'N' 문자열 구문오류. 검증 int inline `LIMIT " . max(1,(int)$limit)`. 전역 EMULATE_PREPARES=false 금지(명명 placeholder 재사용 깨짐).
- **★secret-at-rest**: Crypto::encrypt(저장)/decrypt(사용). Crypto::decrypt 평문 passthrough=기존 평문행 무중단. 읽기 경로 전수 추적 필수(누락 시 라이브 채널 깨짐).
- **★타테넌트 격리**: tenantId=세션(authedTenant/auth_tenant attr)만, 클라 X-Tenant-Id 헤더 무시. ingest/집계 쿼리 WHERE tenant_id=:tenant 전수.
- **★신규 핸들러 3종세트**: routes.php $custom 맵 + $register() 둘 다(/api strip 위해 /api 없이 등록) + index.php bypass. opcache=fpm restart.
- **동기화 체인**: 주문 chokepoint(saveOrders/webhook)에서 재고차감+CRM기록+취소/반품 복원+claim→정산 롤업. 멱등(신규주문 SELECT 선판별).
- **프론트 영속**: client-state/localStorage만 갱신 시 새로고침 소실 → 기존 persist 엔드포인트(/api/catalog/bulk-price 등) 배선. setState updater 부작용 회피(items 사전수집).

(memory 갱신: `project_n208_live_commerce`·`project_n209_audit`. 본 인계서·커밋·push=사용자 명시 승인. 자격증명 평문 노출 0.)
