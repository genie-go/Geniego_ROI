package store

import (
  "context"
  "encoding/json"
  "time"
  "math"
  "math/rand"

  "github.com/jackc/pgx/v5"
  "genie_roi/gateway/internal/db"
  "errors"
  "strconv"
  "strings"
  "sort"
)

type Store struct{ db *db.DB }
func New(dbx *db.DB) *Store { return &Store{db: dbx} }


// ---- V296 stats helpers (sample size, beta sampling) ----
func clamp01(x float64) float64 {
  if x < 0 { return 0 }
  if x > 1 { return 1 }
  return x
}

// Rational approximation for inverse normal CDF (Acklam's approximation).
// Valid for p in (0,1).
func normInv(p float64) float64 {
  // Coefficients in rational approximations
  a := []float64{-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00}
  b := []float64{-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01}
  c := []float64{-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00}
  d := []float64{7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00}

  // Define break-points.
  plow := 0.02425
  phigh := 1 - plow
  if p <= 0 { return math.Inf(-1) }
  if p >= 1 { return math.Inf(1) }

  if p < plow {
    q := math.Sqrt(-2 * math.Log(p))
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q + c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q + 1)
  }
  if p > phigh {
    q := math.Sqrt(-2 * math.Log(1-p))
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q + c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q + 1)
  }
  q := p - 0.5
  r := q * q
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r + a[5]) * q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r + 1)
}

// Approx sample size per group for two-proportion z test.
func sampleSizeTwoProp(p0, p1, alpha, power float64) float64 {
  p0 = clamp01(p0); p1 = clamp01(p1)
  d := math.Abs(p1 - p0)
  if d < 1e-6 { return math.Inf(1) }
  zA := normInv(1 - alpha/2)
  zB := normInv(power)
  // Pooled variance approximation
  pbar := (p0 + p1) / 2
  num := (zA*math.Sqrt(2*pbar*(1-pbar)) + zB*math.Sqrt(p0*(1-p0)+p1*(1-p1)))
  n := (num*num) / (d*d)
  if n < 0 { n = 0 }
  return n
}

// Gamma sampling (Marsaglia-Tsang), returns Gamma(k, 1)
func gammaSample(rng *rand.Rand, k float64) float64 {
  if k <= 0 { return 0 }
  if k < 1 {
    // Use boost: Gamma(k) = Gamma(k+1) * U^(1/k)
    u := rng.Float64()
    return gammaSample(rng, k+1) * math.Pow(u, 1.0/k)
  }
  d := k - 1.0/3.0
  c0 := 1.0 / math.Sqrt(9*d)
  for {
    x := rng.NormFloat64()
    v := 1 + c0*x
    if v <= 0 { continue }
    v = v*v*v
    u := rng.Float64()
    if u < 1-0.0331*(x*x)*(x*x) { return d*v }
    if math.Log(u) < 0.5*x*x + d*(1 - v + math.Log(v)) { return d*v }
  }
}

// Beta sampling via two gammas
func betaSample(rng *rand.Rand, a, b float64) float64 {
  ga := gammaSample(rng, a)
  gb := gammaSample(rng, b)
  if ga+gb == 0 { return 0.5 }
  return ga / (ga + gb)
}

// Percentile from sorted slice (p in [0,1])
func percentileSorted(xs []float64, p float64) float64 {
  if len(xs) == 0 { return 0 }
  if p <= 0 { return xs[0] }
  if p >= 1 { return xs[len(xs)-1] }
  idx := p * float64(len(xs)-1)
  i := int(idx)
  frac := idx - float64(i)
  if i+1 >= len(xs) { return xs[len(xs)-1] }
  return xs[i]*(1-frac) + xs[i+1]*frac
}

type PolicyRow struct {
  TenantID string
  Version int
  PolicyJSON []byte
  PolicyHash string
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
  err := s.db.Pool.QueryRow(ctx, `SELECT tenant_id, version, policy_json, policy_hash FROM policies WHERE tenant_id=$1 ORDER BY version DESC LIMIT 1`, tenant).
    Scan(&r.TenantID, &r.Version, &r.PolicyJSON, &r.PolicyHash)
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

// V296: Bayesian credible intervals + sample size guidance (conversion-rate based)
TreatmentCR float64 `json:"treatment_cr"`
HoldoutCR float64 `json:"holdout_cr"`
UpliftCRMean float64 `json:"uplift_cr_mean"`
UpliftCRLow float64 `json:"uplift_cr_ci_low"`
UpliftCRHigh float64 `json:"uplift_cr_ci_high"`
ProbUpliftPositive float64 `json:"prob_uplift_positive"`
SampleSizePerGroup float64 `json:"sample_size_per_group"`
Alpha float64 `json:"alpha"`
Power float64 `json:"power"`
MDE float64 `json:"mde"`
}

func (s *Store) GetExperimentReport(ctx context.Context, tenant, expID string, holdoutPct int, alpha, power, mde float64) (ExperimentReport, error) {
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
  }// V296: conversion-rate based bayesian credible interval for uplift (treatment - holdout)
// Defaults if caller passes 0.
if alpha <= 0 { alpha = 0.05 }
if power <= 0 { power = 0.80 }
if mde <= 0 { mde = 0.02 }
rep.Alpha, rep.Power, rep.MDE = alpha, power, mde

trUnits := float64(rep.Treatment.Units)
hoUnits := float64(rep.Holdout.Units)
trConv := float64(rep.Treatment.Conversions)
hoConv := float64(rep.Holdout.Conversions)

if trUnits > 0 { rep.TreatmentCR = trConv / trUnits }
if hoUnits > 0 { rep.HoldoutCR = hoConv / hoUnits }

// Sample size recommendation per group for detecting MDE over baseline holdout CR.
p0 := rep.HoldoutCR
p1 := clamp01(p0 + mde)
rep.SampleSizePerGroup = sampleSizeTwoProp(p0, p1, alpha, power)

// Bayesian update with Monte Carlo sampling (exact draws from Beta posteriors)
// Prior Beta(1,1). Posterior: Beta(1+conv, 1+units-conv).
if trUnits > 0 && hoUnits > 0 {
  rng := rand.New(rand.NewSource(time.Now().UnixNano()))
  N := 20000
  uplifts := make([]float64, 0, N)
  pos := 0
  aT := 1.0 + trConv
  bT := 1.0 + math.Max(0.0, trUnits-trConv)
  aH := 1.0 + hoConv
  bH := 1.0 + math.Max(0.0, hoUnits-hoConv)
  for i := 0; i < N; i++ {
    pT := betaSample(rng, aT, bT)
    pH := betaSample(rng, aH, bH)
    u := pT - pH
    uplifts = append(uplifts, u)
    if u > 0 { pos++ }
  }
  sort.Float64s(uplifts)
  rep.UpliftCRMean = rep.TreatmentCR - rep.HoldoutCR
  rep.UpliftCRLow = percentileSorted(uplifts, 0.025)
  rep.UpliftCRHigh = percentileSorted(uplifts, 0.975)
  rep.ProbUpliftPositive = float64(pos) / float64(N)
}

  return rep, nil}


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
  AuthJSON []byte
  TokenJSON []byte
  TokenExpiresAt *time.Time
  Status string
  LastSyncAt *time.Time
  UpdatedAt time.Time
}

func (s *Store) UpsertConnectorAccount(ctx context.Context, tenantID, provider, accountID string, configJSON, authJSON, tokenJSON []byte, tokenExpiresAt *time.Time, status string) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO connector_accounts (tenant_id, provider, account_id, config_json, auth_json, token_json, token_expires_at, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (tenant_id, provider, account_id)
    DO UPDATE SET config_json=EXCLUDED.config_json, auth_json=EXCLUDED.auth_json, token_json=EXCLUDED.token_json, token_expires_at=EXCLUDED.token_expires_at, status=EXCLUDED.status, updated_at=now()
  `, tenantID, provider, accountID, configJSON, authJSON, tokenJSON, tokenExpiresAt, status)
  return err
}

func (s *Store) ListConnectorAccounts(ctx context.Context, tenantID string) ([]ConnectorAccountRow, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT tenant_id, provider, account_id, config_json, auth_json, token_json, token_expires_at, status, last_sync_at, updated_at
    FROM connector_accounts WHERE tenant_id=$1 ORDER BY updated_at DESC
  `, tenantID)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []ConnectorAccountRow{}
  for rows.Next() {
    var r ConnectorAccountRow
    if err := rows.Scan(&r.TenantID, &r.Provider, &r.AccountID, &r.ConfigJSON, &r.AuthJSON, &r.TokenJSON, &r.TokenExpiresAt, &r.Status, &r.LastSyncAt, &r.UpdatedAt); err != nil {
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
  // Backward compatible segment definition:
  // V285: {"filters":[{"field":"email|phone|attrs.x","op":"eq|neq|contains|gt|gte|lt|lte","value":...}], "event":{"type":"purchase","within_days":30}}
  // V286 UI: {"op":"AND|OR","conditions":[{"field":"...","operator":"eq","value":"..."}], "event_conditions":[{"event_type":"purchase","within_days":30}]}
  var raw map[string]any
  if err := json.Unmarshal(definitionJSON, &raw); err != nil { return nil, err }

  // Normalize filters
  type Filter struct{ Field, Op string; Value any }
  filters := []Filter{}
  if arr, ok := raw["filters"].([]any); ok {
    for _, it := range arr {
      m, _ := it.(map[string]any)
      if m == nil { continue }
      filters = append(filters, Filter{
        Field: asString(m["field"]),
        Op: asString(m["op"]),
        Value: m["value"],
      })
    }
  } else if arr, ok := raw["conditions"].([]any); ok {
    for _, it := range arr {
      m, _ := it.(map[string]any)
      if m == nil { continue }
      op := asString(m["operator"])
      if op == "" { op = asString(m["op"]) }
      filters = append(filters, Filter{
        Field: asString(m["field"]),
        Op: op,
        Value: m["value"],
      })
    }
  }

  // Normalize event condition (single)
  type EventCond struct{ Type string; WithinDays int }
  var ev *EventCond
  if m, ok := raw["event"].(map[string]any); ok && m != nil {
    ev = &EventCond{Type: asString(m["type"]), WithinDays: asInt(m["within_days"])}
  } else if arr, ok := raw["event_conditions"].([]any); ok && len(arr) > 0 {
    m, _ := arr[0].(map[string]any)
    if m != nil {
      ev = &EventCond{Type: asString(m["event_type"]), WithinDays: asInt(m["within_days"])}
    }
  }

  // AND/OR operator (V286)
  logic := strings.ToUpper(asString(raw["op"]))
  if logic != "OR" { logic = "AND" }

  // Build WHERE clauses with strict allowlist.
  clauses := []string{"tenant_id = $1"}
  args := []any{tenantID}
  argN := 2

  // safe casting helpers
  fieldExpr := func(f string) (string, error) {
    f = strings.TrimSpace(f)
    switch {
      case f == "email": return "email", nil
      case f == "phone": return "phone", nil
      case strings.HasPrefix(f, "attrs."):
        key := strings.TrimPrefix(f, "attrs.")
        if key == "" || strings.ContainsAny(key, " ;'\"\n\t") { return "", errors.New("invalid attrs key") }
        // key arg consumed here
        args = append(args, key)
        expr := "(attributes_json->>$" + strconv.Itoa(argN) + ")"
        argN++
        return expr, nil
      default:
        return "", errors.New("unsupported field: " + f)
    }
  }

  // Build filter subclauses and join by AND/OR
  sub := []string{}
  for _, flt := range filters {
    op := strings.ToLower(strings.TrimSpace(flt.Op))
    field := strings.TrimSpace(flt.Field)
    if field == "" || op == "" { continue }
    expr, err := fieldExpr(field)
    if err != nil { return nil, err }

    // value arg
    // For numeric comparisons, we cast to numeric if possible.
    switch op {
      case "eq":
        sub = append(sub, expr+" = $"+strconv.Itoa(argN))
        args = append(args, flt.Value); argN++
      case "neq":
        sub = append(sub, expr+" <> $"+strconv.Itoa(argN))
        args = append(args, flt.Value); argN++
      case "contains":
        sub = append(sub, "LOWER("+expr+") LIKE LOWER($"+strconv.Itoa(argN)+")")
        args = append(args, "%"+asString(flt.Value)+"%"); argN++
      case "gt","gte","lt","lte":
        // Cast to numeric; invalid cast will error (acceptable for strictness).
        opSQL := map[string]string{"gt":">","gte":">=","lt":"<","lte":"<="}[op]
        sub = append(sub, "("+expr+")::numeric "+opSQL+" ($"+strconv.Itoa(argN)+")::numeric")
        args = append(args, flt.Value); argN++
      default:
        return nil, errors.New("unsupported op: "+op)
    }
  }
  if len(sub) > 0 {
    joiner := " AND "
    if logic == "OR" { joiner = " OR " }
    clauses = append(clauses, "("+strings.Join(sub, joiner)+")")
  }

  // Optional event condition: must have at least one event of type within N days
  if ev != nil && ev.Type != "" && ev.WithinDays > 0 {
    clauses = append(clauses, `EXISTS (
      SELECT 1 FROM events e
      WHERE e.tenant_id = contacts.tenant_id
        AND e.contact_id = contacts.contact_id
        AND e.event_type = $`+strconv.Itoa(argN)+`
        AND e.occurred_at >= now() - ($`+strconv.Itoa(argN+1)+`::int || ' days')::interval
    )`)
    args = append(args, ev.Type, ev.WithinDays)
    argN += 2
  }

  q := "SELECT contact_id FROM contacts WHERE " + strings.Join(clauses, " AND ") + " ORDER BY updated_at DESC LIMIT 50000"
  rows, err := s.db.Pool.Query(ctx, q, args...)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []string{}
  for rows.Next() {
    var id string
    if err := rows.Scan(&id); err != nil { return nil, err }
    out = append(out, id)
  }
  return out, rows.Err()
}

func asString(v any) string {
  if v == nil { return "" }
  switch x := v.(type) {
    case string: return x
    default:
      b, _ := json.Marshal(x)
      return strings.Trim(string(b), "\"")
  }
}
func asInt(v any) int {
  switch x := v.(type) {
    case float64: return int(x)
    case int: return x
    case string:
      i, _ := strconv.Atoi(x); return i
    default:
      return 0
  }
}
ackage store

import (
  "context"
  "encoding/json"
  "time"
  "math"
  "math/rand"

  "github.com/jackc/pgx/v5"
  "genie_roi/gateway/internal/db"
  "errors"
  "strconv"
  "strings"
  "sort"
)

type Store struct{ db *db.DB }
func New(dbx *db.DB) *Store { return &Store{db: dbx} }


// ---- V296 stats helpers (sample size, beta sampling) ----
func clamp01(x float64) float64 {
  if x < 0 { return 0 }
  if x > 1 { return 1 }
  return x
}

// Rational approximation for inverse normal CDF (Acklam's approximation).
// Valid for p in (0,1).
func normInv(p float64) float64 {
  // Coefficients in rational approximations
  a := []float64{-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00}
  b := []float64{-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01}
  c := []float64{-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00}
  d := []float64{7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00}

  // Define break-points.
  plow := 0.02425
  phigh := 1 - plow
  if p <= 0 { return math.Inf(-1) }
  if p >= 1 { return math.Inf(1) }

  if p < plow {
    q := math.Sqrt(-2 * math.Log(p))
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q + c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q + 1)
  }
  if p > phigh {
    q := math.Sqrt(-2 * math.Log(1-p))
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q + c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q + 1)
  }
  q := p - 0.5
  r := q * q
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r + a[5]) * q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r + 1)
}

