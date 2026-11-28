from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8004
    cors_origins: str = "*"

    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    # Min blended score to tag an event.
    match_threshold: float = 0.45
    top_k: int = 3
    # Semantic share of the blended score; the rest is lexical.
    semantic_weight: float = 0.65


settings = Settings()
