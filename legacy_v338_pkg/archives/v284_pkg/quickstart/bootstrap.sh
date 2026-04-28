#!/usr/bin/env bash
set -euo pipefail

: "${BOOTSTRAP_TOKEN:=dev-bootstrap}"
: "${TENANT_ID:=demo-tenant}"

echo "Bootstrapping tenant=$TENANT_ID ..."
resp=$(curl -sS -X POST http://localhost:8080/v1/admin/bootstrap \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Token: ${BOOTSTRAP_TOKEN}" \
  --data "{"tenant_id":"${TENANT_ID}","tenant_name":"Demo Retail","admin_email":"admin@demo.local"}")

echo "$resp" | jq .
echo
echo "Export this to use the API:"
echo "export TENANT_ID=${TENANT_ID}"
echo "export API_KEY=$(echo "$resp" | jq -r .api_key)"
