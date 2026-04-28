package httpapi

import (
  "encoding/json"
  "net/http"
  "strings"
  "time"
  "strconv"

  "genie_roi/gateway/internal/policy"
  "genie_roi/gateway/internal/render"
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


  // --- V285: Segments ---
  r.POST("/v1/segments", func(c *gin.Context) {
    var body struct{
      SegmentID string `json:"segment_id"`
      Name string `json:"name"`
      Definition json.RawMessage `json:"definition"`
      IsDynamic *bool `json:"is_dynamic"`
    }
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if body.SegmentID == "" { body.SegmentID = uuid.NewString() }
    if body.Name == "" { c.JSON(400, gin.H{"error":"name required"}); return }
    dyn := true
    if body.IsDynamic != nil { dyn = *body.IsDynamic }
    if len(body.Definition) == 0 { body.Definition = []byte(`{"filters":[]}`) }
    if err := st.UpsertSegment(c, tenantOf(c), body.SegmentID, body.Name, []byte(body.Definition), dyn); err != nil {
      c.JSON(500, gin.H{"error":"db"}); return
    }
    c.JSON(200, gin.H{"segment_id": body.SegmentID})
  })

  r.GET("/v1/segments", func(c *gin.Context) {
    segs, err := st.ListSegments(c, tenantOf(c))
    if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    out := []gin.H{}
    for _, srow := range segs {
      out = append(out, gin.H{
        "segment_id": srow.SegmentID, "name": srow.Name, "is_dynamic": srow.IsDynamic,
        "updated_at": srow.UpdatedAt,
      })
    }
    c.JSON(200, out)
  })

  r.GET("/v1/segments/:id", func(c *gin.Context) {
    sid := c.Param("id")
    seg, err := st.GetSegment(c, tenantOf(c), sid)
    if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    if seg == nil { c.JSON(404, gin.H{"error":"not found"}); return }
    c.JSON(200, gin.H{
      "segment_id": seg.SegmentID, "name": seg.Name, "is_dynamic": seg.IsDynamic,
      "definition": json.RawMessage(seg.DefinitionJSON), "updated_at": seg.UpdatedAt,
    })
  })

  // Recompute segment membership (simple safe SQL builder over contacts + optional events)
  r.POST("/v1/segments/:id/recompute", func(c *gin.Context) {
    sid := c.Param("id")
    seg, err := st.GetSegment(c, tenantOf(c), sid)
    if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    if seg == nil { c.JSON(404, gin.H{"error":"not found"}); return }

    ids, err := st.ComputeSegmentMembers(c, tenantOf(c), seg.DefinitionJSON)
    if err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if err := st.ReplaceSegmentMembers(c, tenantOf(c), sid, ids); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, gin.H{"segment_id": sid, "members": len(ids)})
  })

  // --- V285: Events ingest ---
  r.POST("/v1/events", func(c *gin.Context) {
    var body struct{
      Events []store.EventRow `json:"events"`
    }
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if len(body.Events) == 0 { c.JSON(400, gin.H{"error":"events required"}); return }
    // ensure occurred_at; if absent, set now
    now := time.Now().UTC()
    for i := range body.Events {
      if body.Events[i].EventID == "" { body.Events[i].EventID = uuid.NewString() }
      if body.Events[i].OccurredAt.IsZero() { body.Events[i].OccurredAt = now }
    }
    if err := st.InsertEvents(c, tenantOf(c), body.Events); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, gin.H{"inserted": len(body.Events)})
  })

  // --- V285: Connector Accounts ---
  r.POST("/v1/connectors/accounts", func(c *gin.Context) {
    var body struct{
      Provider string `json:"provider"`
      AccountID string `json:"account_id"`
      Config json.RawMessage `json:"config"`
      Status string `json:"status"`
    }
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if body.Provider == "" || body.AccountID == "" { c.JSON(400, gin.H{"error":"provider/account_id required"}); return }
    if len(body.Config) == 0 { body.Config = []byte(`{}`) }
    if body.Status == "" { body.Status = "ACTIVE" }
    if err := st.UpsertConnectorAccount(c, tenantOf(c), strings.ToLower(body.Provider), body.AccountID, []byte(body.Config), body.Status); err != nil {
      c.JSON(500, gin.H{"error":"db"}); return
    }
    c.JSON(200, gin.H{"ok": true})
  })

  r.GET("/v1/connectors/accounts", func(c *gin.Context) {
    rows, err := st.ListConnectorAccounts(c, tenantOf(c))
    if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    out := []gin.H{}
    for _, r0 := range rows {
      out = append(out, gin.H{
        "provider": r0.Provider, "account_id": r0.AccountID, "status": r0.Status,
        "last_sync_at": r0.LastSyncAt, "updated_at": r0.UpdatedAt,
      })
    }
    c.JSON(200, out)
  })

  // --- V285: Message Experiments (A/B + Holdout assignment) ---
  r.POST("/v1/experiments/message", func(c *gin.Context) {
    var body struct{
      ExperimentID string `json:"experiment_id"`
      Name string `json:"name"`
      Channel string `json:"channel"`
      Status string `json:"status"`
      HoldoutPct int `json:"holdout_pct"`
      Variants json.RawMessage `json:"variants"`
      Policy json.RawMessage `json:"policy"`
    }
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if body.ExperimentID == "" { body.ExperimentID = uuid.NewString() }
    if body.Name == "" { c.JSON(400, gin.H{"error":"name required"}); return }
    if body.Channel == "" { body.Channel = "email" }
    if body.Status == "" { body.Status = "DRAFT" }
    if len(body.Variants) == 0 { body.Variants = []byte(`[]`) }
    if len(body.Policy) == 0 { body.Policy = []byte(`{}`) }
    if body.HoldoutPct < 0 { body.HoldoutPct = 0 }
    if body.HoldoutPct > 100 { body.HoldoutPct = 100 }
    if err := st.UpsertMessageExperiment(c, tenantOf(c), body.ExperimentID, body.Name, body.Channel, body.Status, body.HoldoutPct, []byte(body.Variants), []byte(body.Policy)); err != nil {
      c.JSON(500, gin.H{"error":"db"}); return
    }
    c.JSON(200, gin.H{"experiment_id": body.ExperimentID})
  })

  r.POST("/v1/experiments/message/:id/allocate", func(c *gin.Context) {
    eid := c.Param("id")
    var body struct{
      ContactID string `json:"contact_id"`
    }
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if body.ContactID == "" { c.JSON(400, gin.H{"error":"contact_id required"}); return }

    // Idempotent: return existing assignment if present.
    if existing, err := st.GetMessageAssignment(c, tenantOf(c), eid, body.ContactID); err == nil && existing != "" {
      c.JSON(200, gin.H{"assignment": existing, "cached": true}); return
    }

    exp, err := st.GetMessageExperiment(c, tenantOf(c), eid)
    if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    if exp == nil { c.JSON(404, gin.H{"error":"not found"}); return }

    assignment, err := policy.AssignMessageExperiment(exp, tenantOf(c), body.ContactID)
    if err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if err := st.UpsertMessageAssignment(c, tenantOf(c), eid, body.ContactID, assignment); err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    c.JSON(200, gin.H{"assignment": assignment, "cached": false})
  })


  // --- V286: Templates (CRUD + render preview) ---
  r.GET("/v1/templates", func(c *gin.Context) {
    rows, err := st.ListTemplates(c, tenantOf(c), 200)
    if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
    out := []gin.H{}
    for _, t := range rows {
      out = append(out, gin.H{"template_id": t.TemplateID, "subject": t.Subject, "body": t.Body, "updated_at": t.UpdatedAt})
    }
    c.JSON(200, out)
  })

  r.GET("/v1/templates/:id", func(c *gin.Context) {
    tid := c.Param("id")
    t, err := st.GetTemplate(c, tenantOf(c), tid)
    if err != nil { c.JSON(404, gin.H{"error":"not found"}); return }
    c.JSON(200, gin.H{"template_id": t.TemplateID, "subject": t.Subject, "body": t.Body, "updated_at": t.UpdatedAt})
  })

  r.POST("/v1/templates", auth.RequireRole("admin","marketer"), func(c *gin.Context) {
    var body struct{
      TemplateID string `json:"template_id"`
      Subject string `json:"subject"`
      Body string `json:"body"`
    }
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if body.TemplateID == "" { body.TemplateID = uuid.NewString() }
    if body.Subject == "" { c.JSON(400, gin.H{"error":"subject required"}); return }
    if body.Body == "" { c.JSON(400, gin.H{"error":"body required"}); return }
    if err := st.UpsertTemplate(c, tenantOf(c), body.TemplateID, body.Subject, body.Body, userOf(c)); err != nil {
      c.JSON(500, gin.H{"error":"db"}); return
    }
    c.JSON(200, gin.H{"template_id": body.TemplateID})
  })

  r.POST("/v1/templates/:id/render", func(c *gin.Context) {
    tid := c.Param("id")
    t, err := st.GetTemplate(c, tenantOf(c), tid)
    if err != nil { c.JSON(404, gin.H{"error":"not found"}); return }
    var body struct{
      ContactID string `json:"contact_id"`
      Data map[string]interface{} `json:"data"`
    }
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    data := map[string]interface{}{}
    for k,v := range body.Data { data[k]=v }
    // If contact provided, add attrs.email and attrs.*
    if body.ContactID != "" {
      // Fetch contact attributes
      var email string
      var attrsJSON []byte
      if err := pg.Pool.QueryRow(c, `SELECT email, attributes_json FROM contacts WHERE tenant_id=$1 AND contact_id=$2`, tenantOf(c), body.ContactID).Scan(&email, &attrsJSON); err == nil {
        attrs, _ := render.ParseContact(attrsJSON)
        data["contact_id"] = body.ContactID
        data["email"] = email
        data["attrs"] = attrs
      }
    }
    subj, err := render.RenderText(t.Subject, data)
    if err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    bod, err := render.RenderText(t.Body, data)
    if err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    c.JSON(200, gin.H{"subject": subj, "body": bod})
  })

  // --- V286: Email campaign send (segment + template(s) + optional message experiment allocation) ---
  r.POST("/v1/email/campaigns/send", auth.RequireRole("admin","marketer"), func(c *gin.Context) {
    var body struct{
      CampaignID string `json:"campaign_id"`
      Name string `json:"name"`
      SegmentID string `json:"segment_id"`
      Provider string `json:"provider"` // ses|sendgrid
      FromEmail string `json:"from_email"`
      ReplyTo string `json:"reply_to"`
      TemplateA string `json:"template_a"`
      TemplateB string `json:"template_b"`
      ExperimentID string `json:"experiment_id"`
      MaxRecipients int `json:"max_recipients"`
    }
    if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error": err.Error()}); return }
    if body.CampaignID == "" { body.CampaignID = uuid.NewString() }
    if body.Name == "" { body.Name = "Email Campaign" }
    if body.SegmentID == "" { c.JSON(400, gin.H{"error":"segment_id required"}); return }
    if body.Provider == "" { body.Provider = "ses" }
    if body.TemplateA == "" { c.JSON(400, gin.H{"error":"template_a required"}); return }
    if body.MaxRecipients <= 0 { body.MaxRecipients = 500 }
    var expID *string
    if body.ExperimentID != "" { expID = &body.ExperimentID }
    var from *string
    if body.FromEmail != "" { from = &body.FromEmail }
    var reply *string
    if body.ReplyTo != "" { reply = &body.ReplyTo }
    createdBy := userOf(c)
    if err := st.CreateEmailCampaign(c, tenantOf(c), body.CampaignID, body.Name, body.SegmentID, expID, from, reply, &createdBy); err != nil {
      c.JSON(500, gin.H{"error":"db"}); return
    }
    _ = st.StartEmailCampaign(c, tenantOf(c), body.CampaignID)

    contacts, err := st.ListContactsInSegment(c, tenantOf(c), body.SegmentID, body.MaxRecipients)
    if err != nil { c.JSON(500, gin.H{"error":"db"}); return }

    // Load templates
    ta, err := st.GetTemplate(c, tenantOf(c), body.TemplateA)
    if err != nil { c.JSON(400, gin.H{"error":"template_a not found"}); return }
    var tb store.TemplateRow
    hasB := false
    if body.TemplateB != "" {
      if tbb, err := st.GetTemplate(c, tenantOf(c), body.TemplateB); err == nil { tb = tbb; hasB = true }
    }

    
    polRow, err := st.GetLatestPolicy(c, tenantOf(c))
    if err != nil { c.JSON(500, gin.H{"error":"policy"}); return }
    pol, err := policy.Parse(polRow.PolicyJSON)
    if err != nil { c.JSON(500, gin.H{"error":"policy_parse"}); return }
sent := 0
    skipped := 0
    failed := 0

    for _, cr := range contacts {
      if cr.Email == "" { skipped++; _ = st.InsertEmailDelivery(c, tenantOf(c), body.CampaignID, cr.ContactID, "SKIPPED", body.TemplateA, "", "SKIPPED", func() *string { s := "missing email"; return &s }()); continue }

      // Policy: enforce consent + daily frequency cap
      if rule, ok := pol.Channels["email"]; ok {
        if rule.RequireConsent {
          var stConsent string
          err := pg.Pool.QueryRow(c, `SELECT status FROM consent WHERE tenant_id=$1 AND contact_id=$2 AND channel='email'`, tenantOf(c), cr.ContactID).Scan(&stConsent)
          if err != nil || strings.ToUpper(stConsent) != "GRANTED" {
            skipped++
            _ = st.InsertEmailDelivery(c, tenantOf(c), body.CampaignID, cr.ContactID, "SKIPPED", body.TemplateA, "", "SKIPPED", func() *string { s := "consent required"; return &s }())
            continue
          }
        }
        if rule.DailyFrequencyCap > 0 {
          var cnt int
          _ = pg.Pool.QueryRow(c, `SELECT COUNT(1) FROM email_deliveries WHERE tenant_id=$1 AND contact_id=$2 AND created_at::date = now()::date AND status IN ('PENDING','SENT')`, tenantOf(c), cr.ContactID).Scan(&cnt)
          if cnt >= rule.DailyFrequencyCap {
            skipped++
            _ = st.InsertEmailDelivery(c, tenantOf(c), body.CampaignID, cr.ContactID, "SKIPPED", body.TemplateA, "", "SKIPPED", func() *string { s := "frequency cap"; return &s }())
            continue
          }
        }
      }

      attrs, _ := render.ParseContact(cr.AttributesJSON)
      data := map[string]interface{}{"contact_id": cr.ContactID, "email": cr.Email, "attrs": attrs}

      assignment := "A"
      chosenTemplate := ta
      chosenTemplateID := body.TemplateA

      // If message experiment exists, use it; else if templateB provided, do 50/50 deterministic.
      if body.ExperimentID != "" {
        if existing, err := st.GetMessageAssignment(c, tenantOf(c), body.ExperimentID, cr.ContactID); err == nil && existing != "" {
          assignment = existing
        } else if exp, err := st.GetMessageExperiment(c, tenantOf(c), body.ExperimentID); err == nil && exp != nil {
          a, _ := policy.AssignMessageExperiment(exp, tenantOf(c), cr.ContactID)
          assignment = a
          _ = st.UpsertMessageAssignment(c, tenantOf(c), body.ExperimentID, cr.ContactID, assignment)
        }
      } else if hasB {
        // 50/50 deterministic
        h := uuid.NewSHA1(uuid.NameSpaceOID, []byte(tenantOf(c)+"|"+body.CampaignID+"|"+cr.ContactID)).String()
        if strings.HasPrefix(h, "a") || strings.HasPrefix(h, "b") || strings.HasPrefix(h, "c") || strings.HasPrefix(h, "d") || strings.HasPrefix(h, "e") || strings.HasPrefix(h, "f") || strings.HasPrefix(h, "0") {
          assignment = "A"
        } else { assignment = "B" }
      }

      if assignment == "HOLDOUT" {
        skipped++
        _ = st.InsertEmailDelivery(c, tenantOf(c), body.CampaignID, cr.ContactID, "HOLDOUT", chosenTemplateID, "", "SKIPPED", nil)
        continue
      }
      if assignment == "B" && hasB {
        chosenTemplate = tb
        chosenTemplateID = body.TemplateB
      }

      subj, err := render.RenderText(chosenTemplate.Subject, data)
      if err != nil { failed++; _ = st.InsertEmailDelivery(c, tenantOf(c), body.CampaignID, cr.ContactID, assignment, chosenTemplateID, "", "FAILED", func() *string { s := err.Error(; return &s }())); continue }
      bod, err := render.RenderText(chosenTemplate.Body, data)
      if err != nil { failed++; _ = st.InsertEmailDelivery(c, tenantOf(c), body.CampaignID, cr.ContactID, assignment, chosenTemplateID, "", "FAILED", func() *string { s := err.Error(; return &s }())); continue }

      // Create execution + enqueue outbox (governed by pinned policy)
      idem := body.CampaignID + ":" + cr.ContactID
      reqBytes, _ := json.Marshal(req)
      execID := uuid.NewString()
      _ = st.CreateExecution(c, execID, tenantOf(c), idem, "email", strings.ToLower(body.Provider), "EMAIL_SEND", "QUEUED", reqBytes, pol.Version, polRow.PolicyHash, userOf(c))
      _ = st.EnqueueOutbox(c, tenantOf(c), execID, reqBytes)

      sent++
      _ = st.InsertEmailDelivery(c, tenantOf(c), body.CampaignID, cr.ContactID, assignment, chosenTemplateID, execID, "PENDING", nil)
    }

    _ = st.FinishEmailCampaign(c, tenantOf(c), body.CampaignID)
    c.JSON(200, gin.H{"campaign_id": body.CampaignID, "sent": sent, "skipped": skipped, "failed": failed})
  })

