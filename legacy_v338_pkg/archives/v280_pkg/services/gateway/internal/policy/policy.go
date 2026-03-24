package policy

import (
  "errors"
)

type Policy struct {
  Version int `json:"version"`
  Channels struct {
    Ads struct {
      Enabled          bool `json:"enabled"`
      MaxBudgetDeltaPct int `json:"max_budget_delta_pct"`
    } `json:"ads"`
    Email struct {
      Enabled           bool `json:"enabled"`
      RequireConsent    bool `json:"require_consent"`
      DailyFrequencyCap int  `json:"daily_frequency_cap"`
    } `json:"email"`
    CRM struct {
      Enabled        bool `json:"enabled"`
      MaxBulkUpdates int  `json:"max_bulk_updates"`
    } `json:"crm"`
  } `json:"channels"`
  Approvals struct {
    RequiredFor []string `json:"required_for"`
  } `json:"approvals"`
  Blocklists struct {
    Segments []string `json:"segments"`
  } `json:"blocklists"`
}

var (
  ErrPolicyViolation = errors.New("policy violation")
)

type Violation struct {
  Code string `json:"code"`
  Msg  string `json:"msg"`
}

func RequiresApproval(p Policy, tag string) bool {
  for _, t := range p.Approvals.RequiredFor {
    if t == tag { return true }
  }
  return false
}
