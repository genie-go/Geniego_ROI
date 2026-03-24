package httpapi

import (
  "bytes"
  "crypto/hmac"
  "crypto/sha256"
  "encoding/hex"
  "encoding/json"
  "errors"
  "io"
  "net/http"
  "net/url"
  "strconv"
  "strings"
  "time"

  "github.com/gin-gonic/gin"
  "genie_roi/gateway/internal/store"
)

// Reference implementation using Stripe REST API (no external SDK dependency).
func billingCreateStripeCheckoutSession(c *gin.Context, st *store.Store, tenant, planID, successURL, cancelURL string) (string, error) {
  cfg, err := st.GetStripeConfig(c, tenant)
  if err != nil { return "", err }
  if cfg.StripeSecretKey == "" { return "", errors.New("stripe not configured") }
  priceID, err := st.GetPlanStripePriceID(c, tenant, planID)
  if err != nil { return "", err }
  if priceID == "" { return "", errors.New("plan missing stripe_price_id") }
  if successURL=="" || cancelURL=="" { return "", errors.New("success_url/cancel_url required") }

  form := url.Values{}
  form.Set("mode", "subscription")
  form.Set("success_url", successURL)
  form.Set("cancel_url", cancelURL)
  form.Set("line_items[0][price]", priceID)
  form.Set("line_items[0][quantity]", "1")

  req, _ := http.NewRequest("POST", "https://api.stripe.com/v1/checkout/sessions", strings.NewReader(form.Encode()))
  req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
  req.Header.Set("Authorization", "Bearer "+cfg.StripeSecretKey)

  resp, err := http.DefaultClient.Do(req)
  if err != nil { return "", err }
  defer resp.Body.Close()
  b, _ := io.ReadAll(resp.Body)
  if resp.StatusCode >= 300 {
    return "", errors.New("stripe error: " + string(b))
  }
  var out struct{ URL string `json:"url"` }
  _ = json.Unmarshal(b, &out)
  if out.URL == "" { return "", errors.New("stripe response missing url") }
  return out.URL, nil
}

// Stripe webhook verification (simplified v1 signature scheme).
func verifyStripeSignature(payload []byte, header string, secret string) error {
  if secret == "" { return errors.New("missing webhook secret") }
  // header: t=timestamp,v1=signature
  parts := strings.Split(header, ",")
  var ts, sig string
  for _, p := range parts {
    p = strings.TrimSpace(p)
    if strings.HasPrefix(p, "t=") { ts = strings.TrimPrefix(p, "t=") }
    if strings.HasPrefix(p, "v1=") { sig = strings.TrimPrefix(p, "v1=") }
  }
  if ts=="" || sig=="" { return errors.New("invalid stripe signature header") }
  tInt, _ := strconv.ParseInt(ts, 10, 64)
  if time.Since(time.Unix(tInt,0)) > 10*time.Minute { return errors.New("stale signature") }

  signedPayload := []byte(ts + "." + string(payload))
  mac := hmac.New(sha256.New, []byte(secret))
  mac.Write(signedPayload)
  expect := hex.EncodeToString(mac.Sum(nil))
  if !hmac.Equal([]byte(expect), []byte(sig)) {
    return errors.New("signature mismatch")
  }
  return nil
}

func billingHandleStripeWebhook(c *gin.Context, st *store.Store) (bool, error) {
  payload, _ := io.ReadAll(c.Request.Body)
  // Stripe sends tenant mapping in metadata in real deployments; here we support X-Tenant-ID header for simplicity.
  tenant := c.GetHeader("X-Tenant-ID")
  if tenant == "" { return false, errors.New("missing X-Tenant-ID") }
  cfg, err := st.GetStripeConfig(c, tenant)
  if err != nil { return false, err }
  sigHeader := c.GetHeader("Stripe-Signature")
  if err := verifyStripeSignature(payload, sigHeader, cfg.StripeWebhookSecret); err != nil { return false, err }

  // Minimal event parse
  var evt struct{
    Type string `json:"type"`
    Data struct{
      Object map[string]any `json:"object"`
    } `json:"data"`
  }
  if err := json.Unmarshal(payload, &evt); err != nil { return false, err }

  // In a full system: update subscriptions/invoices. Here: just acknowledge.
  _ = bytes.NewBufferString(evt.Type)
  return true, nil
}