// --- V287: Campaign triggers (event-driven send) ---
r.POST("/v1/campaigns/:id/triggers", auth.RequireRole("marketer","admin"), func(c *gin.Context) {
  var body struct{
    EventType string `json:"event_type"`
    WithinMinutes int `json:"within_minutes"`
    Enabled bool `json:"enabled"`
  }
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error":"bad_request"}); return }
  if body.WithinMinutes <= 0 { body.WithinMinutes = 60 }
  if err := st.UpsertCampaignTrigger(c, tenantOf(c), c.Param("id"), body.EventType, body.WithinMinutes, body.Enabled); err != nil {
    c.JSON(500, gin.H{"error":"db"}); return
  }
  c.JSON(200, gin.H{"campaign_id": c.Param("id"), "event_type": body.EventType, "within_minutes": body.WithinMinutes, "enabled": body.Enabled})
})

r.GET("/v1/campaigns/:id/triggers", auth.RequireRole("marketer","analyst","admin"), func(c *gin.Context) {
  tr, err := st.GetCampaignTrigger(c, tenantOf(c), c.Param("id"))
  if err != nil { c.JSON(404, gin.H{"error":"not_found"}); return }
  c.JSON(200, gin.H{"campaign_id": tr.CampaignID, "event_type": tr.EventType, "within_minutes": tr.WithinMinutes, "enabled": tr.Enabled, "created_at": tr.CreatedAt})
})

