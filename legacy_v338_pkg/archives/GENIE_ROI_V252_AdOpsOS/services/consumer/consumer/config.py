from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://genie:genie@db:5432/genie_roi"
    kafka_bootstrap: str = "kafka:9092"
    kafka_topic: str = "genie.events"
    kafka_dlq_topic: str = "genie.events.dlq"
    kafka_group: str = "genie-consumer"
    redis_url: str = "redis://redis:6379/0"
    class Config:
        env_file = ".env"
        extra = "ignore"
settings = Settings()