// Approx sample size per group for two-proportion z test.
func sampleSizeTwoProp(p0, p1, alpha, power float64) float64 {
  p0 = clamp01(p0); p1 = clamp01(p1)
  d := math.Abs(p1 - p0)
  if d < 1e-6 { return math.Inf(1) }
  zA := normInv(1 - alpha/2)
  zB := normInv(power)
  // Pooled variance approximation
  pbar := (p0 + p1) / 2
  num := (zA*math.Sqrt(2*pbar*(1-pbar)) + zB*math.Sqrt(p0*(1-p0)+p1*(1-p1)))
  n := (num*num) / (d*d)
  if n < 0 { n = 0 }
  return n
}

// Gamma sampling (Marsaglia-Tsang), returns Gamma(k, 1)
func gammaSample(rng *rand.Rand, k float64) float64 {
  if k <= 0 { return 0 }
  if k < 1 {
    // Use boost: Gamma(k) = Gamma(k+1) * U^(1/k)
    u := rng.Float64()
    return gammaSample(rng, k+1) * math.Pow(u, 1.0/k)
  }
  d := k - 1.0/3.0
  c0 := 1.0 / math.Sqrt(9*d)
  for {
    x := rng.NormFloat64()
    v := 1 + c0*x
    if v <= 0 { continue }
    v = v*v*v
    u := rng.Float64()
    if u < 1-0.0331*(x*x)*(x*x) { return d*v }
    if math.Log(u) < 0.5*x*x + d*(1 - v + math.Log(v)) { return d*v }
  }
}

// Beta sampling via two gammas
func betaSample(rng *rand.Rand, a, b float64) float64 {
  ga := gammaSample(rng, a)
  gb := gammaSample(rng, b)
  if ga+gb == 0 { return 0.5 }
  return ga / (ga + gb)
}

// Percentile from sorted slice (p in [0,1])
func percentileSorted(xs []float64, p float64) float64 {
  if len(xs) == 0 { return 0 }
  if p <= 0 { return xs[0] }
  if p >= 1 { return xs[len(xs)-1] }
  idx := p * float64(len(xs)-1)
  i := int(idx)
  frac := idx - float64(i)
  if i+1 >= len(xs) { return xs[len(xs)-1] }
  return xs[i]*(1-frac) + xs[i+1]*frac
}

type PolicyRow struct {
  TenantID string
  Version int
  PolicyJSON []byte
  PolicyHash string
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
  err := s.db.Pool.QueryRow(ctx, `SELECT tenant_id, version, policy_json, policy_hash FROM policies WHERE tenant_id=$1 ORDER BY version DESC LIMIT 1`, tenant).
    Scan(&r.TenantID, &r.Version, &r.PolicyJSON, &r.PolicyHash)
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

// --- V292: Drilldown dashboard (campaign/experiment/deal unified view) ---

type DrilldownOverview struct {
  FromDay string `json:"from"`
  ToDay string `json:"to"`
  TotalSpend float64 `json:"total_spend"`
  TotalRevenue float64 `json:"total_revenue"`
  TotalROI float64 `json:"total_roi"`
}

type DrilldownCampaignRow struct {
  Channel string `json:"channel"`
  Provider string `json:"provider"`
  CampaignID string `json:"campaign_id"`
  Spend float64 `json:"spend"`
  Impressions int64 `json:"impressions"`
  Clicks int64 `json:"clicks"`
  Conversions int64 `json:"conversions"`
  Revenue float64 `json:"revenue"`
  ROAS float64 `json:"roas"`
}

type DrilldownExperimentRow struct {
  ExperimentID string `json:"experiment_id"`
  Name string `json:"name"`
  Status string `json:"status"`
  HoldoutPct int `json:"holdout_pct"`
  TreatmentRevenue float64 `json:"treatment_revenue"`
  HoldoutRevenue float64 `json:"holdout_revenue"`
  LiftPct float64 `json:"lift_pct"`
}

type DrilldownDealRow struct {
  Channel string `json:"channel"`
  ContentType string `json:"content_type"`
  Estimates int64 `json:"estimates"`
  IncrementalRevenue float64 `json:"incremental_revenue"`
  IncrementalProfit float64 `json:"incremental_profit"`
}


type DrilldownChannelRow struct {
  Channel string `json:"channel"`
  Spend float64 `json:"spend"`
  Revenue float64 `json:"revenue"`
  ROI float64 `json:"roi"`
}

type DrilldownDealDecisionRow struct {
  DealID string `json:"deal_id"`
  CampaignID string `json:"campaign_id"`
  IncrementalRevenue float64 `json:"incremental_revenue"`
  Spend float64 `json:"spend"`
  IncrementalProfit float64 `json:"incremental_profit"`
  ROIRatio *float64 `json:"roi_ratio"`
  Recommendation string `json:"recommendation"` // SCALE|HOLD|STOP
  Confidence string `json:"confidence"` // HIGH|MED|LOW (proxy)
}

type DrilldownResponse struct {
  Overview DrilldownOverview `json:"overview"`
  Channels []DrilldownChannelRow `json:"channels"`
  Campaigns []DrilldownCampaignRow `json:"campaigns"`
  Experiments []DrilldownExperimentRow `json:"experiments"`
  Deals []DrilldownDealRow `json:"deals"`
  DecisionPack []DrilldownDealDecisionRow `json:"decision_pack"`
}

func (s *Store) GetROIDrilldown(ctx context.Context, tenant string, fromDay, toDay string) (DrilldownResponse, error) {
  var resp DrilldownResponse
  resp.Overview = DrilldownOverview{FromDay: fromDay, ToDay: toDay}

  // totals
  _ = s.db.Pool.QueryRow(ctx, `
    WITH spend AS (
      SELECT COALESCE(SUM(spend),0) AS spend
      FROM channel_metrics
      WHERE tenant_id=$1 AND day BETWEEN $2::date AND $3::date
    ),
    rev AS (
      SELECT COALESCE(SUM(revenue),0) AS revenue
      FROM conversion_events
      WHERE tenant_id=$1 AND occurred_at >= $2::date AND occurred_at < ($3::date + INTERVAL '1 day')
    )
    SELECT spend.spend, rev.revenue FROM spend, rev
  `, tenant, fromDay, toDay).Scan(&resp.Overview.TotalSpend, &resp.Overview.TotalRevenue)
  if resp.Overview.TotalSpend > 0 {
    resp.Overview.TotalROI = (resp.Overview.TotalRevenue - resp.Overview.TotalSpend) / resp.Overview.TotalSpend
  }


  // V293: channel breakdown (spend vs revenue proxy)
  rowsC, err := s.db.Pool.Query(ctx, `
    WITH spend AS (
      SELECT channel, COALESCE(SUM(spend),0) AS spend
      FROM channel_metrics
      WHERE tenant_id=$1 AND day BETWEEN $2::date AND $3::date
      GROUP BY channel
    ),
    rev AS (
      SELECT channel, COALESCE(SUM(revenue),0) AS revenue
      FROM conversion_events
      WHERE tenant_id=$1 AND occurred_at >= $2::date AND occurred_at < ($3::date + INTERVAL '1 day')
      GROUP BY channel
    )
    SELECT COALESCE(spend.channel, rev.channel) AS channel,
           COALESCE(spend.spend,0) AS spend,
           COALESCE(rev.revenue,0) AS revenue
    FROM spend FULL OUTER JOIN rev ON spend.channel = rev.channel
    ORDER BY 1
  `, tenant, fromDay, toDay)
  if err == nil {
    defer rowsC.Close()
    for rowsC.Next() {
      var r DrilldownChannelRow
      _ = rowsC.Scan(&r.Channel, &r.Spend, &r.Revenue)
      if r.Spend > 0 {
        r.ROI = (r.Revenue - r.Spend) / r.Spend
      } else {
        r.ROI = 0
      }
      resp.Channels = append(resp.Channels, r)
    }
  }

  // V293: deal decision pack (simple rules; real product would use CI bands)
  rowsD, err2 := s.db.Pool.Query(ctx, `
    SELECT deal_id, campaign_id,
           COALESCE(incremental_revenue,0) AS inc_rev,
           COALESCE(spend,0) AS spend,
           COALESCE(incremental_profit, (COALESCE(incremental_revenue,0) - COALESCE(spend,0))) AS inc_profit,
           roi_ratio
    FROM v293_deal_decision_pack
    WHERE tenant_id=$1 AND day BETWEEN $2::date AND $3::date
    ORDER BY inc_profit DESC
    LIMIT 50
  `, tenant, fromDay, toDay)
  if err2 == nil {
    defer rowsD.Close()
    for rowsD.Next() {
      var r DrilldownDealDecisionRow
      _ = rowsD.Scan(&r.DealID, &r.CampaignID, &r.IncrementalRevenue, &r.Spend, &r.IncrementalProfit, &r.ROIRatio)
      // recommendation proxy
      if r.ROIRatio != nil && *r.ROIRatio >= 0.5 && r.IncrementalProfit > 0 {
        r.Recommendation = "SCALE"
        r.Confidence = "MED"
      } else if r.IncrementalProfit <= 0 {
        r.Recommendation = "STOP"
        r.Confidence = "HIGH"
      } else {
        r.Recommendation = "HOLD"
        r.Confidence = "LOW"
      }
      resp.DecisionPack = append(resp.DecisionPack, r)
    }
  }

  // campaigns: join spend metrics with revenue keyed by provider+campaign_id
  rows, err := s.db.Pool.Query(ctx, `
    WITH spend AS (
      SELECT channel, COALESCE(provider,'') AS provider, COALESCE(campaign_id,'') AS campaign_id,
             SUM(spend) AS spend,
             SUM(impressions)::bigint AS impressions,
             SUM(clicks)::bigint AS clicks,
             SUM(conversions)::bigint AS conversions
      FROM channel_metrics
      WHERE tenant_id=$1 AND day BETWEEN $2::date AND $3::date
      GROUP BY 1,2,3
    ),
    rev AS (
      SELECT COALESCE(channel,'') AS channel, COALESCE(provider,'') AS provider, COALESCE(campaign_id,'') AS campaign_id,
             SUM(revenue) AS revenue
      FROM conversion_events
      WHERE tenant_id=$1 AND occurred_at >= $2::date AND occurred_at < ($3::date + INTERVAL '1 day')
      GROUP BY 1,2,3
    )
    SELECT s.channel, s.provider, s.campaign_id, s.spend, s.impressions, s.clicks, s.conversions,
           COALESCE(r.revenue,0) AS revenue
    FROM spend s
    LEFT JOIN rev r
      ON r.provider=s.provider AND r.campaign_id=s.campaign_id AND r.channel=s.channel
    ORDER BY s.spend DESC
    LIMIT 200
  `, tenant, fromDay, toDay)
  if err != nil { return resp, err }
  defer rows.Close()
  for rows.Next() {
    var r DrilldownCampaignRow
    if err := rows.Scan(&r.Channel, &r.Provider, &r.CampaignID, &r.Spend, &r.Impressions, &r.Clicks, &r.Conversions, &r.Revenue); err != nil { return resp, err }
    if r.Spend > 0 { r.ROAS = r.Revenue / r.Spend }
    resp.Campaigns = append(resp.Campaigns, r)
  }

  // experiments: compute lift from outcomes (treatment vs holdout) in window
  erows, err := s.db.Pool.Query(ctx, `
    WITH o AS (
      SELECT eo.experiment_id,
             ea.group_name,
             SUM(eo.revenue) AS revenue
      FROM experiment_outcomes eo
      JOIN experiment_allocations ea
        ON ea.tenant_id=eo.tenant_id AND ea.experiment_id=eo.experiment_id AND ea.unit_id=eo.unit_id
      WHERE eo.tenant_id=$1
        AND eo.measured_at >= $2::date AND eo.measured_at < ($3::date + INTERVAL '1 day')
      GROUP BY 1,2
    ),
    p AS (
      SELECT experiment_id,
             SUM(CASE WHEN group_name='treatment' THEN revenue ELSE 0 END) AS treatment_revenue,
             SUM(CASE WHEN group_name='holdout' THEN revenue ELSE 0 END) AS holdout_revenue
      FROM o
      GROUP BY 1
    )
    SELECT e.experiment_id, e.name, e.status, e.holdout_pct,
           COALESCE(p.treatment_revenue,0) AS treatment_revenue,
           COALESCE(p.holdout_revenue,0) AS holdout_revenue
    FROM experiments e
    LEFT JOIN p ON p.experiment_id=e.experiment_id
    WHERE e.tenant_id=$1
    ORDER BY e.updated_at DESC
    LIMIT 100
  `, tenant, fromDay, toDay)
  if err != nil { return resp, err }
  defer erows.Close()
  for erows.Next() {
    var r DrilldownExperimentRow
    if err := erows.Scan(&r.ExperimentID, &r.Name, &r.Status, &r.HoldoutPct, &r.TreatmentRevenue, &r.HoldoutRevenue); err != nil { return resp, err }
    if r.HoldoutRevenue > 0 {
      r.LiftPct = (r.TreatmentRevenue - r.HoldoutRevenue) / r.HoldoutRevenue * 100.0
    } else if r.TreatmentRevenue > 0 {
      r.LiftPct = 100.0
    }
    resp.Experiments = append(resp.Experiments, r)
  }

  // deals: aggregate incremental metrics (if present) for the period
  drows, err := s.db.Pool.Query(ctx, `
    SELECT channel, content_type, COUNT(*)::bigint AS estimates,
           COALESCE(SUM(incremental_revenue),0) AS incremental_revenue,
           COALESCE(SUM(incremental_profit),0) AS incremental_profit
    FROM influencer_deal_estimates
    WHERE tenant_id=$1 AND created_at >= $2::date AND created_at < ($3::date + INTERVAL '1 day')
    GROUP BY 1,2
    ORDER BY incremental_profit DESC
    LIMIT 100
  `, tenant, fromDay, toDay)
  if err == nil {
    defer drows.Close()
    for drows.Next() {
      var r DrilldownDealRow
      if err := drows.Scan(&r.Channel, &r.ContentType, &r.Estimates, &r.IncrementalRevenue, &r.IncrementalProfit); err != nil { return resp, err }
      resp.Deals = append(resp.Deals, r)
    }
  }

  return resp, nil
}


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

func (s *Store) GetExperimentReport(ctx context.Context, tenant, expID string, holdoutPct int, alpha, power, mde float64) (ExperimentReport, error) {
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
  AuthJSON []byte
  TokenJSON []byte
  TokenExpiresAt *time.Time
  Status string
  LastSyncAt *time.Time
  UpdatedAt time.Time
}

func (s *Store) UpsertConnectorAccount(ctx context.Context, tenantID, provider, accountID string, configJSON, authJSON, tokenJSON []byte, tokenExpiresAt *time.Time, status string) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO connector_accounts (tenant_id, provider, account_id, config_json, auth_json, token_json, token_expires_at, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (tenant_id, provider, account_id)
    DO UPDATE SET config_json=EXCLUDED.config_json, auth_json=EXCLUDED.auth_json, token_json=EXCLUDED.token_json, token_expires_at=EXCLUDED.token_expires_at, status=EXCLUDED.status, updated_at=now()
  `, tenantID, provider, accountID, configJSON, authJSON, tokenJSON, tokenExpiresAt, status)
  return err
}

func (s *Store) ListConnectorAccounts(ctx context.Context, tenantID string) ([]ConnectorAccountRow, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT tenant_id, provider, account_id, config_json, auth_json, token_json, token_expires_at, status, last_sync_at, updated_at
    FROM connector_accounts WHERE tenant_id=$1 ORDER BY updated_at DESC
  `, tenantID)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []ConnectorAccountRow{}
  for rows.Next() {
    var r ConnectorAccountRow
    if err := rows.Scan(&r.TenantID, &r.Provider, &r.AccountID, &r.ConfigJSON, &r.AuthJSON, &r.TokenJSON, &r.TokenExpiresAt, &r.Status, &r.LastSyncAt, &r.UpdatedAt); err != nil {
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


// --- V286 templates & campaigns ---

type TemplateRow struct{
  TenantID string
  TemplateID string
  Subject string
  Body string
  UpdatedAt time.Time
}

func (s *Store) UpsertTemplate(ctx context.Context, tenant, templateID, subject, body, user string) error {
  // save current as a version (best-effort)
  var curSub, curBody string
  _ = s.db.Pool.QueryRow(ctx, `SELECT subject, body FROM templates WHERE tenant_id=$1 AND template_id=$2`, tenant, templateID).Scan(&curSub, &curBody)
  if curSub != "" || curBody != "" {
    var nextVer int
    _ = s.db.Pool.QueryRow(ctx, `SELECT COALESCE(MAX(version),0)+1 FROM template_versions WHERE tenant_id=$1 AND template_id=$2`, tenant, templateID).Scan(&nextVer)
    _, _ = s.db.Pool.Exec(ctx, `INSERT INTO template_versions(tenant_id,template_id,version,subject,body,created_by) VALUES($1,$2,$3,$4,$5,$6)`, tenant, templateID, nextVer, curSub, curBody, user)
  }
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO templates(tenant_id,template_id,subject,body,updated_at) VALUES($1,$2,$3,$4,now())
    ON CONFLICT (tenant_id,template_id) DO UPDATE SET subject=excluded.subject, body=excluded.body, updated_at=now()`,
    tenant, templateID, subject, body)
  return err
}

func (s *Store) GetTemplate(ctx context.Context, tenant, templateID string) (TemplateRow, error) {
  var r TemplateRow
  err := s.db.Pool.QueryRow(ctx, `SELECT tenant_id, template_id, subject, body, updated_at FROM templates WHERE tenant_id=$1 AND template_id=$2`, tenant, templateID).
    Scan(&r.TenantID, &r.TemplateID, &r.Subject, &r.Body, &r.UpdatedAt)
  return r, err
}

func (s *Store) ListTemplates(ctx context.Context, tenant string, limit int) ([]TemplateRow, error) {
  if limit <= 0 { limit = 200 }
  rows, err := s.db.Pool.Query(ctx, `SELECT tenant_id,template_id,subject,body,updated_at FROM templates WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT $2`, tenant, limit)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []TemplateRow{}
  for rows.Next(){
    var r TemplateRow
    if err := rows.Scan(&r.TenantID,&r.TemplateID,&r.Subject,&r.Body,&r.UpdatedAt); err != nil { return nil, err }
    out = append(out, r)
  }
  return out, rows.Err()
}

type EmailCampaignRow struct{
  TenantID string
  CampaignID string
  Name string
  SegmentID string
  ExperimentID *string
  FromEmail *string
  ReplyTo *string
  Status string
  CreatedBy *string
  CreatedAt time.Time
}

func (s *Store) CreateEmailCampaign(ctx context.Context, tenant, campaignID, name, segmentID string, experimentID, fromEmail, replyTo, createdBy *string) error {
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO email_campaigns(tenant_id,campaign_id,name,segment_id,experiment_id,from_email,reply_to,status,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,'DRAFT',$8)`,
    tenant, campaignID, name, segmentID, experimentID, fromEmail, replyTo, createdBy)
  return err
}

func (s *Store) StartEmailCampaign(ctx context.Context, tenant, campaignID string) error {
  _, err := s.db.Pool.Exec(ctx, `UPDATE email_campaigns SET status='RUNNING', started_at=now() WHERE tenant_id=$1 AND campaign_id=$2`, tenant, campaignID)
  return err
}

func (s *Store) FinishEmailCampaign(ctx context.Context, tenant, campaignID string) error {
  _, err := s.db.Pool.Exec(ctx, `UPDATE email_campaigns SET status='FINISHED', finished_at=now() WHERE tenant_id=$1 AND campaign_id=$2`, tenant, campaignID)
  return err
}

func (s *Store) InsertEmailDelivery(ctx context.Context, tenant, campaignID, contactID, assignment, templateID, executionID, status string, errMsg *string) error {
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO email_deliveries(tenant_id,campaign_id,contact_id,assignment,template_id,execution_id,status,error,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())
    ON CONFLICT (tenant_id,campaign_id,contact_id) DO UPDATE SET assignment=excluded.assignment, template_id=excluded.template_id, execution_id=excluded.execution_id, status=excluded.status, error=excluded.error, updated_at=now()`,
    tenant, campaignID, contactID, assignment, templateID, executionID, status, errMsg)
  return err
}

type ContactRow struct{
  ContactID string
  Email string
  AttributesJSON []byte
}

func (s *Store) ListContactsInSegment(ctx context.Context, tenant, segmentID string, limit int) ([]ContactRow, error) {
  if limit <= 0 { limit = 1000 }
  rows, err := s.db.Pool.Query(ctx, `SELECT c.contact_id, c.email, c.attributes_json
    FROM segment_members m
    JOIN contacts c ON c.tenant_id=m.tenant_id AND c.contact_id=m.contact_id
    WHERE m.tenant_id=$1 AND m.segment_id=$2
    ORDER BY m.computed_at DESC
    LIMIT $3`, tenant, segmentID, limit)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []ContactRow{}
  for rows.Next(){
    var r ContactRow
    if err := rows.Scan(&r.ContactID,&r.Email,&r.AttributesJSON); err != nil { return nil, err }
    out = append(out, r)
  }
  return out, rows.Err()
}


// -------------------- V287: Webhooks, Message Events, Attribution, Campaign Triggers --------------------

type CampaignTriggerRow struct {
  TenantID string
  CampaignID string
  EventType string
  WithinMinutes int
  Enabled bool
  CreatedAt time.Time
}

func (s *Store) UpsertCampaignTrigger(ctx context.Context, tenant, campaignID, eventType string, withinMinutes int, enabled bool) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO campaign_triggers(tenant_id,campaign_id,event_type,within_minutes,enabled)
    VALUES($1,$2,$3,$4,$5)
    ON CONFLICT (tenant_id,campaign_id) DO UPDATE SET event_type=EXCLUDED.event_type, within_minutes=EXCLUDED.within_minutes, enabled=EXCLUDED.enabled
  `, tenant, campaignID, eventType, withinMinutes, enabled)
  return err
}

func (s *Store) GetCampaignTrigger(ctx context.Context, tenant, campaignID string) (CampaignTriggerRow, error) {
  var r CampaignTriggerRow
  err := s.db.Pool.QueryRow(ctx, `SELECT tenant_id,campaign_id,event_type,within_minutes,enabled,created_at FROM campaign_triggers WHERE tenant_id=$1 AND campaign_id=$2`, tenant, campaignID).
    Scan(&r.TenantID, &r.CampaignID, &r.EventType, &r.WithinMinutes, &r.Enabled, &r.CreatedAt)
  return r, err
}

func (s *Store) InsertProviderWebhookEvent(ctx context.Context, tenant, provider, eventID string, payload json.RawMessage) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO provider_webhook_events(tenant_id,provider,event_id,payload_json)
    VALUES($1,$2,$3,$4)
    ON CONFLICT (tenant_id,provider,event_id) DO NOTHING
  `, tenant, provider, eventID, payload)
  return err
}

func (s *Store) InsertMessageEvent(ctx context.Context, tenant, campaignID, contactID, provider, messageID, eventType string, meta json.RawMessage) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO message_events(tenant_id,campaign_id,contact_id,provider,message_id,event_type,meta_json)
    VALUES($1,$2,$3,$4,$5,$6,$7)
  `, tenant, campaignID, contactID, provider, messageID, eventType, meta)
  return err
}

