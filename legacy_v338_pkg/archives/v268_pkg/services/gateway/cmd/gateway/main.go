package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"gopkg.in/yaml.v3"
	"fmt"
	"reflect"
)

func getenv(k, def string) string { v := os.Getenv(k); if v=="" { return def }; return v }

type Policy struct {
	Version  int `yaml:"version"`
	Defaults struct {
		ConfidenceThreshold float64  `yaml:"confidence_threshold"`
		MaxBudgetDeltaPct   float64  `yaml:"max_budget_delta_pct"`
		AllowedChannels     []string `yaml:"allowed_channels"`
		DenyIfShadowFalse   bool     `yaml:"deny_if_shadow_mode_false"`
	} `yaml:"defaults"`
	Objectives map[string]struct {
		ConfidenceThreshold float64 `yaml:"confidence_threshold"`
		MaxBudgetDeltaPct   float64 `yaml:"max_budget_delta_pct"`
	} `yaml:"objectives"`
}

type RunRequest struct {
	TenantID            string   `json:"tenant_id"`
	UserID              string   `json:"user_id"`
	Objective           string   `json:"objective"`
	BudgetDeltaLimitPct float64  `json:"budget_delta_limit_pct"`
	Channels            []string `json:"channels"`
	ShadowMode          bool     `json:"shadow_mode"`
	ExperimentID        string   `json:"experiment_id"`
	UnitID              string   `json:"unit_id"` // stable randomization key to avoid contamination
	ForceVariant        string   `json:"force_variant"` // optional: control/treatment
}

type AIResponse struct {
	Confidence float64          `json:"confidence"`
	Explain    []string         `json:"explain"`
	Risks      []string         `json:"risks"`
	Actions    []map[string]any `json:"actions"`
	Meta       map[string]any   `json:"meta"`
}

type ApproveRequest struct {
	ExecutionID string `json:"execution_id"`
	ApproverID  string `json:"approver_id"`
}

type ShadowEvent struct {
	ExecutionID string         `json:"execution_id"`
	Channel     string         `json:"channel"`
	Metric      map[string]any `json:"metric"`
}

type MetricsSnapshot struct {
	OutboxPending int64 `json:"outbox_pending"`
	OutboxDead    int64 `json:"outbox_dead"`
	DLQCount      int64 `json:"dlq_count"`
}

func mustEnv(key, def string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	return v
}

func loadPolicy(path string) (Policy, error) {
	var p Policy
	b, err := os.ReadFile(path)
	if err != nil {
		return p, err
	}
	if err := yaml.Unmarshal(b, &p); err != nil {
		return p, err
	}
	return p, nil
}

func idFromRequest(body []byte, idemKey string) string {
	h := sha256.Sum256(append([]byte(idemKey+"::"), body...))
	return hex.EncodeToString(h[:16])
}

// --- V163: Enterprise multi-tenancy / API keys / quotas ---
type AuthCtx struct {
	TenantID string
	UserID   string
	Role     string // viewer/operator/admin
	Scopes   []string // optional fine-grained scopes
}

