package httpapi

import (
  "encoding/json"
  "net/http"
  "strings"
  "time"
  "strconv"

  "genie_roi/gateway/internal/policy"
  "genie_roi/gateway/internal/auth"

  "github.com/gin-gonic/gin"
  "github.com/google/uuid"
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

func tenantOf(c *gin.Context) string { return auth.GetPrincipal(c).TenantID }
func userOf(c *gin.Context) string { return auth.GetPrincipal(c).UserID }
func roleOf(c *gin.Context) string { return auth.GetPrincipal(c).Role }

func RegisterRoutes(r *gin.Engine, cfg config.Config, pg *db.DB) {

  st := store.New(pg)
  r.Use(auth.Middleware(st, cfg.BootstrapToken))

  
  // Bootstrap: mint first admin key using BOOTSTRAP_TOKEN (no API key required).
  r.POST("/v1/admin/bootstrap", func(c *gin.Context) {
    var body struct{
      TenantID string `json:"tenant_id"`
      TenantName string `json:"tenant_name"`
      AdminEmail string `json:"admin_email"`
      AdminName string `json:"admin_name"`
    }
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if body.TenantID == "" { body.TenantID = "demo-tenant" }
    if body.TenantName == "" { body.TenantName = body.TenantID }
    if body.AdminEmail == "" { body.AdminEmail = "admin@example.com" }
    adminID := uuid.NewString()
    _ = st.UpsertTenant(c, body.TenantID, body.TenantName)
    _ = st.InsertUser(c, adminID, body.TenantID, body.AdminEmail, body.AdminName, "admin")
    raw := uuid.NewString() + "." + uuid.NewString()
    h := auth.HashAPIKey(raw)
    if err := st.CreateAPIKey(c, h, body.TenantID, adminID, "admin"); err != nil { c.JSON(500, gin.H{"error":"api_key"}); return }
    c.JSON(200, gin.H{"tenant_id": body.TenantID, "user_id": adminID, "role":"admin", "api_key": raw, "api_key_hash": h})
  })

r.POST("/v1/admin/presets/apply", auth.RequireRole("admin"), func(c *gin.Context) {
    var body map[string]interface{}
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }

    tenant := body["tenant"].(map[string]interface{})
    tid := tenant["id"].(string)
    tname := tenant["name"].(string)
    polBytes, _ := json.Marshal(body["policy"])

    if err := st.UpsertTenant(c, tid, tname); err != nil { c.JSON(500, gin.H{"error":"tenant"}); return }
    polHash := policy.HashBytes(polBytes)
    if err := st.InsertPolicy(c, tid, 1, polBytes, polHash); err != nil { c.JSON(500, gin.H{"error":"policy"}); return }
    c.JSON(200, gin.H{"ok": true, "tenant_id": tid})
  })

  r.GET("/v1/admin/policies/latest", auth.RequireRole("admin"), func(c *gin.Context) {
    pol, err := st.GetLatestPolicy(c, tenantOf(c))
    if err != nil { c.JSON(404, gin.H{"error":"no policy"}); return }
    c.Data(200, "application/json", pol.PolicyJSON)
  })

  

  r.POST("/v1/admin/api-keys/mint", auth.RequireRole("admin"), func(c *gin.Context) {
    var body struct {
      Email string `json:"email"`
      Name  string `json:"name"`
      Role  string `json:"role"`
      UserID string `json:"user_id"`
    }
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if body.Role == "" { body.Role = "marketer" }
    if body.UserID == "" { body.UserID = uuid.NewString() }
    if err := st.InsertUser(c, body.UserID, tenantOf(c), body.Email, body.Name, strings.ToLower(body.Role)); err != nil {
      c.JSON(500, gin.H{"error":"user"}); return
    }
    raw := uuid.NewString() + "." + uuid.NewString()
    h := auth.HashAPIKey(raw)
    if err := st.CreateAPIKey(c, h, tenantOf(c), body.UserID, strings.ToLower(body.Role)); err != nil {
      c.JSON(500, gin.H{"error":"api_key"}); return
    }
    c.JSON(200, gin.H{"tenant_id": tenantOf(c), "user_id": body.UserID, "role": strings.ToLower(body.Role), "api_key": raw, "api_key_hash": h})
  })

r.POST("/v1/actions", auth.RequireRole("marketer","admin"), func(c *gin.Context) {
  var req ActionRequest
  if err := c.BindJSON(&req); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
  if req.IdempotencyKey == "" { c.JSON(400, gin.H{"error":"idempotency_key required"}); return }
  if req.RequestedBy == "" { req.RequestedBy = "unknown" }

  channel := strings.ToLower(req.Channel)
  provider, _ := req.Payload["provider"].(string)
  provider = strings.ToLower(provider)

  // Load latest policy (V283: policy is enforced, not just stored)
  polRow, err := st.GetLatestPolicy(c, tenantOf(c))
  if err != nil { c.JSON(409, gin.H{"error":"policy not configured"}); return }
  pol, err := policy.Parse(polRow.PolicyJSON)
  if err != nil { c.JSON(500, gin.H{"error":"policy parse"}); return }
  polHash := policy.HashBytes(polRow.PolicyJSON)

  // Channel enabled?
  if rule, ok := pol.Channels[channel]; ok {
    if !rule.Enabled {
      c.JSON(403, gin.H{"error":"channel disabled by policy", "channel": channel})
      return
    }
  }

  // Fine-grained policy checks (best-effort; strict for email consent/frequency)
  if channel == "crm" {
    if rule, ok := pol.Channels[channel]; ok && rule.MaxBulkUpdates > 0 {
      if items, ok := req.Payload["items"].([]interface{}); ok && len(items) > rule.MaxBulkUpdates {
        c.JSON(403, gin.H{"error":"max_bulk_updates exceeded", "max": rule.MaxBulkUpdates, "got": len(items)})
        return
      }
    }
  }

  // Email: enforce consent + daily frequency cap for contact_ids payloads.
  if channel == "email" {
    rule := pol.Channels[channel]
    // consent
    if rule.RequireConsent {
      if ids, ok := req.Payload["contact_ids"].([]interface{}); ok {
        for _, raw := range ids {
          cid, _ := raw.(string)
          if cid == "" { continue }
          stt, err := st.GetConsentStatus(c, tenantOf(c), cid, "email")
          if err != nil || strings.ToUpper(stt) != "GRANTED" {
            c.JSON(403, gin.H{"error":"consent required", "contact_id": cid})
            return
          }
        }
      }
    }
    // frequency cap
    if rule.DailyFrequencyCap > 0 {
      if ids, ok := req.Payload["contact_ids"].([]interface{}); ok {
        for _, raw := range ids {
          cid, _ := raw.(string)
          if cid == "" { continue }
          cnt, err := st.IncFrequencyCap(c, tenantOf(c), cid, "email", time.Now())
          if err != nil { c.JSON(500, gin.H{"error":"frequency cap db"}); return }
          if cnt > rule.DailyFrequencyCap {
            c.JSON(429, gin.H{"error":"daily_frequency_cap exceeded", "contact_id": cid, "cap": rule.DailyFrequencyCap, "count": cnt})
            return
          }
        }
      }
    }
  }

  // Determine approval requirements
  needsApproval := false
  approvalReason := ""

  // Direct match
  if pol.IsActionApprovalRequired(req.ActionType) {
    needsApproval = true
    approvalReason = "policy.required_for"
  }

  // Derived rule: ADS_BUDGET_UPDATE over threshold -> treat as special approval action
  if strings.ToUpper(req.ActionType) == "ADS_BUDGET_UPDATE" {
    if rule, ok := pol.Channels["ads"]; ok && rule.MaxBudgetDeltaPct > 0 {
      if pct, ok2 := policy.BudgetDeltaPct(req.Payload); ok2 && pct > float64(rule.MaxBudgetDeltaPct) {
        c.JSON(403, gin.H{"error":"max_budget_delta_pct exceeded", "max": rule.MaxBudgetDeltaPct, "got": pct})
        return
      }
    }
    if pct, ok2 := policy.BudgetDeltaPct(req.Payload); ok2 && pct > 10 {
      // if policy uses the named gate
      if pol.IsActionApprovalRequired("ADS_BUDGET_UPDATE_OVER_10PCT") {
        needsApproval = true
        approvalReason = "derived.ADS_BUDGET_UPDATE_OVER_10PCT"
      }
    }
  }

  execID := uuid.NewString()
  reqJSON, _ := json.Marshal(req)
  _ = st.CreateExecution(c, execID, tenantOf(c), req.IdempotencyKey, channel, provider, req.ActionType, "QUEUED", reqJSON, polRow.Version, polHash, userOf(c))

  if needsApproval {
    approvalID := uuid.NewString()
        approversJSON, _ := json.Marshal(pol.Approvals.ApproverRoles)
    _ = st.CreateApproval(c, approvalID, tenantOf(c), req.ActionType, req.RequestedBy, req.Reason, pol.Approvals.RequiredSteps, approversJSON)
    _ = st.AttachApprovalToExecution(c, tenantOf(c), execID, approvalID)
    _ = st.Audit(c, tenantOf(c), execID, "AWAITING_APPROVAL", map[string]interface{}{"approval_id": approvalID, "why": approvalReason})
    c.JSON(202, gin.H{"status":"AWAITING_APPROVAL", "execution_id": execID, "approval_id": approvalID})
    return
  }

  payload := map[string]interface{}{
    "execution_id": execID,
    "tenant_id": tenantOf(c),
    "dry_run": cfg.DryRun,
    "channel": channel,
    "provider": provider,
    "action_type": req.ActionType,
    "payload": req.Payload,
  }
  payloadJSON, _ := json.Marshal(payload)
  _ = st.EnqueueOutbox(c, tenantOf(c), execID, payloadJSON)
  _ = st.Audit(c, tenantOf(c), execID, "EXECUTION_QUEUED", map[string]interface{}{"provider": provider})

  c.JSON(201, gin.H{"status":"QUEUED", "execution_id": execID})
})

  r.POST("/v1/ma/contacts/upsert", func(c *gin.Context) {
    var body map[string]interface{}
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if err := st.UpsertContact(c, tenantOf(c), body); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, gin.H{"ok": true})
  })

  r.POST("/v1/ma/consent", func(c *gin.Context) {
    var body map[string]interface{}
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if err := st.UpsertConsent(c, tenantOf(c), body); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, gin.H{"ok": true})
  })

  r.POST("/v1/ma/templates/upsert", func(c *gin.Context) {
    var body map[string]interface{}
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if err := st.UpsertTemplate(c, tenantOf(c), body); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, gin.H{"ok": true})
  })

  r.POST("/v1/ma/journeys/upsert", func(c *gin.Context) {
    var body map[string]interface{}
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if err := st.UpsertJourney(c, tenantOf(c), body); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, gin.H{"ok": true})
  })

  r.POST("/v1/ma/journeys/:id/enroll", func(c *gin.Context) {
    jid := c.Param("id")
    var body map[string]interface{}
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    body["journey_id"] = jid
    if err := st.CreateEnrollment(c, tenantOf(c), body); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(202, gin.H{"status":"ENROLLED"})
  })



