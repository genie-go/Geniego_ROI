# 275차 세션 인계 — 8도메인 전수 초정밀감사 + 2FA Twilio 전용화 + 챗봇 지식 자동화 v2 + 로그인 전면 리디자인

## 0. 개요

사용자 지시 4건을 순차 수행. **전부 데모+운영 배포·브라우저 실검증 완료**. 브랜치 `feat/n236-admin-growth-automation` (master 미접촉).

1. 전체 전수 초정밀 감사(8도메인 병렬) → 확정 결함 17건 수정
2. 2FA 실 SMS를 **Twilio 전용**으로 전환 + 관리자 콘솔 UI 배선
3. 상담 챗봇이 **신규 기능을 자동으로 상세 설명**하도록 지식 파이프라인 v2 재설계
4. 로그인 페이지 **전면 리디자인**(밝은 SaaS 2분할) + PC/모바일 초정밀 반응형

---

## 1. 전수 초정밀 감사 — 확정 결함 17건 (수정·배포 완료 · 재플래그 금지)

8개 도메인 병렬 에이전트(FP 레지스트리 + IMPLEMENTATION_STATUS 주입 · 부재증명 강제) + PM 직접 코드 재증명.

**성숙 확인(확정 결함 0건)**: 채널연동 · 마케팅 실집행 · 오염/격리/보안 · 머니경로 동기화 체인.

### P0 — 운영 기능 사망
- **헤더리스 `getJson` 회귀** (237차 클래스 2차 재발): `DataAssets` / `DataTrustDashboard` / `AgencyAccess` / `RulesEditorV2` 4페이지가 Bearer 없이 세션 인증 EP 호출 → 핸들러 self-auth **401 fail-closed** → 운영에서 조용한 빈 화면. `getJsonAuth as getJson` 별칭으로 수정.
  - **★근본원인 제거**: `tools/guard_headerless_getjson.mjs` 신설(CI 가드). 즉시 에이전트가 놓친 2건(`DashSystem` · `SystemMonitor` 죽은 import) 추가 검출.
  - 라이브 실증: 5개 EP 전부 `노토큰 401 → 토큰 200`.

### P1
- **PM 8테이블 자가치유 부재** — `pm_*` 는 `migrations/20260526_168_00*.sql` 에만 정의. 배포 파이프라인이 `bin/migrate.php` 를 호출하지 않음(grep 0건) → 신규 프로비저닝·DR·SQLite 폴백에서 `/v425/pm/*` 전면 500. **`Migrate::applyFiles()`(additive) + `PM\Shared::ensurePmTables()` 를 `gate()` 초크포인트에 배선**. 대상 DDL 전부 `IF NOT EXISTS` → 라이브 no-op.
- **`authPage.*` 30키 부재** — 애초에 존재한 적 없음(코드가 `t('authPage.x','한글')` 인라인 폴백에 의존) → 관리자 로그인 패널 전체가 14개국 한글 노출. ko/en 정본 추가.

### P2
- **`EventNorm.php` Meta 귀속매출 `spend × 4.18` 상수** — 목 payload 예시값이 프로덕션 규칙에 하드코딩. `ingestRaw` 는 데모 게이트 없음 → 운영 테넌트 도달. `metaAttributedRevenue()` 신설(`action_values` → `purchase_roas × spend` → 0). **데모 payload 가 `purchase_roas=4.18` 이라 데모 산출값 동일 = 회귀 0.**
- **CCTV 73키 + `wms.bins` 2키 + `auth.phoneVerifyRequired`** 백필.
- **`DataPlatform.php:296` 유령 테이블 `security_audit`** (실체 `security_audit_log`) — try/catch 가 예외를 삼켜 신뢰도 지표가 영구 과소.
- **`AuthPage` 모듈레벨 raw 한글** 제거(모든 소비처가 `d.error || t(...)` 패턴 → 번역 폴백 자동 표시).
- **`phoneSendCode` `sent_to`** 를 전 목적 공통 마스킹 반환(기존 `admin_key` 만).
- **죽은 크로스탭 4건**: `ChannelKPI` · `AccountPerformance` 는 실발신자(`genie_connector_sync`)로 **재배선해 살림**. 중복/무주체인 `AIInsights genie_ai_sync` · `DataSchema` 는 제거.
- **`RoiService` 3중 지뢰**: 유령 테이블 `marketing_roi` 자가치유 + MySQL 전용 `ON DUPLICATE KEY` → 드라이버 분기 + `AVG(roi_percent)` 단순평균 → 비율-합 가중.

