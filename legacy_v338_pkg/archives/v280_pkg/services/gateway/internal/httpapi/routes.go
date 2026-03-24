package httpapi

import (
  "context"
  "encoding/json"
  "net/http"
  "strings"
  "time"

  "github.com/gin-gonic/gin"
  "github.com/google/uuid"
  "genie_roi/gateway/internal/ai"
  "genie_roi/gateway/internal/config"
  "genie_roi/gateway/internal/db"
  "genie_roi/gateway/internal/policy"
  "genie_roi/gateway/internal/store"
)

type ActionRequest struct {
  IdempotencyKey string                 `json:"idempotency_key"`
  Channel        string                 `json:"channel"`      // ads/email/crm/journey
  ActionType     string                 `json:"action_type"`  // e.g. ADS_BUDGET_UPDATE, EMAIL_SEND
  Payload        map[string]interface{} `json:"payload"`
  RequestedBy    string                 `json:"requested_by"`
  Reason         string                 `json:"reason"`
}

func RegisterRoutes(r *gin.Engine, cfg config.Config, pg *db.DB) {
  st := store.New(pg)
  aiClient := ai.New(cfg.AIEngineURL)

  // Admin: apply preset (tenant+policy)
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

  // Generic controlled action
  r.POST("/v1/actions", func(c *gin.Context) {
    var req ActionRequest
    if err := c.BindJSON(&req); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if req.IdempotencyKey == "" { c.JSON(400, gin.H{"error":"idempotency_key required"}); return }
    if req.RequestedBy == "" { req.RequestedBy = "unknown" }

    polRow, err := st.GetLatestPolicy(c, cfg.TenantID)
    if err != nil { c.JSON(400, gin.H{"error":"policy not set"}); return }
    var pol policy.Policy
    _ = json.Unmarshal(polRow.PolicyJSON, &pol)

    // Basic channel enable checks
    ch := strings.ToLower(req.Channel)
    if cfg.EnforcePolicies {
      if ch == "ads" && !pol.Channels.Ads.Enabled { c.JSON(403, gin.H{"error":"ads disabled"}); return }
      if ch == "email" && !pol.Channels.Email.Enabled { c.JSON(403, gin.H{"error":"email disabled"}); return }
      if ch == "crm" && !pol.Channels.CRM.Enabled { c.JSON(403, gin.H{"error":"crm disabled"}); return }
    }

    // AI risk scoring (best-effort)
    risk, _ := aiClient.Score(ai.RiskRequest{
      TenantID: cfg.TenantID, Channel: ch, Action: req.ActionType, Payload: req.Payload,
    })

    // Determine approval requirement (simple tag logic)
    approvalTag := deriveApprovalTag(pol, req)
    needsApproval := policy.RequiresApproval(pol, approvalTag)

    approvalID := ""
    if needsApproval {
      approvalID = uuid.NewString()
      _ = st.CreateApproval(c, approvalID, cfg.TenantID, req.ActionType, "PENDING", req.RequestedBy, req.Reason)
      _ = st.Audit(c, cfg.TenantID, "", "APPROVAL_CREATED", map[string]interface{}{
        "approval_id": approvalID, "action": req.ActionType, "risk": risk,
      })
      c.JSON(202, gin.H{"status":"PENDING_APPROVAL", "approval_id": approvalID, "risk": risk})
      return
    }

    execID := uuid.NewString()
    requestJSON, _ := json.Marshal(req)
    _ = st.CreateExecution(c, execID, cfg.TenantID, "", req.IdempotencyKey, ch, req.ActionType, "QUEUED", requestJSON)

    // enqueue outbox
    payload := map[string]interface{}{
      "execution_id": execID,
      "tenant_id": cfg.TenantID,
      "dry_run": cfg.DryRun,
      "channel": ch,
      "action_type": req.ActionType,
      "payload": req.Payload,
    }
    payloadJSON, _ := json.Marshal(payload)
    _ = st.EnqueueOutbox(c, cfg.TenantID, execID, payloadJSON)

    _ = st.Audit(c, cfg.TenantID, execID, "EXECUTION_QUEUED", map[string]interface{}{"risk": risk})

    c.JSON(201, gin.H{"status":"QUEUED", "execution_id": execID, "risk": risk})
  })

  // Approvals: decide
  r.POST("/v1/approvals/:id/decide", func(c *gin.Context) {
    id := c.Param("id")
    var body struct {
      Decision string `json:"decision"` // APPROVE/REJECT
      By string `json:"by"`
      Reason string `json:"reason"`
    }
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if body.By == "" { body.By = "approver" }

    if strings.ToUpper(body.Decision) == "APPROVE" {
      if err := st.DecideApproval(c, id, "APPROVED", body.By, body.Reason); err != nil { c.JSON(404, gin.H{"error":"not found"}); return }

      // In a full implementation, the approval would be tied to a specific planned execution payload.
      // Here we keep it scaffold-only.
      _ = st.Audit(c, cfg.TenantID, "", "APPROVAL_APPROVED", map[string]interface{}{"approval_id": id})
      c.JSON(200, gin.H{"ok": true})
      return
    }

    _ = st.DecideApproval(c, id, "REJECTED", body.By, body.Reason)
    _ = st.Audit(c, cfg.TenantID, "", "APPROVAL_REJECTED", map[string]interface{}{"approval_id": id})
    c.JSON(200, gin.H{"ok": true})
  })

  // Minimal MA endpoints (scaffold)
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

  // Audit
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

  // Background: very simple journey scheduler stub (would be a separate worker in prod)
  go func() {
    tick := time.NewTicker(5 * time.Second)
    for range tick.C {
      _ = st.TickJourneys(context.Background(), cfg.TenantID)
    }
  }()
}

func deriveApprovalTag(p policy.Policy, req ActionRequest) string {
  // Simple heuristic tags to drive policy approvals.
  // Real impl would inspect payload (e.g. pct deltas, recipient counts).
  if strings.ToUpper(req.ActionType) == "EMAIL_BULK_SEND" {
    return "EMAIL_BULK_SEND"
  }
  if strings.ToUpper(req.ActionType) == "CRM_BULK_UPDATE" {
    return "CRM_BULK_UPDATE"
  }
  if strings.ToUpper(req.ActionType) == "ADS_BUDGET_UPDATE" {
    // If payload includes delta_pct>10 treat as OVER_10PCT
    if v, ok := req.Payload["delta_pct"].(float64); ok && int(v) > 10 {
      return "ADS_BUDGET_UPDATE_OVER_10PCT"
    }
    if v, ok := req.Payload["delta_pct"].(int); ok && v > 10 {
      return "ADS_BUDGET_UPDATE_OVER_10PCT"
    }
    return "ADS_BUDGET_UPDATE"
  }
  return "DEFAULT"
}
