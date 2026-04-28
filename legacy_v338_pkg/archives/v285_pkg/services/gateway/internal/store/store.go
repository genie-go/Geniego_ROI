package store

import (
  "context"
  "encoding/json"
  "time"

  "github.com/jackc/pgx/v5"
  "genie_roi/gateway/internal/db"
  "errors"
  "strconv"
  "strings"
)

type Store struct{ db *db.DB }
func New(dbx *db.DB) *Store { return &Store{db: dbx} }

type PolicyRow struct {
  TenantID string
  Version int
  PolicyJSON []byte
}


type APIKeyRow struct {
  KeyHash string
  TenantID string
  UserID string
  Role string
  RevokedAt *time.Time
}

func (s *Store) GetAPIKey(ctx context.Context, tenant, keyHash string) (APIKeyRow, error) {
  var r APIKeyRow
  err := s.db.Pool.QueryRow(ctx, `SELECT key_hash, tenant_id, user_id, role, revoked_at FROM api_keys WHERE tenant_id=$1 AND key_hash=$2 AND revoked_at IS NULL`, tenant, keyHash).
    Scan(&r.KeyHash, &r.TenantID, &r.UserID, &r.Role, &r.RevokedAt)
  return r, err
}

func (s *Store) InsertUser(ctx context.Context, id, tenant, email, name, role string) error {
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO users(id,tenant_id,email,name,role) VALUES($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`, id, tenant, email, name, role)
  return err
}

func (s *Store) CreateAPIKey(ctx context.Context, keyHash, tenant, userID, role string) error {
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO api_keys(key_hash,tenant_id,user_id,role) VALUES($1,$2,$3,$4)`, keyHash, tenant, userID, role)
  return err
}


func (s *Store) UpsertTenant(ctx context.Context, id, name string) error {
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO tenants(id,name) VALUES($1,$2) ON CONFLICT (id) DO UPDATE SET name=excluded.name`, id, name)
  return err
}

func (s *Store) InsertPolicy(ctx context.Context, tenant string, version int, pol []byte, polHash string) error {
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO policies(tenant_id,version,policy_json,policy_hash) VALUES($1,$2,$3,$4) ON CONFLICT (tenant_id,version) DO UPDATE SET policy_json=excluded.policy_json, policy_hash=excluded.policy_hash`, tenant, version, pol, polHash)
  return err
}

func (s *Store) GetLatestPolicy(ctx context.Context, tenant string) (PolicyRow, error) {
  var r PolicyRow
  err := s.db.Pool.QueryRow(ctx, `SELECT tenant_id, version, policy_json FROM policies WHERE tenant_id=$1 ORDER BY version DESC LIMIT 1`, tenant).
    Scan(&r.TenantID, &r.Version, &r.PolicyJSON)
  return r, err
}

func (s *Store) CreateExecution(ctx context.Context, id, tenant, idem, channel, provider, actionType, status string, reqJSON []byte, policyVersion int, policyHash string, requestedByUserID string) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO executions(id,tenant_id,idempotency_key,channel,provider,action_type,status,request_json,policy_version,policy_hash,requested_by_user_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (tenant_id,idempotency_key) DO NOTHING
  `, id, tenant, idem, channel, provider, actionType, status, reqJSON, policyVersion, policyHash, requestedByUserID)
  return err
}


func (s *Store) UpdateExecutionResult(ctx context.Context, tenant, id, status string, result []byte) error {
  _, err := s.db.Pool.Exec(ctx, `UPDATE executions SET status=$3, result_json=$4, updated_at=now() WHERE tenant_id=$1 AND id=$2`, tenant, id, status, result)
  return err
}

func (s *Store) EnqueueOutbox(ctx context.Context, tenant, execID string, payload []byte) error {
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO outbox(tenant_id,execution_id,payload_json,status) VALUES($1,$2,$3,'PENDING')`, tenant, execID, payload)
  return err
}

func (s *Store) NextOutbox(ctx context.Context) (int64, string, string, []byte, error) {
  row := s.db.Pool.QueryRow(ctx, `SELECT id, tenant_id, execution_id, payload_json FROM outbox WHERE status='PENDING' AND next_attempt_at<=now() ORDER BY id ASC LIMIT 1`)
  var id int64; var tenant, exec string; var payload []byte
  err := row.Scan(&id,&tenant,&exec,&payload)
  return id, tenant, exec, payload, err
}

func (s *Store) MarkOutbox(ctx context.Context, id int64, status string, nextAttempt time.Time) error {
  _, err := s.db.Pool.Exec(ctx, `UPDATE outbox SET status=$2, attempts=attempts+1, next_attempt_at=$3 WHERE id=$1`, id, status, nextAttempt)
  return err
}

