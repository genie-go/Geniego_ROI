package main

import (
  "context"
  "encoding/json"
  "errors"
  "fmt"
  "io"
  "log"
  "net/http"
  "os"
  "strconv"
  "time"

  "github.com/go-chi/chi/v5"
  "github.com/go-chi/chi/v5/middleware"
  "github.com/google/uuid"
  "github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
  Port int
  DryRun bool
  AIBaseURL string
  ConnectorBaseURL string
  MaxDailyBudgetChangePct float64
  MinConfidenceForAuto float64
}

func mustEnv(key string) string {
  v := os.Getenv(key)
  if v == "" {
    log.Fatalf("missing env: %s", key)
  }
  return v
}

func main() {
  cfg := loadConfig()
  db := mustDB()
  defer db.Close()

  if err := initSchema(db); err != nil {
    log.Fatalf("schema init failed: %v", err)
  }

  r := chi.NewRouter()
  r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)
  r.Use(middleware.Timeout(30 * time.Second))

  r.Get("/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })

  r.Route("/v254", func(r chi.Router) {
    r.Post("/workflows/run", runWorkflowHandler(cfg, db))
    r.Get("/executions/{id}", getExecutionHandler(db))
  })

  addr := fmt.Sprintf(":%d", cfg.Port)
  log.Printf("gateway listening on %s (dry_run=%v)", addr, cfg.DryRun)
  log.Fatal(http.ListenAndServe(addr, r))
}

func loadConfig() Config {
  port, _ := strconv.Atoi(getEnvDefault("GATEWAY_PORT", "8080"))
  dry := getEnvDefault("DRY_RUN", "true") == "true"
  maxPct, _ := strconv.ParseFloat(getEnvDefault("MAX_DAILY_BUDGET_CHANGE_PCT", "20"), 64)
  minConf, _ := strconv.ParseFloat(getEnvDefault("MIN_CONFIDENCE_FOR_AUTO", "0.72"), 64)

  return Config{
    Port: port,
    DryRun: dry,
    AIBaseURL: getEnvDefault("AI_BASE_URL", "http://ai:8001"),
    ConnectorBaseURL: getEnvDefault("CONNECTOR_BASE_URL", "http://connectors:3001"),
    MaxDailyBudgetChangePct: maxPct,
    MinConfidenceForAuto: minConf,
  }
}

func getEnvDefault(key, def string) string {
  v := os.Getenv(key)
  if v == "" { return def }
  return v
}

func mustDB() *pgxpool.Pool {
  host := mustEnv("POSTGRES_HOST")
  port := mustEnv("POSTGRES_PORT")
  dbn := mustEnv("POSTGRES_DB")
  user := mustEnv("POSTGRES_USER")
  pass := mustEnv("POSTGRES_PASSWORD")
  dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s", user, pass, host, port, dbn)

  pool, err := pgxpool.New(context.Background(), dsn)
  if err != nil { log.Fatalf("db connect failed: %v", err) }
  return pool
}

func initSchema(db *pgxpool.Pool) error {
  schema := `CREATE TABLE IF NOT EXISTS executions (
  execution_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  confidence DOUBLE PRECISION,
  dry_run BOOLEAN NOT NULL DEFAULT true,
  request_json JSONB NOT NULL,
  result_json JSONB,
  error_text TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  detail JSONB
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id BIGSERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON outbox_events(processed_at) WHERE processed_at IS NULL;
`
  _, err := db.Exec(context.Background(), schema)
  return err
}

type WorkflowRequest struct {
  TenantID string `json:"tenant_id"`
  Actor string `json:"actor"`
  Channel string `json:"channel"`
  Objective string `json:"objective"`
  CurrentBudget float64 `json:"current_budget"`
  ProposedBudget float64 `json:"proposed_budget"`
  Currency string `json:"currency"`
  Metadata map[string]any `json:"metadata"`
}

