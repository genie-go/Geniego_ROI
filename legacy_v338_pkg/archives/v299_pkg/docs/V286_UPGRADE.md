# GENIE_ROI V286 (Full Extended) Upgrade

## What changed (V285 -> V286)
V286 focuses on **making the platform “hard to leave” (target retention 9/10)** by closing the practical gaps vs. MA suites:

1. **Segment builder UX + OR logic**
   - UI provides a rule builder.
   - Backend segmentation now supports:
     - V285 format: `filters[] + event`
     - V286 format: `op (AND/OR) + conditions[] + event_conditions[]`

2. **Templates: personalization + safe rendering**
   - CRUD: `/v1/templates`
   - Render preview: `POST /v1/templates/:id/render`
   - Go `text/template` with safe helpers: `default`, `upper`, `lower`, `urlquery`

3. **Email campaigns: A/B + HOLDOUT (message experiment)**
   - `POST /v1/email/campaigns/send`
   - Sends to a computed segment, assigns A/B/HOLDOUT deterministically.
   - Enforces consent + daily frequency caps (policy-driven).

4. **Collectors: priority-ready providers**
   - Existing: Google Ads, Meta
   - Added: Naver SA, Kakao Moment (safe DRY_RUN by default)

## Connector priority (recommended)
1) Google Ads  
2) Meta (Facebook/Instagram)  
3) Naver Search Ads (KR)  
4) Kakao Moment (KR)

## Quick start
1. Apply migrations (includes `0005_v286_lockin.sql`).
2. Start stack:
   - `docker compose up --build`
3. Open dashboard:
   - `http://localhost:3000`

## Notes for real integrations
- Provider collectors are **DRY_RUN by default**.
- To integrate live APIs, extend collectors with:
  - OAuth / signatures
  - rate-limit backoff
  - paging + checkpoint
  - mapping to `POST /v1/roi/metrics/ads`
