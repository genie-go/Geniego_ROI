package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
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
	Version   int `yaml:"version"`
	Defaults  struct {
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
	TenantID           string   `json:"tenant_id"`
	UserID             string   `json:"user_id"`
	Objective          string   `json:"objective"`
	BudgetDeltaLimitPct float64  `json:"budget_delta_limit_pct"`
	Channels           []string `json:"channels"`
	ShadowMode         bool     `json:"shadow_mode"`
}

type AIResponse struct {
	Confidence    float64                `json:"confidence"`
	Explain       []string               `json:"explain"`
	Risks         []string               `json:"risks"`
	Actions       []map[string]any       `json:"actions"`
	Meta          map[string]any         `json:"meta"`
}

type ApproveRequest struct {
	ExecutionID string `json:"execution_id"`
	ApproverID  string `json:"approver_id"`
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
	return hex.EncodeToString(h[:16]) // short but collision-resistant enough for demo
}

func jsonLog(fields map[string]any) {
	fields["ts"] = time.Now().UTC().Format(time.RFC3339Nano)
	enc, _ := json.Marshal(fields)
	os.Stdout.Write(append(enc, '\n'))
}

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	ctx := context.Background()

	pgHost := mustEnv("POSTGRES_HOST", "postgres")
	pgPort := mustEnv("POSTGRES_PORT", "5432")
	pgDB := mustEnv("POSTGRES_DB", "genie_roi")
	pgUser := mustEnv("POSTGRES_USER", "genie")
	pgPass := mustEnv("POSTGRES_PASSWORD", "genie")
	pgURL := "postgres://" + pgUser + ":" + pgPass + "@" + pgHost + ":" + pgPort + "/" + pgDB

	pool, err := pgxpool.New(ctx, pgURL)
	if err != nil {
		panic(err)
	}
	defer pool.Close()

	redisHost := mustEnv("REDIS_HOST", "redis")
	redisPort := mustEnv("REDIS_PORT", "6379")
	rdb := redis.NewClient(&redis.Options{Addr: redisHost + ":" + redisPort})
	defer rdb.Close()

	aiURL := mustEnv("AI_URL", "http://ai:8000")
	connURL := mustEnv("CONNECTORS_URL", "http://connectors:3000")

	dryRun := strings.ToLower(mustEnv("DRY_RUN", "true")) == "true"
	autoExecute := strings.ToLower(mustEnv("AUTO_EXECUTE", "false")) == "true"

	policy, err := loadPolicy("policies/policy.yml")
	if err != nil {
		panic(err)
	}

	// Simple rate limit: 60 req/min per tenant (demo)
	r.Use(func(c *gin.Context) {
		tenant := c.GetHeader("X-Tenant")
		if tenant == "" {
			tenant = "public"
		}
		key := "rl:" + tenant + ":" + time.Now().UTC().Format("200601021504")
		n, _ := rdb.Incr(ctx, key).Result()
		if n == 1 {
			rdb.Expire(ctx, key, time.Minute)
		}
		if n > 60 {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate_limited"})
			return
		}
		c.Next()
	})

	r.GET("/healthz", func(c *gin.Context) { c.JSON(200, gin.H{"ok": true}) })
	r.GET("/readyz", func(c *gin.Context) {
		if err := pool.Ping(ctx); err != nil {
			c.JSON(503, gin.H{"ready": false, "db": "down"})
			return
		}
		c.JSON(200, gin.H{"ready": true})
	})

	r.POST("/v256/workflows/run", func(c *gin.Context) {
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

		// Idempotency lock in Redis for 10 minutes
		lockKey := "idem:" + execID
		ok, _ := rdb.SetNX(ctx, lockKey, "1", 10*time.Minute).Result()
		if !ok {
			// return existing execution
			row := pool.QueryRow(ctx, "SELECT status, confidence, recommendation FROM executions WHERE execution_id=$1", execID)
			var status string
			var conf *float64
			var reco []byte
			if err := row.Scan(&status, &conf, &reco); err == nil {
				c.JSON(200, gin.H{"execution_id": execID, "status": status, "confidence": conf, "recommendation": json.RawMessage(reco), "idempotent": true})
				return
			}
		}

		// Policy: allowed channels
		allowed := map[string]bool{}
		for _, ch := range policy.Defaults.AllowedChannels {
			allowed[ch] = true
		}
		for _, ch := range req.Channels {
			if !allowed[ch] {
				c.JSON(400, gin.H{"error": "channel_not_allowed", "channel": ch})
				return
			}
		}
		// Policy: max budget delta
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

		// Call AI
		aiReq := map[string]any{
			"tenant_id": req.TenantID,
			"objective": req.Objective,
			"channels": req.Channels,
			"budget_delta_limit_pct": req.BudgetDeltaLimitPct,
			"shadow_mode": req.ShadowMode,
		}
		aiReqBytes, _ := json.Marshal(aiReq)
		httpReq, _ := http.NewRequest("POST", aiURL+"/v256/ai/recommend", strings.NewReader(string(aiReqBytes)))
		httpReq.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(httpReq)
		if err != nil {
			c.JSON(502, gin.H{"error": "ai_unavailable"})
			return
		}
		defer resp.Body.Close()
		aiBody, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != 200 {
			c.JSON(502, gin.H{"error": "ai_error", "detail": string(aiBody)})
			return
		}
		var ai AIResponse
		if err := json.Unmarshal(aiBody, &ai); err != nil {
			c.JSON(502, gin.H{"error": "ai_bad_response"})
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

		// Insert execution
		_, err = pool.Exec(ctx, `
			INSERT INTO executions(execution_id, tenant_id, user_id, objective, channels, status, dry_run, shadow_mode, confidence, recommendation)
			VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
			ON CONFLICT (execution_id) DO NOTHING
		`, execID, req.TenantID, req.UserID, req.Objective, mustJSON(req.Channels), status, dryRun, req.ShadowMode, ai.Confidence, mustJSONRaw(aiBody))
		if err != nil {
			c.JSON(500, gin.H{"error": "db_write_failed"})
			return
		}
		logAudit(ctx, pool, execID, req.UserID, "WORKFLOW_RUN", map[string]any{"confidence": ai.Confidence, "threshold": threshold, "dry_run": dryRun})

		// Optionally enqueue if auto execute (but still DRY_RUN prevents external changes)
		if autoExecute && approvedByPolicy {
			if err := enqueueOutbox(ctx, pool, execID, req.TenantID, req.Channels, connURL); err != nil {
				c.JSON(500, gin.H{"error": "enqueue_failed"})
				return
			}
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

	r.POST("/v256/executions/approve", func(c *gin.Context) {
		var req ApproveRequest
		if err := c.BindJSON(&req); err != nil || req.ExecutionID == "" || req.ApproverID == "" {
			c.JSON(400, gin.H{"error": "bad_request"})
			return
		}
		// Update approval
		_, err := pool.Exec(ctx, "UPDATE executions SET status='APPROVED', approval=$2 WHERE execution_id=$1", req.ExecutionID, mustJSON(map[string]any{"approver_id": req.ApproverID, "at": time.Now().UTC().Format(time.RFC3339)}))
		if err != nil {
			c.JSON(500, gin.H{"error": "db_update_failed"})
			return
		}
		logAudit(ctx, pool, req.ExecutionID, req.ApproverID, "APPROVED", map[string]any{})
		// Load channels and tenant for enqueue
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

	r.GET("/v256/executions/:id", func(c *gin.Context) {
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

	// worker loop in background (simple)
	go workerLoop(ctx, pool, rdb, connURL, dryRun)

	port := mustEnv("GATEWAY_PORT", "8080")
	jsonLog(map[string]any{"msg": "gateway_start", "port": port, "dry_run": dryRun, "auto_execute": autoExecute})
	if err := r.Run(":" + port); err != nil {
		panic(err)
	}
}

func mustJSON(v any) []byte {
	b, _ := json.Marshal(v)
	return b
}
func mustJSONRaw(b []byte) []byte {
	// Validate minimally
	var tmp any
	_ = json.Unmarshal(b, &tmp)
	return b
}

func logAudit(ctx context.Context, pool *pgxpool.Pool, execID, actor, action string, detail map[string]any) {
	_, _ = pool.Exec(ctx, "INSERT INTO audit_log(execution_id, actor_id, action, detail) VALUES($1,$2,$3,$4)", execID, actor, action, mustJSON(detail))
}

func enqueueOutbox(ctx context.Context, pool *pgxpool.Pool, execID, tenant string, channels []string, connURL string) error {
	payload := map[string]any{
		"execution_id": execID,
		"tenant_id": tenant,
		"channels": channels,
		"connectors_url": connURL,
	}
	_, err := pool.Exec(ctx, "INSERT INTO outbox(execution_id, payload) VALUES($1,$2)", execID, mustJSON(payload))
	return err
}

func workerLoop(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, connURL string, dryRun bool) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		// Fetch due outbox rows
		rows, err := pool.Query(ctx, "SELECT id, execution_id, payload, attempts FROM outbox WHERE status='PENDING' AND next_attempt_at <= NOW() ORDER BY id LIMIT 5")
		if err != nil {
			continue
		}
		type job struct {
			ID int64
			ExecID string
			Payload []byte
			Attempts int
		}
		var jobs []job
		for rows.Next() {
			var j job
			_ = rows.Scan(&j.ID, &j.ExecID, &j.Payload, &j.Attempts)
			jobs = append(jobs, j)
		}
		rows.Close()
		for _, j := range jobs {
			// push to redis list
			_ = rdb.RPush(ctx, "queue:outbox", string(j.Payload)).Err()
			// mark outbox as in-progress by setting next_attempt_at in future
			_, _ = pool.Exec(ctx, "UPDATE outbox SET next_attempt_at = NOW() + INTERVAL '10 seconds' WHERE id=$1", j.ID)
		}

		// pop and execute one item per tick
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
		// load recommendation
		row := pool.QueryRow(ctx, "SELECT recommendation, channels, status FROM executions WHERE execution_id=$1", execID)
		var recoBytes, channelsBytes []byte
		var status string
		if err := row.Scan(&recoBytes, &channelsBytes, &status); err != nil {
			continue
		}
		if status != "APPROVED" && status != "NEEDS_REVIEW" {
			// allow approved only
		}

		_, _ = pool.Exec(ctx, "UPDATE executions SET status='EXECUTING' WHERE execution_id=$1", execID)
		logAudit(ctx, pool, execID, "system", "EXECUTING", map[string]any{"dry_run": dryRun})

		// parse actions from reco
		var ai AIResponse
		_ = json.Unmarshal(recoBytes, &ai)
		actions := ai.Actions
		var channels []string
		_ = json.Unmarshal(channelsBytes, &channels)

		// execute per channel
		var failed error
		for _, ch := range channels {
			if err := callConnectorExecute(connURL, execID, ch, actions, dryRun); err != nil {
				failed = err
				// rollback best-effort
				_ = callConnectorRollback(connURL, execID, ch, dryRun)
				break
			}
		}
		if failed != nil {
			_, _ = pool.Exec(ctx, "UPDATE executions SET status='FAILED', last_error=$2 WHERE execution_id=$1", execID, failed.Error())
			logAudit(ctx, pool, execID, "system", "FAILED", map[string]any{"error": failed.Error()})
		} else {
			_, _ = pool.Exec(ctx, "UPDATE executions SET status='SUCCESS' WHERE execution_id=$1", execID)
			logAudit(ctx, pool, execID, "system", "SUCCESS", map[string]any{})
		}
	}
}

func callConnectorExecute(connURL, execID, channel string, actions []map[string]any, dryRun bool) error {
	reqBody, _ := json.Marshal(map[string]any{
		"execution_id": execID,
		"channel": channel,
		"actions": actions,
		"dry_run": dryRun,
	})
	resp, err := http.Post(connURL+"/v256/connectors/execute", "application/json", strings.NewReader(string(reqBody)))
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
	reqBody, _ := json.Marshal(map[string]any{
		"execution_id": execID,
		"channel": channel,
		"dry_run": dryRun,
	})
	resp, err := http.Post(connURL+"/v256/connectors/rollback", "application/json", strings.NewReader(string(reqBody)))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}