// --- V287: Webhooks (email providers) + normalized message events ---
// This endpoint is intentionally provider-agnostic for the scaffold; production setups usually expose provider-specific endpoints.
r.POST("/v1/webhooks/email", func(c *gin.Context) {
  var body struct{
    Provider string `json:"provider"`
    EventID string `json:"event_id"`
    MessageID string `json:"message_id"`
    CampaignID string `json:"campaign_id"`
    ContactID string `json:"contact_id"`
    EventType string `json:"event_type"`
    Meta map[string]interface{} `json:"meta"`
    Raw json.RawMessage `json:"raw"`
  }
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error":"bad_request"}); return }
  // Store raw webhook for audit (if provided). If not, store the entire body as raw.
  raw := body.Raw
  if len(raw) == 0 {
    raw, _ = json.Marshal(body)
  }
  _ = st.InsertProviderWebhookEvent(c, tenantOf(c), body.Provider, body.EventID, raw)

  meta, _ := json.Marshal(body.Meta)
  _ = st.InsertMessageEvent(c, tenantOf(c), body.CampaignID, body.ContactID, body.Provider, body.MessageID, strings.ToUpper(body.EventType), meta)

  c.JSON(200, gin.H{"ok": true})
})

// --- V287: Attribution linking (last-touch within lookback) ---
r.POST("/v1/attribution/link", auth.RequireRole("analyst","admin"), func(c *gin.Context) {
  var body struct{
    ConversionID string `json:"conversion_id"`
    ContactID string `json:"contact_id"`
    LookbackDays int `json:"lookback_days"`
  }
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error":"bad_request"}); return }
  if body.LookbackDays <= 0 { body.LookbackDays = 7 }
  res, err := st.LinkAttributionLastTouch(c, tenantOf(c), body.ConversionID, body.ContactID, body.LookbackDays)
  if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  c.JSON(200, res)
})