func (s *Store) Audit(ctx context.Context, tenant, execID, eventType string, event map[string]interface{}) error {
  b,_ := json.Marshal(event)
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO audit_events(tenant_id,execution_id,event_type,event_json) VALUES($1,$2,$3,$4)`, tenant, execID, eventType, b)
  return err
}

func (s *Store) GetExecution(ctx context.Context, tenant, id string) ([]byte, error) {
  var b []byte
  err := s.db.Pool.QueryRow(ctx, `
    SELECT jsonb_build_object(
      'id', id,'tenant_id', tenant_id,'idempotency_key', idempotency_key,'channel', channel,'provider', provider,
      'action_type', action_type,'status', status,'policy_version', policy_version,'policy_hash', policy_hash,'requested_by_user_id', requested_by_user_id,'request', request_json,'result', result_json,'created_at', created_at,'updated_at', updated_at
    )::jsonb
    FROM executions WHERE tenant_id=$1 AND id=$2
  `, tenant, id).Scan(&b)
  return b, err
}



func (s *Store) ListExecutions(ctx context.Context, tenant string, limit int) ([]json.RawMessage, error) {
  if limit <= 0 { limit = 50 }
  rows, err := s.db.Pool.Query(ctx, `
    SELECT jsonb_build_object(
      'id', id,'tenant_id', tenant_id,'idempotency_key', idempotency_key,'channel', channel,'provider', provider,
      'action_type', action_type,'status', status,'policy_version', policy_version,'policy_hash', policy_hash,
      'requested_by_user_id', requested_by_user_id,'created_at', created_at,'updated_at', updated_at
    )::jsonb
    FROM executions WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2
  `, tenant, limit)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []json.RawMessage{}
  for rows.Next() {
    var b []byte
    if err := rows.Scan(&b); err != nil { return nil, err }
    out = append(out, b)
  }
  return out, rows.Err()
}

func (s *Store) ListAuditEvents(ctx context.Context, tenant, execID string, limit int) ([]map[string]interface{}, error) {
  rows, err := s.db.Pool.Query(ctx, `SELECT event_type, event_json, created_at FROM audit_events WHERE tenant_id=$1 AND execution_id=$2 ORDER BY id ASC LIMIT $3`, tenant, execID, limit)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []map[string]interface{}{}
  for rows.Next() {
    var t string; var b []byte; var ts time.Time
    if err := rows.Scan(&t,&b,&ts); err != nil { return nil, err }
    var m map[string]interface{}
    _ = json.Unmarshal(b,&m)
    m["type"]=t; m["at"]=ts
    out = append(out,m)
  }
  return out, nil
}

func (s *Store) UpsertContact(ctx context.Context, tenant string, body map[string]interface{}) error {
  cid,_ := body["contact_id"].(string)
  email,_ := body["email"].(string)
  phone,_ := body["phone"].(string)
  attrs := body["attrs"]
  if cid=="" { return pgx.ErrNoRows }
  b,_ := json.Marshal(attrs)
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO contacts(tenant_id,contact_id,email,phone,attrs)
    VALUES($1,$2,$3,$4,$5)
    ON CONFLICT (tenant_id,contact_id) DO UPDATE SET email=excluded.email, phone=excluded.phone, attrs=excluded.attrs, updated_at=now()
  `, tenant, cid, email, phone, b)
  return err
}

func (s *Store) UpsertConsent(ctx context.Context, tenant string, body map[string]interface{}) error {
  cid,_ := body["contact_id"].(string)
  ch,_ := body["channel"].(string)
  status,_ := body["status"].(string)
  src,_ := body["source"].(string)
  if cid=="" || ch=="" { return pgx.ErrNoRows }
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO consent(tenant_id,contact_id,channel,status,source)
    VALUES($1,$2,$3,$4,$5)
    ON CONFLICT (tenant_id,contact_id,channel) DO UPDATE SET status=excluded.status, source=excluded.source, updated_at=now()
  `, tenant, cid, ch, status, src)
  return err
}

func (s *Store) UpsertTemplate(ctx context.Context, tenant string, body map[string]interface{}) error {
  tid,_ := body["template_id"].(string)
  sub,_ := body["subject"].(string)
  bdy,_ := body["body"].(string)
  if tid=="" { return pgx.ErrNoRows }
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO templates(tenant_id,template_id,subject,body)
    VALUES($1,$2,$3,$4)
    ON CONFLICT (tenant_id,template_id) DO UPDATE SET subject=excluded.subject, body=excluded.body, updated_at=now()
  `, tenant, tid, sub, bdy)
  return err
}

