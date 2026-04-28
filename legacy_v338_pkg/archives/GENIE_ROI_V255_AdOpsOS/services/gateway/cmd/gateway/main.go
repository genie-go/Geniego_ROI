package main

import (
  "bytes"
  "context"
  "crypto/rand"
  "encoding/hex"
  "encoding/json"
  "errors"
  "fmt"
  "io"
  "log"
  "net/http"
  "os"
  "time"

  "github.com/go-chi/chi/v5"
  "github.com/jackc/pgx/v5/pgxpool"
)

type RunRequest struct {
  TenantID            string   `json:"tenant_id"`
  UserID              string   `json:"user_id"`
  Objective           string   `json:"objective"`
  BudgetDeltaLimitPct float64  `json:"budget_delta_limit_pct"`
  Channels            []string `json:"channels"`
}

type AIResponse struct {
  Confidence float64                `json:"confidence"`
  Explain    map[string]any         `json:"explain"`
  Risks      []map[string]any       `json:"risks"`
  Plan       map[string]any         `json:"plan"`
}

type Execution struct {
  ExecutionID string                 `json:"execution_id"`
  TenantID    string                 `json:"tenant_id"`
  UserID      string                 `json:"user_id"`
  Status      string                 `json:"status"`
  Objective   string                 `json:"objective"`
  Channels    []string               `json:"channels"`
  Confidence  *float64               `json:"confidence,omitempty"`
  Explain     map[string]any         `json:"explain,omitempty"`
  Risks       []map[string]any       `json:"risks,omitempty"`
  Plan        map[string]any         `json:"plan,omitempty"`
  Error       *string                `json:"error,omitempty"`
  RequestedAt time.Time              `json:"requested_at"`
  DecidedAt   *time.Time             `json:"decided_at,omitempty"`
}

func genID() string {
  b := make([]byte, 16)
  _, _ = rand.Read(b)
  return hex.EncodeToString(b)
}

func env(key, fallback string) string {
  v := os.Getenv(key)
  if v == "" {
    return fallback
  }
  return v
}

func main() {
  port := env("GATEWAY_PORT", "8080")
  dbURL := os.Getenv("DATABASE_URL")
  if dbURL == "" {
    log.Fatal("DATABASE_URL is required")
  }

  pool, err := pgxpool.New(context.Background(), dbURL)
  if err != nil {
    log.Fatal(err)
  }
  defer pool.Close()

  r := chi.NewRouter()

  r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(200)
    w.Write([]byte("ok"))
  })

  r.Post("/v254/workflows/run", func(w http.ResponseWriter, req *http.Request) {
    var rr RunRequest
    if err := json.NewDecoder(req.Body).Decode(&rr); err != nil {
      http.Error(w, "invalid json", 400)
      return
    }
    if rr.TenantID == "" || rr.UserID == "" || rr.Objective == "" || len(rr.Channels) == 0 {
      http.Error(w, "missing required fields", 400)
      return
    }

    execID := genID()
    now := time.Now().UTC()

    // Store initial execution
    _, err := pool.Exec(req.Context(), `
      INSERT INTO executions(execution_id, tenant_id, user_id, status, objective, channels, requested_at)
      VALUES($1,$2,$3,$4,$5,$6,$7)
    `, execID, rr.TenantID, rr.UserID, "PENDING", rr.Objective, mustJSON(rr.Channels), now)
    if err != nil {
      http.Error(w, "db error", 500)
      return
    }
    audit(pool, req.Context(), execID, rr.TenantID, rr.UserID, "WORKFLOW_REQUESTED", map[string]any{
      "objective": rr.Objective,
      "channels": rr.Channels,
      "budget_delta_limit_pct": rr.BudgetDeltaLimitPct,
    })

    // Call AI service
    aiURL := env("AI_BASE_URL", "http://ai:8000") + "/v254/ai/recommend"
    aiReqBody := map[string]any{
      "tenant_id": rr.TenantID,
      "objective": rr.Objective,
      "channels": rr.Channels,
      "budget_delta_limit_pct": rr.BudgetDeltaLimitPct,
    }
    aiResp, aiErr := httpJSON(req.Context(), "POST", aiURL, aiReqBody)
    if aiErr != nil {
      fail(pool, req.Context(), execID, rr.TenantID, rr.UserID, "AI_ERROR", aiErr)
      http.Error(w, "ai error", 502)
      return
    }

    var air AIResponse
    if err := json.Unmarshal(aiResp, &air); err != nil {
      fail(pool, req.Context(), execID, rr.TenantID, rr.UserID, "AI_PARSE_ERROR", err)
      http.Error(w, "ai parse error", 502)
      return
    }

    threshold := mustFloat(env("CONFIDENCE_THRESHOLD", "0.72"))
    autoExecute := env("AUTO_EXECUTE", "false") == "true"
    status := "NEEDS_REVIEW"
    decidedAt := time.Now().UTC()
    if air.Confidence >= threshold && autoExecute {
      status = "APPROVED"
    }

    // Update execution with decision
    _, err = pool.Exec(req.Context(), `
      UPDATE executions SET status=$1, decided_at=$2, confidence=$3, explain=$4, risks=$5, plan=$6
      WHERE execution_id=$7
    `, status, decidedAt, air.Confidence, mustJSON(air.Explain), mustJSON(air.Risks), mustJSON(air.Plan), execID)
    if err != nil {
      http.Error(w, "db error", 500)
      return
    }
    audit(pool, req.Context(), execID, rr.TenantID, rr.UserID, "AI_DECISION", map[string]any{
      "confidence": air.Confidence,
      "threshold": threshold,
      "auto_execute": autoExecute,
      "status": status,
    })

    // If approved, dispatch to connectors via outbox
    if status == "APPROVED" {
      payload := map[string]any{
        "execution_id": execID,
        "tenant_id": rr.TenantID,
        "user_id": rr.UserID,
        "plan": air.Plan,
        "channels": rr.Channels,
        "dry_run": env("DRY_RUN", "true") == "true",
      }
      _, err := pool.Exec(req.Context(), `INSERT INTO outbox(execution_id, status, payload) VALUES($1,$2,$3)`,
        execID, "READY", mustJSON(payload))
      if err != nil {
        http.Error(w, "db error", 500)
        return
      }
      audit(pool, req.Context(), execID, rr.TenantID, rr.UserID, "OUTBOX_ENQUEUED", payload)

      // Best-effort immediate processing (in prod, worker would poll outbox)
      if err := processOutbox(req.Context(), pool, execID, rr.TenantID, rr.UserID); err != nil {
        // execution marked failed inside
      }
    }

    // Return execution summary
    ex, _ := loadExecution(req.Context(), pool, execID)
    writeJSON(w, ex)
  })

  r.Get("/v254/executions/{id}", func(w http.ResponseWriter, req *http.Request) {
    id := chi.URLParam(req, "id")
    ex, err := loadExecution(req.Context(), pool, id)
    if err != nil {
      http.Error(w, "not found", 404)
      return
    }
    writeJSON(w, ex)
  })

  log.Printf("gateway listening on :%s", port)
  http.ListenAndServe(":"+port, r)
}