// --- V287: Collector checkpoints (incremental sync cursors) ---
r.GET("/v1/collectors/checkpoints/:provider/:account", auth.RequireRole("admin","analyst"), func(c *gin.Context) {
  row, err := st.GetCollectorCheckpoint(c, tenantOf(c), c.Param("provider"), c.Param("account"))
  if err != nil { c.JSON(404, gin.H{"error":"not_found"}); return }
  c.JSON(200, gin.H{"provider": row.Provider, "account_id": row.AccountID, "cursor": row.Cursor, "updated_at": row.UpdatedAt})
})
r.POST("/v1/collectors/checkpoints/:provider/:account", auth.RequireRole("admin","analyst"), func(c *gin.Context) {
  var body struct{ Cursor *string `json:"cursor"` }
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error":"bad_request"}); return }
  if err := st.UpsertCollectorCheckpoint(c, tenantOf(c), c.Param("provider"), c.Param("account"), body.Cursor); err != nil {
    c.JSON(500, gin.H{"error":"db"}); return
  }
  c.JSON(200, gin.H{"ok": true})
})

// --- V288: Provider webhooks -> normalized message events ---
r.POST("/v1/webhooks/email", func(c *gin.Context) {
  // No API key: webhooks may come from providers. Protect with shared secret if configured.
  secret := strings.TrimSpace(cfg.WebhookSecret)
  if secret != "" {
    if c.GetHeader("X-Webhook-Secret") != secret { c.JSON(401, gin.H{"error":"unauthorized"}); return }
  }
  var body map[string]any
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error":"bad_request"}); return }
  provider, _ := body["provider"].(string)
  eventType, _ := body["event_type"].(string)
  if provider == "" { provider = "unknown" }
  if eventType == "" { eventType = "unknown" }
  // store raw
  _ = st.InsertProviderWebhookEvent(c, tenantOf(c), provider, eventType, body)

  // normalize (best effort)
  msgID := ""
  if v, ok := body["message_id"].(string); ok { msgID = v }
  contactID := ""
  if v, ok := body["contact_id"].(string); ok { contactID = v }
  occurredAt := time.Now().UTC()
  if v, ok := body["occurred_at"].(string); ok {
    if t, err := time.Parse(time.RFC3339, v); err == nil { occurredAt = t }
  }
  var msgPtr *string = nil
  if msgID != "" { msgPtr = &msgID }
  var cPtr *string = nil
  if contactID != "" { cPtr = &contactID }

  // Map event types
  norm := strings.ToUpper(eventType)
  if norm == "OPENED" { norm = "OPEN" }
  if norm == "CLICKED" { norm = "CLICK" }
  if norm == "DELIVERED" { norm = "DELIVERED" }
  if norm == "BOUNCE" || norm == "BOUNCED" { norm = "BOUNCE" }

  _ = st.InsertMessageEvent(c, tenantOf(c), provider, norm, msgPtr, cPtr, occurredAt, body)
  c.JSON(200, gin.H{"ok": true})
})