func (s *Store) UpsertJourney(ctx context.Context, tenant string, body map[string]interface{}) error {
  jid,_ := body["journey_id"].(string)
  name,_ := body["name"].(string)
  status,_ := body["status"].(string)
  defn := body["definition"]
  if jid=="" { return pgx.ErrNoRows }
  if status=="" { status="DRAFT" }
  b,_ := json.Marshal(defn)
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO journeys(tenant_id,journey_id,name,status,definition_json)
    VALUES($1,$2,$3,$4,$5)
    ON CONFLICT (tenant_id,journey_id) DO UPDATE SET name=excluded.name, status=excluded.status, definition_json=excluded.definition_json, updated_at=now()
  `, tenant, jid, name, status, b)
  return err
}

func (s *Store) CreateEnrollment(ctx context.Context, tenant string, body map[string]interface{}) error {
  eid,_ := body["enrollment_id"].(string)
  if eid=="" { eid = time.Now().UTC().Format("20060102150405") }
  jid,_ := body["journey_id"].(string)
  cid,_ := body["contact_id"].(string)
  if jid=="" || cid=="" { return pgx.ErrNoRows }
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO enrollments(tenant_id,enrollment_id,journey_id,contact_id,next_run_at,status)
    VALUES($1,$2,$3,$4,now(),'ACTIVE')
    ON CONFLICT (tenant_id,enrollment_id) DO NOTHING
  `, tenant, eid, jid, cid)
  return err
}


type ApprovalRow struct {
  ID string `json:"id"`
  TenantID string `json:"tenant_id"`
  ActionType string `json:"action_type"`
  Status string `json:"status"`
  RequestedBy string `json:"requested_by"`
  ApprovedBy *string `json:"approved_by"`
  Reason *string `json:"reason"`
  CreatedAt time.Time `json:"created_at"`
  DecidedAt *time.Time `json:"decided_at"`
  RequiredSteps int `json:"required_steps"`
  CurrentStep int `json:"current_step"`
  DecisionLog json.RawMessage `json:"decision_log"`
}

func (s *Store) CreateApproval(ctx context.Context, id, tenant, actionType, requestedBy, reason string, requiredSteps int, approversJSON []byte) error {
  if requiredSteps <= 0 { requiredSteps = 1 }
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO approvals(id,tenant_id,action_type,status,requested_by,reason,required_steps,current_step,approvers_json,decision_log)
    VALUES($1,$2,$3,'PENDING',$4,$5,$6,0,$7,'[]'::jsonb)
  `, id, tenant, actionType, requestedBy, reason, requiredSteps, approversJSON)
  return err
}


func (s *Store) DecideApproval(ctx context.Context, tenant, id, decisionStatus, decidedBy, reason string) (ApprovalRow, error) {
  // decisionStatus: APPROVED or REJECTED
  _, err := s.db.Pool.Exec(ctx, `
    UPDATE approvals
    SET
      decision_log = COALESCE(decision_log,'[]'::jsonb) || jsonb_build_array(
        jsonb_build_object('by',$4,'status',$3,'reason',$5,'at', now())
      ),
      current_step = CASE WHEN $3='APPROVED' THEN current_step + 1 ELSE current_step END,
      status = CASE
        WHEN $3='REJECTED' THEN 'REJECTED'
        WHEN $3='APPROVED' AND (current_step + 1) >= required_steps THEN 'APPROVED'
        ELSE status
      END,
      approved_by = CASE WHEN $3='APPROVED' AND (current_step + 1) >= required_steps THEN $4 ELSE approved_by END,
      reason = $5,
      decided_at = CASE
        WHEN $3='REJECTED' THEN now()
        WHEN $3='APPROVED' AND (current_step + 1) >= required_steps THEN now()
        ELSE decided_at
      END
    WHERE tenant_id=$1 AND id=$2 AND status='PENDING'
  `, tenant, id, decisionStatus, decidedBy, reason)
  if err != nil { return ApprovalRow{}, err }

  return s.GetApproval(ctx, tenant, id)
}


func (s *Store) ListPendingApprovals(ctx context.Context, tenant string, limit int) ([]ApprovalRow, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT id, tenant_id, action_type, status, requested_by, approved_by, reason, created_at, decided_at, required_steps, current_step, COALESCE(decision_log,'[]'::jsonb)
    FROM approvals WHERE tenant_id=$1 AND status='PENDING'
    ORDER BY created_at ASC LIMIT $2
  `, tenant, limit)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []ApprovalRow{}
  for rows.Next() {
    var r ApprovalRow
    if err := rows.Scan(&r.ID,&r.TenantID,&r.ActionType,&r.Status,&r.RequestedBy,&r.ApprovedBy,&r.Reason,&r.CreatedAt,&r.DecidedAt,&r.RequiredSteps,&r.CurrentStep,&r.DecisionLog); err != nil {
      return nil, err
    }
    out = append(out, r)
  }
  return out, rows.Err()
}

