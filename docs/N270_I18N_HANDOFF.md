# 270차 세션 인계서 — 전면 15개국 현지화 + 3개 신규 기능

> 브랜치: `feat/n236-admin-growth-automation` (master 미접촉·미배포). 운영+데모 dist/백엔드 수동 배포 완료.
> 자동번역: 실 Claude API(app_setting `claude_api_key`) 사용. 자격증명 평문노출 금지.

## 1. 이번 세션 성과 요약

### A. 15개국 현지화 — "완벽 15개국 현지 자연어" 전면 추진
번역 대상을 **범주별로 근본 해결**하고, 신규 추가분이 자동 15국화되는 **파이프라인**을 구축.

| 범주 | 해결 방식 | 커밋 |
|---|---|---|
| ko.js 미번역 레거시 ~33k키 | 오버레이 백필(Claude 13국) | 7e488484446 |
| 신규 UI 자동 15국화 파이프라인 | `tools/i18n_autofill.mjs`(default) + deploy.ps1 훅 | dbed1cd33c0 |
| 사이드바(sidebarI18n) | autofill `AUTOFILL_TARGET=sidebar` | fbc79165735 |
| **백엔드 생성 문자열**(이상감지·컴플라이언스·추천사유 등) | **`backend/src/I18n.php` 계층**(X-Lang) + `backend/data/backend_i18n.json` + autofill `backend` 모드. 78건/7핸들러 마이그레이션 | b6fec471dba, 0859be03a02 |
| **전역 X-Lang 전송** | `frontend/src/xlangFetch.js`(fetch 인터셉터) — raw fetch 페이지도 X-Lang 전송 | 0859be03a02 |
| 인라인 한글폴백+ko부재(146) / 영어폴백+ko부재(71) | autofill `inline` 모드(소스언어 verbatim+14국·ko회귀 방지) | 85bb07da39f, b1c08537cd1 |
| 고객대면 raw 리터럴(t()미사용) 1차 6파일 | 병렬 에이전트 → t()화 → inline autofill | 63cac342b54 |
| 고객대면 raw 리터럴 2차 8파일 | 병렬 에이전트(PaymentMethods·PgConfig·AuthPage·DigitalShelf·JourneyCanvas·PlanGate·LicenseActivation·Attribution) | 92d43026f4d |
| **동적키 사각지대**(모듈상수 labelKey/lk·계산키) | inline에 dotted labelKey 추출 추가 + `tools/fill_overlay_supplement.mjs` | 92d43026f4d |
| 연동허브 전 채널 필드라벨·발급안내(191키) | 파생키 `t('ak.field.'+ch+'.'+fk)`·`t('ak.note.'+ch)` + `tools/gen_channel_i18n_overlay.mjs` | 6fdc9450d15 |
| 그립(Grip) 채널+필드+발급매뉴얼(15국) | CHANNELS/CHANNEL_FIELDS/APPLY_NOTE + MANUAL_KEYS + issuanceGuide 15파일 + 매뉴얼 HTML | 3652655bfd9, d6fa367be19, 5a17c55a0f5 |
| 발급 매뉴얼 전 64채널×15국 | ga4 갭 수정(google_analytics.html→ga4.html) | 6fdc9450d15, 93b59969dc2 |

**라이브 검증(데모 ja/ar)**: 이상감지·Audit(컴플라이언스)·AutoMarketing·RulesEditorV2·사이드바·AI Agent모드 / 연동허브 6채널 등록모달(YouTube·Meta Ads·TikTok Business·Google Ads·Naver·Coupang) 전부 현지어·한글누출0. 발급매뉴얼 15국 HTTP 200.

### B. 신규 기능 3건
1. **무료 체험 데모 회원가입 → 무조건 PRO 메뉴접근**(5c0378fc398): register() 에서 free/미선택 가입을 pro 20일 체험으로 승격(만료 시 resolveActivePlan 이 free 자동강등·누수없음). 라이브: register API plan='pro'.
2. **그립(Grip) 라이브커머스 채널**(3652655bfd9 등): 연동허브 SNS라이브 그룹·파트너 API 키+셀러ID·발급매뉴얼 15국.
3. **이익 효율 프론티어·오토파일럿**(f0e8edf8eb9, d2a7f95fdf8): 이전 파트.

