package auth

import (
  "crypto/sha256"
  "encoding/hex"
  "net/http"
  "strings"
  "time"

  "github.com/gin-gonic/gin"
  "genie_roi/gateway/internal/store"
)

type Principal struct {
  TenantID     string
  UserID       string
  Role         string
  Permissions  []string
}

func HashAPIKey(raw string) string {
  h := sha256.Sum256([]byte(raw))
  return hex.EncodeToString(h[:])
}

func Middleware(st *store.Store, bootstrapToken string) gin.HandlerFunc {
  return func(c *gin.Context) {
    // Health and root may be public; protect all /v1 routes.
    if !strings.HasPrefix(c.Request.URL.Path, "/v1/") {
      c.Next()
      return
    }


    if c.Request.URL.Path == "/v1/admin/bootstrap" {
      tok := c.GetHeader("X-Bootstrap-Token")
      if bootstrapToken != "" && tok == bootstrapToken {
        c.Next(); return
      }
      c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"invalid bootstrap token"})
      return
  
    // Public auth endpoints (SSO/OIDC handshake)
    if c.Request.URL.Path == "/v1/auth/oidc/start" || c.Request.URL.Path == "/v1/auth/oidc/callback" || c.Request.URL.Path == "/v1/auth/logout" {
      c.Next()
      return
    }

    // Session-based auth (SSO)
    authz := c.GetHeader("Authorization")
    if strings.HasPrefix(strings.ToLower(authz), "bearer ") {
      tok := strings.TrimSpace(authz[7:])
      sess, err := st.GetSession(c, tok)
      if err == nil && sess.TenantID != "" && time.Now().Before(sess.ExpiresAt) {
        perms, _ := st.GetRolePermissions(c, sess.TenantID, sess.Role)
        p := Principal{TenantID: sess.TenantID, UserID: sess.UserID, Role: sess.Role, Permissions: perms}
        c.Set("principal", p)
        _ = st.TouchSession(c, tok)
        c.Next()
        return
      }
      c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"invalid session"})
      return
    }


      }

    tenant := c.GetHeader("X-Tenant-ID")
    key := c.GetHeader("X-API-Key")
    if tenant == "" || key == "" {
      c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"missing X-Tenant-ID or X-API-Key"})
      return
    }

    keyHash := HashAPIKey(key)
    ak, err := st.GetAPIKey(c, tenant, keyHash)
    if err != nil {
      c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"invalid api key"})
      return
    }
    perms, _ := st.GetRolePermissions(c, tenant, ak.Role)
    p := Principal{TenantID: tenant, UserID: ak.UserID, Role: ak.Role, Permissions: perms}
    c.Set("principal", p)
    c.Next()
  }
}

func GetPrincipal(c *gin.Context) Principal {
  if v, ok := c.Get("principal"); ok {
    if p, ok2 := v.(Principal); ok2 { return p }
  }
  return Principal{}
}

func RequireRole(allowed ...string) gin.HandlerFunc {
  allowedSet := map[string]bool{}
  for _, r := range allowed { allowedSet[strings.ToLower(r)] = true }
  return func(c *gin.Context) {
    p := GetPrincipal(c)
    if p.TenantID == "" {
      c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"unauthorized"})
      return
    }
    if allowedSet["*"] || allowedSet[strings.ToLower(p.Role)] {
      c.Next(); return
    }
    c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error":"forbidden"})
  }
}



func HasPermission(p Principal, want string) bool {
  if want == "" { return true }
  // wildcard
  for _, perm := range p.Permissions {
    if perm == want || perm == "*" { return true }
    if strings.HasSuffix(perm, ":*") {
      pref := strings.TrimSuffix(perm, "*")
      if strings.HasPrefix(want, pref) { return true }
    }
  }
  // legacy role shortcuts
  if p.Role == "admin" { return true }
  return false
}

func RequirePermission(want string) gin.HandlerFunc {
  return func(c *gin.Context) {
    p, ok := GetPrincipal(c)
    if !ok {
      c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error":"unauthorized"})
      return
    }
    if !HasPermission(p, want) {
      c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error":"forbidden", "missing": want})
      return
    }
    c.Next()
  }
}