func (s *Store) AttachApprovalToExecution(ctx context.Context, tenant, execID, approvalID string) error {
  _, err := s.db.Pool.Exec(ctx, `UPDATE executions SET approval_id=$3, status='AWAITING_APPROVAL', updated_at=now() WHERE tenant_id=$1 AND id=$2`, tenant, execID, approvalID)
  return err
}

func (s *Store) QueueExecutionAfterApproval(ctx context.Context, tenant, execID string) error {
  _, err := s.db.Pool.Exec(ctx, `UPDATE executions SET status='QUEUED', updated_at=now() WHERE tenant_id=$1 AND id=$2`, tenant, execID)
  return err
}

func (s *Store) GetConsentStatus(ctx context.Context, tenant, contactID, channel string) (string, error) {
  var st string
  err := s.db.Pool.QueryRow(ctx, `SELECT status FROM consent WHERE tenant_id=$1 AND contact_id=$2 AND channel=$3`, tenant, contactID, channel).Scan(&st)
  return st, err
}

func (s *Store) IncFrequencyCap(ctx context.Context, tenant, contactID, channel string, day time.Time) (int, error) {
  d := day.UTC().Format("2006-01-02")
  // date cast is safe
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO frequency_caps(tenant_id,contact_id,channel,day,count)
    VALUES($1,$2,$3,$4::date,1)
    ON CONFLICT (tenant_id,contact_id,channel,day) DO UPDATE SET count=frequency_caps.count+1
  `, tenant, contactID, channel, d)
  if err != nil { return 0, err }
  var c int
  err = s.db.Pool.QueryRow(ctx, `SELECT count FROM frequency_caps WHERE tenant_id=$1 AND contact_id=$2 AND channel=$3 AND day=$4::date`, tenant, contactID, channel, d).Scan(&c)
  return c, err
}

func (s *Store) UpsertChannelMetric(ctx context.Context, tenant string, day string, channel string, provider *string, campaignID *string, adgroupID *string,
  spend float64, impressions int64, clicks int64, conversions int64, meta []byte) error {
  prov := ""
  if provider != nil { prov = *provider }
  camp := ""
  if campaignID != nil { camp = *campaignID }
  ag := ""
  if adgroupID != nil { ag = *adgroupID }
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO channel_metrics(tenant_id,day,channel,provider,campaign_id,adgroup_id,spend,impressions,clicks,conversions,meta)
    VALUES($1,$2::date,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (tenant_id, day, channel, COALESCE(provider,''), COALESCE(campaign_id,''), COALESCE(adgroup_id,'')) DO UPDATE
    SET spend=excluded.spend, impressions=excluded.impressions, clicks=excluded.clicks, conversions=excluded.conversions, meta=excluded.meta, created_at=now()
  `, tenant, day, channel, prov, camp, ag, spend, impressions, clicks, conversions, meta)
  return err
}

func (s *Store) InsertConversionEvent(ctx context.Context, tenant string, occurredAt time.Time, contactID *string, revenue float64, currency string,
  channel *string, provider *string, campaignID *string, meta []byte) error {
  ch := ""; if channel != nil { ch = *channel }
  pr := ""; if provider != nil { pr = *provider }
  camp := ""; if campaignID != nil { camp = *campaignID }
  cid := ""; if contactID != nil { cid = *contactID }
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO conversion_events(tenant_id,occurred_at,contact_id,revenue,currency,channel,provider,campaign_id,meta)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
  `, tenant, occurredAt, cid, revenue, currency, ch, pr, camp, meta)
  return err
}

type ROISummaryRow struct {
  Channel string `json:"channel"`
  Provider string `json:"provider"`
  Spend float64 `json:"spend"`
  Revenue float64 `json:"revenue"`
  ROI float64 `json:"roi"`
}

func (s *Store) GetROISummary(ctx context.Context, tenant string, fromDay, toDay string) ([]ROISummaryRow, error) {
  // Revenue is summed by converting event timestamps to day in UTC
  rows, err := s.db.Pool.Query(ctx, `
    WITH spend AS (
      SELECT channel, COALESCE(provider,'') as provider, SUM(spend) as spend
      FROM channel_metrics
      WHERE tenant_id=$1 AND day BETWEEN $2::date AND $3::date
      GROUP BY 1,2
    ),
    rev AS (
      SELECT COALESCE(channel,'') as channel, COALESCE(provider,'') as provider, SUM(revenue) as revenue
      FROM conversion_events
      WHERE tenant_id=$1 AND occurred_at >= $2::date AND occurred_at < ($3::date + INTERVAL '1 day')
      GROUP BY 1,2
    )
    SELECT COALESCE(spend.channel, rev.channel) as channel,
           COALESCE(spend.provider, rev.provider) as provider,
           COALESCE(spend.spend,0) as spend,
           COALESCE(rev.revenue,0) as revenue
    FROM spend FULL OUTER JOIN rev
    ON spend.channel=rev.channel AND spend.provider=rev.provider
    ORDER BY 1,2
  `, tenant, fromDay, toDay)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []ROISummaryRow{}
  for rows.Next() {
    var r ROISummaryRow
    if err := rows.Scan(&r.Channel,&r.Provider,&r.Spend,&r.Revenue); err != nil { return nil, err }
    if r.Spend > 0 {
      r.ROI = (r.Revenue - r.Spend) / r.Spend
    } else {
      r.ROI = 0
    }
    out = append(out, r)
  }
  return out, rows.Err()
}

func (s *Store) UpsertExperiment(ctx context.Context, tenant, id, name, status string, holdoutPct int, startAt *time.Time, endAt *time.Time, def []byte) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO experiments(tenant_id,experiment_id,name,status,holdout_pct,start_at,end_at,definition_json)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (tenant_id,experiment_id) DO UPDATE
    SET name=excluded.name, status=excluded.status, holdout_pct=excluded.holdout_pct, start_at=excluded.start_at, end_at=excluded.end_at, definition_json=excluded.definition_json, updated_at=now()
  `, tenant, id, name, status, holdoutPct, startAt, endAt, def)
  return err
}

