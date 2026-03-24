package store

import (
  "context"
  "time"
)

type StripeConfig struct {
  TenantID string
  StripeSecretKey string
  StripeWebhookSecret string
  UpdatedAt time.Time
}

func (s *Store) UpsertStripeConfig(ctx context.Context, tenant, secret, webhookSecret string) error {
  _, err := s.db.Pool().Exec(ctx, `
    INSERT INTO billing_stripe_configs(tenant_id, stripe_secret_key, stripe_webhook_secret)
    VALUES($1,$2,$3)
    ON CONFLICT (tenant_id) DO UPDATE SET stripe_secret_key=EXCLUDED.stripe_secret_key, stripe_webhook_secret=EXCLUDED.stripe_webhook_secret, updated_at=now()
  `, tenant, secret, webhookSecret)
  return err
}

func (s *Store) GetStripeConfig(ctx context.Context, tenant string) (StripeConfig, error) {
  row := s.db.Pool().QueryRow(ctx, `
    SELECT tenant_id, COALESCE(stripe_secret_key,''), COALESCE(stripe_webhook_secret,''), updated_at
    FROM billing_stripe_configs WHERE tenant_id=$1
  `, tenant)
  var c StripeConfig
  err := row.Scan(&c.TenantID, &c.StripeSecretKey, &c.StripeWebhookSecret, &c.UpdatedAt)
  return c, err
}

func (s *Store) AddPlanPolicyBundle(ctx context.Context, tenant, planID, policyTemplateID, bundleName string) error {
  _, err := s.db.Pool().Exec(ctx, `
    INSERT INTO plan_policy_bundles(tenant_id, plan_id, policy_template_id, bundle_name)
    VALUES($1,$2,$3,$4)
    ON CONFLICT DO NOTHING
  `, tenant, planID, policyTemplateID, bundleName)
  return err
}


func (s *Store) GetPlanStripePriceID(ctx context.Context, tenant, planID string) (string, error) {
  row := s.db.Pool().QueryRow(ctx, `SELECT COALESCE(stripe_price_id,'') FROM billing_plans WHERE tenant_id=$1 AND plan_id=$2`, tenant, planID)
  var v string
  err := row.Scan(&v)
  return v, err
}