func hashAPIKey(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

func ensureBootstrap(ctx context.Context, pool *pgxpool.Pool) {
	// If no api_keys exist, insert bootstrap admin key for tenant "default"
	var n int
	_ = pool.QueryRow(ctx, "SELECT COUNT(*) FROM api_keys").Scan(&n)
	if n > 0 {
		return
	}
	bootstrap := os.Getenv("BOOTSTRAP_ADMIN_API_KEY")
	if bootstrap == "" {
		bootstrap = "admin_dev_key_change_me"
	}
	// ensure default tenant
	_, _ = pool.Exec(ctx, "INSERT INTO tenants(tenant_id, name) VALUES('default','Default') ON CONFLICT DO NOTHING")
	// default quotas
	daily, _ := strconv.Atoi(getenv("DEFAULT_DAILY_EXEC_LIMIT", "200"))
	pm, _ := strconv.Atoi(getenv("DEFAULT_PER_MINUTE_LIMIT", "60"))
	_, _ = pool.Exec(ctx, "INSERT INTO tenant_quotas(tenant_id, daily_exec_limit, per_minute_limit) VALUES('default',$1,$2) ON CONFLICT DO NOTHING", daily, pm)
	// insert api key hash
	_, _ = pool.Exec(ctx, "INSERT INTO api_keys(api_key_hash, tenant_id, user_id, role, label) VALUES($1,'default','bootstrap','admin','bootstrap') ON CONFLICT DO NOTHING", hashAPIKey(bootstrap))
}

func authFromRequest(ctx context.Context, pool *pgxpool.Pool, c *gin.Context) (*AuthCtx, error) {
	require := strings.ToLower(getenv("GATEWAY_REQUIRE_API_KEY", "true"))
	if require == "false" || require == "0" {
		// fallback to request body headers
		return &AuthCtx{TenantID: c.GetHeader("X-Tenant"), UserID: c.GetHeader("X-User"), Role: c.GetHeader("X-Role")}, nil
	}
	k := c.GetHeader("X-API-Key")
	if k == "" {
		return nil, errors.New("missing_api_key")
	}
	h := hashAPIKey(k)
	row := pool.QueryRow(ctx, "SELECT tenant_id, user_id, role, scopes, expires_at FROM api_keys WHERE api_key_hash=$1 AND revoked_at IS NULL", h)
	var t, u, r string
	var scopesRaw []byte
	var expires *time.Time
	if err := row.Scan(&t, &u, &r, &scopesRaw, &expires); err != nil {
		return nil, errors.New("invalid_api_key")
	}
	if expires != nil && time.Now().After(*expires) {
		return nil, errors.New("api_key_expired")
	}
	var scopes []string
	if len(scopesRaw) > 0 {
		_ = json.Unmarshal(scopesRaw, &scopes)
	}
	return &AuthCtx{TenantID: t, UserID: u, Role: r, Scopes: scopes}, nil
}


func requireRoleAtLeast(auth *AuthCtx, need string) bool {
	order := map[string]int{"viewer":1,"operator":2,"admin":3}
	a := strings.ToLower(auth.Role)
	n := strings.ToLower(need)
	if order[a] == 0 { a = "viewer" }
	if order[n] == 0 { n = "viewer" }
	return order[a] >= order[n]
}

func hasScope(auth *AuthCtx, need string) bool {
	if auth == nil { return false }
	if len(auth.Scopes) == 0 { return true } // default-allow for backward compatibility
	need = strings.ToLower(strings.TrimSpace(need))
	for _, s := range auth.Scopes {
		if strings.ToLower(strings.TrimSpace(s)) == need { return true }
	}
	return false
}

func mustAdmin(ctx context.Context, pool *pgxpool.Pool, c *gin.Context) (*AuthCtx, bool) {
	auth, err := authFromRequest(ctx, pool, c)
	if err != nil {
		c.JSON(401, gin.H{"error": err.Error()})
		return nil, false
	}
	if !requireRoleAtLeast(auth, "admin") {
		c.JSON(403, gin.H{"error":"admin_required"})
		return nil, false
	}
	return auth, true
}

func logAdminChange(ctx context.Context, pool *pgxpool.Pool, tenantID, actorID, action, target string, detail any) {
	_, _ = pool.Exec(ctx, "INSERT INTO admin_changes(tenant_id, actor_id, action, target, detail) VALUES($1,$2,$3,$4,$5)", tenantID, actorID, action, target, mustJSON(detail))
	// also mirror into audit_log for uniformity
	execID := "ADMIN::" + tenantID
	logAudit(ctx, pool, execID, actorID, action, detail)
}


func pickVariantStable(experimentID, tenantID, unitID, salt string) string {
	// deterministic assignment: hash(experimentID|tenant|unit|salt) -> control/treatment 50/50
	key := experimentID + "|" + tenantID + "|" + unitID + "|" + salt
	h := sha256.Sum256([]byte(key))
	// use first byte
	if int(h[0])%2 == 0 { return "control" }
	return "treatment"
}

func ensureExperimentUnit(ctx context.Context, pool *pgxpool.Pool, experimentID, tenantID, unitID, salt, forced string) (string, error) {
	var v string
	err := pool.QueryRow(ctx, "SELECT variant FROM experiment_units WHERE experiment_id=$1 AND tenant_id=$2 AND unit_id=$3", experimentID, tenantID, unitID).Scan(&v)
	if err == nil && v != "" { return v, nil }
	variant := forced
	if variant == "" { variant = pickVariantStable(experimentID, tenantID, unitID, salt) }
	_, e2 := pool.Exec(ctx, "INSERT INTO experiment_units(experiment_id, tenant_id, unit_id, variant) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING", experimentID, tenantID, unitID, variant)
	if e2 != nil { return variant, e2 }
	return variant, nil
}

func getExperimentSalt(ctx context.Context, pool *pgxpool.Pool, experimentID, tenantID string) (string, error) {
	var raw []byte
	err := pool.QueryRow(ctx, "SELECT detail FROM admin_changes WHERE tenant_id=$1 AND target=$2 AND action='EXPERIMENT_SALT' ORDER BY id DESC LIMIT 1", tenantID, experimentID).Scan(&raw)
	if err != nil { return "", nil }
	var obj map[string]any
	_ = json.Unmarshal(raw, &obj)
	if s, ok := obj["salt"].(string); ok { return s, nil }
	return "", nil
}
func enforceQuota(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, tenantID string) error {
	// per-minute via redis
	pmKey := "quota:pm:" + tenantID + ":" + time.Now().UTC().Format("200601021504")
	pm, err := rdb.Incr(ctx, pmKey).Result()
	if err == nil && pm == 1 {
		rdb.Expire(ctx, pmKey, 2*time.Minute)
	}
	var dailyLimit, perMinute int
	// load per-tenant quotas or defaults
	err = pool.QueryRow(ctx, "SELECT daily_exec_limit, per_minute_limit FROM tenant_quotas WHERE tenant_id=$1", tenantID).Scan(&dailyLimit, &perMinute)
	if err != nil {
		dailyLimit, _ = strconv.Atoi(getenv("DEFAULT_DAILY_EXEC_LIMIT", "200"))
		perMinute, _ = strconv.Atoi(getenv("DEFAULT_PER_MINUTE_LIMIT", "60"))
	}
	if perMinute > 0 && int(pm) > perMinute {
		return errors.New("quota_per_minute_exceeded")
	}
	// daily executions count
	var todayCount int
	_ = pool.QueryRow(ctx, "SELECT COUNT(*) FROM executions WHERE tenant_id=$1 AND requested_at >= date_trunc('day', NOW())", tenantID).Scan(&todayCount)
	if dailyLimit > 0 && todayCount >= dailyLimit {
		return errors.New("quota_daily_exceeded")
	}
	return nil
}


func getFloat(m map[string]any, k string) (float64, bool) {
	v, ok := m[k]
	if !ok { return 0, false }
	switch t := v.(type) {
	case float64:
		return t, true
	case int:
		return float64(t), true
	case int64:
		return float64(t), true
	case string:
		f, err := strconv.ParseFloat(t, 64); if err==nil { return f, true }
	}
	return 0, false
}

func checkExperimentGuardrails(ctx context.Context, pool *pgxpool.Pool, tenantID string, metric map[string]any) (string, error) {
	expRaw, ok := metric["experiment_id"]
	if !ok { return "", nil }
	expID, _ := expRaw.(string)
	if expID == "" { return "", nil }

	// Load current experiment status + guardrails
	var status string
	err := pool.QueryRow(ctx, "SELECT status FROM experiments WHERE experiment_id=$1 AND tenant_id=$2", expID, tenantID).Scan(&status)
	if err != nil { return expID, nil } // ignore if not registered
	if status != "RUNNING" { return expID, nil }

	var maxSpend, maxNeg, minConf float64
	_ = pool.QueryRow(ctx, "SELECT max_daily_spend, max_negative_uplift_pct, min_confidence FROM experiment_guardrails WHERE experiment_id=$1", expID).Scan(&maxSpend, &maxNeg, &minConf)

	// Compute uplift_pct if possible
	uplift, hasUplift := getFloat(metric, "uplift_pct")
	if !hasUplift {
		c, okc := getFloat(metric, "control_value")
		t, okt := getFloat(metric, "treatment_value")
		if okc && okt && c != 0 {
			uplift = (t - c) / c * 100
			hasUplift = true
			metric["uplift_pct"] = uplift
		}
	}
	conf, _ := getFloat(metric, "confidence")
	if minConf > 0 && conf > 0 && conf < minConf {
		// low confidence is not a stop condition by default; just annotate
		metric["guardrail_note"] = "confidence_below_min"
	}

	spend, _ := getFloat(metric, "daily_spend")
	if spend == 0 {
		spend, _ = getFloat(metric, "spend")
	}

	// Stop conditions
	stop := false
	reason := ""
	if maxSpend > 0 && spend > maxSpend {
		stop = true
		reason = "max_daily_spend_exceeded"
	}
	if hasUplift && uplift < maxNeg {
		stop = true
		if reason == "" { reason = "negative_uplift_guardrail" } else { reason = reason + "+negative_uplift" }
	}

	if stop {
		_, _ = pool.Exec(ctx, "UPDATE experiments SET status='STOPPED', stopped_at=NOW(), stop_reason=$2 WHERE experiment_id=$1", expID, reason)
		_, _ = pool.Exec(ctx, "INSERT INTO incidents(tenant_id, experiment_id, severity, kind, detail) VALUES($1,$2,'HIGH','EXPERIMENT_AUTOSTOP',$3)", tenantID, expID, mustJSON(map[string]any{"reason": reason, "metric": metric}))
	}
	return expID, nil
}

func mustJSON(v any) []byte { b, _ := json.Marshal(v); return b }
func mustJSONRaw(b []byte) []byte { var tmp any; _ = json.Unmarshal(b, &tmp); return b }


func loadTenantPolicyOverrides(ctx context.Context, pool *pgxpool.Pool, tenantID string) (map[string]any, bool) {
	var raw []byte
	err := pool.QueryRow(ctx, "SELECT policy FROM tenant_policies WHERE tenant_id=$1", tenantID).Scan(&raw)
	if err != nil { return nil, false }
	var m map[string]any
	_ = json.Unmarshal(raw, &m)
	return m, true
}

func deepMerge(dst map[string]any, src map[string]any) map[string]any {
	if dst == nil { dst = map[string]any{} }
	for k, v := range src {
		if vm, ok := v.(map[string]any); ok {
			if existing, ok2 := dst[k].(map[string]any); ok2 {
				dst[k] = deepMerge(existing, vm)
			} else {
				dst[k] = deepMerge(map[string]any{}, vm)
			}
		} else {
			dst[k] = v
		}
	}
	return dst
}

type DiffItem struct {
	Path string `json:"path"`
	From any    `json:"from"`
	To   any    `json:"to"`
}

func jsonDiff(path string, a any, b any, out *[]DiffItem) {
	am, aok := a.(map[string]any)
	bm, bok := b.(map[string]any)
	if aok && bok {
		seen := map[string]bool{}
		for k := range am { seen[k]=true }
		for k := range bm { seen[k]=true }
		for k := range seen {
			p := k
			if path != "" { p = path + "." + k }
			jsonDiff(p, am[k], bm[k], out)
		}
		return
	}
	if !reflect.DeepEqual(a, b) {
		*out = append(*out, DiffItem{Path: path, From: a, To: b})
	}
}

func buildCSV(rows [][]string) []byte {
	var sb strings.Builder
	esc := func(s string) string {
		if strings.ContainsAny(s, ",\"\n\r") {
			s = strings.ReplaceAll(s, "\"", "\"\"")
			return "\"" + s + "\""
		}
		return s
	}
	for _, r := range rows {
		for i, c := range r {
			if i>0 { sb.WriteString(",") }
			sb.WriteString(esc(c))
		}
		sb.WriteString("\n")
	}
	return []byte(sb.String())
}

func buildSimplePDF(lines []string) []byte {
	var content strings.Builder
	content.WriteString("BT\n/F1 10 Tf\n40 780 Td\n")
	for i, ln := range lines {
		if i>0 { content.WriteString("0 -12 Td\n") }
		ln = strings.ReplaceAll(ln, "\\", "\\\\")
		ln = strings.ReplaceAll(ln, "(", "\\(")
		ln = strings.ReplaceAll(ln, ")", "\\)")
		content.WriteString("(" + ln + ") Tj\n")
	}
	content.WriteString("ET\n")
	stream := content.String()
	objects := []string{
		"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
		"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
		"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
		"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
		"5 0 obj << /Length " + strconv.Itoa(len(stream)) + " >> stream\n" + stream + "endstream endobj\n",
	}
	var pdf strings.Builder
	pdf.WriteString("%PDF-1.4\n")
	offsets := make([]int, len(objects)+1)
	offsets[0] = 0
	for i, obj := range objects {
		offsets[i+1] = pdf.Len()
		pdf.WriteString(obj)
	}
	xrefPos := pdf.Len()
	pdf.WriteString("xref\n0 " + strconv.Itoa(len(objects)+1) + "\n")
	pdf.WriteString("0000000000 65535 f \n")
	for i := 1; i <= len(objects); i++ {
		pdf.WriteString(fmt.Sprintf("%010d 00000 n \n", offsets[i]))
	}
	pdf.WriteString("trailer << /Size " + strconv.Itoa(len(objects)+1) + " /Root 1 0 R >>\nstartxref\n")
	pdf.WriteString(strconv.Itoa(xrefPos) + "\n%%EOF\n")
	return []byte(pdf.String())
}


func allowedChannelsForTenant(base []string, overrides map[string]any) []string {
	if overrides == nil { return base }
	if v, ok := overrides["allowed_channels"]; ok {
		if arr, ok2 := v.([]any); ok2 {
			out := make([]string, 0, len(arr))
			for _,x := range arr { if s, ok3 := x.(string); ok3 { out = append(out, s) } }
			if len(out) > 0 { return out }
		}
	}
	return base
}

func overrideFloat(base float64, overrides map[string]any, key string) float64 {
	if overrides == nil { return base }
	if v, ok := overrides[key]; ok {
		switch t := v.(type) {
		case float64: return t
		case int: return float64(t)
		case string:
			f, err := strconv.ParseFloat(t,64); if err==nil { return f }
		}
	}
	return base
}

func objectiveOverrides(overrides map[string]any, objective string) map[string]any {
	if overrides == nil { return nil }
	objs, ok := overrides["objectives"].(map[string]any)
	if !ok { return nil }
	o, ok := objs[objective].(map[string]any)
	if !ok { return nil }
	return o
}

func logAudit(ctx context.Context, pool *pgxpool.Pool, execID, actor, action string, detail map[string]any) {
	_, _ = pool.Exec(ctx, "INSERT INTO audit_log(execution_id, actor_id, action, detail) VALUES($1,$2,$3,$4)",
		execID, actor, action, mustJSON(detail))
}

func enqueueOutbox(ctx context.Context, pool *pgxpool.Pool, execID, tenant string, channels []string, connURL string) error {
	payload := map[string]any{"execution_id": execID, "tenant_id": tenant, "channels": channels, "connectors_url": connURL}
	_, err := pool.Exec(ctx, "INSERT INTO outbox(execution_id, payload) VALUES($1,$2)", execID, mustJSON(payload))
	return err
}

func callAI(aiURL string, req map[string]any) (AIResponse, []byte, error) {
	var ai AIResponse
	b, _ := json.Marshal(req)
	httpReq, _ := http.NewRequest("POST", aiURL+"/v262/ai/recommend", strings.NewReader(string(b)))
	httpReq.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return ai, nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return ai, body, errors.New("ai_error")
	}
	if err := json.Unmarshal(body, &ai); err != nil {
		return ai, body, errors.New("ai_bad_response")
	}
	// Basic contract validation
	if ai.Confidence < 0 || ai.Confidence > 1 || len(ai.Actions) == 0 {
		return ai, body, errors.New("ai_contract_violation")
	}
	return ai, body, nil
}

func callConnectorExecute(ctx context.Context, pool *pgxpool.Pool, connURL, execID, channel string, actions []map[string]any, dryRun bool) error {
	reqBody, _ := json.Marshal(map[string]any{
		"execution_id": execID,
		"channel":      channel,
		"actions":      actions,
		"dry_run":      dryRun,
	})

	resp, err := http.Post(connURL+"/v262/connectors/execute", "application/json", strings.NewReader(string(reqBody)))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return errors.New("connector_execute_failed: " + string(b))
	}

	// Evidence capture: store connector result/snapshot (best-effort).
	var parsed map[string]any
	if err := json.Unmarshal(b, &parsed); err == nil {
		if result, ok := parsed["result"]; ok {
			_, _ = pool.Exec(ctx, "INSERT INTO connector_snapshots(execution_id, channel, snapshot) VALUES($1,$2,$3)",
				execID, channel, mustJSON(result))
		}
	}
	return nil
}


