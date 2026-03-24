# Amazon SP-API MVP Setup (V394)

V394 implements an MVP for Amazon Listings create/update via **SP-API**.

## Required environment variables
Provide these variables to the backend container/process:

### LWA (Login With Amazon)
- `AMZ_LWA_CLIENT_ID`
- `AMZ_LWA_CLIENT_SECRET`
- `AMZ_LWA_REFRESH_TOKEN`

### AWS SigV4
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- (optional) `AWS_SESSION_TOKEN`

### Seller context
- `AMZ_SELLER_ID`
- (optional) `AMZ_MARKETPLACE_ID` (default: `ATVPDKIKX0DER`)

### Endpoint & region
- (optional) `AMZ_SPAPI_ENDPOINT` (default: `https://sellingpartnerapi-na.amazon.com`)
- (optional) `AMZ_SPAPI_REGION` (default: `us-east-1`)

## How to call
Use the existing writeback flow:

1) Enqueue a job (example payload)
```
POST /v394/writeback/enqueue
{
  "channel": "amazon",
  "action": "listing_upsert",
  "payload": {
    "sku": "TEST-SKU-001",
    "productType": "PRODUCT",
    "attributes": {
      "item_name": [{"value":"Test Product","language_tag":"en_US"}],
      "brand": [{"value":"TestBrand","language_tag":"en_US"}]
    }
  }
}
```

2) Execute once
```
POST /v394/worker/run-once
{ "job_id": "<returned job_id>" }
```

## Notes
- This is an MVP: it supports **Listings Items PUT** (create/update) and standard retry is handled at HTTP client level.
- Template v2 validation still runs before calling SP-API to reduce rejects.