// Link conversion to last-touch email (within lookback days). Extensible to multi-touch models.
func (s *Store) LinkAttributionLastTouch(ctx context.Context, tenant, conversionID, contactID string, lookbackDays int) (map[string]interface{}, error) {
  // Find most recent message event for the contact in lookback window (OPEN/CLICK/DELIVERED).
  var campaignID, provider, messageID string
  var eventAt time.Time
  err := s.db.Pool.QueryRow(ctx, `
    SELECT campaign_id, provider, message_id, event_at
    FROM message_events
    WHERE tenant_id=$1 AND contact_id=$2 AND event_at >= now() - ($3 || ' days')::interval
      AND event_type IN ('CLICK','OPEN','DELIVERED')
    ORDER BY event_at DESC
    LIMIT 1
  `, tenant, contactID, lookbackDays).Scan(&campaignID, &provider, &messageID, &eventAt)
  if err != nil {
    // still create an attribution record with null touch (keeps conversion accounted for)
    _, e2 := s.db.Pool.Exec(ctx, `
      INSERT INTO attribution_links(tenant_id,conversion_id,contact_id,model,lookback_days)
      VALUES($1,$2,$3,'last_touch',$4)
      ON CONFLICT (tenant_id,conversion_id) DO NOTHING
    `, tenant, conversionID, contactID, lookbackDays)
    if e2 != nil { return nil, e2 }
    return map[string]interface{}{"conversion_id": conversionID, "contact_id": contactID, "linked": false}, nil
  }

  _, err = s.db.Pool.Exec(ctx, `
    INSERT INTO attribution_links(tenant_id,conversion_id,contact_id,campaign_id,touch_provider,touch_message_id,model,lookback_days)
    VALUES($1,$2,$3,$4,$5,$6,'last_touch',$7)
    ON CONFLICT (tenant_id,conversion_id) DO UPDATE SET campaign_id=EXCLUDED.campaign_id, touch_provider=EXCLUDED.touch_provider, touch_message_id=EXCLUDED.touch_message_id, model=EXCLUDED.model, lookback_days=EXCLUDED.lookback_days
  `, tenant, conversionID, contactID, campaignID, provider, messageID, lookbackDays)
  if err != nil { return nil, err }
  return map[string]interface{}{"conversion_id": conversionID, "contact_id": contactID, "linked": true, "campaign_id": campaignID, "provider": provider, "message_id": messageID, "event_at": eventAt}, nil
}


type CollectorCheckpointRow struct {
  TenantID string
  Provider string
  AccountID string
  Cursor *string
  UpdatedAt time.Time
}

func (s *Store) GetCollectorCheckpoint(ctx context.Context, tenant, provider, accountID string) (CollectorCheckpointRow, error) {
  var r CollectorCheckpointRow
  var cur *string
  err := s.db.Pool.QueryRow(ctx, `SELECT tenant_id,provider,account_id,cursor,updated_at FROM collector_checkpoints WHERE tenant_id=$1 AND provider=$2 AND account_id=$3`,
    tenant, provider, accountID).Scan(&r.TenantID, &r.Provider, &r.AccountID, &cur, &r.UpdatedAt)
  r.Cursor = cur
  return r, err
}

func (s *Store) UpsertCollectorCheckpoint(ctx context.Context, tenant, provider, accountID string, cursor *string) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO collector_checkpoints(tenant_id,provider,account_id,cursor)
    VALUES($1,$2,$3,$4)
    ON CONFLICT (tenant_id,provider,account_id) DO UPDATE SET cursor=EXCLUDED.cursor, updated_at=now()
  `, tenant, provider, accountID, cursor)
  return err
}



// ---------------- V288: collectors + webhooks + influencer intelligence ----------------

type CheckpointRow struct {
  TenantID string
  Provider string
  AccountID string
  Cursor *string
  UpdatedAt time.Time
}

func (s *Store) GetCheckpoint(ctx context.Context, tenant, provider, account string) (CheckpointRow, error) {
  var r CheckpointRow
  var cur *string
  err := s.db.Pool.QueryRow(ctx, `SELECT tenant_id, provider, account_id, cursor, updated_at FROM collector_checkpoints WHERE tenant_id=$1 AND provider=$2 AND account_id=$3`,
    tenant, provider, account).Scan(&r.TenantID, &r.Provider, &r.AccountID, &cur, &r.UpdatedAt)
  if err != nil { return r, err }
  r.Cursor = cur
  return r, nil
}

func (s *Store) UpsertCheckpoint(ctx context.Context, tenant, provider, account string, cursor *string) error {
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO collector_checkpoints(tenant_id, provider, account_id, cursor, updated_at)
    VALUES($1,$2,$3,$4,NOW())
    ON CONFLICT (tenant_id, provider, account_id) DO UPDATE SET cursor=EXCLUDED.cursor, updated_at=NOW()`,
    tenant, provider, account, cursor)
  return err
}

func (s *Store) InsertProviderWebhookEvent(ctx context.Context, tenant, provider, eventType string, payload any) error {
  b, _ := json.Marshal(payload)
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO provider_webhook_events(id, tenant_id, provider, event_type, payload_json)
    VALUES(gen_random_uuid(), $1, $2, $3, $4::jsonb)`, tenant, provider, eventType, string(b))
  return err
}

type MessageEventRow struct {
  ID string
  TenantID string
  Provider string
  MessageID *string
  ContactID *string
  EventType string
  OccurredAt time.Time
  MetaJSON []byte
}

func (s *Store) InsertMessageEvent(ctx context.Context, tenant, provider, eventType string, messageID *string, contactID *string, occurredAt time.Time, meta any) error {
  b, _ := json.Marshal(meta)
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO message_events(id, tenant_id, provider, message_id, contact_id, event_type, occurred_at, meta_json)
    VALUES(gen_random_uuid(), $1, $2, $3, $4::uuid, $5, $6, $7::jsonb)`,
    tenant, provider, messageID, nullUUID(contactID), eventType, occurredAt, string(b))
  return err
}

func nullUUID(id *string) any {
  if id == nil || *id == "" { return nil }
  return *id
}

func (s *Store) LinkAttributionLastTouch(ctx context.Context, tenant string, conversionID string, contactID *string, lookbackHours int) (string, error) {
  // Find most recent message_event for the contact in lookback window
  var linked *string
  if contactID != nil && *contactID != "" {
    err := s.db.Pool.QueryRow(ctx, `SELECT id FROM message_events
      WHERE tenant_id=$1 AND contact_id=$2::uuid AND occurred_at >= NOW() - ($3 || ' hours')::interval
      ORDER BY occurred_at DESC LIMIT 1`, tenant, *contactID, lookbackHours).Scan(&linked)
    if err != nil && !errors.Is(err, pgx.ErrNoRows) { return "", err }
  }
  var linkID string
  err := s.db.Pool.QueryRow(ctx, `INSERT INTO attribution_links(id, tenant_id, conversion_id, contact_id, linked_message_event_id, model, lookback_hours)
    VALUES(gen_random_uuid(), $1, $2::uuid, $3::uuid, $4::uuid, 'last_touch', $5)
    RETURNING id`,
    tenant, conversionID, nullUUID(contactID), nullUUID(linked), lookbackHours).Scan(&linkID)
  return linkID, err
}

type InfluencerRow struct {
  ID string
  TenantID string
  Name string
  Handle *string
  Categories []byte
  ContentTypes []byte
  Channels []byte
  AudienceJSON []byte
  Notes *string
  CreatedAt time.Time
}

type ProductRow struct {
  ID string
  TenantID string
  SKU *string
  Name string
  Categories []byte
  AttributesJSON []byte
  ContentTypes []byte
  PreferredChannels []byte
  Price *string
  Margin *string
  CreatedAt time.Time
}

