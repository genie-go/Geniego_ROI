# GENIE_ROI V388 – Standard Metrics Schema (Ads/Social/Market) + Product Matching

This document **locks** the ingestion format so that recommendations can reliably operate at:
- **campaign / adset / creative**
- **country / gender / age_range (aggregated breakdown only)**
- **product level (Shopify → product_id mapping rules)**

> Privacy/Policy: This schema is **aggregated-only**. Do **not** ingest user-level identifiers, emails, phone numbers, cookies, device IDs, IPs, etc.

---

## 1) Canonical keys (single standard across providers)

### 1.1 Entity identifiers (hierarchy)
| Standard key | Meaning | Examples |
|---|---|---|
| `campaign_id` | campaign identifier | `"123"`, `"c_aa"` |
| `adset_id` | ad set / ad group identifier | `"456"`, `"ag_bb"` |
| `creative_id` | ad / creative identifier | `"789"`, `"ad_cc"` |

**Provider mapping**
- Meta: `campaign_id`, `adset_id`, `ad_id` → store as `creative_id`
- TikTok: `campaign_id`, `adgroup_id` → store as `adset_id`, `ad_id` → store as `creative_id`

### 1.2 Aggregated geo/demographic breakdown keys
| Standard key | Meaning | Notes |
|---|---|---|
| `country` | country code | ISO-2 recommended: `KR`, `JP`, `US` |
| `gender` | gender bucket | `male`, `female`, `unknown` (platform buckets) |
| `age_range` | age bucket | `18-24`, `25-34`, `35-44`, ... |

### 1.3 Commerce keys
| Standard key | Meaning |
|---|---|
| `product_id` | canonical product ID (see mapping rules below) |
| `sku` | optional SKU if available |

---

## 2) Unified ingestion payload (JSON)

### 2.1 Endpoint
`POST /v388/ingest/unified`

### 2.2 Payload shape
```json
{
  "tenant_id": "TENANT1",
  "rows": [
    {
      "provider": "meta",
      "metric_date": "2026-03-01",
      "dimensions": {
        "campaign_id": "123",
        "adset_id": "456",
        "creative_id": "789",
        "country": "KR",
        "gender": "female",
        "age_range": "25-34"
      },
      "metrics": {
        "spend": 120.5,
        "impressions": 54000,
        "clicks": 1200,
        "conversions": 34,
        "revenue": 680.0
      }
    }
  ]
}
```

### 2.3 Metrics fields (supported)
- `spend`
- `impressions`
- `clicks`
- `conversions`
- `revenue` (if you have attribution to sales)
- `units` (mainly for commerce/product level)

---

## 3) How it is stored in `analytics_metric` (save example)

In storage, each `row` expands into multiple rows (one per metric_type):

Example expanded rows for the Meta payload above:

```json
[
  {
    "tenant_id": "TENANT1",
    "provider": "meta",
    "metric_type": "spend",
    "metric_date": "2026-03-01T00:00:00",
    "value": 120.5,
    "dimensions": {
      "campaign_id": "123",
      "adset_id": "456",
      "creative_id": "789",
      "country": "KR",
      "gender": "female",
      "age_range": "25-34"
    }
  },
  {
    "tenant_id": "TENANT1",
    "provider": "meta",
    "metric_type": "revenue",
    "metric_date": "2026-03-01T00:00:00",
    "value": 680.0,
    "dimensions": {
      "campaign_id": "123",
      "adset_id": "456",
      "creative_id": "789",
      "country": "KR",
      "gender": "female",
      "age_range": "25-34"
    }
  }
]
```

> `dimensions_key` is computed as a stable hash of `dimensions` (sorted JSON), so **multiple breakdown rows on the same date** are supported.

---

## 4) Shopify product_id matching rules (to make recommendations “hit” product level)

When ingesting Shopify orders, create product-level revenue/units rows with a **canonical product_id**.

### Rule priority (deterministic)
1) If `variant_id` exists → `shopify:variant:<variant_id>`
2) Else if `product_id` exists → `shopify:product:<product_id>`
3) Else if `sku` exists → `sku:<sku>`
4) Else fallback title → `title:<normalized-title>`

### Example (Shopify product-level ingestion row)
```json
{
  "provider": "shopify",
  "metric_date": "2026-03-01",
  "dimensions": { "product_id": "shopify:variant:445566" },
  "metrics": { "revenue": 350.0, "units": 7 }
}
```

---

## 5) Recommendation examples (what you should expect)

### 5.1 Creative-level: “replace creative” vs “scale budget”
If **CTR is low** but CVR is normal → creative problem  
If **CTR is ok** but CVR is low → landing/offer problem

**Example output (goal-based, group_by=creative)**
```json
{
  "inputs": { "target_roas": 2.5, "target_cpa": 30, "group_by": "creative" },
  "recommendations": [
    {
      "provider": "meta",
      "entity": "creative:789",
      "action": "increase_budget",
      "suggested_delta_pct": 15,
      "why": "ROAS 5.6 >= 2.5 and marginal ROAS improving"
    },
    {
      "provider": "tiktok",
      "entity": "creative:ad_cc",
      "action": "fix_landing_or_offer_then_reduce_budget",
      "suggested_delta_pct": -20,
      "why": "CPA 62 > 30 with acceptable CTR; CVR likely weak"
    }
  ]
}
```

### 5.2 Demographic-level: “push winners”
```json
{
  "segment": "KR|female|25-34",
  "action": "increase_bid_or_expand_budget_for_segment",
  "why": "ROAS and CPA both beat goals"
}
```

### 5.3 Product-level: “which products deserve more spend?”
When `shopify revenue/units by product_id` are present, a product can be:
- **winner**: high ROAS + good conversion volume
- **leak**: high spend but low product revenue

---

## 6) Minimal operational loop (fast path)

1) Shopify: ingest `revenue/units` by `product_id`
2) Meta/TikTok: ingest spend/clicks/conversions with campaign/adset/creative + demographic
3) Run:
- `/v387/recommendations/goal?group_by=creative`
- `/v387/recommendations/goal?group_by=demographic`
- `/v387/recommendations/goal?group_by=product`

This is the smallest setup that makes recommendations **actionable**.
