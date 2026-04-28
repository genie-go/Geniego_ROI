#!/usr/bin/env bash
set -euo pipefail
curl -sS -X POST http://localhost:8080/v1/admin/presets/apply   -H "Content-Type: application/json"   --data-binary @quickstart/presets/global_brand.json | jq .