func (s *Store) GetExperiment(ctx context.Context, tenant, id string) (int, []byte, error) {
  var holdout int
  var def []byte
  err := s.db.Pool.QueryRow(ctx, `SELECT holdout_pct, definition_json FROM experiments WHERE tenant_id=$1 AND experiment_id=$2`, tenant, id).Scan(&holdout, &def)
  return holdout, def, err
}

func (s *Store) UpsertAllocation(ctx context.Context, tenant, expID, unitID, group string) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO experiment_allocations(tenant_id,experiment_id,unit_id,group_name)
    VALUES($1,$2,$3,$4)
    ON CONFLICT (tenant_id,experiment_id,unit_id) DO NOTHING
  `, tenant, expID, unitID, group)
  return err
}

func (s *Store) InsertOutcome(ctx context.Context, tenant, expID, unitID string, conversions int64, revenue float64, meta []byte) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO experiment_outcomes(tenant_id,experiment_id,unit_id,conversions,revenue,meta)
    VALUES($1,$2,$3,$4,$5,$6)
  `, tenant, expID, unitID, conversions, revenue, meta)
  return err
}

type ExperimentReport struct {
  ExperimentID string `json:"experiment_id"`
  HoldoutPct int `json:"holdout_pct"`
  Treatment struct {
    Units int64 `json:"units"`
    Conversions int64 `json:"conversions"`
    Revenue float64 `json:"revenue"`
  } `json:"treatment"`
  Holdout struct {
    Units int64 `json:"units"`
    Conversions int64 `json:"conversions"`
    Revenue float64 `json:"revenue"`
  } `json:"holdout"`
  LiftRevenue float64 `json:"lift_revenue"`
  LiftConversions float64 `json:"lift_conversions"`
}

func (s *Store) GetExperimentReport(ctx context.Context, tenant, expID string, holdoutPct int) (ExperimentReport, error) {
  var rep ExperimentReport
  rep.ExperimentID = expID
  rep.HoldoutPct = holdoutPct
  row := s.db.Pool.QueryRow(ctx, `
    WITH alloc AS (
      SELECT unit_id, group_name FROM experiment_allocations
      WHERE tenant_id=$1 AND experiment_id=$2
    ),
    outc AS (
      SELECT unit_id, SUM(conversions) as conv, SUM(revenue) as rev
      FROM experiment_outcomes
      WHERE tenant_id=$1 AND experiment_id=$2
      GROUP BY 1
    ),
    joined AS (
      SELECT a.group_name, COUNT(*) as units,
             SUM(COALESCE(o.conv,0)) as conv,
             SUM(COALESCE(o.rev,0)) as rev
      FROM alloc a
      LEFT JOIN outc o ON o.unit_id=a.unit_id
      GROUP BY 1
    )
    SELECT
      COALESCE((SELECT units FROM joined WHERE group_name='treatment'),0),
      COALESCE((SELECT conv FROM joined WHERE group_name='treatment'),0),
      COALESCE((SELECT rev FROM joined WHERE group_name='treatment'),0),
      COALESCE((SELECT units FROM joined WHERE group_name='holdout'),0),
      COALESCE((SELECT conv FROM joined WHERE group_name='holdout'),0),
      COALESCE((SELECT rev FROM joined WHERE group_name='holdout'),0)
  `, tenant, expID)
  if err := row.Scan(&rep.Treatment.Units,&rep.Treatment.Conversions,&rep.Treatment.Revenue,&rep.Holdout.Units,&rep.Holdout.Conversions,&rep.Holdout.Revenue); err != nil {
    return rep, err
  }
  // Incrementality: expected holdout performance scaled to treatment size
  if rep.Holdout.Units > 0 && rep.Treatment.Units > 0 {
    scale := float64(rep.Treatment.Units) / float64(rep.Holdout.Units)
    expectedRev := rep.Holdout.Revenue * scale
    expectedConv := float64(rep.Holdout.Conversions) * scale
    rep.LiftRevenue = rep.Treatment.Revenue - expectedRev
    rep.LiftConversions = float64(rep.Treatment.Conversions) - expectedConv
  }
  return rep, nil
}


