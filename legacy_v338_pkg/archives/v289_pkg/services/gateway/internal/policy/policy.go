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



// AssignMessageExperiment deterministically assigns a contact to HOLDOUT or a variant.
// - Uses sha256(tenantID + experimentID + contactID) to produce [0,1)
// - Applies holdout_pct first, then weighted variant selection.
type messageVariant struct {
  ID string `json:"id"`
  Weight float64 `json:"weight"`
}

func AssignMessageExperiment(exp any, tenantID, contactID string) (string, error) {
  // exp is store.MessageExperimentRow but policy cannot import store to avoid cycles; accept anonymous interface
  b, err := json.Marshal(exp)
  if err != nil { return "", err }
  var tmp struct{
    ExperimentID string `json:"ExperimentID"`
    HoldoutPct int `json:"HoldoutPct"`
    VariantsJSON []byte `json:"VariantsJSON"`
  }
  // Try both struct tag cases (Go exported fields marshal as keys)
  _ = json.Unmarshal(b, &tmp)
  if tmp.ExperimentID == "" {
    // fallback: attempt map
    var m map[string]any
    _ = json.Unmarshal(b, &m)
    if v, ok := m["ExperimentID"].(string); ok { tmp.ExperimentID = v }
    if v, ok := m["HoldoutPct"].(float64); ok { tmp.HoldoutPct = int(v) }
    if v, ok := m["VariantsJSON"].(string); ok { tmp.VariantsJSON = []byte(v) }
  }

  if tmp.ExperimentID == "" { return "", errors.New("invalid experiment object") }
  if tmp.HoldoutPct < 0 { tmp.HoldoutPct = 0 }
  if tmp.HoldoutPct > 100 { tmp.HoldoutPct = 100 }

  h := sha256.Sum256([]byte(tenantID + "|" + tmp.ExperimentID + "|" + contactID))
  // uint64 from first 8 bytes
  u := uint64(0)
  for i := 0; i < 8; i++ { u = (u << 8) | uint64(h[i]) }
  x := float64(u) / float64(^uint64(0)) // [0,1)

  if x < float64(tmp.HoldoutPct)/100.0 {
    return "HOLDOUT", nil
  }

  vars := []messageVariant{}
  if err := json.Unmarshal(tmp.VariantsJSON, &vars); err != nil { return "", err }
  if len(vars) == 0 { return "HOLDOUT", nil }

  // Normalize weights (default=1)
  sum := 0.0
  for i := range vars {
    if vars[i].Weight <= 0 { vars[i].Weight = 1 }
    sum += vars[i].Weight
  }
  // rescale x into [0,1) excluding holdout region
  x2 := (x - float64(tmp.HoldoutPct)/100.0) / (1.0 - float64(tmp.HoldoutPct)/100.0)
  acc := 0.0
  for _, v := range vars {
    acc += v.Weight / sum
    if x2 <= acc {
      if v.ID == "" { return "HOLDOUT", nil }
      return "VARIANT:" + v.ID, nil
    }
  }
  // fallback
  if vars[len(vars)-1].ID == "" { return "HOLDOUT", nil }
  return "VARIANT:" + vars[len(vars)-1].ID, nil
}
