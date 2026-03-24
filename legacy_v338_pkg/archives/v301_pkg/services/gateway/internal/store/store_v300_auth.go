package store

import (
  "context"
  "time"
  "github.com/jackc/pgx/v5"
)

type Session struct {
  SessionToken string
  TenantID string
  UserID string
  Role string
  CreatedAt time.Time
  ExpiresAt time.Time
  LastSeenAt *time.Time
}

func (s *Store) CreateSession(ctx context.Context, tenantID, userID, role, token string, ttl time.Duration) error {
  exp := time.Now().Add(ttl)
  _, err := s.db.Pool().Exec(ctx, `
    INSERT INTO auth_sessions(session_token, tenant_id, user_id, role, expires_at)
    VALUES($1,$2,$3,$4,$5)
  `, token, tenantID, userID, role, exp)
  return err
}

func (s *Store) GetSession(ctx context.Context, token string) (Session, error) {
  row := s.db.Pool().QueryRow(ctx, `
    SELECT session_token, tenant_id, user_id, role, created_at, expires_at, last_seen_at
    FROM auth_sessions WHERE session_token=$1
  `, token)
  var sess Session
  err := row.Scan(&sess.SessionToken, &sess.TenantID, &sess.UserID, &sess.Role, &sess.CreatedAt, &sess.ExpiresAt, &sess.LastSeenAt)
  return sess, err
}

func (s *Store) TouchSession(ctx context.Context, token string) error {
  _, err := s.db.Pool().Exec(ctx, `UPDATE auth_sessions SET last_seen_at=now() WHERE session_token=$1`, token)
  return err
}

func (s *Store) DeleteSession(ctx context.Context, token string) error {
  _, err := s.db.Pool().Exec(ctx, `DELETE FROM auth_sessions WHERE session_token=$1`, token)
  return err
}

// --- OIDC login state/nonce ---
type OIDCLoginState struct {
  TenantID string
  State string
  Nonce string
  RedirectURI string
  ExpiresAt time.Time
}

func (s *Store) SaveOIDCLoginState(ctx context.Context, tenantID, state, nonce, redirectURI string, ttl time.Duration) error {
  exp := time.Now().Add(ttl)
  _, err := s.db.Pool().Exec(ctx, `
    INSERT INTO oidc_login_states(tenant_id, state, nonce, redirect_uri, expires_at)
    VALUES($1,$2,$3,$4,$5)
    ON CONFLICT (tenant_id, state) DO UPDATE SET nonce=EXCLUDED.nonce, redirect_uri=EXCLUDED.redirect_uri, expires_at=EXCLUDED.expires_at
  `, tenantID, state, nonce, redirectURI, exp)
  return err
}

func (s *Store) ConsumeOIDCLoginState(ctx context.Context, tenantID, state string) (OIDCLoginState, error) {
  tx, err := s.db.Pool().BeginTx(ctx, pgx.TxOptions{})
  if err != nil { return OIDCLoginState{}, err }
  defer func(){ _ = tx.Rollback(ctx) }()
  row := tx.QueryRow(ctx, `
    SELECT tenant_id, state, nonce, redirect_uri, expires_at
    FROM oidc_login_states WHERE tenant_id=$1 AND state=$2
    FOR UPDATE
  `, tenantID, state)
  var st OIDCLoginState
  if err := row.Scan(&st.TenantID, &st.State, &st.Nonce, &st.RedirectURI, &st.ExpiresAt); err != nil {
    return OIDCLoginState{}, err
  }
  _, err = tx.Exec(ctx, `DELETE FROM oidc_login_states WHERE tenant_id=$1 AND state=$2`, tenantID, state)
  if err != nil { return OIDCLoginState{}, err }
  if err := tx.Commit(ctx); err != nil { return OIDCLoginState{}, err }
  return st, nil
}