func (s *Store) GetApproval(ctx context.Context, tenant, id string) (ApprovalRow, error) {
  var r ApprovalRow
  err := s.db.Pool.QueryRow(ctx, `
    SELECT id, tenant_id, action_type, status, requested_by, approved_by, reason, created_at, decided_at, required_steps, current_step, COALESCE(decision_log,'[]'::jsonb), required_steps, current_step, COALESCE(decision_log,'[]'::jsonb)
    FROM approvals WHERE tenant_id=$1 AND id=$2
  `, tenant, id).Scan(&r.ID,&r.TenantID,&r.ActionType,&r.Status,&r.RequestedBy,&r.ApprovedBy,&r.Reason,&r.CreatedAt,&r.DecidedAt,&r.RequiredSteps,&r.CurrentStep,&r.DecisionLog)
  return r, err
}



// --- V285: Segments / Events / Connector Accounts / Message Experiments ---

type SegmentRow struct {
  TenantID string
  SegmentID string
  Name string
  DefinitionJSON []byte
  IsDynamic bool
  CreatedAt time.Time
  UpdatedAt time.Time
}

func (s *Store) UpsertSegment(ctx context.Context, tenantID, segmentID, name string, definitionJSON []byte, isDynamic bool) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO segments (tenant_id, segment_id, name, definition_json, is_dynamic)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (tenant_id, segment_id)
    DO UPDATE SET name=EXCLUDED.name, definition_json=EXCLUDED.definition_json, is_dynamic=EXCLUDED.is_dynamic, updated_at=now()
  `, tenantID, segmentID, name, definitionJSON, isDynamic)
  return err
}

func (s *Store) ListSegments(ctx context.Context, tenantID string) ([]SegmentRow, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT tenant_id, segment_id, name, definition_json, is_dynamic, created_at, updated_at
    FROM segments WHERE tenant_id=$1 ORDER BY updated_at DESC
  `, tenantID)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []SegmentRow{}
  for rows.Next() {
    var r SegmentRow
    if err := rows.Scan(&r.TenantID, &r.SegmentID, &r.Name, &r.DefinitionJSON, &r.IsDynamic, &r.CreatedAt, &r.UpdatedAt); err != nil {
      return nil, err
    }
    out = append(out, r)
  }
  return out, rows.Err()
}

func (s *Store) GetSegment(ctx context.Context, tenantID, segmentID string) (*SegmentRow, error) {
  var r SegmentRow
  err := s.db.Pool.QueryRow(ctx, `
    SELECT tenant_id, segment_id, name, definition_json, is_dynamic, created_at, updated_at
    FROM segments WHERE tenant_id=$1 AND segment_id=$2
  `, tenantID, segmentID).Scan(&r.TenantID, &r.SegmentID, &r.Name, &r.DefinitionJSON, &r.IsDynamic, &r.CreatedAt, &r.UpdatedAt)
  if err == pgx.ErrNoRows { return nil, nil }
  if err != nil { return nil, err }
  return &r, nil
}

func (s *Store) ReplaceSegmentMembers(ctx context.Context, tenantID, segmentID string, contactIDs []string) error {
  tx, err := s.db.Pool.Begin(ctx)
  if err != nil { return err }
  defer tx.Rollback(ctx)

  if _, err := tx.Exec(ctx, `DELETE FROM segment_members WHERE tenant_id=$1 AND segment_id=$2`, tenantID, segmentID); err != nil {
    return err
  }
  for _, cid := range contactIDs {
    if _, err := tx.Exec(ctx, `
      INSERT INTO segment_members (tenant_id, segment_id, contact_id) VALUES ($1,$2,$3)
      ON CONFLICT DO NOTHING
    `, tenantID, segmentID, cid); err != nil {
      return err
    }
  }
  return tx.Commit(ctx)
}

type EventRow struct {
  TenantID string `json:"tenant_id"`
  EventID string `json:"event_id"`
  ContactID string `json:"contact_id"`
  EventType string `json:"event_type"`
  Properties json.RawMessage `json:"properties"`
  OccurredAt time.Time `json:"occurred_at"`
}