### P3
- 취소 제외 SSOT 드리프트 5곳(`Connectors` · `Rollup` · `PriceOpt` · `ClaudeAI` · `DemandForecast`) → `OrderHub::observedExclusion()` / `cancelExclusion()` 통일. **`OrderHub::observedExclusion(alias)` 신설**(취소 2축 + 반품 event_type축).
- `OAuth.php` 토큰교환 실패 시 응답 전문 로깅 → `errDigest()` 화이트리스트 메타만.
- `ApiKeys.jsx:325` twitch stale 주석 정정(코드는 정확 — `fetchTwilioStats` 실어댑터 보유).

### 기각(오탐/의도적)
- `recoveryThrottle` 단일 버킷 = **의도적 anti-enumeration 통제**(purpose 분리 시 시도예산 8→40회). 사용자 승인으로 현행 유지.
- `POST /v420/returns/{id}/wms-link` = `wms_linked=1` 플래그만 세움. UI 배선 시 **가짜 버튼 신설**이므로 미배선(실 재입고는 `Wms::reflectChannelRestock`).
- FP 레지스트리 "재플래그 금지" 항목 재보고 0건.

---

## 2. 2FA 실 SMS → Twilio 전용

**Twilio 는 이미 구현·배선돼 있었다**(273차). 실제 갭은 "인증 문자가 두 공급자로 갈릴 수 있음".

- `UserAuth::smsSend()` → `Twilio::sendPlatform()` 전용(SENS 폴백 제거).
- `UserAuth::smsProviderConfigured()` → `Twilio::isConfigured()` 전용.
- 이 두 함수가 인증 SMS 초크포인트 → **로그인 2FA · MFA OTP · 휴대폰 본인인증 · 비밀번호 재설정 4경로**가 한 번에 전환.
- **마케팅/CRM SMS 는 무변경**(`Omnichannel` · `JourneyBuilder` · `Reviews` 는 `NaverSms::sendPlatform` 직접 호출).
- 락아웃 없음: 미설정 시 `smsProviderConfigured=false` → SMS 가 2FA 수단으로 제시되지 않고 **이메일 OTP 자동 전환**(`UserAuth:895`).

### 관리자 콘솔 UI 배선 (신규)
`/auth/admin/twilio` 3개 EP 는 등록돼 있었으나 **프론트 호출자 0건**(SENS 도 동일 — env/DB 로만 설정). `Admin.jsx` → **🤖 AI Engine 탭**의 SMTP 카드 아래 편입(신규 메뉴 0).
- GET 계약이 SMTP 와 다름: `{ok, sid, from, msg_sid, token_set, configured}` **최상위 평면**(SMTP 는 `d.smtp` 중첩).
- Auth Token 은 서버 미반환 → 입력칸 항상 빈값, `token_set` 시 placeholder 만 변경. `autoComplete="new-password"`.
- 클라이언트 선검증(SID 필수 · from|msg_sid 중 하나) 으로 서버 422 이전 차단(실측: POST 미발생).
- `requireMasterAdmin` 게이트(하위관리자 접근 불가).

### ★ 운영/데모 Twilio 현황 (라이브 확인)
```
운영: twilio_sid=set, twilio_token=set, twilio_from=EMPTY, twilio_msg_sid=EMPTY → isConfigured=false
데모: 동일
NaverSms: 운영에 sms_* 키 없음, GENIE_SMS_* env 없음 → isConfigured=false
```
→ **운영은 이번 변경 전에도 이미 SMS 2FA 미제공(전원 이메일 OTP)**. 배포로 인한 후퇴 없음.

