#!/usr/bin/env bash
set -euo pipefail
curl -sS -X POST http://localhost:8080/v1/admin/presets/apply   -H "Content-Type: application/json" -H "X-Tenant-ID: ${TENANT_ID:-demo-tenant}" -H "X-API-Key: ${API_KEY:-}"   --data-binary @quickstart/presets/retail.json | jq .