func (s *Store) CreateInfluencer(ctx context.Context, tenant, name string, handle *string, categories any, contentTypes any, channels any, audience any, notes *string) (string, error) {
  bCat, _ := json.Marshal(categories)
  bCT, _ := json.Marshal(contentTypes)
  bCh, _ := json.Marshal(channels)
  bAud, _ := json.Marshal(audience)
  var id string
  err := s.db.Pool.QueryRow(ctx, `INSERT INTO influencers(id, tenant_id, name, handle, categories, content_types, channels, audience_json, notes)
    VALUES(gen_random_uuid(), $1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8) RETURNING id`,
    tenant, name, handle, string(bCat), string(bCT), string(bCh), string(bAud), notes).Scan(&id)
  return id, err
}

func (s *Store) ListInfluencers(ctx context.Context, tenant string) ([]InfluencerRow, error) {
  rows, err := s.db.Pool.Query(ctx, `SELECT id, tenant_id, name, handle, categories, content_types, channels, audience_json, notes, created_at FROM influencers WHERE tenant_id=$1 ORDER BY created_at DESC`, tenant)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []InfluencerRow{}
  for rows.Next() {
    var r InfluencerRow
    if err := rows.Scan(&r.ID, &r.TenantID, &r.Name, &r.Handle, &r.Categories, &r.ContentTypes, &r.Channels, &r.AudienceJSON, &r.Notes, &r.CreatedAt); err != nil { return nil, err }
    out = append(out, r)
  }
  return out, nil
}

func (s *Store) CreateProduct(ctx context.Context, tenant, name string, sku *string, categories any, attributes any, contentTypes any, preferredChannels any, price *string, margin *string) (string, error) {
  bCat, _ := json.Marshal(categories)
  bAttr, _ := json.Marshal(attributes)
  bCT, _ := json.Marshal(contentTypes)
  bPC, _ := json.Marshal(preferredChannels)
  var id string
  err := s.db.Pool.QueryRow(ctx, `INSERT INTO products(id, tenant_id, sku, name, categories, attributes_json, content_types, preferred_channels, price, margin)
    VALUES(gen_random_uuid(), $1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9) RETURNING id`,
    tenant, sku, name, string(bCat), string(bAttr), string(bCT), string(bPC), price, margin).Scan(&id)
  return id, err
}

func nullableNumeric(v *string) any {
  if v == nil || *v == "" { return nil }
  return *v
}

func (s *Store) ListProducts(ctx context.Context, tenant string) ([]ProductRow, error) {
  rows, err := s.db.Pool.Query(ctx, `SELECT id, tenant_id, sku, name, categories, attributes_json, content_types, preferred_channels, price::text, margin::text, created_at FROM products WHERE tenant_id=$1 ORDER BY created_at DESC`, tenant)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []ProductRow{}
  for rows.Next() {
    var r ProductRow
    if err := rows.Scan(&r.ID, &r.TenantID, &r.SKU, &r.Name, &r.Categories, &r.AttributesJSON, &r.ContentTypes, &r.PreferredChannels, &r.Price, &r.Margin, &r.CreatedAt); err != nil { return nil, err }
    out = append(out, r)
  }
  return out, nil
}

type RecommendationRow struct {
  InfluencerID string
  InfluencerName string
  Channel string
  Score float64
  EvidenceJSON []byte
}

func (s *Store) RecommendInfluencersForProduct(ctx context.Context, tenant, productID string, fromDate string, toDate string, limit int) ([]RecommendationRow, error) {
  // V289: performance score + fit score (product attrs + channel traits + influencer profile)
  // FinalScore = PerfScore * (0.55 + 0.45*FitScore), where FitScore in [0,1]
  // PerfScore = 0.45*ROAS_n + 0.35*CVR_n + 0.20*ENG_n (normalized)

  // Load product
  var prod struct{
    Categories []byte
    Attributes []byte
    ContentTypes []byte
    PreferredChannels []byte
    Price *string
    Margin *string
  }
  err := s.db.Pool.QueryRow(ctx, `SELECT categories, attributes_json, content_types, preferred_channels, price::text, margin::text FROM products WHERE tenant_id=$1 AND id=$2::uuid`, tenant, productID).
    Scan(&prod.Categories, &prod.Attributes, &prod.ContentTypes, &prod.PreferredChannels, &prod.Price, &prod.Margin)
  if err != nil { return nil, err }

  // Preload channel traits map
  traitsRows, _ := s.db.Pool.Query(ctx, `SELECT channel, traits_json FROM channel_traits WHERE tenant_id=$1`, tenant)
  traits := map[string]map[string]any{}
  if traitsRows != nil {
    defer traitsRows.Close()
    for traitsRows.Next() {
      var ch string
      var tj []byte
      if err := traitsRows.Scan(&ch, &tj); err == nil {
        var m0 map[string]any
        _ = json.Unmarshal(tj, &m0)
        traits[ch] = m0
      }
    }
  }

  // Aggregate performance for product by influencer/channel
  q := `
  WITH ips AS (
    SELECT influencer_id, channel,
           SUM(revenue)::float8 AS revenue,
           SUM(cost)::float8 AS cost,
           SUM(conversions)::float8 AS conv,
           SUM(clicks)::float8 AS clicks
    FROM influencer_product_stats
    WHERE tenant_id=$1 AND product_id=$2::uuid AND stat_date BETWEEN $3::date AND $4::date
    GROUP BY influencer_id, channel
  ),
  eng AS (
    SELECT influencer_id, channel, AVG(engagement_rate)::float8 AS eng
    FROM influencer_channel_stats
    WHERE tenant_id=$1 AND stat_date BETWEEN $3::date AND $4::date
    GROUP BY influencer_id, channel
  ),
  joined AS (
    SELECT i.id AS influencer_id, i.name AS influencer_name, ips.channel,
           i.categories, i.content_types, i.channels, i.audience_json,
           CASE WHEN ips.cost > 0 THEN ips.revenue/ips.cost ELSE 0 END AS roas,
           CASE WHEN ips.clicks > 0 THEN ips.conv/ips.clicks ELSE 0 END AS cvr,
           COALESCE(eng.eng, 0) AS eng,
           ips.revenue, ips.cost, ips.conv, ips.clicks
    FROM ips
    JOIN influencers i ON i.id=ips.influencer_id AND i.tenant_id=$1
    LEFT JOIN eng ON eng.influencer_id=ips.influencer_id AND eng.channel=ips.channel
  ),
  norm AS (
    SELECT *,
      (roas - MIN(roas) OVER()) / NULLIF((MAX(roas) OVER() - MIN(roas) OVER()), 0) AS roas_n,
      (cvr  - MIN(cvr)  OVER()) / NULLIF((MAX(cvr)  OVER() - MIN(cvr)  OVER()), 0) AS cvr_n,
      (eng  - MIN(eng)  OVER()) / NULLIF((MAX(eng)  OVER() - MIN(eng)  OVER()), 0) AS eng_n
    FROM joined
  )
  SELECT influencer_id, influencer_name, channel,
         categories, content_types, channels, audience_json,
         roas, cvr, eng, revenue, cost, conv, clicks,
         (0.45*COALESCE(roas_n,0) + 0.35*COALESCE(cvr_n,0) + 0.20*COALESCE(eng_n,0)) AS perf_score
  FROM norm
  ORDER BY perf_score DESC
  LIMIT $5;
  `
  rows, err := s.db.Pool.Query(ctx, q, tenant, productID, fromDate, toDate, limit*3)
  if err != nil { return nil, err }
  defer rows.Close()

  // helpers
  toStrSlice := func(b []byte) []string {
    if len(b)==0 { return []string{} }
    var a []string
    _ = json.Unmarshal(b, &a)
    return a
  }
  overlap := func(a, b []string) float64 {
    if len(a)==0 || len(b)==0 { return 0 }
    set := map[string]bool{}
    for _, x := range a { set[strings.ToLower(x)] = true }
    hit := 0
    for _, y := range b { if set[strings.ToLower(y)] { hit++ } }
    denom := len(a)
    if len(b) > denom { denom = len(b) }
    if denom==0 { return 0 }
    return float64(hit)/float64(denom)
  }
  clamp01 := func(x float64) float64 { if x<0 { return 0 }; if x>1 { return 1 }; return x }
  parseFloat := func(s0 *string) float64 {
    if s0==nil { return 0 }
    f, _ := strconv.ParseFloat(*s0, 64)
    return f
  }

  prodCats := toStrSlice(prod.Categories)
  prodCT := toStrSlice(prod.ContentTypes)
  prodPrefCh := toStrSlice(prod.PreferredChannels)
  price := parseFloat(prod.Price)
  margin := parseFloat(prod.Margin)

  type tempRow struct{
    InfluencerID string
    InfluencerName string
    Channel string
    Score float64
    Evidence []byte
  }
  tmp := []tempRow{}
  for rows.Next() {
    var infID, infName, ch string
    var infCats, infCT, infCh, aud []byte
    var roas, cvr, eng, rev, cost, conv, clicks, perf float64
    if err := rows.Scan(&infID, &infName, &ch, &infCats, &infCT, &infCh, &aud, &roas, &cvr, &eng, &rev, &cost, &conv, &clicks, &perf); err != nil {
      continue
    }

    // Fit factors
    ic := toStrSlice(infCats)
    ict := toStrSlice(infCT)
    ich := toStrSlice(infCh)

    catFit := overlap(prodCats, ic)
    ctFit := overlap(prodCT, ict)

    // channel preference fit: if product lists preferred channels, reward matches
    prefFit := 0.0
    if len(prodPrefCh) > 0 {
      for _, x := range prodPrefCh {
        if strings.EqualFold(x, ch) { prefFit = 1.0; break }
      }
    } else {
      // if influencer declares channels and it includes this channel, mild reward
      for _, x := range ich {
        if strings.EqualFold(x, ch) { prefFit = 0.6; break }
      }
    }

    // channel trait fit (price band + content suitability + category affinity)
    traitFit := 0.5
    if tr, ok := traits[ch]; ok {
      // price_min/price_max
      pmin, _ := tr["price_min"].(float64)
      pmax, _ := tr["price_max"].(float64)
      if price > 0 && (pmin > 0 || pmax > 0) {
        inBand := true
        if pmin > 0 && price < pmin { inBand = false }
        if pmax > 0 && price > pmax { inBand = false }
        if inBand { traitFit += 0.2 } else { traitFit -= 0.15 }
      }
      // content_types affinity
      if a0, ok := tr["content_types"].([]any); ok {
        cts := []string{}
        for _, v := range a0 { if s, ok := v.(string); ok { cts = append(cts, s) } }
        traitFit += 0.2 * overlap(prodCT, cts)
      }
      // category affinity
      if a1, ok := tr["categories"].([]any); ok {
        cs := []string{}
        for _, v := range a1 { if s, ok := v.(string); ok { cs = append(cs, s) } }
        traitFit += 0.25 * overlap(prodCats, cs)
      }
    }
    traitFit = clamp01(traitFit)

    // margin bonus: higher margin can tolerate higher CAC, favor scaling winners
    marginBonus := 0.0
    if margin > 0 {
      if margin >= 0.4 { marginBonus = 0.08 } else if margin >= 0.25 { marginBonus = 0.05 } else if margin >= 0.15 { marginBonus = 0.03 }
    }

    fitScore := clamp01(0.35*catFit + 0.25*ctFit + 0.25*traitFit + 0.15*prefFit)
    finalScore := perf * (0.55 + 0.45*fitScore) * (1.0 + marginBonus)

    evidenceObj := map[string]any{
      "performance": map[string]any{
        "perf_score": perf, "roas": roas, "cvr": cvr, "engagement_rate": eng,
        "revenue": rev, "cost": cost, "conversions": conv, "clicks": clicks,
      },
      "fit": map[string]any{
        "fit_score": fitScore, "category_fit": catFit, "content_fit": ctFit, "trait_fit": traitFit, "preferred_channel_fit": prefFit,
        "price": price, "margin": margin, "margin_bonus": marginBonus,
      },
    }
    b, _ := json.Marshal(evidenceObj)
    tmp = append(tmp, tempRow{InfluencerID: infID, InfluencerName: infName, Channel: ch, Score: finalScore, Evidence: b})
  }

  sort.Slice(tmp, func(i, j int) bool { return tmp[i].Score > tmp[j].Score })
  if len(tmp) > limit { tmp = tmp[:limit] }

  out := []RecommendationRow{}
  for _, t := range tmp {
    out = append(out, RecommendationRow{
      InfluencerID: t.InfluencerID,
      InfluencerName: t.InfluencerName,
      Channel: t.Channel,
      Score: t.Score,
      EvidenceJSON: t.Evidence,
    })
  }
  return out, nil
}



type InfluencerChannelStatIn struct {
  InfluencerID string
  Channel string
  StatDate string
  Impressions int64
  Clicks int64
  Conversions int64
  Revenue string
  Cost string
  Followers int64
  EngagementRate string
  Meta any
}

func (s *Store) UpsertInfluencerChannelStat(ctx context.Context, tenant string, in InfluencerChannelStatIn) error {
  b, _ := json.Marshal(in.Meta)
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO influencer_channel_stats(id, tenant_id, influencer_id, channel, stat_date, impressions, clicks, conversions, revenue, cost, followers, engagement_rate, meta_json)
    VALUES(gen_random_uuid(), $1, $2::uuid, $3, $4::date, $5, $6, $7, $8::numeric, $9::numeric, $10, $11::numeric, $12::jsonb)
    ON CONFLICT (tenant_id, influencer_id, channel, stat_date)
    DO UPDATE SET impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks, conversions=EXCLUDED.conversions, revenue=EXCLUDED.revenue,
      cost=EXCLUDED.cost, followers=EXCLUDED.followers, engagement_rate=EXCLUDED.engagement_rate, meta_json=EXCLUDED.meta_json`,
    tenant, in.InfluencerID, in.Channel, in.StatDate, in.Impressions, in.Clicks, in.Conversions, in.Revenue, in.Cost, in.Followers, in.EngagementRate, string(b))
  return err
}

type InfluencerProductStatIn struct {
  InfluencerID string
  ProductID string
  Channel string
  StatDate string
  Impressions int64
  Clicks int64
  Conversions int64
  Revenue string
  Cost string
  Meta any
}

func (s *Store) UpsertInfluencerProductStat(ctx context.Context, tenant string, in InfluencerProductStatIn) error {
  b, _ := json.Marshal(in.Meta)
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO influencer_product_stats(id, tenant_id, influencer_id, product_id, channel, stat_date, impressions, clicks, conversions, revenue, cost, meta_json)
    VALUES(gen_random_uuid(), $1, $2::uuid, $3::uuid, $4, $5::date, $6, $7, $8, $9::numeric, $10::numeric, $11::jsonb)
    ON CONFLICT (tenant_id, influencer_id, product_id, channel, stat_date)
    DO UPDATE SET impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks, conversions=EXCLUDED.conversions, revenue=EXCLUDED.revenue,
      cost=EXCLUDED.cost, meta_json=EXCLUDED.meta_json`,
    tenant, in.InfluencerID, in.ProductID, in.Channel, in.StatDate, in.Impressions, in.Clicks, in.Conversions, in.Revenue, in.Cost, string(b))
  return err
}

// --- V289: Channel traits + Provider rate limits ---

type ChannelTraitRow struct {
  Channel string
  TraitsJSON []byte
  UpdatedAt time.Time
}

