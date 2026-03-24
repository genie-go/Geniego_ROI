package store

import (
  "context"
  "encoding/json"
  "time"
  "github.com/google/uuid"
)

func (s *Store) CommerceEnqueueJob(ctx context.Context, tenant, channel, kind string, payload map[string]any) (string, error) {
  jobID := uuid.New().String()
  b, _ := json.Marshal(payload)
  _, err := s.db.Pool().Exec(ctx, `
    INSERT INTO commerce_jobs(job_id, tenant_id, channel, kind, status, input_json)
    VALUES($1,$2,$3,$4,'queued',$5)
  `, jobID, tenant, channel, kind, string(b))
  if err != nil { return "", err }

  seq := 0
  mkItem := func(externalKey string, itemPayload map[string]any) {
    itemID := uuid.New().String()
    pb, _ := json.Marshal(itemPayload)
    _, _ = s.db.Pool().Exec(ctx, `
      INSERT INTO commerce_job_items(item_id, job_id, seq, external_key, payload_json, status, next_run_at, updated_at)
      VALUES($1,$2,$3,$4,$5,'queued',now(),now())
    `, itemID, jobID, seq, externalKey, string(pb))
    seq++
  }

  switch kind {
    case "products":
      if anyArr, ok := payload["products"].([]any); ok {
        for _, it := range anyArr {
          if mp, ok := it.(map[string]any); ok {
            sku, _ := mp["sku"].(string)
            mkItem(sku, map[string]any{"products": []map[string]any{mp}})
          }
        }
      } else {
        mkItem("", payload)
      }
    case "prices":
      if anyArr, ok := payload["prices"].([]any); ok {
        for _, it := range anyArr {
          if mp, ok := it.(map[string]any); ok {
            sku, _ := mp["sku"].(string)
            mkItem(sku, map[string]any{"prices": []map[string]any{mp}})
          }
        }
      } else { mkItem("", payload) }
    case "inventory":
      if anyArr, ok := payload["inventory"].([]any); ok {
        for _, it := range anyArr {
          if mp, ok := it.(map[string]any); ok {
            sku, _ := mp["sku"].(string)
            mkItem(sku, map[string]any{"inventory": []map[string]any{mp}})
          }
        }
      } else { mkItem("", payload) }
    case "orders":
      mkItem("", payload)
    default:
      mkItem("", payload)
  }

  return jobID, nil
}

type CommerceJobSummary struct {
  JobID string `json:"job_id"`
  TenantID string `json:"tenant_id"`
  Channel string `json:"channel"`
  Kind string `json:"kind"`
  Status string `json:"status"`
  CreatedAt time.Time `json:"created_at"`
  StartedAt *time.Time `json:"started_at"`
  FinishedAt *time.Time `json:"finished_at"`
  Message string `json:"message"`
  Total int64 `json:"total_items"`
  Success int64 `json:"success_items"`
  Failed int64 `json:"failed_items"`
}

func (s *Store) CommerceGetJobSummary(ctx context.Context, tenant, jobID string) (*CommerceJobSummary, error) {
  row := s.db.Pool().QueryRow(ctx, `
    SELECT job_id, tenant_id, channel, kind, status, created_at, started_at, finished_at, message, total_items, success_items, failed_items
    FROM v_commerce_job_summary WHERE tenant_id=$1 AND job_id=$2
  `, tenant, jobID)
  var out CommerceJobSummary
  err := row.Scan(&out.JobID, &out.TenantID, &out.Channel, &out.Kind, &out.Status, &out.CreatedAt, &out.StartedAt, &out.FinishedAt, &out.Message, &out.Total, &out.Success, &out.Failed)
  if err != nil { return nil, err }
  return &out, nil
}

func (s *Store) CommerceListJobItems(ctx context.Context, tenant, jobID string, limit int) ([]map[string]any, error) {
  if limit <= 0 { limit = 200 }
  rows, err := s.db.Pool().Query(ctx, `
    SELECT item_id, seq, external_key, status, attempt, next_run_at, last_error
    FROM commerce_job_items
    WHERE job_id=$1
    ORDER BY seq ASC
    LIMIT $2
  `, jobID, limit)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []map[string]any{}
  for rows.Next() {
    var itemID, externalKey, status, lastError string
    var seq, attempt int
    var nextRun time.Time
    _ = rows.Scan(&itemID, &seq, &externalKey, &status, &attempt, &nextRun, &lastError)
    out = append(out, map[string]any{
      "item_id": itemID,
      "seq": seq,
      "external_key": externalKey,
      "status": status,
      "attempt": attempt,
      "next_run_at": nextRun,
      "last_error": lastError,
    })
  }
  return out, nil
}