func mustFloat(s string) float64 {
  var f float64
  fmt.Sscanf(s, "%f", &f)
  return f
}

func mustJSON(v any) []byte {
  b, _ := json.Marshal(v)
  return b
}

func writeJSON(w http.ResponseWriter, v any) {
  w.Header().Set("Content-Type", "application/json")
  enc := json.NewEncoder(w)
  enc.SetIndent("", "  ")
  enc.Encode(v)
}

func httpJSON(ctx context.Context, method, url string, body any) ([]byte, error) {
  b, _ := json.Marshal(body)
  req, _ := http.NewRequestWithContext(ctx, method, url, bytes.NewReader(b))
  req.Header.Set("Content-Type", "application/json")
  c := &http.Client{Timeout: 15 * time.Second}
  resp, err := c.Do(req)
  if err != nil {
    return nil, err
  }
  defer resp.Body.Close()
  out, _ := io.ReadAll(resp.Body)
  if resp.StatusCode >= 300 {
    return nil, fmt.Errorf("http %d: %s", resp.StatusCode, string(out))
  }
  return out, nil
}

func audit(pool *pgxpool.Pool, ctx context.Context, execID, tenantID, userID, eventType string, payload any) {
  _, _ = pool.Exec(ctx, `INSERT INTO audit_log(execution_id, tenant_id, user_id, event_type, payload) VALUES($1,$2,$3,$4,$5)`,
    execID, tenantID, userID, eventType, mustJSON(payload))
}

func fail(pool *pgxpool.Pool, ctx context.Context, execID, tenantID, userID, eventType string, err error) {
  msg := err.Error()
  _, _ = pool.Exec(ctx, `UPDATE executions SET status=$1, error=$2 WHERE execution_id=$3`, "FAILED", msg, execID)
  audit(pool, ctx, execID, tenantID, userID, eventType, map[string]any{"error": msg})
}

