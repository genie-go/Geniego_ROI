#!/usr/bin/env bash
set -euo pipefail

# Demo script for V285 (requires docker compose up)
# 1) Bootstrap admin key (requires BOOTSTRAP_TOKEN)
# 2) Create connector account
# 3) Create segment + recompute
# 4) Create message experiment + allocate
# 5) Ingest event to trigger journey (if journey trigger configured)

API=${API_BASE:-http://localhost:8080}
TENANT=${TENANT_ID:-demo-tenant}
BOOT=${BOOTSTRAP_TOKEN:-changeme}

echo "Bootstrapping admin key..."
RES=$(curl -sS -X POST "$API/v1/admin/bootstrap" -H "Content-Type: application/json" -H "X-Bootstrap-Token: $BOOT"   -d "{"tenant_id":"$TENANT","tenant_name":"Demo Tenant","admin_email":"admin@example.com","admin_name":"Admin"}")
KEY=$(python - <<'PY'
import json,sys
print(json.loads(sys.stdin.read()).get("api_key",""))
PY <<<"$RES")
echo "API KEY: $KEY"

H_AUTH=(-H "Content-Type: application/json" -H "X-Tenant-ID: $TENANT" -H "X-API-Key: $KEY")

echo "Creating connector account..."
curl -sS -X POST "$API/v1/connectors/accounts" "${H_AUTH[@]}" -d '{"provider":"google_ads","account_id":"demo","config":{"dry_run":true},"status":"ACTIVE"}' | jq .

echo "Creating segment..."
SEG=$(curl -sS -X POST "$API/v1/segments" "${H_AUTH[@]}" -d '{"name":"Example Email Segment","definition":{"filters":[{"field":"email","op":"contains","value":"@example.com"}]}}' | jq -r .segment_id)
echo "Segment: $SEG"
curl -sS -X POST "$API/v1/segments/$SEG/recompute" "${H_AUTH[@]}" -d '{}' | jq .

echo "Creating message experiment..."
EXP=$(curl -sS -X POST "$API/v1/experiments/message" "${H_AUTH[@]}" -d '{"name":"Welcome AB","channel":"email","status":"RUNNING","holdout_pct":10,"variants":[{"id":"A","weight":1},{"id":"B","weight":1}],"policy":{}}' | jq -r .experiment_id)
echo "Experiment: $EXP"
curl -sS -X POST "$API/v1/experiments/message/$EXP/allocate" "${H_AUTH[@]}" -d '{"contact_id":"c_001"}' | jq .

echo "Done."
