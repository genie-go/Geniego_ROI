package policy

import (
  "crypto/sha256"
  "encoding/hex"
  "encoding/json"
  "errors"
  "math"
  "strings"
)

type Policy struct {
  Version   int                    `json:"version"`
  Channels  map[string]ChannelRule `json:"channels"`
  Approvals ApprovalRule           `json:"approvals"`
}

type ChannelRule struct {
  Enabled           bool `json:"enabled"`
  MaxBudgetDeltaPct int  `json:"max_budget_delta_pct"`
  RequireConsent    bool `json:"require_consent"`
  DailyFrequencyCap int  `json:"daily_frequency_cap"`
  MaxBulkUpdates    int  `json:"max_bulk_updates"`
}

type ApprovalRule struct {
  RequiredFor  []string `json:"required_for"`
  RequiredSteps int     `json:"required_steps"`
  ApproverRoles []string `json:"approver_roles"`
}

func Parse(b []byte) (Policy, error) {
  var p Policy
  if len(b) == 0 {
    return p, errors.New("empty policy")
  }
  if err := json.Unmarshal(b, &p); err != nil {
    return p, err
  }
  if p.Channels == nil {
    p.Channels = map[string]ChannelRule{}
  }
  if p.Approvals.RequiredSteps <= 0 {
    p.Approvals.RequiredSteps = 1
  }
  return p, nil
}

func (p Policy) IsActionApprovalRequired(actionType string) bool {
  at := strings.ToUpper(actionType)
  for _, x := range p.Approvals.RequiredFor {
    if strings.ToUpper(x) == at {
      return true
    }
  }
  return false
}

// For ADS_BUDGET_UPDATE, determine delta pct if payload includes:
// - budget_delta_pct (number)
// - current_budget and new_budget (numbers)
func BudgetDeltaPct(payload map[string]interface{}) (float64, bool) {
  if v, ok := payload["budget_delta_pct"]; ok {
    if f, ok2 := asFloat(v); ok2 {
      return math.Abs(f), true
    }
  }
  cur, ok1 := asFloat(payload["current_budget"])
  nxt, ok2 := asFloat(payload["new_budget"])
  if ok1 && ok2 && cur != 0 {
    return math.Abs((nxt-cur)/cur) * 100.0, true
  }
  return 0, false
}

func DeterministicGroup(experimentID, unitID string, holdoutPct int) string {
  if holdoutPct < 0 { holdoutPct = 0 }
  if holdoutPct > 100 { holdoutPct = 100 }
  sum := sha256.Sum256([]byte(experimentID + ":" + unitID))
  // Use first 2 bytes as 0..65535
  v := int(sum[0])<<8 | int(sum[1])
  bucket := int(float64(v) / 65535.0 * 100.0)
  if bucket < holdoutPct {
    return "holdout"
  }
  return "treatment"
}

func HashReason(s string) string {
  h := sha256.Sum256([]byte(s))
  return hex.EncodeToString(h[:8])
}

func asFloat(v interface{}) (float64, bool) {
  switch t := v.(type) {
  case float64:
    return t, true
  case float32:
    return float64(t), true
  case int:
    return float64(t), true
  case int64:
    return float64(t), true
  case json.Number:
    f, err := t.Float64()
    if err == nil { return f, true }
  }
  return 0, false
}


func HashBytes(b []byte) string {
  h := sha256.Sum256(b)
  return hex.EncodeToString(h[:])
}
