package store

import (
  "context"
  "encoding/json"
  "time"

  "github.com/jackc/pgx/v5"
  "genie_roi/gateway/internal/db"
)

type Store struct{ db *db.DB }
func New(dbx *db.DB) *Store { return &Store{db: dbx} }

type PolicyRow struct {
  TenantID string
  Version int
  PolicyJSON []byte
}

func (s *Store) UpsertTenant(ctx context.Context, id, name string) error {
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO tenants(id,name) VALUES($1,$2) ON CONFLICT (id) DO UPDATE SET name=excluded.name`, id, name)
  return err
}

func (s *Store) InsertPolicy(ctx context.Context, tenant string, version int, pol []byte) error {
  _, err := s.db.Pool.Exec(ctx, `INSERT INTO policies(tenant_id,version,policy_json) VALUES($1,$2,$3) ON CONFLICT (tenant_id,version) DO UPDATE SET policy_json=excluded.policy_json`, tenant, version, pol)
  return err
}

func (s *Store) GetLatestPolicy(ctx context.Context, tenant string) (PolicyRow, error) {
  var r PolicyRow
  err := s.db.Pool.QueryRow(ctx, `SELECT tenant_id, version, policy_json FROM policies WHERE tenant_id=$1 ORDER BY version DESC LIMIT 1`, tenant).
    Scan(&r.TenantID, &r.Version, &r.PolicyJSON)
  return r, err
}

func (s *Store) CreateExecution(ctx context.Context, id, tenant, idem, channel, provider, actionType, status string, reqJSON []byte) error {
  _, err := s.db.Pool.Exec(ctx, `
    INSERT INTO executions(id,tenant_id,idempotency_key,channel,provider,action_type,status,request_json)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (tenant_id,idempotency_key) DO NOTHING
  `, id, tenant, idem, channel, provider, actionType, status, reqJSON)
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
      'action_type', action_type,'status', status,'request', request_json,'result', result_json,'created_at', created_at,'updated_at', updated_at
    )::jsonb
    FROM executions WHERE tenant_id=$1 AND id=$2
  `, tenant, id).Scan(&b)
  return b, err
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