func processOutbox(ctx context.Context, pool *pgxpool.Pool, execID, tenantID, userID string) error {
  // Load outbox payload
  var payloadBytes []byte
  var outboxID int64
  err := pool.QueryRow(ctx, `SELECT id, payload FROM outbox WHERE execution_id=$1 AND status='READY' ORDER BY id DESC LIMIT 1`, execID).
    Scan(&outboxID, &payloadBytes)
  if err != nil {
    return err
  }

  // Mark executing
  _, _ = pool.Exec(ctx, `UPDATE outbox SET status='PROCESSING', processed_at=NOW() WHERE id=$1`, outboxID)
  _, _ = pool.Exec(ctx, `UPDATE executions SET status='EXECUTING' WHERE execution_id=$1`, execID)
  audit(pool, ctx, execID, tenantID, userID, "EXECUTING", map[string]any{"outbox_id": outboxID})

  var payload map[string]any
  _ = json.Unmarshal(payloadBytes, &payload)

  connectorsURL := env("CONNECTORS_BASE_URL", "http://connectors:3000")
  // plan contains per-channel actions
  plan, _ := payload["plan"].(map[string]any)
  actions, _ := plan["actions"].([]any)

  succeeded := make([]map[string]any, 0)
  for _, a := range actions {
    act, _ := a.(map[string]any)
    ch, _ := act["channel"].(string)
    execURL := fmt.Sprintf("%s/v254/connectors/%s/execute", connectorsURL, ch)
    resp, err := httpJSON(ctx, "POST", execURL, payload)
    if err != nil {
      // rollback successes
      audit(pool, ctx, execID, tenantID, userID, "EXECUTE_FAILED", map[string]any{"channel": ch, "error": err.Error()})
      rollback(ctx, pool, execID, tenantID, userID, succeeded)
      fail(pool, ctx, execID, tenantID, userID, "EXECUTION_FAILED", err)
      return err
    }
    var rj map[string]any
    _ = json.Unmarshal(resp, &rj)
    succeeded = append(succeeded, map[string]any{"channel": ch, "result": rj})
    audit(pool, ctx, execID, tenantID, userID, "EXECUTE_OK", map[string]any{"channel": ch, "result": rj})
  }

  _, _ = pool.Exec(ctx, `UPDATE executions SET status='SUCCESS' WHERE execution_id=$1`, execID)
  _, _ = pool.Exec(ctx, `UPDATE outbox SET status='DONE', processed_at=NOW() WHERE id=$1`, outboxID)
  audit(pool, ctx, execID, tenantID, userID, "EXECUTION_SUCCESS", map[string]any{"succeeded": succeeded})
  return nil
}

func rollback(ctx context.Context, pool *pgxpool.Pool, execID, tenantID, userID string, succeeded []map[string]any) {
  connectorsURL := env("CONNECTORS_BASE_URL", "http://connectors:3000")
  for _, s := range succeeded {
    ch := s["channel"].(string)
    rbURL := fmt.Sprintf("%s/v254/connectors/%s/rollback", connectorsURL, ch)
    _, err := httpJSON(ctx, "POST", rbURL, map[string]any{
      "execution_id": execID,
      "tenant_id": tenantID,
      "dry_run": env("DRY_RUN", "true") == "true",
    })
    if err != nil {
      audit(pool, ctx, execID, tenantID, userID, "ROLLBACK_FAILED", map[string]any{"channel": ch, "error": err.Error()})
    } else {
      audit(pool, ctx, execID, tenantID, userID, "ROLLBACK_OK", map[string]any{"channel": ch})
    }
  }
}

func loadExecution(ctx context.Context, pool *pgxpool.Pool, execID string) (*Execution, error) {
  row := pool.QueryRow(ctx, `
    SELECT execution_id, tenant_id, user_id, status, objective, channels, confidence, explain, risks, plan, error, requested_at, decided_at
    FROM executions WHERE execution_id=$1
  `, execID)
  var e Execution
  var channelsBytes, explainBytes, risksBytes, planBytes []byte
  var conf *float64
  var errStr *string
  var decidedAt *time.Time
  if err := row.Scan(&e.ExecutionID, &e.TenantID, &e.UserID, &e.Status, &e.Objective, &channelsBytes,
    &conf, &explainBytes, &risksBytes, &planBytes, &errStr, &e.RequestedAt, &decidedAt); err != nil {
    return nil, err
  }
  e.Confidence = conf
  e.Error = errStr
  e.DecidedAt = decidedAt
  _ = json.Unmarshal(channelsBytes, &e.Channels)
  if len(explainBytes) > 0 {
    _ = json.Unmarshal(explainBytes, &e.Explain)
  }
  if len(risksBytes) > 0 {
    _ = json.Unmarshal(risksBytes, &e.Risks)
  }
  if len(planBytes) > 0 {
    _ = json.Unmarshal(planBytes, &e.Plan)
  }
  return &e, nil
}

var ErrNotFound = errors.New("not found")
