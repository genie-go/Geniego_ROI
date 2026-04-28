#!/usr/bin/env bash
set -euo pipefail

EXP_ID="exp-demo-1"

# Create experiment
curl -sS -X POST http://localhost:8080/v1/roi/experiments   -H "Content-Type: application/json"   --data-binary @- <<JSON | jq .
{
  "experiment_id": "${EXP_ID}",
  "name": "Promo Holdout Demo",
  "status": "RUNNING",
  "holdout_pct": 10,
  "definition": {"channel":"email","campaign":"spring_promo"}
}
JSON

# Allocate a few users
for U in u-1 u-2 u-3 u-4 u-5; do
  curl -sS -X POST "http://localhost:8080/v1/roi/experiments/${EXP_ID}/allocate"     -H "Content-Type: application/json"     --data-binary "{"unit_id":"${U}"}" | jq .
done

# Record outcomes
curl -sS -X POST "http://localhost:8080/v1/roi/experiments/${EXP_ID}/outcome"   -H "Content-Type: application/json"   --data-binary '{"unit_id":"u-1","conversions":1,"revenue":120000}' | jq .

curl -sS -X POST "http://localhost:8080/v1/roi/experiments/${EXP_ID}/outcome"   -H "Content-Type: application/json"   --data-binary '{"unit_id":"u-2","conversions":1,"revenue":80000}' | jq .

# Report
curl -sS "http://localhost:8080/v1/roi/experiments/${EXP_ID}/report" | jq .