// --- V288: Attribution link (last-touch) ---
r.POST("/v1/attribution/link", auth.RequireRole("admin","analyst","marketer"), func(c *gin.Context) {
  var body struct{
    ConversionID string `json:"conversion_id"`
    ContactID *string `json:"contact_id"`
    LookbackHours int `json:"lookback_hours"`
  }
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error":"bad_request"}); return }
  if body.LookbackHours == 0 { body.LookbackHours = 168 }
  id, err := st.LinkAttributionLastTouch(c, tenantOf(c), body.ConversionID, body.ContactID, body.LookbackHours)
  if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  c.JSON(200, gin.H{"id": id})
})

// --- V288: Influencers / Products ---
r.POST("/v1/influencers", auth.RequireRole("admin","marketer","analyst"), func(c *gin.Context) {
  var body struct{
    Name string `json:"name"`
    Handle *string `json:"handle"`
    Categories any `json:"categories"`
    Notes *string `json:"notes"`
  }
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error":"bad_request"}); return }
  if body.Categories == nil { body.Categories = []any{} }
  id, err := st.CreateInfluencer(c, tenantOf(c), body.Name, body.Handle, body.Categories, body.Notes)
  if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  c.JSON(200, gin.H{"id": id})
})

r.GET("/v1/influencers", auth.RequireRole("admin","marketer","analyst"), func(c *gin.Context) {
  rows, err := st.ListInfluencers(c, tenantOf(c))
  if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  out := []gin.H{}
  for _, r0 := range rows {
    var cats any
    _ = json.Unmarshal(r0.Categories, &cats)
    out = append(out, gin.H{"id": r0.ID, "name": r0.Name, "handle": r0.Handle, "categories": cats, "notes": r0.Notes, "created_at": r0.CreatedAt})
  }
  c.JSON(200, gin.H{"items": out})
})