**다음 담당자 할 일**: 관리자 콘솔에서 `발신번호(From)` 또는 `Messaging Service SID` 입력 → "테스트 발송" 성공 확인 → SMS 2FA 자동 활성화.
- `from` = Twilio Console → Phone Numbers → Active numbers 의 E.164 번호(`+15551234567`).
- **알파벳 발신자 ID 를 `from` 에 넣으면 안 됨** — `Twilio::send()` 가 `e164()` 로 숫자만 남김(`Twilio.php:40,75-79`). 알파벳 ID 는 Messaging Service 경유 필수.
- `msg_sid` 가 있으면 그쪽 우선(`MessagingServiceSid` 전송, `From` 미전송).
- 한국 수신은 Twilio Geo Permissions(KR) + A2P 규정 확인 필요(외부 의존 · 코드로 검증 불가).

---

## 3. 상담 챗봇 지식 자동화 v2 — "신규 기능을 문서 없이 자동 설명"

### 근본 원인 (v1)
`tools/gen_chatbot_knowledge.mjs` 가 **App.jsx 라우트만** 스캔.
- 페이지 **내부** 기능(WMS 안의 CCTV = `components/CctvManager.jsx`)은 아예 미인지 → "CCTV 설정 진행순서" 답변 불가.
- 잡혀도 `라벨(경로)` 한 줄뿐 → 절차 재료 없음.

### v2 착상
이 저장소는 모든 고객대면 문자열을 i18n 키로 강제한다. **i18n 네임스페이스 = 그 기능의 어휘**.
`wms.cctv.title`=기능명 · `fHost`=필드 · `addBtn`/`saveBtn`=행동 · `testBtn`=검증 · `secNote`=주의 · `statOk`=상태.

### 산출물 2종 (`npm run chatbot:kb` · `deploy.ps1` 훅)
1. `backend/data/chatbot_feature_map.md` — 컴팩트 인덱스(상시 주입) + **페이지 내부 기능 인덱스**(v2 신규)
2. `backend/data/chatbot_feature_details.json` — 128기능 절차 인벤토리(약 190KB). 진입경로·행동·필드·상태·주의·다국어 기능명.
   전량 주입은 토큰 폭증 → **`ClaudeAI::geniegoFeatureDetails()`** 가 결정적(비-AI) 점수화로 상위 3개만 주입. 대화 맥락도 매칭 근거에 포함.

### 재구현 시 반드시 지킬 함정 (전부 실측으로 발견)
- **`{ns}.title` 이 기능명이 아닐 수 있다**: `webPopup.title` = "제목"(팝업 제목 **입력 필드**). 그대로 별칭 쓰면 "제목"이 든 모든 질문에 오매칭. 일반명사(제목/이름/상태/Title…)는 배제하고 **사이드바 메뉴명**으로 폴백.
- **메뉴명 15개국 정본 = `frontend/src/layout/sidebarI18n.js` 의 `D[lang][leafKey]`** (예: `webPopupLabel`). `ko.js` 의 `gNav.webPopupLabel` 은 **존재하지 않는다**(매니페스트 labelKey 와 사전 키가 접두만 다름). `menuLabelI18n.json` 은 별개 구조.
- **문서빈도(df) 필터 필수**: "저장"(11기능) · "취소"(13) · "테스트" · "API" 는 변별력 0 → 매칭 근거에서 제외(df≤3만). 안 하면 "웹 팝업 A/B 테스트"가 '테스트' 버튼 가진 아무 기능에나 걸림.
- **분류는 키 이름만 근거**로. 값의 한글 동사로 판단하면 "복사됨"(토스트) · "등록된 브리지가 없습니다."(빈 상태)가 버튼으로 오분류.
- **라우트 파서는 가드 래퍼를 건너뛸 것**: `element={<AdminRouteGuard><Admin /></AdminRouteGuard>}` → 첫 컴포넌트가 가드. `element={...}` 전체를 떠서 `Guard|Provider|Layout` 접미 · `Require|Protected|With` 접두 스킵. **이걸 안 해서 `/admin` 계열 8개 라우트가 v1 내내 누락**(기능 117 → 128).
- 매칭 = 기능명 전체일치(+6) · 토큰 60% 부분일치(+5) · 경로(+4) · 변별력 어휘(+2), 상위점수 40% 미만 컷.
- 다국어: 기능명 15개국 + 라틴 대문자 토큰(CCTV · RTSP · HLS) → ja/ar 질문도 매칭.

