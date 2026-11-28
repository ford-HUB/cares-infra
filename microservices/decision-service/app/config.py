from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8006
    cors_origins: str = "*"

    # Clamped to the row count.
    default_k: int = 3
    max_iterations: int = 50
    # 1 keeps `seed` = one start; the portal's Re-run button walks the seed.
    n_init: int = 1
    # Runaway-payload guard, not a capacity limit.
    max_households: int = 20_000


settings = Settings()
