from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://genie:genie@db:5432/genie_roi"

    kafka_bootstrap: str = "kafka:9092"
    kafka_topic: str = "genie.events"
    kafka_dlq_topic: str = "genie.events.dlq"
    kafka_group: str = "genie-consumer"

    redis_url: str = "redis://redis:6379/0"
    retry_max: int = 8

    execution_mode: str = "DRY_RUN"
    auto_execute: bool = False
    kill_switch: bool = False
    max_shift_pct: float = 20.0
    total_budget: float = 2000.0
    stop_loss_roi: float = -0.2

    policy_auto_approve_max_abs: float = 200.0
    policy_auto_approve_max_pct: float = 10.0
    policy_require_finance_abs: float = 500.0
    policy_require_finance_pct: float = 25.0

    master_fernet_key: str = ""
    vault_addr: str = ""
    vault_token: str = ""
    vault_role_id: str = ""
    vault_secret_id: str = ""
    vault_path: str = "secret/data/genie_roi"

    oauth_redirect_base: str = "http://localhost:8000/v1/oauth/callback"

    meta_client_id: str = ""
    meta_client_secret: str = ""
    meta_scopes: str = "ads_management,ads_read"

    tiktok_client_key: str = ""
    tiktok_client_secret: str = ""
    tiktok_scopes: str = ""

    google_client_id: str = ""
    google_client_secret: str = ""
    google_scopes: str = "https://www.googleapis.com/auth/adwords"
    google_developer_token: str = ""
    google_customer_id: str = ""
    google_login_customer_id: str = ""

    internal_metrics_token: str = "change-me"
    app_env: str = "local"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