### ★ 자동 확장성 실증
당일 신설한 Twilio 카드가 처음엔 `t()` 없이 하드코딩돼 **챗봇이 0건으로 몰랐다**. i18n 키(`adminSms.*` 18개)로 전환하고 **큐레이션 문서 0줄** 작성한 채 생성기만 재실행 → 챗봇이 진입경로 `/admin`, 4개 필드, "from|msg_sid 중 최소 하나", "알파벳 발신자 ID 주의"까지 정확히 설명.

**→ 앞으로 신규 기능은 i18n 키만 쓰면(이미 저장소 필수 규칙) 챗봇이 자동으로 상세 설명한다.**

라이브 검증(데모): CCTV 진행순서 → 실제 버튼명 · 필드표 · AES-256-GCM 보안안내 · 체크포인트 단계별 답변. ko/ja/en/ar 전부 현지 자연어 + 원문 라벨 괄호 병기. 일반 질문("저장 버튼 어디 있어?")은 매칭 0 → 주입 없음(무회귀).

---

## 4. 로그인 페이지 전면 리디자인

`AuthPage.jsx` — 밝은 SaaS 2분할(Hero 60% + 로그인 카드 40%). 스코프 CSS `GR_CSS`(모든 선택자 `gr-` 접두, `styles.css` 에 `.auth-*` 규칙 전무함을 grep 확인).

### 기능 보존 (전부 유지)
환경 2분기(데모/운영 탭) · MFA/OTP · SSO · 아이디/비밀번호 찾기 · remember-me · 로고 클릭 숨김 admin 진입 · 가입 4모드 · RTL · 약관 모달.

### 변경점
- **STEP1 "로그인 유형 선택" 화면 제거** → 도메인 기준 기본값(`isDemoDomain ? 'demo' : 'production'`) + 환경 전환 탭 상시 노출. 기능 후퇴 없음(가입 진입은 데모카드·푸터에 존재).
- `SSOButtonGroup` 재작성: 위키미디어 **원격 이미지 의존 제거** → 인라인 SVG. 라벨형 버튼. `providers` 배열만 늘리면 확장.
- `Field` 리팩터: 입력 글자색이 `#fff` 라 밝은 카드 위에서 **흰-on-흰**(저장소의 알려진 트랩)이던 것을 잉크색·흰배경·포커스 링으로 재정의.
- 언어 선택기를 카드 **안** 상단 우측으로 이동(과거 카드 밖 absolute → 좁은 화면 모서리 겹침 + 카드가 수직중앙에서 30px 밀림).
- 푸터: 회원가입 · 이용약관 · 개인정보처리방침 · 고객센터(`mailto:etapihelp@gmail.com`) 중앙 대칭 배치.
- 신규 i18n `authHero.*` 34키(ko/en).

### 반응형 — "일반 이상"으로 만든 3가지
1. **중앙 고정 거터**: `padding-inline: max(여백, (100% - 1180px)/2)` → 배경 full-bleed, 내용만 중앙. 2560px 좌우 거터 166px 대칭.
2. **컨테이너 쿼리**: `@container authside` — 카드 내부(환경탭·옵션행·데모카드)가 **뷰포트가 아니라 카드 자기 폭**에 반응. 분할 화면·확대에서도 자연스러움. `@supports not (container-type)` 폴백 포함.
3. **세로 유동 스케일**: 입력/버튼 높이·폼 간격이 `clamp(하한, vh, 상한)`. 하한은 접근성(터치 44px). 1440×900 에서 카드 934→801px.

### 실측으로 잡은 결함 (추측 아님)
- **Hero 유령 스크롤 200px**: `:before{inset:-20%}` 가 스크롤 영역을 부풀림(`overflow-x:clip` 은 세로를 못 자름) → `inset:0` + 그라데이션 반경 확대.
- **카드 자체 스크롤로 "로그인" 제목 잘림**: `max-height+overflow` 제거 → 페이지 스크롤. `align-items:safe center`.
- **Hero 본문이 플로팅 카드와 80px 중첩** → Hero 를 **실제 2열 그리드**로 재구성(절대배치 폐기).
- **한글 어절 중간 끊김**("모든 순 / 간,") → `word-break:keep-all` + `text-wrap:balance`.
- **모바일 체크박스 2px 찌그러짐** → 전역 `styles.css:1275` 의 `input[type=checkbox]{width:auto !important}` 가 `appearance:none` 과 겹침. 페이지 스코프에서만 되돌림.
- **빌드 실패 원인**: `GR_CSS` 는 JS 템플릿 리터럴 → **주석에 백틱을 쓰면 리터럴이 조기 종료**된다.

