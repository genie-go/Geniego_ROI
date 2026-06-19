# AD_EXECUTION_GOLIVE_CHECKLIST — 실 광고 집행 활성화 체크리스트

> Track B. 정밀감사 결과: **백엔드 집행·측정·최적화·정산 코드 + 안전장치는 production-grade로 실재**.
> 남은 건 "코드 완성도"가 아니라 **운영 배선 + 자격증명/인가/결제 설정**이다. 아래만 갖추면 Meta/Google은 바로 집행 가능.

## 0. 현재 상태 (2026-06-19 운영 DB 실측)

| 항목 | 상태 | 비고 |
|---|---|---|
| cron(수집·토큰갱신·최적화·정산) | ✅ **등록·실행 중** | `install_crontab.sh` 로 코드화. conn_sync/oauth_refresh/optimize 매시 실행 검증 |
| AI(Claude) 키 | ✅ 설정됨 | `app_setting.claude_api_key` set — AI 추천/분석 실동작 |
| billing/payment 테이블 | ✅ 존재 | `billing_method`, `payment_history` |
| 광고채널 자격증명 | ❌ **0건** | meta/google/tiktok/naver/kakao/line 미연동 |
| OAuth 앱 client_id/secret | ❌ **0건** | OAuth 인가의 전제 — 미설정 시 OAuth 자체 비작동 |

## 1. 사용자/관리자 액션 (순서대로)

### STEP 1 — OAuth 앱 등록 (admin, 1회) ★최우선
각 매체 개발자 콘솔에서 OAuth 앱을 만들고 client_id/secret 을 플랫폼에 등록.
- 위치: Topbar 프로필 → AI/이메일 설정 → OAuth, 또는 `/integration-hub`
- 백엔드: `POST /v425/admin/oauth/{provider}/config` (provider: google/meta/tiktok/kakao/naver)
- 콘솔: Google `console.cloud.google.com` · Meta `developers.facebook.com/apps` · TikTok `business-api.tiktok.com/portal` · Kakao `developers.kakao.com` · Naver `developers.naver.com`
- ★백엔드 OAuth scope 는 이미 write: Google `adwords`, Meta `ads_management,business_management` (집행 권한 포함). 콘솔 앱에서 동일 scope 승인 설정 필요.

### STEP 2 — OAuth 인가 (광고 관리 권한 동의)
- 위치: `/integration-hub` 또는 Topbar OAuth 버튼 → 각 매체 "연결" → 동의화면에서 **광고 관리 권한** 부여.
- 결과: access/refresh token 저장 → `oauth_refresh_cron` 이 만료 전 자동 갱신(집행 401 방지).

### STEP 3 — 잔여 자격증명 입력 (게재 식별자)
OAuth 토큰만으로 부족한 게재용 ID 를 ConnectModal 에 입력:
- Meta: `ad_account_id`, `page_id`
- Google: `customer_id`
- TikTok: `advertiser_id`
- Naver SA: `customer_id`, 비즈채널 `channel_id`
- Kakao Moment: `ad_account_id`

### STEP 4 — 광고비 결제수단(카드) 등록 ★집행 활성화 게이트
- 위치: `/payment-methods`
- 미등록 시 캠페인 **활성화(active 전환)가 402 billing_required 로 차단**됨(안전장치). 등록해야 실집행·실청구 가능.
- 관리형 지출 월렛: 월 예산 초과 불가 캡(Toss 빌링키 실청구).

### STEP 5 — (선택) 크리에이티브
- 크리에이티브 스튜디오(`/ai-design` 등)에서 채널별 디자인 저장 → launch 시 design_ids 연결.
- 현재 완전 게재: Meta/Google/Naver(ad 까지). 부분: TikTok(영상 video_id 업로드 미구현)·Kakao/LINE(캠페인까지).

## 2. 집행 안전장치 (코드에 이미 구현 — 안심)

1. **자격증명 게이트**: 미등록 채널은 `no_credentials`, 실 API 미호출.
2. **PAUSED 기본생성**: 모든 캠페인 PAUSED/OFF 로만 생성. 옵티마이저는 **절대 자동 활성화 안 함**(human-in-loop).
3. **활성화 하드게이트**: active 전환 시 결제수단 필수(402) + 킬스위치 검사.
4. **긴급 킬스위치**: env `AD_EXECUTION_DISABLED=1` 전역차단 + UI `pause-all`(전체 긴급정지).
5. **데모 격리**: 데모 테넌트는 실 매체 push 절대 금지.
6. **월 예산 cap**: 관리형 지출 월 예산 초과 불가 + env `AD_TENANT_MONTHLY_CAP`.

## 3. 자동화 두뇌 (실측 기반 — 가짜 아님)

- **AutoRecommend**: 다목표(ROAS/CAC/성장/균형) + 경험적 베이즈 신뢰도 + UCB bandit 탐색 + 가드레일. 실측(performance_metrics) 쌓이면 벤치마크→실측 자동 블렌딩.
- **AutoCampaign 옵티마이저**: 14일 성과 → ROAS 가중 재배분 + 이상감지 자동정지 + 월 예산 페이싱 + **진실 ROAS 보정**(매체 과대보고를 주문귀속 매출로 클램프).
- **A/B 베이지안**: P(best)≥0.95 에서만 승자 확정.
- **측정 닫힌 루프**: connectors_sync 가 매시 Meta(ad단위)/Google(GAQL)/TikTok/Naver/Kakao/LINE 실 fetch → performance_metrics 적재 → 옵티마이저가 동일 테이블 소비.

→ **STEP 1~4 완료 시점부터** 자동화 두뇌가 실측으로 동작하기 시작.

## 4. 매체별 실집행 성숙도 (현재 코드)

| 매체 | 캠페인/예산/정지 | 게재(adset/ad) | 측정 ingest | 라이브검증 |
|---|---|---|---|---|
| Meta | ✅ | ✅ (이미지 업로드 포함) | ✅ | ⚠️ 0(첫 실키 권장) |
| Google Ads | ✅ | ✅ (RSA 반응형검색) | ✅ | ⚠️ 0 |
| Naver SA | ✅ | ✅ (텍스트광고) | ✅ | ⚠️ 0 |
| TikTok | ✅ | △ (adgroup; ad는 영상필요) | ✅ | ⚠️ 0 |
| Kakao Moment | ✅ | △ (캠페인까지) | ✅ | ⚠️ 0 |
| LINE Ads | ✅ | △ | ✅ | ⚠️ **엔드포인트 경로 미확정 — 첫 실집행 시 검증 필요** |

→ **권장 집행 순서: Meta → Google → Naver**(가장 완성·안전) → TikTok/Kakao/LINE.

## 5. 잔여 코드 고도화 (후속, 비차단)

- 크리에이티브 딜리버리: TikTok 영상 업로드(video_id), Kakao/LINE 하위 ad, SVG→PNG 서버 래스터화.
- 매체 확장: X(Twitter)/LinkedIn/Amazon Ads/Apple Search/Microsoft.
- cron 헬스 모니터링 UI(실행/실패/토큰만료 알림 가시화).
- 타겟팅: geo=KR 고정 → 관심사/연령/리타겟팅 launch 파라미터화.

---

**요약**: 코드·인프라(cron 포함)는 ready. **STEP 1(OAuth 앱) → 2(인가) → 3(게재ID) → 4(결제수단)** 만 완료하면 Meta/Google 실 광고 집행이 즉시 가능합니다. 안전장치가 은행급으로 설계돼 있어 실수 집행/과지출은 다중 게이트로 차단됩니다.