func callConnectorRollback(ctx context.Context, pool *pgxpool.Pool, connURL, execID, channel string, dryRun bool) error {
	reqBody, _ := json.Marshal(map[string]any{
		"execution_id": execID,
		"channel":      channel,
		"dry_run":      dryRun,
	})

	resp, err := http.Post(connURL+"/v262/connectors/rollback", "application/json", strings.NewReader(string(reqBody)))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)

	// Evidence capture: store rollback result too (best-effort).
	var parsed map[string]any
	if err := json.Unmarshal(b, &parsed); err == nil {
		if result, ok := parsed["result"]; ok {
			_, _ = pool.Exec(ctx, "INSERT INTO connector_snapshots(execution_id, channel, snapshot) VALUES($1,$2,$3)",
				execID, channel, mustJSON(map[string]any{"rollback": true, "result": result}))
		}
	}
	if resp.StatusCode != 200 {
		return errors.New("connector_rollback_failed: " + string(b))
	}
	return nil
}


func backoffSeconds(attempt int) int {
	sec := int(math.Min(60, math.Pow(2, float64(attempt))))
	if sec < 2 {
		sec = 2
	}
	return sec
}


func postWebhook(url string, payload any) {
	if strings.TrimSpace(url) == "" {
		return
	}
	b, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, strings.NewReader(string(b)))
	req.Header.Set("Content-Type", "application/json")
	// best-effort; short timeout
	client := &http.Client{Timeout: 3 * time.Second}
	_, _ = client.Do(req)
}

func workerLoop(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, connURL string, dlqWebhook string, dryRun bool, pollSeconds int, maxRetries int) {
	ticker := time.NewTicker(time.Duration(pollSeconds) * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		rows, err := pool.Query(ctx, "SELECT id, execution_id, payload FROM outbox WHERE status='PENDING' AND next_attempt_at <= NOW() ORDER BY id LIMIT 10")
		if err != nil {
			continue
		}
		type job struct {
			ID      int64
			ExecID  string
			Payload []byte
		}
		var jobs []job
		for rows.Next() {
			var j job
			_ = rows.Scan(&j.ID, &j.ExecID, &j.Payload)
			jobs = append(jobs, j)
		}
		rows.Close()

		for _, j := range jobs {
			_ = rdb.RPush(ctx, "queue:outbox", string(j.Payload)).Err()
			_, _ = pool.Exec(ctx, "UPDATE outbox SET next_attempt_at = NOW() + INTERVAL '10 seconds' WHERE id=$1", j.ID)
		}

		item, err := rdb.LPop(ctx, "queue:outbox").Result()
		if err != nil || item == "" {
			continue
		}
		var payload map[string]any
		if err := json.Unmarshal([]byte(item), &payload); err != nil {
			continue
		}
		execID, _ := payload["execution_id"].(string)
		if execID == "" {
			continue
		}

		row := pool.QueryRow(ctx, "SELECT recommendation, channels FROM executions WHERE execution_id=$1", execID)
		var recoBytes, channelsBytes []byte
		if err := row.Scan(&recoBytes, &channelsBytes); err != nil {
			continue
		}
		var ai AIResponse
		_ = json.Unmarshal(recoBytes, &ai)
		var channels []string
		_ = json.Unmarshal(channelsBytes, &channels)

		_, _ = pool.Exec(ctx, "UPDATE executions SET status='EXECUTING' WHERE execution_id=$1", execID)
		logAudit(ctx, pool, execID, "system", "EXECUTING", map[string]any{"dry_run": dryRun})

		var failed error
		var applied []string
		var rollbackErrors []string
		for _, ch := range channels {
			if err := callConnectorExecute(ctx, pool, connURL, execID, ch, ai.Actions, dryRun); err != nil {
				failed = err
				// Roll back current channel (best-effort)
				if err2 := callConnectorRollback(ctx, pool, connURL, execID, ch, dryRun); err2 != nil {
					rollbackErrors = append(rollbackErrors, "rollback_"+ch+":"+err2.Error())
				}
				// Roll back any previously applied channels in reverse order (compensating actions)
				for i := len(applied)-1; i >= 0; i-- {
					pch := applied[i]
					if err3 := callConnectorRollback(ctx, pool, connURL, execID, pch, dryRun); err3 != nil {
						rollbackErrors = append(rollbackErrors, "rollback_"+pch+":"+err3.Error())
					}
				}
				break
			}
			applied = append(applied, ch)
		}

		if failed != nil {
			if len(rollbackErrors) > 0 {
				logAudit(ctx, pool, execID, "system", "ROLLBACK_PARTIAL_FAILURE", map[string]any{"errors": rollbackErrors})
				postWebhook(dlqWebhook, map[string]any{"type":"ROLLBACK_PARTIAL_FAILURE", "execution_id": execID, "errors": rollbackErrors, "ts": time.Now().UTC().Format(time.RFC3339)})
			}
			_, _ = pool.Exec(ctx, "UPDATE outbox SET attempts = attempts + 1, last_error=$2 WHERE execution_id=$1 AND status='PENDING'",
				execID, failed.Error())
			row2 := pool.QueryRow(ctx, "SELECT MAX(attempts) FROM outbox WHERE execution_id=$1", execID)
			var attempts int
			_ = row2.Scan(&attempts)

			if attempts >= maxRetries {
				_, _ = pool.Exec(ctx, "UPDATE outbox SET status='DEAD' WHERE execution_id=$1", execID)
				_ = rdb.RPush(ctx, "queue:dlq", item).Err()
				postWebhook(dlqWebhook, map[string]any{"type":"DLQ", "execution_id": execID, "error": failed.Error(), "payload": payload, "ts": time.Now().UTC().Format(time.RFC3339)})
				_, _ = pool.Exec(ctx, "UPDATE executions SET status='FAILED', last_error=$2 WHERE execution_id=$1", execID, failed.Error())
				logAudit(ctx, pool, execID, "system", "DEAD_LETTERED", map[string]any{"attempts": attempts, "error": failed.Error()})
			} else {
				bo := backoffSeconds(attempts)
				_, _ = pool.Exec(ctx, "UPDATE outbox SET next_attempt_at = NOW() + ($2 || ' seconds')::interval WHERE execution_id=$1 AND status='PENDING'",
					execID, strconv.Itoa(bo))
				_, _ = pool.Exec(ctx, "UPDATE executions SET status='NEEDS_REVIEW', last_error=$2 WHERE execution_id=$1", execID, failed.Error())
				logAudit(ctx, pool, execID, "system", "RETRY_SCHEDULED", map[string]any{"attempts": attempts, "backoff_seconds": bo, "error": failed.Error()})
			}
		} else {
			_, _ = pool.Exec(ctx, "UPDATE executions SET status='SUCCESS', last_error=NULL WHERE execution_id=$1", execID)
			_, _ = pool.Exec(ctx, "UPDATE outbox SET status='DONE' WHERE execution_id=$1 AND status='PENDING'", execID)
			logAudit(ctx, pool, execID, "system", "SUCCESS", map[string]any{})
		}
	}
}


func secureEqual(a, b string) bool {
	aa := []byte(a)
	bb := []byte(b)
	if len(aa) != len(bb) { return false }
	var out byte = 0
	for i := range aa { out |= aa[i] ^ bb[i] }
	return out == 0
}

