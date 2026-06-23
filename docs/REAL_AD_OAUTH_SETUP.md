# 실 광고 집행 OAuth/자격증명 셋업 런북 (239차)

GeniegoROI로 **실제 광고를 집행**하기 위한 매체별 자격증명 등록 가이드. 코드(`AdAdapters.php`/`Connectors.php`/`OAuth.php`)가 실제로 읽는 키 이름·스코프·엔드포인트 기준(검증됨). 코드 경로는 전부 완비 — **아래 외부 등록만 하면 즉시 실집행**.

## 구조 — 2개 레이어
1. **앱 레이어(1회)**: GeniegoROI가 각 매체에 등록한 OAuth 앱의 `client_id/secret`.
   - 설정: env `OAUTH_{PROVIDER}_CLIENT_ID` / `OAUTH_{PROVIDER}_SECRET`, 또는 admin `POST /v425/admin/oauth/{provider}/config`(app_setting 암호화 저장).
   - 공통: `OAUTH_BASE_URL`(콜백 리다이렉트 도메인, 예: `https://roi.genie-go.com`).
   - 미설정 시 authorize가 `configured=false`로 inert(안전).
2. **테넌트 레이어(계정별)**: 실제 광고계정 토큰.
   - 경로 A(OAuth): 연동 허브 → 매체 연결 → `/v425/oauth/{provider}/authorize` → 매체 로그인·동의 → 콜백이 토큰 저장.
   - 경로 B(수동키): 연동 허브 ConnectModal에서 아래 키를 직접 입력(장기 토큰/HMAC 키 보유 시).

## 우선순위
**① Meta · ② Google** = ad-level 풀스택(캠페인→광고세트→광고+소재) 완비 → 가장 먼저. **③ TikTok · ④ Kakao · ⑤ Naver SA · ⑥ LINE** = campaign~adgroup 완비, ad-level은 소재/일부 ID 추가 입력.

---

## 매체별 등록

### ① Meta (Facebook/Instagram Ads) — OAuth provider `meta`
- **등록처**: developers.facebook.com → 앱 생성(Business 유형) → Marketing API 추가.
- **스코프**: `ads_management,business_management` (코드 고정).
- **리다이렉트 URI**: `{OAUTH_BASE_URL}/v425/oauth/meta/callback` 화이트리스트.
- **앱심사**: ads_management 표준 액세스는 앱 리뷰 필요(개발 모드는 앱 관리자 계정만).
- **GeniegoROI 입력 키**(channel=`meta_ads`): `access_token`, `ad_account_id`, `page_id`(ad-level 소재용).

### ② Google Ads — OAuth provider `google`
- **등록처**: Google Cloud Console OAuth 클라이언트 + **Google Ads API developer token**(ads.google.com → API Center, 신청·승인 필요).
- **스코프**: `https://www.googleapis.com/auth/adwords` (`access_type=offline`→refresh_token 자동).
- **리다이렉트 URI**: `{OAUTH_BASE_URL}/v425/oauth/google/callback`.
- **GeniegoROI 입력 키**(channel=`google_ads`): `developer_token`, `access_token`, `customer_id`(하이픈 무관, 코드가 제거).
- ★developer_token 미보유 시 집행/성과수집 모두 no_credentials(가장 흔한 막힘 지점).

### ③ TikTok Ads — OAuth provider `tiktok` (dialect tiktok_marketing)
- **등록처**: business-api.tiktok.com → 앱 생성. (표준 OAuth2와 달리 app_id 기반)
- **GeniegoROI 입력 키**(channel=`tiktok_business`): `access_token`, `advertiser_id`.
- ad-level 광고는 **영상 소재(video_id)+identity** 추가 필요(adgroup까지는 키만으로 완비).

### ④ Kakao Moment — OAuth provider `kakao`
- **등록처**: developers.kakao.com → 앱 → 카카오모먼트 권한.
- **GeniegoROI 입력 키**(channel=`kakao_moment`): `access_token`, `ad_account_id`(또는 `account_id`).

### ⑤ Naver 검색광고(SA) — 수동키(HMAC, OAuth 아님)
- **등록처**: searchad.naver.com → 도구 → API 사용 관리 → 라이선스 발급.
- **GeniegoROI 입력 키**(channel=`naver_sa`): `api_key`, `api_secret`, `customer_id`, `channel_id`(비즈채널 — ad-level용).

### ⑥ LINE Ads — 수동키(JWS HMAC, OAuth 아님)
- **등록처**: LINE Ads Platform → API 액세스 키 발급.
- **GeniegoROI 입력 키**(channel=`line_ads`): `access_key`, `secret_key`, `group_id`, **`currency`**(과금통화 JPY/THB/TWD — 미입력 시 JPY 기본, KRW 오적재 방지 — 239차 P1).

---

## 자격증명 키 요약표
| 매체 | channel | 필수 키 | 방식 |
|---|---|---|---|
| Meta | `meta_ads` | access_token · ad_account_id · (page_id) | OAuth/수동 |
| Google | `google_ads` | developer_token · access_token · customer_id | OAuth+devtoken |
| TikTok | `tiktok_business` | access_token · advertiser_id | OAuth |
| Kakao | `kakao_moment` | access_token · ad_account_id | OAuth/수동 |
| Naver SA | `naver_sa` | api_key · api_secret · customer_id · (channel_id) | 수동 HMAC |
| LINE | `line_ads` | access_key · secret_key · group_id · currency | 수동 HMAC |

## 등록 후 자동 동작 (코드 완비 — 추가 작업 불요)
1. 자격증명 저장 즉시 백엔드 자동 sync(`ChannelCreds::upsert`) → 성과수집(`performance_metrics`)·다통화 KRW 정규화.
2. 캠페인 생성은 **PAUSED**(무지출 안전) → 연동 허브/캠페인에서 사람이 검토 후 **활성화**(결제수단 등록 게이트 402).
3. cron(connectors_sync */N·oauth_refresh 매시·optimize)이 성과수집·토큰갱신·자동최적화 수행(운영 crontab 등록 확인됨).
4. 진실 ROAS(실주문 귀속)로 추천·재배분 자동 보정.

## 검증 방법
- 연동 허브에서 매체 상태 `ok` 확인(`GET /api/channel-sync/status` 또는 connectors summary).
- 소액 테스트 캠페인 생성 → PAUSED 확인 → 매체 비즈센터에서 광고 객체 생성 확인 → 활성화 → 성과 적재(다음 cron) 확인.
- 결제수단 미등록 시 활성화가 402(billing_required)로 안전 차단됨.

---
(★실제 매체 등록·앱심사는 사용자 외부 액션. GeniegoROI 코드 경로는 전부 완비됨 — 본 가이드대로 키 입력 시 즉시 실집행. 자격증명 평문은 app_setting/channel_credential에 AES-256-GCM 암호화 저장.)