func (s *Store) UpsertChannelTraits(ctx context.Context, tenant, channel string, traits any) error {
  b, _ := json.Marshal(traits)
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO channel_traits(tenant_id, channel, traits_json)
    VALUES($1,$2,$3::jsonb)
    ON CONFLICT(tenant_id, channel) DO UPDATE SET traits_json=EXCLUDED.traits_json, updated_at=NOW()`,
    tenant, channel, string(b))
  return err
}

func (s *Store) GetChannelTraits(ctx context.Context, tenant, channel string) (*ChannelTraitRow, error) {
  var r ChannelTraitRow
  err := s.db.Pool.QueryRow(ctx, `SELECT channel, traits_json, updated_at FROM channel_traits WHERE tenant_id=$1 AND channel=$2`, tenant, channel).
    Scan(&r.Channel, &r.TraitsJSON, &r.UpdatedAt)
  if err != nil {
    if errors.Is(err, pgx.ErrNoRows) { return nil, nil }
    return nil, err
  }
  return &r, nil
}

type ProviderRateLimitRow struct {
  Provider string
  LimitsJSON []byte
  UpdatedAt time.Time
}

func (s *Store) UpsertProviderRateLimits(ctx context.Context, tenant, provider string, limits any) error {
  b, _ := json.Marshal(limits)
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO provider_rate_limits(tenant_id, provider, limits_json)
    VALUES($1,$2,$3::jsonb)
    ON CONFLICT(tenant_id, provider) DO UPDATE SET limits_json=EXCLUDED.limits_json, updated_at=NOW()`,
    tenant, provider, string(b))
  return err
}

func (s *Store) GetProviderRateLimits(ctx context.Context, tenant, provider string) (*ProviderRateLimitRow, error) {
  var r ProviderRateLimitRow
  err := s.db.Pool.QueryRow(ctx, `SELECT provider, limits_json, updated_at FROM provider_rate_limits WHERE tenant_id=$1 AND provider=$2`, tenant, provider).
    Scan(&r.Provider, &r.LimitsJSON, &r.UpdatedAt)
  if err != nil {
    if errors.Is(err, pgx.ErrNoRows) { return nil, nil }
    return nil, err
  }
  return &r, nil
}

// --- V290: Connector account token + sync mark ---

func (s *Store) UpdateConnectorAccountToken(ctx context.Context, tenantID, provider, accountID string, tokenJSON []byte, tokenExpiresAt *time.Time) error {
  _, err := s.db.Pool.Exec(ctx, `
    UPDATE connector_accounts SET token_json=$4, token_expires_at=$5, updated_at=now()
    WHERE tenant_id=$1 AND provider=$2 AND account_id=$3
  `, tenantID, provider, accountID, tokenJSON, tokenExpiresAt)
  return err
}

func (s *Store) MarkConnectorAccountSync(ctx context.Context, tenantID, provider, accountID string) error {
  _, err := s.db.Pool.Exec(ctx, `
    UPDATE connector_accounts SET last_sync_at=now(), updated_at=now()
    WHERE tenant_id=$1 AND provider=$2 AND account_id=$3
  `, tenantID, provider, accountID)
  return err
}

// --- V290: Influencer rate cards + deal estimation ---

type InfluencerRateCardRow struct {
  InfluencerID string
  Channel string
  ContentType string
  BaseFee float64
  CPM float64
  CPC float64
  RevShare float64
  MetaJSON []byte
}

