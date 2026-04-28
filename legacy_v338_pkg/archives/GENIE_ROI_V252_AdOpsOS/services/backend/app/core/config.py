from __future__ import annotations
import os
from pydantic import BaseModel

class Settings(BaseModel):
    app_env: str = os.getenv("APP_ENV", "local")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./genie_v244.db")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    kafka_bootstrap: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    auto_execute: bool = os.getenv("AUTO_EXECUTE", "false").lower() in ("1","true","yes","y","on")
    dry_run: bool = os.getenv("DRY_RUN", "true").lower() in ("1","true","yes","y","on")
    auth_mode: str = os.getenv("AUTH_MODE", "stub")  # stub | real

settings = Settings()
