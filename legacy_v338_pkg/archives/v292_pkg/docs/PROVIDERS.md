# V282 Provider Implementations

## Email
### Amazon SES (provider=ses)
- Uses AWS SDK v3 `@aws-sdk/client-ses`
- Supports `EMAIL_SEND` action
- Returns evidence: SES MessageId
- Rollback: not supported (email is non-reversible)

### SendGrid (provider=sendgrid)
- Uses `@sendgrid/mail`
- Supports `EMAIL_SEND`
- Returns evidence: response metadata / message id (when available)
- Rollback: not supported

## CRM
### HubSpot (provider=hubspot)
- Uses `@hubspot/api-client`
- Supports `CRM_UPSERT_CONTACT`, `CRM_BULK_UPDATE`
- Snapshot: reads existing contact properties before update
- Rollback: best-effort restore snapshot

## Ads
### Google Ads (provider=google_ads)
- Uses `google-ads-api`
- Supports `ADS_BUDGET_UPDATE` (skeleton + core call)
- Snapshot: fetches current campaign budget where possible
- Rollback: best-effort restore snapshot
