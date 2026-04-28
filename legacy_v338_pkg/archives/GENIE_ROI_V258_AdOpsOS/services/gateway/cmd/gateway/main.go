package main

import (
	"context"
	"crypto/sha256"
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
)

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

func mustJSON(v any) []byte { b, _ := json.Marshal(v); return b }
func mustJSONRaw(b []byte) []byte { var tmp any; _ = json.Unmarshal(b, &tmp); return b }

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
	httpReq, _ := http.NewRequest("POST", aiURL+"/v258/ai/recommend", strings.NewReader(string(b)))
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

func callConnectorExecute(connURL, execID, channel string, actions []map[string]any, dryRun bool) error {
	reqBody, _ := json.Marshal(map[string]any{"execution_id": execID, "channel": channel, "actions": actions, "dry_run": dryRun})
	resp, err := http.Post(connURL+"/v258/connectors/execute", "application/json", strings.NewReader(string(reqBody)))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		return errors.New("connector_execute_failed: " + string(b))
	}
	return nil
}

func callConnectorRollback(connURL, execID, channel string, dryRun bool) error {
	reqBody, _ := json.Marshal(map[string]any{"execution_id": execID, "channel": channel, "dry_run": dryRun})
	resp, err := http.Post(connURL+"/v258/connectors/rollback", "application/json", strings.NewReader(string(reqBody)))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func backoffSeconds(attempt int) int {
	sec := int(math.Min(60, math.Pow(2, float64(attempt))))
	if sec < 2 {
		sec = 2
	}
	return sec
}

func workerLoop(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, connURL string, dryRun bool, pollSeconds int, maxRetries int) {
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
		for _, ch := range channels {
			if err := callConnectorExecute(connURL, execID, ch, ai.Actions, dryRun); err != nil {
				failed = err
				_ = callConnectorRollback(connURL, execID, ch, dryRun)
				break
			}
		}

		if failed != nil {
			_, _ = pool.Exec(ctx, "UPDATE outbox SET attempts = attempts + 1, last_error=$2 WHERE execution_id=$1 AND status='PENDING'",
				execID, failed.Error())
			row2 := pool.QueryRow(ctx, "SELECT MAX(attempts) FROM outbox WHERE execution_id=$1", execID)
			var attempts int
			_ = row2.Scan(&attempts)

			if attempts >= maxRetries {
				_, _ = pool.Exec(ctx, "UPDATE outbox SET status='DEAD' WHERE execution_id=$1", execID)
				_ = rdb.RPush(ctx, "queue:dlq", item).Err()
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

	rdb := redis.NewClient(&redis.Options{Addr: mustEnv("REDIS_HOST", "redis") + ":" + mustEnv("REDIS_PORT", "6379")})
	defer rdb.Close()

	dryRun := strings.ToLower(mustEnv("DRY_RUN", "true")) == "true"
	autoExecute := strings.ToLower(mustEnv("AUTO_EXECUTE", "false")) == "true"

	aiURL := mustEnv("AI_URL", "http://ai:8000")
	connURL := mustEnv("CONNECTORS_URL", "http://connectors:3000")

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

	// Ops
	r.POST("/v258/ops/policy/reload", opsAuth, func(c *gin.Context) {
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

	r.GET("/v258/ops/outbox", opsAuth, func(c *gin.Context) {
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

	r.GET("/v258/ops/dlq", opsAuth, func(c *gin.Context) {
		n, _ := rdb.LLen(ctx, "queue:dlq").Result()
		items, _ := rdb.LRange(ctx, "queue:dlq", -10, -1).Result()
		c.JSON(200, gin.H{"count": n, "tail": items})
	})

	r.GET("/v258/ops/metrics", opsAuth, func(c *gin.Context) {
		var pending int64
		var dead int64
		_ = pool.QueryRow(ctx, "SELECT COUNT(*) FROM outbox WHERE status='PENDING'").Scan(&pending)
		_ = pool.QueryRow(ctx, "SELECT COUNT(*) FROM outbox WHERE status='DEAD'").Scan(&dead)
		dlq, _ := rdb.LLen(ctx, "queue:dlq").Result()
		c.JSON(200, MetricsSnapshot{OutboxPending: pending, OutboxDead: dead, DLQCount: dlq})
	})

	// Core APIs
	r.POST("/v258/workflows/run", func(c *gin.Context) {
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

		for _, ch := range req.Channels {
			if !allowed[ch] {
				c.JSON(400, gin.H{"error": "channel_not_allowed", "channel": ch})
				return
			}
		}

		maxDelta := policy.Defaults.MaxBudgetDeltaPct
		if obj, ok := policy.Objectives[req.Objective]; ok && obj.MaxBudgetDeltaPct > 0 {
			maxDelta = obj.MaxBudgetDeltaPct
		}
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

		aiReq := map[string]any{
			"tenant_id": req.TenantID,
			"objective": req.Objective,
			"channels": req.Channels,
			"budget_delta_limit_pct": req.BudgetDeltaLimitPct,
			"shadow_mode": req.ShadowMode,
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
		approvedByPolicy := ai.Confidence >= threshold

		status := "NEEDS_REVIEW"
		if autoExecute && approvedByPolicy && !dryRun {
			status = "APPROVED"
		}

		_, err = pool.Exec(ctx, `
			INSERT INTO executions(execution_id, tenant_id, user_id, objective, channels, status, dry_run, shadow_mode, confidence, recommendation)
			VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
			ON CONFLICT (execution_id) DO NOTHING
		`, execID, req.TenantID, req.UserID, req.Objective, mustJSON(req.Channels), status, dryRun, req.ShadowMode, ai.Confidence, mustJSONRaw(aiRaw))
		if err != nil {
			c.JSON(500, gin.H{"error": "db_write_failed"})
			return
		}
		logAudit(ctx, pool, execID, req.UserID, "WORKFLOW_RUN", map[string]any{"confidence": ai.Confidence, "threshold": threshold, "dry_run": dryRun})

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

	r.POST("/v258/executions/approve", func(c *gin.Context) {
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

	r.GET("/v258/executions/:id", func(c *gin.Context) {
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

	r.GET("/v258/audit/:id", func(c *gin.Context) {
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
	r.POST("/v258/shadow/events", func(c *gin.Context) {
		var ev ShadowEvent
		if err := c.BindJSON(&ev); err != nil || ev.ExecutionID == "" || ev.Channel == "" || ev.Metric == nil {
			c.JSON(400, gin.H{"error": "bad_request"})
			return
		}
		_, err := pool.Exec(ctx, "INSERT INTO shadow_events(execution_id, channel, metric) VALUES($1,$2,$3)", ev.ExecutionID, ev.Channel, mustJSON(ev.Metric))
		if err != nil {
			c.JSON(500, gin.H{"error": "db_write_failed"})
			return
		}
		logAudit(ctx, pool, ev.ExecutionID, "system", "SHADOW_EVENT", map[string]any{"channel": ev.Channel})
		c.JSON(200, gin.H{"ok": true})
	})

	r.GET("/v258/reports/lift/:id", func(c *gin.Context) {
		id := c.Param("id")
		// Pull any shadow events as a placeholder "lift view"
		rows, err := pool.Query(ctx, "SELECT channel, metric, at FROM shadow_events WHERE execution_id=$1 ORDER BY id ASC", id)
		if err != nil {
			c.JSON(500, gin.H{"error": "db"})
			return
		}
		defer rows.Close()
		var events []gin.H
		for rows.Next() {
			var ch string
			var metric []byte
			var at time.Time
			_ = rows.Scan(&ch, &metric, &at)
			events = append(events, gin.H{"channel": ch, "at": at, "metric": json.RawMessage(metric)})
		}
		c.JSON(200, gin.H{
			"execution_id": id,
			"lift_report": gin.H{
				"status": "placeholder",
				"shadow_events_count": len(events),
				"events": events,
				"note": "Real uplift requires control vs treatment design and consistent attribution.",
			},
		})
	})

	go workerLoop(ctx, pool, rdb, connURL, dryRun, pollSeconds, maxRetries)

	port := mustEnv("GATEWAY_PORT", "8080")
	if err := r.Run(":" + port); err != nil {
		panic(err)
	}
}