// --- Executions ---
  r.GET("/v1/executions", auth.RequireRole("analyst","marketer","admin","approver"), func(c *gin.Context) {
    limit := 50
    if v := c.Query("limit"); v != "" {
      // ignore parse errors
      if n, err := strconv.Atoi(v); err == nil { limit = n }
    }
    rows, err := st.ListExecutions(c, tenantOf(c), limit)
    if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, gin.H{"items": rows})
  })

  r.GET("/v1/executions/:id", auth.RequireRole("analyst","marketer","admin","approver"), func(c *gin.Context) {
    id := c.Param("id")
    b, err := st.GetExecution(c, tenantOf(c), id)
    if err != nil { c.JSON(404, gin.H{"error":"not found"}); return }
    var obj map[string]interface{}
    _ = json.Unmarshal(b, &obj)
    aud, _ := st.ListAuditEvents(c, tenantOf(c), id, 200)
    obj["audit"] = aud
    c.JSON(200, obj)
  })

// --- Approvals (V283) ---
r.GET("/v1/approvals/pending", auth.RequireRole("approver","admin","marketer"), func(c *gin.Context) {
  rows, err := st.ListPendingApprovals(c, tenantOf(c), 200)
  if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  c.JSON(200, rows)
})

r.POST("/v1/approvals/:id/decide", auth.RequireRole("approver","admin"), func(c *gin.Context) {
  id := c.Param("id")
  var body map[string]interface{}
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
  status, _ := body["status"].(string)
  status = strings.ToUpper(status)
  approvedBy, _ := body["approved_by"].(string)
  reason, _ := body["reason"].(string)
  if status != "APPROVED" && status != "REJECTED" { c.JSON(400, gin.H{"error":"status must be APPROVED or REJECTED"}); return }
  if approvedBy == "" { approvedBy = userOf(c); if approvedBy=="" { approvedBy="approver" } }

  appr, err := st.DecideApproval(c, tenantOf(c), id, status, approvedBy, reason)
  if err != nil { c.JSON(500, gin.H{"error":"db"}); return }


  // If approved, find executions waiting for this approval and enqueue them.
  // (Simple implementation: client passes execution_id as well to avoid joins.)
  execID, _ := body["execution_id"].(string)
  if appr.Status == "APPROVED" && execID != "" {
    _ = st.QueueExecutionAfterApproval(c, tenantOf(c), execID)
    // Re-enqueue outbox from stored request
    row, err := st.GetExecution(c, tenantOf(c), execID)
    if err == nil {
      var obj map[string]interface{}
      _ = json.Unmarshal(row, &obj)
      reqObj, _ := obj["request"].(map[string]interface{})
      payload, _ := reqObj["payload"].(map[string]interface{})
      channel, _ := obj["channel"].(string)
      provider, _ := obj["provider"].(string)
      actionType, _ := obj["action_type"].(string)
      out := map[string]interface{}{
        "execution_id": execID,
        "tenant_id": tenantOf(c),
        "dry_run": cfg.DryRun,
        "channel": channel,
        "provider": provider,
        "action_type": actionType,
        "payload": payload,
      }
      b, _ := json.Marshal(out)
      _ = st.EnqueueOutbox(c, tenantOf(c), execID, b)
      _ = st.Audit(c, tenantOf(c), execID, "EXECUTION_QUEUED_AFTER_APPROVAL", map[string]interface{}{"approval_id": id, "approved_by": approvedBy})
    }
  }
  c.JSON(200, gin.H{"ok": true})
})