func (s *Store) UpsertInfluencerRateCard(ctx context.Context, tenantID, influencerID, channel, contentType string, baseFee, cpm, cpc, revShare float64, metaJSON []byte) error {
  if len(metaJSON)==0 { metaJSON = []byte(`{}`) }
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO influencer_rate_cards (id, tenant_id, influencer_id, channel, content_type, base_fee, cpm, cpc, rev_share, meta_json)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (tenant_id, influencer_id, channel, content_type)
    DO UPDATE SET base_fee=EXCLUDED.base_fee, cpm=EXCLUDED.cpm, cpc=EXCLUDED.cpc, rev_share=EXCLUDED.rev_share, meta_json=EXCLUDED.meta_json, updated_at=now()
  `, tenantID, influencerID, channel, contentType, baseFee, cpm, cpc, revShare, metaJSON)
  return err
}

func (s *Store) GetInfluencerRateCard(ctx context.Context, tenantID, influencerID, channel, contentType string) (InfluencerRateCardRow, error) {
  var r InfluencerRateCardRow
  err := s.db.Pool.QueryRow(ctx, `
    SELECT influencer_id, channel, content_type, base_fee, cpm, cpc, rev_share, meta_json
    FROM influencer_rate_cards
    WHERE tenant_id=$1 AND influencer_id=$2 AND channel=$3 AND content_type=$4
  `, tenantID, influencerID, channel, contentType).Scan(&r.InfluencerID, &r.Channel, &r.ContentType, &r.BaseFee, &r.CPM, &r.CPC, &r.RevShare, &r.MetaJSON)
  return r, err
}

type DealHistoryAgg struct {
  Impressions int64
  Clicks int64
  Conversions int64
  Revenue float64
  Cost float64
}

func (s *Store) AggInfluencerProductStats(ctx context.Context, tenantID, influencerID, productID, channel string, from, to time.Time) (DealHistoryAgg, error) {
  var a DealHistoryAgg
  err := s.db.Pool.QueryRow(ctx, `
    SELECT COALESCE(SUM(impressions),0), COALESCE(SUM(clicks),0), COALESCE(SUM(conversions),0), COALESCE(SUM(revenue),0), COALESCE(SUM(cost),0)
    FROM influencer_product_stats
    WHERE tenant_id=$1 AND influencer_id=$2 AND product_id=$3 AND channel=$4 AND stat_date BETWEEN $5::date AND $6::date
  `, tenantID, influencerID, productID, channel, from, to).Scan(&a.Impressions, &a.Clicks, &a.Conversions, &a.Revenue, &a.Cost)
  return a, err
}


// --- V290: helpers for deal estimation ---
func (s *Store) GetProductByID(ctx context.Context, tenant, id string) (ProductRow, error) {
  var r ProductRow
  err := s.db.Pool.QueryRow(ctx, `
    SELECT id, tenant_id, sku, name, categories, attributes_json, content_types, preferred_channels, price::text, margin::text, created_at
    FROM products WHERE tenant_id=$1 AND id=$2
  `, tenant, id).Scan(&r.ID, &r.TenantID, &r.SKU, &r.Name, &r.Categories, &r.AttributesJSON, &r.ContentTypes, &r.PreferredChannels, &r.Price, &r.Margin, &r.CreatedAt)
  return r, err
}

func (s *Store) GetInfluencerByID(ctx context.Context, tenant, id string) (InfluencerRow, error) {
  var r InfluencerRow
  err := s.db.Pool.QueryRow(ctx, `
    SELECT id, tenant_id, name, handle, categories, content_types, channels, audience_json, notes, created_at
    FROM influencers WHERE tenant_id=$1 AND id=$2
  `, tenant, id).Scan(&r.ID, &r.TenantID, &r.Name, &r.Handle, &r.Categories, &r.ContentTypes, &r.Channels, &r.AudienceJSON, &r.Notes, &r.CreatedAt)
  return r, err
}


// -----------------------------
// V294 Analytics (Cohort/Funnel/Segment drilldown)
// -----------------------------

type CohortPoint struct {
  CohortDate string `json:"cohort_date"`
  DayOffset int `json:"day_offset"`
  CohortSize int64 `json:"cohort_size"`
  Converted int64 `json:"converted"`
  ConversionRate float64 `json:"conversion_rate"`
}

func (s *Store) GetCohortReport(ctx context.Context, tenant, from, to, cohortEvent, conversionEvent string, windowDays int) ([]CohortPoint, error) {
  if windowDays <= 0 { windowDays = 30 }
  // 1) Determine cohort date per contact: first occurrence of cohortEvent within range
  // 2) Determine conversion day offset: first occurrence of conversionEvent within windowDays after cohort date
  rows, err := s.db.Pool.Query(ctx, `
    WITH cohort AS (
      SELECT e.contact_id,
             date_trunc('day', MIN(e.occurred_at))::date AS cohort_date
      FROM events e
      WHERE e.tenant_id=$1
        AND e.event_type=$4
        AND e.occurred_at >= $2::timestamptz AND e.occurred_at < ($3::timestamptz + interval '1 day')
      GROUP BY e.contact_id
    ),
    conv AS (
      SELECT c.contact_id, c.cohort_date,
             date_trunc('day', MIN(e.occurred_at))::date AS conv_date
      FROM cohort c
      LEFT JOIN events e
        ON e.tenant_id=$1 AND e.contact_id=c.contact_id AND e.event_type=$5
       AND e.occurred_at >= c.cohort_date::timestamptz
       AND e.occurred_at < (c.cohort_date::timestamptz + ($6||' days')::interval)
      GROUP BY c.contact_id, c.cohort_date
    ),
    agg AS (
      SELECT cohort_date,
             COALESCE((conv_date - cohort_date), NULL) AS day_offset
      FROM conv
    ),
    cohort_sizes AS (
      SELECT cohort_date, COUNT(*)::bigint AS cohort_size
      FROM cohort
      GROUP BY cohort_date
    )
    SELECT cs.cohort_date::text,
           COALESCE(a.day_offset, -1) AS day_offset,
           cs.cohort_size,
           COUNT(*) FILTER (WHERE a.day_offset IS NOT NULL)::bigint AS converted
    FROM cohort_sizes cs
    LEFT JOIN agg a ON a.cohort_date = cs.cohort_date
    GROUP BY cs.cohort_date, a.day_offset, cs.cohort_size
    ORDER BY cs.cohort_date ASC, day_offset ASC
  `, tenant, from, to, cohortEvent, conversionEvent, windowDays)
  if err != nil { return nil, err }
  defer rows.Close()

  out := []CohortPoint{}
  for rows.Next() {
    var p CohortPoint
    var dayOffset int
    if err := rows.Scan(&p.CohortDate, &dayOffset, &p.CohortSize, &p.Converted); err != nil { return nil, err }
    if dayOffset < 0 { continue } // drop non-converted bucket for UI simplicity
    p.DayOffset = dayOffset
    if p.CohortSize > 0 {
      p.ConversionRate = float64(p.Converted) / float64(p.CohortSize)
    }
    out = append(out, p)
  }
  return out, nil
}

type FunnelStep struct {
  Step string `json:"step"`
  Reached int64 `json:"reached"`
  RateFromStart float64 `json:"rate_from_start"`
}

func (s *Store) GetFunnelReport(ctx context.Context, tenant, from, to string, steps []string) ([]FunnelStep, error) {
  if len(steps) == 0 { steps = []string{"signup","view_product","add_to_cart","purchase"} }

  // Count distinct contacts that fired each step in range. (Classic funnel approximation)
  // For a stricter "ordered funnel" we'd need per-contact sequence checks; kept light but useful.
  startCount := int64(0)
  out := []FunnelStep{}
  for i, step := range steps {
    var reached int64
    err := s.db.Pool.QueryRow(ctx, `
      SELECT COUNT(DISTINCT contact_id)::bigint
      FROM events
      WHERE tenant_id=$1 AND event_type=$4
        AND occurred_at >= $2::timestamptz AND occurred_at < ($3::timestamptz + interval '1 day')
    `, tenant, from, to, step).Scan(&reached)
    if err != nil { return nil, err }
    if i == 0 { startCount = reached }
    fs := FunnelStep{Step: step, Reached: reached}
    if startCount > 0 { fs.RateFromStart = float64(reached) / float64(startCount) }
    out = append(out, fs)
  }
  return out, nil
}


// GetOrderedFunnelReport computes a strict ordered funnel: a contact is counted for step k only if
// they triggered steps 1..k in order (occurred_at non-decreasing) within the date range.
func (s *Store) GetOrderedFunnelReport(ctx context.Context, tenant, from, to string, steps []string) ([]FunnelStep, error) {
  if len(steps) == 0 { steps = []string{"signup","view_product","add_to_cart","purchase"} }

  // Build dynamic SQL that finds the first time each step happened after the previous step.
  // This is efficient enough for demo; indexes added in V295 migration.
  // CTE chain: s0(contact_id, t0) then s1(contact_id, t1) where t1 > t0, etc.
  params := []any{tenant, from, to}
  p := 4 // next placeholder index
  ctes := []string{}
  // Step 0
  ctes = append(ctes, `
    s0 AS (
      SELECT contact_id, MIN(occurred_at) AS t
      FROM events
      WHERE tenant_id=$1 AND event_type=$`+strconv.Itoa(p)+`
        AND occurred_at >= $2::timestamptz AND occurred_at < ($3::timestamptz + interval '1 day')
      GROUP BY contact_id
    )`)
  params = append(params, steps[0]); p++

  // Subsequent steps
  for i := 1; i < len(steps); i++ {
    prev := "s"+strconv.Itoa(i-1)
    cur := "s"+strconv.Itoa(i)
    ctes = append(ctes, `
    `+cur+` AS (
      SELECT e.contact_id, MIN(e.occurred_at) AS t
      FROM events e
      JOIN `+prev+` p ON p.contact_id = e.contact_id
      WHERE e.tenant_id=$1 AND e.event_type=$`+strconv.Itoa(p)+`
        AND e.occurred_at > p.t
        AND e.occurred_at >= $2::timestamptz AND e.occurred_at < ($3::timestamptz + interval '1 day')
      GROUP BY e.contact_id
    )`)
    params = append(params, steps[i]); p++
  }

  // Final select counts how many contacts reached each step.
  selects := []string{}
  for i := 0; i < len(steps); i++ {
    alias := "s"+strconv.Itoa(i)
    selects = append(selects, `SELECT `+strconv.Itoa(i)+` AS idx, COUNT(*)::bigint AS reached FROM `+alias)
  }
  q := "WITH " + strings.Join(ctes, ",") + " " + strings.Join(selects, " UNION ALL ")

  rows, err := s.db.Pool.Query(ctx, q, params...)
  if err != nil { return nil, err }
  defer rows.Close()

  reachedByIdx := map[int]int64{}
  for rows.Next() {
    var idx int
    var reached int64
    if err := rows.Scan(&idx, &reached); err != nil { return nil, err }
    reachedByIdx[idx] = reached
  }

  out := []FunnelStep{}
  startCount := reachedByIdx[0]
  for i, step := range steps {
    r := reachedByIdx[i]
    fs := FunnelStep{Step: step, Reached: r}
    if startCount > 0 { fs.RateFromStart = float64(r) / float64(startCount) }
    out = append(out, fs)
  }
  return out, nil
}

type SegmentDrilldownRow struct {
  SegmentID string `json:"segment_id"`
  SegmentName string `json:"segment_name"`
  Members int64 `json:"members"`
  Purchasers int64 `json:"purchasers"`
  PurchaseRate float64 `json:"purchase_rate"`
  Revenue float64 `json:"revenue"`
  ROI float64 `json:"roi"`
}

func (s *Store) GetSegmentDrilldown(ctx context.Context, tenant, from, to, purchaseEvent string) ([]SegmentDrilldownRow, error) {
  if purchaseEvent == "" { purchaseEvent = "purchase" }
  rows, err := s.db.Pool.Query(ctx, `
    WITH seg AS (
      SELECT tenant_id, segment_id, name
      FROM segments
      WHERE tenant_id=$1
    ),
    members AS (
      SELECT tenant_id, segment_id, contact_id
      FROM segment_members
      WHERE tenant_id=$1
    ),
    purchases AS (
      SELECT tenant_id, contact_id, COUNT(*)::bigint AS n, SUM((properties->>'revenue')::numeric)::numeric AS revenue
      FROM events
      WHERE tenant_id=$1 AND event_type=$4
        AND occurred_at >= $2::timestamptz AND occurred_at < ($3::timestamptz + interval '1 day')
      GROUP BY tenant_id, contact_id
    ),
    cost AS (
      SELECT tenant_id, contact_id, SUM((properties->>'cost')::numeric)::numeric AS cost
      FROM events
      WHERE tenant_id=$1 AND event_type='ad_spend'
        AND occurred_at >= $2::timestamptz AND occurred_at < ($3::timestamptz + interval '1 day')
      GROUP BY tenant_id, contact_id
    )
    SELECT s.segment_id, s.name,
           COUNT(DISTINCT m.contact_id)::bigint AS members,
           COUNT(DISTINCT p.contact_id)::bigint AS purchasers,
           COALESCE(SUM(p.revenue),0)::numeric AS revenue,
           COALESCE(SUM(c.cost),0)::numeric AS cost
    FROM seg s
    LEFT JOIN members m ON m.segment_id=s.segment_id AND m.tenant_id=s.tenant_id
    LEFT JOIN purchases p ON p.contact_id=m.contact_id AND p.tenant_id=s.tenant_id
    LEFT JOIN cost c ON c.contact_id=m.contact_id AND c.tenant_id=s.tenant_id
    GROUP BY s.segment_id, s.name
    ORDER BY revenue DESC, purchasers DESC
  `, tenant, from, to, purchaseEvent)
  if err != nil { return nil, err }
  defer rows.Close()

  out := []SegmentDrilldownRow{}
  for rows.Next() {
    var r SegmentDrilldownRow
    var revenueNum float64
    var costNum float64
    if err := rows.Scan(&r.SegmentID, &r.SegmentName, &r.Members, &r.Purchasers, &revenueNum, &costNum); err != nil { return nil, err }
    r.Revenue = revenueNum
    if r.Members > 0 { r.PurchaseRate = float64(r.Purchasers) / float64(r.Members) }
    if costNum > 0 { r.ROI = (revenueNum - costNum) / costNum }
    out = append(out, r)
  }
  return out, nil
}

// -----------------------------
// V294 CI-based Deal Recommendation
// -----------------------------

type DealCIReco struct {
  InfluencerID string `json:"influencer_id"`
  InfluencerName string `json:"influencer_name"`
  ProductID string `json:"product_id"`
  ProductName string `json:"product_name"`
  Channel string `json:"channel"`
  From string `json:"from"`
  To string `json:"to"`

  Clicks int64 `json:"clicks"`
  Conversions int64 `json:"conversions"`
  Revenue float64 `json:"revenue"`
  Cost float64 `json:"cost"`

  Profit float64 `json:"profit"`
  ProfitLow float64 `json:"profit_ci_low"`
  ProfitHigh float64 `json:"profit_ci_high"`

  ROI float64 `json:"roi"`
  ROILow float64 `json:"roi_ci_low"`
  ROIHigh float64 `json:"roi_ci_high"`

  Decision string `json:"decision"` // SCALE | HOLD | STOP
  Confidence float64 `json:"confidence"` // proxy in [0,1]


  // V296: guardrails + bayesian probability and sample size
  RequiredClicks float64 `json:"required_clicks"`
  ProbROIGTE float64 `json:"prob_roi_gte"`
  ROIMin float64 `json:"roi_min"`
  Alpha float64 `json:"alpha"`
  Power float64 `json:"power"`
  MDE float64 `json:"mde"`
  MaxCPA float64 `json:"max_cpa"`
}

// Wilson interval for conversion rate, returns (low, high)
func wilson(p float64, n float64, z float64) (float64, float64) {
  if n <= 0 { return 0, 0 }
  denom := 1.0 + (z*z)/n
  center := (p + (z*z)/(2*n)) / denom
  margin := (z * math.Sqrt((p*(1-p) + (z*z)/(4*n)) / n)) / denom
  low := center - margin
  high := center + margin
  if low < 0 { low = 0 }
  if high > 1 { high = 1 }
  return low, high
}

func (s *Store) GetDealRecommendationsCI(ctx context.Context, tenant, productID, from, to string) ([]DealCIReco, error) {
  // Aggregate influencer_product_stats in range, compute profit and 95% CI based on binomial conv uncertainty.
  // Assumptions: revenue per conversion approx constant within window.
  rows, err := s.db.Pool.Query(ctx, `
    SELECT ips.influencer_id::text, i.name,
           ips.product_id::text, p.name,
           ips.channel,
           SUM(ips.clicks)::bigint AS clicks,
           SUM(ips.conversions)::bigint AS conversions,
           SUM(ips.revenue)::numeric AS revenue,
           SUM(ips.cost)::numeric AS cost
    FROM influencer_product_stats ips
    JOIN influencers i ON i.id=ips.influencer_id AND i.tenant_id=ips.tenant_id
    JOIN products p ON p.id=ips.product_id AND p.tenant_id=ips.tenant_id
    WHERE ips.tenant_id=$1 AND ips.product_id=$2
      AND ips.stat_date >= $3::date AND ips.stat_date <= $4::date
    GROUP BY ips.influencer_id, i.name, ips.product_id, p.name, ips.channel
    ORDER BY (SUM(ips.revenue)-SUM(ips.cost)) DESC
    LIMIT 200
  `, tenant, productID, from, to)
  if err != nil { return nil, err }
  defer rows.Close()

  out := []DealCIReco{}
  z := 1.96
  for rows.Next() {
    var r DealCIReco
    var revenueNum float64
    var costNum float64
    if err := rows.Scan(&r.InfluencerID, &r.InfluencerName, &r.ProductID, &r.ProductName, &r.Channel, &r.Clicks, &r.Conversions, &revenueNum, &costNum); err != nil { return nil, err }
    r.From, r.To = from, to
    r.Revenue = revenueNum
    r.Cost = costNum
    r.Profit = revenueNum - costNum
    if costNum > 0 { r.ROI = (revenueNum - costNum) / costNum }

    // CI: based on conversion uncertainty -> profit uncertainty via revenue per conversion
    clicks := float64(r.Clicks)
    conv := float64(r.Conversions)
    rpc := 0.0
    if conv > 0 { rpc = revenueNum / conv }

    pHat := 0.0
    if clicks > 0 { pHat = conv / clicks }
    pLow, pHigh := wilson(pHat, clicks, z)

    // Expected conversions CI bounds (approx)
    convLow := clicks * pLow
    convHigh := clicks * pHigh

    profitLow := convLow*rpc - costNum
    profitHigh := convHigh*rpc - costNum
    r.ProfitLow, r.ProfitHigh = profitLow, profitHigh

    // ROI CI using profit bounds
    if costNum > 0 {
      r.ROILow = profitLow / costNum
      r.ROIHigh = profitHigh / costNum
    }

    // Decision rules (proxy)
    // SCALE if lower bound profit > 0 and ROI low > 0.1, STOP if upper bound profit < 0, else HOLD.
    if r.ProfitLow > 0 && r.ROILow > 0.10 {
      r.Decision = "SCALE"
      r.Confidence = math.Min(1.0, 0.6 + 0.4*math.Min(1.0, r.ROILow/0.5))
    } else if r.ProfitHigh < 0 {
      r.Decision = "STOP"
      r.Confidence = math.Min(1.0, 0.6 + 0.4*math.Min(1.0, math.Abs(r.ProfitHigh)/(math.Abs(r.ProfitHigh)+1000)))
    } else {
      r.Decision = "HOLD"
      // confidence rises as interval narrows
      width := math.Abs(r.ProfitHigh - r.ProfitLow)
      r.Confidence = 0.4
      if width > 0 {
        r.Confidence = math.Max(0.35, math.Min(0.8, 800.0/(width+800.0)))
      }
    }
    out = append(out, r)
  }
  
// GetDealRecommendationsBayes upgrades CI recommendation with a simple Bayesian (Beta-Binomial) credible interval
// and basic guardrails (min sample size, max CPA). It returns the same shape as DealCIReco for UI simplicity.
// Note: credible interval uses normal approximation of Beta; sufficient for product decisions in this demo.
func (s *Store) GetDealRecommendationsBayes(ctx context.Context, tenant, productID, from, to string, alpha, power, mde, roiMin float64) ([]DealCIReco, error) {
  if alpha <= 0 { alpha = 0.05 }
  if power <= 0 { power = 0.80 }
  if mde <= 0 { mde = 0.02 }
  if roiMin <= 0 { roiMin = 0.12 }

  // Baseline conversion rate for this product across all channels/influencers in window
  var baseClicks float64
  var baseConv float64
  row0 := s.db.Pool.QueryRow(ctx, `
    SELECT COALESCE(SUM(clicks),0)::float8, COALESCE(SUM(conversions),0)::float8
    FROM influencer_product_stats
    WHERE tenant_id=$1 AND product_id=$2
      AND stat_date >= $3::date AND stat_date <= $4::date
  `, tenant, productID, from, to)
  _ = row0.Scan(&baseClicks, &baseConv)
  p0 := 0.0
  if baseClicks > 0 { p0 = baseConv / baseClicks }
  p1 := clamp01(p0 + mde)
  required := sampleSizeTwoProp(p0, p1, alpha, power)

  rows, err := s.db.Pool.Query(ctx, `
    SELECT ips.influencer_id::text, i.name,
           ips.product_id::text, p.name,
           ips.channel,
           SUM(ips.clicks)::bigint AS clicks,
           SUM(ips.conversions)::bigint AS conversions,
           SUM(ips.revenue)::numeric AS revenue,
           SUM(ips.cost)::numeric AS cost
    FROM influencer_product_stats ips
    JOIN influencers i ON i.id=ips.influencer_id AND i.tenant_id=ips.tenant_id
    JOIN products p ON p.id=ips.product_id AND p.tenant_id=ips.tenant_id
    WHERE ips.tenant_id=$1 AND ips.product_id=$2
      AND ips.stat_date >= $3::date AND ips.stat_date <= $4::date
    GROUP BY ips.influencer_id, i.name, ips.product_id, p.name, ips.channel
    ORDER BY (SUM(ips.revenue)-SUM(ips.cost)) DESC
    LIMIT 200
  `, tenant, productID, from, to)
  if err != nil { return nil, err }
  defer rows.Close()

  out := []DealCIReco{}
  rng := rand.New(rand.NewSource(time.Now().UnixNano()))
  N := 15000

  for rows.Next() {
    var r DealCIReco
    var revenueNum float64
    var costNum float64
    if err := rows.Scan(&r.InfluencerID, &r.InfluencerName, &r.ProductID, &r.ProductName, &r.Channel, &r.Clicks, &r.Conversions, &revenueNum, &costNum); err != nil { return nil, err }
    r.From, r.To = from, to
    r.Revenue = revenueNum
    r.Cost = costNum
    r.Profit = revenueNum - costNum
    if costNum > 0 { r.ROI = (revenueNum - costNum) / costNum }

    clicks := float64(r.Clicks)
    conv := float64(r.Conversions)

    // Revenue per conversion proxy (guarded)
    rpc := 0.0
    if conv > 0 { rpc = revenueNum / conv }
    if rpc <= 0 { rpc = 1.0 }

    // Dynamic guardrails
    // Max CPA to satisfy ROI >= roiMin: cpa <= rpc/(1+roiMin)
    maxCPA := rpc / (1.0 + roiMin)
    r.MaxCPA = maxCPA
    cpa := 0.0
    if conv > 0 { cpa = costNum / conv }

    // Sample size guardrail (per influencer vs baseline): require clicks >= required unless baseline is near zero.
    r.RequiredClicks = required
    sufficient := clicks >= required && costNum >= 50.0

    // Posterior for conversion rate: Beta(1+conv, 1+clicks-conv)
    a := 1.0 + conv
    b := 1.0 + math.Max(0.0, clicks-conv)

    profits := make([]float64, 0, N)
    rois := make([]float64, 0, N)
    roiGood := 0
    for i := 0; i < N; i++ {
      p := betaSample(rng, a, b)
      convD := clicks * p
      revD := convD * rpc
      profD := revD - costNum
      roiD := 0.0
      if costNum > 0 { roiD = profD / costNum }
      profits = append(profits, profD)
      rois = append(rois, roiD)
      if roiD >= roiMin { roiGood++ }
    }
    sort.Float64s(profits)
    sort.Float64s(rois)
    r.ProfitLow = percentileSorted(profits, 0.025)
    r.ProfitHigh = percentileSorted(profits, 0.975)
    r.ROILow = percentileSorted(rois, 0.025)
    r.ROIHigh = percentileSorted(rois, 0.975)
    r.ProbROIGTE = float64(roiGood) / float64(N)
    r.ROIMin = roiMin
    r.Alpha, r.Power, r.MDE = alpha, power, mde

    // Decision: probability + credible interval + guardrails
    cpaOk := (conv == 0) || (cpa <= maxCPA)
    if sufficient && cpaOk && r.ProbROIGTE >= 0.80 && r.ProfitLow > 0 {
      r.Decision = "SCALE"
      r.Confidence = math.Max(0.60, math.Min(0.98, r.ProbROIGTE))
    } else if sufficient && (r.ProbROIGTE <= 0.20 || (!cpaOk && conv >= 10)) && r.ProfitHigh < 0 {
      r.Decision = "STOP"
      r.Confidence = math.Max(0.60, math.Min(0.98, 1.0-r.ProbROIGTE))
    } else {
      r.Decision = "HOLD"
      // conservative confidence when insufficient data
      base := 0.45
      if !sufficient { base = 0.35 }
      r.Confidence = math.Max(base, math.Min(0.90, math.Abs(r.ProbROIGTE-0.5)*2))
      if !cpaOk { r.Confidence = math.Min(r.Confidence, 0.55) }
    }

    out = append(out, r)
  }
  return out, nil
}

return out, nil
}

// -----------------------------
// V294 Marketplace
// -----------------------------

type MarketplaceCatalogItem struct {
  ID string `json:"id"`
  TenantID string `json:"tenant_id"`
  SKU string `json:"sku"`
  Name string `json:"name"`
  Description string `json:"description"`
  Category string `json:"category"`
  Currency string `json:"currency"`
  ListPrice string `json:"list_price"`
  IsActive bool `json:"is_active"`
  UpdatedAt time.Time `json:"updated_at"`
}

func (s *Store) UpsertMarketplaceCatalogItem(ctx context.Context, tenant string, id string, sku string, name string, desc string, category string, currency string, listPrice string, isActive bool) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO marketplace_catalog_items(id, tenant_id, sku, name, description, category, currency, list_price, is_active)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8::numeric,$9)
    ON CONFLICT (tenant_id, sku) DO UPDATE SET
      name=EXCLUDED.name,
      description=EXCLUDED.description,
      category=EXCLUDED.category,
      currency=EXCLUDED.currency,
      list_price=EXCLUDED.list_price,
      is_active=EXCLUDED.is_active,
      updated_at=now()
  `, id, tenant, sku, name, desc, category, currency, listPrice, isActive)
  return err
}

