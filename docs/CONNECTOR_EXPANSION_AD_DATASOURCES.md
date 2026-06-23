# 커넥터 확장 — 광고/분석 데이터소스 (240차)

> 경쟁 벤치마크 마지막 약점(커넥터 폭, 86→90 목표) 보완. **신규 핸들러 0 · 기존 SSOT 확장(중복0)**.
> 운영(roi.genie-go.com)/데모(roidemo.genie-go.com) 배포·라이브 검증 완료.

## 추가 채널

### 실(REAL) 광고 데이터 커넥터 4종 — 실 fetch 어댑터 구현
저장직후 `syncAdChannelOnSave` + cron 팬아웃 + 수동 sync 자동 편입. 자격증명 등록 시 동작(graceful 드롭인).
실패 시 빈결과 보존(데이터 오염 0). spend/매출은 통화 stamp → `persistMetricRows` 가 KRW 환산.

| 채널 | short | API | 인증 | 통화 |
|---|---|---|---|---|
| Snapchat Ads | `snapchat` | Marketing API `GET /v1/adaccounts/{id}/stats` (일자 timeseries) | Bearer | spend 마이크로÷1e6, cred `currency`(기본 USD) |
| LinkedIn Ads | `linkedin` | `GET /rest/adAnalytics?q=analytics&pivot=CAMPAIGN&timeGranularity=DAILY` | Bearer + `LinkedIn-Version`·`X-Restli-Protocol-Version:2.0.0` | costInLocalCurrency, cred `currency` |
| Criteo | `criteo` | OAuth2(`client_credentials`) 토큰 → `POST /2024-01/statistics/report` | client_id/secret 2단계 | report `currency` 명시 요청 |
| Pinterest Ads | `pinterest` | v5 비동기 리포트(`POST /reports` → 폴링 → 다운로드) | Bearer, 바운드 폴링(최대 3회·미완 graceful) | SPEND_IN_MICRO_DOLLAR÷1e6 |

### 정직 pending 3종 — UI 노출 · `REAL_ADAPTER` 미포함 → "연동 예정"
전용 어댑터 준비 중(기존 PG/물류 stub 정직 패턴). 자격증명 저장은 가능, sync 는 graceful no-op.

- Microsoft Ads (Bing) — Reporting API(SOAP/비동기 bulk) 복잡 → pending
- X (Twitter) Ads — OAuth 1.0a + 비동기 analytics job → pending
- Amazon Ads (Sponsored) — 비동기 리포트(생성→폴링→gzip 다운) → pending

## 와이어링 포인트 (전부 기존 확장)

**백엔드**
- `Connectors.php`: `AD_SHORT`(저장직후·cron·isAdChannel 자동전파) + `runSync` 디스패치 맵 + `fetch{Snapchat,Linkedin,Criteo,Pinterest}Rows()`
- `ChannelRegistry.php`: 시드 7종(신규 DB 한정 — 기존 DB 는 프론트 `CHANNELS` 하드코딩으로 노출)
- `ChannelCreds.php` `hasRealAdapter`: 4 실채널 추가(연결테스트 정직 'stored=ok')

**프론트**
- `ApiKeys.jsx`: `CHANNELS`(global_ad 그룹) + `CHANNEL_FIELDS` + `REAL_ADAPTER`(실 4종만) + `ISSUANCE_URL`/`SIGNUP_URL`
- `channelMeta.js`: `BASE` 표시명/색상(performance_metrics 단축코드 정합)

## 검증

- 프론트 프로덕션·데모 빌드 통과
- 서버 `php -l` 3파일 통과(PHP 8.1.34) · reflection 4 메서드 로드 OK · fpm 재시작
- 운영/데모 health/channels 엔드포인트 라우팅 정상(401/403 — 인증 동작, 500 fatal 0)
- 라이브 데모 `/integration-hub`: 7채널 전부 렌더 · 필드 개수 정확(3/3/3/3/5/4/3) · 신규 콘솔 에러 0

## 외부 의존(F-4, 자격증명 확보 후)

실 광고집행/데이터 수집은 매체별 OAuth 토큰·광고계정 ID 필요. 코드는 완비, 라이브 검증은 실 계정 등록 시.
`docs/REAL_AD_OAUTH_SETUP.md` 런북 참조. pending 3종은 향후 차수에서 어댑터 구현(외부 제약 해소 후).

## 후속 backlog

- GA4 등 분석(비-spend) 데이터소스: 데이터 모델 별도(performance_metrics 부적합) — 별도 분석 오버레이로 후속.
- pending 3종 실 어댑터(Microsoft 비동기 bulk / X OAuth1.0a / Amazon Ads 비동기 리포트).
