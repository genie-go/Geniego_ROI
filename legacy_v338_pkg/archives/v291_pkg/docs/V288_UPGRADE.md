# GENIE_ROI V288 Upgrade

V288 adds:

- LIVE-ready collectors: provider priority includes Google/Meta/TikTok + KR (Naver/Kakao), with incremental checkpoints and exponential backoff.
- Provider email webhooks ingestion -> normalized message events.
- Attribution linking (last-touch) to connect conversions to message touchpoints.
- Influencer & product intelligence:
  - CRUD for influencers/products
  - Ingest influencer/channel and influencer/product stats
  - Recommendations: best influencer+channel for a given product, based on ROAS/CVR/ENG composite scoring.

## Key Endpoints

- Checkpoints
  - `GET /v1/collectors/checkpoints/:provider/:account`
  - `POST /v1/collectors/checkpoints/:provider/:account`

- Email Webhooks
  - `POST /v1/webhooks/email` (optional `WEBHOOK_SECRET`)

- Message Events
  - stored in `message_events` for OPEN/CLICK/BOUNCE/DELIVERED etc.

- Attribution
  - `POST /v1/attribution/link`

- Influencers / Products
  - `POST /v1/influencers`, `GET /v1/influencers`
  - `POST /v1/products`, `GET /v1/products`

- Stats ingest
  - `POST /v1/influencers/stats/ingest`
  - `POST /v1/influencers/products/stats/ingest`

- Recommendations
  - `GET /v1/recommendations/influencers?product_id=<uuid>&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10`

## UI
Dashboard includes new tabs:
- Influencers
- Products
- Recommendations