// --- ROI ingestion & reporting (V283) ---
r.POST("/v1/roi/metrics/ads", auth.RequireRole("analyst","admin"), func(c *gin.Context) {
  var body struct{
    Day string `json:"day"` // YYYY-MM-DD
    Rows []map[string]interface{} `json:"rows"`
  }
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
  if body.Day == "" { c.JSON(400, gin.H{"error":"day required (YYYY-MM-DD)"}); return }
  for _, r := range body.Rows {
    ch, _ := r["channel"].(string)
    pr, _ := r["provider"].(string)
    camp, _ := r["campaign_id"].(string)
    ag, _ := r["adgroup_id"].(string)
    spend, _ := r["spend"].(float64)
    imp, _ := r["impressions"].(float64)
    clk, _ := r["clicks"].(float64)
    conv, _ := r["conversions"].(float64)
    meta, _ := json.Marshal(r["meta"])
    if ch == "" { ch = "ads" }
    var pptr *string = nil; if pr != "" { pptr = &pr }
    var cptr *string = nil; if camp != "" { cptr = &camp }
    var aptr *string = nil; if ag != "" { aptr = &ag }
    _ = st.UpsertChannelMetric(c, tenantOf(c), body.Day, strings.ToLower(ch), pptr, cptr, aptr, spend, int64(imp), int64(clk), int64(conv), meta)
  }
  c.JSON(200, gin.H{"ok": true, "rows": len(body.Rows)})
})

