# Providers (Adapter Skeletons)

Adapters live in `services/connectors/src/providers`.

## Ads
- google_ads: map budget/bid/campaign changes; store before-snapshot; apply change; on rollback, restore snapshot
- meta: same as above
- naver: same as above
- amazon_ads: same as above

## Email
- ses / sendgrid: send is not reversible. Store message-id and evidence. Use kill-switch patterns:
  - pause journeys
  - stop further sends
  - suppress segment

## CRM
- hubspot / salesforce: snapshot object fields before update; apply; rollback restores snapshot (best-effort)