func (s *Store) InsertEvents(ctx context.Context, tenantID string, events []EventRow) error {
  tx, err := s.db.Pool.Begin(ctx)
  if err != nil { return err }
  defer tx.Rollback(ctx)

  for _, e := range events {
    if _, err := tx.Exec(ctx, `
      INSERT INTO events (tenant_id, event_id, contact_id, event_type, properties, occurred_at)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (tenant_id, event_id) DO NOTHING
    `, tenantID, e.EventID, e.ContactID, e.EventType, []byte(e.Properties), e.OccurredAt); err != nil {
      return err
    }
  }
  return tx.Commit(ctx)
}

type ConnectorAccountRow struct {
  TenantID string
  Provider string
  AccountID string
  ConfigJSON []byte
  Status string
  LastSyncAt *time.Time
  UpdatedAt time.Time
}

func (s *Store) UpsertConnectorAccount(ctx context.Context, tenantID, provider, accountID string, configJSON []byte, status string) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO connector_accounts (tenant_id, provider, account_id, config_json, status)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (tenant_id, provider, account_id)
    DO UPDATE SET config_json=EXCLUDED.config_json, status=EXCLUDED.status, updated_at=now()
  `, tenantID, provider, accountID, configJSON, status)
  return err
}

func (s *Store) ListConnectorAccounts(ctx context.Context, tenantID string) ([]ConnectorAccountRow, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT tenant_id, provider, account_id, config_json, status, last_sync_at, updated_at
    FROM connector_accounts WHERE tenant_id=$1 ORDER BY updated_at DESC
  `, tenantID)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []ConnectorAccountRow{}
  for rows.Next() {
    var r ConnectorAccountRow
    if err := rows.Scan(&r.TenantID, &r.Provider, &r.AccountID, &r.ConfigJSON, &r.Status, &r.LastSyncAt, &r.UpdatedAt); err != nil {
      return nil, err
    }
    out = append(out, r)
  }
  return out, rows.Err()
}

type MessageExperimentRow struct {
  TenantID string
  ExperimentID string
  Name string
  Channel string
  Status string
  HoldoutPct int
  VariantsJSON []byte
  PolicyJSON []byte
  UpdatedAt time.Time
}

func (s *Store) UpsertMessageExperiment(ctx context.Context, tenantID, experimentID, name, channel, status string, holdoutPct int, variantsJSON, policyJSON []byte) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO message_experiments (tenant_id, experiment_id, name, channel, status, holdout_pct, variants_json, policy_json)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (tenant_id, experiment_id)
    DO UPDATE SET name=EXCLUDED.name, channel=EXCLUDED.channel, status=EXCLUDED.status,
      holdout_pct=EXCLUDED.holdout_pct, variants_json=EXCLUDED.variants_json, policy_json=EXCLUDED.policy_json,
      updated_at=now()
  `, tenantID, experimentID, name, channel, status, holdoutPct, variantsJSON, policyJSON)
  return err
}

func (s *Store) GetMessageExperiment(ctx context.Context, tenantID, experimentID string) (*MessageExperimentRow, error) {
  var r MessageExperimentRow
  err := s.db.Pool.QueryRow(ctx, `
    SELECT tenant_id, experiment_id, name, channel, status, holdout_pct, variants_json, policy_json, updated_at
    FROM message_experiments WHERE tenant_id=$1 AND experiment_id=$2
  `, tenantID, experimentID).Scan(&r.TenantID, &r.ExperimentID, &r.Name, &r.Channel, &r.Status, &r.HoldoutPct, &r.VariantsJSON, &r.PolicyJSON, &r.UpdatedAt)
  if err == pgx.ErrNoRows { return nil, nil }
  if err != nil { return nil, err }
  return &r, nil
}

func (s *Store) UpsertMessageAssignment(ctx context.Context, tenantID, experimentID, contactID, assignment string) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO message_assignments (tenant_id, experiment_id, contact_id, assignment)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (tenant_id, experiment_id, contact_id)
    DO UPDATE SET assignment=EXCLUDED.assignment, assigned_at=now()
  `, tenantID, experimentID, contactID, assignment)
  return err
}

func (s *Store) GetMessageAssignment(ctx context.Context, tenantID, experimentID, contactID string) (string, error) {
  var a string
  err := s.db.Pool.QueryRow(ctx, `
    SELECT assignment FROM message_assignments WHERE tenant_id=$1 AND experiment_id=$2 AND contact_id=$3
  `, tenantID, experimentID, contactID).Scan(&a)
  if err == pgx.ErrNoRows { return "", nil }
  return a, err
}