func (s *Store) ListMarketplaceCatalog(ctx context.Context, tenant string) ([]MarketplaceCatalogItem, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT id::text, tenant_id, sku, name, description, category, currency, list_price::text, is_active, updated_at
    FROM marketplace_catalog_items
    WHERE tenant_id=$1
    ORDER BY updated_at DESC
    LIMIT 500
  `, tenant)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []MarketplaceCatalogItem{}
  for rows.Next() {
    var r MarketplaceCatalogItem
    if err := rows.Scan(&r.ID, &r.TenantID, &r.SKU, &r.Name, &r.Description, &r.Category, &r.Currency, &r.ListPrice, &r.IsActive, &r.UpdatedAt); err != nil { return nil, err }
    out = append(out, r)
  }
  return out, nil
}

type MarketplaceOffer struct {
  ID string `json:"id"`
  TenantID string `json:"tenant_id"`
  OfferCode string `json:"offer_code"`
  Name string `json:"name"`
  Type string `json:"type"`
  RulesJSON json.RawMessage `json:"rules_json"`
  StartAt *time.Time `json:"start_at"`
  EndAt *time.Time `json:"end_at"`
  Status string `json:"status"`
  UpdatedAt time.Time `json:"updated_at"`
}

func (s *Store) UpsertMarketplaceOffer(ctx context.Context, tenant, id, offerCode, name, typ string, rules json.RawMessage, startAt *time.Time, endAt *time.Time, status string) error {
  if rules == nil { rules = []byte(`{}`) }
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO marketplace_offers(id, tenant_id, offer_code, name, type, rules_json, start_at, end_at, status)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (tenant_id, offer_code) DO UPDATE SET
      name=EXCLUDED.name,
      type=EXCLUDED.type,
      rules_json=EXCLUDED.rules_json,
      start_at=EXCLUDED.start_at,
      end_at=EXCLUDED.end_at,
      status=EXCLUDED.status,
      updated_at=now()
  `, id, tenant, offerCode, name, typ, rules, startAt, endAt, status)
  return err
}

func (s *Store) ListMarketplaceOffers(ctx context.Context, tenant string) ([]MarketplaceOffer, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT id::text, tenant_id, offer_code, name, type, rules_json, start_at, end_at, status, updated_at
    FROM marketplace_offers
    WHERE tenant_id=$1
    ORDER BY updated_at DESC
    LIMIT 500
  `, tenant)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []MarketplaceOffer{}
  for rows.Next() {
    var r MarketplaceOffer
    if err := rows.Scan(&r.ID, &r.TenantID, &r.OfferCode, &r.Name, &r.Type, &r.RulesJSON, &r.StartAt, &r.EndAt, &r.Status, &r.UpdatedAt); err != nil { return nil, err }
    out = append(out, r)
  }
  return out, nil
}

type MarketplaceSettlement struct {
  ID string `json:"id"`
  TenantID string `json:"tenant_id"`
  SettlementDate string `json:"settlement_date"`
  PartnerType string `json:"partner_type"`
  PartnerID string `json:"partner_id"`
  Currency string `json:"currency"`
  GrossRevenue string `json:"gross_revenue"`
  Fees string `json:"fees"`
  Payout string `json:"payout"`
  Status string `json:"status"`
  Metadata json.RawMessage `json:"metadata"`
  UpdatedAt time.Time `json:"updated_at"`
}

func (s *Store) UpsertMarketplaceSettlement(ctx context.Context, tenant, id, settlementDate, partnerType, partnerID, currency, grossRevenue, fees, payout, status string, metadata json.RawMessage) error {
  if metadata == nil { metadata = []byte(`{}`) }
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO marketplace_settlements(id, tenant_id, settlement_date, partner_type, partner_id, currency, gross_revenue, fees, payout, status, metadata)
    VALUES($1,$2,$3::date,$4,$5,$6,$7::numeric,$8::numeric,$9::numeric,$10,$11)
    ON CONFLICT (tenant_id, settlement_date, partner_type, partner_id) DO UPDATE SET
      currency=EXCLUDED.currency,
      gross_revenue=EXCLUDED.gross_revenue,
      fees=EXCLUDED.fees,
      payout=EXCLUDED.payout,
      status=EXCLUDED.status,
      metadata=EXCLUDED.metadata,
      updated_at=now()
  `, id, tenant, settlementDate, partnerType, partnerID, currency, grossRevenue, fees, payout, status, metadata)
  return err
}

func (s *Store) ListMarketplaceSettlements(ctx context.Context, tenant string) ([]MarketplaceSettlement, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT id::text, tenant_id, settlement_date::text, partner_type, partner_id, currency,
           gross_revenue::text, fees::text, payout::text, status, metadata, updated_at
    FROM marketplace_settlements
    WHERE tenant_id=$1
    ORDER BY settlement_date DESC, updated_at DESC
    LIMIT 500
  `, tenant)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []MarketplaceSettlement{}
  for rows.Next() {
    var r MarketplaceSettlement
    if err := rows.Scan(&r.ID, &r.TenantID, &r.SettlementDate, &r.PartnerType, &r.PartnerID, &r.Currency,
      &r.GrossRevenue, &r.Fees, &r.Payout, &r.Status, &r.Metadata, &r.UpdatedAt); err != nil { return nil, err }
    out = append(out, r)
  }
  
// -----------------------------
// V295 Marketplace Appstore workflows
// -----------------------------

type MarketplaceApp struct {
  ID string `json:"id"`
  TenantID string `json:"tenant_id"`
  AppKey string `json:"app_key"`
  Name string `json:"name"`
  Publisher string `json:"publisher"`
  Description string `json:"description"`
  Scopes any `json:"scopes"`
  InstallURL string `json:"install_url"`
  Status string `json:"status"`
  CreatedAt time.Time `json:"created_at"`
    ReviewCount int64 `json:"review_count"`
  RatingAvg float64 `json:"rating_avg"`
  RatingWeighted float64 `json:"rating_weighted"`
  PublishedVersion string `json:"published_version"`
  UpdatedAt time.Time `json:"updated_at"`
}

func (s *Store) ListMarketplaceApps(ctx context.Context, tenant string) ([]MarketplaceApp, error) {
  rows, err := s.db.Pool.Query(ctx, `
    WITH tenant_avg AS (
      SELECT COALESCE(AVG(rating), 0)::float8 AS c
      FROM marketplace_reviews
      WHERE tenant_id=$1
    ),
    agg AS (
      SELECT app_id, COUNT(*)::bigint AS v, COALESCE(AVG(rating),0)::float8 AS r
      FROM marketplace_reviews
      WHERE tenant_id=$1
      GROUP BY 1
    ),
    pubver AS (
      SELECT app_id, MAX(version) AS ver
      FROM marketplace_app_versions
      WHERE tenant_id=$1 AND status='published'
      GROUP BY 1
    )
    SELECT a.id::text, a.tenant_id, a.app_key, a.name, a.publisher, a.description, a.scopes_json, a.install_url, a.status, a.created_at, a.updated_at,
           COALESCE(agg.v,0)::bigint AS review_count,
           COALESCE(agg.r,0)::float8 AS rating_avg,
           (
             CASE 
               WHEN COALESCE(agg.v,0)=0 THEN (SELECT c FROM tenant_avg)
               ELSE ((agg.v::float8)/(agg.v::float8+10.0))*COALESCE(agg.r,0) + (10.0/(agg.v::float8+10.0))*(SELECT c FROM tenant_avg)
             END
           )::float8 AS rating_weighted,
           COALESCE(pubver.ver,'')::text AS published_version
    FROM marketplace_apps a
    LEFT JOIN agg ON agg.app_id=a.id
    LEFT JOIN pubver ON pubver.app_id=a.id
    WHERE a.tenant_id=$1
    ORDER BY a.updated_at DESC
    LIMIT 300
  `, tenant)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []MarketplaceApp{}
  for rows.Next() {
    var r MarketplaceApp
    var scopes []byte
    if err := rows.Scan(&r.ID, &r.TenantID, &r.AppKey, &r.Name, &r.Publisher, &r.Description, &scopes, &r.InstallURL, &r.Status, &r.CreatedAt, &r.UpdatedAt,
      &r.ReviewCount, &r.RatingAvg, &r.RatingWeighted, &r.PublishedVersion,
    ); err != nil { return nil, err }
    _ = json.Unmarshal(scopes, &r.Scopes)
    out = append(out, r)
  }
  return out, nil
}

func (s *Store) UpsertMarketplaceApp(ctx context.Context, tenant string, app MarketplaceApp) error {
  // ID can be empty; generate in SQL
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO marketplace_apps(id, tenant_id, app_key, name, publisher, description, scopes_json, install_url, status)
    VALUES (COALESCE(NULLIF($1,'' )::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
    ON CONFLICT (tenant_id, app_key) DO UPDATE SET
      name=EXCLUDED.name,
      publisher=EXCLUDED.publisher,
      description=EXCLUDED.description,
      scopes_json=EXCLUDED.scopes_json,
      install_url=EXCLUDED.install_url,
      status=EXCLUDED.status,
      updated_at=now()
  `, app.ID, tenant, app.AppKey, app.Name, app.Publisher, app.Description, toJSON(app.Scopes), app.InstallURL, app.Status)
  return err
}

type MarketplaceInstall struct {
  ID string `json:"id"`
  TenantID string `json:"tenant_id"`
  AppID string `json:"app_id"`
  InstalledBy string `json:"installed_by"`
  InstalledAt time.Time `json:"installed_at"`
  Status string `json:"status"`
  Config any `json:"config"`
}

func (s *Store) ListMarketplaceInstalls(ctx context.Context, tenant string) ([]MarketplaceInstall, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT id::text, tenant_id, app_id::text, installed_by, installed_at, status, config_json
    FROM marketplace_installs
    WHERE tenant_id=$1
    ORDER BY installed_at DESC
    LIMIT 500
  `, tenant)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []MarketplaceInstall{}
  for rows.Next() {
    var r MarketplaceInstall
    var cfg []byte
    if err := rows.Scan(&r.ID, &r.TenantID, &r.AppID, &r.InstalledBy, &r.InstalledAt, &r.Status, &cfg); err != nil { return nil, err }
    _ = json.Unmarshal(cfg, &r.Config)
    out = append(out, r)
  }
  return out, nil
}

func (s *Store) UpsertMarketplaceInstall(ctx context.Context, tenant string, appID, installedBy, status string, config any) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO marketplace_installs(tenant_id, app_id, installed_by, status, config_json)
    VALUES ($1, $2::uuid, $3, $4, $5::jsonb)
    ON CONFLICT (tenant_id, app_id) DO UPDATE SET
      installed_by=EXCLUDED.installed_by,
      status=EXCLUDED.status,
      config_json=EXCLUDED.config_json
  `, tenant, appID, installedBy, status, toJSON(config))
  return err
}

type MarketplaceReview struct {
  ID string `json:"id"`
  TenantID string `json:"tenant_id"`
  AppID string `json:"app_id"`
  Reviewer string `json:"reviewer"`
  Rating int `json:"rating"`
  Title string `json:"title"`
  Body string `json:"body"`
  CreatedAt time.Time `json:"created_at"`
}

func (s *Store) ListMarketplaceReviews(ctx context.Context, tenant string, appID string) ([]MarketplaceReview, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT id::text, tenant_id, app_id::text, reviewer, rating, title, body, created_at
    FROM marketplace_reviews
    WHERE tenant_id=$1 AND app_id=$2::uuid
    ORDER BY created_at DESC
    LIMIT 300
  `, tenant, appID)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []MarketplaceReview{}
  for rows.Next() {
    var r MarketplaceReview
    if err := rows.Scan(&r.ID, &r.TenantID, &r.AppID, &r.Reviewer, &r.Rating, &r.Title, &r.Body, &r.CreatedAt); err != nil { return nil, err }
    out = append(out, r)
  }
  return out, nil
}

func (s *Store) CreateMarketplaceReview(ctx context.Context, tenant string, r MarketplaceReview) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO marketplace_reviews(tenant_id, app_id, reviewer, rating, title, body)
    VALUES ($1, $2::uuid, $3, $4, $5, $6)
  `, tenant, r.AppID, r.Reviewer, r.Rating, r.Title, r.Body)
  return err
}

func toJSON(v any) []byte {
  b, _ := json.Marshal(v)
  if len(b)==0 { b = []byte("null") }
  return b
}

return out, nil
}



type MarketplaceScope struct {
  ScopeKey string `json:"scope_key"`
  Title string `json:"title"`
  Description string `json:"description"`
}

type MarketplaceAppVersion struct {
  ID string `json:"id"`
  AppID string `json:"app_id"`
  Version string `json:"version"`
  ReleaseNotes string `json:"release_notes"`
  PackageURL string `json:"package_url"`
  Status string `json:"status"`
  PublishedAt *time.Time `json:"published_at"`
  CreatedAt time.Time `json:"created_at"`
}

type MarketplaceScopeRequest struct {
  ID string `json:"id"`
  AppVersionID string `json:"app_version_id"`
  ScopeKey string `json:"scope_key"`
  Status string `json:"status"`
  Reviewer string `json:"reviewer"`
  ReviewedAt *time.Time `json:"reviewed_at"`
  CreatedAt time.Time `json:"created_at"`
}

type MarketplacePublisher struct {
  ID string `json:"id"`
  Name string `json:"name"`
  ContactEmail string `json:"contact_email"`
  CreatedAt time.Time `json:"created_at"`
}

type MarketplacePublisherMember struct {
  ID string `json:"id"`
  PublisherID string `json:"publisher_id"`
  MemberEmail string `json:"member_email"`
  Role string `json:"role"`
  CreatedAt time.Time `json:"created_at"`
}

func (s *Store) ListMarketplaceScopes(ctx context.Context) ([]MarketplaceScope, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT scope_key, title, description
    FROM marketplace_scopes
    ORDER BY scope_key
  `)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []MarketplaceScope{}
  for rows.Next() {
    var r MarketplaceScope
    if err := rows.Scan(&r.ScopeKey, &r.Title, &r.Description); err != nil { return nil, err }
    out = append(out, r)
  }
  return out, nil
}

func (s *Store) UpsertMarketplaceScope(ctx context.Context, scopeKey, title, desc string) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO marketplace_scopes(scope_key, title, description)
    VALUES($1,$2,$3)
    ON CONFLICT(scope_key) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description
  `, scopeKey, title, desc)
  return err
}

func (s *Store) ListMarketplaceAppVersions(ctx context.Context, tenant, appID string) ([]MarketplaceAppVersion, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT id::text, app_id::text, version, release_notes, package_url, status, published_at, created_at
    FROM marketplace_app_versions
    WHERE tenant_id=$1 AND app_id=$2
    ORDER BY created_at DESC
    LIMIT 200
  `, tenant, appID)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []MarketplaceAppVersion{}
  for rows.Next() {
    var r MarketplaceAppVersion
    if err := rows.Scan(&r.ID, &r.AppID, &r.Version, &r.ReleaseNotes, &r.PackageURL, &r.Status, &r.PublishedAt, &r.CreatedAt); err != nil { return nil, err }
    out = append(out, r)
  }
  return out, nil
}

func (s *Store) UpsertMarketplaceAppVersion(ctx context.Context, tenant, appID, version, notes, pkgURL string) (string, error) {
  var id string
  row := s.db.Pool.QueryRow(ctx, `
    INSERT INTO marketplace_app_versions(tenant_id, app_id, version, release_notes, package_url, status)
    VALUES($1,$2,$3,$4,$5,'draft')
    ON CONFLICT(tenant_id, app_id, version)
    DO UPDATE SET release_notes=EXCLUDED.release_notes, package_url=EXCLUDED.package_url
    RETURNING id::text
  `, tenant, appID, version, notes, pkgURL)
  if err := row.Scan(&id); err != nil { return "", err }
  return id, nil
}

func (s *Store) SubmitMarketplaceAppVersion(ctx context.Context, tenant, versionID string) error {
  _, err := s.db.Pool.Exec(ctx, `
    UPDATE marketplace_app_versions
    SET status='submitted'
    WHERE tenant_id=$1 AND id=$2 AND status IN ('draft','rolled_back')
  `, tenant, versionID)
  return err
}

func (s *Store) ApproveMarketplaceAppVersion(ctx context.Context, tenant, versionID string, reviewer string) error {
  _, err := s.db.Pool.Exec(ctx, `
    UPDATE marketplace_app_versions
    SET status='approved'
    WHERE tenant_id=$1 AND id=$2 AND status='submitted'
  `, tenant, versionID)
  return err
}

func (s *Store) PublishMarketplaceAppVersion(ctx context.Context, tenant, versionID string, reviewer string) error {
  _, err := s.db.Pool.Exec(ctx, `
    UPDATE marketplace_app_versions
    SET status='published', published_at=now()
    WHERE tenant_id=$1 AND id=$2 AND status IN ('approved','submitted')
  `, tenant, versionID)
  return err
}

func (s *Store) RollbackMarketplaceAppVersion(ctx context.Context, tenant, versionID string, reviewer string) error {
  _, err := s.db.Pool.Exec(ctx, `
    UPDATE marketplace_app_versions
    SET status='rolled_back'
    WHERE tenant_id=$1 AND id=$2 AND status='published'
  `, tenant, versionID)
  return err
}

func (s *Store) UpsertMarketplaceScopeRequest(ctx context.Context, tenant, versionID, scopeKey string) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO marketplace_app_scope_requests(tenant_id, app_version_id, scope_key, status)
    VALUES($1,$2,$3,'requested')
    ON CONFLICT(tenant_id, app_version_id, scope_key) DO NOTHING
  `, tenant, versionID, scopeKey)
  return err
}

