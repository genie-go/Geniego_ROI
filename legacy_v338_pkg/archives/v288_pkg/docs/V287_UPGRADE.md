# GENIE_ROI V287 Upgrade (Enterprise Lock‑in)

V287 closes the remaining “daily operator UX + real-world measurement loop” gaps by adding:

## 1) Live collection readiness (Google/Meta/Naver/Kakao)
- Collector checkpoints table (`collector_checkpoints`) to support incremental sync.
- Connector accounts continue to drive which providers run.
- Providers implemented as plugins; "LIVE" mode is environment‑gated (safe by default).

## 2) Provider webhooks + message events
- Webhook ingestion endpoints store raw payloads for audit (`provider_webhook_events`)
- Normalized message events table (`message_events`) for opens/clicks/bounces/complaints.

## 3) Attribution links
- `attribution_links` connects conversions to last-touch (extensible to other models).
- Enables campaign/experiment revenue attribution and lift dashboards.

## 4) Event-triggered campaigns
- `campaign_triggers` allows “send on event within X minutes” patterns.

## 5) UI upgrades (operators)
- Segment rule builder (AND/OR groups) + event conditions.
- Template editor with variable browser + preview render.
- Campaign send screen with A/B + holdout configuration.

See `quickstart/v287_demo.sh` for an end-to-end walkthrough.