// ComputeSegmentMembers evaluates a safe subset of segment definitions against contacts + optional events.
// Definition JSON format:
// {
//   "filters":[{"field":"email"|"phone"|"attrs.<key>","op":"eq"|"contains"|"in","value":"..."}],
//   "event": {"type":"PURCHASE", "within_days":30}
// }
func (s *Store) ComputeSegmentMembers(ctx context.Context, tenantID string, definitionJSON []byte) ([]string, error) {
  type Filter struct {
    Field string `json:"field"`
    Op string `json:"op"`
    Value any `json:"value"`
  }
  type EventCond struct {
    Type string `json:"type"`
    WithinDays int `json:"within_days"`
  }
  var def struct {
    Filters []Filter `json:"filters"`
    Event *EventCond `json:"event"`
  }
  if err := json.Unmarshal(definitionJSON, &def); err != nil { return nil, err }

  // Build WHERE clauses with strict allowlist.
  clauses := []string{"tenant_id = $1"}
  args := []any{tenantID}
  argN := 2

  fieldExpr := func(f string) (string, error) {
    f = strings.TrimSpace(f)
    switch {
      case f == "email": return "email", nil
      case f == "phone": return "phone", nil
      case strings.HasPrefix(f, "attrs."):
        key := strings.TrimPrefix(f, "attrs.")
        if key == "" || strings.ContainsAny(key, " ;'"\n\t") { return "", errors.New("invalid attrs key") }
        return "(attrs->>$" + strconv.Itoa(argN) + ")", nil
      default:
        return "", errors.New("unsupported field: " + f)
    }
  }

  // Note: attrs key consumes an arg.
  for _, flt := range def.Filters {
    op := strings.ToLower(strings.TrimSpace(flt.Op))
    field := strings.TrimSpace(flt.Field)

    if strings.HasPrefix(field, "attrs.") {
      key := strings.TrimPrefix(field, "attrs.")
      if key == "" || strings.ContainsAny(key, " ;'"\n\t") { return nil, errors.New("invalid attrs key") }
      // add key arg
      args = append(args, key)
      expr := "(attrs->>$" + strconv.Itoa(argN) + ")"
      argN++

      switch op {
        case "eq":
          args = append(args, flt.Value)
          clauses = append(clauses, expr+" = $"+strconv.Itoa(argN)); argN++
        case "contains":
          args = append(args, "%"+toString(flt.Value)+"%")
          clauses = append(clauses, expr+" ILIKE $"+strconv.Itoa(argN)); argN++
        default:
          return nil, errors.New("unsupported op for attrs: " + op)
      }
      continue
    }

    // non-attrs fields
    expr, err := fieldExpr(field)
    if err != nil { return nil, err }

    switch op {
      case "eq":
        args = append(args, flt.Value)
        clauses = append(clauses, expr+" = $"+strconv.Itoa(argN)); argN++
      case "contains":
        args = append(args, "%"+toString(flt.Value)+"%")
        clauses = append(clauses, expr+" ILIKE $"+strconv.Itoa(argN)); argN++
      case "in":
        // value must be []any or []string
        vs := toStringSlice(flt.Value)
        if len(vs)==0 { return nil, errors.New("in requires non-empty list") }
        ph := []string{}
        for _, v := range vs {
          args = append(args, v); ph = append(ph, "$"+strconv.Itoa(argN)); argN++
        }
        clauses = append(clauses, expr+" IN ("+strings.Join(ph,",")+")")
      default:
        return nil, errors.New("unsupported op: " + op)
    }
  }

  // Optional event condition
  joinEvent := ""
  if def.Event != nil && def.Event.Type != "" {
    within := def.Event.WithinDays
    if within <= 0 { within = 30 }
    // Use EXISTS subquery
    args = append(args, def.Event.Type)
    evTypeArg := argN; argN++
    args = append(args, within)
    withinArg := argN; argN++
    clauses = append(clauses, `EXISTS (
      SELECT 1 FROM events e
      WHERE e.tenant_id = contacts.tenant_id
        AND e.contact_id = contacts.contact_id
        AND e.event_type = $`+strconv.Itoa(evTypeArg)+`
        AND e.occurred_at >= now() - ($`+strconv.Itoa(withinArg)+` || ' days')::interval
    )`)
    _ = joinEvent
  }

  q := `SELECT contact_id FROM contacts WHERE ` + strings.Join(clauses, " AND ") + ` ORDER BY contact_id LIMIT 50000`
  rows, err := s.db.Pool.Query(ctx, q, args...)
  if err != nil { return nil, err }
  defer rows.Close()
  ids := []string{}
  for rows.Next() {
    var id string
    if err := rows.Scan(&id); err != nil { return nil, err }
    ids = append(ids, id)
  }
  return ids, rows.Err()
}

func toString(v any) string {
  if v == nil { return "" }
  switch t := v.(type) {
    case string: return t
    default:
      b, _ := json.Marshal(t)
      return string(b)
  }
}

func toStringSlice(v any) []string {
  if v == nil { return nil }
  switch t := v.(type) {
    case []string: return t
    case []any:
      out := []string{}
      for _, x := range t { out = append(out, toString(x)) }
      return out
    default:
      return nil
  }
}
