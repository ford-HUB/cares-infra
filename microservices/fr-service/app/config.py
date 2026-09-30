from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8001
    model_name: str = "buffalo_l"
    ctx_id: int = -1
    det_size: int = 640
    verify_threshold: float = 0.4
    embedding_dim: int = 512
    cors_origins: str = "*"
    # REDIS_URL (Railway's Redis, password included) wins over host/port/password.
    redis_url: str = ""
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_username: str | None = None
    redis_password: str | None = None


settings = Settings()
