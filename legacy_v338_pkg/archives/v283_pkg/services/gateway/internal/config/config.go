package config

import "os"

type Config struct {
  TenantID        string
  GatewayPort     string
  DryRun          bool
  EnforcePolicies bool
  PostgresHost string
  PostgresPort string
  PostgresDB   string
  PostgresUser string
  PostgresPass string
  AIEngineURL   string
  ConnectorsURL string
}

func Load() Config {
  return Config{
    TenantID: getenv("GENIE_TENANT_ID", "demo-tenant"),
    GatewayPort: getenv("GATEWAY_PORT", "8080"),
    DryRun: getenv("DRY_RUN", "true") == "true",
    EnforcePolicies: getenv("ENFORCE_POLICIES", "true") == "true",
    PostgresHost: getenv("POSTGRES_HOST", "postgres"),
    PostgresPort: getenv("POSTGRES_PORT", "5432"),
    PostgresDB: getenv("POSTGRES_DB", "genie"),
    PostgresUser: getenv("POSTGRES_USER", "genie"),
    PostgresPass: getenv("POSTGRES_PASSWORD", "genie"),
    AIEngineURL: getenv("AI_ENGINE_URL", "http://ai_engine:9000"),
    ConnectorsURL: getenv("CONNECTORS_URL", "http://connectors:9100"),
  }
}

func getenv(k, d string) string {
  v := os.Getenv(k)
  if v == "" { return d }
  return v
}
