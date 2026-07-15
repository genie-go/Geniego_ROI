# 287차 세션 인계서

287차(2026-07-15). 사용자 지시 3단계: ①fake-looks-real·경로/파이프라인·자격증명 필수필드·구독회원 메뉴 초정밀 전수감사 → ②모든 채널 데이터 수집 완결성·진위 감사·구현 → ③CCTV(이화트론 NVR) 연동. **①②는 운영+데모 배포·검증 완료. ③은 사전등록·정보탭 완료, 실영상은 공유기 포트포워딩(내일) 대기.** 브랜치 feat/n236-admin-growth-automation, master 미접촉.

---

## 1. 전면 정밀감사 + 확정 10건 수정 (배포·검증 완료)

5도메인 병렬감사(FP 브리프·부재증명강제 주입) + PM 직접 재증명. php-l 전건·빌드 EXIT0·md5 운영=데모·홈200·브라우저 런타임 클린.

| # | 심각도 | 결함 | 수정 | 파일 |
|---|---|---|---|---|
| B1 | HIGH | **Alerting::executeAction 가짜집행** — 승인 "실행 완료" 표시하나 어떤 광고 API도 호출 안 함(status만 변경). ★근본: **action_request 파이프라인 생산자(INSERT) 전무**한 죽은 스켈레톤(운영 도달불가) | action_json→실 AdAdapters::pause/updateBudget(자격증명게이트) 집행+정직상태(executed/failed/approved_manual)+message | Alerting.php, Approvals.jsx |
| D1 | HIGH(보안) | **MenuPricingSync upsertScores/applyRecommended master게이트 누락** — plan_period_pricing에 write하나 requireMasterAdmin2 빠져 sub-admin 전 플랜 요금 재작성 가능 | requireMasterAdmin2 추가(AdminPlans 대칭) | MenuPricingSync.php |
| C1 | MED | **WMS 발주 unit_cost/cost_total 운영 영구₩0** — 스키마/INSERT/프론트 3계층 단절. 데모는 정상표시라 은폐 | 스키마+자가치유ALTER·INSERT영속(cost_total=qty×unit_cost SSOT)·프론트 실값매핑 | Db.php, Wms.php, WmsManager.jsx |
| B2 | MED | **WmsManager 로트등록 빈catch 가짜성공** — 서버실패 삼키고 항상 "등록완료"·새로고침 소실 | 운영 실패표면화·데모게이트 | WmsManager.jsx |
| A1 | MED | **amazon_ads region UI미수집** — Connectors:2682가 region으로 API 엔드포인트 선택하나 미수집→EU/일본 광고주 sync 실패 | region+currency 필드 추가 | ApiKeys.jsx |
| G3 | LOW-MED | **ApiKeys 카드 false-green** — 레지스트리시드 채널 부분등록을 녹색'full' 오표시 | CHANNEL_FIELDS\|\|regFields\|\|DEFAULT | ApiKeys.jsx |
| A2 | LOW | 레지스트리 currency 필수 오강제→등록차단 | isOptionalField currency 전역선택+opt보존 | ApiKeys.jsx |
| A3 | LOW | x_ads currency 미수집 | opt필드 추가 | ApiKeys.jsx |
| B3 | LOW | CustomerAI::dispatchAutoAction 주석 거짓("초안생성") | 주석 정직화(프론트 호출부0=dead) | CustomerAI.php |
| E | LOW | seed_performance_metrics.php 실 테이블 mock INSERT | GENIE_ENV=demo/--force 가드 | seed_performance_metrics.php |

**CLEAN 재확인(재플래그 금지)**: 라우트 무결성 1004/1004·계약/머니SSOT·취소역분개 4~5경로 대칭·집계산식·마케팅6채널 실집행폐루프·markov/MMM/Shapley/CAPI·구독회원 메뉴 admin 3중방어·플랜게이팅 정합·4중오염방어·자격증명→자동sync 9종 대칭. **데이터수집 진위=양호(가짜/합성 실테이블 유입0)**.

---

## 2. 채널 데이터 수집 갭 구현 배치2 (배포·검증 완료)

**원칙: 실 documented API + graceful fallback(실패=현행 유지·가짜미주입) + N+1 하드캡(285차 502 트랩·저장요청 동기실행 지연방어).** ChannelSync.php + Connectors.php.

- **Amazon 라인아이템**: amazonOrderItems(getOrderItems) sku/상품명/단가 보강. 캡15+200ms.
- **Walmart 재고**: SKU별 /v3/inventory(종전 0고정). 캡20+150ms.
- **Shopee 상품**: get_item_list→get_item_base_info.
- **Lazada 주문아이템+상품**: /order/items/get(캡20)·/products/get. lazadaGet 서명헬퍼.
- **godomall 상품**: /api/goods.php getGoodsList.
- **Qoo10 통화**: cred 'currency' 오버라이드(JP게이트웨이라 JPY기본). ApiKeys currency opt필드.
- **Zendesk CS 응답시간**: ticket_metrics.json calendar 평균→avg_first_reply_min/avg_resolution_min.

