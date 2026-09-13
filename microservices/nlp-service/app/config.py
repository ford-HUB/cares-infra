from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8004
    cors_origins: str = "*"

    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    # An event is tagged with an interest once its blended score clears this.
    match_threshold: float = 0.45
    # Interests returned per event, best first.
    top_k: int = 3
    # Blend between embedding similarity and lexicon hits; the rest is lexical.
    semantic_weight: float = 0.65


settings = Settings()