func hmacSHA256Base64(key, msg []byte) string {
	h := hmac.New(sha256.New, key)
	h.Write(msg)
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func anyToString(v any) string {
	if v == nil { return "" }
	switch t := v.(type) {
	case string:
		return t
	case float64:
		// JSON numbers
		if t == float64(int64(t)) { return strconv.FormatInt(int64(t), 10) }
		return strconv.FormatFloat(t, 'f', -1, 64)
	case bool:
		if t { return "true" } else { return "false" }
	default:
		b, _ := json.Marshal(t)
		return string(b)
	}
}

func anyToFloat(v any) float64 {
	if v == nil { return 0 }
	switch t := v.(type) {
	case float64:
		return t
	case string:
		f, _ := strconv.ParseFloat(t, 64)
		return f
	default:
		return 0
	}
}

func normalCDF(x float64) float64 {
	return 0.5 * (1.0 + math.Erf(x/math.Sqrt2))
}


func stopExperiment(ctx context.Context, pool *pgxpool.Pool, tenantID, experimentID, actorID, severity, kind, reason string, detail any) {
	// best-effort stop; only if running
	cmd := `UPDATE experiments SET status='STOPPED', stopped_at=NOW(), stop_reason=$3 WHERE experiment_id=$1 AND tenant_id=$2 AND status='RUNNING'`
	ct, _ := pool.Exec(ctx, cmd, experimentID, tenantID, reason)
	if ct.RowsAffected() > 0 {
		_, _ = pool.Exec(ctx, "INSERT INTO incidents(tenant_id, experiment_id, severity, kind, detail) VALUES($1,$2,$3,$4,$5)", tenantID, experimentID, severity, kind, mustJSON(map[string]any{"reason":reason, "detail": detail}))
		logAudit(ctx, pool, "ADMIN::"+tenantID, actorID, "EXPERIMENT_STOPPED", map[string]any{"experiment_id":experimentID, "reason":reason, "kind":kind})
	}
}

func max(a,b int) int { if a>b { return a }; return b }

func parseTime(s string) time.Time {
	if strings.TrimSpace(s) == "" { return time.Now().UTC() }
	// try RFC3339
	if t, err := time.Parse(time.RFC3339, s); err == nil { return t }
	// Shopify sometimes uses "2006-01-02T15:04:05-07:00" which is RFC3339
	// fallback: date only
	if t, err := time.Parse("2006-01-02", s); err == nil { return t }
	return time.Now().UTC()
}

func storeOrder(ctx context.Context, pool *pgxpool.Pool, tenant, source, orderID string, ots time.Time, currency string, total float64, raw map[string]any) {
	if tenant == "" { tenant = "default" }
	if source == "" { source = "unknown" }
	if orderID == "" { orderID = "unknown" }
	rawb, _ := json.Marshal(raw)
	_, _ = pool.Exec(ctx, `
		INSERT INTO commerce_orders(tenant_id, source, order_id, order_ts, currency, total_price, raw)
		VALUES($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (tenant_id, source, order_id) DO UPDATE SET
		  order_ts=EXCLUDED.order_ts, currency=EXCLUDED.currency, total_price=EXCLUDED.total_price, raw=EXCLUDED.raw
	`, tenant, source, orderID, ots, currency, total, rawb)

	day := ots.UTC().Format("2006-01-02")
	_, _ = pool.Exec(ctx, `
		INSERT INTO commerce_daily_metrics(day, tenant_id, source, orders_count, revenue, currency)
		VALUES($1,$2,$3,1,$4,$5)
		ON CONFLICT(day, tenant_id, source) DO UPDATE SET
		  orders_count = commerce_daily_metrics.orders_count + 1,
		  revenue = commerce_daily_metrics.revenue + EXCLUDED.revenue,
		  currency = COALESCE(EXCLUDED.currency, commerce_daily_metrics.currency),
		  updated_at = NOW()
	`, day, tenant, source, total, currency)
}


func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	ctx := context.Background()

	pgURL := "postgres://" + mustEnv("POSTGRES_USER", "genie") + ":" + mustEnv("POSTGRES_PASSWORD", "genie") + "@" +
		mustEnv("POSTGRES_HOST", "postgres") + ":" + mustEnv("POSTGRES_PORT", "5432") + "/" + mustEnv("POSTGRES_DB", "genie_roi")
	pool, err := pgxpool.New(ctx, pgURL)
	if err != nil {
		panic(err)
	}
	defer pool.Close()
	ensureBootstrap(ctx, pool)

	rdb := redis.NewClient(&redis.Options{Addr: mustEnv("REDIS_HOST", "redis") + ":" + mustEnv("REDIS_PORT", "6379")})
	defer rdb.Close()

	dryRun := strings.ToLower(mustEnv("DRY_RUN", "true")) == "true"
	autoExecute := strings.ToLower(mustEnv("AUTO_EXECUTE", "false")) == "true"

	aiURL := mustEnv("AI_URL", "http://ai:8000")
	connURL := mustEnv("CONNECTORS_URL", "http://connectors:3000")
	dlqWebhook := mustEnv("DLQ_WEBHOOK_URL", "")

	policyPath := mustEnv("POLICY_PATH", "policies/policy.yml")
	policy, err := loadPolicy(policyPath)
	if err != nil {
		panic(err)
	}
	allowed := map[string]bool{}
	for _, ch := range policy.Defaults.AllowedChannels {
		allowed[ch] = true
	}

	opsToken := mustEnv("OPS_TOKEN", "change-me")
	pollSeconds, _ := strconv.Atoi(mustEnv("WORKER_POLL_SECONDS", "2"))
	if pollSeconds < 1 {
		pollSeconds = 2
	}
	maxRetries, _ := strconv.Atoi(mustEnv("OUTBOX_MAX_RETRIES", "5"))
	if maxRetries < 1 {
		maxRetries = 5
	}

	opsAuth := func(c *gin.Context) {
		if c.GetHeader("X-Ops-Token") != opsToken {
			c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
			return
		}
		c.Next()
	}

	r.GET("/healthz", func(c *gin.Context) { c.JSON(200, gin.H{"ok": true}) })
	r.GET("/readyz", func(c *gin.Context) {
		if err := pool.Ping(ctx); err != nil {
			c.JSON(503, gin.H{"ready": false, "db": "down"})
			return
		}
		c.JSON(200, gin.H{"ready": true})
	})
	// Admin UI static
	r.StaticFile("/admin", "web/admin.html")
	r.StaticFile("/v163/admin", "web/admin.html")
	r.StaticFile("/v262/admin", "web/admin.html")
	r.StaticFile("/v265/admin", "web/admin.html")
	r.StaticFile("/v266/admin", "web/admin.html")
	r.StaticFile("/v267/admin", "web/admin.html")
	r.StaticFile("/v268/admin", "web/admin.html")

// V268: version alias routes (keep handlers in v266/v267; admin UI points to v268 paths)
alias := func(from, to string) {
	r.Any(from, func(c *gin.Context) { c.Redirect(307, to) })
}
alias("/v268/admin/api/policies/requests", "/v267/admin/api/policies/requests")
alias("/v268/admin/api/policies/requests/:id", "/v267/admin/api/policies/requests/:id")
alias("/v268/admin/api/policies/:tenant/requests", "/v267/admin/api/policies/:tenant/requests")
alias("/v268/admin/api/policies/requests/:id/approve", "/v267/admin/api/policies/requests/:id/approve")
alias("/v268/admin/api/policies/requests/:id/reject", "/v267/admin/api/policies/requests/:id/reject")
alias("/v268/admin/export/audit.csv", "/v267/admin/export/audit.csv")
alias("/v268/admin/export/audit.pdf", "/v267/admin/export/audit.pdf")
alias("/v268/admin/export/policy_changes.csv", "/v267/admin/export/policy_changes.csv")
alias("/v268/admin/export/policy_changes.pdf", "/v267/admin/export/policy_changes.pdf")
// V266 write APIs
alias("/v268/admin/api/tenants", "/v266/admin/api/tenants")
alias("/v268/admin/api/tenants/:id", "/v266/admin/api/tenants/:id")
alias("/v268/admin/api/quotas/:tenant", "/v266/admin/api/quotas/:tenant")
alias("/v268/admin/api/policies/:tenant", "/v266/admin/api/policies/:tenant")
alias("/v268/admin/api/api_keys", "/v266/admin/api/api_keys")
alias("/v268/admin/api/api_keys/:hash", "/v266/admin/api/api_keys/:hash")

	

	// V267 Admin: policy change requests w/ diff + 2-step approval + exports
	r.GET("/v267/admin/api/policies/requests", func(c *gin.Context) {
		if _, ok := mustAdmin(ctx, pool, c); !ok { return }
		rows, err := pool.Query(ctx, `SELECT id, tenant_id, status, requested_by, requested_at, approved1_by, approved1_at, approved2_by, approved2_at
			FROM policy_change_requests ORDER BY requested_at DESC LIMIT 500`)
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		defer rows.Close()
		items := []gin.H{}
		for rows.Next() {
			var id int64; var tenant,status,rb string; var ra time.Time
			var a1b,a2b *string; var a1a,a2a *time.Time
			_ = rows.Scan(&id,&tenant,&status,&rb,&ra,&a1b,&a1a,&a2b,&a2a)
			items = append(items, gin.H{"id":id,"tenant_id":tenant,"status":status,"requested_by":rb,"requested_at":ra,"approved1_by":a1b,"approved1_at":a1a,"approved2_by":a2b,"approved2_at":a2a})
		}
		c.JSON(200, gin.H{"items":items})
	})
	r.GET("/v267/admin/api/policies/requests/:id", func(c *gin.Context) {
		if _, ok := mustAdmin(ctx, pool, c); !ok { return }
		id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
		var tenant,status string
		var proposedRaw,diffRaw []byte
		err := pool.QueryRow(ctx, "SELECT tenant_id,status,proposed_policy,diff FROM policy_change_requests WHERE id=$1", id).Scan(&tenant,&status,&proposedRaw,&diffRaw)
		if err != nil { c.JSON(404, gin.H{"error":"not_found"}); return }
		var proposed any; _ = json.Unmarshal(proposedRaw,&proposed)
		var diff any; _ = json.Unmarshal(diffRaw,&diff)
		c.JSON(200, gin.H{"id":id,"tenant_id":tenant,"status":status,"proposed_policy":proposed,"diff":diff})
	})
	r.POST("/v267/admin/api/policies/:tenant/requests", func(c *gin.Context) {
		auth, ok := mustAdmin(ctx, pool, c); if !ok { return }
		t := c.Param("tenant")
		var b struct{ Policy map[string]any `json:"policy"`; Reason string `json:"reason"` }
		if err := c.BindJSON(&b); err != nil { c.JSON(400, gin.H{"error":"bad_json"}); return }
		if b.Policy == nil { c.JSON(400, gin.H{"error":"missing_policy"}); return }

		cur, _ := loadTenantPolicyOverrides(ctx, pool, t)
		d := []DiffItem{}
		jsonDiff("", cur, b.Policy, &d)
		diffBytes, _ := json.Marshal(d)
		propBytes, _ := json.Marshal(b.Policy)

		var id int64
		err := pool.QueryRow(ctx, `INSERT INTO policy_change_requests(tenant_id,status,requested_by,proposed_policy,diff,reason)
			VALUES($1,'PENDING',$2,$3,$4,$5) RETURNING id`, t, auth.UserID, propBytes, diffBytes, b.Reason).Scan(&id)
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		logAdminChange(ctx, pool, auth.TenantID, auth.UserID, "POLICY_CHANGE_REQUEST", t, gin.H{"reason":b.Reason, "diff": d})
		c.JSON(200, gin.H{"ok":true,"id":id,"diff":d})
	})
	r.POST("/v267/admin/api/policies/requests/:id/approve", func(c *gin.Context) {
		auth, ok := mustAdmin(ctx, pool, c); if !ok { return }
		id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

		var tenant,status string
		var proposedRaw []byte
		var a1b *string
		err := pool.QueryRow(ctx, `SELECT tenant_id,status,proposed_policy,approved1_by FROM policy_change_requests WHERE id=$1 FOR UPDATE`, id).
			Scan(&tenant,&status,&proposedRaw,&a1b)
		if err != nil { c.JSON(404, gin.H{"error":"not_found"}); return }

		if status == "REJECTED" || status == "APPLIED" { c.JSON(400, gin.H{"error":"invalid_status","status":status}); return }

		if status == "PENDING" {
			_, err := pool.Exec(ctx, `UPDATE policy_change_requests SET status='APPROVED1', approved1_by=$1, approved1_at=NOW() WHERE id=$2`, auth.UserID, id)
			if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
			logAdminChange(ctx, pool, auth.TenantID, auth.UserID, "POLICY_APPROVE_1", tenant, gin.H{"request_id":id})
			c.JSON(200, gin.H{"ok":true,"status":"APPROVED1"}); return
		}

		if status == "APPROVED1" {
			if a1b != nil && *a1b == auth.UserID { c.JSON(400, gin.H{"error":"second_approver_must_differ"}); return }
			_, err := pool.Exec(ctx, "INSERT INTO tenant_policies(tenant_id,policy) VALUES($1,$2) ON CONFLICT (tenant_id) DO UPDATE SET policy=EXCLUDED.policy", tenant, proposedRaw)
			if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
			_, err = pool.Exec(ctx, `UPDATE policy_change_requests SET status='APPLIED', approved2_by=$1, approved2_at=NOW(), applied_at=NOW() WHERE id=$2`, auth.UserID, id)
			if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
			logAdminChange(ctx, pool, auth.TenantID, auth.UserID, "POLICY_APPROVE_2_APPLY", tenant, gin.H{"request_id":id})
			c.JSON(200, gin.H{"ok":true,"status":"APPLIED"}); return
		}
		c.JSON(400, gin.H{"error":"invalid_status","status":status})
	})
	r.POST("/v267/admin/api/policies/requests/:id/reject", func(c *gin.Context) {
		auth, ok := mustAdmin(ctx, pool, c); if !ok { return }
		id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
		var b struct{ Reason string `json:"reason"` }
		_ = c.BindJSON(&b)
		_, err := pool.Exec(ctx, `UPDATE policy_change_requests SET status='REJECTED', rejected_by=$1, rejected_at=NOW(), reject_reason=$2 WHERE id=$3 AND status IN ('PENDING','APPROVED1')`,
			auth.UserID, b.Reason, id)
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		logAdminChange(ctx, pool, auth.TenantID, auth.UserID, "POLICY_REJECT", "-", gin.H{"request_id":id,"reason":b.Reason})
		c.JSON(200, gin.H{"ok":true})
	})

	r.GET("/v267/admin/export/audit.csv", func(c *gin.Context) {
		if _, ok := mustAdmin(ctx, pool, c); !ok { return }
		rows, err := pool.Query(ctx, `SELECT at, tenant_id, user_id, action, target, detail FROM audit_log ORDER BY at DESC LIMIT 5000`)
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		defer rows.Close()
		out := [][]string{{"at","tenant_id","user_id","action","target","detail_json"}}
		for rows.Next() {
			var at time.Time; var tenant,user,action,target string; var detail []byte
			_ = rows.Scan(&at,&tenant,&user,&action,&target,&detail)
			out = append(out, []string{at.Format(time.RFC3339), tenant, user, action, target, string(detail)})
		}
		b := buildCSV(out)
		c.Header("Content-Type","text/csv; charset=utf-8")
		c.Header("Content-Disposition","attachment; filename=audit.csv")
		c.Data(200, "text/csv; charset=utf-8", b)
	})
	r.GET("/v267/admin/export/audit.pdf", func(c *gin.Context) {
		if _, ok := mustAdmin(ctx, pool, c); !ok { return }
		rows, err := pool.Query(ctx, `SELECT at, tenant_id, user_id, action, target FROM audit_log ORDER BY at DESC LIMIT 200`)
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		defer rows.Close()
		lines := []string{"GENIE_ROI V267 Audit Export (last 200) - " + time.Now().Format(time.RFC3339), ""}
		for rows.Next() {
			var at time.Time; var tenant,user,action,target string
			_ = rows.Scan(&at,&tenant,&user,&action,&target)
			lines = append(lines, fmt.Sprintf("%s | %s | %s | %s | %s", at.Format("2006-01-02 15:04:05"), tenant, user, action, target))
		}
		pdf := buildSimplePDF(lines)
		c.Header("Content-Type","application/pdf")
		c.Header("Content-Disposition","attachment; filename=audit.pdf")
		c.Data(200, "application/pdf", pdf)
	})

// V262 path compatibility: route /v262/* to the same handlers as /v163/*
	r.Any("/v262/*any", func(c *gin.Context) {
		c.Request.URL.Path = strings.Replace(c.Request.URL.Path, "/v262/", "/v163/", 1)
		r.HandleContext(c)
	})

	// V265 path compatibility (and default version): route /v265/* to the same handlers as /v163/*
	r.Any("/v265/*any", func(c *gin.Context) {
		c.Request.URL.Path = strings.Replace(c.Request.URL.Path, "/v265/", "/v163/", 1)
		r.HandleContext(c)
	})

	// Webhooks (Shopify + OpenMalls)
	r.POST("/v163/webhooks/shopify/orders/create", func(c *gin.Context) {
		// Verify Shopify HMAC if secret provided
		secret := strings.TrimSpace(os.Getenv("SHOPIFY_WEBHOOK_SECRET"))
		body, _ := io.ReadAll(c.Request.Body)
		if secret != "" {
			h := c.GetHeader("X-Shopify-Hmac-Sha256")
			mac := hmacSHA256Base64([]byte(secret), body)
			if !secureEqual(mac, h) {
				c.JSON(401, gin.H{"ok": false, "error": "invalid_hmac"})
				return
			}
		}
		var payload map[string]any
		if err := json.Unmarshal(body, &payload); err != nil {
			c.JSON(400, gin.H{"ok": false, "error": "bad_json"}); return
		}
		ten := c.GetHeader("X-Tenant-Id")
		if ten == "" { ten = "default" }
		orderID := anyToString(payload["id"])
		createdAt := anyToString(payload["created_at"])
		currency := anyToString(payload["currency"])
		total := anyToFloat(payload["total_price"])
		ots := parseTime(createdAt)
		storeOrder(ctx, pool, ten, "shopify", orderID, ots, currency, total, payload)
		c.JSON(200, gin.H{"ok": true})
	})

	r.POST("/v163/webhooks/openmall/:source/orders", func(c *gin.Context) {
		source := c.Param("source")
		body, _ := io.ReadAll(c.Request.Body)
		var payload map[string]any
		if err := json.Unmarshal(body, &payload); err != nil {
			c.JSON(400, gin.H{"ok": false, "error": "bad_json"}); return
		}
		ten := c.GetHeader("X-Tenant-Id")
		if ten == "" { ten = "default" }
		orderID := anyToString(payload["order_id"])
		if orderID == "" { orderID = anyToString(payload["id"]) }
		createdAt := anyToString(payload["order_ts"])
		if createdAt == "" { createdAt = anyToString(payload["created_at"]) }
		currency := anyToString(payload["currency"])
		total := anyToFloat(payload["total_price"])
		if total == 0 { total = anyToFloat(payload["amount"]) }
		ots := parseTime(createdAt)
		storeOrder(ctx, pool, ten, source, orderID, ots, currency, total, payload)
		c.JSON(200, gin.H{"ok": true})
	})



	// Enterprise Admin APIs (Tenants / Keys / Quotas / Incidents)
	r.GET("/v163/admin/api/tenants", func(c *gin.Context) {
		rows, err := pool.Query(ctx, "SELECT tenant_id, name, created_at FROM tenants ORDER BY created_at DESC")
		if err != nil { c.JSON(500, gin.H{"ok":false,"error":err.Error()}); return }
		defer rows.Close()
		items := []gin.H{}
		for rows.Next() {
			var id, name string; var created time.Time
			_ = rows.Scan(&id, &name, &created)
			items = append(items, gin.H{"tenant_id": id, "name": name, "created_at": created})
		}
		c.JSON(200, gin.H{"items": items})
	})

	r.GET("/v163/admin/api/api_keys", func(c *gin.Context) {
		rows, err := pool.Query(ctx, "SELECT id, tenant_id, user_id, role, key_hash, created_at, is_active FROM api_keys ORDER BY created_at DESC LIMIT 200")
		if err != nil { c.JSON(500, gin.H{"ok":false,"error":err.Error()}); return }
		defer rows.Close()
		items := []gin.H{}
		for rows.Next() {
			var id int64; var tenant, user, role, kh string; var created time.Time; var active bool
			_ = rows.Scan(&id, &tenant, &user, &role, &kh, &created, &active)
			items = append(items, gin.H{"id": id, "tenant_id": tenant, "user_id": user, "role": role, "key_hash": kh, "created_at": created, "is_active": active})
		}
		c.JSON(200, gin.H{"items": items})
	})

	r.GET("/v163/admin/api/quotas", func(c *gin.Context) {
		rows, err := pool.Query(ctx, "SELECT tenant_id, per_minute_limit, per_day_exec_limit, updated_at FROM tenant_quotas ORDER BY updated_at DESC")
		if err != nil { c.JSON(500, gin.H{"ok":false,"error":err.Error()}); return }
		defer rows.Close()
		items := []gin.H{}
		for rows.Next() {
			var tenant string; var pm, pd int64; var updated time.Time
			_ = rows.Scan(&tenant, &pm, &pd, &updated)
			items = append(items, gin.H{"tenant_id": tenant, "per_minute_limit": pm, "per_day_exec_limit": pd, "updated_at": updated})
		}
		c.JSON(200, gin.H{"items": items})
	})

	r.GET("/v163/admin/api/incidents", func(c *gin.Context) {
		rows, err := pool.Query(ctx, "SELECT id, tenant_id, severity, kind, detail, at FROM incidents ORDER BY at DESC LIMIT 200")
		if err != nil { c.JSON(500, gin.H{\"ok\":false,\"error\":err.Error()}); return }
		defer rows.Close()
		items := []gin.H{}
		for rows.Next() {
			var id int64; var tenant, severity, kind string; var detail []byte; var created time.Time
			_ = rows.Scan(&id, &tenant, &severity, &kind, &detail, &created)
			items = append(items, gin.H{\"id\": id, \"tenant_id\": tenant, \"kind\": kind, \"message\": msg, \"created_at\": created})
		}
		c.JSON(200, gin.H{\"items\": items})
	})

	// V266 Admin API (read + write). Requires X-API-Key with admin role.
	r.GET("/v266/admin/api/tenants", func(c *gin.Context) {
		if _, ok := mustAdmin(ctx, pool, c); !ok { return }
		rows, err := pool.Query(ctx, "SELECT tenant_id, name, is_active, created_at FROM tenants ORDER BY created_at DESC LIMIT 500")
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		defer rows.Close()
		items := []gin.H{}
		for rows.Next() {
			var id,name string; var active bool; var created time.Time
			_ = rows.Scan(&id,&name,&active,&created)
			items = append(items, gin.H{"tenant_id":id,"name":name,"is_active":active,"created_at":created})
		}
		c.JSON(200, gin.H{"items":items})
	})
	r.POST("/v266/admin/api/tenants", func(c *gin.Context) {
		auth, ok := mustAdmin(ctx, pool, c); if !ok { return }
		var b struct{ TenantID string `json:"tenant_id"`; Name string `json:"name"`; IsActive *bool `json:"is_active"` }
		if err := c.BindJSON(&b); err != nil { c.JSON(400, gin.H{"error":"bad_json"}); return }
		if b.TenantID=="" || b.Name=="" { c.JSON(400, gin.H{"error":"missing_fields"}); return }
		active := true; if b.IsActive != nil { active = *b.IsActive }
		_, err := pool.Exec(ctx, "INSERT INTO tenants(tenant_id,name,is_active) VALUES($1,$2,$3) ON CONFLICT (tenant_id) DO UPDATE SET name=EXCLUDED.name, is_active=EXCLUDED.is_active", b.TenantID, b.Name, active)
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		logAdminChange(ctx, pool, auth.TenantID, auth.UserID, "TENANT_UPSERT", b.TenantID, b)
		c.JSON(200, gin.H{"ok":true})
	})
	r.PUT("/v266/admin/api/quotas/:tenant", func(c *gin.Context) {
		auth, ok := mustAdmin(ctx, pool, c); if !ok { return }
		t := c.Param("tenant")
		var b struct{ Daily int `json:"daily_exec_limit"`; PerMinute int `json:"per_minute_limit"` }
		if err := c.BindJSON(&b); err != nil { c.JSON(400, gin.H{"error":"bad_json"}); return }
		if b.Daily<=0 || b.PerMinute<=0 { c.JSON(400, gin.H{"error":"invalid_limits"}); return }
		_, err := pool.Exec(ctx, "INSERT INTO tenant_quotas(tenant_id,daily_exec_limit,per_minute_limit) VALUES($1,$2,$3) ON CONFLICT (tenant_id) DO UPDATE SET daily_exec_limit=EXCLUDED.daily_exec_limit, per_minute_limit=EXCLUDED.per_minute_limit, updated_at=NOW()", t, b.Daily, b.PerMinute)
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		logAdminChange(ctx, pool, auth.TenantID, auth.UserID, "QUOTA_SET", t, b)
		c.JSON(200, gin.H{"ok":true})
	})
	r.PUT("/v266/admin/api/policies/:tenant", func(c *gin.Context) {
		auth, ok := mustAdmin(ctx, pool, c); if !ok { return }
		t := c.Param("tenant")
		var b struct{ Policy map[string]any `json:"policy"` }
		if err := c.BindJSON(&b); err != nil { c.JSON(400, gin.H{"error":"bad_json"}); return }
		if b.Policy == nil { c.JSON(400, gin.H{"error":"missing_policy"}); return }
		_, err := pool.Exec(ctx, "INSERT INTO tenant_policies(tenant_id,policy) VALUES($1,$2) ON CONFLICT (tenant_id) DO UPDATE SET policy=EXCLUDED.policy, updated_at=NOW()", t, mustJSON(b.Policy))
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		logAdminChange(ctx, pool, auth.TenantID, auth.UserID, "POLICY_SET", t, b.Policy)
		c.JSON(200, gin.H{"ok":true})
	})
	r.GET("/v266/admin/api/api_keys", func(c *gin.Context) {
		if _, ok := mustAdmin(ctx, pool, c); !ok { return }
		rows, err := pool.Query(ctx, "SELECT api_key_hash, tenant_id, user_id, role, label, created_at, revoked_at FROM api_keys ORDER BY created_at DESC LIMIT 500")
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		defer rows.Close()
		items := []gin.H{}
		for rows.Next() {
			var h,tid,uid,role,label string; var created time.Time; var revoked *time.Time
			_ = rows.Scan(&h,&tid,&uid,&role,&label,&created,&revoked)
			items = append(items, gin.H{"api_key_hash":h,"tenant_id":tid,"user_id":uid,"role":role,"label":label,"created_at":created,"revoked_at":revoked})
		}
		c.JSON(200, gin.H{"items":items})
	})
	r.POST("/v266/admin/api/api_keys", func(c *gin.Context) {
		auth, ok := mustAdmin(ctx, pool, c); if !ok { return }
		var b struct{ TenantID string `json:"tenant_id"`; UserID string `json:"user_id"`; Role string `json:"role"`; Label string `json:"label"` }
		if err := c.BindJSON(&b); err != nil { c.JSON(400, gin.H{"error":"bad_json"}); return }
		if b.TenantID=="" || b.UserID=="" { c.JSON(400, gin.H{"error":"missing_fields"}); return }
		role := strings.ToLower(b.Role); if role=="" { role="viewer" }
		if role!="viewer" && role!="operator" && role!="admin" { c.JSON(400, gin.H{"error":"bad_role"}); return }
		// generate raw key
		buf := make([]byte, 32); _, _ = rand.Read(buf)
		raw := base64.RawURLEncoding.EncodeToString(buf)
		h := hashAPIKey(raw)
		_, err := pool.Exec(ctx, "INSERT INTO api_keys(api_key_hash,tenant_id,user_id,role,label) VALUES($1,$2,$3,$4,$5)", h, b.TenantID, b.UserID, role, b.Label)
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		logAdminChange(ctx, pool, auth.TenantID, auth.UserID, "API_KEY_CREATE", h, b)
		c.JSON(200, gin.H{"api_key": raw, "api_key_hash": h})
	})
	r.DELETE("/v266/admin/api/api_keys/:hash", func(c *gin.Context) {
		auth, ok := mustAdmin(ctx, pool, c); if !ok { return }
		h := c.Param("hash")
		_, err := pool.Exec(ctx, "UPDATE api_keys SET revoked_at=NOW() WHERE api_key_hash=$1 AND revoked_at IS NULL", h)
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		logAdminChange(ctx, pool, auth.TenantID, auth.UserID, "API_KEY_REVOKE", h, map[string]any{})
		c.JSON(200, gin.H{"ok":true})
	})


	// Ops
	r.POST("/v163/ops/policy/reload", opsAuth, func(c *gin.Context) {
		p, err := loadPolicy(policyPath)
		if err != nil {
			c.JSON(500, gin.H{"error": "policy_reload_failed"})
			return
		}
		policy = p
		allowed = map[string]bool{}
		for _, ch := range policy.Defaults.AllowedChannels {
			allowed[ch] = true
		}
		c.JSON(200, gin.H{"ok": true, "version": policy.Version})
	})

	r.GET("/v163/ops/outbox", opsAuth, func(c *gin.Context) {
		rows, err := pool.Query(ctx, "SELECT id, execution_id, status, attempts, next_attempt_at, last_error FROM outbox ORDER BY id DESC LIMIT 50")
		if err != nil {
			c.JSON(500, gin.H{"error": "db"})
			return
		}
		defer rows.Close()
		var out []gin.H
		for rows.Next() {
			var id int64
			var execID, status string
			var attempts int
			var next time.Time
			var lastErr *string
			_ = rows.Scan(&id, &execID, &status, &attempts, &next, &lastErr)
			out = append(out, gin.H{"id": id, "execution_id": execID, "status": status, "attempts": attempts, "next_attempt_at": next, "last_error": lastErr})
		}
		c.JSON(200, gin.H{"items": out})
	})

	r.GET("/v163/ops/dlq", opsAuth, func(c *gin.Context) {
		n, _ := rdb.LLen(ctx, "queue:dlq").Result()
		items, _ := rdb.LRange(ctx, "queue:dlq", -10, -1).Result()
		c.JSON(200, gin.H{"count": n, "tail": items})
	})

	r.GET("/v163/ops/metrics", opsAuth, func(c *gin.Context) {
		var pending int64
		var dead int64
		_ = pool.QueryRow(ctx, "SELECT COUNT(*) FROM outbox WHERE status='PENDING'").Scan(&pending)
		_ = pool.QueryRow(ctx, "SELECT COUNT(*) FROM outbox WHERE status='DEAD'").Scan(&dead)
		dlq, _ := rdb.LLen(ctx, "queue:dlq").Result()
		c.JSON(200, MetricsSnapshot{OutboxPending: pending, OutboxDead: dead, DLQCount: dlq})
	})

	// Admin APIs (viewer/operator/admin via X-Role header; minimal RBAC placeholder)
	r.GET("/v163/admin/api/executions", func(c *gin.Context) {
		rows, err := pool.Query(ctx, "SELECT execution_id, status, confidence, requested_at, tenant_id, user_id, objective, dry_run, shadow_mode, last_error FROM executions ORDER BY requested_at DESC LIMIT 50")
		if err != nil {
			c.JSON(500, gin.H{"error": "db"})
			return
		}
		defer rows.Close()
		var items []gin.H
		for rows.Next() {
			var execID, status, tenant, user, objective string
			var conf *float64
			var at time.Time
			var dry, shadow bool
			var lastErr *string
			_ = rows.Scan(&execID, &status, &conf, &at, &tenant, &user, &objective, &dry, &shadow, &lastErr)
			items = append(items, gin.H{
				"execution_id": execID,
				"status": status,
				"confidence": conf,
				"requested_at": at,
				"tenant_id": tenant,
				"user_id": user,
				"objective": objective,
				"dry_run": dry,
				"shadow_mode": shadow,
				"last_error": lastErr,
			})
		}
		c.JSON(200, gin.H{"items": items})
	})

	r.GET("/v163/admin/api/approval_queue", func(c *gin.Context) {
		rows, err := pool.Query(ctx, "SELECT execution_id, tenant_id, user_id, objective, channels, requested_at, confidence FROM executions WHERE status='PENDING_APPROVAL' ORDER BY requested_at DESC LIMIT 50")
		if err != nil {
			c.JSON(500, gin.H{"error": "db"})
			return
		}
		defer rows.Close()
		var items []gin.H
		for rows.Next() {
			var execID, tenant, user, objective string
			var channels []byte
			var at time.Time
			var conf *float64
			_ = rows.Scan(&execID, &tenant, &user, &objective, &channels, &at, &conf)
			items = append(items, gin.H{"execution_id": execID, "tenant_id": tenant, "user_id": user, "objective": objective, "channels": json.RawMessage(channels), "requested_at": at, "confidence": conf})
		}
		c.JSON(200, gin.H{"items": items})
	})



	// Core APIs
	// Experiments APIs (enterprise: guardrails/autostop)
	r.POST("/v163/experiments", func(c *gin.Context) {
		auth, aerr := authFromRequest(ctx, pool, c)
		if aerr != nil { c.JSON(401, gin.H{"error": aerr.Error()}); return }
		var in struct { Name string `json:"name"`; Objective string `json:"objective"`; Channels []string `json:"channels"` }
		if err := c.BindJSON(&in); err != nil || in.Name=="" || in.Objective=="" || len(in.Channels)==0 { c.JSON(400, gin.H{"error":"bad_request"}); return }
		expID := idFromRequest(mustJSON(in), "exp")
		_, _ = pool.Exec(ctx, "INSERT INTO experiments(experiment_id, tenant_id, name, objective, channels) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", expID, auth.TenantID, in.Name, in.Objective, mustJSON(in.Channels))
		_, _ = pool.Exec(ctx, "INSERT INTO experiment_guardrails(experiment_id) VALUES($1) ON CONFLICT DO NOTHING", expID)
		c.JSON(200, gin.H{"experiment_id": expID, "status":"RUNNING"})
	})

	r.POST("/v163/experiments/:id/guardrails", func(c *gin.Context) {
		auth, aerr := authFromRequest(ctx, pool, c)
		if aerr != nil { c.JSON(401, gin.H{"error": aerr.Error()}); return }
		expID := c.Param("id")
		var in struct { MaxDailySpend float64 `json:"max_daily_spend"`; MaxNegativeUpliftPct float64 `json:"max_negative_uplift_pct"`; MinConfidence float64 `json:"min_confidence"` }
		if err := c.BindJSON(&in); err != nil { c.JSON(400, gin.H{"error":"bad_request"}); return }
		// verify ownership
		var tmp string
		if err := pool.QueryRow(ctx, "SELECT experiment_id FROM experiments WHERE experiment_id=$1 AND tenant_id=$2", expID, auth.TenantID).Scan(&tmp); err != nil { c.JSON(404, gin.H{"error":"not_found"}); return }
		_, _ = pool.Exec(ctx, "UPDATE experiment_guardrails SET max_daily_spend=$2, max_negative_uplift_pct=$3, min_confidence=$4, updated_at=NOW() WHERE experiment_id=$1", expID, in.MaxDailySpend, in.MaxNegativeUpliftPct, in.MinConfidence)
		c.JSON(200, gin.H{"ok":true})
	})

	r.GET("/v163/experiments", func(c *gin.Context) {
		auth, aerr := authFromRequest(ctx, pool, c)
		if aerr != nil { c.JSON(401, gin.H{"error": aerr.Error()}); return }
		rows, err := pool.Query(ctx, "SELECT experiment_id, name, objective, status, created_at, stopped_at, stop_reason FROM experiments WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100", auth.TenantID)
		if err != nil { c.JSON(500, gin.H{"error":"db"}); return }
		defer rows.Close()
		var items []gin.H
		for rows.Next() {
			var id,name,obj,status,reason string
			var created time.Time
			var stopped *time.Time
			_ = rows.Scan(&id,&name,&obj,&status,&created,&stopped,&reason)
			items = append(items, gin.H{"experiment_id":id,"name":name,"objective":obj,"status":status,"created_at":created,"stopped_at":stopped,"stop_reason":reason})
		}
		c.JSON(200, gin.H{"items":items})
	})

	r.POST("/v163/workflows/run", func(c *gin.Context) {
		idemKey := c.GetHeader("Idempotency-Key")
		if idemKey == "" {
			idemKey = "no-idem"
		}
		body, _ := io.ReadAll(c.Request.Body)
		var req RunRequest
		if err := json.Unmarshal(body, &req); err != nil {
			c.JSON(400, gin.H{"error": "bad_json"})
			return
		}
		// V163: API key auth + per-tenant quotas
		auth, aerr := authFromRequest(ctx, pool, c)
		if aerr != nil {
			c.JSON(401, gin.H{"error": aerr.Error()})
			return
		}
		if req.TenantID == "" { req.TenantID = auth.TenantID }
		if req.UserID == "" { req.UserID = auth.UserID }
		if req.TenantID != auth.TenantID {
			c.JSON(403, gin.H{"error": "tenant_mismatch"})
			return
		}
		if qerr := enforceQuota(ctx, pool, rdb, req.TenantID); qerr != nil {
			c.JSON(429, gin.H{"error": qerr.Error()})
			return
		}
		if req.TenantID == "" || req.UserID == "" || req.Objective == "" || len(req.Channels) == 0 {
			c.JSON(400, gin.H{"error": "missing_fields"})
			return
		}
		execID := idFromRequest(body, idemKey)

		lockKey := "idem:" + execID
		ok, _ := rdb.SetNX(ctx, lockKey, "1", 10*time.Minute).Result()
		if !ok {
			row := pool.QueryRow(ctx, "SELECT status, confidence, recommendation FROM executions WHERE execution_id=$1", execID)
			var status string
			var conf *float64
			var reco []byte
			if err := row.Scan(&status, &conf, &reco); err == nil {
				c.JSON(200, gin.H{"execution_id": execID, "status": status, "confidence": conf, "recommendation": json.RawMessage(reco), "idempotent": true})
				return
			}
		}

		// V163: per-tenant policy overrides (allowed_channels / thresholds / max_budget_delta_pct)
		over, _ := loadTenantPolicyOverrides(ctx, pool, req.TenantID)
		allowedList := allowedChannelsForTenant(policy.Defaults.AllowedChannels, over)
		allowedSet := map[string]bool{}
		for _, ch := range allowedList { allowedSet[ch] = true }

		for _, ch := range req.Channels {
			if !allowedSet[ch] {
				c.JSON(400, gin.H{"error": "channel_not_allowed", "channel": ch})
				return
			}
		}

		maxDelta := policy.Defaults.MaxBudgetDeltaPct
		if obj, ok := policy.Objectives[req.Objective]; ok && obj.MaxBudgetDeltaPct > 0 {
			maxDelta = obj.MaxBudgetDeltaPct
		}
		// tenant overrides
		maxDelta = overrideFloat(maxDelta, over, "max_budget_delta_pct")
		objOver := objectiveOverrides(over, req.Objective)
		maxDelta = overrideFloat(maxDelta, objOver, "max_budget_delta_pct")
		if req.BudgetDeltaLimitPct <= 0 {
			req.BudgetDeltaLimitPct = maxDelta
		}
		if req.BudgetDeltaLimitPct > maxDelta {
			c.JSON(400, gin.H{"error": "budget_delta_exceeds_policy", "max_pct": maxDelta})
			return
		}
		if policy.Defaults.DenyIfShadowFalse && !req.ShadowMode {
			c.JSON(400, gin.H{"error": "shadow_mode_required"})
			return
		}


		// V266: experiment MVP (randomization + contamination control)
		variant := ""
		unitID := req.UnitID
		if unitID == "" { unitID = req.UserID }
		controlHoldout := false
		if req.ExperimentID != "" {
			// validate experiment exists and is running
			var expObj string
			var expCh []byte
			var expStatus string
			err := pool.QueryRow(ctx, "SELECT objective, channels, status FROM experiments WHERE experiment_id=$1 AND tenant_id=$2", req.ExperimentID, req.TenantID).Scan(&expObj, &expCh, &expStatus)
			if err != nil {
				c.JSON(400, gin.H{"error":"experiment_not_found"})
				return
			}
			if expStatus != "RUNNING" {
				c.JSON(400, gin.H{"error":"experiment_not_running", "status": expStatus})
				return
			}
			if expObj != req.Objective {
				c.JSON(400, gin.H{"error":"experiment_objective_mismatch"})
				return
			}
			// channels must match subset (simple check)
			var expChan []string
			_ = json.Unmarshal(expCh, &expChan)
			expSet := map[string]bool{}
			for _, ch := range expChan { expSet[ch] = true }
			for _, ch := range req.Channels {
				if !expSet[ch] { c.JSON(400, gin.H{"error":"experiment_channels_mismatch"}); return }
			}
			salt, _ := getExperimentSalt(ctx, pool, req.ExperimentID, req.TenantID)
			forced := strings.ToLower(req.ForceVariant)
			if forced != "" && forced != "control" && forced != "treatment" { forced = "" }
			variant, err = ensureExperimentUnit(ctx, pool, req.ExperimentID, req.TenantID, unitID, salt, forced)
			if err != nil { c.JSON(500, gin.H{"error":"experiment_assign_failed"}); return }
			if variant == "control" {
				// control is holdout: always shadow (no execution)
				req.ShadowMode = true
				controlHoldout = true
			}
		}
		aiReq := map[string]any{
			"tenant_id": req.TenantID,
			"objective": req.Objective,
			"channels": req.Channels,
			"budget_delta_limit_pct": req.BudgetDeltaLimitPct,
			"shadow_mode": req.ShadowMode,
			"experiment_id": req.ExperimentID,
			"variant": variant,
			"unit_id": unitID,
		}
		ai, aiRaw, err := callAI(aiURL, aiReq)
		if err != nil {
			c.JSON(502, gin.H{"error": "ai_unavailable_or_bad", "detail": string(aiRaw)})
			return
		}

		threshold := policy.Defaults.ConfidenceThreshold
		if obj, ok := policy.Objectives[req.Objective]; ok && obj.ConfidenceThreshold > 0 {
			threshold = obj.ConfidenceThreshold
		}
		threshold = overrideFloat(threshold, over, "confidence_threshold")
		threshold = overrideFloat(threshold, objOver, "confidence_threshold")
		approvedByPolicy := ai.Confidence >= threshold

		status := "PENDING_APPROVAL"
		if autoExecute && approvedByPolicy && !dryRun {
			status = "APPROVED"
		}

		_, err = pool.Exec(ctx, `
			INSERT INTO executions(execution_id, tenant_id, user_id, objective, channels, status, dry_run, shadow_mode, confidence, recommendation, experiment_id, variant, unit_id)
			VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
			ON CONFLICT (execution_id) DO NOTHING
		`, execID, req.TenantID, req.UserID, req.Objective, mustJSON(req.Channels), status, dryRun, req.ShadowMode, ai.Confidence, mustJSONRaw(aiRaw), req.ExperimentID, variant, unitID)
		if err != nil {
			c.JSON(500, gin.H{"error": "db_write_failed"})
			return
		}
		logAudit(ctx, pool, execID, req.UserID, "WORKFLOW_RUN", map[string]any{"confidence": ai.Confidence, "threshold": threshold, "dry_run": dryRun})


		if controlHoldout {
			// Control group: do not execute changes; keep record for evidence & shadow metrics only.
			_, _ = pool.Exec(ctx, "UPDATE executions SET status='CONTROL_HOLDOUT' WHERE execution_id=$1", execID)
			logAudit(ctx, pool, execID, req.UserID, "EXPERIMENT_CONTROL_HOLDOUT", map[string]any{"experiment_id":req.ExperimentID, "variant":variant, "unit_id":unitID})
			c.JSON(200, gin.H{"execution_id": execID, "status": "CONTROL_HOLDOUT", "confidence": ai.Confidence, "recommendation": ai, "experiment_id": req.ExperimentID, "variant": variant, "unit_id": unitID})
			return
		}
		if autoExecute && approvedByPolicy {
			_ = enqueueOutbox(ctx, pool, execID, req.TenantID, req.Channels, connURL)
		}

		c.JSON(200, gin.H{
			"execution_id": execID,
			"status": status,
			"dry_run": dryRun,
			"auto_execute": autoExecute,
			"confidence": ai.Confidence,
			"approved_by_policy": approvedByPolicy,
			"recommendation": ai,
		})
	})

	r.POST("/v163/executions/approve", func(c *gin.Context) {
		var req ApproveRequest
		if err := c.BindJSON(&req); err != nil || req.ExecutionID == "" || req.ApproverID == "" {
			c.JSON(400, gin.H{"error": "bad_request"})
			return
		}
		_, err := pool.Exec(ctx, "UPDATE executions SET status='APPROVED', approval=$2 WHERE execution_id=$1",
			req.ExecutionID, mustJSON(map[string]any{"approver_id": req.ApproverID, "at": time.Now().UTC().Format(time.RFC3339)}))
		if err != nil {
			c.JSON(500, gin.H{"error": "db_update_failed"})
			return
		}
		logAudit(ctx, pool, req.ExecutionID, req.ApproverID, "APPROVED", map[string]any{})

		row := pool.QueryRow(ctx, "SELECT tenant_id, channels FROM executions WHERE execution_id=$1", req.ExecutionID)
		var tenant string
		var channelsBytes []byte
		if err := row.Scan(&tenant, &channelsBytes); err != nil {
			c.JSON(404, gin.H{"error": "not_found"})
			return
		}
		var channels []string
		_ = json.Unmarshal(channelsBytes, &channels)

		if err := enqueueOutbox(ctx, pool, req.ExecutionID, tenant, channels, connURL); err != nil {
			c.JSON(500, gin.H{"error": "enqueue_failed"})
			return
		}
		c.JSON(200, gin.H{"ok": true, "execution_id": req.ExecutionID})
	})

	r.GET("/v163/executions/:id", func(c *gin.Context) {
		id := c.Param("id")
		row := pool.QueryRow(ctx, "SELECT tenant_id,user_id,objective,channels,requested_at,status,dry_run,shadow_mode,confidence,recommendation,approval,last_error FROM executions WHERE execution_id=$1", id)
		var tenant, user, obj, status string
		var channels, reco, approval []byte
		var requested time.Time
		var dry, shadow bool
		var conf *float64
		var lastErr *string
		if err := row.Scan(&tenant, &user, &obj, &channels, &requested, &status, &dry, &shadow, &conf, &reco, &approval, &lastErr); err != nil {
			c.JSON(404, gin.H{"error": "not_found"})
			return
		}
		
		// Simple uplift compute: expects metric to include numeric control_* and treatment_* fields (e.g., control_roas, treatment_roas)
		var uplift []gin.H
		for _, ev := range events {
			m, ok := ev["metric"].(json.RawMessage)
			if !ok {
				continue
			}
			var mm map[string]any
			_ = json.Unmarshal(m, &mm)
			ctrl, _ := mm["control_value"].(float64)
			trt, _ := mm["treatment_value"].(float64)
			metricName, _ := mm["metric"].(string)
			if metricName == "" {
				metricName = "value"
			}
			var up *float64
			if ctrl != 0 {
				v := (trt-ctrl)/ctrl*100.0
				up = &v
			}
			uplift = append(uplift, gin.H{"at": ev["at"], "channel": ev["channel"], "metric": metricName, "control": ctrl, "treatment": trt, "uplift_pct": up})
		}
c.JSON(200, gin.H{
			"execution_id": id,
			"tenant_id": tenant,
			"user_id": user,
			"objective": obj,
			"channels": json.RawMessage(channels),
			"requested_at": requested,
			"status": status,
			"dry_run": dry,
			"shadow_mode": shadow,
			"confidence": conf,
			"recommendation": json.RawMessage(reco),
			"approval": json.RawMessage(approval),
			"last_error": lastErr,
		})
	})

	r.GET("/v163/audit/:id", func(c *gin.Context) {
		id := c.Param("id")
		rows, err := pool.Query(ctx, "SELECT at, actor_id, action, detail FROM audit_log WHERE execution_id=$1 ORDER BY id ASC", id)
		if err != nil {
			c.JSON(500, gin.H{"error": "db"})
			return
		}
		defer rows.Close()
		var events []gin.H
		for rows.Next() {
			var at time.Time
			var actor *string
			var action string
			var detail []byte
			_ = rows.Scan(&at, &actor, &action, &detail)
			events = append(events, gin.H{"at": at, "actor_id": actor, "action": action, "detail": json.RawMessage(detail)})
		}
		c.JSON(200, gin.H{"execution_id": id, "events": events})
	})

	// Shadow outcomes capture (structured placeholder)
	r.POST("/v163/shadow/events", func(c *gin.Context) {
		var ev ShadowEvent
		if err := c.BindJSON(&ev); err != nil || ev.ExecutionID == "" || ev.Channel == "" || ev.Metric == nil {
			c.JSON(400, gin.H{"error": "bad_request"})
			return
		}
		_, err := pool.Exec(ctx, "INSERT INTO shadow_events(execution_id, channel, metric) VALUES($1,$2,$3)", ev.ExecutionID, ev.Channel, mustJSON(ev.Metric))
		// V163: experiment guardrails / auto-stop (best-effort)
		var tenantID string
		_ = pool.QueryRow(ctx, "SELECT tenant_id FROM executions WHERE execution_id=$1", ev.ExecutionID).Scan(&tenantID)
		if tenantID != "" {
			_, _ = checkExperimentGuardrails(ctx, pool, tenantID, ev.Metric)
		}

		if err != nil {
			c.JSON(500, gin.H{"error": "db_write_failed"})
			return
		}
		logAudit(ctx, pool, ev.ExecutionID, "system", "SHADOW_EVENT", map[string]any{"channel": ev.Channel})
		c.JSON(200, gin.H{"ok": true})
	})

	r.GET("/v163/reports/lift/:id", func(c *gin.Context) {
		id := c.Param("id")

		rows, err := pool.Query(ctx, "SELECT channel, metric, at FROM shadow_events WHERE execution_id=$1 ORDER BY id ASC", id)
		if err != nil {
			c.JSON(500, gin.H{"error": "db"})
			return
		}
		defer rows.Close()

		type liftRow struct {
			Channel string
			At      time.Time
			Metric  map[string]any
		}
		var rowsOut []liftRow

		for rows.Next() {
			var ch string
			var metricBytes []byte
			var at time.Time
			_ = rows.Scan(&ch, &metricBytes, &at)
			var mobj map[string]any
			_ = json.Unmarshal(metricBytes, &mobj)
			rowsOut = append(rowsOut, liftRow{Channel: ch, At: at, Metric: mobj})
		}

		// Compute uplift when control/treatment are present.
		var computed []gin.H
		var computedCount int
		for _, r0 := range rowsOut {
			m := r0.Metric
			ctrl, _ := m["control_value"].(float64)
			trt, _ := m["treatment_value"].(float64)

			out := gin.H{"channel": r0.Channel, "at": r0.At, "metric": m}

			if ctrl != 0 && trt != 0 {
				uplift := (trt - ctrl) / ctrl * 100.0
				out["uplift_pct"] = uplift
				computedCount++

				// Optional quick significance signal if sample sizes and (optional) stddev exist.
				// Expecting: n_control, n_treatment, std_control, std_treatment (all optional).
				nc, _ := m["n_control"].(float64)
				nt, _ := m["n_treatment"].(float64)
				sc, _ := m["std_control"].(float64)
				st, _ := m["std_treatment"].(float64)
				if nc > 1 && nt > 1 && sc > 0 && st > 0 {
					// Welch-like z approximation (not a full t-test; intended as an ops signal).
					se := math.Sqrt((sc*sc)/nc + (st*st)/nt)
					if se > 0 {
						z := (trt - ctrl) / se
						out["z_score_approx"] = z
						out["significance_hint"] = math.Abs(z) >= 1.96 // ~95%
						p := 2.0 * (1.0 - normalCDF(math.Abs(z)))
						out["p_value_approx"] = p
						looks := int(anyToFloat(m["seq_looks"]))
						if looks <= 0 { looks, _ = strconv.Atoi(getenv("SEQ_LOOKS","5")) }
						alpha, _ := strconv.ParseFloat(getenv("SEQ_ALPHA","0.05"), 64)
						thr := alpha / float64(max(1, looks)) // conservative Bonferroni sequential
						out["seq_alpha_threshold"] = thr
						decision := "continue"
						if p > 0 && p < thr {
							if uplift < 0 { decision = "stop_negative" } else { decision = "stop_positive" }
						}
						out["sequential_decision"] = decision
						if expID := anyToString(m["experiment_id"]); expID != "" {
							_, _ = pool.Exec(ctx, `INSERT INTO experiment_checkpoints(experiment_id, tenant_id, metric, control_value, treatment_value, n_control, n_treatment, p_value, decision, raw)
							VALUES($1, COALESCE((SELECT tenant_id FROM executions WHERE execution_id=$2),'default'), $3, $4, $5, $6, $7, $8, $9, $10)`,
							expID, id, anyToString(m["metric"]), ctrl, trt, int64(nc), int64(nt), p, decision, mustJSON(m))
										// Auto-stop experiment based on sequential decision
										if decision == "stop_negative" || decision == "stop_positive" {
											// determine tenant
											var tid string
											_ = pool.QueryRow(ctx, "SELECT tenant_id FROM executions WHERE execution_id=$1", id).Scan(&tid)
											if tid == "" { tid = "default" }
											reason := "sequential_" + decision
											stopExperiment(ctx, pool, tid, expID, "system", "HIGH", "SEQUENTIAL_TEST", reason, map[string]any{"p_value":p, "threshold":thr, "uplift_pct":uplift})
										}

						}
					}
				}
			}

			computed = append(computed, out)
		}

		c.JSON(200, gin.H{
			"execution_id": id,
			"lift_report": gin.H{
				"status": "computed",
				"shadow_events_count": len(computed),
				"uplift_computed_count": computedCount,
				"events": computed,
				"note": "Uplift is computed when control_value/treatment_value exist. significance_hint is a rough signal (needs proper experimental design).",
			},
		})
	})


	go workerLoop(ctx, pool, rdb, connURL, dlqWebhook, dryRun, pollSeconds, maxRetries)

	port := mustEnv("GATEWAY_PORT", "8080")
	if err := r.Run(":" + port); err != nil {
		panic(err)
	}
}
