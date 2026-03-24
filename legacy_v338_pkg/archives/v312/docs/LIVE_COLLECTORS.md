# LIVE Collectors (V289)

V289 includes production-ready *templates* for LIVE collectors. You provide credentials in `connector_accounts.auth_json`
and set `DRY_RUN=false` in collectors.

## Auth JSON examples

### Google Ads (OAuth2)
```json
{"type":"oauth2","client_id":"...","client_secret":"...","refresh_token":"...","developer_token":"...","login_customer_id":"..."}
```

### Meta Ads (OAuth2)
```json
{"type":"oauth2","app_id":"...","app_secret":"...","access_token":"..."}
```

### TikTok Ads (OAuth2)
```json
{"type":"oauth2","app_id":"...","app_secret":"...","refresh_token":"..."}
```

### Amazon Ads (OAuth2 + profile scope)
```json
{"type":"oauth2","client_id":"...","client_secret":"...","refresh_token":"...","region":"na","profile_id":"..."}
```

### Naver SA (Signature)
```json
{"type":"signed","api_key":"...","secret_key":"...","customer_id":"..."}
```

### Kakao Moment (OAuth2)
```json
{"type":"oauth2","client_id":"...","client_secret":"...","refresh_token":"..."}
```

## Rate limits

Set per tenant/provider via:
- `POST /v1/providers/rate_limits` with `{"provider":"meta_ads","limits":{"rps":10,"burst":20,"max_retries":6}}`

Collectors enforce token-bucket limits and retry with exponential backoff + jitter.

## Checkpoints

Collectors store a cursor per (tenant, provider, account_id) in `collector_checkpoints`.
Cursor is advanced only after successful ingest of metrics.