r.POST("/v1/products", auth.RequireRole("admin","marketer","analyst"), func(c *gin.Context) {
  var body struct{
    Name string `json:"name"`
    SKU *string `json:"sku"`
    Categories any `json:"categories"`
    Price *string `json:"price"`
    Margin *string `json:"margin"`
  }
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error":"bad_request"}); return }
  if body.Categories == nil { body.Categories = []any{} }
  id, err := st.CreateProduct(c, tenantOf(c), body.Name, body.SKU, body.Categories, body.Price, body.Margin)
  if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  c.JSON(200, gin.H{"id": id})
})

r.GET("/v1/products", auth.RequireRole("admin","marketer","analyst"), func(c *gin.Context) {
  rows, err := st.ListProducts(c, tenantOf(c))
  if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  out := []gin.H{}
  for _, r0 := range rows {
    var cats any
    _ = json.Unmarshal(r0.Categories, &cats)
    out = append(out, gin.H{"id": r0.ID, "sku": r0.SKU, "name": r0.Name, "categories": cats, "price": r0.Price, "margin": r0.Margin, "created_at": r0.CreatedAt})
  }
  c.JSON(200, gin.H{"items": out})
})

// --- V288: Recommendations (product -> best influencers by channel) ---
r.GET("/v1/recommendations/influencers", auth.RequireRole("admin","marketer","analyst"), func(c *gin.Context) {
  productID := c.Query("product_id")
  if productID == "" { c.JSON(400, gin.H{"error":"product_id_required"}); return }
  from := c.DefaultQuery("from", time.Now().Add(-30*24*time.Hour).Format("2006-01-02"))
  to := c.DefaultQuery("to", time.Now().Format("2006-01-02"))
  limitStr := c.DefaultQuery("limit", "10")
  limit, _ := strconv.Atoi(limitStr); if limit <= 0 { limit = 10 }
  rows, err := st.RecommendInfluencersForProduct(c, tenantOf(c), productID, from, to, limit)
  if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  out := []gin.H{}
  for _, r0 := range rows {
    var evidence any
    _ = json.Unmarshal([]byte(string(r0.EvidenceJSON)), &evidence)
    out = append(out, gin.H{"influencer_id": r0.InfluencerID, "influencer_name": r0.InfluencerName, "channel": r0.Channel, "score": r0.Score, "evidence": evidence})
  }
  c.JSON(200, gin.H{"items": out})
})
// --- V288: Ingest influencer stats (for recommendation intelligence) ---
r.POST("/v1/influencers/stats/ingest", auth.RequireRole("admin","analyst"), func(c *gin.Context) {
  var body struct{ Rows []map[string]any `json:"rows"` }
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error":"bad_request"}); return }
  for _, row := range body.Rows {
    infID, _ := row["influencer_id"].(string)
    channel, _ := row["channel"].(string)
    dateStr, _ := row["date"].(string)
    if dateStr == "" { dateStr = time.Now().Format("2006-01-02") }
    impressions := int64(0); clicks := int64(0); conv := int64(0); followers := int64(0)
    if v, ok := row["impressions"].(float64); ok { impressions = int64(v) }
    if v, ok := row["clicks"].(float64); ok { clicks = int64(v) }
    if v, ok := row["conversions"].(float64); ok { conv = int64(v) }
    if v, ok := row["followers"].(float64); ok { followers = int64(v) }
    revenue := "0"; cost := "0"; eng := "0"
    if v, ok := row["revenue"].(string); ok { revenue = v } else if v2, ok := row["revenue"].(float64); ok { revenue = strconv.FormatFloat(v2,'f',-1,64) }
    if v, ok := row["cost"].(string); ok { cost = v } else if v2, ok := row["cost"].(float64); ok { cost = strconv.FormatFloat(v2,'f',-1,64) }
    if v, ok := row["engagement_rate"].(string); ok { eng = v } else if v2, ok := row["engagement_rate"].(float64); ok { eng = strconv.FormatFloat(v2,'f',-1,64) }
    meta := row
    err := st.UpsertInfluencerChannelStat(c, tenantOf(c), store.InfluencerChannelStatIn{
      InfluencerID: infID, Channel: channel, StatDate: dateStr,
      Impressions: impressions, Clicks: clicks, Conversions: conv,
      Revenue: revenue, Cost: cost, Followers: followers, EngagementRate: eng,
      Meta: meta,
    })
    if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  }
  c.JSON(200, gin.H{"ok": true})
})