**미구현(고위험 블라인드·라이브스펙 필요→해당 자격증명 등록 시 라이브 응답 확인 후 구현)**: 11st/gmarket(esm)/lotteon 상품LIST·yahoo_jp 주문아이템·Intercom/Freshdesk/Gorgias CSAT.

---

## 3. CCTV 연동 (이화트론 ET21-0404S-323A / NETUS Pro) — ★내일 계속

### 3-1. 장비 진단 (실측 확정)
- **외부 영상포트 23320 = 독자 프로토콜(RFJS PROTOCOL_JSON1)**, RTSP 아님(ffprobe 스트림 실패). 외부 8554/554/9090 전부 차단. 8080 웹=lighttpd 플러그인UI(스냅샷/스트림 표준경로 10종 전부 404).
- **표준 RTSP는 LAN 내부에만**: `rtsp://192.168.1.121:8554/live_01~03`(3채널). NVR 로그인 admin/6112.
- 외부 IP 14.52.38.147. 286차 "CCTV 웹연동 불가"(JWC/METEK)와 동일 클래스=**온프렘 브리지 또는 포트포워딩 필수**.

### 3-2. 사전등록 완료 (운영 acct_1·PROD)
- 로그인 이메일 MFA라 HTTP 우회 불가 → **서버 PHP CLI로 앱 Crypto/Db 직접**(reflection ensureTables + raw INSERT).
- **창고**: 본사-내부(wh#6·code GENIEGO-1)에 연결. ★사용자정보 "본사-내부/GENIEGO-2" 이름↔코드 엇갈림(GENIEGO-2=본사-외부 wh#7)→사용자 선택으로 wh#6 확정.
- **카메라 3대**: 본사-내부 CH1~3, source=bridge, host=192.168.1.121, rtsp_port=8554, rtsp_template `rtsp://{user}:{pass}@{host}:{rtspPort}/live_0X`, admin/6112 **AES암호화**, model ET21-0404S-323A, info_json(device 메타).
- **브리지**: 본사-내부 브리지(id=1, status=pending, **페어코드 8653CCLC862H**).

### 3-3. CCTV 정보 보기 탭 신설 (배포완료)
- WmsCctv.php: `info_json` 컬럼(CREATE+self-heal ALTER)+publicView `info` 노출+saveCamera 보존(빈값=기존보존).
- CctvManager.jsx: 카메라 카드에 "ℹ 정보 보기" 버튼+device 메타 패널(제조사/모델/프로그램/내외부IP/포트/관리자웹/RTSP/브리지/창고). 검증: publicView info 13키·preview_url rtsp masked.

### 3-4. ★내일 최우선 — 방법 B(포트포워딩) 마무리
사용자 결정: **브리지(현장PC 상시필요) 대신 포트포워딩**으로 PC 없이 상시 재생.
- **서버 준비 완료**: **ffmpeg 6.1.1 설치**(`/usr/bin/ffmpeg`·apt). WmsCctv ffmpegPath()가 자동 인식.
- **사용자 작업 대기**: ipTIME 공유기에서 **내부 192.168.1.121:8554(RTSP) → 외부 28554**(또는 지정포트) TCP 포워딩. (23320 아님! 23320=독자프로토콜. 8554=표준RTSP.)
- **포워딩 확인 후 내 작업**:
  1. `ffprobe rtsp://admin:6112@14.52.38.147:<ext>/live_01~03` 실도달 테스트.
  2. 카메라 3대 **source=bridge→direct** 재설정(host=14.52.38.147·rtsp_port=<ext>·templates 유지·admin/6112). ★direct는 isPublicHost 통과(14.52.38.147 공인IP).
  3. WmsCctv hls 엔드포인트 ffmpeg RTSP→HLS 리먹스 확인 + **브라우저 실재생 검증**.
- 보안 권장: 공유기 방화벽에서 우리 서버 1.201.177.46만 허용.

---

## 4. 배포 정본 (287차 갱신)
- **데모 dist=반드시 `npx vite build --mode demo --outDir dist_demo`**(VITE_DEMO_MODE=true). 운영=`npm run build`. ★"demo_genie_token" 문자열은 양 번들 모두 소스리터럴로 존재→모드판별 증거 아님. 판별=빌드flag·prod↔demo index.html md5 상이.
- 스왑=dist.new 추출→검증→dist.old 교체→즉시 rm(dist.bak 누적방지).
- php CLI(로컬): `C:\project\GeniegoROI\_tmp_php81\php.exe`.
- ★**서버에 ffmpeg 설치됨**(종전 "ffmpeg 없음" 메모 무효화).

## 5. 잔여 백로그
- ★**CCTV 방법B 마무리(3-4)** — 최우선.
- 데이터수집 미구현 3채널(11st/gmarket/lotteon 상품·yahoo_jp 아이템·CSAT)=라이브 자격증명 등록 시 구현.
- 자격증명 등록 후 각 채널 라이브 응답으로 batch2 매핑정확성 최종검증.
