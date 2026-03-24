# V289 Upgrade Summary

V289 focuses on "true 9.3~9.6 lock-in" by closing remaining enterprise gaps:

1) **LIVE collector implementation templates** for Google/Meta/TikTok/Amazon Ads/Naver/Kakao:
   - OAuth2 / signature scaffolds
   - per-provider rate limiting
   - exponential backoff + jitter retries
   - checkpoint-safe incremental collection (commit cursor only after successful ingest)

2) **Influencer recommendation v2**: recommendations now incorporate:
   - product attributes (categories, price, margin, tags)
   - channel traits (price bands, content type suitability, category affinity)
   - influencer profile (content types, channels, audience)
   - plus historical performance (ROAS/CVR/ENG)

3) **API + UI additions**
   - Channel traits management
   - Provider rate-limit management
   - Recommendation evidence expanded (fit factors + performance factors)

See `docs/LIVE_COLLECTORS.md` for provider templates and environment variables.
