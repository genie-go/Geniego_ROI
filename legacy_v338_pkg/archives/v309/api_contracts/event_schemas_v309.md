
# Event Schema (v309)

## commerce.order_event
{
  "event_id": "uuid",
  "tenant_id": "uuid",
  "provider": "coupang|naver|cafe24|...",
  "type": "created|partial_shipped|shipped|cancelled|returned|exchanged",
  "occurred_at": "iso8601",
  "order_id": "string",
  "items": [{"sku":"string","qty":1,"status":"string"}],
  "meta": {"reason_code":"string","reason_text":"string"}
}

## ads.webhook_event
{
  "event_id":"uuid",
  "provider":"meta|tiktok|amazon_ads",
  "type":"campaign_status_changed|budget_spent|...",
  "payload": {}
}