func runWorkflowHandler(cfg Config, db *pgxpool.Pool) http.HandlerFunc {
  return func(w http.ResponseWriter, r *http.Request) {
    var req WorkflowRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
      http.Error(w, "invalid json", 400); return
    }
    if req.TenantID == "" { req.TenantID = "default" }
    if req.Actor == "" { req.Actor = "anonymous" }
    if req.Currency == "" { req.Currency = "KRW" }

    policy := map[string]any{}
    pctChange := 0.0
    if req.CurrentBudget > 0 {
      pctChange = ((req.ProposedBudget - req.CurrentBudget) / req.CurrentBudget) * 100.0
    }
    policy["budget_change_pct"] = pctChange
    if abs(pctChange) > cfg.MaxDailyBudgetChangePct {
      policy["allowed"] = false
      policy["reason"] = "budget change exceeds MAX_DAILY_BUDGET_CHANGE_PCT"
      writeJSON(w, 422, map[string]any{"error":"policy_denied","policy":policy})
      return
    }
    policy["allowed"] = true

    execID := uuid.New().String()
    confidence := 0.0
    aiResult, aiErr := callAIOptimize(cfg.AIBaseURL, req)
    if aiErr != nil {
      policy["ai_warning"] = aiErr.Error()
    } else {
      if c, ok := aiResult["confidence"].(float64); ok { confidence = c }
      policy["ai"] = aiResult
    }

    autoAllowed := confidence >= cfg.MinConfidenceForAuto
    policy["auto_execute_allowed"] = autoAllowed
    status := "APPROVAL_REQUIRED"
    if autoAllowed { status = "APPROVED" }

    reqJSON, _ := json.Marshal(req)
    _, err := db.Exec(r.Context(), `
      INSERT INTO executions(execution_id, tenant_id, status, confidence, dry_run, request_json)
      VALUES($1,$2,$3,$4,$5,$6)
    `, execID, req.TenantID, status, confidence, cfg.DryRun, reqJSON)
    if err != nil { http.Error(w, "db error", 500); return }

    if status == "APPROVED" {
      payload := map[string]any{"execution_id": execID, "request": req, "dry_run": cfg.DryRun}
      _ = enqueueOutbox(r.Context(), db, execID, "EXECUTE", payload)
      _ = processOneOutbox(r.Context(), cfg, db)
    }

    writeJSON(w, 200, map[string]any{
      "execution_id": execID,
      "status": status,
      "confidence": confidence,
      "dry_run": cfg.DryRun,
      "policy": policy,
    })
  }
}

func getExecutionHandler(db *pgxpool.Pool) http.HandlerFunc {
  return func(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    row := db.QueryRow(r.Context(), `SELECT execution_id, tenant_id, status, confidence, dry_run, request_json, result_json, error_text, requested_at, started_at, finished_at
      FROM executions WHERE execution_id=$1`, id)
    var executionID, tenantID, status string
    var confidence float64
    var dryRun bool
    var requestJSON, resultJSON []byte
    var errorText *string
    var requestedAt, startedAt, finishedAt *time.Time
    if err := row.Scan(&executionID, &tenantID, &status, &confidence, &dryRun, &requestJSON, &resultJSON, &errorText, &requestedAt, &startedAt, &finishedAt); err != nil {
      http.Error(w, "not found", 404); return
    }
    writeJSON(w, 200, map[string]any{
      "execution_id": executionID,
      "tenant_id": tenantID,
      "status": status,
      "confidence": confidence,
      "dry_run": dryRun,
      "request": json.RawMessage(requestJSON),
      "result": json.RawMessage(resultJSON),
      "error": errorText,
      "requested_at": requestedAt,
      "started_at": startedAt,
      "finished_at": finishedAt,
    })
  }
}

func enqueueOutbox(ctx context.Context, db *pgxpool.Pool, execID, eventType string, payload map[string]any) error {
  b, _ := json.Marshal(payload)
  _, err := db.Exec(ctx, `INSERT INTO outbox_events(execution_id, event_type, payload) VALUES($1,$2,$3)`, execID, eventType, b)
  return err
}