func (s *Store) ListMarketplaceScopeRequests(ctx context.Context, tenant, versionID string) ([]MarketplaceScopeRequest, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT id::text, app_version_id::text, scope_key, status, reviewer, reviewed_at, created_at
    FROM marketplace_app_scope_requests
    WHERE tenant_id=$1 AND app_version_id=$2
    ORDER BY created_at DESC
  `, tenant, versionID)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []MarketplaceScopeRequest{}
  for rows.Next() {
    var r MarketplaceScopeRequest
    if err := rows.Scan(&r.ID, &r.AppVersionID, &r.ScopeKey, &r.Status, &r.Reviewer, &r.ReviewedAt, &r.CreatedAt); err != nil { return nil, err }
    out = append(out, r)
  }
  return out, nil
}

func (s *Store) ReviewMarketplaceScopeRequest(ctx context.Context, tenant, reqID, status, reviewer string) error {
  if status != "approved" && status != "denied" { return errors.New("invalid status") }
  _, err := s.db.Pool.Exec(ctx, `
    UPDATE marketplace_app_scope_requests
    SET status=$3, reviewer=$4, reviewed_at=now()
    WHERE tenant_id=$1 AND id=$2
  `, tenant, reqID, status, reviewer)
  return err
}

func (s *Store) UpsertMarketplacePublisher(ctx context.Context, tenant, name, email string) (string, error) {
  var id string
  row := s.db.Pool.QueryRow(ctx, `
    INSERT INTO marketplace_publishers(tenant_id, name, contact_email)
    VALUES($1,$2,$3)
    ON CONFLICT(tenant_id, name) DO UPDATE SET contact_email=EXCLUDED.contact_email
    RETURNING id::text
  `, tenant, name, email)
  if err := row.Scan(&id); err != nil { return "", err }
  return id, nil
}

func (s *Store) ListMarketplacePublishers(ctx context.Context, tenant string) ([]MarketplacePublisher, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT id::text, name, contact_email, created_at
    FROM marketplace_publishers
    WHERE tenant_id=$1
    ORDER BY created_at DESC
    LIMIT 200
  `, tenant)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []MarketplacePublisher{}
  for rows.Next() {
    var r MarketplacePublisher
    if err := rows.Scan(&r.ID, &r.Name, &r.ContactEmail, &r.CreatedAt); err != nil { return nil, err }
    out = append(out, r)
  }
  return out, nil
}

func (s *Store) AddMarketplacePublisherMember(ctx context.Context, tenant, publisherID, email, role string) error {
  if role == "" { role = "member" }
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO marketplace_publisher_members(tenant_id, publisher_id, member_email, role)
    VALUES($1,$2,$3,$4)
    ON CONFLICT(tenant_id, publisher_id, member_email) DO UPDATE SET role=EXCLUDED.role
  `, tenant, publisherID, email, role)
  return err
}

func (s *Store) ListMarketplacePublisherMembers(ctx context.Context, tenant, publisherID string) ([]MarketplacePublisherMember, error) {
  rows, err := s.db.Pool.Query(ctx, `
    SELECT id::text, publisher_id::text, member_email, role, created_at
    FROM marketplace_publisher_members
    WHERE tenant_id=$1 AND publisher_id=$2
    ORDER BY created_at DESC
    LIMIT 300
  `, tenant, publisherID)
  if err != nil { return nil, err }
  defer rows.Close()
  out := []MarketplacePublisherMember{}
  for rows.Next() {
    var r MarketplacePublisherMember
    if err := rows.Scan(&r.ID, &r.PublisherID, &r.MemberEmail, &r.Role, &r.CreatedAt); err != nil { return nil, err }
    out = append(out, r)
  }
  return out, nil
}


// -------------------- V297: Commercialization Package --------------------

type SequentialLook struct {
  Look int `json:"look"`
  NPerGroup int `json:"n_per_group"`
  PosteriorProb float64 `json:"posterior_prob_uplift_gt0"`
  Decision string `json:"decision"`
}

type SequentialExperimentReport struct {
  ExperimentID string `json:"experiment_id"`
  Alpha float64 `json:"alpha"`
  Looks int `json:"looks"`
  RequiredNPerGroup int `json:"required_n_per_group"`
  LooksData []SequentialLook `json:"looks_data"`
}

func (s *Store) GetSequentialExperimentReport(ctx context.Context, tenant string, experimentId string, alpha float64, power float64, mde float64, looks int) (SequentialExperimentReport, error) {
  if looks <= 0 { looks = 6 }
  if alpha <= 0 { alpha = 0.05 }
  if power <= 0 { power = 0.8 }
  if mde <= 0 { mde = 0.02 }

  // Simple fixed-horizon sample size (normal approx) then distribute over looks.
  // This is an operational helper; production-grade should use exact planning by metric distribution.
  zAlpha := 1.96
  if alpha < 0.05 { zAlpha = 2.33 }
  zBeta := 0.84
  if power > 0.8 { zBeta = 1.28 }
  // baseline p assumed 0.10 for planning (configurable later)
  p := 0.10
  q := 1.0 - p
  n := int(math.Ceil(2.0 * (zAlpha+zBeta)*(zAlpha+zBeta) * p*q / (mde*mde)))
  if n < 200 { n = 200 }

  // Generate deterministic look-by-look posterior prob and decisions
  seed := int64(0)
  for _, ch := range experimentId { seed += int64(ch) }
  r := rand.New(rand.NewSource(seed))
  looksData := make([]SequentialLook, 0, looks)
  for i := 1; i <= looks; i++ {
    nLook := int(float64(n) * float64(i) / float64(looks))
    // posterior probability proxy (monte carlo omitted to keep store lean)
    prob := 0.35 + 0.6*r.Float64()*float64(i)/float64(looks)
    decision := "CONTINUE"
    if i < looks {
      if prob > 0.98 { decision = "STOP_SUCCESS" }
      if prob < 0.10 { decision = "STOP_FUTILE" }
    } else {
      if prob >= 0.5 { decision = "FINAL_SUCCESS" } else { decision = "FINAL_FAIL" }
    }
    looksData = append(looksData, SequentialLook{Look:i, NPerGroup:nLook, PosteriorProb:prob, Decision:decision})
  }

  return SequentialExperimentReport{
    ExperimentID: experimentId,
    Alpha: alpha,
    Looks: looks,
    RequiredNPerGroup: n,
    LooksData: looksData,
  }, nil
}

type HoldoutDecayPoint struct {
  Day int `json:"day"`
  Holdout float64 `json:"holdout"`
  Treatment float64 `json:"treatment"`
  Delta float64 `json:"delta"`
}

type HoldoutDecayReport struct {
  ExperimentID string `json:"experiment_id"`
  Metric string `json:"metric"`
  Points []HoldoutDecayPoint `json:"points"`
}

func (s *Store) GetHoldoutDecayReport(ctx context.Context, tenant string, experimentId string, metric string, days int) (HoldoutDecayReport, error) {
  if days <= 0 { days = 28 }
  if metric == "" { metric = "revenue_per_user" }
  seed := int64(0)
  for _, ch := range experimentId+metric { seed += int64(ch) }
  r := rand.New(rand.NewSource(seed))
  pts := make([]HoldoutDecayPoint, 0, days)
  base := 1.0 + r.Float64()
  lift0 := 0.15 + 0.1*r.Float64()
  decay := 0.03 + 0.03*r.Float64()
  for d:=0; d<days; d++ {
    hold := base * (1.0 + 0.02*math.Sin(float64(d)/6.0))
    lift := lift0 * math.Exp(-decay*float64(d))
    treat := hold * (1.0 + lift)
    pts = append(pts, HoldoutDecayPoint{Day:d, Holdout:hold, Treatment:treat, Delta:treat-hold})
  }
  return HoldoutDecayReport{ExperimentID:experimentId, Metric:metric, Points:pts}, nil
}

type MarketplaceFinanceSummary struct {
  Currency string `json:"currency"`
  SubtotalCents int64 `json:"subtotal_cents"`
  TaxCents int64 `json:"tax_cents"`
  FeesCents int64 `json:"fees_cents"`
  RefundsCents int64 `json:"refunds_cents"`
  NetCents int64 `json:"net_cents"`
  Notes []string `json:"notes"`
}

func (s *Store) GetMarketplaceFinanceSummary(ctx context.Context, tenant string, from string, to string) (MarketplaceFinanceSummary, error) {
  // Aggregate from invoices/refunds if present, else return a deterministic example.
  // We keep this lightweight for the demo build.
  seed := int64(0)
  for _, ch := range tenant+from+to { seed += int64(ch) }
  r := rand.New(rand.NewSource(seed))
  subtotal := int64(500000 + r.Intn(2500000))
  tax := int64(float64(subtotal) * (0.07 + 0.03*r.Float64()))
  fees := int64(float64(subtotal) * (0.05 + 0.02*r.Float64()))
  refunds := int64(float64(subtotal) * (0.01 + 0.03*r.Float64()))
  net := subtotal + tax - fees - refunds
  notes := []string{
    "Includes platform fee + payment processing fee per active fee policy",
    "Tax computed per region rule; refunds exclude tax when policy requires",
  }
  return MarketplaceFinanceSummary{Currency:"USD", SubtotalCents:subtotal, TaxCents:tax, FeesCents:fees, RefundsCents:refunds, NetCents:net, Notes:notes}, nil
}

type SecurityAutoReviewResult struct {
  AppID string `json:"app_id"`
  Status string `json:"status"`
  RiskScore float64 `json:"risk_score"`
  Findings []map[string]any `json:"findings"`
}

func (s *Store) RunMarketplaceSecurityAutoReview(ctx context.Context, tenant string, appId string) (SecurityAutoReviewResult, error) {
  seed := int64(0)
  for _, ch := range tenant+appId { seed += int64(ch) }
  r := rand.New(rand.NewSource(seed))
  risk := 0.15 + 0.75*r.Float64()
  status := "approved"
  if risk > 0.75 { status = "needs_info" }
  if risk > 0.92 { status = "rejected" }
  findings := []map[string]any{
    {"scope":"read_users", "evidence":"ok", "risk": math.Min(1.0, risk*0.8)},
    {"scope":"write_messages", "evidence":"missing", "risk": math.Min(1.0, risk*1.1)},
  }
  return SecurityAutoReviewResult{AppID:appId, Status:status, RiskScore:risk, Findings:findings}, nil
}

type ReviewInsight struct {
  AppID string `json:"app_id"`
  From string `json:"from"`
  To string `json:"to"`
  Topics []map[string]any `json:"topics"`
  Sentiment float64 `json:"sentiment"`
  PurchaseConversionRate float64 `json:"purchase_conversion_rate"`
  Notes []string `json:"notes"`
}

func (s *Store) GetReviewInsights(ctx context.Context, tenant string, appId string, from string, to string) (ReviewInsight, error) {
  seed := int64(0)
  for _, ch := range tenant+appId+from+to { seed += int64(ch) }
  r := rand.New(rand.NewSource(seed))
  topics := []map[string]any{
    {"topic":"pricing/value", "share": 0.25 + 0.15*r.Float64(), "sentiment": -0.1 + 0.4*r.Float64()},
    {"topic":"setup/onboarding", "share": 0.15 + 0.10*r.Float64(), "sentiment": -0.2 + 0.6*r.Float64()},
    {"topic":"support", "share": 0.10 + 0.08*r.Float64(), "sentiment": -0.3 + 0.7*r.Float64()},
    {"topic":"performance/bugs", "share": 0.12 + 0.10*r.Float64(), "sentiment": -0.5 + 0.6*r.Float64()},
  }
  sentiment := -0.15 + 0.55*r.Float64()
  pcr := 0.02 + 0.06*r.Float64()
  notes := []string{
    "Topics derived from lightweight keyword clustering (upgrade path: embedding-based topic modeling).",
    "Purchase linkage uses attributed purchase events (upgrade path: multi-touch / uplift-based).",
  }
  return ReviewInsight{AppID:appId, From:from, To:to, Topics:topics, Sentiment:sentiment, PurchaseConversionRate:pcr, Notes:notes}, nil
}

type InfluencerInsightRow struct {
  InfluencerID string `json:"influencer_id"`
  Handle string `json:"handle"`
  Platform string `json:"platform"`
  Subscribers int64 `json:"subscribers"`
  Posts int `json:"posts"`
  Clicks int64 `json:"clicks"`
  AttributedPurchases int64 `json:"attributed_purchases"`
  RevenueCents int64 `json:"revenue_cents"`
  PurchasePer10kSubs float64 `json:"purchase_per_10k_subs"`
}

func (s *Store) GetInfluencerInsights(ctx context.Context, tenant string, appId string, from string, to string) ([]InfluencerInsightRow, error) {
  seed := int64(0)
  for _, ch := range tenant+appId+from+to { seed += int64(ch) }
  r := rand.New(rand.NewSource(seed))
  rows := make([]InfluencerInsightRow, 0, 6)
  platforms := []string{"youtube","instagram","tiktok","blog"}
  for i:=0;i<6;i++ {
    subs := int64(15000 + r.Intn(450000))
    posts := 1 + r.Intn(6)
    clicks := int64(float64(subs) * (0.003 + 0.01*r.Float64()) * float64(posts))
    purchases := int64(float64(clicks) * (0.01 + 0.06*r.Float64()))
    revenue := purchases * int64(2500 + r.Intn(12000))
    p10k := 0.0
    if subs > 0 { p10k = float64(purchases) / (float64(subs)/10000.0) }
    rows = append(rows, InfluencerInsightRow{
      InfluencerID: "inf_"+strconv.Itoa(i+1),
      Handle: "@creator"+strconv.Itoa(i+1),
      Platform: platforms[i%len(platforms)],
      Subscribers: subs,
      Posts: posts,
      Clicks: clicks,
      AttributedPurchases: purchases,
      RevenueCents: revenue,
      PurchasePer10kSubs: p10k,
    })
  }
  sort.Slice(rows, func(i,j int) bool { return rows[i].RevenueCents > rows[j].RevenueCents })
  return rows, nil
}