r.POST("/v1/roi/conversions", auth.RequireRole("analyst","admin"), func(c *gin.Context) {
  var body struct{
    Events []map[string]interface{} `json:"events"`
  }
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
  for _, e := range body.Events {
    ts, _ := e["occurred_at"].(string)
    t, err := time.Parse(time.RFC3339, ts)
    if err != nil { c.JSON(400, gin.H{"error":"occurred_at must be RFC3339"}); return }
    cid, _ := e["contact_id"].(string)
    rev, _ := e["revenue"].(float64)
    cur, _ := e["currency"].(string)
    ch, _ := e["channel"].(string)
    pr, _ := e["provider"].(string)
    camp, _ := e["campaign_id"].(string)
    meta, _ := json.Marshal(e["meta"])
    var cptr *string=nil; if cid!="" { cptr=&cid }
    var chptr *string=nil; if ch!="" { chptr=&ch }
    var prptr *string=nil; if pr!="" { prptr=&pr }
    var campptr *string=nil; if camp!="" { campptr=&camp }
    if cur=="" { cur="KRW" }
    _ = st.InsertConversionEvent(c, tenantOf(c), t, cptr, rev, cur, chptr, prptr, campptr, meta)
  }
  c.JSON(200, gin.H{"ok": true, "events": len(body.Events)})
})

