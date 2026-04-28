#!/usr/bin/env bash
set -euo pipefail

# V287 demo: bootstrap -> create segment -> create templates -> render preview -> create campaign -> send -> ingest webhook -> link attribution -> ROI summary

API=${API:-http://localhost:8080}
TENANT=${TENANT:-demo}
ADMIN_KEY=${ADMIN_KEY:-}

if [ -z "${ADMIN_KEY}" ]; then
  echo "Bootstrap admin..."
  ADMIN_KEY=$(curl -sS -X POST "$API/v1/bootstrap" -H "X-Tenant-ID: $TENANT" | jq -r .api_key)
  echo "ADMIN_KEY=$ADMIN_KEY"
fi

H=(-H "X-Tenant-ID: $TENANT" -H "X-API-Key: $ADMIN_KEY" -H "Content-Type: application/json")

echo "Create segment..."
SEG=$(curl -sS -X POST "$API/v1/segments" "${H[@]}" -d '{
  "name":"HighIntent",
  "definition":{
    "op":"OR",
    "conditions":[
      {"field":"attrs.intent","operator":"EQ","value":"high"},
      {"field":"attrs.cart_value","operator":"GTE","value":100}
    ],
    "event_conditions":[{"event_type":"product_view","within_days":7}]
  }
}' | jq -r .segment_id)
echo "SEG=$SEG"

echo "Create templates..."
TA=$(curl -sS -X POST "$API/v1/templates" "${H[@]}" -d '{
  "template_id":"welcome_a",
  "subject":"Hi {{upper .email}}",
  "body":"Hello {{default "friend" .attrs.name}}, your cart is {{.attrs.cart_value}}."
}' | jq -r .template_id)

TB=$(curl -sS -X POST "$API/v1/templates" "${H[@]}" -d '{
  "template_id":"welcome_b",
  "subject":"Welcome, {{default "there" .attrs.name}}",
  "body":"We saved items for you. Use code {{default "GENIE" .attrs.coupon}}."
}' | jq -r .template_id)

echo "Render preview..."
curl -sS -X POST "$API/v1/templates/$TA/render" "${H[@]}" -d '{
  "contact":{"contact_id":"c1","email":"a@b.com","attributes":{"name":"minsu","cart_value":120}}
}' | jq .

echo "Create campaign and trigger..."
CID="camp_$(date +%s)"
curl -sS -X POST "$API/v1/email/campaigns" "${H[@]}" -d "{
  "campaign_id":"$CID",
  "name":"Welcome AB",
  "segment_id":"$SEG",
  "template_a":"$TA",
  "template_b":"$TB",
  "holdout_pct":10,
  "provider":"ses",
  "from_email":"no-reply@example.com"
}" | jq .

curl -sS -X POST "$API/v1/campaigns/$CID/triggers" "${H[@]}" -d '{
  "event_type":"signup",
  "within_minutes":60,
  "enabled":true
}' | jq .

echo "Send (dry-run unless SES configured)..."
curl -sS -X POST "$API/v1/email/campaigns/$CID/send" "${H[@]}" -d '{"max_recipients":50}' | jq .

echo "Ingest a webhook event (simulated OPEN)..."
curl -sS -X POST "$API/v1/webhooks/email" "${H[@]}" -d "{
  "provider":"ses",
  "event_id":"evt_$(date +%s)",
  "message_id":"msg_1",
  "campaign_id":"$CID",
  "contact_id":"c1",
  "event_type":"OPEN",
  "meta": {"user_agent":"demo"}
}" | jq .

echo "Link attribution for a conversion..."
curl -sS -X POST "$API/v1/attribution/link" "${H[@]}" -d "{
  \"conversion_id\":\"conv_1\",
  \"contact_id\":\"c1\",
  \"lookback_days\":7
}" | jq .

echo "ROI summary..."
curl -sS "$API/v1/roi/summary?from=2026-02-01&to=2026-02-28" -H "X-Tenant-ID: $TENANT" -H "X-API-Key: $ADMIN_KEY" | jq .