### 반응형 실측 결과
| 해상도 | Hero 넘침 | 카드 넘침 | 수직 중심오차 | 텍스트 겹침 | 스크롤바 |
|---|---|---|---|---|---|
| 2560×1440 | 0 | 0 | 0px | 없음 | 없음 |
| 1920×1080 | 0 | 0 | 0px | 없음 | 없음 |
| 1600×1000 | 0 | 0 | 0px | 없음 | 없음 |
| 1440×900 | 0 | 0 | 0px | 없음 | 없음 |
| 1366×768 | 96px | 65px | — | 없음 | 없음(숨김 스크롤) |
| 390×844 | — | — | — | 없음 | 가로 0 · 세로 정상 |

1366×768 은 콘텐츠를 자르지 않고는 물리적으로 담기지 않아 **스크롤바만 감추고 스크롤은 유지**(로그인 버튼은 첫 화면 내). 세로 ≤1020px 에서는 바로 위 환경 탭과 정보가 중복되는 환경 배너를 접는다(정보 손실 0).

---

## 5. 검증

- 서버 `php -l` **13/13 PASS**(로컬 PHP 부재 → stdin 전송, 서버 파일시스템 무변경). 운영 배포본 재검증 PASS.
- 프론트 빌드 EXIT=0 (운영 모드 · 데모 모드 각각).
- 운영 빌드 데모 시그니처 **0건**(`VITE_DEMO_MODE:"true"` 미포함) — 혼입 트랩 회피.
- 데모+운영 배포 · 브라우저 실검증(콘솔 에러 0 · 로그인/관리자/데이터자산/챗봇).
- 챗봇 라이브 e2e: CCTV(ko/ja/en/ar) · Twilio(ko/ja/ar) · 로케이션 빈(ko).
- 신규 가드: `node tools/guard_headerless_getjson.mjs` → 위반 0건.

### 백업(롤백 지점)
```
데모: _bak_assets_20260709_153737 / _bak_index_*.html / /root/_bak_demo_be_20260709_153737.tgz
운영: _bak_assets_20260709_173240 / _bak_index_*.html / /root/_bak_prod_be_20260709_173240.tgz
```

---

## 6. 잔여 / 다음 차수 우선순위

1. **운영 Twilio `from` 또는 `msg_sid` 입력** → 테스트 발송 → SMS 2FA 활성화. (관리자 콘솔 → AI Engine 탭)
2. **PM 마이그레이션 훅**: 배포 파이프라인(`deploy.ps1`)에 `php bin/migrate.php run` 추가 검토. 현재는 PM 핸들러 자가치유로만 방어.
3. `authHero.*` / `adminSms.*` / `wms.cctv.*` 를 ko/en 외 13개국으로 번역 병합(현재 en 폴백).
4. 감사 P2 잔여: `POST /v420/returns/{id}/wms-link` 실 재입고 배선(플래그만 세우는 현 구현은 UI 미배선 유지).
5. 로그인 페이지 1366×768 세로 압축(현재 숨김 스크롤).
6. **`GlobalDataProvider` 가 로그인 화면에서도 폴링** → 미인증 401 7건(fail-closed · 무해 · 이번 변경과 무관). 정리 검토.
7. `tools/resolver_consumer_manifest_v2.json` 은 이번 세션 이전부터 변경돼 있던 파일 — 미커밋 유지.

---

## 7. 오탐 방지 메모 (다음 감사 시 주입)

- 채널연동 · 마케팅 실집행 · 오염/격리/보안 · 머니경로 동기화 = **275차에 확정결함 0건 재확인**. 재플래그 금지.
- 위 §1 확정 17건은 **수정 완료** — 재플래그/재구현 금지.
- `recoveryThrottle` 단일 버킷 · `wms-link` 미배선 = **의도적 결정**.
- `AuthPage` 의 `GR_CSS` 는 템플릿 리터럴 — 백틱 금지.
