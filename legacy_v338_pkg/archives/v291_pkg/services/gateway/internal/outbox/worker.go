package outbox

import (
  "bytes"
  "context"
  "encoding/json"
  "log"
  "net/http"
  "time"

  "github.com/jackc/pgx/v5"
  "genie_roi/gateway/internal/config"
  "genie_roi/gateway/internal/db"
  "genie_roi/gateway/internal/store"
)

type Worker struct {
  cfg config.Config
  st  *store.Store
  http *http.Client
}

func NewWorker(cfg config.Config, pg *db.DB) *Worker {
  return &Worker{cfg: cfg, st: store.New(pg), http: &http.Client{Timeout: 15 * time.Second}}
}

func (w *Worker) Run(ctx context.Context) {
  for {
    select {
    case <-ctx.Done():
      return
    default:
      w.tick(ctx)
      time.Sleep(800 * time.Millisecond)
    }
  }
}

func (w *Worker) tick(ctx context.Context) {
  id, tenant, execID, payload, err := w.st.NextOutbox(ctx)
  if err != nil {
    if err == pgx.ErrNoRows { return }
    log.Printf("outbox query: %v", err)
    return
  }
  _ = w.st.MarkOutbox(ctx, id, "PROCESSING", time.Now().Add(30*time.Second))

  if w.cfg.DryRun {
    _ = w.st.Audit(ctx, tenant, execID, "DRY_RUN_SKIP_PROVIDER", map[string]interface{}{})
    _ = w.st.UpdateExecutionResult(ctx, tenant, execID, "SUCCEEDED", []byte(`{"dry_run":true}`))
    _ = w.st.MarkOutbox(ctx, id, "DONE", time.Now())
    return
  }

  req, _ := http.NewRequest("POST", w.cfg.ConnectorsURL+"/v1/execute", bytes.NewReader(payload))
  req.Header.Set("Content-Type", "application/json")
  resp, err := w.http.Do(req)
  if err != nil {
    _ = w.st.Audit(ctx, tenant, execID, "PROVIDER_CALL_FAILED", map[string]interface{}{"error": err.Error()})
    _ = w.st.UpdateExecutionResult(ctx, tenant, execID, "FAILED", []byte(`{"error":"provider_call_failed"}`))
    _ = w.st.MarkOutbox(ctx, id, "PENDING", time.Now().Add(10*time.Second))
    return
  }
  defer resp.Body.Close()

  var result map[string]interface{}
  _ = json.NewDecoder(resp.Body).Decode(&result)
  b, _ := json.Marshal(result)

  status := "SUCCEEDED"
  if resp.StatusCode >= 400 { status = "FAILED" }
  _ = w.st.UpdateExecutionResult(ctx, tenant, execID, status, b)
  _ = w.st.Audit(ctx, tenant, execID, "PROVIDER_RESULT", result)
  _ = w.st.MarkOutbox(ctx, id, "DONE", time.Now())
}
