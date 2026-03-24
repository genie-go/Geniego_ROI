from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://genie:genie@localhost:5432/genie"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-secret"
    public_base_url: str = "http://localhost:8000"
    oauth_state_ttl_seconds: int = 900

    rq_queue: str = "genie_actions"
    rq_max_retries: int = 5
    rq_retry_base_seconds: int = 30

    dry_run_connectors: bool = True

    meta_client_id: str = ""
    meta_client_secret: str = ""
    meta_redirect_uri: str = ""
    tiktok_client_key: str = ""
    tiktok_client_secret: str = ""
    tiktok_redirect_uri: str = ""
    amazon_client_id: str = ""
    amazon_client_secret: str = ""
    amazon_redirect_uri: str = ""
    amazon_ads_endpoint: str = "https://advertising-api.amazon.com"
    amazon_ads_base_url: str = ""  # optional override per region
    amazon_token_url: str = "https://api.amazon.com/auth/o2/token"

    class Config:
        env_prefix = ""
        case_sensitive = False

settings = Settings()
