from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://genie:genie@db:5432/genie_roi"
    redis_url: str = "redis://redis:6379/0"
    execution_mode: str = "DRY_RUN"
    kill_switch: bool = False
    retry_max: int = 8

    master_fernet_key: str = ""

    vault_addr: str = ""
    vault_token: str = ""
    vault_role_id: str = ""
    vault_secret_id: str = ""

    google_client_id: str = ""
    google_client_secret: str = ""
    meta_client_id: str = ""
    meta_client_secret: str = ""
    tiktok_client_key: str = ""
    tiktok_client_secret: str = ""

    google_developer_token: str = ""
    google_customer_id: str = ""
    google_login_customer_id: str = ""

    internal_metrics_token: str = "change-me"
    api_base: str = "http://api:8000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
