package ai

import (
  "bytes"
  "encoding/json"
  "net/http"
  "time"
)

type Client struct {
  BaseURL string
  http    *http.Client
}

func New(base string) *Client {
  return &Client{BaseURL: base, http: &http.Client{Timeout: 4 * time.Second}}
}

type RiskRequest struct {
  TenantID string                 `json:"tenant_id"`
  Channel  string                 `json:"channel"`
  Action   string                 `json:"action"`
  Payload  map[string]interface{} `json:"payload"`
}

type RiskResponse struct {
  RiskScore float64                `json:"risk_score"`
  Flags     []string               `json:"flags"`
  Summary   string                 `json:"summary"`
  Recommend map[string]interface{} `json:"recommend"`
}

func (c *Client) Score(req RiskRequest) (RiskResponse, error) {
  var out RiskResponse
  b, _ := json.Marshal(req)
  r, err := c.http.Post(c.BaseURL+"/v1/risk/score", "application/json", bytes.NewReader(b))
  if err != nil { return out, err }
  defer r.Body.Close()
  _ = json.NewDecoder(r.Body).Decode(&out)
  return out, nil
}