func processOneOutbox(ctx context.Context, cfg Config, db *pgxpool.Pool) error {
  tx, err := db.Begin(ctx)
  if err != nil { return err }
  defer tx.Rollback(ctx)

  row := tx.QueryRow(ctx, `SELECT id, execution_id, payload FROM outbox_events WHERE processed_at IS NULL ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`)
  var id int64
  var execID string
  var payload []byte
  if err := row.Scan(&id, &execID, &payload); err != nil { return nil }

  _, _ = tx.Exec(ctx, `UPDATE executions SET status=$2, started_at=now() WHERE execution_id=$1`, execID, "EXECUTING")
  if err := tx.Commit(ctx); err != nil { return err }

  result, execErr := callConnectorExecute(cfg.ConnectorBaseURL, payload)
  if execErr != nil {
    _ = callConnectorRollback(cfg.ConnectorBaseURL, payload)
    _, _ = db.Exec(ctx, `UPDATE executions SET status=$2, error_text=$3, finished_at=now() WHERE execution_id=$1`, execID, "ROLLED_BACK", execErr.Error())
  } else {
    b, _ := json.Marshal(result)
    _, _ = db.Exec(ctx, `UPDATE executions SET status=$2, result_json=$3, finished_at=now() WHERE execution_id=$1`, execID, "SUCCESS", b)
  }
  _, _ = db.Exec(ctx, `UPDATE outbox_events SET processed_at=now() WHERE id=$1`, id)
  return nil
}

func callAIOptimize(baseURL string, req WorkflowRequest) (map[string]any, error) {
  body, _ := json.Marshal(map[string]any{
    "tenant_id": req.TenantID,
    "channel": req.Channel,
    "objective": req.Objective,
    "current_budget": req.CurrentBudget,
    "proposed_budget": req.ProposedBudget,
    "currency": req.Currency,
    "features": req.Metadata,
  })
  httpReq, _ := http.NewRequest("POST", baseURL+"/optimize", bytesReader(body))
  httpReq.Header.Set("Content-Type", "application/json")
  client := &http.Client{Timeout: 4 * time.Second}
  resp, err := client.Do(httpReq)
  if err != nil { return nil, err }
  defer resp.Body.Close()
  if resp.StatusCode >= 300 { return nil, errors.New("ai returned non-2xx") }
  var out map[string]any
  if err := json.NewDecoder(resp.Body).Decode(&out); err != nil { return nil, err }
  return out, nil
}

func callConnectorExecute(baseURL string, payload []byte) (map[string]any, error) {
  httpReq, _ := http.NewRequest("POST", baseURL+"/execute", bytesReader(payload))
  httpReq.Header.Set("Content-Type", "application/json")
  client := &http.Client{Timeout: 8 * time.Second}
  resp, err := client.Do(httpReq)
  if err != nil { return nil, err }
  defer resp.Body.Close()
  if resp.StatusCode >= 300 { return nil, fmt.Errorf("connector execute failed: %d", resp.StatusCode) }
  var out map[string]any
  if err := json.NewDecoder(resp.Body).Decode(&out); err != nil { return nil, err }
  return out, nil
}

func callConnectorRollback(baseURL string, payload []byte) error {
  httpReq, _ := http.NewRequest("POST", baseURL+"/rollback", bytesReader(payload))
  httpReq.Header.Set("Content-Type", "application/json")
  client := &http.Client{Timeout: 6 * time.Second}
  resp, err := client.Do(httpReq)
  if err != nil { return err }
  defer resp.Body.Close()
  return nil
}

func writeJSON(w http.ResponseWriter, code int, v any) {
  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(code)
  _ = json.NewEncoder(w).Encode(v)
}

func abs(x float64) float64 { if x < 0 { return -x }; return x }

type byteReader struct { b []byte; i int }
func bytesReader(b []byte) *byteReader { return &byteReader{b:b} }
func (r *byteReader) Read(p []byte) (int, error) {
  if r.i >= len(r.b) { return 0, io.EOF }
  n := copy(p, r.b[r.i:])
  r.i += n
  return n, nil
}
func (r *byteReader) Close() error { return nil }
