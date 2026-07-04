# IntegrationRegistry — 외부 연동 레지스트리 (포인터)

> **정본**: `docs/integrations/`(디렉터리) + `docs/CONNECTOR_EXPANSION_AD_DATASOURCES.md`·`REAL_AD_OAUTH_SETUP.md`·`V394_AMAZON_SPAPI_SETUP.md` + 코드(ChannelCreds/Connectors/AdAdapters) + ChannelRegistry.md.
> 발송 인프라: 메모리 `reference_mail_sms_infra`(Postfix/OpenDKIM·NaverSms SENS).

## 연동 유형(자격증명→자동 sync)
- ad(광고집행/리포팅)·commerce(주문/writeback/정산)·analytics(GA4)·cs(zendesk 등)·esp(mailchimp/klaviyo)·pg(정산)·logistics(추적)·sns_live·review.
- `ChannelCreds::upsert`→유형별 디스패치. 서버전환 CAPI(Meta/TikTok)·오디언스 동기화.

## 외부의존(⏳ 보류·투기 금지)
- 매체 쓰기 OAuth 실키·writeback CREATE 5종·LINE/Kakao delivery·검색SoS harvest·CTV/DSP·영상DCO·SFU·발송 DNS(SPF/DKIM/DMARC)·SOC2/ISO 인증.

## 갱신 규칙
신규 연동/어댑터·자격증명 유형 append. 실키 검증 완료 시 ⏳→✅ 전환 기록.
