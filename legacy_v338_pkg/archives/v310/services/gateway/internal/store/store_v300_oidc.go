package store

import (
  "context"
)

type OIDCConfigFull struct {
  TenantID string `json:"tenant_id"`
  IssuerURL string `json:"issuer_url"`
  ClientID string `json:"client_id"`
  ClientSecret string `json:"client_secret"`
  RedirectURL string `json:"redirect_url"`
  Scopes string `json:"scopes"`
  Enabled bool `json:"enabled"`
  JWKSJSON string `json:"jwks_json"`
}

func (s *Store) GetOIDCConfigFull(ctx context.Context, tenant string) (OIDCConfigFull, error) {
  row := s.db.Pool().QueryRow(ctx, `
    SELECT tenant_id, issuer_url, client_id, client_secret, redirect_url, scopes, enabled, COALESCE(jwks_json,'')
    FROM sso_oidc_configs WHERE tenant_id=$1
  `, tenant)
  var c OIDCConfigFull
  err := row.Scan(&c.TenantID, &c.IssuerURL, &c.ClientID, &c.ClientSecret, &c.RedirectURL, &c.Scopes, &c.Enabled, &c.JWKSJSON)
  return c, err
}
