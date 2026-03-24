package httpapi

import (
  "encoding/json"
  "net/http"
  "strings"

  "github.com/gin-gonic/gin"
  "github.com/google/uuid"
  "genie_roi/gateway/internal/ai"
  "genie_roi/gateway/internal/config"
  "genie_roi/gateway/internal/db"
  "genie_roi/gateway/internal/store"
)

type ActionRequest struct {
  IdempotencyKey string                 `json:"idempotency_key"`
  Channel        string                 `json:"channel"`
  ActionType     string                 `json:"action_type"`
  Payload        map[string]interface{} `json:"payload"`
  RequestedBy    string                 `json:"requested_by"`
  Reason         string                 `json:"reason"`
}

func RegisterRoutes(r *gin.Engine, cfg config.Config, pg *db.DB) {
  st := store.New(pg)
  aiClient := ai.New(cfg.AIEngineURL)

  r.POST("/v1/admin/presets/apply", func(c *gin.Context) {
    var body map[string]interface{}
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }

    tenant := body["tenant"].(map[string]interface{})
    tid := tenant["id"].(string)
    tname := tenant["name"].(string)

    polBytes, _ := json.Marshal(body["policy"])
    if err := st.UpsertTenant(c, tid, tname); err != nil { c.JSON(500, gin.H{"error":"tenant"}); return }
    if err := st.InsertPolicy(c, tid, 1, polBytes); err != nil { c.JSON(500, gin.H{"error":"policy"}); return }

    c.JSON(200, gin.H{"ok": true, "tenant_id": tid})
  })

  r.GET("/v1/admin/policies/latest", func(c *gin.Context) {
    pol, err := st.GetLatestPolicy(c, cfg.TenantID)
    if err != nil { c.JSON(404, gin.H{"error":"no policy"}); return }
    c.Data(200, "application/json", pol.PolicyJSON)
  })

  r.POST("/v1/actions", func(c *gin.Context) {
    var req ActionRequest
    if err := c.BindJSON(&req); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if req.IdempotencyKey == "" { c.JSON(400, gin.H{"error":"idempotency_key required"}); return }
    if req.RequestedBy == "" { req.RequestedBy = "unknown" }

    channel := strings.ToLower(req.Channel)
    provider, _ := req.Payload["provider"].(string)
    provider = strings.ToLower(provider)

    // AI scoring (best-effort)
    risk, _ := aiClient.Score(ai.RiskRequest{TenantID: cfg.TenantID, Channel: channel, Action: req.ActionType, Payload: req.Payload})

    execID := uuid.NewString()
    reqJSON, _ := json.Marshal(req)

    // In V281 scaffold we don't fully implement approval binding.
    // Production would create approval based on policy and then produce execution when approved.
    _ = st.CreateExecution(c, execID, cfg.TenantID, "", req.IdempotencyKey, channel, provider, req.ActionType, "QUEUED", reqJSON)

    payload := map[string]interface{}{
      "execution_id": execID,
      "tenant_id": cfg.TenantID,
      "dry_run": cfg.DryRun,
      "channel": channel,
      "provider": provider,
      "action_type": req.ActionType,
      "payload": req.Payload,
    }
    payloadJSON, _ := json.Marshal(payload)
    _ = st.EnqueueOutbox(c, cfg.TenantID, execID, payloadJSON)
    _ = st.Audit(c, cfg.TenantID, execID, "EXECUTION_QUEUED", map[string]interface{}{"risk": risk})

    c.JSON(201, gin.H{"status":"QUEUED", "execution_id": execID, "risk": risk})
  })

  r.POST("/v1/ma/contacts/upsert", func(c *gin.Context) {
    var body map[string]interface{}
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if err := st.UpsertContact(c, cfg.TenantID, body); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, gin.H{"ok": true})
  })

  r.POST("/v1/ma/consent", func(c *gin.Context) {
    var body map[string]interface{}
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if err := st.UpsertConsent(c, cfg.TenantID, body); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, gin.H{"ok": true})
  })

  r.POST("/v1/ma/templates/upsert", func(c *gin.Context) {
    var body map[string]interface{}
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if err := st.UpsertTemplate(c, cfg.TenantID, body); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, gin.H{"ok": true})
  })

  r.POST("/v1/ma/journeys/upsert", func(c *gin.Context) {
    var body map[string]interface{}
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if err := st.UpsertJourney(c, cfg.TenantID, body); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, gin.H{"ok": true})
  })

  r.POST("/v1/ma/journeys/:id/enroll", func(c *gin.Context) {
    jid := c.Param("id")
    var body map[string]interface{}
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    body["journey_id"] = jid
    if err := st.CreateEnrollment(c, cfg.TenantID, body); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(202, gin.H{"status":"ENROLLED"})
  })

  r.GET("/v1/audit/executions/:id", func(c *gin.Context) {
    id := c.Param("id")
    row, err := st.GetExecution(c, cfg.TenantID, id)
    if err != nil { c.JSON(404, gin.H{"error":"not found"}); return }
    c.Data(200, "application/json", row)
  })

  r.GET("/v1/audit/executions/:id/events", func(c *gin.Context) {
    id := c.Param("id")
    events, err := st.ListAuditEvents(c, cfg.TenantID, id, 200)
    if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, events)
  })
}