## 2. 핵심 메커니즘(정본)

- **`tools/i18n_autofill.mjs`** — 4모드: default(ko.js), `AUTOFILL_TARGET=sidebar|backend|inline`. deploy.ps1 이 전부 실행(CLAUDE_API_KEY 설정 시). inline은 t('key','fb') 정적 + dotted labelKey 추출.
- **`tools/gen_channel_i18n_overlay.mjs`** — 연동허브 채널 필드/안내 추출·번역·오버레이.
- **`tools/fill_overlay_supplement.mjs`** — 동적키 명시 보충(계산키·no-dot lk 등).
- **`backend/src/I18n.php`** — 서버 문자열 X-Lang 현지화. 신규 서버 문자열은 `ak/anom/...` 코드로 `I18n::t()` 쓰고 backend_i18n.json ko 추가 → `AUTOFILL_TARGET=backend`.
- **`frontend/src/xlangFetch.js`** — 전역 X-Lang 주입(main.jsx 최상단).
- **오버레이** `frontend/src/i18n/autofill.json` — 1MB base 로케일 미접촉, gap을 현지어로 메움(로더 base→오버레이→en).

## 3. ★잔여 작업(다음 세션)

### 프론트 raw 리터럴 — 고객대면 ~62파일 잔여
1·2차로 14파일 완료. 재스캔:
```
cd frontend/src && node --input-type=module -e '...'(세션 로그 참조) # 남은 고객대면 파일 목록
```
상위 잔여: `AiDesignChat`·`OnboardingGuide`·`RoleViewBar`·`MarketingAIPanel`·`JourneyBuilder`·`InstagramDM`·`SmsMarketing`·`TeamMembers`·`CreativeStudioTab`·`InfluencerAIPanel`·`AiDesignEngine`·`InstagramDM` 등 + data/util 파일(aiDesignSamples·channelMeta·teamApi·onboarding_tour_i18n — 데이터성은 판단 필요).
**방법**: 병렬 에이전트(파일당 1) → `t('<ns>.<key>', '한글')` 인라인폴백 → `AUTOFILL_TARGET=inline` 자동번역 → 배포. 동적키(모듈상수)는 dotted labelKey 또는 fill_overlay_supplement 보충.

### 백엔드 서버 문자열 — 렌더되는 것 ~280건 잔여
78건 완료. grep `'reason'=>'..한글..'` 류 ~294건/40핸들러 중 렌더분(ChannelSync·PgSettlement·AutoRecommend 잔여·JourneyBuilder 등) 을 `I18n::t` 로. 고아/외부발송(CustomerAI·ModelMonitor·Alerting)은 렌더0=대상아님.

### 검증 주의
- **char-count만으로 "완벽" 단정 금지** — 한글이 데모데이터인지 UI인지, 프론트조합인지 백엔드생성인지 확인.
- 채널 등록모달은 **카드 아닌 [등록]버튼(onConnect)** 이 연다. 등록된 채널은 [관리]버튼.
- 데모 세션 만료 시 /login → "데모 로그인"(email/password 폼).

## 4. 이번 세션 커밋(feat/n236, 최신순)
92d43026f4d · 93b59969dc2 · 6fdc9450d15 · 5a17c55a0f5 · d6fa367be19 · 3652655bfd9 · 5c0378fc398 · 63cac342b54 · b1c08537cd1 · 85bb07da39f · 0859be03a02 · b6fec471dba · 7e488484446 · fbc79165735 · dbed1cd33c0 · 59e9108ce99 · 82e3833b228 · acf25e089f5 · d2a7f95fdf8 · f0e8edf8eb9 · 7a7617e909b · 33ce1025da4
