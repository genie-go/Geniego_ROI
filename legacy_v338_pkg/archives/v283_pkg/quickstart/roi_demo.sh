#!/usr/bin/env bash
set -euo pipefail

# Ingest spend metrics for today (example)
DAY=$(date +%F)

curl -sS -X POST http://localhost:8080/v1/roi/metrics/ads   -H "Content-Type: application/json"   --data-binary @- <<JSON | jq .
{
  "day": "${DAY}",
  "rows": [
    {"channel":"ads","provider":"google_ads","campaign_id":"c1","spend":120000,"impressions":100000,"clicks":2300,"conversions":45,"meta":{"note":"demo"}},
    {"channel":"ads","provider":"meta","campaign_id":"c2","spend":80000,"impressions":70000,"clicks":1500,"conversions":20}
  ]
}
JSON

# Ingest a conversion event
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

curl -sS -X POST http://localhost:8080/v1/roi/conversions   -H "Content-Type: application/json"   --data-binary @- <<JSON | jq .
{
  "events": [
    {"occurred_at":"${NOW}","contact_id":"u-1","revenue":350000,"currency":"KRW","channel":"ads","provider":"google_ads","campaign_id":"c1","meta":{"order_id":"o-100"}}
  ]
}
JSON

# Query summary
curl -sS "http://localhost:8080/v1/roi/summary?from=${DAY}&to=${DAY}" | jq .