r.GET("/v1/roi/summary", auth.RequireRole("analyst","marketer","admin"), func(c *gin.Context) {
  from := c.Query("from")
  to := c.Query("to")
  if from=="" || to=="" { c.JSON(400, gin.H{"error":"from & to required (YYYY-MM-DD)"}); return }
  rows, err := st.GetROISummary(c, tenantOf(c), from, to)
  if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  c.JSON(200, rows)
})

// --- Experiments (holdout / incrementality) ---
r.POST("/v1/roi/experiments", auth.RequireRole("analyst","admin"), func(c *gin.Context) {
  var body map[string]interface{}
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
  id, _ := body["experiment_id"].(string)
  name, _ := body["name"].(string)
  status, _ := body["status"].(string)
  if id=="" { id = uuid.NewString() }
  if name=="" { name = "Experiment " + id }
  if status=="" { status="DRAFT" }
  hp := 10
  if v, ok := body["holdout_pct"].(float64); ok { hp = int(v) }
  def, _ := json.Marshal(body["definition"])
  var startAt *time.Time=nil; var endAt *time.Time=nil
  if s, ok := body["start_at"].(string); ok && s!="" { if t,err:=time.Parse(time.RFC3339,s); err==nil { startAt=&t } }
  if s, ok := body["end_at"].(string); ok && s!="" { if t,err:=time.Parse(time.RFC3339,s); err==nil { endAt=&t } }
  if err := st.UpsertExperiment(c, tenantOf(c), id, name, strings.ToUpper(status), hp, startAt, endAt, def); err != nil {
    c.JSON(500, gin.H{"error":"db"}); return
  }
  c.JSON(201, gin.H{"ok": true, "experiment_id": id})
})

r.POST("/v1/roi/experiments/:id/allocate", auth.RequireRole("analyst","admin"), func(c *gin.Context) {
  expID := c.Param("id")
  var body map[string]interface{}
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
  unit, _ := body["unit_id"].(string)
  if unit=="" { c.JSON(400, gin.H{"error":"unit_id required"}); return }
  holdoutPct, _, err := st.GetExperiment(c, tenantOf(c), expID)
  if err != nil { c.JSON(404, gin.H{"error":"experiment not found"}); return }
  grp := policy.DeterministicGroup(expID, unit, holdoutPct)
  _ = st.UpsertAllocation(c, tenantOf(c), expID, unit, grp)
  c.JSON(200, gin.H{"experiment_id": expID, "unit_id": unit, "group": grp})
})

r.POST("/v1/roi/experiments/:id/outcome", auth.RequireRole("analyst","admin"), func(c *gin.Context) {
  expID := c.Param("id")
  var body map[string]interface{}
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
  unit, _ := body["unit_id"].(string)
  if unit=="" { c.JSON(400, gin.H{"error":"unit_id required"}); return }
  conv := int64(0)
  if v, ok := body["conversions"].(float64); ok { conv=int64(v) }
  rev := 0.0
  if v, ok := body["revenue"].(float64); ok { rev=v }
  meta, _ := json.Marshal(body["meta"])
  if err := st.InsertOutcome(c, tenantOf(c), expID, unit, conv, rev, meta); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  c.JSON(200, gin.H{"ok": true})
})

r.GET("/v1/roi/experiments/:id/report", auth.RequireRole("analyst","marketer","admin"), func(c *gin.Context) {
  expID := c.Param("id")
  holdoutPct, _, err := st.GetExperiment(c, tenantOf(c), expID)
  if err != nil { c.JSON(404, gin.H{"error":"experiment not found"}); return }
  rep, err := st.GetExperimentReport(c, tenantOf(c), expID, holdoutPct)
  if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  c.JSON(200, rep)
})
  r.GET("/v1/audit/executions/:id", func(c *gin.Context) {
    id := c.Param("id")
    row, err := st.GetExecution(c, tenantOf(c), id)
    if err != nil { c.JSON(404, gin.H{"error":"not found"}); return }
    c.Data(200, "application/json", row)
  })

  r.GET("/v1/audit/executions/:id/events", func(c *gin.Context) {
    id := c.Param("id")
    events, err := st.ListAuditEvents(c, tenantOf(c), id, 200)
    if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, events)
  })
}