r.POST("/v1/influencers/products/stats/ingest", auth.RequireRole("admin","analyst"), func(c *gin.Context) {
  var body struct{ Rows []map[string]any `json:"rows"` }
  if err := c.BindJSON(&body); err != nil { c.JSON(400, gin.H{"error":"bad_request"}); return }
  for _, row := range body.Rows {
    infID, _ := row["influencer_id"].(string)
    productID, _ := row["product_id"].(string)
    channel, _ := row["channel"].(string)
    dateStr, _ := row["date"].(string)
    if dateStr == "" { dateStr = time.Now().Format("2006-01-02") }
    impressions := int64(0); clicks := int64(0); conv := int64(0)
    if v, ok := row["impressions"].(float64); ok { impressions = int64(v) }
    if v, ok := row["clicks"].(float64); ok { clicks = int64(v) }
    if v, ok := row["conversions"].(float64); ok { conv = int64(v) }
    revenue := "0"; cost := "0"
    if v, ok := row["revenue"].(string); ok { revenue = v } else if v2, ok := row["revenue"].(float64); ok { revenue = strconv.FormatFloat(v2,'f',-1,64) }
    if v, ok := row["cost"].(string); ok { cost = v } else if v2, ok := row["cost"].(float64); ok { cost = strconv.FormatFloat(v2,'f',-1,64) }
    meta := row
    err := st.UpsertInfluencerProductStat(c, tenantOf(c), store.InfluencerProductStatIn{
      InfluencerID: infID, ProductID: productID, Channel: channel, StatDate: dateStr,
      Impressions: impressions, Clicks: clicks, Conversions: conv,
      Revenue: revenue, Cost: cost, Meta: meta,
    })
    if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
  }
  c.JSON(200, gin.H{"ok": true})
})



}
